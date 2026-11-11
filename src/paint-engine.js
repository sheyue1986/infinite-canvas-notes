import { CaptureUpdateAction, convertToExcalidrawElements, newElementWith } from "@excalidraw/excalidraw";
import { dashPattern } from "./line-style.js";
import { brushControlValue, brushResponse, speedPressure } from "./brush-response.js";
import { fillPaint, isClosedOutline } from "./closed-fill.js";

const cap = 1400;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const image = source => new Promise((resolve, reject) => {
  const result = new Image();
  result.onload = () => resolve(result);
  result.onerror = reject;
  result.src = source;
});

function point(event, transform) {
  const pressure = event.pointerType === "pen" ? event.pressure : .6;
  return { x: (event.clientX - transform.left) / transform.zoom - transform.scrollX,
    y: (event.clientY - transform.top) / transform.zoom - transform.scrollY,
    p: clamp(pressure, .04, 1), tilt: Math.min(1, Math.hypot(event.tiltX || 0, event.tiltY || 0) / 75),
    angle: Math.atan2(event.tiltY || 0, event.tiltX || 0) };
}

function random(seed) {
  let value = seed;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

function tip(profile, mask) {
  const stamp = document.createElement("canvas");
  stamp.width = stamp.height = 96;
  const ctx = stamp.getContext("2d");
  const next = random(0x456f1b);
  const water = profile.engine === "water";
  if (mask) {
    ctx.drawImage(mask, 0, 0, 96, 96);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = profile.color;
    ctx.fillRect(0, 0, 96, 96);
  } else {
    ctx.fillStyle = profile.color;
    if (water) {
      const gradient = ctx.createRadialGradient(48, 48, 5, 48, 48, 47);
      gradient.addColorStop(0, profile.color + "db");
      gradient.addColorStop(.64, profile.color + "bb");
      gradient.addColorStop(.9, profile.color + "63");
      gradient.addColorStop(1, profile.color + "00");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 96, 96);
      ctx.fillStyle = profile.color;
    }
    for (let i = 0; i < (water ? 390 : 620); i++) {
      const a = next() * Math.PI * 2, r = Math.sqrt(next()) * 45;
      ctx.globalAlpha = next() * (water ? .22 : .86);
      ctx.beginPath();
      ctx.arc(48 + Math.cos(a) * r, 48 + Math.sin(a) * r, .55 + next() * 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return stamp;
}

const diameter = (profile, p) => profile.width * (profile.engine === "water" ? 5 : 4.25) * (.35 + p.p * 1.02);
const shape = profile => ({
  spacing: brushControlValue(profile, "spacing") / 100,
  scatter: brushControlValue(profile, "scatter") / 100,
  rotation: brushControlValue(profile, "rotation") * Math.PI / 180,
  flow: brushControlValue(profile, "flow") / 100,
});

function dab(ctx, stamp, profile, sample, rand, origin, scale, controls) {
  const d = diameter(profile, sample) * scale;
  const scatterAngle = controls.scatter ? rand() * Math.PI * 2 : 0;
  const offset = controls.scatter ? d * controls.scatter * .65 * rand() : 0;
  ctx.save();
  ctx.translate((sample.x - origin.x) * scale + Math.cos(scatterAngle) * offset,
    (sample.y - origin.y) * scale + Math.sin(scatterAngle) * offset);
  ctx.rotate((sample.tilt > .15 ? sample.angle : rand() * Math.PI) + controls.rotation);
  ctx.globalAlpha = (profile.engine === "water" ? .105 + sample.p * .11 : .32 + sample.p * .54) * controls.flow;
  const width = d * (1 + sample.tilt * .38);
  const height = d * (1 - sample.tilt * .24);
  ctx.drawImage(stamp, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function sampler(profile, stamp, ctx, origin, scale) {
  const rand = random(12376);
  const controls = shape(profile);
  const pattern = profile.strokeStyle === "dashed" ? dashPattern(profile.width, profile.dashDensity, profile.engine === "water" ? 5 : 4.25) : null;
  let carry = 0, prev, count = 0, travel = 0;
  return sample => {
    if (!prev) { prev = sample; dab(ctx, stamp, profile, sample, rand, origin, scale, controls); return; }
    const distance = Math.hypot(sample.x - prev.x, sample.y - prev.y);
    const step = Math.max(.7, diameter(profile, sample) * controls.spacing);
    carry %= step;
    for (let offset = Math.max(.01, step - carry); offset <= distance && count < 6500; offset += step) {
      const fraction = offset / distance;
      if (!pattern || (travel + offset) % (pattern[0] + pattern[1]) < pattern[0]) {
        dab(ctx, stamp, profile, { ...sample, x: prev.x + (sample.x - prev.x) * fraction,
          y: prev.y + (sample.y - prev.y) * fraction, p: prev.p + (sample.p - prev.p) * fraction }, rand, origin, scale, controls);
      }
      count++;
    }
    carry = (carry + distance) % step;
    if (pattern) travel += distance;
    prev = sample;
  };
}

function brushBounds(samples, profile) {
  let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity;
  const scatter = shape(profile).scatter;
  for (const sample of samples) {
    const pad = diameter(profile, sample) * (.8 + .65 * scatter) + 2;
    x = Math.min(x, sample.x - pad); y = Math.min(y, sample.y - pad);
    right = Math.max(right, sample.x + pad); bottom = Math.max(bottom, sample.y + pad);
  }
  return { x, y, right, bottom };
}

function applyResponse(sample, previous, profile) {
  const dynamics = profile.dynamics;
  const distance = previous ? Math.hypot(sample.x - previous.x, sample.y - previous.y) : 0;
  const input = dynamics === "speed" || dynamics === "inverse" ? speedPressure(distance, profile.width, dynamics) : sample.p;
  return { ...sample, p: dynamics === "fixed" ? .5 : brushResponse(input, profile) };
}

function traceStroke(trace, samples, smoothing) {
  if (smoothing === 1 && samples.length > 1) {
    [samples[0], samples.at(-1)].forEach(trace);
    return;
  }
  samples.forEach((sample, index) => {
    if (!index || index === samples.length - 1 || !smoothing) { trace(sample); return; }
    const a = samples[index - 1], b = samples[index + 1];
    trace({ ...sample, x: sample.x + ((a.x + b.x) / 2 - sample.x) * smoothing,
      y: sample.y + ((a.y + b.y) / 2 - sample.y) * smoothing });
  });
}

export function renderPaintPreview(ctx, profile, samples, mask, scale) {
  const stamp = tip(profile, profile.engine === "stamp" ? mask : null);
  const trace = sampler(profile, stamp, ctx, { x: 0, y: 0 }, scale);
  traceStroke(trace, samples.map((sample, index) => applyResponse(sample, samples[index - 1], profile)), profile.smoothing / 100);
}

const overlaps = (a, b) => a.x < b.x + b.width && a.right > b.x && a.y < b.y + b.height && a.bottom > b.y;
const asURL = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => {
  if (!blob) { reject(new Error("PNG encoding failed")); return; }
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
}, "image/png"));

export function imageTint(element) {
  const tint = element.customData?.imageTint;
  return element.type === "image" && tint?.fileId === element.fileId ? tint : null;
}

export function sceneImageFileIds(elements) {
  const ids = new Set();
  for (const element of elements) {
    if (element.isDeleted || element.type !== "image") continue;
    if (element.fileId) ids.add(element.fileId);
    const sourceId = imageTint(element)?.sourceId;
    if (sourceId) ids.add(sourceId);
    if (element.customData?.icnVideoId) ids.add(element.customData.icnVideoId);
  }
  return ids;
}

export async function tintImage(source, color, pigment) {
  const original = await image(source.dataURL);
  const { naturalWidth: width, naturalHeight: height } = original;
  if (!width || !height || width * height > 16_777_216) throw new Error("Image exceeds the tint size limit");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    const ctx = canvas.getContext("2d");
    ctx.drawImage(original, 0, 0);
    ctx.globalCompositeOperation = pigment ? "source-in" : "color";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    if (!pigment) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(original, 0, 0);
    }
    return { id: crypto.randomUUID(), dataURL: await asURL(canvas), mimeType: "image/png", created: Date.now() };
  } finally { canvas.width = canvas.height = 0; }
}

export function makePaintEngine(canvasRef, apiRef, resolveLayer) {
  let gesture, pending = Promise.resolve(), serial = 0, closed = false;
  let maskSource, mask, lastTip;
  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };
  const texture = source => {
    if (source === maskSource) return;
    maskSource = source;
    mask = null;
    if (source) void image(source).then(value => { if (maskSource === source) mask = value; }).catch(() => {});
  };
  const start = (event, profile) => {
    const api = apiRef.current, canvas = canvasRef.current;
    if (closed || !api || !canvas || !profile?.engine || event.button !== 0 || !event.isPrimary || event.pointerType === "touch") return false;
    texture(profile.texture);
    const state = api.getAppState();
    const zoom = state.zoom.value;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(1.5, window.devicePixelRatio || 1, 1900 / Math.max(rect.width, rect.height));
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
    const transform = { zoom, left: state.offsetLeft, top: state.offsetTop, scrollX: state.scrollX, scrollY: state.scrollY };
    const bitmap = profile.engine === "stamp" ? mask : null;
    if (lastTip?.color !== profile.color || lastTip.engine !== profile.engine || lastTip.bitmap !== bitmap) {
      lastTip = { color: profile.color, engine: profile.engine, bitmap, stamp: tip(profile, bitmap) };
    }
    const stamp = lastTip.stamp;
    const first = applyResponse(point(event, transform), null, profile);
    const ctx = canvas.getContext("2d");
    const preview = sampler(profile, stamp, ctx, { x: (rect.left - transform.left) / zoom - state.scrollX,
      y: (rect.top - transform.top) / zoom - state.scrollY }, zoom * scale);
    canvas.style.opacity = profile.opacity / 100;
    preview(first);
    event.target.setPointerCapture(event.pointerId);
    gesture = { id: ++serial, pointer: event.pointerId, samples: [first], preview, profile, stamp, transform, api,
      layer: resolveLayer(profile), bounds: null };
    return true;
  };
  const move = event => {
    if (!gesture || event.pointerId !== gesture.pointer) return false;
    const native = event.nativeEvent || event;
    const events = native.getCoalescedEvents?.() || [];
    for (const sample of events.length ? events : [native]) {
      if (gesture.samples.length >= 6000) break;
      const last = gesture.samples.at(-1);
      const p = applyResponse(point(sample, gesture.transform), last, gesture.profile);
      if (Math.hypot(last.x - p.x, last.y - p.y) < .2) continue;
      gesture.samples.push(p);
      gesture.preview(p);
    }
    return true;
  };
  const commit = async item => {
    const { profile, samples, stamp, api } = item;
    const color = fillPaint(profile);
    const smoothing = profile.smoothing / 100;
    const outline = [];
    if (color !== "transparent") traceStroke(point => outline.push([point.x, point.y]), samples, smoothing);
    const fill = isClosedOutline(outline);
    const hasInk = profile.opacity > 0 && brushControlValue(profile, "flow") > 0;
    if (closed || (!hasInk && !fill) || apiRef.current !== api) return;
    const layer = resolveLayer(profile, item.layer);
    if (!layer.allowed) return;
    let bounds = brushBounds(samples, profile), previous, prior;
    if (profile.engine === "water" && !fill && !item.skipBlend) {
      const current = api.getSceneElements();
      const top = current.findLast(element => (element.customData?.infiniteLayer || "layer-base") === layer.id);
      if (top?.customData?.paintKind === "water" && !top.customData.infinitePaintFill && top.type === "image" && !top.locked && !top.angle &&
          !top.crop && top.scale?.every(value => value === 1) && overlaps(bounds, top)) {
        const expanded = { x: Math.min(bounds.x, top.x), y: Math.min(bounds.y, top.y),
          right: Math.max(bounds.right, top.x + top.width), bottom: Math.max(bounds.bottom, top.y + top.height) };
        const maxSize = Math.max(expanded.right - expanded.x, expanded.bottom - expanded.y);
        const original = api.getFiles()[top.fileId];
        if (original && maxSize <= cap * 1.45) {
          prior = await image(original.dataURL).catch(() => null);
          if (prior) { bounds = expanded; previous = top; }
        }
      }
    }
    const w = bounds.right - bounds.x, h = bounds.bottom - bounds.y;
    const scale = Math.min(1.5, cap / Math.max(w, h));
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.ceil(w * scale));
    output.height = Math.max(1, Math.ceil(h * scale));
    const ctx = output.getContext("2d");
    if (prior) ctx.drawImage(prior, (previous.x - bounds.x) * scale, (previous.y - bounds.y) * scale,
      previous.width * scale, previous.height * scale);
    if (fill) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const [x, y] of outline) ctx.lineTo((x - bounds.x) * scale, (y - bounds.y) * scale);
      ctx.closePath();
      ctx.fill("evenodd");
    }
    const ink = document.createElement("canvas");
    ink.width = output.width;
    ink.height = output.height;
    const trace = sampler(profile, stamp, ink.getContext("2d"), bounds, scale);
    if (hasInk) traceStroke(trace, samples, smoothing);
    ctx.globalAlpha = profile.opacity / 100;
    ctx.globalCompositeOperation = prior ? "multiply" : "source-over";
    ctx.drawImage(ink, 0, 0);
    const dataURL = await asURL(output);
    if (closed || apiRef.current !== api) return;
    const all = api.getSceneElementsIncludingDeleted();
    if (previous && all.find(element => element.id === previous.id) !== previous) return commit({ ...item, skipBlend: true });
    const fileId = crypto.randomUUID();
    const geometry = { x: bounds.x, y: bounds.y, width: output.width / scale, height: output.height / scale, fileId };
    api.addFiles([{ id: fileId, dataURL, mimeType: "image/png", created: Date.now() }]);
    const customData = { paintKind: profile.engine, infiniteBrush: { id: profile.id, name: profile.name, color: profile.color },
      ...(fill && { infinitePaintFill: true }),
      ...(layer.id && { infiniteLayer: layer.id }) };
    const next = previous ? all.map(element => {
      if (element.id !== previous.id) return element;
      const data = { ...element.customData, infiniteBrush: { id: profile.id, name: profile.name } };
      delete data.imageTint;
      return newElementWith(element, { ...geometry, customData: data });
    })
      : [...all, ...convertToExcalidrawElements([{ type: "image", status: "saved", ...geometry }])
        .map(element => newElementWith(element, { customData }))];
    api.updateScene({ elements: next, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  };
  const end = (event, cancel = false) => {
    if (!gesture || event.pointerId !== gesture.pointer) return false;
    const item = gesture;
    gesture = null;
    if (cancel) { clear(); return true; }
    const last = point(event, item.transform);
    last.p = item.samples.at(-1).p;
    if (Math.hypot(last.x - item.samples.at(-1).x, last.y - item.samples.at(-1).y) > .2) item.samples.push(last);
    pending = pending.then(() => commit(item)).catch(() => item.api.setToast({ message: "笔迹未保存，请重试。" }))
      .finally(() => { if (item.id === serial) clear(); });
    return true;
  };
  return { start, move, end, texture, idle: () => pending,
    cancel: () => { gesture = null; clear(); }, close: () => { closed = true; gesture = null; clear(); } };
}

export async function importStamp(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 96 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const transparent = pixels.data.some((value, index) => index % 4 === 3 && value < 250);
  if (!transparent) {
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i + 3] = 255 - (.2126 * pixels.data[i] + .7152 * pixels.data[i + 1] + .0722 * pixels.data[i + 2]);
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 0;
    }
    ctx.putImageData(pixels, 0, 0);
  }
  return canvas.toDataURL("image/png");
}
