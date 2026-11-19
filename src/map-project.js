import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

import { decorateMap } from "./map-decoration.js";
export const streetCredits = "OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors";
export const streetLicense = "https://www.openstreetmap.org/copyright";

export function coordinates(text) {
  const pair = /^\s*([+-]?\d+(?:\.\d+)?)\s*[,，]\s*([+-]?\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!pair) return null;
  const lat = Number(pair[1]), lng = Number(pair[2]);
  if (Math.abs(lat) > 85.05 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}

export function sceneFromMap({ canvas, width, height, metersPerPoint, source, center, bounds, zoom, north = 0, credits: sourceCredits, gridMeters = 0, embeddedAttribution = false }) {
  if (![width, height, metersPerPoint].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error("底图的范围或比例无效。");
  }
  const created = Date.now();
  const fileId = crypto.randomUUID(), layerId = crypto.randomUUID();
  const credits = sourceCredits || (source === "street" ? streetCredits : undefined);
  const decorated = document.createElement("canvas");
  decorated.width = canvas.width;
  decorated.height = canvas.height;
  decorated.getContext("2d").drawImage(canvas, 0, 0);
  decorateMap(decorated, { width, height, metersPerPoint, credits, north, embeddedAttribution });
  const metadata = { source, metersPerPoint, center, bounds, zoom, credits, north, created };
  const [image] = convertToExcalidrawElements([{
    type: "image", x: 0, y: 0, width, height, fileId, status: "saved", locked: true,
    customData: {
      infiniteLayer: layerId, infiniteMap: metadata,
      infiniteLayerStyle: { opacity: 100, locked: false, shownOpacity: 100, shownLocked: true },
    },
  }]);
  const mimeType = source !== "local" ? "image/jpeg" : "image/png";
  return {
    elements: [image],
    files: { [fileId]: { id: fileId, dataURL: decorated.toDataURL(mimeType, .96), mimeType, created } },
    precision: { unit: "m", scale: metersPerPoint, measure: true, mapScale: { source, metersPerPoint, north },
      grid: gridMeters > 0, mapGridMeters: gridMeters || 10, gridPlaced: true, origin: [0, 0], divisions: 1, angle: north },
    layers: { items: [
      { id: layerId, name: "地图底图", visible: true, locked: true, opacity: 100 },
      { id: "layer-base", name: "图层 1", visible: true, locked: false, opacity: 100 },
    ], active: "layer-base", mode: "auto", focus: null },
    scrollToContent: true,
  };
}

export async function localMapImage(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 32 * 1024 ** 2) {
    throw new Error("请选择 32 MB 以内的 PNG、JPG 或 WebP 图像。");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

export function mapThumbnail(canvas) {
  const ratio = Math.min(1, 300 / Math.max(canvas.width, canvas.height));
  const cover = document.createElement("canvas");
  cover.width = Math.max(1, Math.round(canvas.width * ratio));
  cover.height = Math.max(1, Math.round(canvas.height * ratio));
  cover.getContext("2d").drawImage(canvas, 0, 0, cover.width, cover.height);
  return new Promise(resolve => cover.toBlob(resolve, "image/webp", .85));
}
