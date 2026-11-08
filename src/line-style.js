export const defaultDashDensity = 45;

export function dashPattern(width, density, unit = 4.25) {
  const thickness = Math.max(1, width * unit);
  const t = Math.max(0, Math.min(100, Number.isFinite(density) ? density : defaultDashDensity)) / 100;
  return [thickness * (3.5 - 2.45 * t), thickness * (2.35 - 1.18 * t)];
}

export function splitStrokeDashes(points, width, density) {
  if (points.length < 2) return [points];
  let [dash, gap] = dashPattern(width, density);
  const total = points.reduce((sum, point, i) => i ? sum + Math.hypot(point[0] - points[i - 1][0], point[1] - points[i - 1][1]) : 0, 0);
  const scale = Math.max(1, total / (900 * (dash + gap)));
  dash *= scale; gap *= scale;
  const result = [];
  let visible = true, remaining = dash, segment = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!length) continue;
    let used = 0;
    while (remaining < length - used - 1e-6) {
      used += remaining;
      const t = used / length;
      const point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      if (a.length > 2) point.push((a[2] ?? .5) + ((b[2] ?? .5) - (a[2] ?? .5)) * t);
      if (visible) { segment.push(point); result.push(segment); }
      visible = !visible;
      segment = visible ? [point] : [];
      remaining = visible ? dash : gap;
    }
    remaining = Math.max(0, remaining - (length - used));
    if (visible) segment.push(b);
  }
  if (visible && segment.length > 1) result.push(segment);
  return result.length ? result : [points];
}
