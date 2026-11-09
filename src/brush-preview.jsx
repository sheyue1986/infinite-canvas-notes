import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getStroke } from "perfect-freehand";
import { brushControlValue, vectorBrushStroke } from "./brush-response.js";
import { renderPaintPreview } from "./paint-engine.js";
import { splitStrokeDashes } from "./line-style.js";

const width = 312;
const height = 104;
const scale = 2;
const demo = Array.from({ length: 45 }, (_, index) => {
  const t = index / 44;
  return { x: 19 + t ** 1.45 * 274, y: 61 + Math.cos(t * 15) * 13 - t * 19,
    p: .12 + Math.sin(t * Math.PI) * .82, tilt: t * .45, angle: t * 2 };
});

export function BrushPreview({ pen, zh }) {
  const canvas = useRef(null);
  const drawing = useRef(null);
  const [texture, setTexture] = useState(null);
  useEffect(() => {
    if (!pen.texture) return;
    const mask = new Image();
    mask.onload = () => setTexture({ source: pen.texture, mask });
    mask.src = pen.texture;
    return () => { mask.onload = null; };
  }, [pen.texture]);

  const render = () => {
    const ctx = canvas.current.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width * scale, height * scale);
    const { samples, pointerType } = drawing.current ?? { samples: demo, pointerType: "pen" };
    if (samples === demo) {
      const scatter = pen.engine ? brushControlValue(pen, "scatter") / 100 : 0;
      const zoom = Math.min(1, 6 / (pen.width * (1 + scatter)));
      ctx.translate(width * scale * (1 - zoom) / 2, height * scale * (1 - zoom) / 2);
      ctx.scale(zoom, zoom);
    }
    if (pen.engine) {
      renderPaintPreview(ctx, pen, samples, pen.texture === texture?.source ? texture?.mask : null, scale);
      return;
    }
    const stroke = vectorBrushStroke(samples.map(p => [p.x, p.y]), samples.map(p => p.p), pen, pointerType, pen.width);
    const points = stroke.points.map(([x, y], i) => [x, y, stroke.pressures[i] ?? .5]);
    const segments = pen.strokeStyle === "dashed" ? splitStrokeDashes(points, pen.width, pen.dashDensity) : [points];
    ctx.scale(scale, scale);
    ctx.fillStyle = pen.color;
    ctx.beginPath();
    for (const segment of segments) {
      const outline = getStroke(segment, {
        size: pen.width * 4.25, thinning: .6, smoothing: .5, streamline: .5,
        simulatePressure: false, easing: t => Math.sin(t * Math.PI / 2), last: true,
      });
      if (!outline.length) continue;
      ctx.moveTo(...outline[0]);
      for (const point of outline.slice(1)) ctx.lineTo(...point);
      ctx.closePath();
    }
    ctx.fill();
  };
  useLayoutEffect(render);

  const point = (event, box) => ({
    x: (event.clientX - box.left) * width / box.width,
    y: (event.clientY - box.top) * height / box.height,
    p: event.pointerType === "pen" ? Math.max(.04, event.pressure) : pen.engine ? .6 : .5,
    tilt: Math.min(1, Math.hypot(event.tiltX || 0, event.tiltY || 0) / 75),
    angle: Math.atan2(event.tiltY || 0, event.tiltX || 0),
  });
  const finish = event => {
    if (drawing.current?.pointer === event.pointerId) drawing.current.pointer = null;
  };
  return <div className="brush-preview"><canvas ref={canvas} width={width * scale} height={height * scale}
    style={{ opacity: pen.opacity / 100 }} aria-label={zh ? "在这里试画笔刷" : "Try the brush here"}
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      const box = event.currentTarget.getBoundingClientRect();
      event.currentTarget.setPointerCapture(event.pointerId);
      drawing.current = { box, samples: [point(event, box)], pointer: event.pointerId, pointerType: event.pointerType };
      render();
    }} onPointerMove={event => {
      const stroke = drawing.current;
      if (!stroke || stroke.pointer !== event.pointerId || stroke.samples.length >= 400) return;
      stroke.samples.push(point(event, stroke.box));
      render();
    }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} /></div>;
}
