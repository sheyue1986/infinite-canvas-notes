import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

export const streetCredits = "OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors";
export const streetLicense = "https://www.openstreetmap.org/copyright";

export function coordinates(text) {
  const pair = /^\s*([+-]?\d+(?:\.\d+)?)\s*[,，]\s*([+-]?\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!pair) return null;
  const lat = Number(pair[1]), lng = Number(pair[2]);
  if (Math.abs(lat) > 85.05 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}

export function sceneFromMap({ canvas, width, height, metersPerPoint, source, center, bounds, zoom }) {
  if (![width, height, metersPerPoint].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error("底图的范围或比例无效。");
  }
  const created = Date.now();
  const fileId = crypto.randomUUID(), layerId = crypto.randomUUID();
  const credits = source === "street" ? streetCredits : undefined;
  const metadata = { source, metersPerPoint, center, bounds, zoom, credits, created };
  const [image] = convertToExcalidrawElements([{
    type: "image", x: 0, y: 0, width, height, fileId, status: "saved", locked: true,
    customData: {
      infiniteLayer: layerId, infiniteMap: metadata,
      infiniteLayerStyle: { opacity: 100, locked: false, shownOpacity: 100, shownLocked: true },
    },
  }]);
  const mimeType = source === "street" ? "image/jpeg" : "image/png";
  return {
    elements: [image],
    files: { [fileId]: { id: fileId, dataURL: canvas.toDataURL(mimeType, .94), mimeType, created } },
    precision: { unit: "m", scale: metersPerPoint, measure: true, mapScale: { source, metersPerPoint } },
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
    const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
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
