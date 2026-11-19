const nativeShapes = new Set(["rectangle", "ellipse", "diamond"]);
const polygonPreference = "infinite-canvas-polygon-sides";
export const basicShapeTools = [
  { id: "triangle", name: "三角形", en: "Triangle", type: "rectangle", mark: "triangle" },
  { id: "polygon", name: "多边形", en: "Polygon", type: "rectangle", mark: "polygon" },
  { id: "speechBubble", name: "漫画对话气泡", en: "Speech bubble", type: "rectangle", mark: "speechBubble" },
  { id: "cloud", name: "云形", en: "Cloud", type: "rectangle", mark: "cloud" },
];
export const basicShapeIcons = {
  rectangle: "M2.5 4.5h15v11h-15Z",
  ellipse: "M18 10a8 6 0 1 1-16 0 8 6 0 1 1 16 0Z",
  diamond: "m10 2 8 8-8 8-8-8Z",
  triangle: "M10 3 18 17H2Z",
  polygon: "M6 3h8l4 7-4 7H6l-4-7Z",
  speechBubble: "M17 9c0 3-3 5-7 5l-5 3 1-4C0 10 3 4 10 4c4 0 7 2 7 5Z",
  cloud: "M5 15a3 3 0 0 1-.6-5.9 4 4 0 0 1 7-3.4 3 3 0 0 1 4.8 2.9A3.3 3.3 0 0 1 15 15Z",
};
const customShapes = new Set(basicShapeTools.map(tool => tool.id));
export const shapeChoices = [
  ["rectangle", "矩形", "Rectangle"], ["ellipse", "椭圆", "Ellipse"], ["diamond", "菱形", "Diamond"],
  ...basicShapeTools.map(({ id, name, en }) => [id, name, en]),
];
export const shapeCommands = Object.fromEntries(shapeChoices.map(([id]) => ["shapeTo" + id[0].toUpperCase() + id.slice(1), id]));
export const shapeCommandRows = [["changeBasicShape", "打开更换形状", "Open change shape"], ...shapeChoices.map(([id, zh, en]) => [
  "shapeTo" + id[0].toUpperCase() + id.slice(1), "转为" + zh, "Convert to " + en,
])];

export const validPolygonSides = value => Number.isInteger(value) && value >= 3 && value <= 32;
export function polygonSides() {
  try {
    const value = Number(localStorage.getItem(polygonPreference));
    if (validPolygonSides(value)) return value;
  } catch { /* Optional preference. */ }
  return 6;
}
export function savePolygonSides(value) {
  if (!validPolygonSides(value)) return;
  try { localStorage.setItem(polygonPreference, String(value)); } catch { /* Optional preference. */ }
}

function unitOutline(shape, sides) {
  if (shape === "triangle" || shape === "polygon") {
    const count = shape === "triangle" ? 3 : sides;
    return Array.from({ length: count }, (_, index) => {
      const angle = index * 2 * Math.PI / count - Math.PI / 2;
      return [Math.cos(angle), Math.sin(angle)];
    });
  }
  if (shape === "speechBubble") {
    const points = Array.from({ length: 48 }, (_, index) => {
      const angle = index * Math.PI / 24;
      return [Math.cos(angle), Math.sin(angle)];
    });
    points.splice(15, 4, [-.76, 1.33]);
    return points;
  }
  return Array.from({ length: 96 }, (_, index) => {
    const angle = index * Math.PI / 48;
    const radius = 1 + (.14 + .04 * Math.sin(angle * 3)) * Math.sin((index % 12) * Math.PI / 12);
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  });
}

function bounds(element) {
  if (element.type !== "line") return element;
  const minX = Math.min(...element.points.map(([x]) => x));
  const minY = Math.min(...element.points.map(([, y]) => y));
  return { x: element.x + minX, y: element.y + minY, width: element.width, height: element.height };
}

export function customShapePoints(element, padding = 0) {
  const data = element.customData?.icnBasicShape;
  if (element.type !== "rectangle" || !customShapes.has(data?.kind)) return null;
  const points = unitOutline(data.kind, validPolygonSides(data.sides) ? data.sides : 6);
  const minX = Math.min(...points.map(([x]) => x)), maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y)), maxY = Math.max(...points.map(([, y]) => y));
  return points.map(([x, y]) => [
    (data.mirrorX ? (maxX - x) : (x - minX)) / (maxX - minX) * (element.width + 2 * padding) - padding,
    (y - minY) / (maxY - minY) * (element.height + 2 * padding) - padding,
  ]);
}

export function customShapePath(element) {
  const points = customShapePoints(element);
  return points && "M" + points.map(point => point.join(" ")).join(" L") + " Z";
}

export function customShapeSegments(element, padding) {
  const points = customShapePoints(element, padding)?.map(([x, y]) => [x + element.x, y + element.y]);
  return points?.map((point, index) => [point, points[(index + 1) % points.length]]);
}

export function customArrowAnchor(element, relative, padding) {
  const points = customShapePoints(element, padding);
  if (!points) return null;
  const x = element.width / 2, y = element.height / 2;
  const dx = (relative[0] - .5) * element.width, dy = (relative[1] - .5) * element.height;
  let distance = Infinity;
  for (let index = 0; index < points.length; index++) {
    const [ax, ay] = points[index], [bx, by] = points[(index + 1) % points.length];
    const ex = bx - ax, ey = by - ay;
    const denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) < 1e-8) continue;
    const t = ((ax - x) * ey - (ay - y) * ex) / denominator;
    const u = ((ax - x) * dy - (ay - y) * dx) / denominator;
    if (t >= 0 && u >= -1e-8 && u <= 1 + 1e-8) distance = Math.min(t, distance);
  }
  return Number.isFinite(distance) ? [element.x + x + dx * distance, element.y + y + dy * distance] : null;
}

export function shapeKind(element) {
  if ((element.type === "line" || element.type === "rectangle") &&
      customShapes.has(element.customData?.icnBasicShape?.kind)) return element.customData.icnBasicShape.kind;
  if (nativeShapes.has(element.type)) return element.type;
}

function reshape(element, shape, sides, update) {
  const customData = { ...element.customData };
  if (customShapes.has(shape)) customData.icnBasicShape = { kind: shape, ...(shape === "polygon" && { sides }) };
  else delete customData.icnBasicShape;
  const { x, y, width, height } = bounds(element);
  const next = update(element, {
    type: customShapes.has(shape) ? "rectangle" : shape, x, y, width, height,
    roundness: nativeShapes.has(shape) && nativeShapes.has(element.type) ? element.roundness : null, customData,
  });
  if (element.type === "line") {
    for (const key of ["points", "lastCommittedPoint", "startBinding", "endBinding", "startArrowhead", "endArrowhead", "elbowed"]) delete next[key];
  }
  return next;
}

let refreshArrows;
let reflowText;
export function registerBasicShapeBindings(arrows, text) {
  refreshArrows = arrows;
  reflowText = text;
}

export function finishBasicShape(api, element, tool, update, capture) {
  if (!api || element?.type !== "rectangle" || !customShapes.has(tool?.id) || element.width < 1 || element.height < 1) return false;
  const next = reshape(element, tool.id, polygonSides(), update);
  api.updateScene({
    elements: api.getSceneElementsIncludingDeleted().map(item => item.id === element.id ? next : item),
    captureUpdate: capture,
  });
  return true;
}

export function selectedBasicShapes(api) {
  const state = api?.getAppState();
  if (!state || state.viewModeEnabled) return [];
  return api.getSceneElements().filter(element => state.selectedElementIds[element.id] && !element.locked && shapeKind(element));
}

export function changeBasicShape(api, shape, update, capture, sides = polygonSides()) {
  if (!nativeShapes.has(shape) && !customShapes.has(shape)) return false;
  const targets = selectedBasicShapes(api).filter(element => element.type === "line" || shapeKind(element) !== shape ||
    shape === "polygon" && element.customData?.icnBasicShape?.sides !== sides);
  if (!targets.length) return false;
  const scene = api.getSceneElementsIncludingDeleted();
  const byId = new Map(scene.filter(element => !element.isDeleted).map(element => [element.id, element]));
  const converted = targets.map(target => reshape(target, shape, sides, update));
  const copied = new Set();
  function copyBindings(element) {
    for (const { id } of element.boundElements ?? []) {
      const bound = byId.get(id);
      if (!bound || copied.has(id)) continue;
      copied.add(id);
      byId.set(id, structuredClone(bound));
      copyBindings(bound);
    }
  }
  for (const next of converted) byId.set(next.id, next);
  for (const next of converted) copyBindings(next);
  for (const next of converted) {
    const element = byId.get(next.id);
    reflowText?.(element, byId, false);
    refreshArrows?.(element, byId);
  }
  api.updateScene({
    elements: scene.map(element => byId.get(element.id) || element),
    appState: { selectedLinearElement: null, showHyperlinkPopup: false },
    captureUpdate: capture,
  });
  return true;
}
