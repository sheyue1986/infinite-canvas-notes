import { openDiagramEditor } from "./diagram-editor-r4.js";
import { readTable } from "./diagram-data.js";
import { createAIGeneration } from "./ai-generation-r10.js";
import { createCanvasPresentations } from "./canvas-presentations.js";

const name = "default";
const materialTab = "icn-materials";
const pinKey = "infinite-canvas-sidebar-pinned";
const paths = {
  panel: "M3.5 4h13v12h-13zM12 4v12",
  library: "M10 5.5c-2-1.5-4.5-2-7-1v11c2.5-1 5-.5 7 1 2-1.5 4.5-2 7-1v-11c-2.5-1-5-.5-7 1Zm0 0v11",
  ai: "M10 2.5c.5 4.2 2.6 6.3 7 7-4.4.5-6.5 2.6-7 7-.5-4.4-2.6-6.5-7-7 4.4-.7 6.5-2.8 7-7Z",
  editor: "M4.5 2.5h7l4 4v11h-11zM11 3v4h4M7 10h6m-6 3h6",
  presentation: "M2.5 3.5h15v10h-15zM10 13.5v3m-3 0h6m-6-6 2-2 2 1 2-3",
};

function readPinned() {
  try { return localStorage.getItem(pinKey) === "1"; } catch { return false; }
}

export function changeWorkspaceSidebar(api, action) {
  if (!api) return;
  const active = api.getAppState().openSidebar;
  const close = action === "close" || (action === "toggle" && active?.name === name);
  api.updateScene({ appState: { openSidebar: close ? null : { name, tab: materialTab } } });
}

export function searchWorkspaceMaterials(api) {
  changeWorkspaceSidebar(api, "open");
  const focus = () => document.querySelector(".icn-workspace-sidebar .material-panel input[type=search]")?.focus();
  requestAnimationFrame(() => requestAnimationFrame(focus));
}

export async function pasteWorkspaceTable(apiRef, options, fallback) {
  const api = apiRef.current;
  if (!api || api.getAppState().viewModeEnabled) return;
  let cells;
  try {
    if (navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      const item = items.find(entry => entry.types.includes("text/html") || entry.types.includes("text/plain"));
      if (item && !item.types.some(type => type.includes("excalidraw"))) {
        const read = async type => item.types.includes(type) ? (await item.getType(type)).text() : "";
        const [html, text] = await Promise.all([read("text/html"), read("text/plain")]);
        if (!/^\s*\{\s*"type"\s*:\s*"excalidraw/i.test(text)) cells = readTable({ html, text });
      }
    } else if (navigator.clipboard.readText) {
      cells = readTable({ text: await navigator.clipboard.readText() });
    }
  } catch { /* Let the native paste action handle the clipboard. */ }
  if (apiRef.current !== api) return;
  if (cells?.some(row => row.length > 1)) openDiagramEditor(api, options, cells);
  else fallback();
}

export function createWorkspaceSidebar(React, DefaultSidebar, Sidebar, { exportCanvas, convert: convertElements, update, capture: captureAction }) {
  const { createElement: h, Fragment, useState } = React;
  const AIGeneration = createAIGeneration(React);
  const Presentations = createCanvasPresentations(React, { exportCanvas, convert: convertElements, update, capture: captureAction });
  const icon = key => h("svg", { viewBox: "0 0 20 20", width: 17, height: 17, fill: "none",
    stroke: "currentColor", strokeWidth: 1.45, strokeLinejoin: "round", strokeLinecap: "round", "aria-hidden": true,
  }, h("path", { d: paths[key] }));
  function Trigger({ apiRef, open, zh }) {
    const label = zh ? "工作侧栏" : "Workspace sidebar";
    return h("button", {
      type: "button", className: "library-trigger sidebar-trigger icn-sidebar-trigger",
      title: label, "aria-label": label, "aria-expanded": open,
      onClick: () => changeWorkspaceSidebar(apiRef.current, "toggle"),
    }, icon("panel"));
  }
  function Panel({ apiRef, setOpen, library, zh, convert, capture }) {
    const [pinned, setPinned] = useState(readPinned);
    const t = (chinese, english) => zh ? chinese : english;
    const tab = (id, glyph, label) => h(Sidebar.TabTrigger, { tab: id, title: label, "aria-label": label }, icon(glyph));
    function onDock(value) {
      setPinned(value);
      try { localStorage.setItem(pinKey, value ? "1" : "0"); } catch { /* optional preference */ }
    }
    function onStateChange(state) {
      setOpen(Boolean(state));
      if (state && (!state.tab || state.tab === "library")) changeWorkspaceSidebar(apiRef.current, "open");
      if (state) requestAnimationFrame(() => {
        const search = document.querySelector('.icn-workspace-sidebar [role="tab"][id$="-trigger-search"]');
        const label = t("查找内容", "Find on canvas");
        search?.setAttribute("title", label);
        search?.setAttribute("aria-label", label);
      });
    }
    const openEditor = () => {
      const api = apiRef.current;
      if (!pinned && api?.getAppState().openSidebar?.tab === "icn-diagram-editor") changeWorkspaceSidebar(api, "close");
      openDiagramEditor(api, { zh, convert, capture });
    };
    const openMermaid = code => {
      const api = apiRef.current;
      if (!api || api.getAppState().viewModeEnabled) return;
      if (code) {
        try { localStorage.setItem("mermaid-to-excalidraw", JSON.stringify(code)); }
        catch {
          api.setToast({ message: t("无法将生成结果送到预览，可复制 Mermaid 代码后手动粘贴。", "Preview storage is unavailable. Copy the Mermaid source and paste it manually.") });
          return;
        }
      }
      if (!pinned && !code) changeWorkspaceSidebar(api, "close");
      api.updateScene({ appState: { openDialog: { name: "ttd", tab: "mermaid" } } });
    };
    return h(Fragment, null,
      h(DefaultSidebar.TabTriggers, null,
        tab(materialTab, "library", t("素材库", "Material library")),
        tab("icn-ai", "ai", t("AI 生成", "AI generation")),
        tab("icn-diagram-editor", "editor", t("图表编辑器", "Diagram editor")),
        tab("icn-presentations", "presentation", t("演示文稿", "Presentations")),
      ),
      h(DefaultSidebar, { className: "icn-workspace-sidebar", docked: pinned, onDock, onStateChange },
        h(Sidebar.Tab, { tab: materialTab, className: "icn-sidebar-materials" }, library),
        h(Sidebar.Tab, { tab: "icn-ai", className: "icn-sidebar-ai" },
          h(AIGeneration, { apiRef, zh, openMermaid, exportCanvas, convert: convertElements, capture: captureAction })),
        h(Sidebar.Tab, { tab: "icn-presentations", className: "icn-sidebar-presentations" }, h(Presentations, { apiRef, zh })),
        h(Sidebar.Tab, { tab: "icn-diagram-editor" },
          h("div", { className: "icn-sidebar-tool" },
            h("h2", null, t("图表编辑器", "Diagram editor")),
            h("p", null, t("粘贴表格、从数据创建图表，或插入 Mermaid 图解。", "Paste a table, plot data, or insert a Mermaid diagram.")),
            h("button", { type: "button", className: "icn-sidebar-action", onClick: openEditor },
              t("打开图表编辑器", "Open diagram editor")),
          ),
        ),
      ),
    );
  }
  return { Trigger, Panel };
}
