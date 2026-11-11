import { isModifierKey, validCanvasShortcut } from "./drawing-tools.js";

const type = "infinite-canvas-shortcuts";
const filename = "infinite-canvas-shortcuts.json";
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function validToolBinding(key) {
  return key === null || typeof key === "string" && /^(?:Alt\+)?(?:Shift\+)?[A-Z0-9]$/.test(key)
    && key !== "Z" && !/^(Alt\+[1-8DEFL]|Shift\+[12GS])$/.test(key);
}

function validCommandBinding(command, key) {
  if (!validCanvasShortcut(command, key)) return false;
  if (key === "") return true;
  const code = key.split("+").at(-1);
  return /^(?:Ctrl\+)?(?:Alt\+)?(?:Shift\+)?[A-Za-z][A-Za-z0-9]{0,30}$/.test(key)
    && !isModifierKey({ code })
    && !["Escape", "Tab", "Unidentified"].includes(code)
    && !/^(?:KeyZ|Space|Enter|Alt\+F4|Alt\+Digit[1-8])$/.test(key);
}

function readConfig(value, commands, tools) {
  if (value?.type !== type || value.version !== 1 || !isRecord(value.commands) || !isRecord(value.tools)) {
    throw new Error("Invalid shortcut file");
  }
  const knownCommands = new Map(commands.map(command => [command.id, command]));
  const knownTools = new Set(tools.map(tool => tool.id));
  let skipped = 0;
  const commandBindings = [];
  const toolBindings = [];
  for (const [id, key] of Object.entries(value.commands)) {
    if (!knownCommands.has(id)) { skipped++; continue; }
    if (!validCommandBinding(knownCommands.get(id), key)) throw new Error("Invalid command binding");
    commandBindings.push([id, key]);
  }
  for (const [id, key] of Object.entries(value.tools)) {
    if (!knownTools.has(id) || id === "magnifier") { skipped++; continue; }
    if (!validToolBinding(key)) throw new Error("Invalid tool binding");
    toolBindings.push([id, key]);
  }
  return { commands: Object.fromEntries(commandBindings), tools: Object.fromEntries(toolBindings), skipped };
}

export function createShortcutTransfer(React, commands) {
  const { createElement: h, useRef, useState } = React;
  return function ShortcutTransfer({ kit, zh, bindings, setBindings, setMessage }) {
    const input = useRef(null);
    const [busy, setBusy] = useState(false);
    const t = (chinese, english) => zh ? chinese : english;
    async function load(event) {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || busy) return;
      setBusy(true);
      try {
        if (file.size > 256000) throw new Error("Shortcut file too large");
        const config = readConfig(JSON.parse(await file.text()), commands, kit.shortcutTools);
        kit.replaceToolShortcuts(config.tools);
        setBindings(config.commands);
        setMessage(config.skipped ?
          t("已导入快捷键，跳过 " + config.skipped + " 个本机没有的工具或命令。",
            "Shortcuts imported. Skipped " + config.skipped + " unavailable tools or commands.") :
          t("已导入命令、工具与笔刷快捷键。", "Command, tool, and brush shortcuts imported."));
      } catch {
        setMessage(t("无法导入。请选择由本软件导出的有效快捷键 JSON 文件。", "Import failed. Select a valid shortcut JSON file exported by this app."));
      } finally {
        setBusy(false);
      }
    }
    function save() {
      const data = { type, version: 1, commands: bindings, tools: kit.settings.shortcuts };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(t("已导出命令、工具与笔刷快捷键。", "Command, tool, and brush shortcuts exported."));
    }
    return h("div", { className: "icn-shortcut-transfer" },
      h("button", {
        type: "button", disabled: busy, onClick: () => input.current?.click(),
        title: t("导入将替换当前的命令、工具与笔刷快捷键", "Import replaces your command, tool, and brush shortcuts"),
      }, t("导入快捷键", "Import shortcuts")),
      h("button", { type: "button", disabled: busy, onClick: save }, t("导出快捷键", "Export shortcuts")),
      h("input", { type: "file", accept: ".json,application/json", hidden: true, ref: input, onChange: load }),
    );
  };
}
