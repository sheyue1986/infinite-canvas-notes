import React, { memo, useRef, useState } from "react";
import { CaptureUpdateAction, getCommonBounds, newElementWith } from "@excalidraw/excalidraw";
import "./layers.css";
import { MEASURE_LAYER } from "./precision-engine.js";

const BASE = "layer-base";
const makeLayer = (name, id = crypto.randomUUID(), tool) => ({ id, name, visible: true, locked: false, opacity: 100, tool });
const names = { image: "图片", text: "文字", arrow: "连线", line: "连线", frame: "框架", freedraw: "钢笔" };
export const layerOf = element => element.customData?.infiniteLayer || BASE;
const initialState = data => Array.isArray(data?.items) && data.items.some(item => item.id === BASE)
  ? { ...data, focus: null } : { items: [makeLayer("图层 1", BASE)], active: BASE, mode: "auto", focus: null };

export function elementOpacity(element) {
  const style = element.customData?.infiniteLayerStyle;
  return style && element.opacity === style.shownOpacity ? style.opacity : element.opacity;
}

function appearance(element, layer, focus, opacity = elementOpacity(element)) {
  const style = element.customData?.infiniteLayerStyle;
  const locked = style && element.locked === style.shownLocked ? style.locked : !!element.locked;
  const shownOpacity = layer.visible ? Math.round(opacity * layer.opacity / 100 * (focus && focus !== layer.id ? .18 : 1)) : 0;
  const shownLocked = locked || layer.locked || !layer.visible || !!(focus && focus !== layer.id);
  if (!style && opacity === shownOpacity && element.opacity === shownOpacity && locked === shownLocked) return element;
  if (style && style.opacity === opacity && style.locked === locked &&
      shownOpacity === element.opacity && shownLocked === element.locked) return element;
  const customData = { ...element.customData };
  if (opacity === shownOpacity && locked === shownLocked) delete customData.infiniteLayerStyle;
  else customData.infiniteLayerStyle = { opacity, locked, shownOpacity, shownLocked };
  return newElementWith(element, { opacity: shownOpacity, locked: shownLocked, customData });
}

export function withElementOpacity(element, opacity, state) {
  const layer = state.items.find(item => item.id === layerOf(element)) || state.items.find(item => item.id === BASE);
  return appearance(element, layer, state.focus, opacity);
}

function orderElements(elements, items) {
  const rank = new Map(items.map((item, index) => [item.id, index]));
  const level = element => rank.get(layerOf(element)) ?? 0;
  if (!elements.some((element, index) => index && level(element) < level(elements[index - 1]))) return elements;
  return [...elements].sort((a, b) => level(a) - level(b)).map(element => newElementWith(element, { index: null }));
}

function changeLayer(element, id) {
  return layerOf(element) === id ? element : newElementWith(element, { customData: { ...element.customData, infiniteLayer: id } });
}

function cloneElements(elements, id) {
  const ids = new Map(elements.map(element => [element.id, crypto.randomUUID()]));
  const groups = new Map();
  const binding = value => value && ids.has(value.elementId) ? { ...value, elementId: ids.get(value.elementId) } : null;
  return elements.map(element => ({
    ...element,
    id: ids.get(element.id), index: null,
    frameId: ids.get(element.frameId) || null,
    groupIds: element.groupIds.map(group => {
      if (!groups.has(group)) groups.set(group, crypto.randomUUID());
      return groups.get(group);
    }),
    boundElements: element.boundElements?.filter(value => ids.has(value.id)).map(value => ({ ...value, id: ids.get(value.id) })) || null,
    ...(element.type === "text" && { containerId: ids.get(element.containerId) || null }),
    ...(["line", "arrow"].includes(element.type) && { startBinding: binding(element.startBinding), endBinding: binding(element.endBinding) }),
    customData: { ...element.customData, infiniteLayer: id },
  }));
}

export function layerSafeElements(elements) {
  return elements.map(element => {
    const style = element.customData?.infiniteLayerStyle;
    if (!style && !element.customData?.infiniteLayer) return element;
    const customData = { ...element.customData };
    delete customData.infiniteLayer;
    delete customData.infiniteLayerStyle;
    return { ...element, customData, ...(style && { opacity: style.opacity, locked: style.locked }) };
  });
}

export function useLayers(project, apiRef, brushRef) {
  const [view, setView] = useState(() => initialState(project.scene?.layers));
  const state = useRef(view);
  const known = useRef(new Set((project.scene?.elements || []).map(element => element.id)));
  const lastElements = useRef(null);
  const queued = useRef(false);
  const [open, setOpen] = useState(false);
  const [summaries, setSummaries] = useState({});
  const [message, setMessage] = useState("");
  const messageTimer = useRef(null);
  const save = useRef(null);
  const notify = text => {
    setMessage(text);
    clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(""), 1900);
  };
  const updateState = next => { state.current = next; setView(next); };
  const current = () => apiRef.current?.getSceneElementsIncludingDeleted() || [];
  const summarize = (elements, force = false) => {
    if (!open && !force) return;
    const groups = {};
    for (const element of elements) {
      if (element.isDeleted) continue;
      const id = layerOf(element);
      const group = groups[id] ??= { count: 0, sample: [] };
      group.count++;
      if (group.sample.length < 24) group.sample.push(element);
    }
    setSummaries(previous => Object.keys(previous).length === Object.keys(groups).length &&
      Object.entries(groups).every(([id, group]) => previous[id]?.count === group.count &&
        group.sample.every((element, index) => previous[id]?.sample[index] === element)) ? previous : groups);
  };
  const apply = (next, elements = current(), capture = CaptureUpdateAction.NEVER) => {
    const api = apiRef.current;
    updateState(next);
    if (!api) return;
    const byId = new Map(next.items.map(layer => [layer.id, layer]));
    const updated = orderElements(elements.map(element => element.isDeleted ? element
      : appearance(element, byId.get(layerOf(element)) || byId.get(BASE), next.focus)), next.items);
    const previous = api.getSceneElementsIncludingDeleted();
    const selected = api.getAppState().selectedElementIds;
    const valid = Object.fromEntries(updated.filter(element => selected[element.id] && !element.locked && !element.isDeleted).map(element => [element.id, true]));
    if (updated.length !== previous.length || updated.some((element, index) => element !== previous[index]) ||
        Object.keys(valid).length !== Object.keys(selected).filter(id => selected[id]).length) {
      api.updateScene({ elements: updated, appState: { selectedElementIds: valid }, captureUpdate: capture });
    }
    summarize(updated);
    save.current?.(updated, api.getAppState(), api.getFiles());
  };
  const sync = (elements, appState) => {
    if (lastElements.current === elements || queued.current || appState.newElement || appState.editingTextElement ||
        appState.selectedElementsAreBeingDragged || appState.resizingElement) return;
    lastElements.current = elements;
    queued.current = true;
    queueMicrotask(() => {
      queued.current = false;
      const api = apiRef.current;
      if (!api) return;
      const all = current();
      const next = { ...state.current, items: [...state.current.items] };
      const ids = new Map(next.items.map(layer => [layer.id, layer]));
      const objectLayers = new Map();
      let layerChanged = false;
      const revised = all.map(element => {
        if (element.isDeleted || known.current.has(element.id)) return element;
        known.current.add(element.id);
        const owned = ids.get(element.customData?.infiniteLayer);
        if (owned?.id === MEASURE_LAYER && element.customData?.precisionMeasure) return element;
        if (owned && next.mode === "auto" && !owned.archived && owned.visible && !owned.locked && !next.focus) return element;
        let target = ids.get(next.focus || next.active);
        if (next.mode === "auto" && !next.focus) {
          const name = element.customData?.icnBasicShape ? "图形" :
            element.customData?.infiniteBrush?.name || (element.type === "freedraw" ? brushRef.current : names[element.type] || "图形");
          const key = element.groupIds?.at(-1) || element.frameId || element.containerId || element.id;
          target = objectLayers.get(key) || next.items.find(item => item.tool === name && item.visible && !item.locked && !item.archived);
          if (!target) {
            target = makeLayer(name, undefined, name);
            next.items.push(target);
            ids.set(target.id, target);
            layerChanged = true;
          }
          objectLayers.set(key, target);
          if (next.active !== target.id) { next.active = target.id; layerChanged = true; }
        }
        if (!target?.visible || target.locked || target.archived) {
          target = next.items.find(item => item.visible && !item.locked && !item.archived);
        }
        if (!target) {
          target = makeLayer("图层 " + (next.items.length + 1));
          next.items.push(target);
          next.active = target.id;
          layerChanged = true;
        }
        return changeLayer(element, target.id);
      });
      const live = new Set(revised.filter(element => !element.isDeleted).map(layerOf));
      if (next.items.some(item => item.archived && live.has(item.id))) {
        next.items = next.items.map(item => item.archived && live.has(item.id) ? { ...item, archived: false } : item);
        layerChanged = true;
      }
      const changed = revised.some((element, index) => element !== all[index]);
      if (layerChanged || changed || orderElements(revised, next.items) !== revised ||
          revised.some(element => !element.isDeleted && appearance(element, ids.get(layerOf(element)) || ids.get(BASE), next.focus) !== element)) {
        apply(next, revised);
      } else summarize(revised);
    });
  };
  const select = id => {
    const next = state.current;
    apply({ ...next, active: id, mode: "manual", focus: next.focus ? id : null });
  };
  const focus = id => {
    const next = state.current;
    const item = next.items.find(layer => layer.id === id);
    if (!item?.visible) return notify("先显示图层，再进入专注模式");
    apply({ ...next, active: id, mode: "manual", focus: next.focus === id ? null : id });
  };
  const patch = (id, value) => {
    const next = state.current;
    apply({ ...next, focus: next.focus === id && value.visible === false ? null : next.focus,
      items: next.items.map(layer => layer.id === id ? { ...layer, ...value } : layer) });
  };
  const add = (moveSelection = false) => {
    const next = state.current;
    const item = makeLayer("图层 " + (next.items.length + 1));
    const items = [...next.items];
    items.splice(items.findIndex(layer => layer.id === next.active) + 1, 0, item);
    const elements = moveSelection ? moveSelected(item.id) : current();
    apply({ items, active: item.id, mode: "manual", focus: null }, elements,
      moveSelection ? CaptureUpdateAction.IMMEDIATELY : CaptureUpdateAction.NEVER);
  };
  const selectedFor = id => current().filter(element => !element.isDeleted && layerOf(element) === id);
  const moveSelected = id => {
    const elements = current();
    const ids = new Set(Object.keys(apiRef.current.getAppState().selectedElementIds).filter(key => apiRef.current.getAppState().selectedElementIds[key]));
    for (const element of elements) {
      if (ids.has(element.id)) element.boundElements?.filter(item => item.type === "text").forEach(item => ids.add(item.id));
    }
    return elements.map(element => !element.isDeleted && !element.locked && (ids.has(element.id) || ids.has(element.frameId) || ids.has(element.containerId))
      ? changeLayer(element, id) : element);
  };
  const move = id => {
    const next = state.current;
    const item = next.items.find(layer => layer.id === id);
    if (!item?.visible || item.locked || next.focus && next.focus !== id) return notify("目标图层不可编辑");
    apply({ ...next, active: id, mode: "manual" }, moveSelected(id), CaptureUpdateAction.IMMEDIATELY);
  };
  const reorder = (from, to) => {
    const next = state.current;
    const items = [...next.items];
    const start = items.findIndex(layer => layer.id === from), end = items.findIndex(layer => layer.id === to);
    if (start < 0 || end < 0 || start === end) return;
    items.splice(end, 0, ...items.splice(start, 1));
    apply({ ...next, items, mode: "manual" });
  };
  const archive = (id, merge) => {
    const next = state.current;
    const i = next.items.findIndex(layer => layer.id === id);
    const destination = next.items.slice(0, i).reverse().find(layer => !layer.archived);
    if (merge && !destination) return;
    if (!merge && !window.confirm(`删除“${next.items[i].name}”及其内容？`)) return;
    const remaining = next.items.find(layer => layer.id !== id && !layer.archived);
    const replacement = remaining || makeLayer("图层 " + (next.items.length + 1));
    const items = [...next.items.map(layer => layer.id === id ? { ...layer, archived: true } : layer),
      ...(!remaining ? [replacement] : [])];
    const elements = current().map(element => layerOf(element) !== id || element.isDeleted ? element
      : merge ? changeLayer(element, destination.id) : newElementWith(element, { isDeleted: true }));
    apply({ ...next, items, active: (merge ? destination : replacement).id, mode: "manual", focus: null },
      elements, CaptureUpdateAction.IMMEDIATELY);
  };
  const duplicate = id => {
    const next = state.current;
    const index = next.items.findIndex(layer => layer.id === id);
    const source = next.items[index];
    const item = { ...makeLayer(source.name + " 副本"), opacity: source.opacity };
    const items = [...next.items];
    items.splice(index + 1, 0, item);
    const copies = cloneElements(layerSafeElements(selectedFor(id)), item.id);
    copies.forEach(element => known.current.add(element.id));
    apply({ ...next, items, active: item.id, mode: "manual", focus: null },
      [...current(), ...copies], CaptureUpdateAction.IMMEDIATELY);
  };
  const canDraw = appState => {
    const next = state.current;
    if (next.mode === "auto" && !next.focus || ["selection", "hand", "eraser", "laser"].includes(appState.activeTool.type)) return true;
    const active = next.items.find(item => item.id === (next.focus || next.active));
    if (active?.visible && !active.locked) return true;
    notify("当前图层已隐藏或锁定，请切换图层");
    return false;
  };
  return {
    view, summaries, open, message, state, save, sync, canDraw,
    toggle: () => { if (!open) summarize(current(), true); setOpen(!open); },
    select, focus, patch, add, move, reorder, archive, duplicate,
    showMeasurements: visible => {
      const next = state.current;
      const existing = next.items.find(layer => layer.id === MEASURE_LAYER);
      if (!existing && visible) apply({ ...next, items: [...next.items, makeLayer("测量", MEASURE_LAYER)] });
      else if (existing && (existing.visible !== visible || existing.archived && visible)) patch(MEASURE_LAYER, { visible, ...(visible && { archived: false }) });
    },
    sort: () => { const next = state.current; apply({ ...next, mode: next.mode === "auto" ? "manual" : "auto", focus: null }); },
    rename: id => {
      const item = state.current.items.find(layer => layer.id === id);
      const name = window.prompt("图层名称", item.name)?.trim();
      if (name) patch(id, { name: name.slice(0, 80) });
    },
    selectAll: id => {
      const api = apiRef.current;
      api.setActiveTool({ type: "selection" });
      api.updateScene({ appState: { selectedElementIds: Object.fromEntries(selectedFor(id).filter(element => !element.locked).map(element => [element.id, true])) },
        captureUpdate: CaptureUpdateAction.NEVER });
    },
  };
}

const icons = {
  layers: "m3 7 9-4 9 4-9 4zm0 5 9 4 9-4M3 17l9 4 9-4",
  precision: "M12 3v5m0 8v5M3 12h5m8 0h5m-5 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  eye: "M2 12c4-7 16-7 20 0-4 7-16 7-20 0zm13 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0",
  hidden: "M2 12c4-7 16-7 20 0-4 7-16 7-20 0M3 3l18 18",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z",
  unlock: "M7 11V8a5 5 0 0 1 9-3M5 11h14v10H5z",
  copy: "M8 8h12v12H8zM4 16V4h12",
  select: "m5 3 14 10-7 1-3 7z",
  trash: "M4 6h16m-14 0 1 15h10l1-15M9 6V3h6v3",
  merge: "m4 6 8 6 8-6m-16 7 8 6 8-6",
  name: "M4 5h16M12 5v14m-4 0h8",
  focus: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5m3-9a3 3 0 1 0-6 0 3 3 0 0 0 6 0",
  move: "M4 5h15m-5-4 5 4-5 4M20 19H5m5-4-5 4 5 4",
  plus: "M12 5v14M5 12h14",
  sort: "M7 4v16m-4-4 4 4 4-4m6 4V4m-4 4 4-4 4 4",
};

function Icon({ name }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={icons[name]} /></svg>;
}

const Thumbnail = memo(function Thumbnail({ sample }) {
  if (!sample?.length) return <span className="layer-thumb" aria-hidden="true" />;
  const [x, y, right, bottom] = getCommonBounds(sample);
  const width = Math.max(4, right - x), height = Math.max(4, bottom - y);
  const margin = Math.max(width, height) * .08;
  return <svg className="layer-thumb" viewBox={`${x - margin} ${y - margin} ${width + 2 * margin} ${height + 2 * margin}`} aria-hidden="true">
    {sample.map(element => {
      const { id, x, y, width, height, strokeColor, backgroundColor } = element;
      const stroke = strokeColor && strokeColor !== "transparent" ? strokeColor : "#838b89";
      const attrs = { stroke, strokeWidth: Math.max(element.strokeWidth || 1, margin * .035), fill: backgroundColor || "none" };
      if (element.points?.length) {
        const skip = Math.max(1, Math.ceil(element.points.length / 24));
        const points = element.points.filter((_, i) => i % skip === 0 || i === element.points.length - 1).map(([a, b]) => `${x + a},${y + b}`).join(" ");
        return <polyline key={id} points={points} {...attrs} fill="none" strokeLinecap="round" />;
      }
      if (element.type === "ellipse") return <ellipse key={id} cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} {...attrs} />;
      return <rect key={id} x={x} y={y} width={Math.max(1, width)} height={Math.max(1, height)} {...attrs}
        fill={element.type === "image" ? "#d8dfdd" : attrs.fill} />;
    })}
  </svg>;
});

const dragType = "application/x-infinite-canvas-layer";
const selectionDrag = "application/x-infinite-canvas-layer-selection";

export function LayerPanel({ controller: layers, removeModelLayer, hasSelection, precisionTools, onTogglePrecision, onClosePrecision, gridLayer }) {
  const { open, view, summaries, message } = layers;
  const [menu, setMenu] = useState(null);
  const [slider, setSlider] = useState(100);
  const items = view.items.filter(item => !item.archived).reverse();
  const selected = menu && items.find(layer => layer.id === menu.id);
  const toggle = () => { setMenu(null); if (open) onClosePrecision(); layers.toggle(); };
  const openMenu = (item, event) => {
    if (menu?.id === item.id) { setMenu(null); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    setSlider(item.opacity);
    setMenu({ id: item.id, x: Math.min(rect.right + 8, window.innerWidth - 252),
      y: Math.max(50, Math.min(rect.top, window.innerHeight - 116)) });
  };
  const drop = (event, target) => {
    event.preventDefault();
    const from = event.dataTransfer.getData(dragType);
    if (from && target) layers.reorder(from, target);
    if (event.dataTransfer.getData(selectionDrag)) {
      if (target) layers.move(target);
      else layers.add(true);
    }
  };
  const canDrop = (event, allowReorder) => {
    const types = [...event.dataTransfer.types];
    if (types.includes(selectionDrag) || allowReorder && types.includes(dragType)) event.preventDefault();
  };
  const action = (icon, label, run, disabled = false) => <button key={icon} type="button" title={label} aria-label={label}
    disabled={disabled} onClick={run}><Icon name={icon} /></button>;
  return <>
    <button className="layer-trigger" type="button" title="图层" aria-label="图层" aria-expanded={open} onClick={toggle}><Icon name="layers" /></button>
    {open && <aside className="layer-panel" aria-label="图层面板" onKeyDown={event => {
      if (event.key === "Escape") { event.stopPropagation(); if (menu) setMenu(null); else toggle(); }
    }}>
      <div className="layer-header">
        <button type="button" className="layer-title" onClick={toggle}><Icon name="layers" /> 图层</button>
        <button type="button" className="layer-precision-toggle" aria-label="精准工具" aria-expanded={!!precisionTools}
          aria-controls="layer-precision-tools" title={precisionTools ? "收起精准工具" : "展开精准工具"}
          onClick={onTogglePrecision}><Icon name="precision" /></button>
      </div>
      {precisionTools}
      <button type="button" className="layer-sort" onClick={() => { setMenu(null); layers.sort(); }}>
        <Icon name="sort" /><b>排序</b><span>{view.mode === "auto" ? "自动" : "手动"}</span>
      </button>
      <button type="button" className="layer-add" onDragOver={event => canDrop(event, false)} onDrop={event => drop(event)}
        onClick={() => { setMenu(null); layers.add(); }}><Icon name="plus" /> 新建图层</button>
      {hasSelection && <button type="button" className="layer-selection" draggable
        title="拖到图层或新建图层，移动当前选区" onDragStart={event => {
          event.dataTransfer.setData(selectionDrag, "1"); event.dataTransfer.effectAllowed = "move";
        }} onClick={() => layers.move(view.active)}>拖动选区到图层</button>}
      <div className="layer-list">{items.map(item => <div key={item.id}
        className={`layer-row ${view.active === item.id ? "layer-active" : ""} ${view.focus && view.focus !== item.id ? "layer-dim" : ""}`}
        onDragOver={event => canDrop(event, true)} onDrop={event => drop(event, item.id)}>
        <button type="button" className="layer-eye" title={item.visible ? "隐藏 " + item.name : "显示 " + item.name}
          aria-label={item.visible ? "隐藏 " + item.name : "显示 " + item.name}
          onClick={() => layers.patch(item.id, { visible: !item.visible })}><Icon name={item.visible ? "eye" : "hidden"} /></button>
        <button type="button" className="layer-row-button" draggable aria-label={item.name} aria-pressed={view.active === item.id}
          onDragStart={event => { setMenu(null); event.dataTransfer.setData(dragType, item.id); event.dataTransfer.effectAllowed = "move"; }}
          onClick={event => {
            if (view.active === item.id) openMenu(item, event);
            else { setMenu(null); layers.select(item.id); }
          }} onDoubleClick={() => { setMenu(null); layers.focus(item.id); }}
          onContextMenu={event => { event.preventDefault(); openMenu(item, event); }}>
          <Thumbnail sample={summaries[item.id]?.sample} />
          <span className="layer-row-label"><b title={item.name}>{item.name}</b><small>{item.opacity}% {item.locked && " · 锁定"}</small></span>
        </button>
      </div>)}{gridLayer}</div>
      {view.focus && <button type="button" className="layer-exit-focus" onClick={() => layers.focus(view.focus)}>退出专注</button>}
      {selected && <div className="layer-options" style={{ left: menu.x, top: menu.y }} aria-label={selected.name + "选项"}>
        <div className="layer-commands">
          {action("select", "全选图层内容", () => { layers.selectAll(selected.id); setMenu(null); })}
          {action(selected.locked ? "unlock" : "lock", selected.locked ? "解锁图层" : "锁定图层", () => layers.patch(selected.id, { locked: !selected.locked }))}
          {action("copy", "复制图层", () => { layers.duplicate(selected.id); setMenu(null); })}
          {action("trash", "删除图层", () => { if (selected.id === "model-underlay" && removeModelLayer) removeModelLayer(selected.id); else layers.archive(selected.id, false); setMenu(null); })}
          {action("merge", "向下合并", () => { layers.archive(selected.id, true); setMenu(null); }, items.at(-1)?.id === selected.id)}
          {action("name", "重命名图层", () => layers.rename(selected.id))}
          {action("focus", "专注图层", () => { layers.focus(selected.id); setMenu(null); })}
          {action("move", "将选区移至此图层", () => { layers.move(selected.id); setMenu(null); }, !hasSelection)}
        </div>
        <label className="layer-opacity"><input type="range" min="0" max="100" aria-label="图层不透明度" value={slider}
          onChange={event => setSlider(Number(event.target.value))} onPointerUp={() => layers.patch(selected.id, { opacity: slider })}
          onKeyUp={() => layers.patch(selected.id, { opacity: slider })} onBlur={() => {
            if (slider !== selected.opacity) layers.patch(selected.id, { opacity: slider });
          }} /><output>{slider}%</output></label>
      </div>}
    </aside>}
    {message && <div className="layer-toast" role="status">{message}</div>}
  </>;
}
