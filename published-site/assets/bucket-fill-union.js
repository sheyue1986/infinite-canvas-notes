import { booleanMeasurement } from "./boolean-geometry.js";
import { customShapePoints } from "./basic-shapes-union.js";

const shapes = new Set(["rectangle", "ellipse", "diamond"]);
const strokes = new Set(["line", "arrow", "freedraw"]);
const regionSize = 512;
const maxEdges = 12000;
const searchRadii = [128, 384, 1152, 3456];
const layerId = element => element.customData?.infiniteLayer || "layer-base";
const isFill = element => !!element.customData?.infiniteBucket;
const hasPaint = color => !!color && color !== "transparent";
const colorDistance = (r, g, b, red, green, blue) => Math.max(Math.abs(r - red), Math.abs(g - green), Math.abs(b - blue));
const noRegion = { zh: "容差范围内未找到可填充的闭合区域。", en: "No enclosed region within this tolerance." };

function blendColor(color, base, opacity, readFillPaint) {
  const { fillColor: value, fillOpacity } = readFillPaint(color, null);
  if (!value) return base;
  return base.map((channel, index) => {
    const over = parseInt(value.slice(1 + index * 2, 3 + index * 2), 16);
    return Math.round(channel + (over - channel) * opacity * fillOpacity / 100);
  });
}

function bounds(points) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const [x, y] of points) {
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return { left, top, right, bottom };
}

function cornerRadius(element) {
  const proportional = Math.min(element.width, element.height) / 4;
  return element.roundness?.type === 3
    ? Math.min(proportional, element.roundness.value ?? 32) : element.roundness ? proportional : 0;
}

const closedPoints = points => points?.length >= 3 && Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]) <= 8;

function outline(element) {
  const { x, y, width: w, height: h, type, angle } = element;
  let local = customShapePoints(element);
  if (!local && type === "rectangle") {
    const radius = cornerRadius(element);
    local = radius > 0 ? [[w - radius, radius], [w - radius, h - radius],
      [radius, h - radius], [radius, radius]].flatMap(([cx, cy], corner) => Array.from({ length: 9 }, (_, i) => {
      const angle = (corner - 1 + i / 8) * Math.PI / 2;
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    })) : [[0, 0], [w, 0], [w, h], [0, h]];
  }
  else if (!local && type === "diamond") local = [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]];
  else if (!local && type === "ellipse") local = Array.from({ length: 80 }, (_, i) => {
    const rad = i * Math.PI / 40;
    return [(1 + Math.cos(rad)) * w / 2, (1 + Math.sin(rad)) * h / 2];
  });
  else if (!local) local = element.points;
  if (local?.length < 2 || !local) return null;
  const { left, top, right, bottom } = bounds(local);
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const points = local.map(([px, py]) => [x + cx + (px - cx) * cos - (py - cy) * sin,
    y + cy + (px - cx) * sin + (py - cy) * cos]);
  return { element, points, local, box: bounds(points), closed: shapes.has(type) || type !== "arrow" && closedPoints(local) };
}

function contains({ points, box }, { x, y }) {
  if (x < box.left || x > box.right || y < box.top || y > box.bottom) return false;
  let inside = false;
  for (let i = 0, previous = points.length - 1; i < points.length; previous = i++) {
    const [a, b] = points[i], [c, d] = points[previous];
    if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) inside = !inside;
  }
  return inside;
}

const overlaps = (a, b) => a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
const area = points => points.reduce((sum, [x, y], i) => {
  const [u, v] = points[(i + 1) % points.length];
  const [originX, originY] = points[0];
  return sum + (x - originX) * (v - originY) - (y - originY) * (u - originX);
}, 0);

function markerPosition(element, local, anchor, toCanvas) {
  const { left, top, right, bottom } = bounds(local);
  const width = right - left, height = bottom - top;
  const cx = element.x + (left + right) / 2, cy = element.y + (top + bottom) / 2;
  const cos = Math.cos(element.angle), sin = Math.sin(element.angle);
  if (toCanvas) {
    const dx = (anchor.x - .5) * width, dy = (anchor.y - .5) * height;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }
  const dx = anchor.x - cx, dy = anchor.y - cy;
  return { x: width ? .5 + (dx * cos + dy * sin) / width : .5,
    y: height ? .5 + (-dx * sin + dy * cos) / height : .5 };
}

export function measureBucketElement(element) { if (element.customData?.icnBoolean) return booleanMeasurement(element);
  const marker = element.customData?.icnAreaFill;
  if (!marker || !hasPaint(element.backgroundColor) || !element.opacity) return null;
  const item = outline(element);
  if (!item?.closed) return null;
  let value = Math.abs(area(item.local)) / 2;
  if (element.type === "ellipse") value = Math.PI * element.width * element.height / 4;
  else if (element.type === "rectangle" && !element.customData?.icnBasicShape) {
    value = element.width * element.height - (4 - Math.PI) * cornerRadius(element) ** 2;
  }
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, approximate: !!element.customData.infiniteBucket, ...markerPosition(element, item.local, marker, true) };
}

// Trace the boundary of the visited pixels. Opposite winding preserves interior islands.
function contours(cells) {
  const stride = regionSize + 1, edges = new Map();
  const offsets = [1, stride, -1, -stride];
  let count = 0;
  const edge = (start, direction) => {
    edges.set(start, (edges.get(start) || 0) | (1 << direction));
    count++;
  };
  for (let y = 1; y < regionSize - 1; y++) for (let x = 1; x < regionSize - 1; x++) {
    const i = y * regionSize + x, start = y * stride + x;
    if (!cells[i]) continue;
    if (!cells[i - regionSize]) edge(start, 0);
    if (!cells[i + 1]) edge(start + 1, 1);
    if (!cells[i + regionSize]) edge(start + stride + 1, 2);
    if (!cells[i - 1]) edge(start + stride, 3);
    if (count > maxEdges) return null;
  }
  const loops = [];
  while (edges.size) {
    const start = edges.keys().next().value, points = [];
    let node = start, direction = 0;
    do {
      const mask = edges.get(node);
      const next = [direction + 1, direction, direction + 3, direction + 2].map(value => value % 4).find(value => mask & (1 << value));
      if (next === undefined) return null;
      const rest = mask & ~(1 << next);
      if (rest) edges.set(node, rest); else edges.delete(node);
      if (!points.length || direction !== next) points.push([node % stride, Math.floor(node / stride)]);
      direction = next;
      node += offsets[next];
    } while (node !== start);
    if (points.length >= 3 && Math.abs(area(points)) > 2) loops.push(points);
  }
  if (!loops.length) return null;
  loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const [outer, ...holes] = loops;
  let result = outer;
  for (const hole of holes) {
    let best = Infinity, outerIndex = 0, holeIndex = 0;
    for (let i = 0; i < outer.length; i++) for (let j = 0; j < hole.length; j++) {
      const distance = (outer[i][0] - hole[j][0]) ** 2 + (outer[i][1] - hole[j][1]) ** 2;
      if (distance < best) { best = distance; outerIndex = i; holeIndex = j; }
    }
    const anchor = result.indexOf(outer[outerIndex]);
    result = [...result.slice(0, anchor + 1), ...hole.slice(holeIndex), ...hole.slice(0, holeIndex + 1), ...result.slice(anchor)];
  }
  return [...result, result[0]];
}

function findRegion(point, paint, background, tolerance) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = regionSize;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.lineJoin = ctx.lineCap = "round";
  const center = regionSize / 2, cells = new Uint8Array(regionSize ** 2), queue = new Int32Array(cells.length);
  const start = center * regionSize + center;
  for (const radius of searchRadii) {
    const box = { left: point.x - radius, right: point.x + radius, top: point.y - radius, bottom: point.y + radius };
    const scale = center / radius;
    ctx.resetTransform();
    ctx.globalAlpha = 1;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, regionSize, regionSize);
    ctx.setTransform(scale, 0, 0, scale, -box.left * scale, -box.top * scale);
    for (const item of paint) {
      if (!overlaps(box, item.box)) continue;
      const element = item.element;
      ctx.beginPath();
      ctx.moveTo(...item.points[0]);
      for (let i = 1; i < item.points.length; i++) ctx.lineTo(...item.points[i]);
      ctx.globalAlpha = element.opacity / 100;
      if (item.closed) {
        ctx.closePath();
        if (hasPaint(element.backgroundColor)) {
          ctx.fillStyle = element.backgroundColor;
          ctx.fill();
        }
      }
      if (hasPaint(element.strokeColor)) {
        ctx.strokeStyle = element.strokeColor;
        ctx.lineWidth = Math.max(1.6 / scale, element.strokeWidth || 1);
        ctx.stroke();
      }
    }
    const { data } = ctx.getImageData(0, 0, regionSize, regionSize);
    const offset = start * 4, r = data[offset], g = data[offset + 1], b = data[offset + 2];
    cells.fill(0);
    cells[start] = 1;
    queue[0] = start;
    let size = 1, escaped = false;
    const visit = i => {
      const p = i * 4;
      if (cells[i] || colorDistance(r, g, b, data[p], data[p + 1], data[p + 2]) > tolerance) return;
      cells[i] = 1;
      queue[size++] = i;
    };
    for (let read = 0; read < size; read++) {
      const i = queue[read], x = i % regionSize;
      if (!x || x === regionSize - 1 || i < regionSize || i >= cells.length - regionSize) { escaped = true; break; }
      visit(i - 1); visit(i + 1); visit(i - regionSize); visit(i + regionSize);
    }
    if (escaped) continue;
    return contours(cells)?.map(([x, y]) => [box.left + x / scale, box.top + y / scale]) || null;
  }
  return null;
}

const patterns = new Set(["solid", "hachure", "cross-hatch", "zigzag"]);

export function createBucketFill({ convertToExcalidrawElements, newElementWith, capture, hexColor, withElementOpacity, readFillPaint }) {
  const operations = { convertToExcalidrawElements, newElementWith, capture, hexColor, withElementOpacity, readFillPaint };
  return (api, point, brush, layers, areaEnabled) => fillAt(api, point, brush, layers, areaEnabled, operations);
}

function fillAt(api, point, brush, layers, areaEnabled, operations) {
  if (brush?.type !== "bucket") return;
  const { convertToExcalidrawElements, newElementWith, capture, hexColor, withElementOpacity, readFillPaint } = operations;
  const fillStyle = patterns.has(brush.fillStyle) ? brush.fillStyle : "solid";
  const all = api.getSceneElementsIncludingDeleted();
  const active = layers.items.find(layer => layer.id === (layers.focus || layers.active));
  const restricted = layers.mode === "manual" || !!layers.focus;
  if (restricted && (!active?.visible || active.locked || active.archived)) {
    return { zh: "当前图层已隐藏或锁定。", en: "The current layer is hidden or locked." };
  }
  const tolerance = Number.isFinite(brush.tolerance) ? Math.round(Math.max(0, Math.min(255, brush.tolerance))) : 32;
  if (tolerance === 255) return noRegion;
  const background = hexColor(api.getAppState().viewBackgroundColor) || "#ffffff";
  const geometry = [], fills = [], paint = [];
  for (const element of all) {
    if (element.isDeleted || !element.opacity || (layers.focus && layerId(element) !== layers.focus)) continue;
    if (!(shapes.has(element.type) || strokes.has(element.type))) continue;
    const reach = searchRadii.at(-1) + Math.hypot(element.width, element.height) * 2;
    if (Math.abs(element.x - point.x) > reach || Math.abs(element.y - point.y) > reach) continue;
    const item = outline(element);
    if (!item) continue;
    if (!hasPaint(element.strokeColor) && !(item.closed && hasPaint(element.backgroundColor))) continue;
    paint.push(item);
    if (isFill(element)) fills.push(item);
    else geometry.push(item);
  }
  const editable = ({ element }) => !element.locked && (!restricted || layerId(element) === active.id);
  const setFill = ({ element, local }) => {
    const backgroundColor = !isFill(element) && areaEnabled && brush.opacity < 100 && /^#[a-f\d]{6}$/i.test(brush.color)
      ? brush.color + Math.round(brush.opacity * 255 / 100).toString(16).padStart(2, "0") : brush.color;
    if (!areaEnabled && backgroundColor === element.backgroundColor && element.fillStyle === fillStyle && !isFill(element)) return;
    const updated = newElementWith(element, { backgroundColor, fillStyle,
      ...(areaEnabled && { customData: { ...element.customData, icnAreaFill: markerPosition(element, local, point, false) } }),
    });
    const next = isFill(element) ? withElementOpacity(updated, brush.opacity, layers) : updated;
    api.updateScene({ elements: all.map(item => item.id === element.id ? next : item), captureUpdate: capture });
  };
  const shape = geometry.findLast(item => shapes.has(item.element.type) && contains(item, point));
  if (shape && (brush.opacity === 100 || areaEnabled) && editable(shape) &&
      [shape.element.strokeColor, shape.element.backgroundColor].every(color => !hasPaint(color) || readFillPaint(color, null).fillColor) &&
      !paint.some(item => item !== shape && overlaps(item.box, shape.box))) {
    const element = shape.element;
    const outside = blendColor(background, [255, 255, 255], 1, readFillPaint);
    const inside = blendColor(element.backgroundColor, outside, element.opacity / 100, readFillPaint);
    const edge = blendColor(element.strokeColor, inside, element.opacity / 100, readFillPaint);
    if (colorDistance(...inside, ...outside) <= tolerance && colorDistance(...inside, ...edge) <= tolerance) return noRegion;
    setFill(shape);
    return;
  }
  const region = paint.length && findRegion(point, paint, background, tolerance);
  if (!region) return noRegion;
  const regionBox = bounds(region);
  const previous = fills.findLast(item => editable(item) && contains(item, point));
  if (previous && Object.keys(regionBox).every(edge => Math.abs(regionBox[edge] - previous.box[edge]) <= 2) &&
      Math.abs(area(region) - area(previous.points)) <= Math.abs(area(previous.points)) * .05) {
    setFill(previous);
    return;
  }
  const enclosing = geometry.findLast(item => item.closed && contains(item, point));
  const boundary = enclosing || geometry.find(item => overlaps(item.box, {
    left: regionBox.left - 10, top: regionBox.top - 10, right: regionBox.right + 10, bottom: regionBox.bottom + 10,
  }));
  const source = boundary?.element;
  const target = restricted ? active : layers.items.find(layer => layer.id === (source && layerId(source)) && layer.visible && !layer.locked) || active;
  const [x, y] = region[0];
  const [polygon] = convertToExcalidrawElements([{
    type: "line", x, y, points: region.map(([px, py]) => [px - x, py - y]),
    width: regionBox.right - regionBox.left, height: regionBox.bottom - regionBox.top,
    backgroundColor: brush.color, fillStyle, strokeColor: "transparent", roughness: 0, roundness: null,
  }]);
  const fill = withElementOpacity(newElementWith(polygon, { customData: {
    infiniteBucket: true, infiniteBrush: { id: "bucket", name: "填充" }, infiniteLayer: target?.id,
    ...(areaEnabled && { icnAreaFill: markerPosition(polygon, polygon.points, point, false) }),
  } }), brush.opacity, layers);
  const boundaryIndex = source && target?.id === layerId(source)
    ? all.indexOf(source) + (enclosing && hasPaint(source.backgroundColor) ? 1 : 0) : all.length;
  const previousIndex = previous && target?.id === layerId(previous.element) ? all.indexOf(previous.element) + 1 : 0;
  const insert = Math.max(boundaryIndex, previousIndex);
  api.updateScene({ elements: [...all.slice(0, insert), fill, ...all.slice(insert)], captureUpdate: capture });
}
