// The native line tool commits its trailing preview point on pointer-down.
// Touch and some pen inputs can arrive without a preceding hover update.
export function updateLineVertex(event, state, point, mutate) {
  const line = state.multiElement;
  if (line?.type !== "line" || state.activeTool.type !== "line" || event.button !== 0 || !event.isPrimary) return;
  const { points, lastCommittedPoint } = line;
  const committed = points.slice(0, Math.max(1, points.indexOf(lastCommittedPoint) + 1));
  const first = committed[0];
  if (!first) return;
  const last = committed.at(-1);
  let vertex = [point.x - line.x, point.y - line.y];

  if (committed.length >= 3 && Math.hypot(vertex[0] - first[0], vertex[1] - first[1]) <= 8 / state.zoom.value) {
    vertex = first;
  } else if (Math.hypot(vertex[0] - last[0], vertex[1] - last[1]) < 8) {
    if (lastCommittedPoint && committed.length !== points.length) mutate(line, { points: committed }, false);
    return;
  } else if (event.shiftKey) {
    const dx = vertex[0] - last[0], dy = vertex[1] - last[1];
    const step = Math.PI / 12;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const distance = dx * cos + dy * sin;
    vertex = [last[0] + distance * cos, last[1] + distance * sin];
  }

  mutate(line, { points: [...committed, vertex] }, false);
}
