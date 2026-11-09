export const fillableShapes = new Set(["rectangle", "ellipse", "diamond"]);
export const supportsClosedFill = type => fillableShapes.has(type) || type === "line" || type === "freedraw";
export const defaultFill = { fillColor: "#ffffff", fillOpacity: 0 };

// Match the closure tolerance used by Excalidraw 0.18.1 for lines and free draw.
export function isClosedOutline(points) {
  if (!points || points.length < 3) return false;
  const [x, y] = points[0], [endX, endY] = points.at(-1);
  return Math.hypot(endX - x, endY - y) <= 8;
}

export function fillPaint({ fillColor, fillOpacity }) {
  if (!/^#[a-f0-9]{6}$/i.test(fillColor) || !Number.isFinite(fillOpacity) || fillOpacity <= 0) return "transparent";
  if (fillOpacity >= 100) return fillColor;
  const alpha = Math.round(fillOpacity * 255 / 100).toString(16).padStart(2, "0");
  return fillColor + alpha;
}

export function readFillPaint(color, fallback = defaultFill.fillColor) {
  if (!color || color === "transparent") return { fillColor: fallback, fillOpacity: 0 };
  const short = /^#([a-f0-9]{3,4})$/i.exec(color);
  const expanded = short ? "#" + [...short[1]].map(c => c + c).join("") : color;
  const hex = /^(#[a-f0-9]{6})([a-f0-9]{2})?$/i.exec(expanded);
  const rgba = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i.exec(color);
  if (rgba) {
    return {
      fillColor: "#" + rgba.slice(1, 4).map(channel => Math.min(255, Number(channel)).toString(16).padStart(2, "0")).join(""),
      fillOpacity: Math.round(Math.min(1, Number(rgba[4] ?? 1)) * 100),
    };
  }
  return {
    fillColor: hex?.[1].toLowerCase() ?? fallback,
    fillOpacity: hex?.[2] ? Math.round(parseInt(hex[2], 16) * 100 / 255) : 100,
  };
}
