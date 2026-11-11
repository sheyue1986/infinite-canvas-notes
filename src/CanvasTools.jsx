import React, { useEffect, useRef, useState } from "react";
import { CaptureUpdateAction, exportToBlob, getCommonBounds, newElementWith, viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";
import { assignedKey, commands, isCommandEvent, keyChord, nativeAliases, readShortcuts, runNativeCommand, shortcutById } from "./canvasCommands";
import { isPrecisionShortcut } from "../published-site/assets/drawing-tools.js";
import { elementOpacity, layerOf, withElementOpacity } from "./layers.jsx";
import { shortcutFromEvent } from "./tool-shortcuts.jsx";
import "./selection-tools.css";
import { canDeform, canTransform, clamp, inLasso, outline, pickElement, toggleSelected, transformMembers, transformSelection } from "./selectionGeometry";

const paths = {
  lasso: "M7 17c-5-1-5-6-2-10 3-4 10-5 14-2 4 3 3 8-1 10-3 2-7 1-9 2-4 2-2 5 0 3 2-2 0-4-2-3Z",
  item: "M12 3v5m0 8v5M3 12h5m8 0h5m-9-7a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z",
  color: "m14 6 4 4m-5-2-8 8-1 4 4-1 8-8m-4-4 3 3 5-5a2 2 0 0 0-3-3l-5 5Z",
  copyAsPng: "m9 12 5-5a2 2 0 0 1 3 3l-6 6a4 4 0 0 1-6-6l7-7a5 5 0 0 1 7 7l-7 7",
  duplicateSelection: "M9 8h11v12H9zM15 4H4v12",
  group: "M3 3h18v18H3zM6 7h5v5H6zM12 12h5v5h-5z",
  ungroup: "M3 3h7v7H3zM14 14h7v7h-7zM14 5h5m-2-2v5M5 16h5",
  toggleElementLock: "M6 10h12v10H6zM8 10V7a4 4 0 1 1 8 0v3m-4 4v2",
  deleteSelectedElements: "M4 6h16m-2 0-1 14H7L6 6m3 0V3h6v3m-5 4v6m4-6v6",
  flipHorizontal: "M12 3v18M9 6 3 18h6zM15 6l6 12h-6z",
  flipVertical: "M3 12h18M6 9l12-6v6zM6 15l12 6v-6z",
};

function Icon({ name }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

const alignment = ["alignLeft", "alignRight", "alignTop", "alignBottom", "alignVerticallyCentered",
  "alignHorizontallyCentered", "distributeHorizontally", "distributeVertically"];

function AlignmentMenu({ zh, disabled, count, choose }) {
  const [open, setOpen] = useState(false);
  return <div className="icn-local-align" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      event.currentTarget.firstElementChild.focus();
    }
  }}>
    <button type="button" aria-label={zh ? "对齐" : "Align"} aria-expanded={open && !disabled}
      disabled={disabled} onClick={() => setOpen(value => !value)}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 3v14m3-12h11M6 9h8m-8 4h11" /></svg>
    </button>
    {open && !disabled && <div className="icn-local-align-options" role="group" aria-label={zh ? "对齐方向" : "Alignment directions"}>
      {alignment.map(id => <button type="button" key={id} disabled={id.startsWith("distribute") && count < 3}
        onClick={() => { choose(id); setOpen(false); }}>{zh ? shortcutById[id].zh : shortcutById[id].en}</button>)}
    </div>}
  </div>;
}

const choose = (zh, chinese, english) => zh ? chinese : english;
const selectionModes = ["lasso", "item", "color"];
const scaleModes = ["scale", "stretch", "off"];

function loadOptions() {
  try { return JSON.parse(localStorage.getItem("icn-selection-v1")) || {}; }
  catch { return {}; }
}

function NumberField({ label, value, unit, disabled, onCommit }) {
  return <label className="icn-measure">{label}<input key={value} aria-label={label} type="number" defaultValue={value} disabled={disabled}
    onBlur={(event) => { if (event.target.value !== "" && Number(event.target.value) !== value) onCommit(Number(event.target.value)); }}
    onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><span>{unit}</span></label>;
}

export function useCanvasTools({ apiRef, zh, viewport, overlay, enabled, appCommands, ready, settingsOpen, layerView, brushKitRef, canActivate, nativeToolRef }) {
  const [initial] = useState(loadOptions);
  const [tool, setTool] = useState(null);
  const [selectionMode, setSelectionMode] = useState(initial.selectionMode || "lasso");
  const [partial, setPartial] = useState(initial.partial ?? true);
  const [includeLocked, setIncludeLocked] = useState(initial.includeLocked ?? false);
  const [highlight, setHighlight] = useState(initial.highlight ?? true);
  const [rotate, setRotate] = useState(initial.rotate ?? true);
  const [scale, setScale] = useState(initial.scale || "scale");
  const [touchSelect, setTouchSelect] = useState(initial.touchSelect ?? false);
  const [holdSelect, setHoldSelect] = useState(initial.holdSelect ?? false);
  const [moveSelection, setMoveSelection] = useState(false);
  const [activeLayerOnly, setActiveLayerOnly] = useState(false);
  const [filters, setFilters] = useState(false);
  const [bindings, setBindings] = useState(readShortcuts);
  const [guide, setGuide] = useState(null);
  const [pickedColor, setPickedColor] = useState(null);
  const gesture = useRef(null);
  const magnifierZoom = useRef(null);

  useEffect(() => {
    try { localStorage.setItem("icn-shortcuts-v1", JSON.stringify(bindings)); } catch { /* optional preference */ }
  }, [bindings]);
  useEffect(() => {
    try { localStorage.setItem("icn-selection-v1", JSON.stringify({ selectionMode, partial, includeLocked, highlight, rotate, scale, touchSelect, holdSelect })); }
    catch { /* optional preference */ }
  }, [selectionMode, partial, includeLocked, highlight, rotate, scale, touchSelect, holdSelect]);

  function clearGesture() {
    const session = gesture.current;
    clearTimeout(session?.timer);
    if (session?.type === "zoom") {
      cancelAnimationFrame(session.zoomFrame);
      if (session.cached && apiRef.current?.getAppState().zoom === magnifierZoom.current) {
        apiRef.current.updateScene({ appState: { shouldCacheIgnoreZoom: false } });
      }
    }
    gesture.current = null;
  }

  function syncTool(kind) {
    const next = kind === "zoom" ? "zoom" : kind === "lasso" ? "selection" : null;
    if (tool === next) return;
    if (next !== "selection" || gesture.current?.type !== "hold") clearGesture();
    setTool(next);
    setMoveSelection(false);
    setGuide(null);
    setFilters(next === "selection");
  }

  function cancel() {
    if (tool) brushKitRef.current.activateById("select");
    else clearGesture();
  }

  useEffect(() => { if (!enabled && tool) cancel(); }, [enabled, tool]);
  useEffect(() => {
    function nativeTool(event) {
      if (event.target.closest?.(".App-toolbar input, .App-toolbar label")) cancel();
    }
    document.addEventListener("pointerdown", nativeTool, true);
    return () => document.removeEventListener("pointerdown", nativeTool, true);
  }, [tool]);
  useEffect(() => () => {
    clearTimeout(gesture.current?.timer);
    cancelAnimationFrame(gesture.current?.zoomFrame);
  }, []);

  function selectLasso() {
    if (canActivate()) brushKitRef.current.activateById("lasso");
  }

  const elements = apiRef.current?.getSceneElements() || [];
  const members = overlay ? transformMembers(elements, apiRef.current.getAppState().selectedElementIds) : [];
  const bounds = members.length ? getCommonBounds(members) : null;
  const canScale = scale !== "off" && canTransform(members, elements, { stretch: scale === "stretch" });
  const canRotate = rotate && canTransform(members, elements, { rotate: true });
  const deformable = canScale && canDeform(members);
  const layerModel = layerView.current;
  const activeLayer = layerModel.items.find(item => item.id === (layerModel.focus || layerModel.active));
  const [left, top, right, bottom] = bounds || [0, 0, 0, 0];
  const toViewport = ([x, y]) => [(x + viewport.scrollX) * viewport.zoom + viewport.offsetLeft, (y + viewport.scrollY) * viewport.zoom + viewport.offsetTop];
  const t = (chinese, english) => choose(zh, chinese, english);

  function updateTransform(options, source = members) {
    const api = apiRef.current;
    if (!api || api.getAppState().viewModeEnabled) return;
    const current = api.getSceneElements();
    const live = new Map(current.map((element) => [element.id, element]));
    if (source.some((element) => live.get(element.id)?.versionNonce !== element.versionNonce)) return;
    if (!canTransform(source, current, { rotate: Boolean(options.angle), stretch: options.sx !== options.sy && options.sy != null })) return;
    const changes = transformSelection(source, options);
    api.updateScene({
      elements: api.getSceneElementsIncludingDeleted().map((element) => changes.get(element.id) || element),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  }

  function execute(id) {
    const api = apiRef.current;
    if (!api) return;
    if (id in appCommands) { appCommands[id](); return; }
    const state = api.getAppState();
    if (id === "selectionFilters") {
      if (tool !== "selection") selectLasso();
      else setFilters((open) => !open);
    } else if (id === "selectionPartial") setPartial((value) => !value);
    else if (id === "selectionLocked") setIncludeLocked((value) => !value);
    else if (id === "selectionLayer") setActiveLayerOnly((value) => !value);
    else if (id === "selectionHighlight") setHighlight((value) => !value);
    else if (id === "moveSelection") {
      if (tool !== "selection") selectLasso();
      setMoveSelection((value) => !value);
    } else if (id === "holdSelection") setHoldSelect((value) => !value);
    else if (id === "touchSelection") setTouchSelect((value) => !value);
    else if (id === "selectionRotate") setRotate((value) => !value);
    else if (id === "selectionScale") setScale((value) => scaleModes[(scaleModes.indexOf(value) + 1) % scaleModes.length]);
    else if (id === "rotateLeft" || id === "rotateRight") {
      if (canRotate) updateTransform({ angle: (id === "rotateRight" ? 1 : -1) * Math.PI / 12 });
    } else if (id === "selectionGrow" || id === "selectionShrink") {
      if (canScale) updateTransform({ sx: id === "selectionGrow" ? 1.1 : 1 / 1.1, scaleStroke: scale === "scale" });
    } else if (id.startsWith("nudge")) {
      const key = shortcutById[id].key;
      document.querySelector(".canvas-shell .excalidraw-container")?.dispatchEvent(new KeyboardEvent("keydown", {
        key: key.split("+").at(-1), code: key.split("+").at(-1), shiftKey: key.startsWith("Shift+"), bubbles: true, cancelable: true,
      }));
    } else if (id === "copyAsPng" && members.length && navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      const image = exportToBlob({ elements: members, files: api.getFiles(), appState: { ...state, exportBackground: false }, mimeType: "image/png" });
      void navigator.clipboard.write([new ClipboardItem({ "image/png": image })])
        .then(() => api.setToast({ message: t("已复制透明 PNG", "Transparent PNG copied") }))
        .catch(() => api.setToast({ message: t("无法访问剪贴板", "Could not access the clipboard") }));
    } else {
      const command = shortcutById[id];
      runNativeCommand(command?.native || id, command?.value);
    }
  }

  useEffect(() => {
    function keydown(event) {
      if (isCommandEvent(event) || !event.isTrusted || event.isComposing) return;
      if (settingsOpen || event.target.closest?.("input, textarea, select, [contenteditable], dialog, [role='dialog']")) return;
      if (!ready) return;
      const state = apiRef.current?.getAppState();
      if (state?.openDialog || state?.editingTextElement) return;
      if (event.key === "Escape") { cancel(); return; }
      const chord = keyChord(event);
      if (!chord) return;
      const toolKey = shortcutFromEvent(event);
      const kit = brushKitRef.current;
      const nextTool = kit.shortcutForKey(toolKey) || kit.aliasForKey(toolKey) || /^Alt\+[1-8]$/.test(toolKey || "");
      const explicit = commands.find((item) => bindings[item.id] && assignedKey(item, bindings) === chord);
      if (nextTool && !explicit) return;
      const command = explicit
        || commands.find((item) => bindings[item.id] == null && (item.key === chord || nativeAliases[item.id]?.includes(chord)));
      if (command && isPrecisionShortcut(command) && event.repeat) return;
      const outsideEditor = !event.target.closest?.(".excalidraw, .object-library");
      const owned = command && (command.id in appCommands || bindings[command.id] != null
        || (outsideEditor && !["copy", "cut", "paste"].includes(command.id)));
      if (owned) {
        event.preventDefault();
        event.stopImmediatePropagation();
        execute(command.id);
      } else if (!command && chord === "Alt+Slash") {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (!command && chord && commands.some((item) => bindings[item.id] != null && (item.key === chord || nativeAliases[item.id]?.includes(chord)))) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    window.addEventListener("keydown", keydown, true);
    return () => window.removeEventListener("keydown", keydown, true);
  });

  function scenePoint(event) {
    const point = viewportCoordsToSceneCoords(event, apiRef.current.getAppState());
    return [point.x, point.y];
  }

  function onDown(event) {
    const api = apiRef.current;
    if (!api || !enabled || event.button !== 0 || !event.target.closest?.("canvas")) return false;
    const state = api.getAppState();
    if (state.editingTextElement || state.openDialog || (tool && nativeToolRef.current !== "selection")) return false;
    const finger = event.pointerType === "touch";
    const touch = finger && touchSelect;
    const pendingHold = !tool && !touch && holdSelect && (finger || event.pointerType === "pen") && state.activeTool.type === "selection";
    const existing = gesture.current;
    if (finger && existing?.finger && existing.type !== "zoom" && existing.type !== "pinch" && tool === "selection" && (canRotate || canScale)) {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      clearTimeout(existing.timer);
      const start = [existing.latest || existing.start, [event.clientX, event.clientY]];
      const midpoint = start.map(([clientX, clientY]) => scenePoint({ clientX, clientY }));
      gesture.current = {
        type: "pinch", ids: [existing.id, event.pointerId], start, points: [...start], members,
        anchor: [(midpoint[0][0] + midpoint[1][0]) / 2, (midpoint[0][1] + midpoint[1][1]) / 2],
      };
      return true;
    }
    if (tool !== "zoom" && (state.viewModeEnabled || (!touch && !pendingHold && tool !== "selection") || moveSelection)) return false;
    if (gesture.current) return false;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = scenePoint(event);
    gesture.current = {
      id: event.pointerId, type: tool === "zoom" ? "zoom" : pendingHold ? "hold" : selectionMode, state, point, finger,
      start: [event.clientX, event.clientY], points: [[event.clientX, event.clientY]], replace: event.ctrlKey || event.metaKey,
    };
    if (tool === "zoom") {
      Object.assign(gesture.current, { y: event.clientY, lastY: event.clientY, value: state.zoom.value, zoomFrame: 0, cached: false });
    } else if (pendingHold) {
      const session = gesture.current;
      session.timer = setTimeout(() => {
        if (gesture.current !== session) return;
        brushKitRef.current.activateById("lasso");
        session.type = selectionMode;
        setGuide({ type: selectionMode, points: session.points });
      }, 450);
    } else if (tool !== "zoom") setGuide({ type: selectionMode, points: gesture.current.points });
    return true;
  }

  function selectionCandidates() {
    const layers = new Map(layerModel.items.map(item => [item.id, item]));
    return (apiRef.current?.getSceneElements() || []).filter((element) => {
      const id = layerOf(element);
      const layer = layers.get(id);
      return !element.containerId && layer?.visible !== false && !layer?.archived
        && (!layerModel.focus || id === layerModel.focus)
        && (includeLocked || !element.locked) && (!activeLayerOnly || id === activeLayer?.id);
    });
  }

  function applyZoom(session, finished = false) {
    const api = apiRef.current;
    const { state, point, start, y, lastY } = session;
    // A 60 px drag doubles the scale. Apply accumulated movement once per paint.
    const value = clamp(session.value * 2 ** ((lastY - y) / 60), 0.1, 30);
    session.lastY = y;
    if (!api || value === session.value && !(finished && session.cached)) return;
    session.value = value;
    session.cached = !finished;
    const zoom = { value };
    magnifierZoom.current = zoom;
    api.updateScene({ appState: {
      zoom, shouldCacheIgnoreZoom: !finished,
      scrollX: (start[0] - state.offsetLeft) / value - point[0],
      scrollY: (start[1] - state.offsetTop) / value - point[1],
    } });
  }

  function queueZoom(session, y) {
    session.y = y;
    if (session.zoomFrame) return;
    session.zoomFrame = requestAnimationFrame(() => {
      session.zoomFrame = 0;
      if (gesture.current === session) applyZoom(session);
    });
  }

  function onTouch(event) {
    if (!enabled || !event.target.closest?.("canvas")) return;
    if (tool === "zoom" || tool === "selection" && !moveSelection || touchSelect
      || holdSelect && apiRef.current?.getAppState().activeTool.type === "selection") {
      // The editor's legacy touch listener otherwise clears the selection on a second finger.
      event.stopPropagation();
    }
  }

  function onMove(event) {
    const session = gesture.current;
    if (session?.type === "pinch" && session.ids.includes(event.pointerId)) {
      event.stopPropagation();
      session.points[session.ids.indexOf(event.pointerId)] = [event.clientX, event.clientY];
      showTransformPreview(session.members, pinchOptions(session));
      return true;
    }
    if (!session || session.id !== event.pointerId || session.type === "transform") return false;
    event.stopPropagation();
    session.latest = [event.clientX, event.clientY];
    if (session.type === "hold" && Math.hypot(event.clientX - session.start[0], event.clientY - session.start[1]) > 8) {
      clearTimeout(session.timer);
      session.type = "pan";
    }
    if (session.type === "hold") return true;
    if (session.type === "pan") apiRef.current.updateScene({ appState: {
      scrollX: session.state.scrollX + (event.clientX - session.start[0]) / session.state.zoom.value,
      scrollY: session.state.scrollY + (event.clientY - session.start[1]) / session.state.zoom.value,
    } });
    else if (session.type === "zoom") queueZoom(session, event.clientY);
    else {
      const point = [event.clientX, event.clientY];
      if (session.type !== "lasso") {
        const api = apiRef.current;
        const hit = pickElement(selectionCandidates(), scenePoint(event), api.getAppState().zoom.value);
        setGuide({ type: session.type, points: [point], hit: Boolean(hit), subtract: hit && api.getAppState().selectedElementIds[hit.id] });
      } else if (Math.hypot(point[0] - session.points.at(-1)[0], point[1] - session.points.at(-1)[1]) >= 3) {
        session.points.push(point);
        setGuide({ type: "lasso", points: [...session.points] });
      }
    }
    return true;
  }

  function onEnd(event, cancelled = false) {
    const session = gesture.current;
    if (session?.type === "pinch" && session.ids.includes(event.pointerId)) {
      event.stopPropagation();
      gesture.current = null;
      setGuide(null);
      if (!cancelled) updateTransform(pinchOptions(session), session.members);
      return true;
    }
    if (!session || session.id !== event.pointerId || session.type === "transform") return false;
    event.stopPropagation();
    if (session.type === "zoom") {
      if (!cancelled) { session.y = event.clientY; applyZoom(session, true); }
      clearGesture();
      return true;
    }
    clearGesture();
    setGuide(null);
    if (cancelled || session.type === "pan") return true;
    const api = apiRef.current;
    const candidates = selectionCandidates();
    const point = scenePoint(event);
    const target = pickElement(candidates, point, api.getAppState().zoom.value);
    if (session.type === "color") {
      if (target) {
        const { strokeColor, backgroundColor, strokeWidth, strokeStyle, fillStyle, roughness } = target;
        const opacity = elementOpacity(target);
        const selected = api.getAppState().selectedElementIds;
        api.updateScene({ appState: {
          currentItemStrokeColor: strokeColor, currentItemBackgroundColor: backgroundColor,
          currentItemStrokeWidth: strokeWidth, currentItemStrokeStyle: strokeStyle, currentItemFillStyle: fillStyle,
          currentItemOpacity: opacity, currentItemRoughness: roughness,
        }, elements: api.getSceneElementsIncludingDeleted().map((element) => (
          event.shiftKey && selected[element.id] && !element.locked
            ? withElementOpacity(newElementWith(element, { strokeColor, backgroundColor, strokeWidth, strokeStyle, fillStyle, roughness }), opacity, layerModel)
            : element
        )), captureUpdate: event.shiftKey ? CaptureUpdateAction.IMMEDIATELY : CaptureUpdateAction.EVENTUALLY });
        setPickedColor(strokeColor);
      }
    } else {
      const path = [...session.points, [event.clientX, event.clientY]];
      const polygon = path.map(([clientX, clientY]) => scenePoint({ clientX, clientY }));
      const hits = session.type === "lasso" && session.points.length >= 3
        ? candidates.filter((element) => inLasso(element, polygon, partial))
        : target ? [target] : [];
      toggleSelected(api, hits, candidates, session.replace || session.type === "hold");
    }
    return true;
  }

  function startTransform(event, handle) {
    if (event.button !== 0 || gesture.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const positions = { nw: [right, bottom, left, top], ne: [left, bottom, right, top], sw: [right, top, left, bottom], se: [left, top, right, bottom] };
    const [ax, ay, hx, hy] = positions[handle] || [(left + right) / 2, (top + bottom) / 2];
    gesture.current = { type: "transform", id: event.pointerId, handle, members, anchor: [ax, ay], handlePoint: [hx, hy], startPoint: scenePoint(event), bounds };
  }

  function transformOptions(event, session) {
    const [x, y] = scenePoint(event);
    const [ax, ay] = session.anchor;
    const [sx, sy] = session.startPoint;
    if (session.handle === "rotate") {
      let angle = Math.atan2(y - ay, x - ax) - Math.atan2(sy - ay, sx - ax);
      if (event.shiftKey) angle = Math.round(angle / (Math.PI / 12)) * Math.PI / 12;
      return { angle, anchor: session.anchor };
    }
    const [hx, hy] = session.handlePoint;
    const dx = hx - ax;
    const dy = hy - ay;
    const mx = x - sx;
    const my = y - sy;
    if (event.altKey && deformable) {
      return { deform: { handle: session.handle, dx: mx, dy: my, skew: event.shiftKey } };
    }
    const factor = clamp(1 + (dx * mx + dy * my) / Math.max(1, dx * dx + dy * dy), 0.05, 20);
    return {
      anchor: session.anchor,
      sx: scale === "scale" || event.shiftKey || Math.abs(dx) < 1 ? factor : clamp(1 + mx / dx, 0.05, 20),
      sy: scale === "scale" || event.shiftKey || Math.abs(dy) < 1 ? factor : clamp(1 + my / dy, 0.05, 20),
      scaleStroke: scale === "scale",
    };
  }

  function moveTransform(event) {
    const session = gesture.current;
    if (!session || session.type !== "transform" || session.id !== event.pointerId) return;
    showTransformPreview(session.members, transformOptions(event, session));
  }

  function showTransformPreview(source, options) {
    const preview = transformSelection(source, options);
    setGuide({ type: "preview", outlines: [...preview.values()].map((element) => {
      const points = outline(element).map(toViewport);
      return element.points ? points : [...points, points[0]];
    }) });
  }

  function pinchOptions(session) {
    const vector = ([a, b]) => [b[0] - a[0], b[1] - a[1]];
    const start = vector(session.start);
    const current = vector(session.points);
    return {
      anchor: session.anchor,
      sx: canScale ? clamp(Math.hypot(...current) / Math.max(1, Math.hypot(...start)), 0.05, 20) : 1,
      angle: canRotate ? Math.atan2(current[1], current[0]) - Math.atan2(start[1], start[0]) : 0,
      scaleStroke: scale === "scale",
    };
  }

  function endTransform(event, cancelled = false) {
    const session = gesture.current;
    if (!session || session.type !== "transform" || session.id !== event.pointerId) return;
    gesture.current = null;
    setGuide(null);
    if (!cancelled && Math.hypot(...scenePoint(event).map((value, index) => value - session.startPoint[index])) > 0.25) {
      updateTransform(transformOptions(event, session), session.members);
    }
  }

  const caption = { lasso: t("套索", "Lasso"), item: t("逐项选取", "Item picker"), color: t("矢量取色", "Color picker") };
  const scaleCaption = { scale: t("等比缩放", "Scale"), stretch: t("自由拉伸", "Stretch"), off: t("尺寸锁定", "Size locked") };
  const scaleNumeric = (axis, value) => {
    const length = axis === "x" ? right - left : bottom - top;
    if (!canScale || length <= 0 || !Number.isFinite(value) || value <= 0) return;
    const factor = clamp(value / length, 0.05, 20);
    updateTransform(scale === "scale" ? { sx: factor } : {
      sx: axis === "x" ? factor : 1, sy: axis === "y" ? factor : 1, scaleStroke: false,
    });
  };
  const angle = members.length === 1 ? Math.round(members[0].angle * 1800 / Math.PI) / 10 : 0;
  const singleGroup = members[0]?.groupIds.at(-1);
  const groupAction = singleGroup && members.every((item) => item.groupIds.includes(singleGroup)) ? "ungroup" : "group";
  const actionButtons = ["copyAsPng", "duplicateSelection", groupAction, "toggleElementLock", "deleteSelectedElements", "flipHorizontal", "flipVertical"];
  const alignCount = new Set(members.map(element => element.groupIds.at(-1) || element.containerId || element.id)).size;
  const lockedSelection = members.some((item) => item.locked);
  const hasSelection = Boolean(bounds && viewport);
  const topLeft = hasSelection ? toViewport([left, top]) : null;
  const bottomRight = hasSelection ? toViewport([right, bottom]) : null;
  const centerX = hasSelection ? clamp((topLeft[0] + bottomRight[0]) / 2, 160, Math.max(160, window.innerWidth - 160)) : 0;
  const popupY = hasSelection ? clamp(topLeft[1] - 83, 108, Math.max(108, window.innerHeight - 162)) : 0;
  const usePopup = tool === "selection" && hasSelection;
  const canvasHighlights = usePopup && highlight ? members.map((element) => ({ element, points: outline(element).map(toViewport) })) : [];
  const commandLabel = (id) => zh ? shortcutById[id].zh : shortcutById[id].en;

  return {
    tool: moveSelection ? null : tool, onDown, onMove, onEnd, onTouch, bindings, setBindings, syncTool,
    isMagnifierZoom: zoom => zoom === magnifierZoom.current,
    ui: ready && <>
      {tool === "zoom" && <div className="icn-mode-hint">{t("放大镜 · 左键向上拖动放大，向下拖动缩小 · Esc 退出", "Magnifier · Drag up to zoom in, down to zoom out · Esc exits")}</div>}
      {tool === "selection" && <div className="icn-selection-dock">
        <div className="icn-pills" role="toolbar" aria-label={t("选区设置", "Selection settings")}>
          {(filters || !hasSelection) && <>
            {selectionModes.map((mode) => <button key={mode} type="button" className={selectionMode === mode ? "is-on" : ""} title={caption[mode]} aria-pressed={selectionMode === mode} onClick={() => { setMoveSelection(false); setSelectionMode(mode); }}><Icon name={mode} />{caption[mode]}</button>)}
            {selectionMode === "lasso" && <button type="button" className={partial ? "is-on" : ""} onClick={() => execute("selectionPartial")} aria-pressed={partial}>{partial ? t("相交", "Crossing") : t("完全包含", "Enclosed")}</button>}
            <button type="button" className={includeLocked ? "is-on" : ""} onClick={() => execute("selectionLocked")} aria-pressed={includeLocked}>{t("包含锁定", "Include locked")}</button>
            <button type="button" className={activeLayerOnly ? "is-on" : ""} aria-pressed={activeLayerOnly} onClick={() => execute("selectionLayer")}>{activeLayerOnly ? activeLayer?.name || t("当前图层", "Active layer") : t("全部图层", "All layers")}</button>
            <button type="button" className={touchSelect ? "is-on" : ""} aria-pressed={touchSelect} onClick={() => execute("touchSelection")}>{t("手指选取", "Touch selection")}</button>
            <button type="button" className={holdSelect ? "is-on" : ""} aria-pressed={holdSelect} onClick={() => execute("holdSelection")}>{t("长按选区", "Hold to select")}</button>
            {selectionMode === "color" && pickedColor && <span className="icn-color-sample" style={{ background: pickedColor }} title={pickedColor} />}
          </>}
          {hasSelection && <>
            <button type="button" className={moveSelection ? "is-on" : ""} aria-pressed={moveSelection} onClick={() => execute("moveSelection")}>{t("移动选区", "Move selection")}</button>
            <button type="button" className={filters ? "is-on" : ""} aria-pressed={filters} onClick={() => execute("selectionFilters")}>{t("筛选", "Filters")}</button>
            <button type="button" className={rotate ? "is-on" : ""} aria-pressed={rotate} onClick={() => execute("selectionRotate")}>{t("旋转", "Rotate")}</button>
            <button type="button" className={scale !== "off" ? "is-on" : ""} onClick={() => execute("selectionScale")}>{scaleCaption[scale]}</button>
            <button type="button" className={highlight ? "is-on" : ""} aria-pressed={highlight} onClick={() => execute("selectionHighlight")}>{t("突出显示", "Highlight")}</button>
          </>}
        </div>
        <small>{moveSelection ? t("拖动选区移动 · 方向键微移", "Drag the selection to move · Arrow keys nudge") : selectionMode === "color" ? t("选取描边与填充样式 · Shift 应用到选区", "Pick stroke and fill style · Shift applies to selection")
          : deformable ? t("Alt 拖角点扭曲 · Alt+Shift 拖角点倾斜", "Alt-drag a corner to warp · Alt+Shift-drag to skew")
          : t("重复圈选或点选可减去对象 · Ctrl 替换选区 · Esc 退出", "Select again to subtract · Ctrl replaces · Esc exits")}</small>
      </div>}
      {(guide || canvasHighlights.length > 0) && <svg className="icn-selection-ink" aria-hidden="true">
        {canvasHighlights.length > 0 && <>
          <defs><mask id="icn-selection-mask"><rect width="100%" height="100%" fill="white" />
            {canvasHighlights.map(({ element, points }) => element.points
              ? <polyline key={element.id} points={points.join(" ")} fill="none" stroke="black" strokeWidth={Math.max(7, element.strokeWidth * viewport.zoom + 5)} strokeLinecap="round" strokeLinejoin="round" />
              : <polygon key={element.id} points={points.join(" ")} fill="black" stroke="black" strokeWidth="4" />)}
          </mask></defs>
          <rect width="100%" height="100%" fill="var(--icn-dim)" mask="url(#icn-selection-mask)" />
        </>}
        {guide?.type === "lasso" && <polygon points={guide.points.join(" ")} className="icn-lasso-line" />}
        {guide?.type === "preview" && guide.outlines.map((points, index) => <polyline key={index} points={points.join(" ")} className="icn-lasso-line" />)}
        {["item", "color"].includes(guide?.type) && <g transform={`translate(${guide.points[0].join(" ")})`} className="icn-picker-mark">
          <path d="M-12 0h8m8 0h8M0-12v8m0 8v8" />
          {guide.hit && <circle r="15" />}
          {guide.hit && <path d={guide.subtract ? "M8 11h8" : "M8 11h8m-4-4v8"} />}
        </g>}
      </svg>}
      {usePopup && <>
        <div className="icn-selection-popup" style={{ "--icn-selection-center": `${centerX}px`, top: popupY }}>
          <div className="icn-pills" role="toolbar" aria-label={t("选区操作", "Selection actions")}>
            {actionButtons.map((id) => <button key={id} type="button" title={commandLabel(id)} aria-label={commandLabel(id)}
              disabled={lockedSelection && id !== "toggleElementLock" && id !== "copyAsPng" || id === "group" && members.length < 2}
              className={id === "toggleElementLock" && lockedSelection ? "is-on" : ""} onClick={() => execute(id)}><Icon name={id} /></button>)}
            <AlignmentMenu key={members.map(element => element.id).join(",")} zh={zh}
              disabled={lockedSelection || alignCount < 2} count={alignCount} choose={execute} />
          </div>
          <div className="icn-measures">
            <NumberField key={overlay?.version} label={members.length === 1 ? t("角度", "Angle") : t("旋转量", "Rotate by")} value={angle} unit="°" disabled={!canRotate} onCommit={(value) => { if (Number.isFinite(value)) updateTransform({ angle: (value - angle) * Math.PI / 180 }); }} />
            <NumberField label={t("宽", "W")} value={Math.round((right - left) * 10) / 10} disabled={!canScale || right === left} onCommit={(value) => scaleNumeric("x", value)} />
            <NumberField label={t("高", "H")} value={Math.round((bottom - top) * 10) / 10} disabled={!canScale || bottom === top} onCommit={(value) => scaleNumeric("y", value)} />
          </div>
        </div>
        {(canScale ? [["nw", topLeft], ["ne", [bottomRight[0], topLeft[1]]], ["sw", [topLeft[0], bottomRight[1]]], ["se", bottomRight]] : [])
          .concat(canRotate ? [["rotate", [(topLeft[0] + bottomRight[0]) / 2, bottomRight[1] + 24]]] : [])
          .map(([handle, [x, y]]) => <button type="button" tabIndex={-1} key={handle} className={`icn-transform-handle icn-handle-${handle}`}
            style={{ left: x, top: y }} aria-label={handle === "rotate" ? t("拖动旋转", "Drag to rotate") : t("拖动调整尺寸", "Drag to resize")}
            onPointerDown={(event) => startTransform(event, handle)} onPointerMove={moveTransform} onPointerUp={endTransform}
            onPointerCancel={(event) => endTransform(event, true)} onLostPointerCapture={(event) => endTransform(event, true)} />)}
      </>}
    </>,
  };
}
