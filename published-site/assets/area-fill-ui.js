import { measureBucketElement } from "./bucket-fill-r11.js";

const styles = [
  ["solid", "纯色", "Solid"],
  ["hachure", "斜线", "Hachure"],
  ["cross-hatch", "交叉线", "Cross-hatch"],
  ["zigzag", "锯齿", "Zigzag"],
];

export function createAreaFillUI(React, measured) {
  const { createElement: h, useEffect, useState } = React;

  function AreaToggle({ enabled, toggle, zh = true, compact = false }) {
    const label = zh ? "面积填充" : "Area fill";
    return h("button", {
      type: "button", className: compact ? "icn-area-toggle icn-area-toggle-wheel" : "icn-area-toggle",
      "aria-label": label, "aria-pressed": !!enabled,
      title: enabled ? (zh ? "面积填充已开启，点按闭合区域" : "Area fill on. Click inside a closed region.") :
        (zh ? "面积填充已关闭，点击开启" : "Area fill off. Click to enable."),
      onClick: toggle,
    }, compact ? h("svg", { width: 15, height: 15, viewBox: "0 0 20 20", "aria-hidden": true, fill: "none",
      stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round",
    }, h("path", { d: "M3 8V4h4m6 0h4v4m0 4v4h-4m-6 0H3v-4M6 13l7-7m-3 7 3-3" })) : label);
  }

  function PatternButton({ kit, zh }) {
    const label = zh ? "填充图案" : "Fill pattern";
    const style = kit.pen?.fillStyle || "solid";
    return h("button", { type: "button", className: "icn-pattern-wheel",
      "aria-label": label, "aria-expanded": kit.panel === "fillPattern", title: label,
      onClick: () => kit.display("fillPattern"),
    }, h("span", { "aria-hidden": true, className: "icn-fill-sample", "data-pattern": style }));
  }

  function PatternOptions({ kit, zh }) {
    const selected = kit.selection;
    const activeStyle = selected ? selected.fillStyle : kit.pen?.fillStyle || "solid";
    return h("div", { className: "icn-fill-patterns", role: "group", "aria-label": zh ? "填充图案" : "Fill patterns" },
      styles.map(([id, chinese, english]) => h("button", {
        type: "button", key: id, "aria-pressed": activeStyle === id,
        onClick: () => { if (kit.set("fillStyle", id) && !selected) kit.setPanel(null); },
      }, h("span", { "aria-hidden": true, className: "icn-fill-sample", "data-pattern": id }), zh ? chinese : english)));
  }

  function AreaReadouts({ apiRef, ready, precision, zh }) {
    const [readouts, setReadouts] = useState(null);
    useEffect(() => {
      if (!ready) return;
      let binding, frame, unsubscribeChange, unsubscribeScroll;
      function bind() {
        const api = apiRef.current;
        if (!api) { binding = requestAnimationFrame(bind); return; }
        function refresh() {
          frame = null;
          const state = api.getAppState();
          const { zoom, offsetLeft, offsetTop, scrollX, scrollY, width, height } = state;
          const entries = api.getSceneElements().flatMap(element => {
            const area = measureBucketElement(element);
            if (!area) return [];
            const left = (area.x + scrollX) * zoom.value;
            const top = (area.y + scrollY) * zoom.value;
            if (left < 0 || top < 0 || left > width || top > height) return [];
            return [{ ...area, left, top, id: element.id }];
          });
          setReadouts(entries.length ? { offsetLeft, offsetTop, width, height, entries } : null);
        }
        const schedule = () => { if (frame == null) frame = requestAnimationFrame(refresh); };
        unsubscribeChange = api.onChange(schedule);
        unsubscribeScroll = api.onScrollChange(schedule);
        schedule();
      }
      bind();
      return () => { cancelAnimationFrame(binding); cancelAnimationFrame(frame); unsubscribeChange?.(); unsubscribeScroll?.(); };
    }, [apiRef, ready, precision]);
    if (!readouts) return null;
    return h("div", { className: "icn-area-readouts", style: { left: readouts.offsetLeft, top: readouts.offsetTop, width: readouts.width, height: readouts.height } },
      readouts.entries.map(({ id, left, top, value, approximate }) => h("output", {
        key: id, className: "icn-area-result", style: { left, top },
        "aria-label": (zh ? "填充面积 " : "Filled area ") + measured(value, precision, 2),
      }, (approximate ? "≈ " : "") + measured(value, precision, 2))));
  }
  return { AreaToggle, PatternButton, PatternOptions, AreaReadouts };
}
