import { mediaSource } from "./canvas-media.js";

const isFrame = element => element.type === "frame" || element.type === "magicframe";
const slidesIn = elements => elements.filter(isFrame)
  .sort((a, b) => (a.customData?.icnSlide?.order ?? Infinity) - (b.customData?.icnSlide?.order ?? Infinity));
const titleOf = (frame, index, zh) => frame.name || (zh ? "第 " + (index + 1) + " 页" : "Slide " + (index + 1));
const notesOf = frame => frame.customData?.icnSlide?.notes || "";
const revealOf = element => element.customData?.icnSlideStep || 0;

function slideContent(scene, frame) {
  return scene.filter(element => !isFrame(element) && (element.frameId === frame.id ||
    element.x < frame.x + frame.width && element.x + element.width > frame.x &&
    element.y < frame.y + frame.height && element.y + element.height > frame.y));
}

async function slideImage(exportCanvas, api, frame, content, size) {
  if (!content.length) {
    const blank = document.createElement("canvas");
    const scale = Math.min(size / Math.max(1, frame.width, frame.height), 1);
    blank.width = Math.max(1, Math.round(frame.width * scale));
    blank.height = Math.max(1, Math.round(frame.height * scale));
    const context = blank.getContext("2d");
    context.fillStyle = api.getAppState().viewBackgroundColor || "#ffffff";
    context.fillRect(0, 0, blank.width, blank.height);
    return blank.toDataURL("image/jpeg", .92);
  }
  const canvas = await exportCanvas({
    elements: content, files: api.getFiles(), exportingFrame: frame, exportPadding: 0,
    appState: { ...api.getAppState(), exportScale: 1, exportBackground: true, exportWithDarkMode: api.getAppState().theme === "dark" },
    maxWidthOrHeight: size,
  });
  return canvas.toDataURL("image/jpeg", .92);
}

function slideMedia(api, frame, content) {
  const files = api.getFiles();
  return content.flatMap(element => {
    const source = mediaSource(element, files);
    if (!source) return [];
    return [{ ...source, id: element.id,
      left: (element.x - frame.x) / frame.width * 100, top: (element.y - frame.y) / frame.height * 100,
      width: element.width / frame.width * 100, height: element.height / frame.height * 100,
      angle: element.angle, opacity: element.opacity / 100,
    }];
  });
}

function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function portableSlides(slides, title) {
  const text = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const pages = slides.map(slide => "<img alt=\"" + text(slide.name) + "\" src=\"" + slide.image + "\" hidden>").join("");
  return new Blob([`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${text(title)}</title>
    <style>body{margin:0;background:#16161b;color:white;font:16px system-ui;text-align:center}main{display:grid;place-items:center;height:calc(100dvh - 52px)}img{max-width:100%;max-height:calc(100dvh - 52px)}button{margin:7px;padding:5px 14px}</style></head>
    <body><main>${pages}</main><button id="previous" aria-label="上一页">←</button><output></output><button id="next" aria-label="下一页">→</button>
    <script>const slides=[...document.querySelectorAll("main img")];let index=0;function show(next){index=Math.min(slides.length-1,Math.max(0,next));slides.forEach((slide,i)=>slide.hidden=i!==index);document.querySelector("output").textContent=(index+1)+" / "+slides.length}
    document.getElementById("previous").onclick=()=>show(index-1);document.getElementById("next").onclick=()=>show(index+1);
    addEventListener("keydown",e=>{if(["ArrowRight","ArrowDown","PageDown"," "].includes(e.key)){e.preventDefault();show(index+1)}if(["ArrowLeft","ArrowUp","PageUp"].includes(e.key)){e.preventDefault();show(index-1)}});show(0);</script></body></html>`],
  { type: "text/html;charset=utf-8" });
}

export function createCanvasPresentations(React, { exportCanvas, convert, update, capture }) {
  const { createElement: h, useState, useEffect, useRef } = React;
  const button = (label, action, props = {}) => h("button", { type: "button", onClick: action, ...props }, label);
  function Player({ api, frames, scene, initial, thumbnails, zh, close }) {
    const t = (a, b) => zh ? a : b;
    const dialog = useRef(null), dot = useRef(null);
    const [index, setIndex] = useState(initial);
    const [step, setStep] = useState(0);
    const [image, setImage] = useState("");
    const [laser, setLaser] = useState(false);
    const [presenter, setPresenter] = useState(false);
    const [failure, setFailure] = useState(false);
    const frame = frames[index];
    const content = slideContent(scene, frame);
    const lastStep = Math.max(0, ...content.map(revealOf));
    const visible = content.filter(element => revealOf(element) <= step);
    function move(amount) {
      if (amount > 0 && step < lastStep) { setStep(step + 1); return; }
      if (amount < 0 && step > 0) { setStep(step - 1); return; }
      const next = Math.min(frames.length - 1, Math.max(0, index + amount));
      if (next !== index) { setIndex(next); setStep(0); }
    }
    useEffect(() => { dialog.current.showModal(); }, []);
    useEffect(() => {
      let current = true;
      setFailure(false);
      void slideImage(exportCanvas, api, frame, visible, 1800).then(url => { if (current) setImage(url); })
        .catch(() => { if (current) setFailure(true); });
      return () => { current = false; };
    }, [api, frame, step, scene]);
    function keys(event) {
      if (event.target.closest("input, textarea, select, video") || (event.key === " " && event.target.closest("button"))) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) { event.preventDefault(); move(1); }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) { event.preventDefault(); move(-1); }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault(); setIndex(event.key === "Home" ? 0 : frames.length - 1); setStep(0);
      }
      event.stopPropagation();
    }
    function toggleFull() {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      else void dialog.current?.requestFullscreen?.().catch(() => {});
    }
    const pointer = event => {
      if (!dot.current || !laser) return;
      const rect = event.currentTarget.getBoundingClientRect();
      dot.current.style.left = (event.clientX - rect.left) + "px";
      dot.current.style.top = (event.clientY - rect.top) + "px";
      dot.current.hidden = false;
    };
    return h("dialog", {
      ref: dialog, className: "icn-slideshow", "aria-label": t("幻灯片演示", "Slide presentation"),
      onCancel: event => { event.preventDefault(); close(); }, onKeyDown: keys,
    },
    h("header", null, h("strong", null, titleOf(frame, index, zh)),
      button(t("激光笔", "Laser pointer"), () => { setLaser(!laser); if (dot.current) dot.current.hidden = true; }, { "aria-pressed": laser }),
      button(t("演讲者视图", "Presenter view"), () => setPresenter(!presenter), { "aria-pressed": presenter }),
      button(t("全屏", "Full screen"), toggleFull), button(t("退出演示", "Exit presentation"), close)),
    h("div", { className: "icn-slide-body" },
      h("div", { className: "icn-slide-stage", onPointerMove: pointer, onPointerLeave: () => { if (dot.current) dot.current.hidden = true; } },
        failure ? h("p", { role: "status" }, t("此页无法渲染。", "This slide could not be rendered.")) : image &&
          h("div", { className: "icn-slide-picture", style: { "--slide-ratio": Math.max(.1, frame.width / Math.max(1, frame.height)) } },
            h("img", { src: image, alt: titleOf(frame, index, zh) }),
            ...slideMedia(api, frame, visible).map(item => h(item.kind === "video" ? "video" : "img", {
              key: item.id, src: item.url, ...(item.kind === "video" ? { controls: true, playsInline: true } : { alt: "" }),
              className: "icn-slide-media",
              style: { left: item.left + "%", top: item.top + "%", width: item.width + "%", height: item.height + "%",
                opacity: item.opacity, transform: `rotate(${item.angle}rad)` },
            }))),
        laser && h("span", { ref: dot, className: "icn-slide-laser", hidden: true })),
      presenter && h("aside", { className: "icn-presenter-notes" },
        h("h3", null, t("演讲者备注", "Speaker notes")),
        h("p", null, notesOf(frame) || t("此页暂无备注。", "No notes for this slide.")),
        frames[index + 1] && h(React.Fragment, null,
          h("h3", null, t("下一页", "Next slide")), h("p", null, titleOf(frames[index + 1], index + 1, zh)),
          thumbnails[frames[index + 1].id] && h("img", { src: thumbnails[frames[index + 1].id], alt: "" })))),
    h("footer", null, button(t("上一页", "Previous slide"), () => move(-1), { disabled: !index && !step }),
      h("output", null, (index + 1) + " / " + frames.length + (lastStep ? ` · ${step + 1} / ${lastStep + 1}` : "")),
      button(t("下一页", "Next slide"), () => move(1), { disabled: index === frames.length - 1 && step >= lastStep })));
  }

  return function Presentations({ apiRef, zh }) {
    const t = (a, b) => zh ? a : b;
    const api = apiRef.current;
    const [scene, setScene] = useState(() => api?.getSceneElements() ?? []);
    const [thumbnails, setThumbnails] = useState({});
    const [active, setActive] = useState(null);
    const [play, setPlay] = useState(null);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");
    const frames = slidesIn(scene);
    const selected = frames.find(frame => frame.id === active) ?? frames[0];
    useEffect(() => api?.onChange(elements => setScene(current => current === elements ? current : elements)), [api]);
    useEffect(() => {
      if (!api) return;
      let current = true;
      const timer = setTimeout(async () => {
        for (const frame of slidesIn(scene)) {
          try {
            const image = await slideImage(exportCanvas, api, frame, slideContent(scene, frame), 380);
            if (!current) break;
            setThumbnails(old => ({ ...old, [frame.id]: image }));
          } catch { /* A failed preview does not block other slides. */ }
          if (!current) break;
        }
      }, 160);
      return () => { current = false; clearTimeout(timer); };
    }, [api, scene]);
    const commit = edits => api.updateScene({
      elements: api.getSceneElementsIncludingDeleted().map(element => edits.get(element.id) || element), captureUpdate: capture,
    });
    function meta(frame, patch) {
      return update(frame, { customData: { ...frame.customData, icnSlide: { ...frame.customData?.icnSlide, ...patch } } });
    }
    function reorder(index, offset) {
      const ordered = slidesIn(api.getSceneElements());
      const id = frames[index]?.id;
      const position = ordered.findIndex(frame => frame.id === id), other = position + offset;
      if (position < 0 || other < 0 || other >= ordered.length) return;
      [ordered[position], ordered[other]] = [ordered[other], ordered[position]];
      commit(new Map(ordered.map((frame, order) => [frame.id, meta(frame, { order })])));
    }
    function reveal(reset) {
      const state = api.getAppState();
      const content = slideContent(api.getSceneElements(), selected);
      const targets = content.filter(element => state.selectedElementIds[element.id] && !element.locked);
      if (!targets.length) { setStatus(t("请先选中此页画框内的对象。", "Select objects inside this slide.")); return; }
      const step = reset ? 0 : Math.max(0, ...content.map(revealOf)) + 1;
      const ids = new Set(targets.flatMap(element => [element.id, ...(element.boundElements ?? []).filter(binding => binding.type === "text").map(binding => binding.id)]));
      commit(new Map(content.filter(element => ids.has(element.id)).map(element => [element.id, update(element, {
        customData: { ...element.customData, icnSlideStep: step },
      })])));
      setStatus(reset ? t("已取消选中对象的逐步出现。", "Reveals cleared for selected objects.") : t("已设为第 " + step + " 步出现。", "Set to appear at step " + step + "."));
    }
    function newFrame() {
      const state = api?.getAppState();
      if (!state || state.viewModeEnabled) return;
      const latest = api.getSceneElements(), ordered = slidesIn(latest), last = ordered.at(-1);
      const zoom = state.zoom.value, width = 960, height = 540;
      const x = last ? last.x + last.width + 60 : state.width / zoom / 2 - state.scrollX - width / 2;
      const y = last?.y ?? state.height / zoom / 2 - state.scrollY - height / 2;
      const [frame] = convert([{ type: "frame", name: t("第 " + (ordered.length + 1) + " 页", "Slide " + (ordered.length + 1)),
        x, y, width, height, children: [] }]);
      api.setActiveTool({ type: "selection" });
      api.updateScene({ elements: [...api.getSceneElementsIncludingDeleted(), frame],
        appState: { selectedElementIds: { [frame.id]: true }, selectedGroupIds: {} }, captureUpdate: capture });
      setActive(frame.id);
      api.scrollToContent([frame], { fitToContent: true, animate: true });
    }
    async function exportSlides(format) {
      if (!api || busy) return;
      const latest = api.getSceneElements();
      const ordered = slidesIn(latest);
      if (!ordered.length) return;
      setBusy(true);
      setStatus(t("正在导出…", "Exporting…"));
      try {
        const title = (api.getName?.() || t("演示文稿", "Presentation")).replace(/[<>:"/\\|?*]/g, "-");
        const output = [];
        for (const [index, frame] of ordered.entries()) output.push({
          name: titleOf(frame, index, zh), notes: notesOf(frame),
          width: Math.max(1, frame.width), height: Math.max(1, frame.height),
          image: await slideImage(exportCanvas, api, frame, slideContent(latest, frame), 1920),
        });
        let blob;
        if (format === "html") blob = portableSlides(output, title);
        else {
          const { makeSlidePdf, makeSlidePptx } = await import("./presentation-export.js");
          blob = format === "pdf" ? await makeSlidePdf(output) : await makeSlidePptx(output, title);
        }
        saveFile(blob, title + "." + format);
        setStatus(t("已导出 " + format.toUpperCase(), "Exported " + format.toUpperCase()));
      } catch {
        setStatus(t("导出失败，请重试。", "Export failed. Try again."));
      } finally { setBusy(false); }
    }
    const viewOnly = api?.getAppState().viewModeEnabled;
    return h("div", { className: "icn-sidebar-tool icn-deck" },
      h("h2", null, t("演示文稿", "Presentations")),
      h("div", { className: "icn-deck-actions" },
        button(t("新建幻灯片", "New slide"), newFrame, { disabled: !api || viewOnly }),
        button(t("框选内容", "Frame content"), () => api?.setActiveTool({ type: "frame" }), { disabled: !api || viewOnly }),
        button(t("开始演示", "Present"), () => setPlay(Math.max(0, frames.indexOf(selected))), { disabled: !frames.length, className: "icn-sidebar-action" })),
      !frames.length && h("p", null, t("画布上的画框会自动成为幻灯片。", "Canvas frames appear here as slides.")),
      ...frames.map((frame, index) => h("div", { className: "icn-slide-card", key: frame.id, "data-active": selected?.id === frame.id },
        button(h(React.Fragment, null,
          thumbnails[frame.id] && h("img", { alt: "", src: thumbnails[frame.id] }),
          h("span", null, (index + 1) + ". " + titleOf(frame, index, zh))),
        () => { setActive(frame.id); api.scrollToContent([frame], { fitToContent: true, animate: true }); },
        { className: "icn-slide-thumbnail", "aria-pressed": selected?.id === frame.id }),
        h("div", { className: "icn-deck-actions" },
          button("↑", () => reorder(index, -1), { disabled: viewOnly || index === 0, "aria-label": t("上移幻灯片", "Move slide up") }),
          button("↓", () => reorder(index, 1), { disabled: viewOnly || index === frames.length - 1, "aria-label": t("下移幻灯片", "Move slide down") })))),
      selected && h(React.Fragment, null,
        h("label", null, t("演讲者备注", "Speaker notes"),
          h("textarea", { key: selected.id, rows: 3, maxLength: 12000, defaultValue: notesOf(selected), disabled: viewOnly,
            onBlur: event => {
              const frame = api.getSceneElements().find(element => element.id === selected.id);
              if (frame && notesOf(frame) !== event.target.value) commit(new Map([[frame.id, meta(frame, { notes: event.target.value })]]));
            } })),
        !viewOnly && h("div", { className: "icn-deck-actions" },
          button(t("选中对象下一步出现", "Reveal selected objects next"), () => reveal(false)),
          button(t("取消逐步出现", "Clear reveal"), () => reveal(true))),
        h("div", { className: "icn-deck-actions" },
          ...["pdf", "pptx", "html"].map(format => button(t("导出 ", "Export ") + format.toUpperCase(),
            () => void exportSlides(format), { key: format, disabled: busy }))),
      ),
      status && h("p", { role: "status" }, status),
      play !== null && frames.length > 0 && h(Player, { api, scene, frames, initial: Math.min(play, frames.length - 1),
        thumbnails, zh, close: () => { setPlay(null); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); } }));
  };
}
