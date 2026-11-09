import React, { useId } from "react";
import { guideDirection } from "./model-study.js";

export default function ModelGuideOverlay({ guide, viewport }) {
  const clip = useId();
  if (!guide || !viewport) return null;
  const { zoom, scrollX, scrollY, offsetLeft, offsetTop } = viewport;
  const { rect, points } = guide;
  const screen = ({ x, y }) => ({ x: (x + scrollX) * zoom + offsetLeft, y: (y + scrollY) * zoom + offsetTop });
  const origin = screen(rect);
  const length = Math.hypot(rect.width, rect.height);
  const line = (start, end, key, className) => {
    const a = screen(start), b = screen(end);
    return <line key={key} className={className} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
  };
  const rays = points.slice(0, 2).flatMap((point, index) =>
    [0.1, 0.28, 0.46, 0.64, 0.82, 0.98].map((f, i) => {
      const start = { x: rect.x + rect.width * f, y: rect.y + rect.height * (index === 0 ? 0.93 : 0.07) };
      const dir = guideDirection(point, start);
      return dir && line({ x: start.x - dir.x * length, y: start.y - dir.y * length },
        { x: start.x + dir.x * length, y: start.y + dir.y * length }, index + "-" + i, index ? "model-guide-z" : "model-guide-x");
    }));
  const [[ax, ay, aw], [bx, by, bw]] = points;
  const nx = ay * bw - aw * by, ny = aw * bx - ax * bw, c = ax * by - ay * bx;
  let horizon = null;
  if (Math.abs(ny) > Math.abs(nx)) {
    const x1 = rect.x, x2 = rect.x + rect.width;
    horizon = line({ x: x1, y: -(nx * x1 + c) / ny }, { x: x2, y: -(nx * x2 + c) / ny }, "h", "model-guide-horizon");
  } else if (Math.abs(nx) > 1e-9) {
    const y1 = rect.y, y2 = rect.y + rect.height;
    horizon = line({ x: -(ny * y1 + c) / nx, y: y1 }, { x: -(ny * y2 + c) / nx, y: y2 }, "h", "model-guide-horizon");
  }
  return <svg className="model-guide-overlay" aria-hidden="true">
    <defs><clipPath id={clip}><rect x={origin.x} y={origin.y} width={rect.width * zoom} height={rect.height * zoom} /></clipPath></defs>
    <g clipPath={`url(#${clip})`}>
      {rays}{horizon}
      {points.slice(0, 2).map(([x, y, w], i) => {
        if (Math.abs(w) < 1e-6) return null;
        const position = screen({ x: x / w, y: y / w });
        return <circle key={i} cx={position.x} cy={position.y} r={4} />;
      })}
    </g>
  </svg>;
}
