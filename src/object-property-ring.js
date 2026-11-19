import { propertyOptionIcon } from "./property-icons.js";

const symbols = {
  width: "≡", strokeStyle: "┄", roughness: "∿", roundness: "╭", fillStyle: "▧",
  fillColor: "●", opacity: "◐", arrowType: "↱", startArrowhead: "←", endArrowhead: "→",
  fontSize: "A↕", fontFamily: "Aa", textAlign: "☰", verticalAlign: "↕", geometry: "⤢", crop: "▣",
};
const arrowheads = [[null, "无", "None"], ["arrow", "箭头", "Arrow"], ["triangle", "实心三角", "Triangle"],
  ["triangle_outline", "空心三角", "Outlined triangle"], ["circle", "实心圆", "Circle"],
  ["circle_outline", "空心圆", "Outlined circle"], ["diamond", "实心菱形", "Diamond"],
  ["diamond_outline", "空心菱形", "Outlined diamond"], ["bar", "短线", "Bar"],
  ["crowfoot_one", "一", "One"], ["crowfoot_many", "多", "Many"], ["crowfoot_one_or_many", "一或多", "One or many"]];

export function createObjectPropertyRing(React, revise, convert, capture) {
  const { createElement: h, useState, useEffect, useRef } = React;
  return function ObjectPropertyRing({ api, kit, zh, selected, defaults=false, preferences }) {
    const [open, setOpen] = useState(null);
    const root = useRef(null);
    const t = (cn, en) => zh ? cn : en;
    const key = selected.map(e => e.id).sort().join("|");
    const all = test => selected.length > 0 && selected.every(test);
    const textFor = e => e.type === "text" ? e : api.getSceneElements().find(x =>
      x.type === "text" && !x.isDeleted && x.containerId === e.id);
    const vector = e => ["rectangle", "diamond", "ellipse", "line", "arrow", "freedraw"].includes(e.type);
    const closed = e => ["rectangle", "diamond", "ellipse"].includes(e.type) ||
      e.type === "freedraw" && e.customData?.infiniteFillColor ||
      e.type === "line" && e.points.length > 2 && Math.hypot(...e.points.at(-1)) < 1;
    const specs = [
      ["width", "线宽", "Stroke width", vector, "strokeWidth", "number", defaults?[.5,24,.5]:[0.1,100,.1]],
      ["strokeStyle", "线型", "Stroke style", vector, "strokeStyle", "choice", [["solid", "实线", "Solid"], ["dashed", "虚线", "Dashed"], ["dotted", "点线", "Dotted"]]],
      ["roughness", "线条风格", "Sloppiness", e => vector(e) && e.type!=='freedraw' && !e.elbowed, "roughness", "choice", [[0, "精确", "Architect"], [1, "手绘", "Artist"], [2, "草绘", "Cartoonist"]]],
      ["roundness", "边角", "Corners", e => !e.customData?.icnBoolean && ["rectangle", "diamond", "line"].includes(e.type), "roundness", "choice", [["sharp", "直角", "Sharp"], ["round", "圆角", "Round"]]],
      ["fillColor", "填充颜色", "Fill color", closed, "backgroundColor", "color"],
      ["fillStyle", "填充图案", "Fill pattern", closed, "fillStyle", "choice", [["solid", "纯色", "Solid"], ["hachure", "斜线", "Hachure"], ["cross-hatch", "交叉线", "Cross-hatch"], ["zigzag", "锯齿", "Zigzag"]]],
      ["arrowType", "箭头类型", "Arrow type", e => e.type === "arrow", "arrowType", "choice", [["sharp", "直线箭头", "Straight"], ["round", "曲线箭头", "Curved"], ["elbow", "折线箭头", "Elbow"]]],
      ["startArrowhead", "起点端头", "Start arrowhead", e => ["arrow", "line"].includes(e.type), "startArrowhead", "choice", arrowheads],
      ["endArrowhead", "终点端头", "End arrowhead", e => ["arrow", "line"].includes(e.type), "endArrowhead", "choice", arrowheads],
      ["fontSize", "字号", "Font size", e => !!textFor(e), "fontSize", "number", [1, 200, 1]],
      ["fontFamily", "字体", "Font family", e => !!textFor(e), "fontFamily", "choice", [[5, "Excalifont 手写", "Excalifont"], [1, "Virgil 手写", "Virgil"], [2, "Helvetica", "Helvetica"], [3, "Cascadia 等宽", "Cascadia"], [6, "Nunito", "Nunito"], [7, "Lilita One", "Lilita One"], [8, "Comic Shanns", "Comic Shanns"], [9, "Liberation Sans", "Liberation Sans"]]],
      ["textAlign", "文字对齐", "Text alignment", e => !!textFor(e), "textAlign", "choice", [["left", "左对齐", "Left"], ["center", "居中", "Center"], ["right", "右对齐", "Right"]]],
      ["verticalAlign", "垂直对齐", "Vertical alignment", e => e.type !== "arrow" && !!textFor(e)?.containerId, "verticalAlign", "choice", [["top", "顶部", "Top"], ["middle", "居中", "Middle"], ["bottom", "底部", "Bottom"]]],
      ["opacity", "不透明度", "Opacity", () => true, "opacity", "number", [0, 100, 1]],
      ["smoothing", "平滑度", "Smoothing", e=>defaults&&e.type==='freedraw', "smoothing", "brush", [0,100,1]],
      ["dashDensity", "虚线密度", "Dash density", e=>defaults&&vector(e), "dashDensity", "brush", [1,100,1]],
      ["brushSettings", "笔刷参数", "Brush settings",e=>defaults&&e.type==='freedraw','brushSettings','action'],
      ["geometry", "尺寸与位置", "Size & position", () => !defaults, "geometry", "geometry"],
      ["crop", "裁剪图片", "Crop image", e => !defaults&&e.type === "image" && selected.length === 1, "crop", "action"],
    ].filter(spec => all(spec[3]));
    const spec = specs.find(s => s[0] === open);
    useEffect(() => { setOpen(null); }, [key]);
    useEffect(() => {
      const close = event => {
        if (event.key === "Escape" || event.type === "pointerdown" && !root.current?.contains(event.target)) setOpen(null);
      };
      window.addEventListener("pointerdown", close);
      window.addEventListener("keydown", close);
      return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", close); };
    }, []);

    const read = (e, field) => {
      if(defaults&&field==='arrowType')return api.getAppState().currentItemArrowType;
      if(defaults&&['smoothing','dashDensity'].includes(field))return kit.pen?.[field]??0;
      if (field === "arrowType") return e.elbowed ? "elbow" : e.roundness ? "round" : "sharp";
      if (field === "roundness") return e.roundness ? "round" : "sharp";
      if (["fontSize", "fontFamily", "textAlign", "verticalAlign"].includes(field)) return textFor(e)?.[field];
      return e[field];
    };
    const shared = field => {
      const first = read(selected[0], field);
      return selected.every(e => read(e, field) === first) ? first : undefined;
    };
    function apply(field, value) {
      if (api.getAppState().viewModeEnabled) return;
      if(field==='brushSettings'){kit.setPanel('brushDetail');setOpen(null);return;}
      if(defaults){if(['smoothing','dashDensity'].includes(field)){kit.setMany({[field]:value});return;}preferences.set(api,kit,field,value);return;}
      preferences?.rememberSelected(selected,field,value);
      if (field === "arrowType") {
        // Use Excalidraw's action so elbow routing and existing bindings stay valid.
        const target = document.querySelector(`.selected-shape-actions [data-testid="${value}-arrow"], .App-mobile-menu [data-testid="${value}-arrow"]`);
        if (target) { target.click(); return; }
        api.setToast({ message: t("请先单独选中箭头再设置箭头类型。", "Select an arrow to change its type.") });
        return;
      }
      if (field === "crop") {
        document.querySelector('[data-testid="cropEditor"]')?.click();
        setOpen(null);
        return;
      }
      const ids = new Set(selected.map(e => e.id));
      const textProperty = ["fontFamily", "fontSize", "textAlign", "verticalAlign"].includes(field);
      if (textProperty) selected.forEach(e => { const label = textFor(e); if (label) ids.add(label.id); });
      const elements = api.getSceneElementsIncludingDeleted().map(e => {
        if (!ids.has(e.id) || e.locked || e.isDeleted || textProperty && e.type !== "text") return e;
        let patch = { [field]: value };
        if ((field === "width" || field === "height") && e.points) {
          const index = field === "width" ? 0 : 1;
          const previous = e[field];
          if (previous > 0) patch.points = e.points.map(p => p.map((n, i) => i === index ? n * value / previous : n));
        }
        if (field === "roundness") patch.roundness = value === "round" ? { type: e.type === "rectangle" ? 3 : 2 } : null;
        if (field === "fontFamily" || field === "fontSize") {
          const [sized] = convert([{ type: "text", x: e.x, y: e.y, text: e.originalText || e.text,
            fontFamily: e.fontFamily, fontSize: e.fontSize, ...patch }]);
          patch = { ...patch, width: sized.width, height: sized.height, lineHeight: sized.lineHeight };
        }
        if (field === "backgroundColor" && e.customData?.infiniteFillColor)
          patch.customData = { ...e.customData, infiniteFillColor: value };
        return revise(e, patch);
      });
      api.updateScene({ elements, captureUpdate: capture.IMMEDIATELY });
    }
    function numberInput(field, label, min, max, step = 1) {
      const value = shared(field);
      return h("label", { className: "icn-ring-value", key: field }, label,
        h("input", { key: key + field + value, type: "number", min, max, step,
          defaultValue: field === "angle" && value != null ? +(value * 180 / Math.PI).toFixed(2) : value == null ? "" : +value.toFixed(2),
          placeholder: value == null ? t("混合", "Mixed") : undefined, "aria-label": label,
          onBlur: e => {
            if (!e.target.value.trim() || !e.target.validity.valid) return;
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n)) apply(field, field === "angle" ? n * Math.PI / 180 : n);
          }, onKeyDown: e => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); },
        }));
    }
    const fill = spec?.[5] === "color";
    const strokeAllowed = all(e => !["image", "frame", "magicframe", "embeddable"].includes(e.type));
    const controls = specs.map((item, index) => {
      const angle = (index / specs.length * 360 - 90) * Math.PI / 180;
      return h("button", { key: item[0], type: "button", className: "icn-ring-property",
        style: { left: 62 + Math.cos(angle) * 47, top: 62 + Math.sin(angle) * 47 },
        title: t(item[1], item[2]), "aria-label": t(item[1], item[2]), "aria-expanded": open === item[0],
        onClick: () => item[5] === "action" ? apply(item[4]) : setOpen(open === item[0] ? null : item[0]),
      }, item[0] === "fillColor" ? h("span", { className: "icn-ring-swatch", style: { background: shared("backgroundColor") || "transparent" } })
        : symbols[item[0]]||'⚙');
    });
    return h("div", { className: "icn-object-ring", ref: root },
      h("div", { className: "icn-ring-controls", role: "group", "aria-label": t("对象圆盘属性", "Object wheel properties") }, controls),
      strokeAllowed && h("button", { type: "button", className: "icn-ring-stroke", "aria-label": t("描边颜色", "Stroke color"),
        title: t("描边颜色", "Stroke color"), style: { background: shared("strokeColor") || "#d1c9dd" },
        onClick: () => defaults ? setOpen('strokeColor') : kit.display("fan") }),
      open==='strokeColor'&&defaults&&h('aside',{className:'icn-ring-popover'},h('header',null,t('描边颜色','Stroke color'),h('button',{onClick:()=>setOpen(null)},'×')),h('input',{type:'color','aria-label':t('工具描边颜色','Tool stroke color'),value:shared('strokeColor')||'#1b1b1f',onChange:e=>apply('strokeColor',e.target.value)})),
      spec && h("aside", { className: "icn-ring-popover", "aria-label": t(spec[1], spec[2]) },
        h("header", null, t(spec[1], spec[2]), h("button", { type: "button", onClick: () => setOpen(null), "aria-label": t("关闭属性", "Close property") }, "×")),
        spec[5] === "choice" && h("div", { className: "icn-ring-choices" }, spec[6].map(([value, cn, en]) =>
          h("button", { key: String(value), type: "button", "aria-pressed": shared(spec[4]) === value,
            onClick: () => apply(spec[4], value) }, propertyOptionIcon(h, spec[4], value), h("span", null, t(cn, en))))),
        ['number','brush'].includes(spec[5]) && numberInput(spec[4], t(spec[1], spec[2]), ...spec[6]),
        fill && h("div", { className: "icn-ring-colors" },
          ["transparent", "#ffffff", "#1b1b1f", "#e03131", "#2f9e44", "#1971c2", "#f08c00"].map(color =>
            h("button", { key: color, title: color, type: "button", style: { background: color },
              "aria-label": color, onClick: () => apply("backgroundColor", color) })),
          h("input", { type: "color", "aria-label": t("自定义填充色", "Custom fill"),
            onChange: e => apply("backgroundColor", e.target.value) })),
        spec[5] === "geometry" && ["x", "y", "width", "height", "angle"].map((field, i) =>
          numberInput(field, [t("位置 X", "Position X"), t("位置 Y", "Position Y"), t("宽度", "Width"), t("高度", "Height"), t("旋转角度", "Rotation")][i],
            ["width", "height"].includes(field) ? .1 : undefined, undefined, .1))),
    );
  };
}
