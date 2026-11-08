import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";

const length = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function pointsInScene(element) {
  const { points, angle, x, y } = element;
  if (!angle) return points.map(([dx, dy]) => [x + dx, y + dy]);
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const [dx, dy] of points) {
    left = Math.min(left, dx); right = Math.max(right, dx);
    top = Math.min(top, dy); bottom = Math.max(bottom, dy);
  }
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  const c = Math.cos(angle), s = Math.sin(angle);
  return points.map(([dx, dy]) => [x + cx + (dx - cx) * c - (dy - cy) * s, y + cy + (dx - cx) * s + (dy - cy) * c]);
}

function segmentDistance(point, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], squared = dx * dx + dy * dy;
  const t = squared ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / squared)) : 0;
  return Math.hypot(point[0] - a[0] - dx * t, point[1] - a[1] - dy * t);
}

function interpolateSamples(points, element, radius) {
  const result = [points[0]], pressures = [element.pressures?.[0] ?? .5];
  const total = points.reduce((sum, point, i) => i ? sum + length(point, points[i - 1]) : sum, 0);
  const step = Math.max(radius / 4, total / 1500, .5);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], count = Math.max(1, Math.ceil(length(a, b) / step));
    const start = element.pressures?.[i - 1] ?? .5, end = element.pressures?.[i] ?? .5;
    for (let k = 1; k <= count; k++) {
      const t = k / count;
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      pressures.push(start + (end - start) * t);
    }
  }
  return { points: result, pressures };
}

export function createNudge(apiRef, cursor, preview) {
  let gesture, frame = 0;
  const positionCursor = (event, radius) => {
    if (!cursor.current) return;
    cursor.current.hidden = false;
    cursor.current.style.transform = `translate(${event.clientX - radius}px,${event.clientY - radius}px)`;
    cursor.current.style.width = cursor.current.style.height = 2 * radius + "px";
  };
  const clear = () => {
    cancelAnimationFrame(frame); frame = 0; gesture = null;
    preview.current?.removeAttribute("d");
  };
  const start = (event, radius) => {
    clear();
    const api = apiRef.current;
    if (!api) return;
    const state = api.getAppState(), zoom = state.zoom.value;
    const world = ({ clientX, clientY }) => [(clientX - state.offsetLeft) / zoom - state.scrollX, (clientY - state.offsetTop) / zoom - state.scrollY];
    const point = world(event), reach = radius / zoom;
    let closest = reach, hit, points;
    for (const element of api.getSceneElements().slice().reverse()) {
      if (element.locked || element.isDeleted || !element.opacity ||
          (element.type !== "freedraw" && (element.type !== "line" || element.startBinding || element.endBinding || element.boundElements?.length)) ||
          element.points.length < 2) continue;
      const pad = Math.hypot(element.width, element.height) + reach;
      if (Math.abs(point[0] - element.x) > pad || Math.abs(point[1] - element.y) > pad) continue;
      const path = pointsInScene(element);
      for (let i = 1; i < path.length; i++) {
        const d = segmentDistance(point, path[i - 1], path[i]);
        if (d < closest) { closest = d; hit = element; points = path; }
      }
    }
    if (!hit) return;
    const samples = interpolateSamples(points, hit, reach);
    gesture = { id: event.pointerId, api, hit, world, reach, state, previous: point, ...samples, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event, radius) => {
    positionCursor(event, radius);
    const item = gesture;
    if (!item || item.id !== event.pointerId) return;
    const point = item.world(event), [x, y] = item.previous;
    const dx = point[0] - x, dy = point[1] - y;
    if (!dx && !dy) return;
    for (const p of item.points) {
      const t = 1 - Math.hypot(p[0] - x, p[1] - y) / item.reach;
      if (t <= 0) continue;
      const weight = t * t * (3 - 2 * t);
      p[0] += dx * weight;
      p[1] += dy * weight;
      item.moved = true;
    }
    item.previous = point;
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      const { zoom, scrollX, scrollY, offsetLeft, offsetTop } = item.state;
      preview.current?.setAttribute("d", item.points.map(([x, y], i) => (i ? "L" : "M") +
        Math.round((x + scrollX) * zoom.value + offsetLeft) + " " + Math.round((y + scrollY) * zoom.value + offsetTop)).join(""));
    });
  };
  const end = event => {
    const item = gesture;
    if (!item || item.id !== event.pointerId) return;
    clear();
    if (!item.moved || item.api !== apiRef.current) return;
    const elements = item.api.getSceneElementsIncludingDeleted();
    if (!elements.some(element => element === item.hit && !element.isDeleted && !element.locked)) return;
    const [x, y] = item.points[0];
    const points = item.points.map(([px, py]) => [px - x, py - y]);
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const [px, py] of points) {
      left = Math.min(left, px); right = Math.max(right, px);
      top = Math.min(top, py); bottom = Math.max(bottom, py);
    }
    const changed = newElementWith(item.hit, {
      x, y, angle: 0, width: right - left, height: bottom - top, points, lastCommittedPoint: points.at(-1),
      ...(item.hit.type === "freedraw" && !item.hit.simulatePressure && { pressures: item.pressures }),
    });
    item.api.updateScene({ elements: elements.map(element => element === item.hit ? changed : element), captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  };
  return { start, move, end, cancel: clear, leave: () => { if (cursor.current) cursor.current.hidden = true; } };
}
