export const wireframeDevices = {
  desktop: { width: 1440, height: 900, zh: "桌面", en: "Desktop" },
  tablet: { width: 768, height: 1024, zh: "平板", en: "Tablet" },
  mobile: { width: 375, height: 812, zh: "手机", en: "Mobile" },
};

export function insertWireframeTemplate(api, device, template, convert, capture, zh) {
  const state = api?.getAppState();
  if (!state || state.viewModeEnabled) return;
  const { width, height, zh: chinese, en: english } = wireframeDevices[device];
  const zoom = state.zoom.value;
  const selectedFrame = api.getSceneElements().find(element => state.selectedElementIds[element.id] &&
    (element.type === "frame" || element.type === "magicframe"));
  const x = selectedFrame ? selectedFrame.x + selectedFrame.width + 80 : state.width / (2 * zoom) - state.scrollX - width / 2;
  const y = selectedFrame?.y ?? state.height / (2 * zoom) - state.scrollY - height / 2;
  const frameId = crypto.randomUUID();
  const name = (zh ? "AI 画框 · " + chinese : "AI frame · " + english);
  const items = [];
  const add = (type, left, top, values) => items.push({ type, x: x + left, y: y + top, frameId, ...values });
  const label = (text, left, top, size = 19) => add("text", left, top, { text, fontSize: size, fontFamily: 5, strokeColor: "#342c46" });
  const box = (left, top, w, h, color = "#f4f1f8") => add("rectangle", left, top, {
    width: w, height: h, strokeColor: "#9f93b5", strokeWidth: 1, roughness: 0, fillStyle: "solid", backgroundColor: color,
  });
  if (template) {
    const padding = device === "mobile" ? 18 : 36;
    const inner = width - 2 * padding;
    box(padding, 24, inner, 56);
    label(zh ? "品牌 · 首页" : "Brand · Home", padding + 12, 38);
    box(padding, 100, inner, height * .30);
    label(zh ? "页面主标题" : "Page heading", padding + 12, 116, device === "mobile" ? 24 : 36);
    label(zh ? "简介与主要操作" : "Intro and primary action", padding + 12, 170);
    box(padding + 12, 215, 135, 44, "#e5d9f8");
    label(zh ? "开始使用" : "Get started", padding + 24, 224);
    const cards = device === "mobile" ? 1 : 3;
    for (let index = 0; index < cards; index++) {
      const w = (inner - 14 * (cards - 1)) / cards;
      const left = padding + index * (w + 14);
      const top = 128 + height * .30;
      box(left, top, w, 112);
      label((zh ? "内容模块 " : "Content block ") + (index + 1), left + 12, top + 16);
    }
    label(zh ? "交互说明：点击「开始使用」进入下一步。" : "Interaction: Get started opens the next step.", padding, height - 58, 16);
  }
  const elements = convert([...items, { id: frameId, type: "frame", x, y, width, height, name,
    children: items.map(item => item.id ??= crypto.randomUUID()) }], { regenerateIds: false });
  api.setActiveTool({ type: "selection" });
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...elements],
    appState: { selectedElementIds: { [frameId]: true }, selectedGroupIds: {}, showHyperlinkPopup: false },
    captureUpdate: capture,
  });
  api.scrollToContent(elements, { fitToContent: true, animate: true });
}

const allowedTags = new Set(("a article aside b blockquote br button caption code dd details div dl dt em fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i img input label legend li main nav ol option p pre progress section select small span strong style summary table tbody td textarea tfoot th thead time tr ul").split(" "));
const removeTags = new Set(["script", "iframe", "object", "embed", "svg", "math", "template", "meta", "link", "base", "title"]);
const attributes = new Set(("class id style role title name value type placeholder min max step disabled required checked selected multiple rows cols tabindex for alt width height colspan rowspan open hidden data-screen data-go data-back data-toggle data-submit").split(" "));
const prototypeScript = `
(() => {
  const screens = [...document.querySelectorAll("[data-screen]")];
  const stack = [];
  const name = screen => screen.getAttribute("data-screen") || screen.id;
  const show = key => {
    if (!screens.some(screen => name(screen) === key)) return false;
    screens.forEach(screen => { screen.hidden = name(screen) !== key; });
    window.scrollTo(0, 0);
    return true;
  };
  const go = key => {
    const current = screens.find(screen => !screen.hidden);
    if (current && name(current) === key) return;
    if (show(key) && current) stack.push(name(current));
  };
  if (screens.length) show(name(screens[0]));
  document.addEventListener("click", event => {
    const control = event.target.closest("[data-go], [data-back], [data-toggle], a[href]");
    if (!control) return;
    if (control.hasAttribute("data-back")) { event.preventDefault(); if (stack.length) show(stack.pop()); return; }
    if (control.hasAttribute("data-toggle")) {
      event.preventDefault();
      const target = document.getElementById(control.dataset.toggle);
      if (target && !target.hasAttribute("data-screen")) { target.hidden = !target.hidden; control.setAttribute("aria-expanded", String(!target.hidden)); }
      return;
    }
    const key = control.dataset.go || control.getAttribute("href")?.slice(1);
    if (control.hasAttribute("data-go") || screens.some(screen => name(screen) === key)) { event.preventDefault(); go(key); }
  });
  document.addEventListener("submit", event => {
    event.preventDefault();
    if (event.target.dataset.submit) go(event.target.dataset.submit);
  });
  document.documentElement.dataset.prototypeReady = "true";
})();`;

export function prototypeDocument(html) {
  const source = document.createElement("template");
  source.innerHTML = html;
  for (const element of source.content.querySelectorAll("*")) {
    const tag = element.localName;
    if (removeTags.has(tag)) { element.remove(); continue; }
    if (!allowedTags.has(tag)) { element.replaceWith(...element.childNodes); continue; }
    for (const attr of [...element.attributes]) {
      const key = attr.name;
      if (attributes.has(key) || key.startsWith("aria-") ||
          tag === "a" && key === "href" && /^#[\w.-]+$/.test(attr.value) ||
          tag === "img" && key === "src" && /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(attr.value)) continue;
      element.removeAttribute(key);
    }
  }
  return "<!doctype html>\n<html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'; base-uri 'none'\">" +
    "<style>html:not([data-prototype-ready]) body{visibility:hidden!important}</style></head><body>" + source.innerHTML +
    "<style>[hidden]{display:none!important}</style><script>" + prototypeScript + "</script></body></html>";
}
