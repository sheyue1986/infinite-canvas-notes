const modifier = /^(?:Alt|AltGraph|Control|Meta|Shift|OS|Super|Hyper|Fn|FnLock|CapsLock|NumLock|ScrollLock)(?:Left|Right)?$/i;

export function isModifierKey(event) {
  return modifier.test(event.key) || modifier.test(event.code);
}

export function isPrecisionShortcut(command) {
  return command.group === "precision" || command.id === "stats";
}

export function validCanvasShortcut(command, chord) {
  return typeof chord === "string" &&
    (!isPrecisionShortcut(command) || (!chord.includes("+") && !modifier.test(chord)));
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function distanceToSegment(point, start, end) {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const squared = dx * dx + dy * dy;
  if (!squared) return distance(point, start);
  const along = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / squared));
  return distance(point, [start[0] + along * dx, start[1] + along * dy]);
}

function averageError(points, outline) {
  const segments = outline.slice(1).map((end, index) => [outline[index], end]);
  return points.reduce((error, point) => error + Math.min(...segments.map(segment => distanceToSegment(point, ...segment))), 0) / points.length;
}

function arrowTip(points, start, size) {
  const index = points.reduce((best, point, index) => distance(start, point) > distance(start, points[best]) ? index : best, 0);
  if (index < 2 || index > points.length - 4) return null;
  const tip = points[index];
  const length = distance(start, tip);
  if (length < size * .75 || averageError(points.slice(0, index + 1), [start, tip]) > length * .06) return null;
  const dx = (tip[0] - start[0]) / length, dy = (tip[1] - start[1]) / length;
  let left = false, right = false;
  for (const point of points.slice(index + 1)) {
    const x = point[0] - tip[0], y = point[1] - tip[1];
    if (Math.hypot(x, y) > length * .48) return null;
    const side = (dx * y - dy * x) / length;
    const back = -(x * dx + y * dy) / length;
    if (back > .035 && side > .055) left = true;
    if (back > .035 && side < -.055) right = true;
  }
  return left && right ? tip : null;
}

export function recognizeDrawing(points) {
  if (points.length < 3) return null;
  const stride = Math.max(1, Math.floor(points.length / 80));
  const sample = points.filter((_, index) => index % stride === 0 || index === points.length - 1);
  const [left, right, top, bottom] = sample.reduce(([l, r, t, b], [x, y]) =>
    [Math.min(l, x), Math.max(r, x), Math.min(t, y), Math.max(b, y)], [Infinity, -Infinity, Infinity, -Infinity]);
  const width = right - left, height = bottom - top;
  const size = Math.hypot(width, height);
  if (size < 12) return null;
  const start = sample[0], end = sample.at(-1);
  const line = (type, point) => ({
    type, x: start[0], y: start[1], points: [[0, 0], [point[0] - start[0], point[1] - start[1]]],
    ...(type === "arrow" && { endArrowhead: "arrow" }),
  });
  const tip = arrowTip(sample, start, size);
  if (tip) return line("arrow", tip);
  const gap = distance(start, end);
  if (gap > size * .65 && averageError(sample, [start, end]) < size * .06) return line("line", end);
  if (gap > size * .25 || Math.min(width, height) < 7) return null;
  const x = (left + right) / 2, y = (top + bottom) / 2;
  const outlines = {
    rectangle: [[left, top], [right, top], [right, bottom], [left, bottom], [left, top]],
    diamond: [[x, top], [right, y], [x, bottom], [left, y], [x, top]],
    ellipse: Array.from({ length: 49 }, (_, index) => {
      const angle = index * Math.PI / 24;
      return [x + width / 2 * Math.cos(angle), y + height / 2 * Math.sin(angle)];
    }),
  };
  const candidates = Object.entries(outlines)
    .map(([type, outline]) => ({ type, error: averageError(sample, outline) }))
    .sort((a, b) => a.error - b.error);
  const best = candidates[0];
  return best.error < size * .085 ? { type: best.type, x: left, y: top, width, height } : null;
}

export function convertRecognizedDrawing(api, stroke, geometry, convert, capture) {
  if (!api || !geometry || stroke.type !== "freedraw" || stroke.isDeleted) return false;
  const [shape] = convert([{
    ...geometry, id: stroke.id, strokeColor: stroke.strokeColor, strokeWidth: stroke.strokeWidth,
    opacity: stroke.opacity, roughness: 0, fillStyle: stroke.fillStyle, strokeStyle: stroke.strokeStyle,
    backgroundColor: stroke.backgroundColor, roundness: null,
  }], { regenerateIds: false });
  if (!shape || shape.id !== stroke.id) return false;
  const elements = api.getSceneElementsIncludingDeleted().map(element => element.id === stroke.id ? {
    ...shape, index: stroke.index, frameId: stroke.frameId, groupIds: stroke.groupIds,
    version: stroke.version + 1, customData: stroke.customData, updated: Date.now(),
  } : element);
  api.updateScene({ elements, captureUpdate: capture });
  return true;
}
