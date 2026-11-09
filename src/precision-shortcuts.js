import { gridTypes, guides, unitMeters } from "./precision-engine.js";

const grids = { dots: "Dots", square: "Square", lines: "Ruled", iso: "Isometric", triangle: "Triangular", one: "One-point perspective", two: "Two-point perspective", three: "Three-point perspective" };
const guideNames = { line: "Line", arc: "Arc", angle: "Angle", ellipse: "Ellipse", rect: "Rectangle" };
const fields = {
  spacing: ["网格间距", "grid spacing", 5, 8, 1000],
  divisions: ["网格细分", "grid divisions", 1, 1, 10],
  density: ["透视网格密度", "perspective grid density", 1, 4, 32],
  weight: ["网格线宽", "grid weight", .25, .5, 4],
  gridOpacity: ["网格不透明度", "grid opacity", 5, 1, 100],
  angle: ["网格角度", "grid angle", 5, -360, 360],
  guideRotation: ["辅助线角度", "guide angle", 5, -360, 360],
  hold: ["停笔识别时间", "recognition hold time", 50, 200, 1500],
  digits: ["测量小数位", "measurement precision", 1, 0, 5],
};
const ratios = [1, 10, 20, 50, 100, 200, 500];
const switches = [
  ["snap", "对象吸附", "Object snapping", "Alt+KeyS"],
  ["gridSnap", "笔迹及测量点吸附网格", "Snap strokes and measurements to grid"],
  ["alignGrid", "沿网格方向对齐笔迹", "Align strokes to grid directions"],
  ["measure", "测量显示", "Show measurements"],
  ["recognize", "停笔识别", "Hold to recognize"],
];
const panels = [
  ["grid", "网格设置", "Grid settings"],
  ["snap", "吸附设置", "Snap settings"],
  ["measure", "测量设置", "Measurement settings"],
  ["guide", "辅助线设置", "Guide settings"],
  ["recognize", "停笔识别设置", "Recognition settings"],
];

export const precisionCommands = [
  ["precisionPanel", "打开／关闭精准工具", "Toggle precision tools"],
  ["precisionGrid", "网格", "Toggle grid", "Ctrl+Quote"],
  ["precisionGridVisible", "显示／隐藏网格图层", "Show / hide grid layer"],
  ["precisionGuide", "辅助线", "Toggle guide"],
  ["precisionGridEdit", "编辑网格控制点", "Edit grid handles"],
  ["precisionGuideEdit", "编辑辅助线控制点", "Edit guide handles"],
  ["precisionCalibrate", "两点校准比例", "Calibrate with two points"],
  ["precisionMeasure", "标注长度", "Annotate length"],
  ["precisionResetScale", "重置测量比例", "Reset drawing scale"],
  ...switches.map(([key, ...labels]) => ["precisionToggle." + key, ...labels]),
  ...panels.map(([key, ...labels]) => ["precisionPanel." + key, ...labels]),
  ...Object.entries(gridTypes).map(([key, name]) => ["precisionGridType." + key, "网格 · " + name, "Grid · " + grids[key]]),
  ...Object.entries(guides).map(([key, name]) => ["precisionGuideType." + key, "辅助线 · " + name, "Guide · " + guideNames[key]]),
  ...Object.keys(unitMeters).map(unit => ["precisionUnit." + unit, "测量单位 · " + unit, "Measurement unit · " + unit]),
  ...ratios.map(ratio => ["precisionScale." + ratio, "绘图比例 1:" + ratio, "Drawing scale 1:" + ratio]),
  ...Object.entries(fields).flatMap(([key, [cn, en]]) => [
    ["precisionDecrease." + key, cn + " −", "Decrease " + en],
    ["precisionIncrease." + key, cn + " +", "Increase " + en],
  ]),
];

export function makePrecisionCommands({ current, change, openGrid, openGuide, openPanel, togglePanel, edit, start }) {
  const patch = changes => change({ ...current.current, ...changes });
  return {
    precisionPanel: togglePanel,
    precisionGrid: () => current.current.grid ? patch({ grid: false }) : openGrid(),
    precisionGridVisible: () => current.current.grid ? patch({ gridVisible: !current.current.gridVisible }) : openGrid(),
    precisionGuide: () => current.current.guide ? patch({ guide: false }) : openGuide(),
    precisionGridEdit: () => { if (!current.current.grid || !current.current.gridVisible) openGrid(); edit("grid"); },
    precisionGuideEdit: () => { if (!current.current.guide) openGuide(); else edit("guide"); },
    precisionCalibrate: () => start("calibrate"),
    precisionMeasure: () => start("measure"),
    precisionResetScale: () => patch({ scale: null }),
    ...Object.fromEntries(switches.map(([key]) => ["precisionToggle." + key, () => patch({ [key]: !current.current[key] })])),
    ...Object.fromEntries(panels.map(([key]) => ["precisionPanel." + key, () => openPanel(key)])),
    ...Object.fromEntries(Object.keys(gridTypes).map(key => ["precisionGridType." + key, () => {
      patch({ gridType: key });
      if (!current.current.grid || !current.current.gridVisible) openGrid();
    }])),
    ...Object.fromEntries(Object.keys(guides).map(key => ["precisionGuideType." + key, () => {
      patch({ guideType: key });
      if (!current.current.guide) openGuide();
    }])),
    ...Object.fromEntries(Object.keys(unitMeters).map(unit => ["precisionUnit." + unit, () => {
      const { scale, unit: oldUnit } = current.current;
      patch({ unit, scale: scale ? scale * unitMeters[oldUnit] / unitMeters[unit] : null });
    }])),
    ...Object.fromEntries(ratios.map(ratio => ["precisionScale." + ratio, () => patch({ scale: ratio * .0254 / 96 / unitMeters[current.current.unit] })])),
    ...Object.fromEntries(Object.entries(fields).flatMap(([key, [, , step, min, max]]) => [-1, 1].map(direction => [
      (direction === 1 ? "precisionIncrease." : "precisionDecrease.") + key,
      () => patch({ [key]: Math.min(max, Math.max(min, current.current[key] + direction * step)) }),
    ]))),
  };
}
