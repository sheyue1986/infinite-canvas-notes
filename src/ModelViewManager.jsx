import React, { useState } from "react";

export default function ModelViewManager({ views, zh, close, edit, duplicate, remove, busy }) {
  const [renaming, setRenaming] = useState(null);
  const [name, setName] = useState("");
  const t = (a, b) => zh ? a : b;
  return <section className="model-view-manager" aria-label={t("管理视角", "Manage views")}>
    <header><strong>{t("管理视角", "Manage views")}</strong><button type="button" onClick={close} aria-label={t("关闭视角管理", "Close view manager")}>×</button></header>
    <div className="model-view-manager-list">
      {views.map((view, i) => <div className="model-view-manager-row" key={view.id}>
        {renaming === view.id ? <form onSubmit={async event => {
          event.preventDefault();
          if (name.trim() && await edit(view.id, { name: name.trim() })) setRenaming(null);
        }}>
          <input autoFocus aria-label={t("视角名称", "View name")} maxLength={80} value={name} onChange={event => setName(event.target.value)} />
          <button disabled={busy || !name.trim()}>{t("保存", "Save")}</button>
          <button type="button" onClick={() => setRenaming(null)}>{t("取消", "Cancel")}</button>
        </form> : <>
          <span title={view.name}>{view.name}</span>
          <button type="button" disabled={busy} onClick={() => { setName(view.name); setRenaming(view.id); }}>{t("重命名", "Rename")}</button>
          <button type="button" disabled={busy} onClick={() => void duplicate(view)}>{t("复制", "Duplicate")}</button>
          <button type="button" disabled={busy} onClick={() => void remove(view)}>{t("删除", "Delete")}</button>
          <button type="button" aria-label={t("上移", "Move up")} disabled={busy || !i} onClick={() => void edit(view.id, { move: -1 })}>↑</button>
          <button type="button" aria-label={t("下移", "Move down")} disabled={busy || i === views.length - 1} onClick={() => void edit(view.id, { move: 1 })}>↓</button>
        </>}
      </div>)}
    </div>
  </section>;
}
