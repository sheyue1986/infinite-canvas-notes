const scaleFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 4 });

export function mapScaleBar(metersPerPoint, maxPoints) {
  const limit = metersPerPoint * maxPoints;
  if (!(limit > 0 && Number.isFinite(limit))) return null;
  const power = 10 ** Math.floor(Math.log10(limit));
  const meters = ([5, 2, 1].find(n => n * power <= limit) ?? 0.5) * power;
  const label = meters >= 1000 ? scaleFormat.format(meters / 1000) + " km"
    : meters < 1 ? scaleFormat.format(meters * 100) + " cm" : scaleFormat.format(meters) + " m";
  return { meters, points: meters / metersPerPoint, label };
}

export function decorateMap(canvas, { width, height, metersPerPoint, credits, north = 0, embeddedAttribution = false }) {
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(canvas.width / width, canvas.height / height);
  const size = Math.min(1, width / 240, height / 180);
  ctx.scale(size, size);
  const bottom = height / size;
  const left = 15, y = bottom - (credits ? 32 : 16);
  const scale = mapScaleBar(metersPerPoint * size, 112);
  const outlined = (path, thickness = 1.6) => {
    ctx.beginPath();
    path();
    ctx.lineWidth = thickness + 2;
    ctx.strokeStyle = "rgba(25,27,29,.64)";
    ctx.stroke();
    ctx.lineWidth = thickness;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  };
  const label = (text, x, y, align = "left") => {
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textAlign = align;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(25,27,29,.72)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, x, y);
  };
  ctx.save();
  ctx.translate(left + 23, y - 46);
  ctx.rotate(north * Math.PI / 180);
  outlined(() => {
    ctx.arc(0, 0, 20, 0, 2 * Math.PI);
    ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
    ctx.moveTo(0, 20); ctx.lineTo(0, -20);
  });
  outlined(() => { ctx.moveTo(0, 0); ctx.lineTo(0, -20); }, 2.8);
  ctx.restore();
  const angle = north * Math.PI / 180;
  label("N", left + 23 + 27 * Math.sin(angle), y - 42 - 27 * Math.cos(angle), "center");
  if (scale) {
    const end = left + scale.points;
    outlined(() => {
      ctx.moveTo(left, y - 5); ctx.lineTo(left, y);
      for (let i = 1; i <= 4; i++) {
        ctx.lineTo(left + scale.points * i / 4, y);
        if (i < 4) {
          ctx.lineTo(left + scale.points * i / 4, y - 4);
          ctx.lineTo(left + scale.points * i / 4, y);
        }
      }
      ctx.lineTo(end, y - 5);
    });
    label("0", left, y - 8);
    label(scale.label, end, y - 8, "right");
  }
  ctx.restore();
  if (credits && !embeddedAttribution) {
    ctx.save();
    ctx.scale(canvas.width / width, canvas.height / height);
    ctx.font = "11px system-ui, sans-serif";
    ctx.font = `${Math.min(11, 11 * Math.max(1, width - 14) / ctx.measureText(credits).width)}px system-ui, sans-serif`;
    const footer = ctx.measureText(credits).width + 14;
    const x = Math.max(0, width - footer);
    ctx.fillStyle = "#fffffff0";
    ctx.fillRect(x, height - 19, footer, 19);
    ctx.fillStyle = "#20232a";
    ctx.fillText(credits, x + 7, height - 6);
    ctx.restore();
  }
}
