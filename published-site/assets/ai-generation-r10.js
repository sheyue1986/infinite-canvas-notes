import { connectMcp, modelWithMcp, serviceUrl } from "./mcp-tools.js";
import { insertWireframeTemplate, prototypeDocument, wireframeDevices } from "./wireframe-prototype.js";
import { handwriting } from "./diagram-data.js";

const preferenceKey = "infinite-canvas-ai-provider";
const deepSeekEndpoint = "https://api.deepseek.com/chat/completions";
const defaults = { provider: "deepseek", model: "deepseek-flash", endpoint: "" };
let sessionKey = "";
let sessionMode = "diagram";
let sessionMcp = { address: "", token: "", client: null, allowed: [] };

function preferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey));
    if (saved && ["deepseek", "compatible"].includes(saved.provider) &&
        typeof saved.model === "string" && typeof saved.endpoint === "string") {
      return { provider: saved.provider, model: saved.provider === "deepseek" ? defaults.model : saved.model, endpoint: saved.endpoint };
    }
  } catch { /* Settings are optional. */ }
  return defaults;
}

function codeBlock(text, language) {
  const match = text.match(new RegExp("```(?:" + language + ")?[ \\t]*\\r?\\n([\\s\\S]*?)```", "i"));
  return (match?.[1] ?? text).trim();
}

function wireframeSelection(api, t) {
  const { selectedElementIds, theme } = api.getAppState();
  const scene = api.getSceneElements();
  const selected = new Set(Object.keys(selectedElementIds).filter(id => selectedElementIds[id]));
  const frameIds = new Set(scene.filter(element => selected.has(element.id) &&
    ["frame", "magicframe"].includes(element.type)).map(element => element.id));
  const objects = scene.filter(element => selected.has(element.id) || frameIds.has(element.frameId));
  const containers = new Set(objects.map(element => element.id));
  const elements = scene.filter(element => containers.has(element.id) || containers.has(element.containerId));
  const shapes = elements.filter(element => !["frame", "magicframe"].includes(element.type));
  if (!shapes.length) throw new Error(t("请先在画布上选中有内容的画框或线框对象。", "Select a populated frame or wireframe objects on the canvas."));
  if (shapes.length > 500) throw new Error(t("选区对象过多，请缩小范围后重试。", "Select fewer objects and try again."));
  const frames = elements.filter(element => frameIds.has(element.id));
  const reference = selected.size === 1 ? frames[0] : null;
  const left = reference?.x ?? Math.min(...shapes.map(element => element.x));
  const top = reference?.y ?? Math.min(...shapes.map(element => element.y));
  const rounded = element => ({
    x: Math.round(element.x - left), y: Math.round(element.y - top),
    width: Math.round(element.width), height: Math.round(element.height),
  });
  const ids = new Map([...frames, ...shapes].map((element, index) => [element.id, index + 1]));
  const content = JSON.stringify({
    theme,
    screens: frames.map(frame => ({ id: ids.get(frame.id), name: frame.name, ...rounded(frame) })),
    elements: shapes.map(element => ({
      id: ids.get(element.id), type: element.customData?.icnBasicShape?.kind ?? element.type, ...rounded(element),
      screen: ids.get(element.frameId), parent: ids.get(element.containerId),
      from: ids.get(element.startBinding?.elementId), to: ids.get(element.endBinding?.elementId),
      ...(element.angle && { rotation: Math.round(element.angle * 180 / Math.PI) }),
      stroke: element.strokeColor, fill: element.backgroundColor,
      strokeWidth: element.strokeWidth, opacity: element.opacity,
      ...(element.type === "text" && { text: element.originalText ?? element.text, fontSize: element.fontSize, textAlign: element.textAlign }),
      ...(element.points && { points: element.points.filter((_, index, points) =>
        index % Math.ceil(points.length / 32) === 0 || index === points.length - 1).map(point => point.map(Math.round)) }),
    })),
  });
  return { content, shapes, frames, reference };
}

async function generate(settings, key, mode, content, signal, mcp, t) {
  const deepseek = settings.provider === "deepseek";
  const endpoint = serviceUrl(deepseek ? deepSeekEndpoint : settings.endpoint,
    t("请填写完整的 HTTPS API 地址。本机服务也可以使用 HTTP。", "Enter the full HTTPS API URL. Loopback HTTP is also allowed."));
  const system = mode === "ocr"
    ? "Transcribe the handwritten text in the image. Preserve the original language, reading order, punctuation and line breaks. Output only the transcription. Mark illegible text as [illegible]. If there is no readable handwriting, return exactly [no text]. Do not translate or invent text."
    : mode === "diagram"
    ? "Read the user's text and optional reference image. Return only valid Mermaid source. Use flowchart, sequenceDiagram, or classDiagram so the result remains editable in Excalidraw. Keep the user's language in labels. Use short safe ASCII node IDs and quoted flowchart labels. Do not use HTML, links, Mermaid directives, or Markdown."
    : "Convert the Excalidraw wireframe into a complete, clickable HTML prototype with inline CSS. Read the selected screens, arrows, text instructions and optional screenshots. Preserve hierarchy, layout, colors and labels. Model each screen as a top-level section with a unique data-screen value, ordered from the initial screen. Connect buttons and links using data-go with the destination screen name, data-back for back navigation, data-toggle with the ID of a local menu, or data-submit on a form to advance to a screen. Use semantic, responsive HTML. Use placeholders for missing assets. Output only one complete HTML document. No scripts, external assets, or event-handler attributes. The app provides the interaction runtime.";
  async function complete(messages, tools) {
    const response = await fetch(endpoint, {
      method: "POST", redirect: "error", credentials: "omit", signal,
      headers: { "Content-Type": "application/json", ...(key && { Authorization: "Bearer " + key }) },
      body: JSON.stringify({
        model: deepseek ? defaults.model : settings.model.trim(), messages, stream: false,
        ...(deepseek && { thinking: { type: "disabled" }, max_tokens: mode === "code" ? 14000 : 7000 }),
        ...(tools && { tools, tool_choice: "auto" }),
      }),
    });
    if (!response.ok) {
      if ([401, 403].includes(response.status)) throw new Error(t("服务拒绝访问，请检查 API Key 和模型权限。", "Access denied. Check the API key and model permissions."));
      if (response.status === 402) throw new Error(t("服务账户余额不足。", "The provider account has insufficient balance."));
      if (response.status === 429) throw new Error(t("服务已限流，请稍后重试或检查账户额度。", "Rate limit reached. Retry later or check your quota."));
      throw new Error(t("模型服务请求失败。请检查 API 地址、模型名称和图片支持。", "Check the API URL, model name, and image support.") + " (HTTP " + response.status + ")");
    }
    const data = await response.json();
    return data.choices?.[0];
  }
  const choice = await modelWithMcp(complete, [{ role: "system", content: system }, { role: "user", content }], mcp, signal, deepseek, t);
  if (choice?.finish_reason === "length") throw new Error(t("生成结果超出模型的输出限制，请缩小范围后重试。", "Output limit reached. Reduce the scope and try again."));
  if (typeof choice?.message?.content !== "string") throw new Error(t("模型没有返回可用的内容。", "The model returned no usable content."));
  const output = codeBlock(choice.message.content, mode === "ocr" ? "text|plaintext" : mode === "diagram" ? "mermaid" : "html");
  if (mode === "ocr" && (!output || output === "[no text]")) throw new Error(t("选区中没有识别出手写文字。", "No handwritten text was recognized."));
  if (mode === "diagram" && !/^(?:%%[^\n]*\n\s*)*(?:flowchart|graph|sequenceDiagram|classDiagram)(?:\s|$)/.test(output)) {
    throw new Error(t("模型没有生成有效的流程图、序列图或类图，请重试。", "The model did not produce a supported Mermaid diagram. Try again."));
  }
  if (mode === "code" && !/^\s*(?:<!doctype\s+html\b|<html\b)/i.test(output)) {
    throw new Error(t("模型没有返回完整的 HTML，请重试。", "The model did not return a full HTML document. Try again."));
  }
  return mode === "code" ? prototypeDocument(output) : output;
}

export function createAIGeneration(React) {
  const { cloneElement, createElement: h, useEffect, useRef, useState } = React;
  function Presentation({ html, zh, initialDevice, close }) {
    const dialog = useRef(null);
    const [device, setDevice] = useState(initialDevice);
    useEffect(() => { dialog.current.showModal(); }, []);
    return h("dialog", { ref: dialog, className: "icn-prototype", "aria-label": zh ? "原型演示" : "Prototype presentation",
      onCancel: event => { event.preventDefault(); close(); } },
      h("header", null,
        h("strong", null, zh ? "原型演示" : "Prototype presentation"),
        h("select", { value: device, "aria-label": zh ? "演示设备" : "Presentation device", onChange: event => setDevice(event.target.value) },
          Object.entries(wireframeDevices).map(([id, item]) => h("option", { key: id, value: id }, zh ? item.zh : item.en))),
        h("button", { type: "button", onClick: close }, zh ? "退出演示" : "Exit presentation")),
      h("iframe", { title: zh ? "交互原型" : "Interactive prototype", sandbox: "allow-scripts",
        srcDoc: html, style: { maxWidth: wireframeDevices[device].width } }));
  }
  return function AIGeneration({ apiRef, zh, openMermaid, exportCanvas, convert, capture }) {
    const [settings, setSettings] = useState(preferences);
    const [key, setKey] = useState(sessionKey);
    const [mode, setMode] = useState(sessionMode);
    const [includeImage, setIncludeImage] = useState(null);
    const [prompt, setPrompt] = useState("");
    const [result, setResult] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [mcp, setMcp] = useState(sessionMcp);
    const [mcpBusy, setMcpBusy] = useState(false);
    const [mcpMessage, setMcpMessage] = useState("");
    const [reference, setReference] = useState(null);
    const [device, setDevice] = useState("desktop");
    const [presentation, setPresentation] = useState(false);
    const request = useRef(null);
    const mcpRequest = useRef(null);
    const t = (chinese, english) => zh ? chinese : english;
    const useImage = includeImage ?? (settings.provider === "deepseek" && settings.model.trim() === defaults.model);
    useEffect(() => () => {
      request.current?.abort();
      request.current = null;
      mcpRequest.current?.abort();
      mcpRequest.current = null;
    }, []);

    function configure(patch) {
      const next = { ...settings, ...patch };
      setSettings(next);
      try { localStorage.setItem(preferenceKey, JSON.stringify(next)); } catch { /* optional preference */ }
    }
    function changeMode(next) {
      sessionMode = next;
      setMode(next);
      setResult("");
      setMessage("");
    }
    function updateMcp(patch) {
      sessionMcp = { ...sessionMcp, ...patch };
      setMcp(sessionMcp);
    }
    async function discoverTools() {
      if (mcpRequest.current) return;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      mcpRequest.current = controller;
      setMcpBusy(true);
      setMcpMessage("");
      updateMcp({ client: null, allowed: [] });
      try {
        const client = await connectMcp(mcp.address, mcp.token.trim(), controller.signal, t);
        if (mcpRequest.current !== controller) return;
        updateMcp({ client });
        setMcpMessage(client.tools.length ? t("请选择允许模型调用的工具。", "Select the tools the model may call.") :
          t("服务器未提供可用工具。", "The server exposed no usable tools."));
      } catch (error) {
        if (mcpRequest.current === controller) setMcpMessage(error instanceof TypeError ?
          t("无法连接 MCP。请检查地址、网络和服务器跨域设置。", "Check the MCP URL, network, and server CORS settings.") :
          controller.signal.aborted ? t("MCP 连接超时。", "The MCP connection timed out.") : error.message);
      } finally {
        clearTimeout(timeout);
        if (mcpRequest.current === controller) {
          mcpRequest.current = null;
          setMcpBusy(false);
        }
      }
    }
    async function readReference(event) {
      const file = event.target.files?.[0];
      if (!file) { setReference(null); return; }
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 5_000_000) {
        event.target.value = "";
        setReference(null);
        setMessage(t("请选择不超过 5 MB 的 PNG、JPEG、WebP 或 GIF。", "Choose a PNG, JPEG, WebP, or GIF up to 5 MB."));
        return;
      }
      setMessage("");
      setReference(file);
    }
    async function submit(event) {
      event.preventDefault();
      const api = apiRef.current;
      if (request.current || !api || api.getAppState().viewModeEnabled) return;
      setResult("");
      setMessage("");
      let selection;
      let content;
      const key = sessionKey;
      try {
        if (settings.provider === "deepseek" && !key) throw new Error(t("请先填写 DeepSeek API Key。", "Enter a DeepSeek API key first."));
        if (!settings.model.trim()) throw new Error(t("请填写模型名称。", "Enter a model name."));
        if (mode !== "diagram") selection = wireframeSelection(api, t);
        content = mode === "ocr" ? t("请转录截图中的手写文字。", "Transcribe the handwritten text in the screenshot.") :
          selection?.content ?? (prompt.trim() || (reference && t("将参考图片中的结构整理为图解。", "Convert the reference image into a diagram.")));
        if (!content) throw new Error(t("请输入要生成的图解内容。", "Describe the diagram you want to generate."));
        if (content.length > 90000) throw new Error(t("内容太多，请缩小生成范围。", "Reduce the amount of content and try again."));
      } catch (error) {
        setMessage(error.message);
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180000);
      request.current = controller;
      setBusy(true);
      try {
        const images = [];
        if (selection && (useImage || mode === "ocr")) {
          const frames = mode === "code" && selection.frames.length > 1 && selection.frames.length <= 6 ? selection.frames : [selection.reference];
          for (const frame of frames) {
            const elements = frame && frames.length > 1 ? selection.shapes.filter(element => element.frameId === frame.id) : selection.shapes;
            if (!elements.length) continue;
            const canvas = await exportCanvas({
              elements, files: api.getFiles(),
              appState: { ...api.getAppState(), exportScale: 1, exportBackground: true, exportWithDarkMode: api.getAppState().theme === "dark" },
              exportPadding: 12, exportingFrame: frame ?? undefined, maxWidthOrHeight: mode === "ocr" ? 2000 : 1280,
            });
            const image = canvas.toDataURL("image/jpeg", .85);
            if (!image.startsWith("data:image/jpeg")) throw new Error(t("无法导出选区截图。可关闭截图选项后重试。", "Could not export the selection image. Try again with images off."));
            images.push(image);
          }
        } else if (mode === "diagram" && reference) {
          images.push(await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(reference);
          }));
        }
        if (images.length) content = [{ type: "text", text: content }, ...images.map(url => ({ type: "image_url", image_url: { url } }))];
        controller.signal.throwIfAborted();
        const output = await generate(settings, key, mode, content, controller.signal, mode !== "ocr" && mcp.client ? mcp : null, t);
        if (request.current === controller && apiRef.current === api) setResult(output);
      } catch (error) {
        if (request.current !== controller) return;
        const message = controller.signal.aborted ? t("请求已停止。", "Request stopped.") :
          error instanceof TypeError ? t("连接失败，请检查网络和 API 地址。兼容服务需允许本应用的跨域请求。", "Connection failed. Check the URL, network, and provider CORS settings.") : error.message;
        setMessage(message);
      } finally {
        clearTimeout(timeout);
        if (request.current === controller) {
          request.current = null;
          setBusy(false);
        }
      }
    }
    async function copy() {
      try {
        await navigator.clipboard.writeText(result);
        setMessage(t("已复制 HTML。", "HTML copied."));
      } catch {
        setMessage(t("无法访问剪贴板，可在下方选中代码后复制。", "Select the code and copy it manually."));
      }
    }
    function insertText() {
      const api = apiRef.current;
      const state = api?.getAppState();
      if (!state || state.viewModeEnabled || !result.trim()) return;
      const selected = api.getSceneElements().filter(element => state.selectedElementIds[element.id]);
      const zoom = state.zoom.value;
      const x = selected.length ? Math.max(...selected.map(element => element.x + element.width)) + 24 :
        state.width / (2 * zoom) - state.scrollX;
      const y = selected.length ? Math.min(...selected.map(element => element.y)) : state.height / (2 * zoom) - state.scrollY;
      const elements = convert([{ type: "text", text: result.trim(), fontFamily: handwriting, x, y, fontSize: 22, strokeColor: "#1b1b1f" }]);
      api.setActiveTool({ type: "selection" });
      api.updateScene({
        elements: [...api.getSceneElementsIncludingDeleted(), ...elements],
        appState: { selectedElementIds: { [elements[0].id]: true }, selectedGroupIds: {} }, captureUpdate: capture,
      });
      api.scrollToContent(elements, { animate: true });
    }
    function download() {
      const url = URL.createObjectURL(new Blob([result], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "wireframe.html";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    const button = (label, onClick, props = {}) => h("button", { type: "button", onClick, ...props }, label);
    const field = (label, control) => h("label", { className: "icn-ai-field" }, label, cloneElement(control, { "aria-label": label }));
    return h("div", { className: "icn-sidebar-tool icn-ai-panel" },
      h("h2", null, t("AI 生成", "AI generation")),
      h("div", { className: "icn-ai-tools" },
        button(t("文字至图表", "Text to diagram"), () => changeMode("diagram"), { disabled: busy, "aria-pressed": mode === "diagram" }),
        button(t("线框图至代码", "Wireframe to code"), () => changeMode("code"), { disabled: busy, "aria-pressed": mode === "code" }),
        button(t("手写转文字", "Handwriting OCR"), () => changeMode("ocr"), { disabled: busy, "aria-pressed": mode === "ocr" }),
      ),
      h("details", { className: "icn-ai-settings" },
        h("summary", null, t("模型与 API Key", "Model and API key")),
        h("fieldset", { disabled: busy },
          field(t("服务", "Provider"), h("select", { value: settings.provider, onChange: event => {
            const provider = event.target.value;
            setKey("");
            sessionKey = "";
            setIncludeImage(null);
            configure({ provider, model: provider === "deepseek" ? defaults.model : "" });
          } },
            h("option", { value: "deepseek" }, "DeepSeek"),
            h("option", { value: "compatible" }, t("兼容 Chat Completions 的服务", "Chat Completions compatible")),
          )),
          settings.provider === "compatible" && field(t("完整 API 地址", "Full API URL"), h("input", {
            type: "url", value: settings.endpoint, placeholder: "https://example.com/v1/chat/completions",
            onChange: event => {
              setKey("");
              sessionKey = "";
              configure({ endpoint: event.target.value });
            },
          })),
          field(t("模型名称", "Model name"), h("input", { value: settings.model, readOnly: settings.provider === "deepseek", onChange: event => {
            setIncludeImage(null);
            configure({ model: event.target.value });
          } })),
          settings.provider === "deepseek" && h("small", null, "DeepSeek-V4.1-Flash-1017 · " + t("支持图片与工具调用", "Vision and tool calling")),
          field("API Key", h("input", { type: "password", autoComplete: "off", value: key, onChange: event => {
            setKey(event.target.value);
            sessionKey = event.target.value.trim();
          } })),
          h("small", null, t("密钥仅在本次运行中使用。生成时会将输入或选区发送给所选服务。", "The key stays in this session. Generation sends your prompt or selection to the chosen provider.")),
        ),
      ),
      h("details", { className: "icn-ai-settings" },
        h("summary", null, t("MCP 工具", "MCP tools")),
        h("fieldset", { disabled: busy || mcpBusy },
          field(t("MCP 服务器地址", "MCP server URL"), h("input", { type: "url", value: mcp.address, placeholder: "https://example.com/mcp",
            onChange: event => updateMcp({ address: event.target.value, token: "", client: null, allowed: [] }) })),
          field(t("MCP 访问令牌（可选）", "MCP access token (optional)"), h("input", { type: "password", autoComplete: "off", value: mcp.token,
            onChange: event => updateMcp({ token: event.target.value, client: null, allowed: [] }) })),
          button(mcpBusy ? t("正在连接…", "Connecting…") : t("连接并列出工具", "Connect and list tools"), discoverTools),
          mcpMessage && h("small", { role: "status" }, mcpMessage),
          ...((mcp.client?.tools ?? []).map(tool => h("label", { className: "icn-ai-checkbox", key: tool.name, title: tool.description },
            h("input", { type: "checkbox", checked: mcp.allowed.includes(tool.name), onChange: event => updateMcp({
              allowed: event.target.checked ? [...mcp.allowed, tool.name] : mcp.allowed.filter(name => name !== tool.name),
            }) }), tool.name))),
        ),
      ),
      h("form", { onSubmit: submit },
        mode === "diagram" ? h("div", { className: "icn-ai-output" }, field(t("图解描述", "Diagram description"), h("textarea", {
          rows: 4, value: prompt, disabled: busy, placeholder: t("例如：绘制场地雨水收集与回用流程", "Example: Draw a rainwater collection and reuse flowchart"),
          onChange: event => setPrompt(event.target.value),
        })), field(t("参考图片（可选）", "Reference image (optional)"), h("input", { type: "file", disabled: busy,
          accept: "image/png,image/jpeg,image/webp,image/gif", onChange: readReference }))) : mode === "ocr" ?
          h("p", null, t("选中手写笔迹、图片或画框后识别。校对结果后可用手绘字体插入画布。", "Select handwriting, an image, or a frame. Review the transcription and insert it in the handwritten font.")) :
          h("div", { className: "icn-ai-output" },
          h("p", null, t("选择一个或多个画框。页面名称、箭头和画布上的交互说明会一起生成可点击原型。", "Select one or more frames. Screen labels, arrows, and on-canvas interaction notes guide the clickable prototype.")),
          field(t("线框尺寸", "Wireframe size"), h("select", { value: device, disabled: busy, onChange: event => setDevice(event.target.value) },
            Object.entries(wireframeDevices).map(([id, item]) => h("option", { key: id, value: id },
              (zh ? item.zh : item.en) + " · " + item.width + " px")))),
          h("div", { className: "icn-ai-tools" },
            button(t("框选现有线框", "Frame existing wireframes"), () => {
              const api = apiRef.current;
              if (api && !api.getAppState().viewModeEnabled) api.setActiveTool({ type: "frame" });
            }, { disabled: busy }),
            button(t("插入 AI 画框", "Insert AI frame"), () => insertWireframeTemplate(apiRef.current, device, false, convert, capture, zh), { disabled: busy }),
            button(t("插入线框模板", "Insert wireframe template"), () => insertWireframeTemplate(apiRef.current, device, true, convert, capture, zh), { disabled: busy })),
          h("label", { className: "icn-ai-checkbox" },
            h("input", { type: "checkbox", checked: useImage, disabled: busy, onChange: event => setIncludeImage(event.target.checked) }),
            t("同时发送选区截图（需视觉模型）", "Include selection image (vision model required)"),
          ),
        ),
        h("div", { className: "icn-ai-tools" },
          h("button", { type: "submit", className: "icn-sidebar-action", disabled: busy }, busy ? t("正在生成…", "Generating…") :
            mode === "diagram" ? t("生成图解", "Generate diagram") : mode === "ocr" ? t("识别手写内容", "Recognize handwriting") : t("生成交互原型", "Generate interactive prototype")),
          busy && button(t("停止", "Stop"), () => request.current?.abort()),
        ),
      ),
      message && h("p", { role: "status" }, message),
      result && h("div", { className: "icn-ai-output" },
        field(mode === "ocr" ? t("识别结果", "Transcription") : mode === "diagram" ? "Mermaid" : "HTML", h("textarea", {
          rows: 6, readOnly: mode !== "ocr", value: result, spellCheck: false,
          onChange: mode === "ocr" ? event => setResult(event.target.value) : undefined,
        })),
        h("div", { className: "icn-ai-tools" }, mode === "diagram" ?
          button(t("预览并插入画布", "Preview and insert"), () => openMermaid(result)) : mode === "ocr" ?
          button(t("插入识别文字", "Insert transcription"), insertText) :
          [button(t("演示原型", "Present prototype"), () => setPresentation(true), { key: "present" }),
            button(t("复制 HTML", "Copy HTML"), copy, { key: "copy" }), button(t("下载 HTML", "Download HTML"), download, { key: "download" })]),
      ),
      presentation && h(Presentation, { html: result, zh, initialDevice: device, close: () => setPresentation(false) }),
      button(t("Mermaid 至 Excalidraw", "Mermaid to Excalidraw"), () => openMermaid(), { className: "icn-ai-mermaid" }),
    );
  };
}
