import React, { memo, useEffect, useRef, useState } from "react";
import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";
import { imageTint, importStamp, tintImage } from "./paint-engine.js";
import { CanvasSampler, ColorFan, ColorPanel, QuickColors, hexColor, useColors } from "./colors.jsx";
import { elementOpacity, withElementOpacity } from "./layers.jsx";
import { dashPattern, defaultDashDensity } from "./line-style.js";
import "./brush-kit.css";

const brush = (id, name, en, width, opacity, smoothing, dynamics, mark) =>
  ({ id, name, en, width, opacity, smoothing, dynamics, mark, type: "freedraw", color: "#1b1b1f" });
const basics = [
  brush("pen", "钢笔", "Pen", 3, 100, 40, "speed", "pen"),
  brush("fountain", "墨水笔", "Fountain", 3.5, 100, 34, "inverse", "bold"),
  brush("dynamic", "压感笔", "Pressure pen", 4, 100, 27, "pressure", "bold"),
  brush("fixed", "固定宽度", "Fixed width", 2, 100, 45, "fixed", "pen"),
  brush("soft", "软铅笔", "Soft pencil", 2, 65, 18, "pressure", "pencil"),
  brush("hard", "硬铅笔", "Hard pencil", 1, 84, 14, "pressure", "pencil"),
  brush("marker", "马克笔", "Marker", 10, 42, 32, "fixed", "marker"),
  { ...brush("stamp", "纹理印章", "Texture stamp", 10, 90, 18, "pressure", "stamp"), engine: "stamp" },
  { ...brush("water", "水彩", "Watercolor", 15, 68, 22, "pressure", "water"), engine: "water" },
];
const tools = [
  { id: "select", name: "选择", en: "Select", type: "selection", mark: "select" },
  { id: "magnifier", name: "放大镜", en: "Magnifier", type: "zoom", mark: "zoom" },
  { id: "lasso", name: "套索", en: "Lasso", type: "lasso", mark: "lasso" },
  { id: "eraser", name: "对象橡皮", en: "Eraser", type: "eraser", mark: "eraser" },
  { id: "text", name: "文字", en: "Text", type: "text", mark: "text" },
  { id: "pan", name: "平移", en: "Pan", type: "hand", mark: "pan" },
  { id: "line", name: "直线", en: "Line", type: "line", mark: "line" },
  { id: "partial", name: "图片局部擦除", en: "Image eraser", type: "partial", mark: "eraser" },
  { id: "wand", name: "魔棒选区", en: "Magic wand", type: "wand", mark: "wand" },
  { id: "nudge", name: "微调", en: "Nudge", type: "nudge", mark: "nudge" },
  { id: "rectangle", name: "矩形", en: "Rectangle", type: "rectangle", mark: "rectangle" },
  { id: "ellipse", name: "椭圆", en: "Ellipse", type: "ellipse", mark: "ellipse" },
  { id: "diamond", name: "菱形", en: "Diamond", type: "diamond", mark: "diamond" },
  { id: "arrow", name: "箭头", en: "Arrow", type: "arrow", mark: "arrow" },
  { id: "image", name: "图片", en: "Image", type: "image", mark: "image" },
  { id: "frame", name: "框架", en: "Frame", type: "frame", mark: "rectangle" },
  { id: "laser", name: "激光笔", en: "Laser", type: "laser", mark: "wand" },
  { id: "bucket", name: "填充", en: "Bucket fill", type: "bucket", mark: "bucket", tolerance: 32 },
];
const initialSlots = ["pen", "dynamic", "marker", "soft", "eraser", "text", "pan", "select"];
const directToolKeys = new Map([
  ["z", "magnifier"], ["p", "pen"], ["t", "text"], ["e", "eraser"], ["v", "select"], ["h", "pan"], ["l", "line"],
  ["r", "rectangle"], ["o", "ellipse"], ["d", "diamond"], ["a", "arrow"], ["f", "frame"], ["k", "laser"], ["b", "bucket"], ["9", "image"],
]);
const toolKeyLabels = new Map([...directToolKeys].map(([key, id]) => [id, key.toUpperCase()]));
const toolKeyAliases = new Map([
  ["0", "eraser"], ["1", "select"], ["2", "rectangle"], ["3", "diamond"], ["4", "ellipse"],
  ["5", "arrow"], ["6", "line"], ["7", "pen"], ["8", "text"], ["I", "image"], ["X", "pen"],
]);
export const isDefaultToolKey = key => !!key && (directToolKeys.has(key.toLowerCase()) || toolKeyAliases.has(key));
const defaultPresets = { width: [1, 2, 6, 12], opacity: [25, 50, 75, 100], smoothing: [0, 25, 50, 100], tolerance: [0, 32, 64, 128] };
const brushDynamics = [["pressure", "压感", "Pressure"], ["speed", "速度", "Speed"], ["inverse", "反向速度", "Inverse speed"], ["fixed", "固定宽度", "Fixed width"]];
const key = "infinite-canvas-brush-kit-v1";
const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n)));
const metrics = {
  width: { name: "笔宽", en: "Width", icon: "width", min: .5, max: 24, step: .5, unit: " pt" },
  opacity: { name: "不透明度", en: "Opacity", icon: "opacity", min: 0, max: 100, step: 1, unit: "%" },
  smoothing: { name: "平滑度", en: "Smoothing", icon: "smooth", min: 0, max: 100, step: 1, unit: "%" },
  tolerance: { name: "容差", en: "Tolerance", icon: "bucket", min: 0, max: 255, step: 1, unit: "" },
};

function readSettings() {
  const fallback = { slots: initialSlots, slot: 0, changes: {}, slotValues: {}, custom: [], presets: {}, format: "wheel", nudgeRadius: 36, shortcuts: {} };
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value?.slots?.length === 8 && Array.isArray(value.custom) && value.changes ? { ...fallback, ...value } : fallback;
  } catch { return fallback; }
}

const styled = new Set(["freedraw", "line", "rectangle", "ellipse", "diamond", "arrow", "text"]);
const toolHasStyle = type => styled.has(type) || type === "bucket";
export const hasLineStyle = type => styled.has(type) && type !== "text";
const filled = new Set(["rectangle", "ellipse", "diamond"]);
const elementStyle = {
  color: [element => styled.has(element.type) || element.type === "image", element => element.type === "image" ?
    imageTint(element)?.color ?? element.customData?.infiniteBrush?.color ?? null :
    element.customData?.infiniteBucket ? element.backgroundColor : element.strokeColor, "strokeColor"],
  width: [element => styled.has(element.type) && element.type !== "text" && !element.customData?.infiniteBucket, element => element.strokeWidth, "strokeWidth"],
  opacity: [element => element.type !== "frame" && element.type !== "magicframe", elementOpacity],
  fill: [element => filled.has(element.type), element => element.backgroundColor, "backgroundColor"],
  fontSize: [element => element.type === "text", element => element.fontSize],
  strokeStyle: [element => hasLineStyle(element.type) && !element.customData?.infiniteBucket, element => element.strokeStyle, "strokeStyle"],
  dashDensity: [element => hasLineStyle(element.type) && !element.customData?.infiniteBucket, element => element.customData?.infiniteDashDensity ?? defaultDashDensity],
};
const specialTypes = ["partial", "wand", "nudge", "bucket", "zoom", "lasso"];
const nativeType = tool => specialTypes.includes(tool?.type) ? "selection" : tool?.type;

function selectedStyle(elements) {
  if (!elements.length) return null;
  const [first] = elements;
  const sameType = elements.every(element => element.type === first.type);
  const type = sameType ? first.type : "mixed";
  const brushId = first.customData?.infiniteBrush?.id;
  return {
    key: elements.map(element => element.id).sort().join("|"), count: elements.length, type,
    canRestoreColor: type === "image" && elements.some(imageTint),
    brushId: sameType && elements.every(element => element.customData?.infiniteBrush?.id === brushId) ? brushId : undefined,
    ...Object.fromEntries(Object.entries(elementStyle).flatMap(([property, [supports, read]]) => {
      if (!elements.every(supports)) return [];
      const value = read(first);
      return [[property, elements.every(element => read(element) === value) ? value : null]];
    })),
  };
}

function entry(settings, id, slot) {
  const item = basics.find(item => item.id === id) || tools.find(item => item.id === id) || settings.custom.find(item => item.id === id);
  if (!item || !toolHasStyle(item.type)) return item;
  return { width: 2, opacity: 100, color: "#1b1b1f", strokeStyle: "solid", dashDensity: defaultDashDensity, ...item, ...(slot === undefined ? {} :
    settings.slotValues[`${slot}:${id}`] || settings.changes[id]) };
}

export function useBrushKit(apiRef, layerState, onPixelTool) {
  const [settings, setSettings] = useState(readSettings);
  const latest = useRef(settings);
  const [panel, setPanel] = useState(null);
  const [shown, setShown] = useState(true);
  const [native, setNative] = useState("selection");
  const [activeSpecial, setActiveSpecial] = useState(() => settings.slots[settings.slot] === "bucket" ? "bucket" : null);
  const [shortcutTool, setShortcutTool] = useState(null);
  const [editedSlot, setEditedSlot] = useState(0);
  const [selection, setSelection] = useState(null);
  const selectionSnapshot = useRef({ key: "", style: null });
  const tintRevision = useRef(0);
  const samplingBackground = useRef(null);
  const initial = entry(settings, settings.slots[settings.slot], settings.slot);
  const mode = useRef(initial?.type === "freedraw" ? initial : basics[0]);
  useEffect(() => {
    const persist = () => { try { localStorage.setItem(key, JSON.stringify(latest.current)); } catch { /* preferences are optional */ } };
    const timer = setTimeout(persist, 120);
    window.addEventListener("pagehide", persist);
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", persist); };
  }, [settings]);
  const applyProperties = (api, tool) => api.updateScene({ appState: {
    currentItemStrokeWidth: tool.width, currentItemOpacity: tool.opacity, currentItemStrokeColor: tool.color,
    currentItemStrokeStyle: tool.strokeStyle || "solid",
  } });
  const apply = (next, tool, activate, shortcut = null) => {
    latest.current = next;
    setSettings(next);
    const api = apiRef.current;
    if (!api || !tool) return;
    if (tool.type === "freedraw") mode.current = tool;
    if (activate) {
      setShortcutTool(shortcut);
      const pixel = specialTypes.includes(tool.type);
      setActiveSpecial(pixel ? tool.type : null);
      onPixelTool(pixel ? tool.type : null);
      setNative(nativeType(tool));
      api.setActiveTool({ type: nativeType(tool) });
      if (tool.type === "nudge" || tool.type === "bucket") {
        syncSelection([], tool.type);
        api.updateScene({ appState: { selectedElementIds: {} }, captureUpdate: CaptureUpdateAction.NEVER });
      }
    }
    if (styled.has(tool.type) && (activate || api.getAppState().activeTool.type === tool.type)) applyProperties(api, tool);
  };
  const configured = entry(settings, settings.slots[settings.slot], settings.slot);
  const configuredIsActive = configured?.type === native || native === "selection" && !!activeSpecial && configured?.type === activeSpecial;
  const activeSlot = shortcutTool ? -1 : configuredIsActive ? settings.slot : settings.slots.findIndex(id => entry(settings, id)?.type === native);
  const active = entry(settings, shortcutTool || settings.slots[activeSlot], activeSlot);
  const pen = active && toolHasStyle(active.type) ? active : null;
  const exactSlot = selection?.brushId ? settings.slots.indexOf(selection.brushId) : -1;
  const selectedSlot = exactSlot >= 0 || !selection ? exactSlot : settings.slots.findIndex(id => entry(settings, id)?.type === selection.type);
  const syncSelection = (elements, activeTool) => {
    const next = activeTool === "selection" && elements.length ? selectedStyle(elements.filter(element => !element.locked)) : null;
    const key = next ? JSON.stringify(next) : "";
    if (key === selectionSnapshot.current.key) return;
    if (next?.key !== selectionSnapshot.current.style?.key) tintRevision.current++;
    selectionSnapshot.current = { key, style: next };
    setSelection(next);
    if (!next) setPanel(current => ["selection", "native", "dimensions"].includes(current) ? null : current);
  };
  const edit = (slot = latest.current.slot) => { setShown(true); setEditedSlot(slot); setPanel("library"); };
  const activate = (index, openIfActive = true) => {
    const old = latest.current;
    const tool = entry(old, old.slots[index], index);
    if (openIfActive && !shortcutTool && index === old.slot && index === activeSlot) {
      edit(index);
      return;
    }
    apply({ ...old, slot: index }, tool, true);
    setPanel(null);
  };
  const activateById = id => {
    const old = latest.current;
    const slot = old.slots.indexOf(id);
    if (slot >= 0) { activate(slot, false); return; }
    apply(old, entry(old, id, -1), true, id);
    setPanel(null);
  };
  const assign = id => {
    const old = latest.current;
    const slots = old.slots.map((value, index) => index === editedSlot ? id : value);
    apply({ ...old, slots, slot: editedSlot }, entry(old, id, editedSlot), true);
  };
  const setMany = (values, expected) => {
    const api = apiRef.current;
    const inspected = selectionSnapshot.current.style;
    if (inspected) {
      if (!api || api.getAppState().activeTool.type !== "selection" ||
          inspected.key !== (expected ? expected.selectionKey : selection?.key)) return false;
      const updates = Object.entries(values).filter(([property]) => Object.hasOwn(inspected, property) && Object.hasOwn(elementStyle, property));
      const live = () => {
        if (apiRef.current !== api || api.getAppState().activeTool.type !== "selection") return null;
        const ids = api.getAppState().selectedElementIds;
        const elements = api.getSceneElementsIncludingDeleted();
        const selected = elements.filter(element => ids[element.id] && !element.isDeleted && !element.locked);
        return selected.map(element => element.id).sort().join("|") === inspected.key ? { selected, elements } : null;
      };
      const commit = (scene, raster = new Map()) => {
        if (!scene) return false;
        const changed = new Map();
        for (const element of scene.selected) {
          const patch = {};
          for (const [property, value] of updates) {
            const [, read, attribute] = elementStyle[property];
            if (attribute && !(property === "color" && element.type === "image") && read(element) !== value) {
              patch[property === "color" && element.customData?.infiniteBucket ? "backgroundColor" : attribute] = value;
            }
            if (property === "dashDensity" && read(element) !== value) patch.customData = { ...element.customData, infiniteDashDensity: value };
          }
          const tint = raster.get(element.id);
          if (tint) {
            if (tint.previousId !== element.fileId) return false;
            patch.customData = { ...element.customData };
            if (tint.file) patch.customData.imageTint = { fileId: tint.file.id, sourceId: tint.sourceId, color: values.color };
            else delete patch.customData.imageTint;
            patch.fileId = tint.file?.id || tint.sourceId;
          }
          let next = Object.keys(patch).length ? newElementWith(element, patch) : element;
          if (updates.some(([property, value]) => property === "opacity" && elementOpacity(element) !== value)) {
            next = withElementOpacity(next, values.opacity, layerState.current);
          }
          if (next !== element) changed.set(element.id, next);
        }
        if (!changed.size) return false;
        const files = [...raster.values()].flatMap(tint => tint.file ? [tint.file] : []);
        if (files.length) api.addFiles(files);
        api.updateScene({ elements: scene.elements.map(element => changed.get(element.id) || element), captureUpdate: CaptureUpdateAction.IMMEDIATELY });
        return true;
      };
      const scene = live();
      if (!scene) return false;
      const color = updates.find(([property]) => property === "color")?.[1];
      const images = color !== undefined || values.restoreColor ? scene.selected.filter(element => element.type === "image") : [];
      if (!images.length) return commit(scene);
      const revision = ++tintRevision.current;
      const files = api.getFiles();
      const raster = new Map();
      if (values.restoreColor) {
        for (const element of images) {
          const tint = imageTint(element);
          if (tint && files[tint.sourceId]) raster.set(element.id, { previousId: element.fileId, sourceId: tint.sourceId });
        }
        return commit(scene, raster);
      }
      return (async () => {
        try {
          for (const element of images) {
            const tint = imageTint(element);
            if (tint?.color === color) continue;
            const sourceId = tint && files[tint.sourceId] ? tint.sourceId : element.fileId;
            const file = await tintImage(files[sourceId], color, !!element.customData?.paintKind);
            if (revision !== tintRevision.current) return false;
            raster.set(element.id, { previousId: element.fileId, sourceId, file });
          }
          return commit(live(), raster);
        } catch {
          if (revision === tintRevision.current) api.setToast({ message: "无法应用色调，请检查图片是否完整或超过 1600 万像素。" });
          return false;
        }
      })();
    }
    if (selection || expected?.selectionKey) return false;
    const old = latest.current;
    const target = entry(old, shortcutTool || old.slots[activeSlot], activeSlot);
    const currentType = apiRef.current?.getAppState().activeTool.type;
    if (!target || !toolHasStyle(target.type) || currentType !== nativeType(target) ||
        !shortcutTool && old.slot !== activeSlot && nativeType(entry(old, old.slots[old.slot])) === currentType ||
        expected && (expected.slot !== activeSlot || expected.id !== target.id)) return false;
    const key = `${activeSlot}:${target.id}`;
    const slotValues = { ...old.slotValues, [key]: { ...(old.slotValues[key] || old.changes[target.id]), ...values } };
    apply({ ...old, slotValues }, { ...target, ...values }, false);
    return true;
  };
  const set = (property, value) => setMany({ [property]: value });
  const currentPen = () => entry(latest.current, shortcutTool || latest.current.slots[activeSlot], activeSlot);
  const lineTarget = selection ? Object.hasOwn(selection, "strokeStyle") ? selection : null : hasLineStyle(pen?.type) ? pen : null;
  const toggleLineStyle = () => lineTarget && set("strokeStyle", lineTarget.strokeStyle === "dashed" ? "solid" : "dashed");
  const savePreset = (profile, name) => {
    const item = { ...profile, id: crypto.randomUUID(), name: name.slice(0, 55), en: name.slice(0, 55) };
    const old = latest.current;
    const slots = old.slots.map((value, index) => index === editedSlot ? item.id : value);
    apply({ ...old, slots, slot: editedSlot, custom: [...old.custom, item] }, item, true);
  };
  const shortcutTools = [...tools, ...basics, ...settings.custom];
  const keyForTool = id => id === "magnifier" ? "Z" : settings.shortcuts[id] === "Z" ? null : Object.hasOwn(settings.shortcuts, id) ? settings.shortcuts[id] : toolKeyLabels.get(id);
  const shortcutForKey = key => key && shortcutTools.find(tool => keyForTool(tool.id) === key)?.id;
  const aliasForKey = key => {
    const id = toolKeyAliases.get(key);
    return id && !Object.hasOwn(settings.shortcuts, id) ? id : undefined;
  };
  return {
    settings, panel, setPanel, shown, editedSlot, activeSlot, pen, mode, edit, activate, assign, set, setMany, apiRef, samplingBackground,
    selection, selectedSlot, syncSelection,
    lineTarget, toggleLineStyle, currentPen, active, shortcutTool, activateById,
    shortcutTools, keyForTool, shortcutForKey, aliasForKey,
    setToolShortcut: (id, value) => apply({ ...latest.current, shortcuts: { ...latest.current.shortcuts, [id]: value } }),
    resetToolShortcuts: () => apply({ ...latest.current, shortcuts: {} }),
    nudge: active?.type === "nudge",
    setNudgeRadius: value => apply({ ...latest.current, nudgeRadius: clamp(value, 8, 160) }),
    nativeChanged: type => {
      setNative(type);
      if (type !== "selection") setActiveSpecial(null);
      setShortcutTool(id => id && nativeType(entry(latest.current, id)) === type ? id : null);
    },
    applyLast: () => { if (apiRef.current) applyProperties(apiRef.current, mode.current); },
    display: (nextPanel) => { setShown(true); setPanel(panel === nextPanel ? null : nextPanel); },
    toggle: () => { setShown(!shown); setPanel(null); },
    changeFormat: () => apply({ ...latest.current, format: settings.format === "wheel" ? "bar" : "wheel" }),
    preset: (property, index) => {
      const values = [...(settings.presets[property] || defaultPresets[property])];
      const response = window.prompt(metrics[property].name, values[index]);
      if (response === null || !response.trim() || !Number.isFinite(Number(response))) return;
      values[index] = clamp(response, metrics[property].min, metrics[property].max);
      apply({ ...latest.current, presets: { ...latest.current.presets, [property]: values } });
    },
    add: () => {
      if (pen?.type !== "freedraw") return;
      const name = window.prompt("笔刷名称", pen.name + " 副本")?.trim();
      if (!name) return;
      savePreset(pen, name);
    },
    importPreset: profile => {
      if (profile?.type !== "freedraw" || typeof profile.name !== "string" || !profile.name.trim()) throw new Error("Invalid brush");
      const template = basics.find(item => item.id === profile.engine) || basics[0];
      const numeric = (key, fallback, min, max) => Number.isFinite(profile[key]) ? clamp(profile[key], min, max) : fallback;
      const mark = basics.some(item => item.mark === profile.mark) ? profile.mark : template.mark;
      const texture = template.engine === "stamp" && typeof profile.texture === "string" && profile.texture.length <= 220000 &&
        /^data:image\/png;base64,[a-z0-9+/=]+$/i.test(profile.texture) ? profile.texture : undefined;
      savePreset({ ...template, mark, texture, color: hexColor(profile.color) || template.color,
        width: numeric("width", template.width, .5, 24), opacity: numeric("opacity", template.opacity, 0, 100),
        smoothing: numeric("smoothing", template.smoothing, 0, 100), dashDensity: numeric("dashDensity", defaultDashDensity, 0, 100),
        dynamics: brushDynamics.some(([id]) => id === profile.dynamics) ? profile.dynamics : template.dynamics,
        strokeStyle: profile.strokeStyle === "dashed" ? "dashed" : "solid",
      }, profile.name.trim());
    },
    reset: () => {
      const old = latest.current;
      if (!pen) return;
      const next = { ...old, slotValues: { ...old.slotValues, [`${activeSlot}:${pen.id}`]: {} } };
      apply(next, entry(next, pen.id, activeSlot), false);
    },
    remove: id => {
      const old = latest.current;
      const changes = { ...old.changes };
      const shortcuts = { ...old.shortcuts };
      delete changes[id];
      delete shortcuts[id];
      const next = { ...old, changes, shortcuts, custom: old.custom.filter(item => item.id !== id), slots: old.slots.map(slot => slot === id ? "pen" : slot) };
      apply(next, entry(next, next.slots[next.slot], next.slot), old.slots[old.slot] === id || shortcutTool === id);
    },
    rename: id => {
      const old = latest.current;
      const source = old.custom.find(item => item.id === id);
      if (!source) return;
      const name = window.prompt("笔刷名称", source.name)?.trim().slice(0, 55);
      if (!name) return;
      const next = { ...old, custom: old.custom.map(item => item.id === id ? { ...item, name, en: name } : item) };
      apply(next, mode.current.id === id ? entry(next, id, activeSlot) : null, false);
    },
    adjust: (property, delta) => {
      const target = selection || currentPen();
      const metric = property === "dashDensity" ? { min: 0, max: 100 } : metrics[property];
      if (!target || !Object.hasOwn(target, property) || property === "width" && ["text", "bucket"].includes(target.type) ||
          property === "dashDensity" && target.strokeStyle !== "dashed") return false;
      const value = target[property] ?? ({ width: 2, opacity: 100, dashDensity: defaultDashDensity }[property]);
      set(property, clamp(value + delta, metric.min, Math.max(metric.max, value)));
      return true;
    },
  };
}

export function finalizeBrush(stroke, profile, pointerType, mutate, release) {
  const count = stroke.points.length;
  if (!count) return;
  const amount = (profile?.smoothing ?? 25) / 100;
  const last = stroke.points.at(-1);
  const end = release ? [release.x - stroke.x, release.y - stroke.y] : last;
  const straight = amount === 1 && count > 1;
  const points = straight ? [stroke.points[0], end] : stroke.points.map((point, index, all) => {
    if (!index || index === count - 1 || !amount) return point;
    const [x, y] = point;
    return [x + ((all[index - 1][0] + all[index + 1][0]) / 2 - x) * amount,
      y + ((all[index - 1][1] + all[index + 1][1]) / 2 - y) * amount];
  });
  const dynamics = profile?.dynamics || "pressure";
  const fixed = dynamics === "fixed" || dynamics === "pressure" && pointerType === "mouse";
  const speed = dynamics === "speed" || dynamics === "inverse";
  let pressures = stroke.pressures;
  if (fixed) pressures = points.map(() => .5);
  else if (speed) {
    pressures = points.map(([x, y], index) => {
      const previous = points[index - 1];
      const distance = previous ? Math.hypot(x - previous[0], y - previous[1]) : 0;
      const normalized = Math.min(.72, distance / Math.max(8, stroke.strokeWidth * 8));
      return dynamics === "speed" ? .82 - normalized : .23 + normalized;
    });
  } else if (straight && pressures.length) pressures = [pressures[0], pressures.at(-1)];
  mutate(stroke, { points, ...(fixed || speed ? { simulatePressure: false, pressures } : { pressures }),
    ...(profile && { strokeStyle: profile.strokeStyle || "solid", customData: { ...stroke.customData,
      infiniteBrush: { id: profile.id, name: profile.name }, ...(profile.strokeStyle === "dashed" && { infiniteDashDensity: profile.dashDensity }) } }) }, false);
}

const glyphs = {
  pen: "M3 16c5-10 8-10 7-6s1 6 8-1",
  bold: "M3 15c5-10 10-11 8-5s2 5 7-1",
  pencil: "M4 15c4-8 8-11 7-6s1 5 6-1M4 12l3-4",
  marker: "M4 14l13-7",
  stamp: "M4 15h12M6 12h8V9a4 4 0 1 0-8 0zM6 18h.1m3 0h.1m3 0h.1m3 0h.1",
  water: "M10 2c-2 4-6 7-6 11a6 6 0 0 0 12 0c0-4-4-7-6-11zM7 14c0 2 1 3 3 3",
  rectangle: "M4 5h12v10H4z",
  ellipse: "M17 10a7 5 0 1 1-14 0 7 5 0 1 1 14 0",
  diamond: "m10 3 7 7-7 7-7-7z",
  arrow: "m3 16 13-12m-6 0h6v6",
  image: "M3 4h14v12H3zM4 14l4-4 3 3 3-4 2 2M7 7h.1",
  select: "m5 3 12 8-6 1-3 6Z",
  zoom: "M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3m4 9 5 5M5.5 8h5m-2.5-2.5v5",
  lasso: "M6 15c-4-1-4-5-2-8 3-3 9-4 12-2 4 2 2 7-1 8-4 2-7 0-9 2-2 2 0 4 2 2 1-1 0-2-2-2Z",
  eraser: "m4 12 8-8 5 5-8 8H7Zm6 5h8M8 8l5 5",
  text: "M4 16 9 4l5 12M6 12h6m6-4v8m-3-4h4",
  pan: "M10 2v16m-3-3 3 3 3-3M2 10h16m-3-3 3 3-3 3M7 5l3-3 3 3M5 7l-3 3 3 3",
  line: "M4 15 16 5",
  solidLine: "M2 10h16",
  dashedLine: "M2 10h3m3 0h4m3 0h3",
  mixedLine: "M2 7h16M2 13h3m3 0h4m3 0h3",
  wand: "m4 16 9-9m0-4v2m4 2h2m-2 5v2M7 5H5",
  nudge: "M2 14c5 0 4-8 8-8 3 0 4 5 8 5m-4-7 3 2-2 3",
  bucket: "m3 9 6-6 7 7-6 6a2 2 0 0 1-3 0l-4-4a2 2 0 0 1 0-3Zm1 2h11M8 4 5 1m12 11s-2 2.5-2 4a2 2 0 0 0 4 0c0-1.5-2-4-2-4Z",
  width: "M3 7h14M3 13h14",
  opacity: "M10 3a7 7 0 1 0 0 14Zm0 0a7 7 0 1 1 0 14",
  smooth: "m2 12 3-4 3 7 3-10 3 8 4-3",
  undo: "M8 5 3 10l5 5m-5-5h9c4 0 5 2 5 5",
  redo: "m12 5 5 5-5 5m5-5H8c-4 0-5 2-5 5",
};
function Glyph({ name, size = 19 }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth={name === "marker" ? 5 : name === "bold" ? 2.8 : 1.65} strokeLinecap="round" strokeLinejoin="round"><path d={glyphs[name] || glyphs.pen} /></svg>;
}

function Preview({ pen, zh }) {
  const path = useRef(null);
  const drawing = useRef(null);
  const sample = pen.smoothing === 100 ? "M28 62L287 32" : "M23 72C60 51 130 29 143 40S123 77 154 58S179 33 187 43S176 67 206 57S233 64 289 42";
  return <svg className="brush-preview" viewBox="0 0 312 104" aria-label={zh ? "在这里试画笔刷" : "Try the brush here"}
    onPointerDown={event => {
      const box = event.currentTarget.getBoundingClientRect();
      const point = [((event.clientX - box.left) / box.width) * 312, ((event.clientY - box.top) / box.height) * 104];
      drawing.current = { box, start: point, d: "M" + point.join(" "), count: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
      path.current.setAttribute("d", drawing.current.d + "l.01 .01");
    }} onPointerMove={event => {
      const d = drawing.current;
      if (!d || d.count++ >= 260) return;
      const point = [((event.clientX - d.box.left) / d.box.width) * 312, ((event.clientY - d.box.top) / d.box.height) * 104];
      d.d = pen.smoothing === 100 ? "M" + d.start.join(" ") + "L" + point.join(" ") : d.d + "L" + point.join(" ");
      path.current.setAttribute("d", d.d);
    }} onPointerUp={() => { drawing.current = null; }} onPointerCancel={() => { drawing.current = null; }}>
    <path ref={path} d={sample} fill="none" stroke={pen.color} opacity={pen.opacity / 100}
      strokeDasharray={pen.strokeStyle === "dashed" ? dashPattern(pen.width, pen.dashDensity, 1.9).join(" ") : undefined}
      strokeWidth={Math.max(1, pen.width * 1.9)} strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function LineControls({ target, kit, zh }) {
  const pointer = useRef(false);
  return <div className="brush-property brush-line-controls">
    <div><span>{zh ? "线型" : "Line style"}</span>{[["solid", "实线", "Solid"], ["dashed", "虚线", "Dashed"]].map(([id, cn, en]) =>
      <button type="button" key={id} aria-pressed={target.strokeStyle === id} onClick={() => kit.set("strokeStyle", id)}>{zh ? cn : en}</button>)}</div>
    {target.strokeStyle === "dashed" && <label>{zh ? "虚线密度" : "Dash density"}
      <input type="range" min="0" max="100" key={target.dashDensity} defaultValue={target.dashDensity ?? defaultDashDensity}
        onPointerDown={event => { pointer.current = true; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerCancel={() => { pointer.current = false; }}
        onPointerUp={event => { if (pointer.current) { pointer.current = false; kit.set("dashDensity", event.currentTarget.valueAsNumber); } }}
        onChange={event => { if (!pointer.current) kit.set("dashDensity", event.currentTarget.valueAsNumber); }} />
    </label>}
  </div>;
}

function sector(index) {
  const point = (r, a) => [99 + Math.cos(a * Math.PI / 180) * r, 99 + Math.sin(a * Math.PI / 180) * r];
  const start = index * 45 - 112.5, end = start + 45;
  return `M${point(97, start)}A97 97 0 0 1 ${point(97, end)}L${point(62, end)}A62 62 0 0 0 ${point(62, start)}Z`;
}

export const BrushKit = memo(function BrushKit({ kit, zh }) {
  const root = useRef(null);
  const textureInput = useRef(null);
  const presetInput = useRef(null);
  const colorHold = useRef({ timer: 0, opened: false });
  const colors = useColors();
  const [sampleRequest, setSampleRequest] = useState(null);
  const [error, setError] = useState("");
  const { settings, pen, panel, shown, selection } = kit;
  const target = selection || pen;
  const hasColor = selection ? Object.hasOwn(selection, "color") : !!pen;
  const currentColor = hexColor(target?.color) || "#1b1b1f";
  const [draft, setDraft] = useState(null);
  const slider = useRef(false);
  const choose = async color => { if (await kit.setMany({ color })) colors.remember(color); };
  const sample = alpha => {
    if (!hasColor || !kit.apiRef.current) return;
    setSampleRequest({ alpha, color: currentColor, id: pen?.id, slot: kit.activeSlot, selectionKey: selection?.key });
    kit.setPanel(null);
  };
  const t = (cn, en) => zh ? cn : en;
  const label = item => zh ? item.name : item.en;
  const name = "笔刷与工具";
  const selectedTool = selection && tools.find(tool => tool.type === selection.type);
  const nativePanel = !!selection && ["native", "dimensions"].includes(panel);
  const hasFontSize = !!selection && Object.hasOwn(selection, "fontSize");
  const selectionName = selection && (selection.count > 1 ? t(`已选 ${selection.count} 个对象`, `${selection.count} selected objects`) :
    label(basics.find(item => item.id === selection.brushId) || settings.custom.find(item => item.id === selection.brushId) ||
      selectedTool || { name: selection.type === "freedraw" ? "笔迹" : "选中对象", en: selection.type === "freedraw" ? "Stroke" : "Selected object" }));
  useEffect(() => { setDraft(null); slider.current = false; }, [selection?.key, panel]);
  useEffect(() => {
    if (!nativePanel || !kit.apiRef.current) return;
    const api = kit.apiRef.current;
    const { openMenu, stats } = api.getAppState();
    if (panel === "native") {
      api.updateScene({ appState: { openMenu: "shape" }, captureUpdate: CaptureUpdateAction.NEVER });
      return () => {
        if (api.getAppState().openMenu === "shape") api.updateScene({ appState: { openMenu }, captureUpdate: CaptureUpdateAction.NEVER });
      };
    }
    // Excalidraw's element properties section uses the second bit of the stats panel mask.
    api.updateScene({ appState: { stats: { open: true, panels: 2 } }, captureUpdate: CaptureUpdateAction.NEVER });
    return () => api.updateScene({ appState: { stats }, captureUpdate: CaptureUpdateAction.NEVER });
  }, [nativePanel, panel]);
  useEffect(() => {
    if (!panel) return;
    const close = event => {
      const insideNative = nativePanel && event.target.closest?.(".selected-shape-actions, .App-mobile-menu, .exc-stats, .excalidraw .popover, .excalidraw .dropdown-menu");
      if (event.key === "Escape" || event.type === "pointerdown" && !root.current?.contains(event.target) && !insideNative && !event.target.closest(".canvas-native-brush-trigger")) kit.setPanel(null);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", close);
    return () => { window.removeEventListener("keydown", close); window.removeEventListener("pointerdown", close); };
  }, [nativePanel, panel]);
  const control = property => {
    const metric = metrics[property];
    const title = zh ? metric.name : metric.en;
    const value = draft?.property === property && draft?.key === selection?.key ? draft.value : target[property];
    const max = selection ? Math.max(metric.max, target[property] ?? 0) : metric.max;
    const draftValue = value => setDraft({ key: selection.key, property, value });
    const commit = value => {
      setDraft(null);
      if (value !== "") kit.set(property, clamp(property === "tolerance" ? Math.round(value) : value, metric.min, max));
    };
    return <div className="brush-property" key={property}>
      <label><Glyph name={metric.icon} size={15} /> {title}{target[property] === null && <small>{t("混合", "Mixed")}</small>}
        <input type="number" aria-label={title + t("数值", " value")} min={metric.min} max={max} step={metric.step}
          value={value ?? ""} onChange={event => {
            if (selection) draftValue(event.target.value);
            else if (event.target.value !== "") commit(event.target.value);
          }} onBlur={event => { if (selection && draft?.property === property) commit(event.target.value); }}
          onKeyDown={event => { if (selection && event.key === "Enter") event.currentTarget.blur(); }} /><span>{metric.unit}</span></label>
      <input type="range" min={metric.min} max={max} step={metric.step} value={value === "" || value == null ? (metric.min + max) / 2 : value}
        aria-label={title} onChange={event => {
          if (selection && slider.current) draftValue(event.target.value);
          else commit(event.target.value);
        }} onPointerDown={event => {
          if (!selection || event.button !== 0) return;
          slider.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={event => { if (slider.current) { slider.current = false; commit(event.currentTarget.value); } }}
        onPointerCancel={() => { slider.current = false; setDraft(null); }} />
      <div className="brush-presets">{(settings.presets[property] || defaultPresets[property]).map((value, index) =>
        <button type="button" key={index} aria-pressed={value === target[property]} title={t("右键编辑预设", "Right-click to edit preset")}
          onClick={() => kit.set(property, value)} onContextMenu={event => { event.preventDefault(); kit.preset(property, index); }}>{value}{metric.unit}</button>)}</div>
      {property === "tolerance" && <small>{t("数值越高，纳入填充的相邻颜色越多。", "Higher values include more neighboring colors.")}</small>}
    </div>;
  };
  const iconButton = (glyph, title, run) => <button type="button" aria-label={title} title={title} onClick={run}><Glyph name={glyph} /></button>;
  const cards = items => <div className="brush-cards">{items.map(item => <button type="button" key={item.id} aria-pressed={settings.slots[kit.editedSlot] === item.id}
      onClick={() => kit.assign(item.id)}><Glyph name={item.mark} /><span>{label(item)}</span></button>)}</div>;
  const [canvasToolsOpen, setCanvasToolsOpen] = useState(false);
  const bucketActive = !selection && pen?.type === "bucket";
  const hasProperty = id => selection ? Object.hasOwn(selection, id) : !!pen &&
    (id !== "tolerance" || bucketActive) && (id !== "smoothing" || pen.type === "freedraw") &&
    (id !== "width" || !["text", "bucket"].includes(pen.type));
  return <div className="brush-kit" ref={root} data-active-tool={kit.active?.id}>
    {!shown ? <button type="button" className="brush-launch" onClick={() => selection ? kit.display("selection") : kit.edit()}><Glyph name="pen" /> {t(name, "Brushes & tools")}</button>
      : <div className={`brush-dock brush-${settings.format}`}>
        <output className="brush-pen-reading" hidden />
        {settings.format === "wheel" && <svg viewBox="0 0 198 198" className="brush-rings" aria-hidden="true">
          {settings.slots.map((id, index) => <path key={index} d={sector(index)} className={index === kit.selectedSlot ? "is-linked" : index === kit.activeSlot ? "is-active" : ""} />)}
          <circle className={selection ? "is-inspecting" : undefined} cx="99" cy="99" r="62" fill="#eceeeb" stroke="#dbdfdc" />
        </svg>}
        {settings.slots.map((id, index) => {
          const tool = entry(settings, id, index) || basics[0];
          const angle = (index * 45 - 90) * Math.PI / 180;
          return <button type="button" className={`brush-slot ${index === kit.selectedSlot ? "is-linked" : index === kit.activeSlot ? "is-active" : ""}`} key={index}
            style={settings.format === "wheel" ? { left: (99 + Math.cos(angle) * 80), top: (99 + Math.sin(angle) * 80) } : undefined}
            aria-label={`${t("工具槽", "Slot")} ${index + 1} · ${label(tool)}`}
            title={[label(tool), kit.keyForTool(tool.id), `Alt+${index + 1}`].filter(Boolean).join(" · ")}
            aria-keyshortcuts={[kit.keyForTool(tool.id), `Alt+${index + 1}`].filter(Boolean).join(" ")}
            onClick={() => kit.activate(index)} onContextMenu={event => { event.preventDefault(); kit.edit(index); }}><Glyph name={tool.mark} /></button>;
        })}
        {canvasToolsOpen ? <div className="brush-canvas-quick" role="group" aria-label={t("画布工具", "Canvas tools")}>
          {tools.filter(tool => tool.id === "magnifier" || tool.id === "lasso").map(tool => <button key={tool.id} type="button"
            title={label(tool) + (tool.id === "magnifier" ? " · Z" : "")} aria-label={label(tool)} aria-pressed={kit.active?.id === tool.id}
            onClick={() => kit.activateById(kit.active?.id === tool.id ? "select" : tool.id)}><Glyph name={tool.mark} /></button>)}
        </div> : <div className={`brush-core${selection ? " is-inspecting" : ""}`} aria-label={selectionName || undefined}>
          {Object.entries(metrics).filter(([id]) => id !== (bucketActive ? "width" : "tolerance")).map(([id, metric]) => id === "width" && kit.nudge ?
            <button type="button" className="brush-core-width" key={id} aria-label={t("微调范围", "Nudge radius")}
              onClick={() => kit.display("nudge")}><Glyph name="nudge" size={13} /> {settings.nudgeRadius} px</button> : id === "width" && hasFontSize ?
            <button type="button" className="brush-core-width" key={id} aria-label={t("字号", "Font size")} onClick={() => kit.display("dimensions")}>
              <Glyph name="text" size={13} /> {selection.fontSize == null ? "—" : `${selection.fontSize} px`}</button> :
            <button type="button" className={`brush-core-${id === "tolerance" ? "width" : id}`} key={id} aria-label={zh ? metric.name : metric.en}
              disabled={!hasProperty(id)} onClick={() => kit.display(id)}><Glyph name={metric.icon} size={13} /> {hasProperty(id) && target[id] != null ?
                (id === "tolerance" ? t("容差 ", "Tolerance ") : "") + target[id] + metric.unit : "—"}</button>)}
          {kit.lineTarget && <button type="button" className="brush-core-style" aria-label={t("切换线型", "Toggle line style")}
            aria-pressed={kit.lineTarget.strokeStyle === "dashed"} aria-keyshortcuts="Alt+L"
            title={t("切换实线／虚线 · Alt+L，右键打开线型设置", "Toggle solid / dashed · Alt+L, right-click for settings")}
            onClick={kit.toggleLineStyle} onContextMenu={event => { event.preventDefault(); kit.display("lineStyle"); }}>
            <Glyph name={kit.lineTarget.strokeStyle === "dashed" ? "dashedLine" : kit.lineTarget.strokeStyle === "solid" ? "solidLine" : "mixedLine"} size={15} />
          </button>}
          <button type="button" className={`brush-color${hasColor && selection?.color === null ? " is-mixed" : ""}`} aria-label={selection ? t("对象颜色", "Object color") : t("笔刷颜色", "Brush color")}
            onClick={() => { if (!colorHold.current.opened) kit.display("fan"); colorHold.current.opened = false; }}
            onContextMenu={event => { event.preventDefault(); kit.setPanel("color"); }}
            onPointerDown={event => {
              if (event.button !== 0) return;
              colorHold.current.opened = false;
              colorHold.current.timer = setTimeout(() => { colorHold.current.opened = true; kit.setPanel("color"); }, 450);
            }} onPointerUp={() => clearTimeout(colorHold.current.timer)} onPointerLeave={() => clearTimeout(colorHold.current.timer)}
            onPointerCancel={() => clearTimeout(colorHold.current.timer)}
            disabled={!hasColor} style={{ "--brush-color": hasColor ? currentColor : "#c6cbc7" }} />
        </div>}
        <div className="brush-actions">
          {kit.shortcutTool && kit.active && !["bucket", "zoom", "lasso"].includes(kit.active.type) &&
            <span className="brush-shortcut-tool" title={label(kit.active)}>{label(kit.active)}</span>}
          {iconButton("undo", t("撤销", "Undo"), () => document.querySelector(".excalidraw [data-testid='button-undo']")?.click())}
          {iconButton("redo", t("重做", "Redo"), () => document.querySelector(".excalidraw [data-testid='button-redo']")?.click())}
          <button type="button" aria-expanded={canvasToolsOpen} aria-label={t("画布工具", "Canvas tools")}
            title={t("显示或隐藏放大镜与套索", "Show or hide the magnifier and lasso")}
            onClick={() => setCanvasToolsOpen(open => !open)}><Glyph name="zoom" /></button>
          <button type="button" onClick={() => selection ? kit.display("selection") : kit.edit()}
            aria-label={selection ? t("对象属性", "Object properties") : t(name, "Brushes & tools")}>⋯</button>
          <button type="button" onClick={kit.toggle} aria-label={t("收起工具轮", "Collapse tool wheel")}>×</button>
        </div>
        <QuickColors colors={colors} color={currentColor} choose={choose} active={hasColor} />
      </div>}
    {shown && panel === "fan" && hasColor && <ColorFan colors={colors} color={currentColor} choose={choose}
      openPalettes={() => kit.setPanel("color")} sample={sample} close={() => kit.setPanel(null)} />}
    {shown && panel && panel !== "fan" && <aside className={`brush-popover${nativePanel ? " brush-native-header" : ""}`} aria-label={t(name, "Brushes & tools")}>
      <header><button type="button" aria-label={t("关闭笔刷面板", "Close brush panel")} onClick={() => kit.setPanel(null)}>×</button>
        <button type="button" aria-pressed={panel !== "color" && !nativePanel} onClick={() => selection && panel !== "library" ? kit.setPanel("selection") : kit.edit()}>{selection && panel !== "library" ? t("对象属性", "Properties") : t("笔刷", "Brushes")}</button>
        <button type="button" aria-pressed={panel === "color"} disabled={!!selection && !hasColor} onClick={() => kit.setPanel("color")}>{t("颜色", "Colors")}</button>
        {selection && panel !== "library" && <>
          <button type="button" aria-pressed={panel === "native"} onClick={() => kit.setPanel("native")}>{t("原生样式", "Native styles")}</button>
          <button type="button" aria-pressed={panel === "dimensions"} onClick={() => kit.setPanel("dimensions")}>{t("尺寸与位置", "Size & position")}</button>
        </>}
        {(!selection || panel === "library") && <button type="button" className="brush-layout" onClick={kit.changeFormat}>{settings.format === "wheel" ? t("工具栏", "Toolbar") : t("工具轮", "Wheel")}</button>}</header>
      {selection && panel !== "library" && !nativePanel && <div className="brush-selection-label">{selectionName}</div>}
      {!nativePanel && (panel === "color" ? hasColor ? <>
        {selection?.canRestoreColor && <div className="brush-property brush-fill"><button type="button" onClick={() => kit.setMany({ restoreColor: true })}>{t("恢复原色", "Restore original colors")}</button></div>}
        <ColorPanel colors={colors} color={currentColor} choose={choose} chooseCopic={async color => {
          await choose(color);
          colors.set(old => ({ ...old, mode: "spectrum" }));
          kit.setPanel("fan");
        }} openWheel={() => kit.setPanel("fan")} /></> :
        <p className="color-error">请先选中可设置颜色的工具。</p> : <>
        {pen?.type === "freedraw" && <>
          <Preview key={pen.id} pen={pen} zh={zh} />
          <div className="brush-preview-caption"><strong>{label(pen)}</strong><small>{pen.engine ? t("上方预览颜色和笔宽", "Color and width preview") : t("在上方试画", "Try a stroke above")}</small></div>
        </>}
        {kit.lineTarget && (panel === "lineStyle" || selection && panel === "selection" || !selection && panel === "library") &&
          <LineControls key={selection?.key || pen.id} target={target} kit={kit} zh={zh} />}
        {!selection && panel === "library" && pen?.type === "freedraw" && !pen.engine && <div className="brush-property brush-dynamics">
          <label>{t("笔刷动态", "Brush dynamics")}<select value={pen.dynamics} onChange={event => kit.set("dynamics", event.target.value)}>
            {brushDynamics.map(([id, cn, en]) => <option value={id} key={id}>{t(cn, en)}</option>)}
          </select></label>
        </div>}
        {panel === "library" && <>
          <section><h3>{t("基础笔刷", "Basic brushes")}</h3>{cards(basics)}</section>
          <section><h3>{t("工具", "Tools")}</h3>{cards(tools)}</section>
          <section><h3>{t("我的笔刷", "My brushes")}</h3>{cards(settings.custom)}
            <div className="brush-library-actions">
              <button type="button" disabled={pen?.type !== "freedraw"} onClick={kit.add}>{t("＋ 保存当前笔刷", "＋ Save current brush")}</button>
              <button type="button" onClick={() => presetInput.current.click()}>{t("导入笔刷", "Import brush")}</button>
              <input ref={presetInput} type="file" accept=".json,application/json" hidden onChange={async event => {
                const file = event.target.files[0];
                event.target.value = "";
                if (!file) return;
                setError("");
                try {
                  if (file.size > 250000) throw new Error("Brush file too large");
                  const preset = JSON.parse(await file.text());
                  if (preset.type !== "infinite-canvas-brush" || preset.version !== 1) throw new Error("Invalid brush file");
                  kit.importPreset(preset.profile);
                } catch { setError(t("无法读取此笔刷文件。", "Unable to read this brush file.")); }
              }} />
              {settings.custom.some(item => item.id === pen?.id) && <button type="button" onClick={() => {
                const blob = new Blob([JSON.stringify({ type: "infinite-canvas-brush", version: 1, profile: pen })], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url; link.download = pen.name + ".brush.json"; link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>{t("导出笔刷", "Export brush")}</button>}
              {settings.custom.some(item => item.id === pen?.id) && <button type="button" onClick={() => kit.rename(pen.id)}>{t("重命名", "Rename")}</button>}
              {settings.custom.some(item => item.id === pen?.id) && <button type="button" onClick={() => kit.remove(pen.id)}>{t("删除此预设", "Delete preset")}</button>}
              <button type="button" disabled={!pen} onClick={kit.reset}>{t("重置参数", "Reset settings")}</button>
            </div>
            {error && <small role="alert">{error}</small>}
          </section></>}
        {pen?.engine === "stamp" && panel === "library" && <section className="brush-library-actions">
          <button type="button" onClick={() => textureInput.current.click()}>{t("导入印章纹理", "Import stamp texture")}</button>
          {pen.texture && <button type="button" onClick={() => kit.set("texture", null)}>{t("恢复默认纹理", "Reset texture")}</button>}
          <input ref={textureInput} type="file" hidden accept="image/png,image/webp,image/jpeg" onChange={async event => {
            const file = event.target.files[0];
            event.target.value = "";
            if (!file) return;
            setError("");
            try { kit.set("texture", await importStamp(file)); }
            catch { setError(t("无法读取印章纹理。", "Unable to read stamp texture.")); }
          }} />
        </section>}
        {panel !== "lineStyle" && !(selection && panel === "library") && (metrics[panel] ? [panel] : Object.keys(metrics)).filter(hasProperty).map(control)}
        {kit.nudge && ["library", "nudge"].includes(panel) && <div className="brush-property brush-nudge-settings">
          <label>{t("微调范围", "Nudge radius")}<input type="range" min="8" max="160" value={settings.nudgeRadius}
            onChange={event => kit.setNudgeRadius(event.target.valueAsNumber)} /><output>{settings.nudgeRadius} px</output></label>
        </div>}
        {hasFontSize && panel === "selection" && <div className="brush-property brush-fill">
          <span>{t("字号", "Font size")}</span><button type="button" onClick={() => kit.setPanel("dimensions")}>{selection.fontSize == null ? t("混合", "Mixed") : `${selection.fontSize} px`}</button>
        </div>}
        {selection && panel === "selection" && Object.hasOwn(selection, "fill") && <div className="brush-property brush-fill">
          <label>{t("填充颜色", "Fill color")}<input type="color" key={selection.fill} defaultValue={hexColor(selection.fill) || "#ffffff"}
            ref={input => { if (input) input.onchange = () => kit.set("fill", input.value); }} /></label>
          <button type="button" onClick={() => kit.set("fill", "transparent")}>{t("清除填充", "Clear fill")}</button>
        </div>}
        {panel === "library" && <><details className="brush-shortcuts"><summary>{t("快捷键", "Shortcuts")}</summary>
          <small>{t("工具按键可在主菜单的「快捷键设置」中修改。", "Change tool bindings in Keyboard shortcuts in the main menu.")}</small>
          <dl>{[["Alt+1–8", "选择工具槽", "Select a slot"], ["Alt+L", "切换实线／虚线", "Toggle solid / dashed"],
            ["[ / ]", "笔宽或工具范围", "Width or tool radius"], ["Shift+[ / ]", "不透明度", "Opacity"],
            ["Alt+[ / ]", "虚线密度", "Dash density"], ["Alt+− / =", "平滑度", "Smoothing"]].map(([key, cn, en]) =>
            <React.Fragment key={key}><dt>{key}</dt><dd>{t(cn, en)}</dd></React.Fragment>)}</dl>
        </details><small className="brush-pen-status">{t("压感笔：等待笔输入", "Pen: waiting for input")}</small></>}
      </>)}
    </aside>}
    {sampleRequest && <CanvasSampler api={kit.apiRef.current} request={sampleRequest} samplingBackground={kit.samplingBackground}
      finish={async value => {
        setSampleRequest(null);
        if (value && await kit.setMany(value, sampleRequest)) colors.remember(value.color);
      }} />}
  </div>;
}, (a, b) => a.zh === b.zh && a.kit.settings === b.kit.settings && a.kit.panel === b.kit.panel &&
  a.kit.shown === b.kit.shown && a.kit.editedSlot === b.kit.editedSlot && a.kit.activeSlot === b.kit.activeSlot &&
  a.kit.selection === b.kit.selection && a.kit.shortcutTool === b.kit.shortcutTool);
