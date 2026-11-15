function strokeExtent(points) {
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const [x, y] of points) {
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return Math.hypot(right - left, bottom - top);
}

export function applyPrecisionStroke(stroke, settings, held, mutate, zoom, project, release) {
  if (stroke.points.length < 2) return;
  const first = stroke.points[0];
  const last = stroke.points.at(-1);
  const [endX, endY] = release ? [release.x - stroke.x, release.y - stroke.y] : last;
  const gap = Math.hypot(endX - first[0], endY - first[1]);
  const extent = strokeExtent(stroke.points);
  const closureDistance = Math.min(8 / zoom, extent / 4);
  const closed = stroke.points.length >= 4 && gap <= closureDistance;
  const sampleGap = Math.hypot(last[0] - first[0], last[1] - first[1]);
  const needsClosingPoint = closed && sampleGap > closureDistance;
  const points = closed && sampleGap ? [...stroke.points.slice(0, needsClosingPoint ? undefined : -1), first] : stroke.points;
  const extraPressure = needsClosingPoint && !stroke.simulatePressure
    ? { pressures: [...stroke.pressures, stroke.pressures.at(-1) ?? .5] } : null;
  let updates = points === stroke.points ? null : { points, lastCommittedPoint: first };

  if (closed) {
    // An open guide or single grid axis cannot preserve a closed outline.
    settings = { ...settings, alignGrid: false,
      guide: settings.guide && (settings.guideType === "rect" || settings.guideType === "ellipse") };
  }
  project({ ...stroke, points }, settings, held, (_, projected) => {
    const projectedExtent = strokeExtent(projected.points);
    if (Number.isFinite(projectedExtent) && projectedExtent >= Math.min(extent, 1 / zoom)) updates = projected;
  });
  if (updates) mutate(stroke, { ...updates, ...extraPressure });
}
