import { CaptureUpdateAction, getCommonBounds, newElementWith } from "@excalidraw/excalidraw";

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function rotatePoint([x, y], [cx, cy], angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos];
}

export function outline(element) {
  const { x, y, width, height, angle } = element;
  const center = [x + width / 2, y + height / 2];
  let points;
  if (element.points?.length) {
    const xs = element.points.map(([px]) => px);
    const ys = element.points.map(([, py]) => py);
    center[0] = x + (Math.min(...xs) + Math.max(...xs)) / 2;
    center[1] = y + (Math.min(...ys) + Math.max(...ys)) / 2;
    points = element.points.map(([px, py]) => [x + px, y + py]);
  } else if (element.type === "ellipse") {
    points = Array.from({ length: 40 }, (_, index) => {
      const theta = index * Math.PI / 20;
      return [center[0] + Math.cos(theta) * width / 2, center[1] + Math.sin(theta) * height / 2];
    });
  } else if (element.type === "diamond") {
    points = [[center[0], y], [x + width, center[1]], [center[0], y + height], [x, center[1]]];
  } else {
    points = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
  }
  return angle ? points.map((point) => rotatePoint(point, center, angle)) : points;
}

function segments(points, closed) {
  const pairs = points.slice(1).map((point, index) => [points[index], point]);
  if (closed && points.length > 1) pairs.push([points.at(-1), points[0]]);
  return pairs;
}

function distanceToSegment([x, y], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? clamp(((x - ax) * dx + (y - ay) * dy) / lengthSquared, 0, 1) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

function inside([x, y], polygon) {
  let contained = false;
  for (const [[ax, ay], [bx, by]] of segments(polygon, true)) {
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) contained = !contained;
  }
  return contained;
}

function crosses(a, b, c, d) {
  const side = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}

export function inLasso(element, polygon, partial) {
  const points = outline(element);
  const vertexMatch = partial ? points.some((point) => inside(point, polygon)) : points.every((point) => inside(point, polygon));
  if (partial && vertexMatch) return true;
  if (!partial && !vertexMatch) return false;
  const boundary = segments(polygon, true);
  const intersects = segments(points, !element.points).some(([a, b]) => boundary.some(([c, d]) => crosses(a, b, c, d)));
  if (!partial) return !intersects;
  return intersects || (!element.points && element.backgroundColor !== "transparent" && inside(polygon[0], points))
    || (["image", "text", "embeddable"].includes(element.type) && inside(polygon[0], points));
}

export function pickElement(elements, point, zoom) {
  return elements.findLast((element) => {
    const points = outline(element);
    const tolerance = 6 / zoom + (element.strokeWidth || 0) / 2;
    const filled = !element.points && (element.backgroundColor !== "transparent" || ["image", "text", "embeddable"].includes(element.type));
    return (filled && inside(point, points))
      || points.some(([x, y]) => Math.hypot(point[0] - x, point[1] - y) <= tolerance)
      || segments(points, !element.points).some(([a, b]) => distanceToSegment(point, a, b) <= tolerance);
  });
}

export function toggleSelected(api, hits, candidates, replace) {
  const state = api.getAppState();
  const selected = new Set(replace ? [] : Object.keys(state.selectedElementIds).filter((id) => state.selectedElementIds[id]));
  const groups = new Map();
  for (const item of candidates) {
    const group = item.groupIds.at(-1);
    if (!group) continue;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item.id);
  }
  const processed = new Set();
  for (const hit of hits) {
    const group = hit.groupIds.at(-1);
    const ids = groups.get(group) || [hit.id];
    const token = group || hit.id;
    if (processed.has(token)) continue;
    processed.add(token);
    const remove = ids.every((id) => selected.has(id));
    ids.forEach((id) => remove ? selected.delete(id) : selected.add(id));
  }
  api.updateScene({
    appState: {
      selectedElementIds: Object.fromEntries([...selected].map((id) => [id, true])),
      selectedGroupIds: Object.fromEntries([...groups].filter(([, ids]) => ids.every((id) => selected.has(id))).map(([id]) => [id, true])),
      editingGroupId: null,
      selectedLinearElement: null,
    },
    captureUpdate: CaptureUpdateAction.EVENTUALLY,
  });
}

export function transformMembers(elements, selectedIds) {
  const ids = new Set(Object.keys(selectedIds).filter((id) => selectedIds[id]));
  for (const element of elements) {
    if (ids.has(element.id)) {
      for (const bound of element.boundElements || []) {
        if (bound.type === "text") ids.add(bound.id);
      }
    }
  }
  return elements.filter((element) => ids.has(element.id) || ids.has(element.frameId));
}

export function canTransform(members, elements, { rotate = false, stretch = false } = {}) {
  if (!members.length || members.some((element) => element.locked || element.elbowed)) return false;
  const ids = new Set(members.map((element) => element.id));
  if (members.some((element) => (rotate && ["frame", "magicframe"].includes(element.type))
    || (stretch && (element.angle || element.type === "text"))
    || (element.containerId && !ids.has(element.containerId))
    || (element.startBinding && !ids.has(element.startBinding.elementId))
    || (element.endBinding && !ids.has(element.endBinding.elementId)))) return false;
  return !elements.some((element) => !ids.has(element.id)
    && (ids.has(element.startBinding?.elementId) || ids.has(element.endBinding?.elementId)));
}

export function canDeform(members) {
  return members.length > 0 && members.every((element) => element.points?.length > 1
    && !element.startBinding && !element.endBinding && !element.boundElements?.length);
}

export function transformSelection(members, { sx = 1, sy = sx, angle = 0, anchor, scaleStroke = true, deform }) {
  const [left, top, right, bottom] = getCommonBounds(members);
  if (deform) {
    const { handle, dx, dy, skew } = deform;
    return new Map(members.map((element) => {
      const warped = outline(element).map(([x, y]) => {
        const u = clamp((x - left) / Math.max(1, right - left), 0, 1);
        const v = clamp((y - top) / Math.max(1, bottom - top), 0, 1);
        const across = handle.endsWith("w") ? 1 - u : u;
        const down = handle.startsWith("n") ? 1 - v : v;
        return skew ? [x + dx * down, y] : [x + dx * across * down, y + dy * across * down];
      });
      const [x, y] = warped[0];
      const points = warped.map(([px, py]) => [px - x, py - y]);
      const xs = points.map(([px]) => px);
      const ys = points.map(([, py]) => py);
      return [element.id, newElementWith(element, {
        x, y, points, angle: 0, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys),
      })];
    }));
  }
  const center = anchor || [(left + right) / 2, (top + bottom) / 2];
  const transform = ([x, y]) => rotatePoint([center[0] + (x - center[0]) * sx, center[1] + (y - center[1]) * sy], center, angle);
  return new Map(members.map((element) => {
    const { x, y, width, height } = element;
    let pivot = [x + width / 2, y + height / 2];
    if (element.points?.length) {
      const xs = element.points.map(([px]) => px);
      const ys = element.points.map(([, py]) => py);
      pivot = [x + (Math.min(...xs) + Math.max(...xs)) / 2, y + (Math.min(...ys) + Math.max(...ys)) / 2];
    }
    const [cx, cy] = transform(pivot);
    const changes = {
      x: cx + (x - pivot[0]) * sx,
      y: cy + (y - pivot[1]) * sy,
      width: width * sx,
      height: height * sy,
      angle: (element.angle + angle + Math.PI * 2) % (Math.PI * 2),
    };
    if (element.points) changes.points = element.points.map(([px, py]) => [px * sx, py * sy]);
    if (scaleStroke && sx !== 1) changes.strokeWidth = clamp(element.strokeWidth * sx, 0.25, 100);
    if (element.type === "text") changes.fontSize = element.fontSize * sx;
    if (element.startBinding) changes.startBinding = { ...element.startBinding, gap: element.startBinding.gap * sx };
    if (element.endBinding) changes.endBinding = { ...element.endBinding, gap: element.endBinding.gap * sx };
    return [element.id, newElementWith(element, changes)];
  }));
}
