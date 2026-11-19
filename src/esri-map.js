export const esriImagery = {
  id: "esri",
  tiles: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  maxZoom: 19,
  credits: "Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community",
  item: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
};

const staticEndpoint = "https://static-maps-api.arcgis.com/arcgis/rest/services/static-maps-service/v1/static-maps/arcgis/imagery/with-point";
export const esriRadius = frame => frame && Math.min(frame.width, frame.height) * frame.metersPerPoint / 2;

export async function captureEsriMap(frame, key) {
  const radius = esriRadius(frame);
  if (!(radius >= 10 && radius <= 20000000)) throw new Error("Esri 静态底图的最短边至少需要覆盖 20 m，请缩小一点再试。");
  const [lng, lat] = frame.center;
  if (Math.abs(lng) > 179.9 || Math.abs(lat) > 85.05) throw new Error("该中心点超出了 Esri 静态地图范围。");
  const scale = 1024 / Math.max(frame.width, frame.height);
  const width = Math.max(128, Math.round(frame.width * scale));
  const height = Math.max(128, Math.round(frame.height * scale));
  const query = new URLSearchParams({
    x: String(lng), y: String(lat), centerX: String(lng), centerY: String(lat),
    width: String(width), height: String(height), radius: String(radius), padding: "0",
    symbolStyle: "none", referenceDetails: "none", format: "png", attribution: "auto",
  });
  let response;
  try {
    response = await fetch(staticEndpoint + "?" + query, {
      headers: { Authorization: "Bearer " + key },
      cache: "no-store", redirect: "error", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("无法连接 Esri 静态地图服务，请检查网络后重试。");
  }
  if ([401, 403, 498, 499].includes(response.status)) throw new Error("Esri 未授权本次请求，请检查 API 密钥是否有效并具备 Static Maps 权限。");
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
    throw new Error("Esri 未返回静态底图，请检查账户权限、额度和取景范围。");
  }
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    // Esri fits the requested diameter to the short side when padding is zero.
    const pointScale = Math.min(frame.width, frame.height) / Math.min(canvas.width, canvas.height);
    return { ...frame, width: canvas.width * pointScale, height: canvas.height * pointScale, canvas, embeddedAttribution: true };
  } finally {
    bitmap.close();
  }
}
