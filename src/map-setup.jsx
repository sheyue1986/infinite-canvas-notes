import React, { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, MercatorCoordinate, NavigationControl, setWorkerUrl } from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { coordinates, localMapImage, mapThumbnail, sceneFromMap, streetCredits, streetLicense } from "./map-project.js";
import { esriImagery, captureEsriMap, esriRadius } from "./esri-map.js";
import { mapScaleBar } from "./map-decoration.js";
import "./map-setup.css";

const street = { id: "street", style: "https://tiles.openfreemap.org/styles/liberty", credits: streetCredits };
const satellite = {
  id: "satellite",
  tiles: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg",
  maxZoom: 14,
  credits: "EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016) · CC BY 4.0",
};
function rasterStyle(provider) {
  return { version: 8, sources: { imagery: { type: "raster", tiles: [provider.tiles], tileSize: 256, maxzoom: provider.maxZoom } },
    layers: [{ id: "imagery", type: "raster", source: "imagery" }] };
}
setWorkerUrl(mapWorkerUrl);
const format = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
const length = meters => meters >= 1000 ? format.format(meters / 1000) + " km" : format.format(meters) + " m";

function currentFrame(map, provider) {
  const canvas = map.getCanvas();
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return null;
  const center = map.getCenter().wrap();
  const a = MercatorCoordinate.fromLngLat(map.unproject([width / 2 - 1, height / 2]));
  const b = MercatorCoordinate.fromLngLat(map.unproject([width / 2 + 1, height / 2]));
  const delta = b.x - a.x;
  const metersPerPoint = (delta - Math.round(delta)) / 2 / a.meterInMercatorCoordinateUnits();
  if (!(metersPerPoint > 0 && Number.isFinite(metersPerPoint))) return null;
  return { width, height, metersPerPoint, center: center.toArray(), bounds: map.getBounds().toArray(), zoom: map.getZoom(), source: provider.id, credits: provider.credits };
}

function captureOnlineMap(map, provider) {
  if (!map || !map.isStyleLoaded() || !map.areTilesLoaded() || map.isMoving()) throw new Error("地图还在加载，请稍后再试。");
  const frame = currentFrame(map, provider);
  if (!frame) throw new Error("无法读取当前地图范围。");
  const image = map.getCanvas();
  const output = document.createElement("canvas");
  const ratio = Math.min(1, 4096 / Math.max(image.width, image.height));
  output.width = Math.round(image.width * ratio);
  output.height = Math.round(image.height * ratio);
  output.getContext("2d").drawImage(image, 0, 0, output.width, output.height);
  return { ...frame, canvas: output };
}

function MapReference({ frame }) {
  const bar = frame && mapScaleBar(frame.metersPerPoint, 112);
  return <div className="map-reference" aria-label={bar ? "指北针与比例尺 " + bar.label : "指北针"}>
    <svg width="48" height="56" viewBox="0 0 48 56" aria-hidden="true">
      <text x="24" y="10" textAnchor="middle">N</text><circle cx="24" cy="33" r="19" />
      <path d="M5 33H43M24 52V14" /><path className="map-north-arm" d="M24 33V14" />
    </svg>
    {bar && <div className="map-reference-scale" style={{ width: bar.points }}><span>0</span><span>{bar.label}</span></div>}
  </div>;
}

function OnlineMap({ mapRef, camera, provider, view, onView, onPlace }) {
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
        container: host.current, style: provider.style || rasterStyle(provider),
        center: camera.current.center, zoom: camera.current.zoom, pixelRatio: Math.min(2.5, Math.max(2, window.devicePixelRatio || 1)),
        minZoom: 3, maxZoom: 21, maxPitch: 0, dragRotate: false, pitchWithRotate: false,
        renderWorldCopies: false, attributionControl: false, canvasContextAttributes: { preserveDrawingBuffer: true },
      });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      map.on("movestart", () => {
        onView(null);
        if (map.isStyleLoaded()) { failed.current = false; setMapError(""); }
      });
      map.on("idle", () => {
        camera.current = { center: map.getCenter().toArray(), zoom: map.getZoom() };
        if (!failed.current && map.isStyleLoaded() && map.areTilesLoaded()) onView(currentFrame(map, provider));
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
  }, [reload, mapRef, camera, provider, onView]);

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
      <div ref={host} className="map-viewport" aria-label="在线底图取景" />
      <MapReference frame={view} />
      <div className="map-credits">
        {provider.id === "street" ? <><a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> ·{" "}
          <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> ·{" "}
          <a href={streetLicense} target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></>
          : provider.id === "satellite" ? <a href="https://cloudless.eox.at/documentation/license" target="_blank" rel="noreferrer">{provider.credits}</a> : provider.id === "esri" ? <a href={esriImagery.item} target="_blank" rel="noreferrer">{provider.credits}</a> : provider.credits}
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
  const camera = useRef({ center: [121.49, 31.23], zoom: 12 });
  const [source, setSource] = useState("street");
  const [custom, setCustom] = useState(null);
  const [esriKey, setEsriKey] = useState("");
  const [gridMeters, setGridMeters] = useState(0);
  const [north, setNorth] = useState(0);
  const provider = source === "street" ? street : source === "satellite" ? satellite : source === "esri" ? esriImagery : source === "custom" ? custom : null;
  const selectSource = next => { setSource(next); setView(null); setError(""); };
  const setImagery = event => {
    event.preventDefault();
    const form = event.currentTarget.elements;
    const tiles = form.tiles.value.trim(), credits = form.credits.value.trim();
    const sample = URL.parse(tiles.replaceAll("{z}", "16").replaceAll("{x}", "1").replaceAll("{y}", "1"));
    if (!sample || sample.protocol !== "https:" || sample.username || sample.password || !["{z}", "{x}", "{y}"].every(key => tiles.includes(key)) || !credits) {
      setError("请输入包含 {z}、{x}、{y} 的 HTTPS 瓦片地址和图源署名。");
      return;
    }
    setView(null);
    setError("");
    setCustom({ id: "custom", tiles, credits, maxZoom: form.tileZoom.valueAsNumber });
  };
  const [name, setName] = useState("");
  const [view, setView] = useState(null);
  const [canvas, setCanvas] = useState(null);
  const [realWidth, setRealWidth] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current.showModal(); }, []);
  const widthMeters = Number(realWidth);
  const localReady = !!canvas && Number.isFinite(widthMeters) && widthMeters >= 0.01 && widthMeters <= 20000000;
  const localWidth = canvas && Math.min(1000, canvas.width);
  const esriInRange = esriRadius(view) >= 10;
  const ready = source === "local" ? localReady : Boolean(provider && view && (source !== "esri" || (esriKey.trim() && esriInRange)));
  const extent = source !== "local" ? view && [view.width * view.metersPerPoint, view.height * view.metersPerPoint]
    : localReady && [widthMeters, widthMeters * canvas.height / canvas.width];
  const save = async () => {
    if (!ready || busy || loadingImage) return;
    setBusy(true);
    setError("");
    try {
      const capture = source === "esri" ? await captureEsriMap(view, esriKey.trim())
        : source !== "local" ? captureOnlineMap(mapRef.current, provider)
        : { canvas, source, width: localWidth, height: localWidth * canvas.height / canvas.width, metersPerPoint: widthMeters / localWidth, north };
      const scene = sceneFromMap({ ...capture, gridMeters });
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
      {[["street", "在线街道图"], ["esri", "Esri 高清卫星图"], ["satellite", "免费卫星图"], ["custom", "自定义高清影像"], ["local", "本地影像"]].map(([id, label]) =>
        <button key={id} type="button" disabled={busy || loadingImage} aria-pressed={source === id}
          onClick={() => { if (source !== id) selectSource(id); }}>{label}</button>)}
    </div>
    {source === "satellite" && <small className="map-hint">全球 Sentinel-2 影像，原始分辨率约 10 m（2016 年合成）。</small>}
    {source === "custom" && <form className="map-custom" onSubmit={setImagery}>
      <label>瓦片地址<input name="tiles" type="url" required maxLength={2048} defaultValue={custom?.tiles || ""} placeholder="https://…/{z}/{x}/{y}.jpg" /></label>
      <label>图源署名<input name="credits" required maxLength={160} defaultValue={custom?.credits || ""} placeholder="图源名称与署名" /></label>
      <label>原生最高级别<input name="tileZoom" type="number" min="0" max="22" defaultValue={custom?.maxZoom ?? 20} required /></label>
      <button type="submit" disabled={busy}>加载图源</button>
      <small className="map-hint">支持允许浏览器访问的 Web Mercator XYZ 服务。请使用许可截取并保存的图源。</small>
    </form>}
    {provider && <OnlineMap mapRef={mapRef} camera={camera} provider={provider} view={view} onView={setView}
      onPlace={place => { if (place) setName(current => current || place.slice(0, 70)); }} />}
    {source === "esri" && <div className="map-esri-settings">
      <label>Esri 静态底图密钥
        <input type="password" aria-label="Esri 静态底图密钥" autoComplete="off" spellCheck={false} maxLength={4096}
          value={esriKey} disabled={busy} placeholder="预览无需密钥" onChange={event => setEsriKey(event.target.value)} />
      </label>
      <small className="map-hint">在线取景无需密钥。创建项目时使用具备 Static Maps 权限的 ArcGIS 密钥请求一张静态图，
        按你的账户额度计费。密钥仅用于本次窗口，不写入项目。
        {" "}<a href="https://developers.arcgis.com/rest/static-maps/get-started/" target="_blank" rel="noreferrer">Esri 密钥说明</a>
      </small>
      {view && !esriInRange && <small className="map-hint">静态底图的最短边需覆盖至少 20 米，请缩小一点。</small>}
    </div>}
    {source === "local" && <>
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
      <label className="map-local-field">影像实地宽度（m）<input type="number" min="0.01" max="20000000" step="any" placeholder="如 120"
        value={realWidth} onChange={event => setRealWidth(event.target.value)} /></label>
      <label className="map-local-field">影像北向（从上顺时针 °）<input type="number" min="-360" max="360" step="any" value={north}
        onChange={event => setNorth(Math.max(-360, Math.min(360, event.target.valueAsNumber || 0)))} /></label>
    </>}
    <p className="map-readout" aria-live="polite">{extent ? `底图范围约 ${length(extent[0])} × ${length(extent[1])}`
      : source !== "local" ? "拖动、缩放地图，预览范围即将成为底图。" : "输入影像覆盖的实地宽度，画布将按此比例校准。"}</p>
    {provider && <small className="map-hint">确认后按取景中心纬度换算地面米数。重要尺寸请用实测点复核。</small>}
    {error && <p className="map-error" role="alert">{error}</p>}
    <div className="map-setup-footer">
      <label>地面大网格<select aria-label="地面大网格" value={gridMeters} disabled={busy} onChange={event => setGridMeters(Number(event.target.value))}>
        <option value="0">关闭</option>{[5, 10, 15].map(m => <option key={m} value={m}>{m} m</option>)}</select></label>
      <label>项目名称<input value={name} onChange={event => setName(event.target.value)} maxLength={70} placeholder="地图项目" /></label>
      <button type="button" onClick={close} disabled={busy}>取消</button>
      <button type="button" className="map-create" disabled={!ready || busy || loadingImage} onClick={save}>{busy ? "正在创建…" : "创建地图项目"}</button>
    </div>
  </dialog>;
}
