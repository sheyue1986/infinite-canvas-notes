import React, { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import copic from "./copic-colors.json";
import "./colors.css";

const storageKey = "infinite-canvas-colors-v1";
const channel = value => Math.min(255, Math.max(0, Math.round(value)));
const hue = value => (value % 360 + 360) % 360;
export const hexColor = value => {
  const text = String(value || "").trim().replace(/^#/, "");
  if (/^[\da-f]{3}$/i.test(text)) return "#" + [...text.toLowerCase()].map(character => character.repeat(2)).join("");
  return /^[\da-f]{6}$/i.test(text) ? "#" + text.toLowerCase() : null;
};
const rgb = value => (hexColor(value) || "#000000").slice(1).match(/../g).map(pair => parseInt(pair, 16));
const hex = values => "#" + values.map(value => channel(value).toString(16).padStart(2, "0")).join("");
function hsl(value, fallback = 0) {
  const [r, g, b] = rgb(value).map(value => value / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, l = (max + min) / 2;
  if (!delta) return [fallback, 0, l * 100];
  const h = max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return [hue(h * 60), delta / (1 - Math.abs(2 * l - 1)) * 100, l * 100];
}
function fromHsl([h, s, l]) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const component = n => { const k = (n + hue(h) / 30) % 12; return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
  return hex([component(0), component(8), component(4)]);
}

const defaultColors = ["#1b1b1f", "#ffffff", "#a8ada9", "#f5bb36", "#ee635b", "#558bc8", "#52a891", "#8655bf"];
const defaults = [
  { id: "essentials", name: "常用颜色", colors: defaultColors },
  { id: "landscape", name: "场地与植被", colors: ["#eae8d4", "#aeb78e", "#79906b", "#506b51", "#30483d", "#b99263", "#897560", "#4d463d"] },
  { id: "materials", name: "建筑材质", colors: ["#f4f0e9", "#ddd3c5", "#b8a18a", "#a96c55", "#8b5f4d", "#747876", "#485459", "#2c3231"] },
];
const fresh = { palettes: defaults, pinned: [], current: "essentials", recent: [], used: {}, mode: "spectrum" };
const dynamicNames = ["邻近色", "单色变化", "互补色", "明暗阶", "三角色", "最近使用", "最常使用"];
const dynamicId = index => "dynamic-" + index;
const isDynamic = id => dynamicNames.some((_, index) => id === dynamicId(index));
function dynamicPalettes(color, recent, used) {
  const [h, s, l] = hsl(color);
  const fromHues = offsets => offsets.map(d => fromHsl([h + d, Math.max(s, 45), l]));
  const colors = [fromHues([-45, -22, 0, 22, 45]),
    [18, 38, 58, 78, 98].map(value => fromHsl([h, value, l])), fromHues([0, 22, 180, 202]),
    [19, 36, 53, 70, 87].map(value => fromHsl([h, s, value])), fromHues([0, 120, 240]), recent,
    Object.entries(used).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([value]) => value)];
  return dynamicNames.map((name, index) => ({ id: dynamicId(index), name, colors: colors[index] }));
}
const togglePalette = (state, id) => ({ ...state, current: id,
  pinned: state.pinned.includes(id) ? state.pinned.filter(key => key !== id) : [...state.pinned, id] });
const clean = input => Array.isArray(input) ? input.slice(0, 120).flatMap(item => {
  if (!item || typeof item.name !== "string" || !Array.isArray(item.colors)) return [];
  return [{ id: typeof item.id === "string" ? item.id : crypto.randomUUID(), name: item.name.trim().slice(0, 50) || "未命名色板",
    colors: item.colors.map(hexColor).filter(Boolean).slice(0, 8) }];
}) : [];
function load() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    if (!value || !Array.isArray(value.palettes)) return fresh;
    const palettes = clean(value.palettes);
    return { ...fresh, palettes, pinned: Array.isArray(value.pinned) ? value.pinned.filter(id => isDynamic(id) || palettes.some(p => p.id === id)) : [],
      recent: Array.isArray(value.recent) ? value.recent.map(hexColor).filter(Boolean).slice(0, 8) : [],
      used: Object.fromEntries(Object.entries(value.used || {}).filter(([key, count]) => hexColor(key) === key && Number.isInteger(count) && count > 0).slice(0, 40)),
      current: isDynamic(value.current) || palettes.some(p => p.id === value.current) ? value.current : palettes[0]?.id,
      mode: ["spectrum", "hsl", "rgb"].includes(value.mode) ? value.mode : "spectrum" };
  } catch { return fresh; }
}

export function useColors() {
  const [state, set] = useState(load);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* palette remains usable in this tab */ }
  }, [state]);
  return { state, set,
    remember: color => set(old => {
      const top = Object.entries(old.used).filter(([value]) => value !== color).sort((a, b) => b[1] - a[1]).slice(0, 39);
      return { ...old, recent: [color, ...old.recent.filter(item => item !== color)].slice(0, 8),
        used: Object.fromEntries([[color, (old.used[color] || 0) + 1], ...top]) };
    }),
  };
}

const fanCenter = 99;
const fanStart = -20, fanEnd = 101, bandCount = 22;
const fanPoint = (r, a) => [fanCenter + r * Math.cos(a * Math.PI / 180), fanCenter + r * Math.sin(a * Math.PI / 180)];
const fanArc = (r, a, b) => `M${fanPoint(r, a)}A${r},${r} 0 0 1 ${fanPoint(r, b)}`;
const fanWedge = (r, outer, a, b) =>
  `M${fanPoint(outer, a)}A${outer},${outer} 0 0 1 ${fanPoint(outer, b)}L${fanPoint(r, b)}A${r},${r} 0 0 0 ${fanPoint(r, a)}Z`;
const codeColors = new Map(copic);
const colorCodes = new Map(copic.map(([code, value]) => [value, code]));
const familyOrder = ["YG", "G", "BG", "B", "BV", "V", "RV", "R", "YR", "Y", "E"];
const byFamily = new Map();
const groupFor = code => /^([A-Z]+)([0-9])/.exec(code);
for (const item of copic) {
  const code = groupFor(item[0]);
  if (!code || !familyOrder.includes(code[1])) continue;
  const key = code[1] + code[2];
  if (!byFamily.has(key)) byFamily.set(key, []);
  byFamily.get(key).push(item);
}
const bands = familyOrder.flatMap(family => Array.from({ length: 10 }, (_, i) => {
  const rows = byFamily.get(family + i);
  if (!rows) return [];
    const sorted = [...rows].sort((a, b) => a[0].length - b[0].length || b[0].localeCompare(a[0]));
  const result = [];
  for (let start = 0; start < sorted.length; start += 8) result.push(sorted.slice(start, start + 8));
  return result;
}).flat());
const grays = ["100", "110", ...["N", "T", "W", "C"].flatMap(family =>
  copic.map(([code]) => code).filter(code => code.startsWith(family + "-"))
    .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)) || b.length - a.length))]
  .filter(code => codeColors.has(code)).map(code => [code, codeColors.get(code)]);
const specials = copic.filter(([code]) => /^F/.test(code) || code === "0").concat([["白", "#ffffff"]]);
const familyNames = ["黄绿", "绿", "蓝绿", "蓝", "蓝紫", "紫", "紫红", "红", "橙", "黄", "大地"];
const familyChips = ["YG25", "G17", "BG15", "B24", "BV13", "V15", "RV14", "R27", "YR07", "Y15", "E35"];
const bandColors = bands.flatMap((group, index) => group.map(([code, value]) => ({ code, value, index, rgb: rgb(value) })));
function nearestBand(color, family) {
  const [r, g, b] = rgb(color);
  let nearest, distance = Infinity;
  for (const entry of bandColors) {
    if (family && groupFor(entry.code)?.[1] !== family) continue;
    const [a, c, d] = entry.rgb;
    const delta = 2 * (r - a) ** 2 + 4 * (g - c) ** 2 + 3 * (b - d) ** 2;
    if (delta < distance) { nearest = entry; distance = delta; }
  }
  return nearest;
}

function offsetForColor(color) {
  const exact = bandColors.find(entry => entry.value === color);
  if (exact) return exact.index - 5;
  const special = specials.findIndex(([, value]) => value === color);
  if (special >= 0) return special - 10;
  const gray = grays.findIndex(([, value]) => value === color);
  if (gray >= 0) return gray - 10;
  return hsl(color)[1] < 22 ? 8 : nearestBand(color).index - 5;
}
const tonal = ["#ffffff", "#e3e3e3", "#c6c6c6", "#aaaaaa", "#8d8d8d", "#717171", "#555555", "#383838", "#1c1c1c", "#000000"];
const at = (array, index) => array[(index % array.length + array.length) % array.length];

function Numeric({ label, value, min = 0, max, onCommit, autoFocus }) {
  return <input key={Math.round(value)} type="number" min={min} max={max} defaultValue={Math.round(value)}
    aria-label={label} autoFocus={autoFocus} onBlur={event => {
      const next = Number(event.target.value);
      if (event.target.value !== "" && Number.isFinite(next) && next !== Math.round(value)) onCommit(Math.min(max, Math.max(min, next)));
      else event.target.value = Math.round(value);
    }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />;
}

export function ColorFan({ colors, color, choose: applyColor, openPalettes, sample, close, fillControls }) {
  const { state, set } = colors;
  const [fillMode, setFillMode] = useState("spectrum");
  const mode = fillControls ? fillMode : state.mode;
  const [offset, setOffset] = useState(() => offsetForColor(color));
  const previousColor = useRef(color);
  const internalColor = useRef(null);
  const choose = value => {
    internalColor.current = value;
    return applyColor(value);
  };
  useEffect(() => {
    if (mode === "spectrum" && color !== previousColor.current && color !== internalColor.current) setOffset(offsetForColor(color));
    previousColor.current = color;
    internalColor.current = null;
  }, [color, mode]);
  const [draft, setDraft] = useState(null);
  const [valueEdit, setValueEdit] = useState(null);
  const [authoredHsl, setAuthoredHsl] = useState(null);
  const gesture = useRef(null);
  const animation = useRef(0);
  const pending = useRef(null);
  const rememberedHue = useRef(hsl(color)[0]);
  const currentHSL = authoredHsl?.color === color ? authoredHsl.values : hsl(color, rememberedHue.current);
  if (currentHSL[1] > .1) rememberedHue.current = currentHSL[0];
  const rgbMode = mode === "rgb";
  const activeFamily = groupFor(colorCodes.get(color) || (mode === "spectrum" && currentHSL[1] >= 22 ? nearestBand(color).code : ""))?.[1];
  const values = draft || (rgbMode ? rgb(color) : currentHSL);
  const convert = rgbMode ? hex : fromHsl;
  const channels = rgbMode ? ["R", "G", "B"] : ["H", "S", "L"];
  const maxima = rgbMode ? [255, 255, 255] : [359, 100, 100];
  const tracks = rgbMode ? [[217, 101, 68], [217, 59, 24], [217, 15, -20]]
    : [[216, -20, 101], [259, 24, -20], [259, 101, 49]];
  useEffect(() => () => cancelAnimationFrame(animation.current), []);
  const setMode = next => {
    setDraft(null);
    setValueEdit(null);
    if (next === "spectrum") setOffset(offsetForColor(color));
    if (fillControls) setFillMode(next);
    else set(old => ({ ...old, mode: next }));
  };
  const stepWheel = step => setOffset(old => old + step);
  const stage = (index, next) => {
    const updated = values.map((value, i) => i === index ? next : value);
    if (!rgbMode && index === 0) rememberedHue.current = next;
    return updated;
  };
  const apply = next => {
    const value = convert(next);
    setAuthoredHsl(rgbMode ? null : { color: value, values: next });
    choose(value);
  };
  const colorAt = (index, amount) => {
    if (rgbMode) return hex([0, 0, 0].map((_, i) => i === index ? amount : 0));
    if (index === 0) return fromHsl([amount, 100, 50]);
    if (index === 1) return fromHsl([values[0], amount, 50]);
    return fromHsl([values[0], Math.max(values[1], 45), amount]);
  };
  const angleAt = (event, box) => {
    let angle = Math.atan2((event.clientY - box.top) / box.height * 500 - fanCenter,
      (event.clientX - box.left) / box.width * 500 - fanCenter) * 180 / Math.PI;
    if (angle < -105) angle += 360;
    return angle;
  };
  const pointer = (event, index) => {
    const [, start, end] = tracks[index];
    const fraction = Math.min(1, Math.max(0, (angleAt(event, gesture.current.box) - start) / (end - start)));
    return stage(index, fraction * maxima[index]);
  };
  const tile = (item, slot, radius, width) => {
    const [code, value] = item;
    const a = fanStart + slot * (fanEnd - fanStart) / bandCount;
    const b = a + (fanEnd - fanStart) / bandCount - .22;
    const [x, y] = fanPoint(radius + width * .5, (a + b) / 2);
    const [r, g, blue] = rgb(value);
    return <g key={code + "-" + slot + "-" + radius}>
      <path className="copic-tile" d={fanWedge(radius, radius + width, a, b)}
        fill={value} data-copic={code} data-color={value} aria-label={`${code} ${value}`}
        stroke={value === color ? "#222823" : "none"} strokeWidth={1.5}><title>{code} · {value.toUpperCase()}</title></path>
      <text x={x} y={y} transform={`rotate(${(a + b) / 2},${x},${y})`} className="copic-code" style={{ fontSize: code.length > 4 ? 6.5 : 8 }}
        fill={r * .299 + g * .587 + blue * .114 < 103 ? "#fff" : "#232823"}>{code.replace("-", "")}</text>
    </g>;
  };
  const commit = (index, value) => { setValueEdit(null); setDraft(null); apply(stage(index, value)); };
  const button = (label, angle, run, active, title, radius = 160) => {
    const [x, y] = fanPoint(radius, angle);
    return <button type="button" style={{ left: `${x / 5}%`, top: `${y / 5}%` }} aria-pressed={active}
      title={title || label} aria-label={title || label} onClick={run}>{label}</button>;
  };
  return <div className="studio-color-fan" aria-label={fillControls ? "填充色轮" : "画布色轮"}>
    <svg viewBox="0 0 500 500" className="studio-color-wheel" aria-label={mode === "spectrum" ? "COPIC 色轮" : mode.toUpperCase() + " 色轮"}>
      {mode === "spectrum" ? <g className="copic-paints"
        onWheel={event => { stepWheel(event.deltaY > 0 ? 1 : -1); }}
        onPointerDown={event => {
          const color = event.target.dataset.color;
          if (!color) return;
          const box = event.currentTarget.ownerSVGElement.getBoundingClientRect();
          gesture.current = { box, angle: angleAt(event, box), offset, color, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
          holdColor(event, color, null, () => { gesture.current = null; openPalettes(); });
        }}
        onPointerMove={event => {
          const drag = gesture.current;
          if (!drag || drag.color === undefined) return;
          const delta = Math.round((angleAt(event, drag.box) - drag.angle) / ((fanEnd - fanStart) / bandCount));
          if (!delta && !drag.moved) return;
          drag.moved = true;
          setOffset(drag.offset - delta);
        }}
        onPointerUp={() => {
          const drag = gesture.current;
          gesture.current = null;
          if (drag && !drag.moved) { setAuthoredHsl(null); choose(drag.color); }
        }} onPointerCancel={() => { gesture.current = null; }} onContextMenu={event => event.preventDefault()}>
        {Array.from({ length: bandCount }, (_, i) => tile(at(grays, i + offset), i, 233, 25))}
        {Array.from({ length: bandCount }, (_, i) => {
          const index = ((offset + i) % 23 + 23) % 23;
          const item = index < specials.length ? specials[index] : tonal[index - specials.length] && ["", tonal[index - specials.length]];
          return item ? tile(item, i, 199, 24) : null;
        })}
        {Array.from({ length: bandCount }, (_, i) => at(bands, offset + i).map((item, j) => tile(item, i, 263 + 22 * j, 22)))}
      </g> : tracks.map(([radius, start, end], index) => {
        const steps = !rgbMode && index === 0 ? 64 : 26;
        const lower = Math.min(start, end), upper = Math.max(start, end);
        const position = start + values[index] / maxima[index] * (end - start);
        const [x, y] = fanPoint(radius, position);
        const [tx, ty] = fanPoint(radius + 19, position);
        const label = channels[index] + " 色值";
        return <g key={index}>
          {Array.from({ length: steps }, (_, j) => <path key={j} className="color-track"
            d={fanArc(radius, lower + j * (upper - lower) / steps, lower + (j + 1.08) * (upper - lower) / steps)}
            stroke={colorAt(index, (start < end ? (j + .5) / steps : 1 - (j + .5) / steps) * maxima[index])} />)}
          <circle cx={x} cy={y} r="6.5" fill={colorAt(index, values[index])} stroke="white" strokeWidth="2" className="color-arc-knob" />
          <path d={fanArc(radius, lower, upper)} className="color-arc-hit" strokeWidth="21" fill="none" stroke="transparent"
            onPointerDown={event => {
              event.currentTarget.setPointerCapture(event.pointerId);
              gesture.current = { index, box: event.currentTarget.ownerSVGElement.getBoundingClientRect() };
              setDraft(pointer(event, index));
            }} onPointerMove={event => {
              if (gesture.current?.index !== index) return;
              pending.current = pointer(event, index);
              if (!animation.current) animation.current = requestAnimationFrame(() => {
                animation.current = 0;
                if (gesture.current) setDraft(pending.current);
              });
            }} onPointerUp={event => {
              if (gesture.current?.index !== index) return;
              const result = pointer(event, index);
              gesture.current = null;
              cancelAnimationFrame(animation.current);
              animation.current = 0;
              setDraft(null);
              apply(result);
            }} onPointerCancel={() => { gesture.current = null; cancelAnimationFrame(animation.current); animation.current = 0; setDraft(null); }} />
          <foreignObject className="color-fan-value" x={tx - 22} y={ty - 9} width="44" height="24">
            {valueEdit === index ? <Numeric autoFocus label={label} value={values[index]} max={maxima[index]} onCommit={value => commit(index, value)} />
              : <button type="button" aria-label={label} onClick={() => setValueEdit(index)}>{Math.round(values[index])}{rgbMode ? "" : index === 0 ? "°" : "%"}</button>}
          </foreignObject>
        </g>;
      })}
    </svg>
    <div className="color-fan-buttons">
      {button("★", -17, openPalettes, undefined, "颜色菜单与色板")}
      {button("COPIC", 4, () => setMode("spectrum"), mode === "spectrum")}
      {button("HSL", 23, () => setMode("hsl"), mode === "hsl")}
      {button("RGB", 42, () => setMode("rgb"), mode === "rgb")}
      {button("⌖", 61, () => sample(false), undefined, "画布吸色")}
      {button("α", 78, () => sample(true), undefined, "含透明度吸色")}
      {button("×", 94, close, undefined, "关闭色轮")}
    </div>
    {mode === "spectrum" && <div className="copic-families" aria-label="COPIC 色系">
      {familyOrder.map((family, index) => {
        const swatch = codeColors.get(familyChips[index]) || bands.find(band => groupFor(band[0][0])?.[1] === family)[0][1];
        return <button type="button" key={family} style={{ backgroundColor: swatch }} title={familyNames[index] + " · " + family}
          aria-label={familyNames[index] + "色系 " + family} aria-pressed={activeFamily === family} onClick={() => {
            const next = nearestBand(swatch, family);
            setOffset(next.index - 5);
            choose(next.value);
          }} />;
      })}
    </div>}
    {fillControls}
  </div>;
}

function chip(color, choose, extra = {}) {
  return <button type="button" key={color} style={{ "--chip": color }} className="color-chip" title={color.toUpperCase()}
    aria-label={color} onClick={() => choose(color)} {...extra} />;
}
const paletteDrop = "infinite-color-palette-drop";
function holdColor(event, color, source, open) {
  if (event.button !== 0) return;
  const { pointerId, clientX: x, clientY: y, target: origin } = event;
  let dot, target, timer;
  const stop = () => {
    clearTimeout(timer);
    dot?.remove();
    target?.classList.remove("color-drop-hover");
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", finish, true);
    window.removeEventListener("pointercancel", cancel, true);
    window.removeEventListener("keydown", escape, true);
  };
  const move = event => {
    if (event.pointerId !== pointerId) return;
    if (!dot) {
      if (Math.hypot(event.clientX - x, event.clientY - y) > 8) stop();
      return;
    }
    dot.style.left = `${event.clientX}px`;
    dot.style.top = `${event.clientY}px`;
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-color-palette]");
    if (hit === target) return;
    target?.classList.remove("color-drop-hover");
    target = hit;
    target?.classList.add("color-drop-hover");
  };
  const finish = event => {
    if (event.pointerId !== pointerId) return;
    if (dot) {
      move(event);
      const panel = target?.closest(".studio-colors") || (source && document.querySelector(".studio-colors"));
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const outside = source && hit?.closest(".app-shell") && !hit.closest(".studio-colors");
      if (target || outside) panel?.dispatchEvent(new CustomEvent(paletteDrop, { detail: {
        color, source, id: target?.dataset.colorPalette, index: target?.dataset.colorIndex,
      } }));
      event.preventDefault();
      event.stopPropagation();
      const ignoreClick = click => {
        if (!origin.contains(click.target)) return;
        click.preventDefault();
        click.stopImmediatePropagation();
      };
      window.addEventListener("click", ignoreClick, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", ignoreClick, true), 100);
    }
    stop();
  };
  const cancel = event => { if (event.pointerId === pointerId) stop(); };
  const escape = event => { if (event.key === "Escape") stop(); };
  timer = setTimeout(() => {
    dot = document.createElement("span");
    dot.className = "color-drag-dot";
    dot.style.cssText = `left:${x}px;top:${y}px;background:${color}`;
    document.body.append(dot);
    open?.();
  }, 390);
  window.addEventListener("pointermove", move, true);
  window.addEventListener("pointerup", finish, true);
  window.addEventListener("pointercancel", cancel, true);
  window.addEventListener("keydown", escape, true);
}

function interpolate(list, fraction) {
  const at = Math.max(0, Math.min(1, fraction)) * (list.length - 1);
  const a = rgb(list[Math.floor(at)]), b = rgb(list[Math.ceil(at)]);
  return hex(a.map((value, i) => value + (b[i] - value) * (at % 1)));
}

const fullHue = "#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00";
function Spectrum({ label, value, max, stops, choose }) {
  const dragging = useRef(false);
  const set = event => choose(Number(event.currentTarget.value));
  return <input key={Math.round(value)} className="color-value-spectrum" type="range" min="0" max={max}
    aria-label={label} defaultValue={Math.round(value)} style={{ "--spectrum": `linear-gradient(to right,${stops})` }}
    onPointerDown={() => { dragging.current = true; }} onPointerUp={event => { dragging.current = false; set(event); }}
    onPointerCancel={event => { dragging.current = false; event.currentTarget.value = Math.round(value); }}
    onChange={event => { if (!dragging.current) set(event); }} />;
}

function ColorValues({ color, choose, chooseCopic }) {
  const [r, g, b] = rgb(color);
  const [h] = hsl(color);
  const max = Math.max(r, g, b), delta = max - Math.min(r, g, b);
  const hsb = [h, max ? delta / max * 100 : 0, max / 255 * 100];
  const pickedCopic = copic.findIndex(([, value]) => value === color);
  const setRGB = (index, value) => choose(hex([r, g, b].map((channel, i) => i === index ? value : channel)));
  const setHSB = (index, value) => {
    const [h, s, v] = hsb.map((component, i) => i === index ? value : component);
    const l = v * (1 - s / 200);
    const hslS = l === 0 || l === 100 ? 0 : (v - l) / Math.min(l, 100 - l) * 100;
    choose(fromHsl([h, hslS, l]));
  };
  const input = (name, value, update, length) => <input aria-label={name} key={value} defaultValue={value} maxLength={length}
    onBlur={event => { if (!update(event.target.value)) event.target.value = value; }}
    onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />;
  return <div className="color-value-grid">
    <div className="color-value-pill"><label>COPIC {input("COPIC 色号", colorCodes.get(color) || "—", value => {
      const code = value.trim().toUpperCase();
      const match = codeColors.get(code) || codeColors.get(code.replace(/^([CNTW])(\d)/, "$1-$2"));
      if (!match) return false;
      chooseCopic(match);
      return true;
    }, 8)}</label><Spectrum label="COPIC 色谱" value={Math.max(0, pickedCopic)} max={copic.length - 1}
      stops={copic.filter((_, index) => index % 9 === 0).map(([, value]) => value)} choose={index => chooseCopic(copic[index][1])} /></div>
    <div className="color-value-pill color-value-rgb">{[r, g, b].map((value, i) => <div key={i}>
      <label>{"RGB"[i]}<Numeric label={"RGB"[i] + " 色值"} value={value} max={255} onCommit={next => setRGB(i, next)} /></label>
      <Spectrum label={"RGB"[i] + " 色谱"} value={value} max={255} stops={"#000," + ["#f00", "#0f0", "#00f"][i]} choose={next => setRGB(i, next)} />
    </div>)}</div>
    <div className="color-value-pill"><label>HEX {input("HEX 色值", color.toUpperCase(), value => {
      const normalized = hexColor(value);
      if (!normalized) return false;
      choose(normalized);
      return true;
    }, 7)}</label><Spectrum label="HEX 色谱" value={h} max={359} stops={fullHue} choose={next => choose(fromHsl([next, 100, 50]))} /></div>
    <div className="color-value-pill color-value-hsb">{hsb.map((value, i) => <div key={i}>
      <label>{"HSB"[i]}<Numeric label={"HSB"[i] + " 色值"} value={value} max={i ? 100 : 359} onCommit={next => setHSB(i, next)} /></label>
      <Spectrum label={"HSB"[i] + " 色谱"} value={value} max={i ? 100 : 359}
        stops={[fullHue, "#aaa," + fromHsl([h, 100, 50]), "#000," + fromHsl([h, 100, 70])][i]} choose={next => setHSB(i, next)} />
    </div>)}</div>
  </div>;
}

export function QuickColors({ colors, color, choose, active }) {
  const { state, set } = colors;
  const start = useRef(null);
  const timer = useRef(null);
  const preview = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!active || !state.pinned.length) return null;
  const available = state.pinned.some(isDynamic) ? state.palettes.concat(dynamicPalettes(color, state.recent, state.used)) : state.palettes;
  const pinned = available.filter(palette => palette.colors.length && state.pinned.includes(palette.id));
  if (!pinned.length || !active) return null;
  const index = Math.max(0, pinned.findIndex(palette => palette.id === state.current));
  const palette = pinned[index];
  const cycle = delta => set(old => ({ ...old, current: pinned[(index + delta + pinned.length) % pinned.length].id }));
  const position = (x, rect) => Math.min(1, Math.max(0, (x - rect.left) / rect.width));
  const showMix = (x, rect) => {
    const fraction = position(x, rect);
    preview.current.hidden = false;
    preview.current.style.left = `${fraction * 100}%`;
    preview.current.style.background = interpolate(palette.colors, fraction);
  };
  const end = () => { start.current = null; clearTimeout(timer.current); if (preview.current) preview.current.hidden = true; };
  return <div className="color-quick" title={palette.name} aria-label={palette.name}
    onPointerDown={event => {
      if (event.button !== 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      start.current = { x: event.clientX, rect, mixing: false, swiped: false };
      event.currentTarget.setPointerCapture(event.pointerId);
      timer.current = setTimeout(() => {
        if (!start.current || start.current.swiped) return;
        start.current.mixing = true;
        showMix(start.current.x, rect);
      }, 360);
    }}
    onPointerMove={event => {
      if (!start.current) return;
      if (start.current.mixing) showMix(event.clientX, start.current.rect);
      else if (Math.abs(event.clientX - start.current.x) > 14) { start.current.swiped = true; clearTimeout(timer.current); }
    }}
    onPointerUp={event => {
      if (!start.current) return;
      const { x, rect, mixing, swiped } = start.current;
      const fraction = position(event.clientX, rect);
      if (mixing) choose(interpolate(palette.colors, fraction));
      else if (swiped && pinned.length > 1) cycle(event.clientX < x ? 1 : -1);
      else if (!swiped) choose(palette.colors[Math.min(palette.colors.length - 1, Math.floor(fraction * palette.colors.length))]);
      end();
    }}
    onPointerCancel={end} onWheel={event => { if (pinned.length > 1) cycle(event.deltaY > 0 ? 1 : -1); }}>
    {palette.colors.map((color, index) => chip(color, choose, { key: index,
      onClick: event => { if (event.detail === 0) choose(color); },
      onKeyDown: event => { if (pinned.length > 1 && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault(); cycle(event.key === "ArrowLeft" ? -1 : 1);
      } },
    }))}
    <span className="color-mix-preview" ref={preview} hidden aria-hidden="true" />
  </div>;
}

export function ColorPanel({ colors, color, choose, chooseCopic, openWheel }) {
  const { state, set } = colors;
  const [error, setError] = useState("");
  const [mixer, setMixer] = useState(50);
  const [page, setPage] = useState(0);
  const input = useRef(null);
  const panel = useRef(null);
  const handleDrop = useRef(null);
  const palette = state.palettes.find(p => p.id === state.current);
  const dynamic = dynamicPalettes(color, state.recent, state.used);
  const update = (id, fn) => set(old => ({ ...old, palettes: old.palettes.map(p => p.id === id ? fn(p) : p) }));
  const remove = ({ id, index }, value) => update(id, p => p.colors[index] !== value ? p :
    ({ ...p, colors: p.colors.filter((_, i) => i !== index) }));
  const add = (id, value, target, source) => {
    const next = hexColor(value);
    if (!next) return;
    setError("");
    const destination = state.palettes.find(p => p.id === id);
    if (!destination) return;
    if (destination.colors.length >= 8 && target == null && source?.id !== id) { setError("每组色板最多 8 个颜色。"); return; }
    update(id, p => {
      const list = [...p.colors];
      if (source?.id === id && Number.isInteger(source.index) && list[source.index] === next) {
        list.splice(source.index, 1);
        list.splice(target ?? list.length, 0, next);
      } else if (target != null) list[target] = next;
      else if (list.length < 8) list.push(next);
      return { ...p, colors: list };
    });
  };
  handleDrop.current = ({ color, source, id, index }) => {
    if (id) add(id, color, index == null ? null : Number(index), source);
    else if (source) remove(source, color);
  };
  useEffect(() => {
    const element = panel.current;
    const drop = event => handleDrop.current(event.detail);
    element.addEventListener(paletteDrop, drop);
    return () => element.removeEventListener(paletteDrop, drop);
  }, []);
  const newPalette = () => {
    if (state.palettes.length >= 120) { setError("本地色板最多保留 120 组。"); return; }
    const name = window.prompt("色板名称", "新色板")?.trim().slice(0, 50);
    if (!name) return;
    const item = { id: crypto.randomUUID(), name, colors: [color] };
    set(old => ({ ...old, palettes: [...old.palettes, item], current: item.id }));
    setPage(Math.floor(state.palettes.length / 20));
  };
  const exportPalettes = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ type: "infinite-canvas-palettes", version: 1, palettes: state.palettes })],
      { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "无限画布色板.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importPalettes = async event => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 200000) throw new Error();
      const data = JSON.parse(await file.text());
      if (data.type !== "infinite-canvas-palettes") throw new Error();
      const items = clean(data.palettes).map(p => ({ ...p, id: crypto.randomUUID() }));
      if (!items.length) throw new Error();
      if (state.palettes.length + items.length > 120) { setError("导入后将超过 120 组色板，请先整理现有色板。"); return; }
      set(old => ({ ...old, palettes: [...old.palettes, ...items], current: items[0].id }));
      setPage(Math.floor(state.palettes.length / 20));
      setError("");
    } catch { setError("无法读取这份色板文件。"); }
  };
  const mixPosition = mixer / 100 * ((palette?.colors.length || 1) - 1);
  const mixLow = Math.floor(mixPosition), mixHigh = Math.ceil(mixPosition);
  const mixed = palette?.colors.length >= 2 ? hex(rgb(palette.colors[mixLow]).map((value, i) =>
    value + (rgb(palette.colors[mixHigh])[i] - value) * (mixPosition - mixLow))) : null;
  return <div className="studio-colors" ref={panel}>
    <section className="color-current">
      <div className="color-heading"><h3>当前颜色</h3>
        {chip(color, choose, { onPointerDown: event => holdColor(event, color),
          "aria-label": "打开当前色轮", onClick: openWheel })}</div>
      <ColorValues color={color} choose={choose} chooseCopic={chooseCopic} />
    </section>
      <section className="color-saved">
        <div className="color-heading"><h3>我的色板</h3><button type="button" onClick={newPalette}>＋ 新建</button></div>
        <div className="color-palette-grid">{state.palettes.slice(page * 20, (page + 1) * 20).map(p => <button type="button" className="color-palette-card"
          key={p.id} aria-pressed={state.pinned.includes(p.id)} data-color-palette={p.id}
          onDragOver={event => event.preventDefault()} onDrop={event => {
            event.preventDefault(); add(p.id, event.dataTransfer.getData("text/plain"));
          }}
          onContextMenu={event => { event.preventDefault(); set(old => ({ ...old, current: p.id })); }}
          onClick={() => set(old => togglePalette(old, p.id))}>
          <span>{p.colors.map((value, index) => <i key={index} style={{ background: value }} />)}</span><small>{p.name}</small></button>)}</div>
        {state.palettes.length > 20 && <div className="color-links">
          <button type="button" disabled={!page} onClick={() => setPage(page - 1)}>上一页</button>
          <button type="button" disabled={(page + 1) * 20 >= state.palettes.length} onClick={() => setPage(page + 1)}>下一页</button>
        </div>}
        {palette && <div className="color-palette-editor">
          <div className="color-heading"><strong>{palette.name}</strong><button type="button" aria-pressed={state.pinned.includes(palette.id)} onClick={() =>
            set(old => togglePalette(old, palette.id))}>☆ 固定到圆盘</button></div>
          <div className="color-palette-row" data-color-palette={palette.id} onDragOver={event => event.preventDefault()} onDrop={event => {
            event.preventDefault(); add(palette.id, event.dataTransfer.getData("text/plain"));
          }}>
            {palette.colors.map((value, index) => chip(value, choose, { key: index,
              "data-color-palette": palette.id, "data-color-index": index,
              onPointerDown: event => holdColor(event, value, { id: palette.id, index }),
              onDragOver: event => event.preventDefault(),
              onDrop: event => { event.stopPropagation(); event.preventDefault(); add(palette.id, event.dataTransfer.getData("text/plain"), index); },
              onContextMenu: event => { event.preventDefault(); if (window.confirm(`从色板移除 ${value.toUpperCase()}？`))
                remove({ id: palette.id, index }, value); },
            }))}
            <button type="button" aria-label="将当前颜色加入色板" title="加入当前色" onClick={() => add(palette.id, color)}>＋</button>
          </div>
          <div className="color-links"><button type="button" onClick={() => {
            const name = window.prompt("色板名称", palette.name)?.trim().slice(0, 50);
            if (name) update(palette.id, p => ({ ...p, name }));
          }}>重命名</button><button type="button" onClick={() => {
            if (!window.confirm(`删除色板“${palette.name}”？`)) return;
            set(old => ({ ...old, palettes: old.palettes.filter(p => p.id !== palette.id),
              pinned: old.pinned.filter(id => id !== palette.id), current: old.palettes.find(p => p.id !== palette.id)?.id }));
            setPage(value => Math.max(0, Math.min(value, Math.floor((state.palettes.length - 2) / 20))));
          }}>删除色板</button></div>
          {mixed && <label className="color-mixer">色板混合 <input type="range" min="0" max="100" aria-label="混合色比例"
            style={{ "--mix": `linear-gradient(to right,${palette.colors.join(",")})` }}
            value={mixer} onChange={event => setMixer(Number(event.target.value))} />
            {chip(mixed, choose, { "aria-label": "使用混合色" })}</label>}
        </div>}
      </section>
      <section className="color-dynamic"><h3>动态色板</h3><div className="color-dynamic-grid">{dynamic.map(p =>
        <button type="button" className="color-palette-card" key={p.id} aria-pressed={state.pinned.includes(p.id)}
          disabled={!p.colors.length} onClick={() => set(old => togglePalette(old, p.id))}>
          <span>{p.colors.map((value, index) => <i key={index} style={{ background: value }} />)}</span><small>{p.name}</small></button>)}</div>
        <div className="color-links"><button type="button" onClick={() => input.current.click()}>导入色板</button>
          <button type="button" onClick={exportPalettes}>导出色板</button></div>
        <input ref={input} type="file" hidden accept=".json,application/json" onChange={importPalettes} />
      </section>
    {state.recent.length > 0 && <div className="color-recent"><small>最近</small>{state.recent.map(value => chip(value, choose))}</div>}
    {error && <p className="color-error" role="alert">{error}</p>}
  </div>;
}

export function CanvasSampler({ api, request, finish, samplingBackground }) {
  const loupe = useRef(null);
  const sampleBox = useRef(null);
  const held = useRef(false);
  const last = useRef(0);
  const background = useRef(null);
  useEffect(() => {
    const escape = event => { if (event.key === "Escape") finish(null); };
    window.addEventListener("keydown", escape);
    if (request.alpha && api) {
      const value = api.getAppState().viewBackgroundColor;
      const shell = document.querySelector(".canvas-shell");
      const original = shell?.style.backgroundColor;
      background.current = value;
      samplingBackground.current = value;
      if (shell && value !== "transparent") shell.style.backgroundColor = value;
      api.updateScene({ appState: { viewBackgroundColor: "transparent" }, captureUpdate: CaptureUpdateAction.NEVER });
      return () => {
        if (shell) shell.style.backgroundColor = original || "";
        api.updateScene({ appState: { viewBackgroundColor: value }, captureUpdate: CaptureUpdateAction.NEVER });
        samplingBackground.current = null;
        window.removeEventListener("keydown", escape);
      };
    }
    return () => window.removeEventListener("keydown", escape);
  }, []);
  function read(event) {
    const canvas = document.querySelector(".excalidraw canvas.static");
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    const x = Math.floor((event.clientX - bounds.left) * canvas.width / bounds.width);
    const y = Math.floor((event.clientY - bounds.top) * canvas.height / bounds.height);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
    if (!sampleBox.current) {
      const sample = document.createElement("canvas");
      sample.width = sample.height = 1;
      sampleBox.current = sample.getContext("2d", { willReadFrequently: true });
    }
    const context = sampleBox.current;
    try {
      context.clearRect(0, 0, 1, 1);
      context.drawImage(canvas, x, y, 1, 1, 0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      if (request.alpha && !a) return null;
      const backdrop = rgb(hexColor(background.current || api?.getAppState().viewBackgroundColor) || "#ffffff");
      const color = request.alpha ? hex([r, g, b]) : hex([r, g, b].map((component, i) => component * a / 255 + backdrop[i] * (1 - a / 255)));
      return { color,
        ...(request.alpha && { opacity: Math.round(a / 255 * 100) }) };
    } catch { return null; }
  }
  const show = event => {
    const node = loupe.current;
    node.style.left = `${event.clientX}px`; node.style.top = `${event.clientY}px`; node.hidden = false;
    if (performance.now() - last.current < 80) return;
    last.current = performance.now();
    const value = read(event);
    node.style.setProperty("--sample", value?.color || "transparent");
  };
  return createPortal(<div className="canvas-color-sampler" role="presentation"
    onPointerDown={event => { if (event.button !== 0) return; held.current = true; event.currentTarget.setPointerCapture(event.pointerId); show(event); }}
    onPointerMove={show}
    onPointerCancel={() => finish(null)}
    onPointerUp={event => { if (held.current) finish(read(event)); }}>
    <p role="status">{request.alpha ? "在笔迹上吸色并读取透明度 · Esc 取消" : "点击或拖动吸色，松开确认 · Esc 取消"}</p>
    <span className="color-loupe" ref={loupe} hidden style={{ "--old": request.color }} aria-hidden="true"><i>＋</i></span>
  </div>, document.body);
}
