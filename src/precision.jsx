import React, { useEffect, useRef, useState } from "react";
import { gridTypes, guides, measured, perspectiveCount, guidePath, unitMeters, midpoint, rotatePoint } from "./precision-engine.js";
import "./precision.css";

const fields = [
  ["grid", "网格", value => gridTypes[value.gridType]],
  ["snap", "吸附", value => value.gridSnap || value.alignGrid ? "网格与对象" : "对象"],
  ["measure", "测量", value => value.scale ? value.unit + " · 已校准" : "1:1 pt"],
  ["guide", "辅助线", value => guides[value.guideType]],
  ["recognize", "识别", value => value.hold / 1000 + " 秒"],
];

export function PrecisionPanel({ value, change, start, section, setSection, editing, setEditing, openGuide, openGrid }) {
  const patch = changes => change({ ...value, ...changes });
  const numeric = (label, key, min, max, step = 1) => <label>{label}<input type="number" min={min} max={max} step={step}
    key={value[key]} defaultValue={value[key]} onBlur={event => {
      const next = event.target.valueAsNumber;
      if (Number.isFinite(next)) patch({ [key]: Math.max(min, Math.min(max, Math.round(next / step) * step)) });
      else event.target.value = value[key];
    }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>;
  const select = (label, key, items) => <label>{label}<select aria-label={label} value={value[key]} onChange={event => patch({ [key]: event.target.value })}>
    {Object.entries(items).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
  return <section id="layer-precision-tools" className="precision-panel" aria-label="精准工具">
    <div className="precision-switches">{fields.map(([key, name, summary]) => <div className="precision-switch" key={key}>
      <label><input type="checkbox" checked={value[key]} onChange={event => {
        if (key === "guide" && event.target.checked) openGuide();
        else if (key === "grid" && event.target.checked) openGrid();
        else patch({ [key]: event.target.checked });
      }} />{name}</label>
      <button type="button" aria-label={name + "设置"} aria-expanded={section === key}
        onClick={() => setSection(section === key ? null : key)}>{summary(value)} <span>›</span></button>
    </div>)}</div>
    {section && <div className="precision-config" aria-label={fields.find(([key]) => key === section)[1] + "设置"}>
      {section === "grid" && <>
        {select("类型", "gridType", gridTypes)}
        {perspectiveCount(value.gridType) ? numeric("密度", "density", 4, 32) : <>
          {numeric("间距 · pt", "spacing", 8, 1000)}
          {numeric("细分", "divisions", 1, 10)}
        </>}
        {numeric("线宽", "weight", .5, 4, .25)}
        <label>颜色<input type="color" value={value.gridColor} onChange={event => patch({ gridColor: event.target.value })} /></label>
        {numeric("不透明度 · %", "gridOpacity", 1, 100)}
        {numeric("旋转 · °", "angle", -360, 360)}
        <button onClick={() => { if (!value.grid || !value.gridVisible) openGrid(); setEditing(editing === "grid" ? null : "grid"); }}>
          {editing === "grid" ? "完成网格编辑" : "在画布上编辑网格"}</button>
      </>}
      {section === "snap" && <>
        <label><input type="checkbox" checked={value.gridSnap} onChange={event => patch({ gridSnap: event.target.checked })} /> 矢量笔迹及测量点吸附到网格</label>
        <label><input type="checkbox" checked={value.alignGrid} onChange={event => patch({ alignGrid: event.target.checked })} /> 矢量笔迹沿网格方向对齐</label>
        <small>透视网格按消失点方向对齐，对象移动使用画布原有关键点吸附。</small>
      </>}
      {section === "measure" && <>
        <label>单位<select aria-label="单位" value={value.unit} onChange={event => {
          const unit = event.target.value;
          patch({ unit, scale: value.scale ? value.scale * unitMeters[value.unit] / unitMeters[unit] : null });
        }}>{Object.keys(unitMeters).map(unit => <option key={unit}>{unit}</option>)}</select></label>
        {numeric("小数位", "digits", 0, 5)}
        <label>比例预设<select aria-label="比例预设" value="" onChange={event => {
          const ratio = Number(event.target.value);
          if (ratio) patch({ scale: ratio * .0254 / 96 / unitMeters[value.unit] });
        }}><option value="">选择 1:n</option>{[1, 10, 20, 50, 100, 200, 500].map(ratio => <option key={ratio} value={ratio}>1:{ratio}</option>)}</select></label>
        <small>{value.scale ? "100 pt = " + measured(100, value) : "比例未校准，使用画布点数"}</small>
        <button onClick={() => start("calibrate")}>两点校准比例</button>
        <button onClick={() => start("measure")}>标注长度</button>
        {value.scale && <button onClick={() => patch({ scale: null })}>重置比例</button>}
      </>}
      {section === "guide" && <>
        {select("类型", "guideType", guides)}
        {numeric("旋转 · °", "guideRotation", -360, 360)}
        <button onClick={() => { if (!value.guide) openGuide(); setEditing(editing === "guide" ? null : "guide"); }}>
          {editing === "guide" ? "完成辅助线编辑" : "编辑控制点"}</button>
        <small>矢量笔迹落笔后沿辅助线成形。</small>
      </>}
      {section === "recognize" && <>
        {numeric("停留时间 · ms", "hold", 200, 1500, 50)}
        <small>单笔画结束时停留，可规整直线、矩形与椭圆。</small>
      </>}
    </div>}
  </section>;
}

export function CalibrationDialog({ length, unit, apply, close }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog ref={dialog} className="precision-calibration" aria-label="校准绘图比例" onCancel={event => { event.preventDefault(); close(); }}>
    <form onSubmit={event => {
      event.preventDefault();
      const distance = event.currentTarget.elements.distance.valueAsNumber;
      if (distance > 0 && Number.isFinite(distance / length)) apply(distance / length);
    }}>
      <strong>校准绘图比例</strong>
      <small>{length.toFixed(2)} pt</small>
      <label>两点间实际距离<input type="number" name="distance" aria-label="两点间实际距离" step="any" min="0" required defaultValue="1" autoFocus /> {unit}</label>
      <footer><button type="button" onClick={close}>取消</button><button type="submit">校准</button></footer>
    </form>
  </dialog>;
}

export function PrecisionGridRow({ value, change, settings, edit }) {
  if (!value.grid) return null;
  const label = value.gridVisible ? "隐藏网格图层" : "显示网格图层";
  return <div className="precision-grid-row">
    <button aria-label={label} title={label} onClick={() => change({ ...value, gridVisible: !value.gridVisible })}>{value.gridVisible ? "◉" : "○"}</button>
    <button onClick={settings} onDoubleClick={edit}><b>网格</b><small>{gridTypes[value.gridType]} · {value.gridOpacity}%</small></button>
    <button aria-label="网格图层设置" title="网格图层设置" onClick={settings}>⋯</button>
  </div>;
}

const screen = (point, v) => [(point[0] + v.scrollX) * v.zoom + v.offsetLeft, (point[1] + v.scrollY) * v.zoom + v.offsetTop];
const scene = (point, v) => [(point[0] - v.offsetLeft) / v.zoom - v.scrollX, (point[1] - v.offsetTop) / v.zoom - v.scrollY];
const defaultVP = [[600, 0], [-600, 0], [0, -450]];
function drawGrid(canvas, v, value) {
  const w = window.innerWidth, h = window.innerHeight, dpi = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * dpi) || canvas.height !== Math.round(h * dpi)) {
    canvas.width = Math.round(w * dpi); canvas.height = Math.round(h * dpi);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = ctx.fillStyle = value.gridColor;
  ctx.lineWidth = value.weight;
  ctx.globalAlpha = value.gridOpacity / 100;
  const [ox, oy] = screen(value.origin, v);
  const count = perspectiveCount(value.gridType);
  const rotation = value.angle * Math.PI / 180;
  const line = (a, b, c, d) => { ctx.moveTo(a, b); ctx.lineTo(c, d); };
  if (count) {
    ctx.beginPath();
    for (const point of (value.vanishing || defaultVP).slice(0, count)) {
      const [x, y] = screen(point, v);
      const reach = Math.max(Math.hypot(x, y), Math.hypot(w - x, h - y), Math.hypot(x, h - y), Math.hypot(w - x, y)) + 2;
      for (let i = 0; i < value.density; i++) {
        const a = Math.PI * i / value.density + rotation, dx = Math.cos(a) * reach, dy = Math.sin(a) * reach;
        line(x - dx, y - dy, x + dx, y + dy);
      }
    }
    ctx.stroke();
    return;
  }
  const realStep = value.spacing * v.zoom / value.divisions;
  const step = realStep * Math.max(1, Math.ceil(8 / realStep));
  const diagonal = Math.hypot(w, h);
  const c = Math.cos(rotation), s = Math.sin(rotation);
  const mx = (w / 2 - ox) * c + (h / 2 - oy) * s, my = (h / 2 - oy) * c - (w / 2 - ox) * s;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rotation);
  if (value.gridType === "dots") {
    const dotStep = step * Math.max(1, Math.ceil(14 / step));
    if (dotStep <= 512) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = Math.ceil(dotStep * dpi);
      const dot = tile.getContext("2d");
      dot.fillStyle = value.gridColor;
      dot.fillRect(0, 0, (value.weight + .5) * dpi, (value.weight + .5) * dpi);
      const pattern = ctx.createPattern(tile, "repeat");
      pattern.setTransform(new DOMMatrix().translate(-mx % dotStep, -my % dotStep).scale(dotStep / tile.width));
      ctx.fillStyle = pattern;
      ctx.fillRect(-diagonal / 2, -diagonal / 2, diagonal, diagonal);
      return;
    }
    const first = center => Math.floor((center - diagonal / 2) / dotStep) * dotStep - center;
    for (let y = first(my); y < diagonal / 2; y += dotStep)
      for (let x = first(mx); x < diagonal / 2; x += dotStep)
        ctx.fillRect(x, y, value.weight + .5, value.weight + .5);
    return;
  }
  const triangular = ["iso", "triangle"].includes(value.gridType);
  const families = value.gridType === "lines" ? [0] : triangular ? (value.gridType === "iso" ? [Math.PI / 6, Math.PI / 2, Math.PI * 5 / 6] : [0, Math.PI / 3, -Math.PI / 3]) : [0, Math.PI / 2];
  families.forEach(angle => {
    const shift = my * Math.cos(angle) - mx * Math.sin(angle);
    const spacing = triangular ? step * Math.sqrt(3) / 2 : step;
    ctx.save();
    ctx.rotate(angle);
    for (const major of [false, true]) {
      ctx.globalAlpha = value.gridOpacity / 100 * (major ? 1 : .38);
      ctx.beginPath();
      for (let i = Math.floor((shift - diagonal) / spacing); i <= Math.ceil((shift + diagonal) / spacing); i++) {
        if ((i % value.divisions === 0) !== major) continue;
        const y = i * spacing - shift;
        line(-diagonal, y, diagonal, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  });
}

export function PrecisionOverlay({ value, viewport, change, editing, selected }) {
  const grid = useRef(null), pointer = useRef(null);
  const [draft, setDraft] = useState(null);
  useEffect(() => { pointer.current = null; setDraft(null); }, [editing]);
  const active = draft || value;
  useEffect(() => {
    if (!grid.current || !viewport) return;
    const canvas = grid.current;
    const update = () => drawGrid(canvas, viewport, active);
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", update); };
  }, [active, viewport]);
  if (!viewport || !(active.grid || active.guide || active.measure)) return null;
  const v = viewport;
  const guideCenter = active.guide && active.guidePoints ? midpoint(...active.guidePoints) : null;
  const rotated = p => rotatePoint(p, guideCenter, active.guideRotation);
  const handles = editing === "grid" && active.grid && active.gridVisible ? [["origin", active.origin], ...((active.vanishing || defaultVP).slice(0, perspectiveCount(active.gridType)).map((p, i) => ["vp" + i, p]))]
    : editing === "guide" && guideCenter ? [...active.guidePoints.map((p, i) => ["guide" + i, rotated(p)]), ["guideCenter", guideCenter]] : [];
  const update = event => {
    const state = pointer.current;
    if (!state) return;
    const point = scene([event.clientX, event.clientY], v);
    const { id, initial } = state;
    const next = { ...initial };
    if (id === "origin") {
      next.origin = point;
      if (perspectiveCount(initial.gridType)) next.vanishing = (initial.vanishing || defaultVP).map(p => [p[0] + point[0] - initial.origin[0], p[1] + point[1] - initial.origin[1]]);
    } else if (id.startsWith("vp")) next.vanishing = (initial.vanishing || defaultVP).map((p, i) => id === "vp" + i ? point : p);
    else {
      const center = midpoint(...initial.guidePoints);
      if (id === "guideCenter") next.guidePoints = initial.guidePoints.map(p => [p[0] + point[0] - center[0], p[1] + point[1] - center[1]]);
      else {
        const opposite = rotatePoint(initial.guidePoints[id === "guide0" ? 1 : 0], center, initial.guideRotation);
        const nextCenter = midpoint(point, opposite);
        next.guidePoints = (id === "guide0" ? [point, opposite] : [opposite, point]).map(p => rotatePoint(p, nextCenter, -initial.guideRotation));
      }
    }
    state.next = next;
    setDraft(next);
  };
  return <>
    {active.grid && active.gridVisible && <canvas ref={grid} className="precision-grid-canvas" aria-hidden="true" />}
    {(active.guide && active.guidePoints || handles.length > 0) && <svg className="precision-guide-svg" aria-label="精准控制点">
      {guideCenter && <polyline points={guidePath(active.guideType, active.guidePoints).map(point => screen(rotated(point), v).join(",")).join(" ")} />}
      {handles.map(([id, point]) => {
        const [x, y] = screen(point, v);
        return <circle key={id} cx={x} cy={y} r={id === "guideCenter" ? 6 : 8} aria-label={id === "origin" ? "网格原点" : id.startsWith("vp") ? "消失点" : id === "guideCenter" ? "移动辅助线" : "辅助线控制点"}
          onPointerDown={event => { pointer.current = { id, initial: value }; event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={update}
          onPointerUp={() => { if (pointer.current?.next) change(pointer.current.next); pointer.current = null; setDraft(null); }}
          onPointerCancel={() => { pointer.current = null; setDraft(null); }} />;
      })}
    </svg>}
    {active.measure && selected && <output className="precision-selected-measure" style={{
      left: Math.max(8, Math.min(window.innerWidth - 160, screen([selected.x, selected.y], v)[0])),
      top: Math.max(55, Math.min(window.innerHeight - 48, screen([selected.x, selected.y], v)[1] - 25)),
    }}>{measured(selected.width, active)} × {measured(selected.height, active)}
      {selected.length > 0 && " · 长 " + measured(selected.length, active)}
      {selected.area > 0 && " · 面积 " + measured(selected.area, active, 2)}</output>}
  </>;
}
