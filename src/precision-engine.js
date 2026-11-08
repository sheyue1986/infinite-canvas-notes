import { convertToExcalidrawElements, CaptureUpdateAction, newElementWith, viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";

export const MEASURE_LAYER = "precision-measurements";
export const gridTypes = { dots: "点状网格", square: "方格纸", lines: "横线纸", iso: "等距网格", triangle: "三角网格", one: "一点透视", two: "两点透视", three: "三点透视" };
export const guides = { line: "直线", arc: "圆弧", angle: "角度", ellipse: "椭圆", rect: "矩形" };
export const defaults = {
  grid: false, gridVisible: true, gridType: "square", spacing: 80, divisions: 4, gridColor: "#787e79", gridOpacity: 28, weight: 1, angle: 0,
  density: 12, origin: [0, 0], vanishing: null, snap: false, gridSnap: false, alignGrid: false, measure: false, scale: null, unit: "m", digits: 2,
  guide: false, guideType: "line", guidePoints: null, guideRotation: 0, recognize: false, hold: 500,
};
export const unitMeters = { mm: .001, cm: .01, m: 1, km: 1000, in: .0254, ft: .3048 };
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const perspectiveCount = type => ({ one: 1, two: 2, three: 3 }[type] || 0);
const numberFormats = new Map();

export function measured(value, settings, power = 1) {
  const factor = settings.scale || 1;
  const digits = settings.digits;
  if (!numberFormats.has(digits)) numberFormats.set(digits, new Intl.NumberFormat("zh-CN", { maximumFractionDigits: digits }));
  const number = numberFormats.get(digits).format(value * factor ** power);
  return number + " " + (settings.scale ? settings.unit : "pt") + (power === 2 ? "²" : "");
}

export function measureAt(event, api, session, settings, revealLayer) {
  if (!api || !session.current) return;
  const point = viewportCoordsToSceneCoords(event, api.getAppState());
  const position = settings.snap && settings.grid && settings.gridVisible && settings.gridSnap ? snapPoint([point.x, point.y], settings) : [point.x, point.y];
  const action = session.current;
  if (!action.start) {
    action.start = position;
    action.status("再点击终点，Esc 取消");
    return;
  }
  const start = action.start;
  const length = distance(position, start);
  if (!length) { action.status("请选择与起点不同的终点"); return; }
  session.current = null;
  action.status("");
  if (action.kind === "calibrate") {
    action.calibrate(length);
    return;
  }
  revealLayer();
  const [x, y] = start, [endX, endY] = position;
  const group = crypto.randomUUID();
  const elements = convertToExcalidrawElements([
    { type: "line", x, y, points: [[0, 0], [endX - x, endY - y]], roughness: 0, strokeColor: "#7656ad" },
    { type: "text", x: (x + endX) / 2 + 8, y: (y + endY) / 2 - 24, text: measured(length, settings), fontSize: 16, strokeColor: "#7656ad" },
  ]).map(element => newElementWith(element, { groupIds: [group], customData: { infiniteLayer: MEASURE_LAYER, precisionMeasure: true } }));
  api.updateScene({ elements: [...api.getSceneElementsIncludingDeleted(), ...elements], captureUpdate: CaptureUpdateAction.IMMEDIATELY });
}

export function snapPoint(point, settings) {
  const angle = (settings.angle + (settings.gridType === "iso" ? 30 : 0)) * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  const [ox, oy] = settings.origin, dx = point[0] - ox, dy = point[1] - oy;
  const x = dx * c + dy * s, y = dy * c - dx * s;
  const step = Math.max(4, settings.spacing) / Math.max(1, settings.divisions);
  let sx = x, sy = y;
  if (["iso", "triangle"].includes(settings.gridType)) {
    sy = Math.round(y / (step * Math.sqrt(3) / 2)) * step * Math.sqrt(3) / 2;
    const offset = Math.round(y / (step * Math.sqrt(3) / 2)) * step / 2;
    sx = Math.round((x - offset) / step) * step + offset;
  } else if (!perspectiveCount(settings.gridType)) {
    sy = Math.round(y / step) * step;
    if (settings.gridType !== "lines") sx = Math.round(x / step) * step;
  }
  return [ox + sx * c - sy * s, oy + sx * s + sy * c];
}

function projectSegment(point, start, end) {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length)) : 0;
  return [start[0] + dx * t, start[1] + dy * t];
}

export function guidePath(type, [a, b]) {
  const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
  if (type === "line") return [a, b];
  if (type === "rect") return [a, [b[0], a[1]], b, [a[0], b[1]], a];
  if (type === "angle") return [a, [b[0], a[1]], b];
  const rx = Math.max(1, Math.abs(b[0] - a[0]) / 2), ry = Math.max(1, Math.abs(b[1] - a[1]) / 2);
  return Array.from({ length: 65 }, (_, i) => {
    const angle = i * Math.PI / (type === "arc" ? 64 : 32);
    return [cx + Math.cos(angle) * rx, cy - Math.sin(angle) * ry];
  });
}

export const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
export function rotatePoint(point, center, degrees) {
  if (!degrees) return point;
  const angle = degrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  const dx = point[0] - center[0], dy = point[1] - center[1];
  return [center[0] + dx * c - dy * s, center[1] + dx * s + dy * c];
}

function projectPath(point, path) {
  let best = point, nearest = Infinity;
  for (let i = 1; i < path.length; i++) {
    const next = projectSegment(point, path[i - 1], path[i]);
    const error = distance(next, point);
    if (error < nearest) { best = next; nearest = error; }
  }
  return best;
}

function projectGuide(point, type, handles, path) {
  if (type !== "ellipse" && type !== "arc") return projectPath(point, path);
  const [a, b] = handles;
  const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
  const rx = Math.max(1, Math.abs(b[0] - a[0]) / 2), ry = Math.max(1, Math.abs(b[1] - a[1]) / 2);
  const angle = Math.atan2((cy - point[1]) / ry, (point[0] - cx) / rx);
  const limit = type === "arc" && angle < 0 ? (point[0] < cx ? Math.PI : 0) : angle;
  return [cx + Math.cos(limit) * rx, cy - Math.sin(limit) * ry];
}

function gridDirection(start, end, settings) {
  const count = perspectiveCount(settings.gridType);
  const rotation = settings.angle * Math.PI / 180;
  const basis = count === 1 ? [0, Math.PI / 2] : count === 2 ? [Math.PI / 2] : count ? [] :
    settings.gridType === "lines" ? [0] : settings.gridType === "iso" ? [30, 90, 150].map(deg => deg * Math.PI / 180) :
    settings.gridType === "triangle" ? [0, Math.PI / 3, -Math.PI / 3] : [0, Math.PI / 4, Math.PI / 2, -Math.PI / 4];
  const candidates = basis.map(a => a + rotation);
  if (count) for (const vp of (settings.vanishing || []).slice(0, count)) {
    if (distance(start, vp) > 1) candidates.push(Math.atan2(vp[1] - start[1], vp[0] - start[0]));
  }
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const error = a => Math.abs(dx * Math.sin(a) - dy * Math.cos(a));
  const angle = candidates.reduce((best, a) => best == null || error(a) < error(best) ? a : best, null);
  return angle == null ? null : [Math.cos(angle), Math.sin(angle)];
}

function recognizedPath(points) {
  const a = points[0], b = points.at(-1);
  const stride = Math.max(1, Math.floor(points.length / 64));
  const sample = points.filter((_, i) => i % stride === 0);
  const xs = sample.map(p => p[0]), ys = sample.map(p => p[1]);
  const topLeft = [Math.min(...xs), Math.min(...ys)], bottomRight = [Math.max(...xs), Math.max(...ys)];
  const size = distance(topLeft, bottomRight);
  if (size < 12) return null;
  const error = path => sample.reduce((sum, p) => sum + distance(p, projectPath(p, path)), 0) / sample.length;
  if (distance(a, b) > size * .65 && error([a, b]) < size * .07) return [a, b];
  if (distance(a, b) > size * .25) return null;
  const candidates = ["rect", "ellipse"].map(type => {
    const path = guidePath(type, [topLeft, bottomRight]);
    return { path, error: error(path) };
  }).sort((a, b) => a.error - b.error);
  return candidates[0].error < size * .09 ? candidates[0].path : null;
}

export function preciseStroke(stroke, settings, held, mutate) {
  const guide = settings.guide && settings.guidePoints;
  const grid = settings.snap && settings.grid && settings.gridVisible && settings.gridSnap && !perspectiveCount(settings.gridType);
  const align = settings.snap && settings.grid && settings.gridVisible && settings.alignGrid;
  if (!guide && !grid && !align && !(settings.recognize && held >= settings.hold)) return;
  if (stroke.points.length < 2) return;
  const absolute = stroke.points.map(([x, y]) => [x + stroke.x, y + stroke.y]);
  const path = guide ? guidePath(settings.guideType, guide) : settings.recognize && held >= settings.hold ? recognizedPath(absolute) : null;
  const start = grid ? snapPoint(absolute[0], settings) : absolute[0];
  const direction = !path && align ? gridDirection(start, absolute.at(-1), settings) : null;
  if (!path && !grid && !direction) return;
  const center = guide && midpoint(...guide);
  const points = absolute.map(point => {
    if (guide) {
      const local = rotatePoint(point, center, -settings.guideRotation);
      return rotatePoint(projectGuide(local, settings.guideType, guide, path), center, settings.guideRotation);
    }
    if (path) return projectPath(point, path);
    if (!direction) return snapPoint(point, settings);
    const [dx, dy] = direction;
    const along = (point[0] - start[0]) * dx + (point[1] - start[1]) * dy;
    return [start[0] + along * dx, start[1] + along * dy];
  });
  const [x, y] = points[0];
  const normalized = points.map(point => [point[0] - x, point[1] - y]);
  mutate(stroke, { x, y, points: normalized, lastCommittedPoint: normalized.at(-1) });
}
