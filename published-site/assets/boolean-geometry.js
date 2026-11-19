import clipping from "./polygon-clipping.js";
import { customShapePoints } from "./basic-shapes-r10.js";

export function booleanRings(element) {
  const polygons = element.customData?.icnBoolean?.polygons;
  return polygons?.map(polygon => polygon.map(ring => ring.map(([x, y]) => [x * element.width, y * element.height])));
}

export function flattenBooleanRings(element) {
  const polygons = booleanRings(element);
  if (!polygons) return null;
  const rings = polygons.flat();
  const anchor = rings[0][0];
  return rings.flatMap(ring => [anchor, ...ring, ring[0], anchor]);
}

export function booleanPath(element) {
  const polygons = booleanRings(element);
  return polygons?.flat().map(ring => "M" + ring.map(p => p.join(" ")).join(" L") + " Z").join(" ");
}

export function signedArea(ring) {
  const [ox, oy] = ring[0];
  return ring.reduce((sum, [x, y], i) => {
    const [u, v] = ring[(i + 1) % ring.length];
    return sum + (x - ox) * (v - oy) - (y - oy) * (u - ox);
  }, 0) / 2;
}

export function booleanMeasurement(element) {
  const polygons = booleanRings(element);
  if (!polygons || !element.customData.icnAreaFill || !element.backgroundColor ||
      element.backgroundColor === "transparent" || !element.opacity) return null;
  const value = polygons.reduce((sum, rings) => sum + Math.abs(signedArea(rings[0])) -
    rings.slice(1).reduce((holes, ring) => holes + Math.abs(signedArea(ring)), 0), 0);
  return { value, approximate: !!element.customData.infiniteBucket,
    x: element.x + element.width / 2, y: element.y + element.height / 2 };
}

function localOutline(element) {
  const { width: w, height: h } = element;
  const custom = customShapePoints(element);
  if (custom) return custom;
  if (element.type === "rectangle") {
    const radius = element.roundness ? Math.min(Math.min(w, h) / 4, element.roundness.type === 3 ? element.roundness.value ?? 32 : Infinity) : 0;
    if (!radius) return [[0, 0], [w, 0], [w, h], [0, h]];
    return [[w-radius,radius],[w-radius,h-radius],[radius,h-radius],[radius,radius]].flatMap(([cx,cy], corner) =>
      Array.from({ length: 17 }, (_, i) => {
        const angle = (corner - 1 + i / 16) * Math.PI / 2;
        return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
      }));
  }
  if (element.type === "ellipse") return Array.from({length:128}, (_,i) => {
    const angle = i * Math.PI / 64;
    return [w * (1 + Math.cos(angle)) / 2, h * (1 + Math.sin(angle)) / 2];
  });
  if (element.type === "diamond") return [[w/2,0],[w,h/2],[w/2,h],[0,h/2]];
  if (!["line", "freedraw"].includes(element.type) || !element.points || element.points.length < 4) return null;
  const first = element.points[0], last = element.points.at(-1);
  const gap = Math.hypot(first[0]-last[0], first[1]-last[1]);
  if (gap > Math.max(8, (element.strokeWidth || 1) * 2)) return null;
  return element.points;
}

export function elementPolygons(element) {
  if (element.isDeleted || element.locked) return null;
  const local = booleanRings(element);
  const single = !local && localOutline(element);
  if (!local && !single) return null;
  const polygons = local || [[single]];
  const angle = element.angle || 0, cos = Math.cos(angle), sin = Math.sin(angle);
  const cx = element.width / 2, cy = element.height / 2;
  return polygons.map(polygon => polygon.map(ring => ring.map(([x,y]) =>
    [element.x + cx + (x-cx)*cos - (y-cy)*sin, element.y + cy + (x-cx)*sin + (y-cy)*cos])));
}

export function canUnion(api) {
  if (!api || api.getAppState().viewModeEnabled) return false;
  const state = api.getAppState();
  const selected = api.getSceneElements().filter(e => !e.isDeleted && state.selectedElementIds[e.id]);
  return selected.length >= 2 && selected.every(e => !!elementPolygons(e));
}

export function mergeSelection(api, convert, revise, capture) {
  if (!canUnion(api)) return false;
  const state = api.getAppState();
  const all = api.getSceneElementsIncludingDeleted();
  const selected = all.filter(e => !e.isDeleted && state.selectedElementIds[e.id]);
  const polygons = clipping.union(...selected.map(elementPolygons));
  if (!polygons.length) return false;
  let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity;
  for (const polygon of polygons) for (const ring of polygon) for (const [a,b] of ring) {
    x = Math.min(x,a); y = Math.min(y,b); right = Math.max(right,a); bottom = Math.max(bottom,b);
  }
  const width = right - x, height = bottom - y;
  if (!(width > 0 && height > 0)) return false;
  const first = selected[0];
  const painted = selected.find(e => e.backgroundColor && e.backgroundColor !== "transparent");
  const customData = {
    infiniteLayer: first.customData?.infiniteLayer,
    icnBoolean: { version: 1, polygons: polygons.map(polygon => polygon.map(ring => ring.map(([a,b]) => [(a-x)/width, (b-y)/height]))) },
    ...(painted && { icnAreaFill: { x: .5, y: .5 } }),
    ...(selected.some(e => e.customData?.infiniteBucket) && { infiniteBucket: true }),
  };
  const [result] = convert([{ type: "rectangle", x, y, width, height, angle: 0,
    strokeColor: first.strokeColor, backgroundColor: painted?.backgroundColor || "transparent",
    fillStyle: painted?.fillStyle || first.fillStyle, strokeWidth: first.strokeWidth,
    strokeStyle: first.strokeStyle, roughness: 0, roundness: null, opacity: first.opacity,
    frameId: selected.every(e => e.frameId === first.frameId) ? first.frameId : null,
    customData,
  }]);
  const ids = new Set(selected.map(e => e.id));
  const mapped = all.map(e => {
    if (ids.has(e.id)) return revise(e, { isDeleted: true });
    if (e.type === "text" && ids.has(e.containerId)) return revise(e, { containerId: null });
    if (e.type !== "arrow") return e;
    const patch = {};
    for (const key of ["startBinding", "endBinding"]) if (ids.has(e[key]?.elementId)) patch[key] = { ...e[key], elementId: result.id };
    if (Object.keys(patch).length) return revise(e, patch);
    return e;
  });
  const arrows = mapped.filter(e => e.type === "arrow" && !e.isDeleted &&
    [e.startBinding?.elementId, e.endBinding?.elementId].includes(result.id));
  if (arrows.length) result.boundElements = arrows.map(e => ({id:e.id,type:"arrow"}));
  const at = Math.max(...selected.map(e => all.indexOf(e)));
  mapped.splice(at + 1, 0, result);
  api.updateScene({ elements: mapped, appState: { selectedElementIds: { [result.id]: true },
    selectedGroupIds: {}, selectedLinearElement: null, contextMenu: null }, captureUpdate: capture });
  return true;
}
