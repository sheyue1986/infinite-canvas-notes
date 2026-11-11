const formats = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
  svg: "image/svg+xml", bmp: "image/bmp", ico: "image/x-icon", avif: "image/avif",
  mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", ogv: "video/ogg", mov: "video/quicktime" };

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function poster(file, video) {
  const url = URL.createObjectURL(file);
  const media = document.createElement(video ? "video" : "img");
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Media load timeout")), 12000);
      const done = action => () => { clearTimeout(timer); action(); };
      media.onerror = done(() => reject(new Error("Unsupported media")));
      if (video) {
        media.muted = true;
        media.preload = "auto";
        media.onloadeddata = done(resolve);
      } else media.onload = done(resolve);
      media.src = url;
    });
    const width = video ? media.videoWidth : media.naturalWidth;
    const height = video ? media.videoHeight : media.naturalHeight;
    if (!width || !height) throw new Error("Invalid media dimensions");
    if (!video) return { width, height };
    const scale = Math.min(1, 1280 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d").drawImage(media, 0, 0, canvas.width, canvas.height);
    return { width, height, dataURL: canvas.toDataURL("image/jpeg", .87) };
  } finally {
    media.removeAttribute("src");
    if (video) media.load();
    URL.revokeObjectURL(url);
  }
}

export async function insertCanvasMedia(apiRef, file, convert, capture, zh) {
  const api = apiRef.current;
  if (!api || api.getAppState().viewModeEnabled || !file) return;
  const mimeType = formats[file.name.split(".").at(-1).toLowerCase()];
  const video = mimeType?.startsWith("video/");
  const maxSize = video ? 100_000_000 : 25_000_000;
  const toast = (chinese, english) => apiRef.current === api && api.setToast({ message: zh ? chinese : english });
  if (!mimeType || file.size > maxSize) {
    toast("请选择受支持的媒体文件（图片最多 25 MB，视频最多 100 MB）。", "Choose a supported file (images up to 25 MB, videos up to 100 MB).");
    return;
  }
  try {
    const typed = new Blob([file], { type: mimeType });
    const [dataURL, preview] = await Promise.all([readFile(typed), poster(typed, video)]);
    if (apiRef.current !== api || api.getAppState().viewModeEnabled) return;
    const state = api.getAppState();
    const zoom = state.zoom.value;
    const scale = Math.min(1, state.width * .65 / zoom / preview.width, state.height * .65 / zoom / preview.height);
    const width = preview.width * scale, height = preview.height * scale;
    const x = state.width / (2 * zoom) - state.scrollX - width / 2;
    const y = state.height / (2 * zoom) - state.scrollY - height / 2;
    const fileId = crypto.randomUUID();
    const mediaId = video ? crypto.randomUUID() : fileId;
    const created = Date.now();
    const files = [{ id: fileId, mimeType: video ? "image/jpeg" : mimeType, dataURL: video ? preview.dataURL : dataURL, created }];
    if (video) files.push({ id: mediaId, mimeType, dataURL, created });
    const [element] = convert([{ type: "image", x, y, width, height, fileId, status: "saved",
      ...(video && { customData: { icnVideoId: mediaId, icnMediaName: file.name } }) }]);
    api.addFiles(files);
    api.setActiveTool({ type: "selection" });
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), element],
      appState: { selectedElementIds: { [element.id]: true }, selectedGroupIds: {}, showHyperlinkPopup: false },
      captureUpdate: capture,
    });
    document.querySelector(".canvas-shell .excalidraw")?.focus({ preventScroll: true });
  } catch {
    toast("无法读取该媒体，视频可尝试 MP4（H.264）或 WebM。", "The file could not be read. Try MP4 (H.264) or WebM for video.");
  }
}

export function chooseCanvasMedia(apiRef, convert, capture, zh) {
  if (apiRef.current?.getAppState().viewModeEnabled) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = Object.keys(formats).map(ext => "." + ext).join(",");
  input.setAttribute("aria-label", zh ? "导入图片、GIF 或视频" : "Import an image, GIF, or video");
  input.hidden = true;
  document.body.append(input);
  const owner = apiRef.current;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.remove();
    if (apiRef.current === owner) void insertCanvasMedia(apiRef, file, convert, capture, zh);
  }, { once: true });
  input.addEventListener("cancel", () => input.remove(), { once: true });
  input.click();
}

export function mediaSource(element, files) {
  if (element.type !== "image" || !element.opacity || element.isDeleted) return null;
  const id = element.customData?.icnVideoId;
  const file = files[id || element.fileId];
  if (id && /^data:video\/(mp4|webm|ogg|quicktime);base64,/.test(file?.dataURL)) return { kind: "video", url: file.dataURL };
  if (!element.crop && /^data:image\/gif;base64,/.test(file?.dataURL)) return { kind: "gif", url: file.dataURL };
  return null;
}

export function createMediaLayer(React) {
  const { createElement: h, useEffect, useState } = React;
  return function CanvasMedia({ apiRef, ready, zh }) {
    const [snapshot, setSnapshot] = useState(null);
    const [playing, setPlaying] = useState(null);
    useEffect(() => {
      if (!ready) return;
      let api, unsubscribeChange, unsubscribeScroll, binding;
      let handle, previous, any;
      const refresh = () => {
        handle = null;
        const state = api.getAppState();
        const files = api.getFiles();
        const scene = api.getSceneElements();
        const signature = [scene, files, state.zoom.value, state.scrollX, state.scrollY, state.offsetLeft, state.offsetTop, state.width, state.height];
        if (previous?.every((item, index) => item === signature[index])) return;
        previous = signature;
        const media = scene.flatMap(element => {
          const source = mediaSource(element, files);
          return source ? [{ element, source }] : [];
        });
        if (any || media.length) setSnapshot(media.length ? { state, media } : null);
        any = media.length;
      };
      const schedule = () => { if (handle == null) handle = requestAnimationFrame(refresh); };
      const bind = () => {
        api = apiRef.current;
        if (!api) { binding = requestAnimationFrame(bind); return; }
        unsubscribeChange = api.onChange(schedule);
        unsubscribeScroll = api.onScrollChange(schedule);
        schedule();
      };
      bind();
      return () => { unsubscribeChange?.(); unsubscribeScroll?.(); cancelAnimationFrame(handle); cancelAnimationFrame(binding); };
    }, [apiRef, ready]);
    if (!snapshot) return null;
    const { media, state } = snapshot;
    const zoom = state.zoom.value;
    return h("div", { className: "icn-media-layer", style: { left: state.offsetLeft, top: state.offsetTop, width: state.width, height: state.height } },
      media.map(({ element, source }) => {
        const { x, y, width, height, angle, opacity } = element;
        const style = {
          left: (x + state.scrollX) * zoom, top: (y + state.scrollY) * zoom, width: width * zoom, height: height * zoom,
          transform: `rotate(${angle}rad) scale(${element.scale?.[0] ?? 1},${element.scale?.[1] ?? 1})`, opacity: opacity / 100,
        };
        const stop = event => event.stopPropagation();
        return h("div", { key: element.id, className: "icn-media-object", style },
          source.kind === "gif" ? h("img", { src: source.url, alt: "", draggable: false }) :
            playing === element.id ? h(React.Fragment, null,
              h("video", { src: source.url, controls: true, autoPlay: true, playsInline: true, onPointerDown: stop }),
              h("button", { type: "button", className: "icn-video-close", "aria-label": zh ? "关闭视频" : "Close video", onClick: () => setPlaying(null) }, "×")) :
              h("button", { type: "button", className: "icn-video-play", title: zh ? "播放视频" : "Play video",
                "aria-label": zh ? "播放视频" : "Play video", onClick: () => setPlaying(element.id) }, "▶"));
      }));
  };
}
