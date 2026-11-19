import { createObjectPropertyRing } from "./object-property-ring.js";
import { canUnion, mergeSelection } from "./boolean-geometry.js";
import { canvasBusy } from './canvas-activity.js';
import { createToolPreferences } from './tool-preferences.js';
import { createImageTracing } from './image-to-lines.js';
import { createAdvancedEditing } from './advanced-editing.js';
import { createCopicPicker } from './copic-picker.js';

export function createSelectionProperties(React, portal, revise, convert, capture, render, ColorFan) {
  const { createElement: h, useEffect, useRef, useState } = React;
  const ObjectPropertyRing = createObjectPropertyRing(React, revise, convert, capture);
  const ImageTracing=createImageTracing(React,portal,convert,revise,capture);
  const AdvancedEditing=createAdvancedEditing(React,revise,convert,capture,render);
  const CopicPicker=createCopicPicker(React,portal,ColorFan);
  const endpoint = (arrow, end) => {
    const p = end === "start" ? arrow.points[0] : arrow.points.at(-1);
    const cx = arrow.width / 2, cy = arrow.height / 2;
    const angle = arrow.angle || 0;
    return [arrow.x + cx + (p[0] - cx) * Math.cos(angle) - (p[1] - cy) * Math.sin(angle),
      arrow.y + cy + (p[0] - cx) * Math.sin(angle) + (p[1] - cy) * Math.cos(angle)];
  };
  const geometry = arrow => JSON.stringify([arrow.x, arrow.y, arrow.angle, arrow.points]);
  function moveEndpoint(arrow, end, dx, dy) {
    const angle = arrow.angle || 0, cos = Math.cos(angle), sin = Math.sin(angle);
    const points = arrow.points.map(p => [...p]);
    const index = end === "start" ? 0 : points.length - 1;
    points[index][0] += dx * cos + dy * sin;
    points[index][1] += -dx * sin + dy * cos;
    const left = Math.min(...points.map(p => p[0])), top = Math.min(...points.map(p => p[1]));
    const width = Math.max(...points.map(p => p[0])) - left;
    const height = Math.max(...points.map(p => p[1])) - top;
    const cx = left + width / 2 - arrow.width / 2;
    const cy = top + height / 2 - arrow.height / 2;
    return revise(arrow, {
      x: arrow.x + arrow.width / 2 + cx * cos - cy * sin - width / 2,
      y: arrow.y + arrow.height / 2 + cx * sin + cy * cos - height / 2,
      width, height, points: points.map(p => [p[0] - left, p[1] - top]),
    });
  }

  return function SelectionProperties({ apiRef, layers, kit, zh }) {
    const [revision, refresh] = useState(0);
    const [hover, setHover] = useState(null);
    const [draft, setDraft] = useState(null);
    const input = useRef(null);
    const preferences=useRef(null);if(!preferences.current)preferences.current=createToolPreferences();
    const finished = useRef(false);
    const current = useRef({ layers, kit });
    current.current = { layers, kit };
    useEffect(() => {
      let frame, changeFrame, bound, unsubscribe, observer, syncing = false;
      const previous = new Map();
      let selectionKey = "";
      function bind() {
        const api = apiRef.current;
        if (!api) { frame = requestAnimationFrame(bind); return; }
        const sync = () => {
          if (syncing || canvasBusy()) return;
          preferences.current.sync(api,current.current.kit);
          const all = api.getSceneElementsIncludingDeleted();
          const byId = new Map(all.map(e => [e.id, e]));
          const updates = new Map();
          for (const text of all) {
            const relation = text.customData?.icnArrowEndpoint;
            if (text.isDeleted || !relation || api.getAppState().editingTextElement?.id === text.id) continue;
            const arrow = byId.get(relation.arrowId);
            if (!arrow || arrow.isDeleted || arrow.type !== "arrow") continue;
            const was = previous.get(arrow.id);
            const oldText = previous.get(text.id);
            if (was === geometry(arrow) && oldText && oldText !== JSON.stringify([text.x, text.y])) {
              const [x, y] = JSON.parse(oldText);
              if (!arrow.locked && !arrow.elbowed)
                updates.set(arrow.id, moveEndpoint(updates.get(arrow.id) || arrow, relation.end, text.x - x, text.y - y));
            }
            if (was && was !== geometry(arrow)) {
              const point = endpoint(arrow, relation.end);
              const x = point[0] + relation.dx, y = point[1] + relation.dy;
              // Native binding may move the arrow when its text is edited.
              if (oldText === JSON.stringify([text.x, text.y]) && Math.hypot(x - text.x, y - text.y) > .05)
                updates.set(text.id, revise(text, { x, y }));
            }
          }
          for (const e of all) {
            if (e.type === "arrow") previous.set(e.id, geometry(e));
            if (e.type === "text") previous.set(e.id, JSON.stringify([e.x, e.y]));
          }
          if (updates.size) {
            // Native onChange listeners finish applying their own scene first.
            queueMicrotask(() => {
              const live = api.getSceneElementsIncludingDeleted();
              const versions = new Map(all.map(e => [e.id, e.version]));
              const elements = live.map(e => {
                if (!updates.has(e.id) || e.version !== versions.get(e.id)) return e;
                const next = updates.get(e.id);
                previous.set(e.id, next.type === "arrow" ? geometry(next) : JSON.stringify([next.x, next.y]));
                return next;
              });
              if (!elements.some((e, i) => e !== live[i])) return;
              syncing = true;
              try { api.updateScene({ elements, captureUpdate: capture.NEVER }); }
              finally { syncing = false; }
            });
          }
          const state = api.getAppState();
          const selected = all.filter(e => !e.isDeleted && state.selectedElementIds[e.id]);
          const key = selected.map(e => e.id).sort().join("|");
          if (key !== selectionKey) {
            selectionKey = key;
            if (key && !state.editingTextElement && !state.openDialog)
              current.current.kit.setPanel(null);
          }
          refresh(n => n + 1);
        };
        unsubscribe = api.onChange(() => {
          if (syncing || changeFrame != null) return;
          changeFrame = requestAnimationFrame(() => { changeFrame = null; sync(); });
        });
        sync();
        const canvas = document.querySelector(".canvas-shell");
        const move = event => {
          if (api.getAppState().activeTool.type !== "text" || !event.target.closest("canvas") || event.buttons) {
            bound = null; setHover(null); return;
          }
          const s = api.getAppState(), zoom = s.zoom.value;
          let nearest = null, limit = 18;
          for (const arrow of api.getSceneElements()) {
            if (arrow.isDeleted || arrow.locked || arrow.type !== "arrow") continue;
            for (const end of ["start", "end"]) {
              const point = endpoint(arrow, end);
              const x = (point[0] + s.scrollX) * zoom + s.offsetLeft;
              const y = (point[1] + s.scrollY) * zoom + s.offsetTop;
              const dist = Math.hypot(x - event.clientX, y - event.clientY);
              if (dist < limit) { limit = dist; nearest = { arrowId: arrow.id, end, point, x, y }; }
            }
          }
          setHover(nearest);
          bound = nearest;
        };
        const down = event => {
          if (!bound || event.button !== 0 || api.getAppState().activeTool.type !== "text" || !event.target.closest("canvas")) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          finished.current = false;
          const existing = api.getSceneElements().find(e => !e.isDeleted &&
            e.customData?.icnArrowEndpoint?.arrowId === bound.arrowId && e.customData.icnArrowEndpoint.end === bound.end);
          setDraft({ ...bound, id: existing?.id, text: existing?.text || "" });
          bound = null;
          setHover(null);
        };
        canvas?.addEventListener("pointermove", move, true);
        canvas?.addEventListener("pointerdown", down, true);
        let targets=[];
        observer = new MutationObserver(() => {const next=['.icn-selection-popup .icn-pills','.brush-core','.excalidraw .context-menu'].map(s=>document.querySelector(s));if(next.some((e,i)=>e!==targets[i])){targets=next;refresh(n=>n+1);}});
        observer.observe(document.querySelector(".app-shell"), { childList: true, subtree: true });
        cleanup = () => {
          canvas?.removeEventListener("pointermove", move, true);
          canvas?.removeEventListener("pointerdown", down, true);
        };
      }
      let cleanup;
      bind();
      return () => { cancelAnimationFrame(frame); cancelAnimationFrame(changeFrame); unsubscribe?.(); observer?.disconnect(); cleanup?.(); };
    }, [apiRef]);
    useEffect(() => { if (draft) input.current?.focus(); }, [!!draft]);

    const api = apiRef.current;
    if (!api) return null;
    const state = api.getAppState();
    const selected = api.getSceneElements().filter(e => !e.isDeleted && state.selectedElementIds[e.id]);
    const options = layers.state.current.items.filter(layer => !layer.archived);
    const layerIds = new Set(selected.map(e => e.customData?.infiniteLayer));
    const layer = layerIds.size === 1 ? [...layerIds][0] : "";
    const popup = document.querySelector(".icn-selection-popup");
    const tools = popup?.querySelector(".icn-pills");
    const core = document.querySelector(".brush-core");
    const virtual=!selected.length&&preferences.current.virtual(api,kit);
    const context = document.querySelector(".excalidraw .context-menu");
    const mergeable = selected.length >= 2 && canUnion(api);
    const filled = selected.every(e => e.backgroundColor && e.backgroundColor !== "transparent");
    const merge = () => {
      try { mergeSelection(api, convert, revise, capture.IMMEDIATELY); }
      catch { api.setToast({ message: zh ? "无法合并此选区，请检查闭合边界。" : "Could not merge these boundaries." }); }
    };
    const mergeIcon = h("svg", {viewBox:"0 0 24 24",width:18,height:18,fill:"none",stroke:"currentColor",strokeWidth:1.6,"aria-hidden":true},
      h("path",{d:"M3 4h10v5h8v11H10v-5H3zM3 4v11m18-6v11"}));
    const picker = () => h("details", { className: "icn-layer-menu" },
      h("summary", { title: zh ? "匹配图层" : "Assign layer", "aria-label": zh ? "匹配图层" : "Assign layer" },
        h("svg", { viewBox: "0 0 24 24", width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 1.6, "aria-hidden": true },
          h("path", { d: "m3 7 9-4 9 4-9 4zm0 5 9 4 9-4m-18 5 9 4 9-4" })), "⌄"),
      h("div", { className: "icn-layer-dropdown" },
      h("label", null, zh ? "图层" : "Layer", h("select", {
        "aria-label": zh ? "选中对象所在图层" : "Selected object layer", value: layer || "",
        onChange: e => { if (e.target.value) layers.move(e.target.value); },
      }, h("option", { value: "", disabled: true }, zh ? "混合图层" : "Mixed layers"),
      options.map(item => h("option", { key: item.id, value: item.id, disabled: item.locked || !item.visible },
        item.name + (item.locked ? " 🔒" : ""))))),
      h("button", { type: "button", title: zh ? "新建图层并移入选区" : "New layer for selection",
        onClick: () => layers.add(true) }, zh ? "＋ 新建图层并移入" : "＋ New layer for selection")));

    function commit() {
      if (!draft || finished.current) return;
      finished.current = true;
      const text = input.current.value.trim();
      setDraft(null);
      if (!text) return;
      const arrow = api.getSceneElements().find(e => e.id === draft.arrowId && !e.isDeleted);
      if (!arrow || arrow.locked) return;
      const [label] = convert([{ type: "text", text, x: draft.point[0] + 12, y: draft.point[1] + 12,
        fontSize: state.currentItemFontSize || 20, fontFamily: state.currentItemFontFamily || 1,
        strokeColor: state.currentItemStrokeColor, opacity: state.currentItemOpacity,
      }]);
      const existing = draft.id && api.getSceneElements().find(e => e.id === draft.id);
      const next = existing ? revise(existing, { text, originalText: text, width: label.width, height: label.height })
        : { ...label, customData: { infiniteLayer: arrow.customData?.infiniteLayer,
          icnArrowEndpoint: { arrowId: arrow.id, end: draft.end, dx: 12, dy: 12 } } };
      api.setActiveTool({ type: "selection" });
      api.updateScene({
        elements: existing ? api.getSceneElementsIncludingDeleted().map(e => e.id === existing.id ? next : e)
          : [...api.getSceneElementsIncludingDeleted(), next],
        appState: { selectedElementIds: { [next.id]: true } }, captureUpdate: capture.IMMEDIATELY,
      });
    }
    return h(React.Fragment, null,
      h(CopicPicker),
      h(AdvancedEditing,{api,kit,layers}),
      h(ImageTracing,{api,selected,context}),
      !!selected.length && tools && portal(picker(), tools),
      mergeable && tools && portal(h("button", { type: "button", className: "icn-boolean-merge",
        title: zh ? "布尔合并" : "Boolean union", "aria-label": zh ? "布尔合并" : "Boolean union", onClick: merge }, mergeIcon), tools),
      mergeable && context && portal(h("li", {className:"icn-boolean-context"},
        h("button",{type:"button",className:"context-menu-item",onClick:merge},
          mergeIcon,h("span",{className:"context-menu-item__label"},filled ? (zh ? "合并填充并计算面积" : "Merge fills and area") :
            (zh ? "布尔合并线框" : "Union outlines")))),context),
      (!!selected.length||virtual) && core && portal(h(ObjectPropertyRing, { api, kit, zh, selected:selected.length?selected:[virtual],defaults:!selected.length,preferences:preferences.current }), core),
      hover && !draft && h("div", { className: "icn-endpoint-hint", style: { left: hover.x, top: hover.y } },
        h("span", null, zh ? "点击输入端点文字" : "Add endpoint text")),
      draft && h("input", { ref: input, className: "icn-endpoint-text", defaultValue: draft.text,
        "aria-label": zh ? "箭头端点文字" : "Arrow endpoint text", style: { left: draft.x + 12, top: draft.y + 12 },
        onBlur: commit, onKeyDown: e => {
          e.stopPropagation();
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); finished.current = true; setDraft(null); }
        },
      }));
  };
}
