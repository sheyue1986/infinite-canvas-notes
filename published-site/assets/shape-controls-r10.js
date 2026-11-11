import {
  basicShapeIcons, changeBasicShape, polygonSides, savePolygonSides, selectedBasicShapes, shapeChoices, shapeKind, validPolygonSides,
} from "./basic-shapes-r10.js";

const shapeChooserEvent = "icn-open-shape-chooser";
export function showShapeChooser(api) {
  if (!selectedBasicShapes(api).length) return;
  api.updateScene({ appState: { contextMenu: null } });
  window.dispatchEvent(new Event(shapeChooserEvent));
}

export function createShapeControls(React, createPortal, update, capture) {
  const { createElement: h, Fragment, useEffect, useRef, useState } = React;
  function sidesInput(zh, value, onChange) {
    return h("label", { className: "icn-shape-sides" }, zh ? "多边形边数" : "Polygon sides",
      h("input", {
        type: "number", value, min: 3, max: 32, step: 1, required: true,
        onChange: event => onChange(event.target.value),
      }));
  }
  function PolygonSides({ zh }) {
    const [value, setValue] = useState(() => String(polygonSides()));
    return h("section", null, sidesInput(zh, value, next => {
      setValue(next);
      savePolygonSides(Number(next));
    }));
  }
  function ShapeChooser({ api, zh, close }) {
    const dialog = useRef(null);
    const selected = selectedBasicShapes(api);
    const first = selected[0];
    const kind = first && shapeKind(first);
    const current = selected.every(element => shapeKind(element) === kind) ? kind : null;
    const [sides, setSides] = useState(() => String(first?.customData?.icnBasicShape?.sides ?? polygonSides()));
    useEffect(() => { dialog.current.showModal(); }, []);
    function apply(choice) {
      if (choice === "polygon") {
        if (!validPolygonSides(Number(sides))) return;
        savePolygonSides(Number(sides));
      }
      changeBasicShape(api, choice, update, capture, Number(sides));
      close();
    }
    const heading = zh ? "更换形状" : "Change shape";
    return h("dialog", { ref: dialog, className: "icn-shape-dialog", "aria-labelledby": "icn-shape-heading",
      onCancel: event => { event.preventDefault(); close(); },
    }, h("div", { className: "icn-shape-chooser" },
      h("h2", { id: "icn-shape-heading" }, heading),
      h("div", { className: "icn-shape-choices" },
        shapeChoices.map(([id, chinese, english]) => h("button", {
          key: id, type: "button", "aria-pressed": current === id,
          disabled: id === "polygon" && !validPolygonSides(Number(sides)), onClick: () => apply(id),
        }, h("svg", { viewBox: "0 0 20 20", width: 27, height: 27, fill: "none", stroke: "currentColor",
          strokeWidth: 1.5, strokeLinejoin: "round", "aria-hidden": true,
        }, h("path", { d: basicShapeIcons[id] })), zh ? chinese : english))),
      sidesInput(zh, sides, setSides),
      h("footer", null,
        h("button", { type: "button", onClick: close }, zh ? "取消" : "Cancel")),
    ));
  }
  function ShapeContext({ apiRef, zh }) {
    const [menu, setMenu] = useState(null);
    const [open, setOpen] = useState(false);
    useEffect(() => {
      const scope = document.querySelector(".canvas-shell");
      if (!scope) return;
      const observe = new MutationObserver(() => {
        const context = scope.querySelector(".excalidraw .context-menu");
        const eligible = context?.querySelector('[data-testid="deleteSelectedElements"]') && selectedBasicShapes(apiRef.current).length;
        setMenu(eligible ? context : null);
      });
      observe.observe(scope, { childList: true, subtree: true });
      const show = () => setOpen(true);
      window.addEventListener(shapeChooserEvent, show);
      return () => {
        observe.disconnect();
        window.removeEventListener(shapeChooserEvent, show);
      };
    }, [apiRef]);
    const close = () => {
      setOpen(false);
      document.querySelector(".canvas-shell .excalidraw")?.focus({ preventScroll: true });
    };
    return h(Fragment, null,
      menu?.isConnected && createPortal(h("li", { className: "icn-change-shape-menu" },
        h("button", { type: "button", className: "context-menu-item", onClick: () => showShapeChooser(apiRef.current) },
          h("span", { className: "context-menu-item__label" }, zh ? "更换形状…" : "Change shape…"))), menu),
      open && h(ShapeChooser, { api: apiRef.current, zh, close }),
    );
  }
  return { PolygonSides, ShapeContext };
}
