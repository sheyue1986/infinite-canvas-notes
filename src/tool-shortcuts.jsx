import React, { useEffect, useRef, useState } from "react";
import "./tool-shortcuts.css";

export function shortcutFromEvent(event) {
  const key = event.shiftKey && /^Digit[0-9]$/.test(event.code) ? event.code.at(-1) : event.key;
  if (event.ctrlKey || event.metaKey || !/^[a-z0-9]$/i.test(key)) return null;
  return (event.altKey ? "Alt+" : "") + (event.shiftKey ? "Shift+" : "") + key.toUpperCase();
}

export function ShortcutSettings({ kit, zh, close }) {
  const dialog = useRef(null);
  const [capturing, setCapturing] = useState(null);
  const [message, setMessage] = useState("");
  const t = (cn, en) => zh ? cn : en;
  useEffect(() => { dialog.current.showModal(); }, []);
  const capture = (event, tool) => {
    if (capturing !== tool.id || event.key === "Tab") return;
    if (event.isComposing || ["Alt", "Shift", "Control", "Meta"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") { setCapturing(null); setMessage(""); return; }
    const key = shortcutFromEvent(event);
    if (!key || /^(Alt\+[1-8DEFL]|Shift\+[12GS])$/.test(key)) {
      setMessage(t("请使用可分配的字母或数字，可搭配 Alt、Shift。此按键保留给浏览器或画布。", "Use an available letter or number, with optional Alt or Shift. This key is reserved."));
      return;
    }
    const duplicate = kit.shortcutForKey(key);
    if (duplicate && duplicate !== tool.id) {
      const conflict = kit.shortcutTools.find(item => item.id === duplicate);
      setMessage(t(key + " 已分配给「" + conflict.name + "」。请先清除或更改它。", key + " is already assigned to " + conflict.en + "."));
      return;
    }
    kit.setToolShortcut(tool.id, key);
    setCapturing(null);
    setMessage("");
  };
  return <dialog ref={dialog} className="shortcut-settings" aria-labelledby="shortcut-settings-title"
    onCancel={event => { event.preventDefault(); close(); }}>
    <header><h2 id="shortcut-settings-title">{t("快捷键设置", "Keyboard shortcuts")}</h2>
      <button type="button" aria-label={t("关闭快捷键设置", "Close keyboard shortcuts")} onClick={close}>×</button></header>
    <p>{t("点击按键格，再按所需的键。设置即时生效。", "Click a key field and press the desired key. Changes apply immediately.")}</p>
    {message && <p className="shortcut-message" role="alert">{message}</p>}
    <div className="shortcut-tool-list">{kit.shortcutTools.map(tool => {
      const name = t(tool.name, tool.en), key = kit.keyForTool(tool.id);
      return <div className="shortcut-tool-row" key={tool.id}>
        <span>{name}</span>
        <button type="button" aria-label={t("设置 " + name + " 快捷键", "Set shortcut for " + name)}
          className="shortcut-key" data-capturing={capturing === tool.id || undefined}
          onClick={() => { setCapturing(tool.id); setMessage(""); }}
          onKeyDown={event => capture(event, tool)}
          onBlur={() => { setCapturing(current => current === tool.id ? null : current); }}>
          {capturing === tool.id ? t("请按键…", "Press a key…") : key || "—"}
        </button>
        <button type="button" aria-label={t("清除 " + name + " 快捷键", "Clear shortcut for " + name)}
          disabled={!key} onClick={() => { kit.setToolShortcut(tool.id, null); setMessage(""); }}>×</button>
      </div>;
    })}</div>
    <footer><button type="button" onClick={() => { kit.resetToolShortcuts(); setCapturing(null); setMessage(""); }}>{t("恢复默认", "Reset defaults")}</button>
      <button type="button" onClick={close}>{t("完成", "Done")}</button></footer>
  </dialog>;
}
