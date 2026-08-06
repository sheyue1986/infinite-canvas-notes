
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { Excalidraw, convertToExcalidrawElements, exportToSvg } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./style.css";

const STORAGE_KEY = "infinite-canvas-notes-library-v2";
const LIBRARY_DB_NAME = "infinite-canvas-notes";
const LIBRARY_DB_STORE = "library";
const LIBRARY_DB_KEY = "materials";
const CANVAS_DB_KEY = "canvas";
const CANVAS_BACKUP_DB_KEY = "canvas-backup";
const LANGUAGE_KEY = "infinite-canvas-notes-language";

const makeFolder = (name = "新建文件夹") => ({
  id: crypto.randomUUID(), name, folders: [], objects: [],
});

function loadLegacyLibrary() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return value || { folders: [], objects: [] };
  } catch {
    return { folders: [], objects: [] };
  }
}

function isValidLibrary(value) {
  return Boolean(value && Array.isArray(value.folders) && Array.isArray(value.objects));
}

function isValidLibraryFolder(value) {
  return Boolean(
    value
    && typeof value.name === "string"
    && Array.isArray(value.folders)
    && Array.isArray(value.objects)
    && value.folders.every(isValidLibraryFolder),
  );
}

function cloneImportedFolder(folder) {
  return {
    ...folder,
    id: crypto.randomUUID(),
    folders: folder.folders.map(cloneImportedFolder),
    objects: folder.objects.map((object) => ({ ...object, id: crypto.randomUUID() })),
  };
}

function safeDownloadName(name) {
  return (name || "素材文件夹").replace(/[\\/:*?"<>|]/g, "_").trim() || "素材文件夹";
}

function indexLibraryObjects(folder, idPath = [], namePath = []) {
  const folderName = folder.name ? [...namePath, folder.name] : namePath;
  const pathLabel = folderName.join(" / ");
  const matches = folder.objects.map((object) => ({
    object,
    sourcePath: idPath,
    pathLabel,
    searchText: `${object.name || ""} ${pathLabel}`.toLocaleLowerCase(),
  }));
  return folder.folders.reduce((results, child) => [
    ...results,
    ...indexLibraryObjects(child, [...idPath, child.id], folderName),
  ], matches);
}

async function readBundledLibrary() {
  const embedded = globalThis.__INFINITE_CANVAS_BUNDLED_LIBRARY__;
  if (isValidLibrary(embedded)) return embedded;
  try {
    const response = await fetch("./materials-library.json", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    const value = payload?.library || payload;
    return isValidLibrary(value) ? value : null;
  } catch {
    return null;
  }
}

function openLibraryDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LIBRARY_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LIBRARY_DB_STORE)) {
        request.result.createObjectStore(LIBRARY_DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readIndexedLibrary() {
  const database = await openLibraryDatabase();
  try {
    const value = await new Promise((resolve, reject) => {
      const request = database.transaction(LIBRARY_DB_STORE, "readonly").objectStore(LIBRARY_DB_STORE).get(LIBRARY_DB_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return value ? JSON.parse(value) : null;
  } finally {
    database.close();
  }
}

async function writeIndexedLibrary(library) {
  const database = await openLibraryDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(LIBRARY_DB_STORE, "readwrite");
      transaction.objectStore(LIBRARY_DB_STORE).put(JSON.stringify(library), LIBRARY_DB_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

async function readIndexedCanvas() {
  const database = await openLibraryDatabase();
  try {
    const values = await new Promise((resolve, reject) => {
      const store = database.transaction(LIBRARY_DB_STORE, "readonly").objectStore(LIBRARY_DB_STORE);
      const currentRequest = store.get(CANVAS_DB_KEY);
      const backupRequest = store.get(CANVAS_BACKUP_DB_KEY);
      let current;
      let backup;
      let completed = 0;
      const finish = () => {
        completed += 1;
        if (completed === 2) resolve({ current, backup });
      };
      currentRequest.onsuccess = () => { current = currentRequest.result; finish(); };
      backupRequest.onsuccess = () => { backup = backupRequest.result; finish(); };
      currentRequest.onerror = () => reject(currentRequest.error);
      backupRequest.onerror = () => reject(backupRequest.error);
    });
    if (values.current) {
      try {
        return JSON.parse(values.current);
      } catch {
        // Fall through to the previous known-good scene.
      }
    }
    return values.backup ? JSON.parse(values.backup) : null;
  } finally {
    database.close();
  }
}

async function writeIndexedCanvas(canvas) {
  const database = await openLibraryDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(LIBRARY_DB_STORE, "readwrite");
      const store = transaction.objectStore(LIBRARY_DB_STORE);
      const currentRequest = store.get(CANVAS_DB_KEY);
      currentRequest.onsuccess = () => {
        const current = currentRequest.result;
        if (current) store.put(current, CANVAS_BACKUP_DB_KEY);
        store.put(JSON.stringify(canvas), CANVAS_DB_KEY);
      };
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

function withoutNativeLinks(elements = []) {
  return elements.map((element) => elementIdFromNativeLink(element.link)
    ? { ...element, link: null, version: element.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31), updated: Date.now() }
    : element);
}

function elementIdFromNativeLink(link) {
  if (!link) return null;
  try {
    return new URL(link, window.location.href).searchParams.get("element");
  } catch {
    return null;
  }
}

function migrateNativeElementLinks(elements = [], currentRelationships = {}) {
  const availableIds = new Set(elements.filter((element) => !element.isDeleted).map((element) => element.id));
  let changed = false;
  let next = currentRelationships;
  const add = (from, to) => {
    const values = next[from] || [];
    if (values.includes(to)) return;
    next = { ...next, [from]: [...values, to] };
    changed = true;
  };
  elements.forEach((element) => {
    const targetId = elementIdFromNativeLink(element.link);
    if (!targetId || targetId === element.id || !availableIds.has(targetId)) return;
    add(element.id, targetId);
    add(targetId, element.id);
  });
  return { relationships: next, changed };
}

function folderAt(root, path) {
  return path.reduce((folder, id) => folder.folders.find((child) => child.id === id) || folder, root);
}

function updateFolder(root, path, transform) {
  if (!path.length) return transform(root);
  return {
    ...root,
    folders: root.folders.map((folder) => folder.id === path[0]
      ? updateFolder(folder, path.slice(1), transform)
      : folder),
  };
}

function findFolder(root, id) {
  for (const folder of root.folders) {
    if (folder.id === id) return folder;
    const nested = findFolder(folder, id);
    if (nested) return nested;
  }
  return null;
}

function updateFolderById(root, id, transform) {
  return {
    ...root,
    folders: root.folders.map((folder) => folder.id === id
      ? transform(folder)
      : updateFolderById(folder, id, transform)),
  };
}

function removeFolderById(root, id) {
  return {
    ...root,
    folders: root.folders.filter((folder) => folder.id !== id).map((folder) => removeFolderById(folder, id)),
  };
}

function containsFolder(folder, id) {
  return folder.id === id || folder.folders.some((child) => containsFolder(child, id));
}

function listFolders(root, prefix = []) {
  return root.folders.flatMap((folder) => [
    { id: folder.id, name: [...prefix, folder.name].join(" / ") },
    ...listFolders(folder, [...prefix, folder.name]),
  ]);
}

function storedFile(file) {
  return {
    id: file.id,
    dataURL: file.dataURL,
    mimeType: file.mimeType || "image/png",
    created: typeof file.created === "number" ? file.created : Date.now(),
  };
}

async function thumbnail(elements, files) {
  try {
    const svg = await exportToSvg({
      elements,
      files,
      appState: { exportBackground: true, viewBackgroundColor: "#ffffff" },
    });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
  } catch {
    return "";
  }
}

function FolderIcon() {
  return <svg className="folder-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h6l1.8 2h9.2v9.8a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2Z" /><path d="M3.5 8.5h17" /></svg>;
}

function EraserIcon() {
  return <svg className="eraser-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m14.7 4.5 4.8 4.8-8.6 8.6H6.1L3.8 15.6Z" /><path d="M10.9 17.9h8.5" /></svg>;
}

async function removeImageBackground(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const value = new Image();
    value.onload = () => resolve(value);
    value.onerror = reject;
    value.src = dataUrl;
  });
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  const { data } = pixels;
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, (height * width - 1) * 4];
  const background = [0, 1, 2].map((channel) => Math.round(corners.reduce((sum, index) => sum + data[index + channel], 0) / corners.length));
  const visited = new Uint8Array(width * height);
  const queue = [];
  const closeToBackground = (index) => Math.hypot(data[index] - background[0], data[index + 1] - background[1], data[index + 2] - background[2]) < 54;
  const add = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const position = y * width + x;
    if (visited[position] || !closeToBackground(position * 4)) return;
    visited[position] = 1;
    queue.push(position);
  };
  for (let x = 0; x < width; x += 1) { add(x, 0); add(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { add(0, y); add(width - 1, y); }
  for (let offset = 0; offset < queue.length; offset += 1) {
    const position = queue[offset];
    data[position * 4 + 3] = 0;
    const x = position % width;
    const y = Math.floor(position / width);
    add(x - 1, y); add(x + 1, y); add(x, y - 1); add(x, y + 1);
  }
  context.putImageData(pixels, 0, 0);
  return { dataUrl: canvas.toDataURL("image/png"), width, height };
}

async function imageToCanvas(file) {
  const response = await fetch(file.dataURL);
  const blob = await response.blob();
  const image = await new Promise((resolve, reject) => {
    const value = new Image();
    value.onload = () => resolve(value);
    value.onerror = reject;
    value.src = URL.createObjectURL(blob);
  });
  URL.revokeObjectURL(image.src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return canvas;
}

function App() {
  const apiRef = useRef(null);
  const [library, setLibrary] = useState({ folders: [], objects: [] });
  const [libraryReady, setLibraryReady] = useState(false);
  const [canvasInitialData, setCanvasInitialData] = useState({ appState: { viewBackgroundColor: "#f2f2f7" }, elements: [], files: {} });
  const [canvasReady, setCanvasReady] = useState(false);
  const [relationships, setRelationships] = useState({});
  const [relationshipCollections, setRelationshipCollections] = useState({});
  const [relationshipNames, setRelationshipNames] = useState({});
  const [selectedElementIds, setSelectedElementIds] = useState({});
  const [relationshipSourceId, setRelationshipSourceId] = useState(null);
  const [relationshipMenuOpen, setRelationshipMenuOpen] = useState(false);
  const [relationshipHost, setRelationshipHost] = useState(null);
  const [relationshipOverlayElement, setRelationshipOverlayElement] = useState(null);
  const [canvasViewport, setCanvasViewport] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [path, setPath] = useState([]);
  const [placing, setPlacing] = useState(null);
  const [materialBrush, setMaterialBrush] = useState(null);
  const [materialBrushPicking, setMaterialBrushPicking] = useState(false);
  const [materialBrushSettings, setMaterialBrushSettings] = useState({ size: 100, randomSize: 20, randomRotation: 15, spacing: 120 });
  const [materialBrushDrawing, setMaterialBrushDrawing] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [nameDialog, setNameDialog] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "zh-CN");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [eraserMenuOpen, setEraserMenuOpen] = useState(false);
  const [partialEraser, setPartialEraser] = useState(false);
  const [magicWand, setMagicWand] = useState(false);
  const [brushSize, setBrushSize] = useState(32);
  const [freeDrawWidth, setFreeDrawWidth] = useState(6);
  const [brushPosition, setBrushPosition] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [draggedFolderId, setDraggedFolderId] = useState(null);
  const [draggedObjectId, setDraggedObjectId] = useState(null);
  const [objectMenu, setObjectMenu] = useState(null);
  const [libraryMenu, setLibraryMenu] = useState(null);
  const [libraryClipboard, setLibraryClipboard] = useState(null);
  const [librarySelection, setLibrarySelection] = useState(null);
  const [bulkEditing, setBulkEditing] = useState(false);
  const [bulkObjectIds, setBulkObjectIds] = useState(() => new Set());
  const [librarySearch, setLibrarySearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [backupMenuOpen, setBackupMenuOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgroundScale, setBackgroundScale] = useState(100);
  const [backgroundColor, setBackgroundColor] = useState("#f2f2f7");
  const [backgroundPanelOpen, setBackgroundPanelOpen] = useState(false);
  const [straightLinePreview, setStraightLinePreview] = useState(null);
  const eraseSessionRef = useRef(null);
  const straightLineSessionRef = useRef(null);
  const straightLineAnchorRef = useRef(null);
  const freeDrawPointerRef = useRef(null);
  const partialStraightPromiseRef = useRef(null);
  const backgroundInputRef = useRef(null);
  const libraryImportRef = useRef(null);
  const folderImportRef = useRef(null);
  const folderImportTargetRef = useRef(null);
  const activeToolRef = useRef("selection");
  const libraryWriteQueueRef = useRef(Promise.resolve());
  const librarySaveTimerRef = useRef(null);
  const materialBrushSessionRef = useRef(null);
  const materialBrushFileIdsRef = useRef(new Map());
  const canvasWriteQueueRef = useRef(Promise.resolve());
  const canvasSaveTimerRef = useRef(null);
  const pendingCanvasPayloadRef = useRef(null);
  const canvasSignatureRef = useRef("");
  const skippedInitialCanvasChangeRef = useRef(false);
  const removingNativeLinksRef = useRef(false);
  const relationshipsRef = useRef({});
  const relationshipCollectionsRef = useRef({});
  const relationshipNamesRef = useRef({});
  const relationshipHostRef = useRef(null);

  const zh = language === "zh-CN";
  const ui = zh ? {
    library: "我的素材", newFolder: "新建文件夹", save: "将选区存为素材", removeBg: "图片去底", processing: "正在去底…",
    hint: "点击文件夹进入；点击素材后跟随鼠标，单击画布确认放置。", empty: "此文件夹还没有素材。",
    back: "‹ 返回", place: "放置", objects: "个对象", delete: "删除", cancel: "取消", confirm: "确定",
    folderDialog: "新建素材文件夹", saveDialog: "保存选区为素材", name: "名称", placed: "单击放置 · Esc 取消",
    selectFirst: "请先使用选择工具选中画布内容。", imageFailed: "图片处理失败，请换一张图片重试。", language: "切换至 English", deleteFolder: "删除文件夹", moveHint: "拖到另一文件夹以移动", partialEraser: "局部擦除", magicWand: "魔棒选择", selectImage: "请先选中一张图片后再使用此工具。",
  } : {
    library: "My library", newFolder: "New folder", save: "Save selection", removeBg: "Remove background", processing: "Processing…",
    hint: "Open a folder, then choose a material. Click the canvas to place it.", empty: "This folder is empty.",
    back: "‹ Back", place: "Place", objects: "objects", delete: "Delete", cancel: "Cancel", confirm: "Confirm",
    folderDialog: "New material folder", saveDialog: "Save selection", name: "Name", placed: "Click to place · Esc to cancel",
    selectFirst: "Select content on the canvas first.", imageFailed: "Couldn't process this image. Please try another one.", language: "Switch to 中文", deleteFolder: "Delete folder", moveHint: "Drag onto another folder to move", partialEraser: "Partial erase", magicWand: "Magic wand", selectImage: "Select one image before using this tool.",
  };

  const current = useMemo(() => folderAt(library, path), [library, path]);
  const folderOptions = useMemo(() => listFolders(library), [library]);
  const librarySearchIndex = useMemo(() => indexLibraryObjects(library), [library]);
  const normalizedLibrarySearch = librarySearch.trim();
  const visibleFolders = useMemo(() => normalizedLibrarySearch ? [] : current.folders, [current.folders, normalizedLibrarySearch]);
  const visibleObjectEntries = useMemo(() => normalizedLibrarySearch
    ? librarySearchIndex.filter((entry) => entry.searchText.includes(normalizedLibrarySearch.toLocaleLowerCase()))
    : current.objects.map((object) => ({ object, sourcePath: path, pathLabel: "" })), [current.objects, librarySearchIndex, normalizedLibrarySearch, path]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const saved = await readIndexedLibrary();
        if (isValidLibrary(saved)) {
          if (active) setLibrary(saved);
        } else {
          // A portable package can include materials-library.json. It is used once,
          // only when this browser has no existing material library yet.
          const bundled = await readBundledLibrary();
          const legacy = bundled || loadLegacyLibrary();
          await writeIndexedLibrary(legacy);
          // Only discard the old small localStorage copy after IndexedDB has accepted it.
          localStorage.removeItem(STORAGE_KEY);
          if (active) setLibrary(legacy);
        }
      } catch {
       …15092 tokens truncated… (!materialBrush) return undefined;
    const leaveBrushWhenChoosingTool = (event) => {
      if (!event.target.closest?.(".App-toolbar")) return;
      setMaterialBrush(null);
      setMaterialBrushDrawing(false);
      materialBrushSessionRef.current = null;
    };
    document.addEventListener("pointerdown", leaveBrushWhenChoosingTool, true);
    return () => document.removeEventListener("pointerdown", leaveBrushWhenChoosingTool, true);
  }, [materialBrush]);

  return (
    <main className={`app-shell ${placing ? "is-placing" : ""} ${materialBrush ? "is-material-brush" : ""} ${(partialEraser || magicWand) ? "is-pixel-tool" : ""}`}>
      <div
        className="canvas-shell"
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundRepeat: "repeat", backgroundSize: `${backgroundScale}px ${backgroundScale}px` } : undefined}
        onPointerMove={(event) => {
          if (placing) setPointer({ x: event.clientX, y: event.clientY });
          if (handleCanvasPointerMove(event)) return;
          if (partialEraser || magicWand) {
            setBrushPosition({ x: event.clientX, y: event.clientY });
          }
          if (partialEraser) {
            if (event.buttons & 1) void eraseSelectedImageArea(event);
          }
        }}
        onPointerDownCapture={(event) => {
          if (handleCanvasPointerDown(event)) return;
          if (partialEraser) void eraseSelectedImageArea(event);
          else if (magicWand) void magicWandAtPoint(event);
          else confirmPlacement(event);
        }}
        onPointerUpCapture={(event) => {
          if (handleCanvasPointerUp(event)) return;
          if (partialEraser && eraseSessionRef.current) void eraseSelectedImageArea(event, true);
        }}
      >
        {canvasReady && <Excalidraw
          excalidrawAPI={(api) => { apiRef.current = api; }}
          onLinkOpen={handleNativeLinkOpen}
          onPointerDown={handleExcalidrawPointerDown}
          onChange={(elements, appState, files) => {
            const activeTool = appState.activeTool?.type || "selection";
            activeToolRef.current = activeTool;
            const nextSelectedElementIds = appState.selectedElementIds || {};
            setSelectedElementIds(nextSelectedElementIds);
            const selectedIds = Object.keys(nextSelectedElementIds).filter((id) => nextSelectedElementIds[id]);
            const overlayElements = elements.filter((element) => selectedIds.includes(element.id) && !element.isDeleted);
            const overlayBounds = overlayElements.length ? {
              x: Math.min(...overlayElements.map((element) => element.x)),
              y: Math.min(...overlayElements.map((element) => element.y)),
              right: Math.max(...overlayElements.map((element) => element.x + element.width)),
              bottom: Math.max(...overlayElements.map((element) => element.y + element.height)),
            } : null;
            const nextOverlayElement = overlayBounds ? {
              id: selectedIds.sort().join("|"),
              type: overlayElements.length > 1 ? "collection" : overlayElements[0].type,
              x: overlayBounds.x,
              y: overlayBounds.y,
              width: overlayBounds.right - overlayBounds.x,
              height: overlayBounds.bottom - overlayBounds.y,
              angle: overlayElements.length === 1 ? overlayElements[0].angle : 0,
              version: overlayElements.map((element) => element.version).join("|"),
            } : null;
            setRelationshipOverlayElement((currentOverlayElement) => JSON.stringify(currentOverlayElement) === JSON.stringify(nextOverlayElement)
              ? currentOverlayElement
              : nextOverlayElement);
            const nextCanvasViewport = {
              scrollX: appState.scrollX || 0,
              scrollY: appState.scrollY || 0,
              zoom: appState.zoom?.value || 1,
              offsetLeft: appState.offsetLeft || 0,
              offsetTop: appState.offsetTop || 0,
            };
            setCanvasViewport((currentCanvasViewport) => JSON.stringify(currentCanvasViewport) === JSON.stringify(nextCanvasViewport)
              ? currentCanvasViewport
              : nextCanvasViewport);
            if (!removingNativeLinksRef.current && ingestNativeElementLinks(elements, appState, files)) return;
            if (!skippedInitialCanvasChangeRef.current) {
              skippedInitialCanvasChangeRef.current = true;
              return;
            }
            saveCanvas(elements, appState, files);
          }}
          langCode={language}
          initialData={canvasInitialData}
        />}
      </div>

      <input ref={backgroundInputRef} className="visually-hidden" type="file" accept="image/*" onChange={chooseBackgroundImage} />
      <input ref={libraryImportRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importLibrary} />
      <input ref={folderImportRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importFolder} />

      <button className="library-trigger" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} title={ui.library} aria-label={ui.library}>◫</button>

      {isOpen && (
        <aside className="object-library" aria-label={ui.library}>
          <header>
            <button className="back-button" onClick={() => path.length ? setPath((items) => items.slice(0, -1)) : setIsOpen(false)}>
              {path.length ? ui.back : "×"}
            </button>
            <strong>{current.name || ui.library}</strong>
            <button onClick={addFolder} title={ui.newFolder} aria-label={ui.newFolder}>＋</button>
          </header>
          <div className="library-actions">
            <button className="library-icon-action" onClick={saveSelection} title={ui.save} aria-label={ui.save}>▣</button>
            <button className={`library-icon-action ${bulkEditing ? "is-active" : ""}`} onClick={() => { setBulkEditing((active) => !active); setBulkObjectIds(new Set()); }} title={zh ? "批量编辑" : "Bulk edit"} aria-label={zh ? "批量编辑" : "Bulk edit"}>☷</button>
            <button className={`library-icon-action ${searchOpen ? "is-active" : ""}`} onClick={() => { setSearchOpen((active) => !active); if (searchOpen) setLibrarySearch(""); }} title={zh ? "搜索素材" : "Search materials"} aria-label={zh ? "搜索素材" : "Search materials"}>⌕</button>
            <button className={`library-icon-action ${materialBrushPicking ? "is-active" : ""}`} onClick={() => setMaterialBrushPicking((active) => !active)} title={zh ? "选择素材画笔" : "Choose material brush"} aria-label={zh ? "选择素材画笔" : "Choose material brush"}>✣</button>
            <span className="library-backup">
              <button className={`library-icon-action ${backupMenuOpen ? "is-active" : ""}`} onClick={() => setBackupMenuOpen((open) => !open)} title={zh ? "素材库备份与导入" : "Library backup and import"} aria-label={zh ? "素材库备份与导入" : "Library backup and import"}>⋯</button>
              {backupMenuOpen && <div className="library-backup-menu"><button onClick={exportLibrary}>{zh ? "导出素材库" : "Export library"}</button><button onClick={() => libraryImportRef.current?.click()}>{zh ? "导入素材库" : "Import library"}</button><button onClick={() => chooseFolderImport()}>{zh ? "导入素材文件夹" : "Import folder"}</button></div>}
            </span>
          </div>
          {searchOpen && <input className="library-search" autoFocus value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder={zh ? "搜索" : "Search"} aria-label={zh ? "搜索素材" : "Search materials"} />}
          {bulkEditing && <div className="bulk-actions"><span>{bulkObjectIds.size}</span><button onClick={deleteBulkObjects} title={ui.delete} aria-label={ui.delete}>⌫</button></div>}
          <p className={`hint ${materialBrushPicking ? "is-brush-picking" : ""}`}>{materialBrushPicking ? (zh ? "点击一个素材，将它设为素材画笔。" : "Choose a material to use as the brush.") : `${ui.hint} ${ui.moveHint}`}</p>
          <div className="library-content">
            {visibleFolders.map((folder) => (
              <div className={`folder-card ${draggedFolderId === folder.id ? "is-dragging" : ""}`} key={folder.id} draggable
                onDragStart={() => setDraggedFolderId(folder.id)} onDragEnd={() => setDraggedFolderId(null)}
                onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedObjectId) transferObject(draggedObjectId, folder.id); else moveFolder(draggedFolderId, folder.id); setDraggedFolderId(null); setDraggedObjectId(null); }}>
                <button className="folder-open" onClick={() => setPath((items) => [...items, folder.id])} title={folder.name}>
                  <FolderIcon /><b>{folder.name}</b><small>{folder.folders.length + folder.objects.length}</small>
                </button>
                <button className="library-clip-action" onClick={() => { setLibrarySelection({ type: "folder", id: folder.id }); setLibraryMenu(libraryMenu === `folder:${folder.id}` ? null : `folder:${folder.id}`); }} title={zh ? "更多操作" : "More actions"}>⌄</button>
                {libraryMenu === `folder:${folder.id}` && <div className="object-transfer-menu"><button onClick={() => renameFolder(folder)}>{zh ? "重命名" : "Rename"}</button><button onClick={() => copyLibraryItem("folder", folder)}>{zh ? "复制" : "Copy"} <kbd>Ctrl+C</kbd></button><button onClick={() => copyLibraryItem("folder", folder, true)}>{zh ? "剪切" : "Cut"} <kbd>Ctrl+X</kbd></button><button disabled={!libraryClipboard} onClick={pasteLibraryItem}>{zh ? "粘贴" : "Paste"} <kbd>Ctrl+V</kbd></button><button onClick={() => exportFolder(folder)}>{zh ? "导出文件夹" : "Export folder"}</button><button onClick={() => chooseFolderImport(folder.id)}>{zh ? "导入文件夹到此处" : "Import into folder"}</button><button className="transfer-delete" onClick={() => deleteLibraryItem("folder", folder)}>{zh ? "删除" : "Delete"} <kbd>Del</kbd></button></div>}
                <button className="folder-delete" onClick={() => deleteFolder(folder.id, folder.name)} title={ui.deleteFolder} aria-label={ui.deleteFolder}>×</button>
              </div>
            ))}
            {visibleObjectEntries.map(({ object, sourcePath, pathLabel }) => (
              <article className={`object-card ${bulkObjectIds.has(object.id) ? "is-selected" : ""}`} key={object.id} draggable={!bulkEditing && !normalizedLibrarySearch} onDragStart={() => setDraggedObjectId(object.id)} onDragEnd={() => setDraggedObjectId(null)}>
                {bulkEditing && !normalizedLibrarySearch && <button className="bulk-object-check" onClick={() => toggleBulkObject(object.id)} title={bulkObjectIds.has(object.id) ? (zh ? "取消选择" : "Deselect") : (zh ? "选择素材" : "Select material")}>{bulkObjectIds.has(object.id) ? "✓" : ""}</button>}
                <button className="object-preview" onClick={() => bulkEditing ? toggleBulkObject(object.id) : materialBrushPicking ? activateMaterialBrush(object) : beginPlacement(object)} title={materialBrushPicking ? `${zh ? "设为素材画笔" : "Use as material brush"}: ${object.name}` : `${ui.place}: ${object.name}`}>
                  {object.preview ? <img src={object.preview} alt="" /> : <span>{object.elements?.length || 1}</span>}
                </button>
                <div><button className="object-name" onClick={() => bulkEditing ? toggleBulkObject(object.id) : materialBrushPicking ? activateMaterialBrush(object) : beginPlacement(object)} onDoubleClick={() => renameObject(object, sourcePath)}>{object.name}</button><small>{pathLabel || (object.kind === "image" ? "PNG" : `${object.elements.length} ${ui.objects}`)}</small></div>
                {!bulkEditing && <button className="library-clip-action" onClick={() => { setLibrarySelection({ type: "object", id: object.id }); setLibraryMenu(libraryMenu === `object:${object.id}` ? null : `object:${object.id}`); }} title={zh ? "更多操作" : "More actions"}>⌄</button>}
                {libraryMenu === `object:${object.id}` && <div className="object-transfer-menu"><button onClick={() => activateMaterialBrush(object)}>{zh ? "设为素材画笔" : "Use as material brush"}</button><button onClick={() => renameObject(object, sourcePath)}>{zh ? "重命名" : "Rename"}</button><button onClick={() => copyLibraryItem("object", object, false, sourcePath)}>{zh ? "复制" : "Copy"} <kbd>Ctrl+C</kbd></button><button onClick={() => copyLibraryItem("object", object, true, sourcePath)}>{zh ? "剪切" : "Cut"} <kbd>Ctrl+X</kbd></button><button disabled={!libraryClipboard} onClick={pasteLibraryItem}>{zh ? "粘贴" : "Paste"} <kbd>Ctrl+V</kbd></button><button className="transfer-delete" onClick={() => deleteLibraryItem("object", object, sourcePath)}>{zh ? "删除" : "Delete"} <kbd>Del</kbd></button></div>}
                {!bulkEditing && !normalizedLibrarySearch && <button className="object-actions" onClick={() => setObjectMenu(objectMenu === object.id ? null : object.id)} title={zh ? "移动或复制" : "Move or copy"}>⌄</button>}
                {objectMenu === object.id && <div className="object-transfer-menu"><small>{zh ? "移动到" : "Move to"}</small>{folderOptions.map((folder) => <button key={`move-${folder.id}`} onClick={() => transferObject(object.id, folder.id)}>{folder.name}</button>)}<small>{zh ? "复制到" : "Copy to"}</small>{folderOptions.map((folder) => <button key={`copy-${folder.id}`} onClick={() => transferObject(object.id, folder.id, true)}>{folder.name}</button>)}<button className="transfer-delete" onClick={() => { removeObject(object.id); setObjectMenu(null); }}>{ui.delete}</button></div>}
              </article>
            ))}
            {!visibleFolders.length && !visibleObjectEntries.length && <p className="empty">{librarySearch ? (zh ? "未找到素材。" : "No materials found.") : ui.empty}</p>}
          </div>
        </aside>
      )}

      {relationshipHost && selectedRelationshipElement && createPortal(
        <span className="canvas-native-relationship">
          <button
            type="button"
            className={`canvas-native-relationship-trigger ${relationshipSourceId ? "is-linking" : ""}`}
            onClick={() => {
              if (relationshipSourceId) setRelationshipSourceId(null);
              else startRelationship();
            }}
            title={relationshipSourceId ? (zh ? "取消关联" : "Cancel relation") : (zh ? "选择关联对象" : "Select linked object")}
            aria-label={relationshipSourceId ? (zh ? "取消关联" : "Cancel relation") : (zh ? "双向关联" : "Two-way relation")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a4 4 0 0 0 5.7.1l2-2a4 4 0 0 0-5.7-5.7l-1.1 1.1M13.4 10.6a4 4 0 0 0-5.7-.1l-2 2a4 4 0 0 0 5.7 5.7l1.1-1.1" /></svg>
          </button>
        </span>,
        relationshipHost,
      )}
      {relationshipOverlayPosition && <div className="relationship-object-jump" style={relationshipOverlayPosition}>
        <button
          type="button"
          className="relationship-object-jump-trigger"
          onClick={() => relationshipTargets.length === 1
            ? focusRelationshipTarget(relationshipTargets[0].id)
            : setRelationshipMenuOpen((open) => !open)}
          title={relationshipTargets.length === 1 ? (zh ? "跳转到关联对象" : "Jump to linked object") : (zh ? "选择关联对象" : "Choose linked object")}
          aria-label={relationshipTargets.length === 1 ? (zh ? "跳转到关联对象" : "Jump to linked object") : (zh ? "关联对象列表" : "Linked objects")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7h8v8M17 7 7 17" /><path d="M17 13v5H6V7h5" /></svg>
          {relationshipTargets.length > 1 && <span className="relationship-object-jump-count">{relationshipTargets.length}</span>}
        </button>
        {relationshipMenuOpen && relationshipTargets.length > 1 && <div className="relationship-menu"><strong>{zh ? "关联对象" : "Linked objects"}</strong>{relationshipTargets.map((target, index) => <button key={target.id} onClick={() => focusRelationshipTarget(target.id)}>{relationshipTargetLabel(target, index)} <span>↗</span></button>)}</div>}
      </div>}
      {relationshipSourceId && <div className="relationship-hint">{zh ? "点击另一个对象以建立双向链接；Esc 取消" : "Click another object to create a two-way link; Esc to cancel"}</div>}

      {materialBrush && <section className="material-brush-panel" aria-label={zh ? "素材画笔设置" : "Material brush settings"}>
        <header>
          <span className="material-brush-preview">{materialBrush.preview ? <img src={materialBrush.preview} alt="" /> : "✣"}</span>
          <div><strong>{zh ? "素材画笔" : "Material brush"}</strong><small>{materialBrush.name}</small></div>
          <button onClick={() => { setMaterialBrush(null); setMaterialBrushDrawing(false); materialBrushSessionRef.current = null; }} title={zh ? "关闭" : "Close"} aria-label={zh ? "关闭" : "Close"}>×</button>
        </header>
        {[
          ["size", zh ? "基础大小" : "Base size", 10, 300, "%"],
          ["randomSize", zh ? "随机大小" : "Random size", 0, 90, "%"],
          ["randomRotation", zh ? "随机旋转" : "Random rotation", 0, 180, "°"],
          ["spacing", zh ? "间距" : "Spacing", 10, 500, "px"],
        ].map(([key, label, min, max, unit]) => <label key={key}>
          <span>{label}<output>{materialBrushSettings[key]}{unit}</output></span>
          <input type="range" min={min} max={max} value={materialBrushSettings[key]} onChange={(event) => setMaterialBrushSettings((settings) => ({ ...settings, [key]: Number(event.target.value) }))} />
        </label>)}
        <p>{materialBrushDrawing ? (zh ? "正在绘制…" : "Drawing…") : (zh ? "按住左键拖动绘制 · Esc 退出" : "Drag to paint · Esc to exit")}</p>
      </section>}

      {placing && (
        <div className="placement-ghost" style={{ left: pointer.x + 16, top: pointer.y + 16 }}>
          {placing.preview ? <img src={placing.preview} alt="" /> : <span>{placing.name}</span>}
          <small>{ui.placed}</small>
        </div>
      )}
      {partialEraser && brushPosition && (
        <div className="partial-eraser-cursor" style={{ left: brushPosition.x - brushSize / 2, top: brushPosition.y - brushSize / 2, width: brushSize, height: brushSize }} />
      )}
      {magicWand && brushPosition && <div className="magic-wand-cursor" style={{ left: brushPosition.x, top: brushPosition.y }}>✦</div>}
      {straightLinePreview && <svg className="precise-line-preview" aria-hidden="true"><line x1={straightLinePreview.x1} y1={straightLinePreview.y1} x2={straightLinePreview.x2} y2={straightLinePreview.y2} /></svg>}

      {nameDialog && (
        <div className="name-dialog-backdrop" role="presentation">
          <form className="name-dialog" onSubmit={submitName} aria-label={nameDialog.type === "folder" ? ui.folderDialog : nameDialog.type === "rename-canvas-node" ? (zh ? "重命名画布对象" : "Rename canvas object") : ui.saveDialog}>
            <strong>{nameDialog.type === "folder" ? ui.folderDialog : nameDialog.type === "rename-canvas-node" ? (zh ? "重命名画布对象" : "Rename canvas object") : ui.saveDialog}</strong>
            <input autoFocus value={nameInput} onChange={(event) => setNameInput(event.target.value)} aria-label={ui.name} />
            <div>
              <button type="button" onClick={() => setNameDialog(null)}>{ui.cancel}</button>
              <button type="submit">{ui.confirm}</button>
            </div>
          </form>
        </div>
      )}

    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

