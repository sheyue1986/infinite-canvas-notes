const radians = Math.PI / 180;
const clamp = (value, min, max, fallback) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function normalizeStudy(value) {
  const now = new Date();
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(n => String(n).padStart(2, "0")).join("-");
  const sun = value?.sun;
  const section = value?.section;
  return {
    orientation: value?.orientation === "z" ? "z" : "y",
    sun: {
      mode: sun?.mode === "location" ? "location" : "manual",
      north: clamp(sun?.north, 0, 360, 0),
      azimuth: clamp(sun?.azimuth, 0, 360, 145),
      altitude: clamp(sun?.altitude, -10, 90, 51),
      lat: clamp(sun?.lat, -90, 90, 31.23),
      lon: clamp(sun?.lon, -180, 180, 121.47),
      utc: clamp(sun?.utc, -14, 14, 8),
      date: typeof sun?.date === "string" && /^(?:19\d{2}|20\d{2}|2100)-\d{2}-\d{2}$/.test(sun.date) && Number.isFinite(Date.parse(sun.date)) ? sun.date : date,
      time: typeof sun?.time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(sun.time) ? sun.time : "15:00",
    },
    section: {
      enabled: section?.enabled === true,
      axis: ["x", "y", "z"].includes(section?.axis) ? section.axis : "y",
      position: clamp(section?.position, 0, 100, 50),
      reverse: section?.reverse === true,
    },
    visibility: Object.fromEntries(Object.entries(value?.visibility || {}).filter(([id, visible]) =>
      /^(layer|node):[\d.]+$/.test(id) && typeof visible === "boolean")),
  };
}

// NOAA fractional-year approximation. Azimuth is clockwise from true north; longitude is east-positive.
export function solarPosition(sun) {
  if (sun.mode !== "location") return { azimuth: sun.azimuth, altitude: sun.altitude };
  const day = new Date(sun.date + "T00:00:00Z");
  const year = day.getUTCFullYear();
  const days = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 864e5;
  const ordinal = (day.getTime() - Date.UTC(year, 0, 1)) / 864e5;
  const [hour, minute] = sun.time.split(":").map(Number);
  const g = 2 * Math.PI / days * (ordinal + (hour + minute / 60 - 12) / 24);
  const c = Math.cos, s = Math.sin;
  const equation = 229.18 * (0.000075 + 0.001868 * c(g) - 0.032077 * s(g) - 0.014615 * c(2 * g) - 0.040849 * s(2 * g));
  const decl = 0.006918 - 0.399912 * c(g) + 0.070257 * s(g) - 0.006758 * c(2 * g) +
    0.000907 * s(2 * g) - 0.002697 * c(3 * g) + 0.00148 * s(3 * g);
  const h = ((hour * 60 + minute + equation + 4 * sun.lon - 60 * sun.utc) / 4 - 180) * radians;
  const lat = sun.lat * radians;
  const east = -c(decl) * s(h);
  const north = s(decl) * c(lat) - c(decl) * c(h) * s(lat);
  const up = s(decl) * s(lat) + c(decl) * c(h) * c(lat);
  return { azimuth: (Math.atan2(east, north) / radians + 360) % 360, altitude: Math.atan2(up, Math.hypot(east, north)) / radians };
}

export function sunVector(sun) {
  const { azimuth, altitude } = solarPosition(sun);
  const bearing = (azimuth + sun.north) * radians;
  const elevation = altitude * radians;
  return { altitude, direction: [Math.sin(bearing) * Math.cos(elevation), Math.sin(elevation), -Math.cos(bearing) * Math.cos(elevation)] };
}

function validTriple(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

// Homogeneous screen coordinates keep directions parallel to the screen usable.
export function guideDirection(point, at) {
  const [x, y, w] = point;
  const dx = x - at.x * w;
  const dy = y - at.y * w;
  const len = Math.hypot(dx, dy);
  return len > 1e-6 ? { x: dx / len, y: dy / len } : null;
}

export function drawingGuide(view, api) {
  if (!view || !api || !Array.isArray(view.guide?.vanishing)) return null;
  const image = api.getSceneElements().find(element =>
    element.id === view.underlayId && !element.isDeleted && element.opacity > 0);
  if (!image) return null;
  const { x, y, width, height } = image;
  const points = view.guide.vanishing.filter(validTriple).map(([px, py, w]) => [
    x * w + width * px, y * w + height * py, w,
  ]);
  return points.length === 3 ? { rect: { x, y, width, height }, points } : null;
}

export function snapPerspective(start, end, guide) {
  const rect = guide?.rect;
  if (!rect || start.x < rect.x || start.x > rect.x + rect.width ||
      start.y < rect.y || start.y > rect.y + rect.height) return end;
  const dx = end.x - start.x, dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 2) return end;
  let best = Math.cos(8 * radians) * length;
  let result = end;
  for (const point of guide.points) {
    const axis = guideDirection(point, start);
    if (!axis) continue;
    const dot = dx * axis.x + dy * axis.y;
    if (Math.abs(dot) > best) {
      best = Math.abs(dot);
      result = { x: start.x + dot * axis.x, y: start.y + dot * axis.y };
    }
  }
  return result;
}
