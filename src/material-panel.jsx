import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Preview } from "./workspace.jsx";
import "./material-panel.css";

export const materialDragType = "application/x-infinite-canvas-material";

const paths = {
  close: "M5 5l10 10M15 5L5 15",
  back: "M12 4l-6 6 6 6",
  plus: "M10 4v12M4 10h12",
  search: "M14 14l3 3M15 9a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z",
  filter: "M3 4h14l-5 6v5l-4 2v-7Z",
  star: "m10 2 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8Z",
  down: "m4 7 6 6 6-6",
  compact: "m3 3 5 5M3 8h5V3m9 14-5-5m5 0h-5v5",
  names: "M4 5h12M10 5v11m-3 0h6",
  pack: "M2.5 6h5l2 2h8v8h-15Z",
  grid: "M3 3h5v5H3zm9 0h5v5h-5zm-9 9h5v5H3zm9 0h5v5h-5z",
  dots: "M4 10h.1m5.9 0h.1m5.9 0h.1",
};

export function LibraryIcon({ name }) {
  return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 20 20" fill="none"
    stroke="currentColor" strokeWidth={name === "dots" ? 2.7 : 1.55} strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>;
}

function IconButton({ icon, label, onClick, pressed, className = "", disabled }) {
  return <button type="button" className={`material-icon ${className}`} title={label}
    aria-label={label} aria-pressed={pressed} onClick={onClick} disabled={disabled}><LibraryIcon name={icon} /></button>;
}

function indexLibrary(root) {
  const packs = [], materials = [];
  function visit(folder, path) {
    for (const object of folder.objects) materials.push({ item: object, path, folder });
    for (const child of folder.folders) {
      const next = [...path, child.id];
      packs.push({ item: child, path: next, folder });
      visit(child, next);
    }
  }
  visit(root, []);
  return { packs, materials };
}

function panelBounds(rect) {
  const width = Math.min(rect.width, window.innerWidth - 16);
  const height = Math.min(rect.height, window.innerHeight - 16);
  return {
    width, height,
    left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    top: Math.max(8, Math.min(rect.top, window.innerHeight - height - 8)),
  };
}

function initialBounds() {
  try {
    const saved = JSON.parse(localStorage.getItem("infinite-canvas-material-panel"));
    if (saved && ["width", "height", "left", "top"].every(key => Number.isFinite(saved[key]))) return panelBounds(saved);
  } catch { /* use default */ }
  return panelBounds({ width: 328, height: 550, left: window.innerWidth - 346, top: 62 });
}

const PAGE = 48;
const PackPreview = memo(function PackPreview({ pack }) {
  const samples = pack.objects.length ? pack.objects : pack.folders.flatMap(folder => folder.objects.slice(0, 3));
  if (!samples.length) return <span className="material-pack-empty"><LibraryIcon name="pack" /></span>;
  return <span className="material-pack-previews">{samples.slice(0, 3).map(item =>
    <Preview key={item.id} id={item.contentId} material={item} />)}</span>;
});

export const MaterialPanel = memo(function MaterialPanel({ library, path, current, ready, error, zh, clipboard, actionsRef }) {
  const t = (cn, en) => zh ? cn : en;
  const actions = actionsRef.current;
  const panel = useRef(null);
  const gesture = useRef(null);
  const scroll = useRef(null);
  const moveDialog = useRef(null);
  const [bounds, setBounds] = useState(initialBounds);
  const [query, setQuery] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [showNames, setShowNames] = useState(() => localStorage.getItem("infinite-canvas-material-names") !== "hide");
  const [compact, setCompact] = useState(false);
  const [kind, setKind] = useState("all");
  const [menu, setMenu] = useState(null);
  const [movingId, setMovingId] = useState(null);
  const [destination, setDestination] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [page, setPage] = useState(0);
  const [bulk, setBulk] = useState(null);
  const { packs, materials } = useMemo(() => indexLibrary(library), [library]);
  const moving = movingId && packs.find(entry => entry.item.id === movingId);
  const currentParent = moving?.path.at(-2) ?? null;
  const destinations = useMemo(() => {
    if (!moving) return [];
    const names = new Map(packs.map(({ item }) => [item.id, item.name]));
    return packs.filter(entry => entry.item.id !== currentParent && !entry.path.includes(movingId))
      .map(entry => ({ id: entry.item.id, label: entry.path.map(id => names.get(id)).join(" / ") }));
  }, [packs, moving, movingId, currentParent]);
  useEffect(() => { moveDialog.current?.showModal(); }, [moving?.item.id]);
  const needle = query.trim().toLowerCase();
  const inPack = path.length > 0;
  const match = text => text.toLowerCase().includes(needle);
  const directMaterials = useMemo(() => current.objects.map(item => ({ item, path, folder: current })), [current, path]);
  const filteredPacks = (needle && !inPack || favoriteOnly && !inPack ? packs : packs.filter(entry => entry.folder === current))
    .filter(({ item }) => (!favoriteOnly || item.favorite) && match(`${item.name} ${item.description || ""}`));
  const scope = !inPack && (needle || favoriteOnly) ? materials : directMaterials;
  const visible = scope.filter(({ item }) =>
    (!favoriteOnly || item.favorite) && (kind === "all" || (item.kind === "image") === (kind === "image")) &&
    match(`${item.name} ${(item.tags || []).join(" ")}`));
  const favorites = visible.filter(({ item }) => item.favorite);
  const regular = visible.filter(({ item }) => !item.favorite);
  const shown = [...favorites, ...regular].slice(page * PAGE, (page + 1) * PAGE);
  const visiblePackPage = filteredPacks.slice(page * PAGE, (page + 1) * PAGE);
  const pageCount = Math.max(1, Math.ceil(Math.max(visible.length, filteredPacks.length) / PAGE));
  useEffect(() => { setPage(0); setMenu(null); setBulk(null); if (scroll.current) scroll.current.scrollTop = 0; }, [path, query, favoriteOnly, kind]);
  useEffect(() => {
    if (page >= pageCount) setPage(pageCount - 1);
  }, [page, pageCount]);
  useEffect(() => {
    const resize = () => setBounds(panelBounds);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const close = event => {
      if (event.key === "Escape" || event.type === "pointerdown" && !event.target.closest(".material-menu, .material-menu-trigger")) setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [menu]);

  function pointerStart(event, mode) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { mode, x: event.clientX, y: event.clientY, bounds, next: bounds };
  }
  function pointerMove(event) {
    const state = gesture.current;
    if (!state) return;
    const dx = event.clientX - state.x, dy = event.clientY - state.y;
    const rect = state.bounds;
    const width = Math.min(610, Math.max(226, rect.width + (state.mode === "left" ? -dx : dx)));
    state.next = panelBounds(state.mode === "move" ? { ...rect, left: rect.left + dx, top: rect.top + dy } : {
      ...rect, width, height: Math.max(240, rect.height + dy),
      left: state.mode === "left" ? rect.left + rect.width - width : rect.left,
    });
    for (const [key, value] of Object.entries(state.next)) panel.current.style[key] = value + "px";
  }
  function pointerEnd() {
    if (!gesture.current) return;
    setBounds(gesture.current.next);
    try { localStorage.setItem("infinite-canvas-material-panel", JSON.stringify(gesture.current.next)); } catch { /* optional preference */ }
    gesture.current = null;
  }
  const handle = { onPointerMove: pointerMove, onPointerUp: pointerEnd, onPointerCancel: pointerEnd, onLostPointerCapture: pointerEnd };
  const close = () => actions.close();
  const openPack = next => { setQuery(""); setFavoriteOnly(false); setCompact(false); setKind("all"); actions.navigate(next); };
  const favorite = (entry, type) => actions.favorite(type, entry.item, entry.path);
  const toggleBulk = id => setBulk(previous => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const showMenu = (event, type, entry) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({ type, entry, x: Math.max(8, Math.min(rect.left, innerWidth - 204)),
      y: Math.max(8, Math.min(rect.bottom + 4, innerHeight - 285)) });
  };
  const menuAction = action => { setMenu(null); action(); };
  const section = (key, title, children) => <section className="material-section">
    <button type="button" className="material-section-title" aria-expanded={!collapsed[key]}
      onClick={() => setCollapsed(value => ({ ...value, [key]: !value[key] }))}>
      {title}<LibraryIcon name="down" />
    </button>
    {!collapsed[key] && children}
  </section>;
  const renderPack = entry => {
    const { item, path: packPath } = entry;
    return <article className="material-pack" key={item.id}
      draggable onDragStart={event => actions.dragPack(event, item)}
      onDragOver={event => { if (actions.canDrop(event)) event.preventDefault(); }}
      onDrop={event => actions.dropInPack(event, item.id)}
      onContextMenu={event => showMenu(event, "folder", entry)}>
      <div className="material-pack-heading">
        <button type="button" className="folder-open material-pack-name" onClick={() => openPack(packPath)}>{item.name}</button>
        <IconButton icon="star" label={item.favorite ? t("取消收藏素材包", "Unfavorite pack") : t("收藏素材包", "Favorite pack")}
          pressed={!!item.favorite} onClick={() => favorite(entry, "folder")} />
        <IconButton icon="dots" label={t("素材包操作", "Pack actions")} className="material-menu-trigger" onClick={event => showMenu(event, "folder", entry)} />
      </div>
      <button type="button" className="material-pack-body" onClick={() => openPack(packPath)} aria-label={t("打开素材包 ", "Open pack ") + item.name}>
        <small>{item.description || t(`${item.objects.length} 个素材 · ${item.folders.length} 个子包`, `${item.objects.length} items · ${item.folders.length} packs`)}</small>
        <PackPreview pack={item} />
      </button>
    </article>;
  };
  const renderMaterials = entries => <div className="material-grid">{entries.map(entry => {
    const { item, folder } = entry;
    return <article className={`object-card material-tile ${bulk?.has(item.id) ? "material-selected" : ""}`}
      key={item.id} draggable={!bulk} onDragStart={event => actions.dragMaterial(event, entry)}
      onContextMenu={event => showMenu(event, "object", entry)}>
      <button type="button" className="object-preview material-thumbnail" aria-label={t("放置 ", "Place ") + item.name}
        title={item.name} onClick={() => bulk ? toggleBulk(item.id) : actions.place(item, panel.current.getBoundingClientRect())}>
        <Preview id={item.contentId} material={item} />
      </button>
      {showNames && !compact && <span className="material-tile-name" title={item.name}>{item.name}
        {!inPack && needle && folder.name && <small>{folder.name}</small>}</span>}
      {bulk ? <button className="material-check" aria-label={t("选择素材", "Select material")} aria-pressed={bulk.has(item.id)} onClick={() => toggleBulk(item.id)}>{bulk.has(item.id) ? "✓" : ""}</button>
        : <><IconButton icon="star" className="material-tile-star" label={item.favorite ? t("取消收藏素材", "Unfavorite material") : t("收藏素材", "Favorite material")}
          pressed={!!item.favorite} onClick={() => favorite(entry, "object")} />
        <IconButton icon="dots" className="material-tile-menu material-menu-trigger" label={t("素材操作", "Material actions")}
          onClick={event => showMenu(event, "object", entry)} /></>}
    </article>;
  })}</div>;

  return <aside ref={panel} className={`object-library material-panel ${compact ? "material-compact" : ""}`}
    aria-label={t("我的素材", "My library")} style={bounds}
    onDragOver={event => {
      if ([...event.dataTransfer.types].includes("Files")) event.preventDefault();
    }}
    onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); actions.importFiles([...event.dataTransfer.files], path); } }}>
    <div className="material-grab" title={t("拖动素材库", "Move library")} onPointerDown={event => pointerStart(event, "move")} {...handle}><span /></div>
    <header className="material-header">
      <IconButton icon="close" label={t("关闭素材库", "Close library")} onClick={close} />
      <strong>{t("素材库", "Library")}</strong>
      <IconButton icon="dots" label={t("素材库设置", "Library settings")} className="material-menu-trigger"
        onClick={event => showMenu(event, "library")} />
    </header>
    {inPack && <div className="material-pack-toolbar">
      <IconButton icon="back" label={t("返回上一级", "Back")} onClick={() => openPack(path.slice(0, -1))} />
      <span className="material-spacer" />
      <IconButton icon="names" label={t("显示素材名称", "Show names")} pressed={showNames} onClick={() => {
        setShowNames(!showNames);
        localStorage.setItem("infinite-canvas-material-names", showNames ? "hide" : "show");
      }} />
      <IconButton icon="compact" label={t("紧凑视图", "Compact view")} pressed={compact} onClick={() => setCompact(value => !value)} />
    </div>}
    {inPack && !compact && <div className="material-pack-intro">
      <div><strong>{current.name}</strong>
        <IconButton icon="star" label={t("收藏当前素材包", "Favorite current pack")} pressed={!!current.favorite}
          onClick={() => actions.favorite("folder", current, path)} />
        <IconButton icon="dots" label={t("当前素材包操作", "Current pack actions")} className="material-menu-trigger"
          onClick={event => showMenu(event, "folder", { item: current, path })} /></div>
      {current.description && <p>{current.description}</p>}
    </div>}
    {!inPack && <div className="material-tabs">
      <IconButton icon="filter" label={t("筛选素材", "Filter materials")} className="material-menu-trigger"
        onClick={event => showMenu(event, "filter")} />
      <button type="button" aria-pressed={!favoriteOnly} onClick={() => setFavoriteOnly(false)}>{t("我的素材包", "My Packs")}</button>
      <button type="button" aria-pressed={favoriteOnly} onClick={() => setFavoriteOnly(true)}>{t("收藏", "Favorites")}</button>
    </div>}
    {!compact && <label className="material-search"><LibraryIcon name="search" /><input type="search"
      value={query} onChange={event => setQuery(event.target.value)} aria-label={t("搜索素材", "Search materials")}
      placeholder={inPack ? t("搜索此素材包", "Search this pack") : t("搜索素材包、素材或标签", "Search packs, materials, or tags")} /></label>}
    <div ref={scroll} className="material-scroll">
      {error && <p role="alert" className="material-message">{error}{ready && <button type="button" onClick={actions.retry}>{t("重试保存", "Retry")}</button>}</p>}
      {!ready && !error && <p role="status" className="material-message">{t("正在读取素材…", "Loading materials…")}</p>}
      {ready && <>
        {bulk && <div className="material-bulk"><span>{bulk.size}</span><button type="button" disabled={!bulk.size}
          onClick={() => { actions.deleteMany(bulk); setBulk(null); }}>{t("删除所选", "Delete selected")}</button>
          <button type="button" onClick={() => setBulk(null)}>{t("完成", "Done")}</button></div>}
        {!inPack && !needle && !favoriteOnly && visiblePackPage.some(entry => entry.item.favorite) &&
          section("favorites", t("收藏", "Favorites"), visiblePackPage.filter(entry => entry.item.favorite).map(renderPack))}
        {(!compact && (visiblePackPage.length > 0 || !inPack && !needle && !favoriteOnly)) &&
          section("packs", inPack ? t("子素材包", "Subpacks") : favoriteOnly ? t("收藏的素材包", "Favorite packs") : t("我的素材包", "My Packs"),
            <>{visiblePackPage.filter(entry => !(!inPack && !needle && !favoriteOnly && entry.item.favorite)).map(renderPack)}
              {!needle && !favoriteOnly && page === 0 && <button type="button" className="material-add-pack" onClick={actions.addPack}>
                <LibraryIcon name="plus" />{t("新建素材包", "New pack")}</button>}</>)}
        {shown.some(({ item }) => item.favorite) && !compact &&
          section("favorite-materials", t("收藏素材", "Favorite materials"), renderMaterials(shown.filter(({ item }) => item.favorite)))}
        {renderMaterials(compact ? shown : shown.filter(({ item }) => !item.favorite))}
        {inPack && !needle && !compact && page === 0 && <button type="button" className="material-add-pack" onClick={actions.saveSelection}>
          <LibraryIcon name="plus" />{t("将选区存为素材", "Save selection")}</button>}
        {!visible.length && !filteredPacks.length && <p className="material-message">
          {needle ? t("未找到匹配的素材。", "No matching materials.") : favoriteOnly ? t("还没有收藏。", "No favorites yet.") : t("暂无素材。", "No materials yet.")}</p>}
        {pageCount > 1 && <nav className="material-pages" aria-label={t("素材分页", "Pages")}>
          <button type="button" disabled={page === 0} onClick={() => { setPage(page - 1); scroll.current.scrollTop = 0; }}>{t("上一页", "Previous")}</button>
          <small>{page + 1} / {pageCount}</small>
          <button type="button" disabled={page + 1 >= pageCount} onClick={() => { setPage(page + 1); scroll.current.scrollTop = 0; }}>{t("下一页", "Next")}</button></nav>}
      </>}
    </div>
    {!compact && <div className="material-grips">
      <span role="presentation" onPointerDown={event => pointerStart(event, "left")} {...handle} />
      <span role="presentation" onPointerDown={event => pointerStart(event, "right")} {...handle} />
    </div>}
    {menu && <div className="material-menu" style={{ left: menu.x, top: menu.y }}>
      {menu.type === "filter" && [["all", t("全部素材", "All materials")], ["image", t("图片素材", "Images")],
        ["drawing", t("画布对象", "Canvas objects")]].map(([id, label]) => <button key={id} type="button" onClick={() => menuAction(() => setKind(id))}>{label}{kind === id && " ✓"}</button>)}
      {menu.type === "library" && <>
        <button type="button" onClick={() => menuAction(actions.addPack)}>{t("新建素材包", "New pack")}</button>
        <button type="button" onClick={() => menuAction(actions.saveSelection)}>{t("将选区存为素材", "Save selection")}</button>
        <button type="button" onClick={() => menuAction(actions.importImages)}>{t("导入图片", "Import images")}</button>
        <button type="button" disabled={!clipboard} onClick={() => menuAction(actions.paste)}>{t("粘贴", "Paste")}</button>
        <button type="button" onClick={() => menuAction(() => setBulk(new Set()))}>{t("批量选择", "Select multiple")}</button>
        <button type="button" onClick={() => menuAction(actions.importBackup)}>{t("导入素材库或素材包", "Import library or pack")}</button>
        <button type="button" onClick={() => menuAction(actions.exportBackup)}>{t("导出素材库", "Export library")}</button>
      </>}
      {menu.entry && <>
        <button type="button" onClick={() => menuAction(() => actions.edit(menu.type, menu.entry))}>{t("编辑信息", "Edit details")}</button>
        <button type="button" onClick={() => menuAction(() => actions.copy(menu.type, menu.entry, false))}>{t("复制", "Copy")}</button>
        <button type="button" onClick={() => menuAction(() => actions.copy(menu.type, menu.entry, true))}>{t("剪切", "Cut")}</button>
        {menu.type === "folder" ? <>
          <button type="button" onClick={() => menuAction(() => { setDestination(""); setMovingId(menu.entry.item.id); })}>{t("移动素材包", "Move pack")}</button>
          <button type="button" onClick={() => menuAction(() => actions.exportPack(menu.entry.item))}>{t("导出素材包", "Export pack")}</button>
        </>
          : <button type="button" onClick={() => menuAction(() => actions.replace(menu.entry))}>{t("替换为画布选区", "Replace with selection")}</button>}
        <button type="button" className="material-delete" onClick={() => menuAction(() => actions.remove(menu.type, menu.entry))}>{t("删除", "Delete")}</button>
      </>}
    </div>}
    {moving && <dialog ref={moveDialog} className="material-move-dialog" aria-labelledby="material-move-title"
      onCancel={event => { event.preventDefault(); setMovingId(null); }}>
      <form onSubmit={event => {
        event.preventDefault();
        if (destination && actions.movePack(movingId, destination === "root" ? null : destination.slice("folder:".length))) setMovingId(null);
      }}>
        <h2 id="material-move-title">{t("移动素材包", "Move pack")}</h2>
        <p>{moving.item.name}</p>
        <label>{t("移至", "Move to")}
          <select value={destination} onChange={event => setDestination(event.target.value)} autoFocus required>
            <option value="" disabled>{t("选择目标素材包", "Choose destination")}</option>
            <option value="root" disabled={currentParent === null}>{t("我的素材包（顶层）", "My Packs (top level)")}</option>
            {destinations.map(item => <option key={item.id} value={`folder:${item.id}`}>{item.label}</option>)}
          </select>
        </label>
        {currentParent === null && !destinations.length && <p>{t("暂无可用的目标素材包。", "No available destination packs.")}</p>}
        <footer>
          <button type="button" onClick={() => setMovingId(null)}>{t("取消", "Cancel")}</button>
          <button type="submit" disabled={!destination}>{t("移动", "Move")}</button>
        </footer>
      </form>
    </dialog>}
  </aside>;
});
