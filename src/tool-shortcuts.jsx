import React, { useEffect, useRef, useState } from "react";
import "./tool-shortcuts.css";
import { assignedKey, commandGroups, commands, keyChord, keyLabel, nativeAliases } from "./canvasCommands.js";

export function shortcutFromEvent(event) {
  const key = event.shiftKey && /^Digit[0-9]$/.test(event.code) ? event.code.at(-1) : event.key;
  if (event.ctrlKey || event.metaKey || !/^[a-z0-9]$/i.test(key)) return null;
  return (event.altKey ? "Alt+" : "") + (event.shiftKey ? "Shift+" : "") + key.toUpperCase();
}

export function ShortcutSettings({ kit, zh, close, bindings, setBindings }) {
  const dialog = useRef(null);
  const [capturing, setCapturing] = useState(null);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("commands");
  const [query, setQuery] = useState("");
  const t = (cn, en) => zh ? cn : en;
  useEffect(() => { dialog.current.showModal(); }, []);
  const capture = (event, tool) => {
    if (tool.id === "magnifier" || capturing !== tool.id || event.key === "Tab") return;
    if (event.isComposing || ["Alt", "Shift", "Control", "Meta"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") { setCapturing(null); setMessage(""); return; }
    const key = shortcutFromEvent(event);
    if (!key || key === "Z" || /^(Alt\+[1-8DEFL]|Shift\+[12GS])$/.test(key)) {
      setMessage(t("请使用可分配的字母或数字，可搭配 Alt、Shift。此按键保留给浏览器或画布。", "Use an available letter or number, with optional Alt or Shift. This key is reserved."));
      return;
    }
    const duplicate = kit.shortcutForKey(key);
    if (duplicate && duplicate !== tool.id) {
      const conflict = kit.shortcutTools.find(item => item.id === duplicate);
      setMessage(t(key + " 已分配给「" + conflict.name + "」。请先清除或更改它。", key + " is already assigned to " + conflict.en + "."));
      return;
    }
    const action = commands.find(item => keyLabel(assignedKey(item, bindings)) === key);
    if (action) { setMessage(t("此按键已用于「" + action.zh + "」。", "This key is used by " + action.en + ".")); return; }
    kit.setToolShortcut(tool.id, key);
    setCapturing(null);
    setMessage("");
  };
  const commandName = item => t(item.zh, item.en);
  const captureCommand = (event, item) => {
    if (capturing !== item.id || event.isComposing || event.key === "Tab") return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") { setCapturing(null); setMessage(""); return; }
    const chord = keyChord(event);
    if (!chord) return;
    const toolKey = shortcutFromEvent(event);
    if (["KeyZ", "Space", "Enter", "Alt+F4"].includes(chord) || /^Alt\+[1-8]$/.test(toolKey || "")) {
      setMessage(t("此按键保留给放大镜、工具槽位或基础交互。", "This key is reserved for the magnifier, tool slots, or navigation.")); return;
    }
    const toolId = kit.shortcutForKey(toolKey) || kit.aliasForKey(toolKey);
    if (toolId) {
      const tool = kit.shortcutTools.find(entry => entry.id === toolId);
      setMessage(t("此按键已用于「" + tool.name + "」。", "This key is used by " + tool.en + ".")); return;
    }
    const conflict = commands.find(other => other.id !== item.id && (assignedKey(other, bindings) === chord
      || bindings[other.id] == null && nativeAliases[other.id]?.includes(chord)));
    if (conflict) { setMessage(t("此按键已用于「" + conflict.zh + "」。", "This key is used by " + conflict.en + ".")); return; }
    setBindings(current => ({ ...current, [item.id]: chord }));
    setCapturing(null); setMessage("");
  };
  const term = query.trim().toLowerCase();
  return <dialog ref={dialog} className="shortcut-settings" aria-labelledby="shortcut-settings-title"
    onCancel={event => { event.preventDefault(); close(); }}>
    <header><h2 id="shortcut-settings-title">{t("快捷键设置", "Keyboard shortcuts")}</h2>
      <button type="button" aria-label={t("关闭快捷键设置", "Close keyboard shortcuts")} onClick={close}>×</button></header>
    <p>{t("点击按键格，再按所需的键。设置即时生效。", "Click a key field and press the desired key. Changes apply immediately.")}</p>
    {message && <p className="shortcut-message" role="alert">{message}</p>}
    <nav className="shortcut-tabs" aria-label={t("快捷键分类", "Shortcut categories")}>
      {[["commands", "功能命令", "Commands"], ["tools", "工具与笔刷", "Tools & brushes"]].map(([id, cn, en]) =>
        <button key={id} type="button" aria-pressed={tab === id} onClick={() => { setTab(id); setQuery(""); setCapturing(null); setMessage(""); }}>{t(cn, en)}</button>)}
    </nav>
    <input className="shortcut-search" type="search" aria-label={t("搜索快捷键", "Search shortcuts")} placeholder={t("搜索网格、吸附、选区…", "Search grid, snap, selection…")} value={query} onChange={event => setQuery(event.target.value)} />
    <div className="shortcut-tool-list">
      {tab === "commands" && Object.entries(commandGroups).map(([group, labels]) => {
        const rows = commands.filter(item => item.group === group && [item.zh, item.en, keyLabel(assignedKey(item, bindings))].some(value => value.toLowerCase().includes(term)));
        if (!rows.length) return null;
        return <section key={group}><h3>{t(...labels)}</h3>{rows.map(item => {
          const name = commandName(item), key = assignedKey(item, bindings);
          return <div className="shortcut-tool-row" key={item.id}><span>{name}</span>
            <button type="button" className="shortcut-key" aria-label={t("设置 " + name + " 快捷键", "Set shortcut for " + name)}
              data-capturing={capturing === item.id || undefined} onClick={() => { setCapturing(item.id); setMessage(""); }}
              onKeyDown={event => captureCommand(event, item)} onBlur={() => setCapturing(current => current === item.id ? null : current)}>
              {capturing === item.id ? t("请按键…", "Press a key…") : keyLabel(key) || "—"}</button>
            <button type="button" disabled={!key} aria-label={t("清除 " + name + " 快捷键", "Clear shortcut for " + name)}
              onClick={() => { setBindings(current => ({ ...current, [item.id]: "" })); setMessage(""); }}>×</button>
          </div>;
        })}</section>;
      })}
      {tab === "tools" && kit.shortcutTools.filter(tool => [tool.name, tool.en].some(value => value.toLowerCase().includes(term))).map(tool => {
      const name = t(tool.name, tool.en), key = kit.keyForTool(tool.id);
      return <div className="shortcut-tool-row" key={tool.id}>
        <span>{name}</span>
        <button type="button" aria-label={t("设置 " + name + " 快捷键", "Set shortcut for " + name)}
          className="shortcut-key" disabled={tool.id === "magnifier"} data-capturing={capturing === tool.id || undefined}
          onClick={() => { setCapturing(tool.id); setMessage(""); }}
          onKeyDown={event => capture(event, tool)}
          onBlur={() => { setCapturing(current => current === tool.id ? null : current); }}>
          {capturing === tool.id ? t("请按键…", "Press a key…") : key || "—"}
        </button>
        <button type="button" aria-label={t("清除 " + name + " 快捷键", "Clear shortcut for " + name)}
          disabled={!key || tool.id === "magnifier"} onClick={() => { kit.setToolShortcut(tool.id, null); setMessage(""); }}>×</button>
      </div>;
    })}</div>
    <footer><button type="button" onClick={() => { if (tab === "commands") setBindings({}); else kit.resetToolShortcuts(); setCapturing(null); setMessage(""); }}>{t("恢复默认", "Reset defaults")}</button>
      <button type="button" onClick={close}>{t("完成", "Done")}</button></footer>
  </dialog>;
}
