import React, { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, MercatorCoordinate, NavigationControl, ScaleControl, setWorkerUrl } from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { coordinates, localMapImage, mapThumbnail, sceneFromMap, streetCredits, streetLicense } from "./map-project.js";
import "./map-setup.css";

const mapStyle = "https://tiles.openfreemap.org/styles/liberty";
setWorkerUrl(mapWorkerUrl);
const format = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
const length = meters => meters >= 1000 ? format.format(meters / 1000) + " km" : format.format(meters) + " m";

function currentFrame(map) {
  const canvas = map.getCanvas();
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return null;
  const center = map.getCenter().wrap();
  const a = MercatorCoordinate.fromLngLat(map.unproject([width / 2 - 1, height / 2]));
  const b = MercatorCoordinate.fromLngLat(map.unproject([width / 2 + 1, height / 2]));
  const delta = b.x - a.x;
  const metersPerPoint = (delta - Math.round(delta)) / 2 / a.meterInMercatorCoordinateUnits();
  if (!(metersPerPoint > 0 && Number.isFinite(metersPerPoint))) return null;
  return { width, height, metersPerPoint, center: center.toArray(), bounds: map.getBounds().toArray(), zoom: map.getZoom(), source: "street" };
}

function captureStreetMap(map) {
  if (!map.isStyleLoaded() || !map.areTilesLoaded() || map.isMoving()) throw new Error("地图还在加载，请稍后再试。");
  const frame = currentFrame(map);
  if (!frame) throw new Error("无法读取当前地图范围。");
  const image = map.getCanvas();
  const output = document.createElement("canvas");
  const ratio = Math.min(1, 2400 / Math.max(image.width, image.height));
  output.width = Math.round(image.width * ratio);
  output.height = Math.round(image.height * ratio);
  const ctx = output.getContext("2d");
  ctx.drawImage(image, 0, 0, output.width, output.height);
  const scale = output.width / frame.width;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.font = "11px system-ui, sans-serif";
  const fontSize = Math.min(11, 11 * (frame.width - 14) / ctx.measureText(streetCredits).width);
  ctx.font = `${fontSize}px system-ui, sans-serif`;
  const footer = ctx.measureText(streetCredits).width + 14;
  const x = Math.max(0, frame.width - footer);
  ctx.fillStyle = "#fffffff0";
  ctx.fillRect(x, output.height / scale - 20, footer, 20);
  ctx.fillStyle = "#20232a";
  ctx.fillText(streetCredits, x + 7, output.height / scale - 6);
  ctx.restore();
  return { ...frame, canvas: output };
}

function StreetMap({ mapRef, onView, onPlace }) {
  const host = useRef(null);
  const request = useRef(null);
  const failed = useRef(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [mapError, setMapError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let map;
    failed.current = false;
    setMapError("");
    setSearching(false);
    onView(null);
    try {
      map = new MapLibreMap({
        container: host.current, style: mapStyle, center: [121.49, 31.23], zoom: 12,
        minZoom: 3, maxZoom: 21, maxPitch: 0, dragRotate: false, pitchWithRotate: false,
        renderWorldCopies: false, attributionControl: false, canvasContextAttributes: { preserveDrawingBuffer: true },
      });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");
      map.on("movestart", () => {
        onView(null);
        if (map.isStyleLoaded()) { failed.current = false; setMapError(""); }
      });
      map.on("idle", () => {
        if (!failed.current && map.isStyleLoaded() && map.areTilesLoaded()) onView(currentFrame(map));
      });
      map.on("error", () => {
        failed.current = true;
        onView(null);
        setMapError("有地图资源加载失败。可重试，或改用本地影像。");
      });
    } catch {
      setMapError("无法启动地图预览。可改用本地影像。");
    }
    return () => {
      request.current?.abort();
      request.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, [reload, mapRef, onView]);

  const locate = (center, name) => {
    const map = mapRef.current;
    if (!map) return;
    setResults([]);
    onPlace(name);
    map.jumpTo({ center, zoom: 16, bearing: 0, pitch: 0 });
  };
  const search = async event => {
    event.preventDefault();
    const text = query.trim();
    if (!text || request.current) return;
    setSearchError("");
    setResults([]);
    const center = coordinates(text);
    if (center) { locate(center, ""); return; }
    if (/^[\s+\-.,，\d]+$/.test(text)) { setSearchError("请输入有效的纬度, 经度，例如 31.23, 121.49。"); return; }
    const controller = new AbortController();
    request.current = controller;
    setSearching(true);
    try {
      const url = new URL("https://photon.komoot.io/api/");
      url.search = new URLSearchParams({ q: text, limit: "5" });
      const response = await fetch(url, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(9000)]) });
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      const places = (data.features || []).flatMap(({ geometry, properties }, index) => {
        const center = geometry?.coordinates;
        if (!Array.isArray(center) || center.length !== 2 || !center.every(Number.isFinite) || Math.abs(center[1]) > 85.05) return [];
        const name = [...new Set([properties?.name, properties?.street, properties?.city, properties?.state, properties?.country].filter(Boolean))].join(" · ");
        return [{ center, name: name || center.join(", "), index }];
      }).slice(0, 5);
      if (!places.length) setSearchError("未找到地点。可以换个名称，或输入纬度和经度。");
      else setResults(places);
    } catch {
      if (!controller.signal.aborted) setSearchError("地点搜索暂不可用。可以输入纬度和经度定位。");
    } finally {
      if (request.current === controller) {
        request.current = null;
        setSearching(false);
      }
    }
  };

  return <>
    <form className="map-search" onSubmit={search}>
      <input type="search" aria-label="搜索地点或输入坐标" placeholder="地点、地址，或纬度, 经度" value={query}
        onChange={event => setQuery(event.target.value)} maxLength={160} />
      <button type="submit" disabled={!query.trim() || searching}>{searching ? "正在搜索…" : "定位"}</button>
    </form>
    <small className="map-hint">地点名称仅在提交时发送至 Photon 搜索。坐标定位无需地名搜索。</small>
    {searchError && <p className="map-error" role="alert">{searchError}</p>}
    {results.length > 0 && <div className="map-results" aria-label="地点搜索结果">
      {results.map(place => <button key={place.index} type="button" onClick={() => locate(place.center, place.name)}>{place.name}</button>)}
    </div>}
    <div className="map-preview">
      <div ref={host} className="map-viewport" aria-label="街道地图取景" />
      <div className="map-credits">
        <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> ·{" "}
        <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> ·{" "}
        <a href={streetLicense} target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </div>
    </div>
    {mapError && <div className="map-network-error"><span role="alert">{mapError}</span>
      <button type="button" onClick={() => setReload(value => value + 1)}>重试地图</button></div>}
  </>;
}

function ImagePreview({ canvas }) {
  const host = useRef(null);
  useEffect(() => {
    if (canvas) host.current.append(canvas);
    return () => canvas?.remove();
  }, [canvas]);
  return <div className="map-image-preview" ref={host} aria-label="本地影像预览">{!canvas && <span>请选择正射影像或有已知尺寸的平面图</span>}</div>;
}

export default function MapSetup({ close, create }) {
  const dialog = useRef(null);
  const mapRef = useRef(null);
  const [source, setSource] = useState("street");
  const [name, setName] = useState("");
  const [view, setView] = useState(null);
  const [canvas, setCanvas] = useState(null);
  const [realWidth, setRealWidth] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current.showModal(); }, []);
  const widthMeters = Number(realWidth);
  const localReady = !!canvas && Number.isFinite(widthMeters) && widthMeters > 0;
  const localWidth = canvas && Math.min(1000, canvas.width);
  const ready = source === "street" ? !!view : localReady;
  const extent = source === "street" ? view && [view.width * view.metersPerPoint, view.height * view.metersPerPoint]
    : localReady && [widthMeters, widthMeters * canvas.height / canvas.width];
  const save = async () => {
    if (!ready || busy || loadingImage) return;
    setBusy(true);
    setError("");
    try {
      const capture = source === "street" ? captureStreetMap(mapRef.current)
        : { canvas, source, width: localWidth, height: localWidth * canvas.height / canvas.width, metersPerPoint: widthMeters / localWidth };
      const scene = sceneFromMap(capture);
      await create(name.trim() || "地图项目", scene, await mapThumbnail(capture.canvas));
    } catch (reason) {
      setError(reason.message || "无法创建地图项目。");
      setBusy(false);
    }
  };
  return <dialog ref={dialog} className="map-setup" aria-labelledby="map-setup-title"
    onCancel={event => { event.preventDefault(); if (!busy) close(); }}>
    <div className="map-setup-heading">
      <div><h2 id="map-setup-title">新建地图项目</h2><p>选取场地范围，生成锁定的底图和绘图尺度。</p></div>
      <button type="button" aria-label="关闭地图设置" onClick={close} disabled={busy}>×</button>
    </div>
    <div className="map-source" role="group" aria-label="底图来源">
      <button type="button" disabled={busy || loadingImage} aria-pressed={source === "street"} onClick={() => { setSource("street"); setError(""); }}>在线街道图</button>
      <button type="button" disabled={busy || loadingImage} aria-pressed={source === "local"} onClick={() => { setSource("local"); setView(null); setError(""); }}>本地影像</button>
    </div>
    {source === "street" ? <StreetMap mapRef={mapRef} onView={setView}
      onPlace={place => { if (place) setName(current => current || place.slice(0, 70)); }} /> : <>
      <label className="map-local-field">影像文件<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || loadingImage}
        onChange={async event => {
          const file = event.target.files[0];
          event.target.value = "";
          if (!file) return;
          setError("");
          setLoadingImage(true);
          try {
            setCanvas(await localMapImage(file));
            setRealWidth("");
            setName(current => current || file.name.replace(/\.[^.]+$/, "").slice(0, 70));
          } catch (reason) { setError(reason.message || "无法读取影像。"); }
          finally { setLoadingImage(false); }
        }} /></label>
      <ImagePreview canvas={canvas} />
      <label className="map-local-field">影像实地宽度（m）<input type="number" min="0" step="any" placeholder="如 120"
        value={realWidth} onChange={event => setRealWidth(event.target.value)} /></label>
    </>}
    <p className="map-readout" aria-live="polite">{extent ? `底图范围约 ${length(extent[0])} × ${length(extent[1])}`
      : source === "street" ? "拖动、缩放地图，预览范围即将成为底图。" : "输入影像覆盖的实地宽度，画布将按此比例校准。"}</p>
    {source === "street" && <small className="map-hint">尺度按取景中心纬度换算，适用于场地草绘。重要尺寸请用实测点复核。</small>}
    {error && <p className="map-error" role="alert">{error}</p>}
    <div className="map-setup-footer">
      <label>项目名称<input value={name} onChange={event => setName(event.target.value)} maxLength={70} placeholder="地图项目" /></label>
      <button type="button" onClick={close} disabled={busy}>取消</button>
      <button type="button" className="map-create" disabled={!ready || busy || loadingImage} onClick={save}>{busy ? "正在创建…" : "创建地图项目"}</button>
    </div>
  </dialog>;
}
