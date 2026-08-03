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
  const activeToolRef = useRef("selection");
  const libraryWriteQueueRef = useRef(Promise.resolve());
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
  const visibleFolders = useMemo(() => current.folders.filter((folder) => folder.name.toLowerCase().includes(librarySearch.trim().toLowerCase())), [current.folders, librarySearch]);
  const visibleObjects = useMemo(() => current.objects.filter((object) => object.name.toLowerCase().includes(librarySearch.trim().toLowerCase())), [current.objects, librarySearch]);

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
        window.alert(zh ? "本地素材库无法打开，请刷新页面后重试。" : "The local material library could not be opened. Please refresh and try again.");
      } finally {
        if (active) setLibraryReady(true);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadCanvas = async () => {
      try {
        const saved = await readIndexedCanvas();
        if (saved?.elements && active) {
          const migrated = migrateNativeElementLinks(saved.elements, saved.relationships || {});
          const cleanElements = withoutNativeLinks(saved.elements);
          setCanvasInitialData({ ...saved, elements: cleanElements, relationships: migrated.relationships });
          setRelationships(migrated.relationships);
          setRelationshipCollections(saved.relationshipCollections || {});
          setRelationshipNames(saved.relationshipNames || {});
          relationshipCollectionsRef.current = saved.relationshipCollections || {};
          relationshipNamesRef.current = saved.relationshipNames || {};
          canvasSignatureRef.current = JSON.stringify({
            elements: cleanElements.map((element) => [element.id, element.version, element.isDeleted]),
            files: Object.keys(saved.files || {}).sort(),
            background: saved.appState?.viewBackgroundColor || "#f2f2f7",
            relationships: migrated.relationships,
            relationshipCollections: saved.relationshipCollections || {},
            relationshipNames: saved.relationshipNames || {},
          });
          if (migrated.changed || cleanElements.some((element, index) => element !== saved.elements[index])) {
            await writeIndexedCanvas({ ...saved, elements: cleanElements, relationships: migrated.relationships, relationshipCollections: saved.relationshipCollections || {}, relationshipNames: saved.relationshipNames || {}, savedAt: Date.now() });
          }
        }
      } catch {
        // An empty canvas is still usable if a prior local save is unavailable.
      } finally {
        if (active) setCanvasReady(true);
      }
    };
    void loadCanvas();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    relationshipsRef.current = relationships;
  }, [relationships]);

  useEffect(() => {
    relationshipCollectionsRef.current = relationshipCollections;
  }, [relationshipCollections]);

  useEffect(() => {
    relationshipNamesRef.current = relationshipNames;
  }, [relationshipNames]);

  useEffect(() => {
    if (!libraryReady) return;
    libraryWriteQueueRef.current = libraryWriteQueueRef.current
      .catch(() => undefined)
      .then(() => writeIndexedLibrary(library))
      .catch(() => {
        window.alert(zh ? "素材库写入失败，当前改动未保存。" : "The material library could not be saved.");
      });
  }, [library, libraryReady, zh]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    const cancel = (event) => event.key === "Escape" && setPlacing(null);
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (/INPUT|TEXTAREA/.test(event.target.tagName)) return;
      if (["Escape", "Esc", "ESC"].includes(event.key)) {
        setPartialEraser(false); setMagicWand(false); eraseSessionRef.current = null; straightLineAnchorRef.current = null; setBrushPosition(null);
        setEraserMenuOpen(false); setLanguageMenuOpen(false); setBackupMenuOpen(false); setSearchOpen(false); setLibraryMenu(null); setObjectMenu(null); setBackgroundPanelOpen(false); setNameDialog(null); setRelationshipSourceId(null); setRelationshipMenuOpen(false);
        document.querySelectorAll(".canvas-native-eraser-menu, .canvas-native-freedraw-menu").forEach((menu) => { menu.hidden = true; });
        return;
      }
      if (activeToolRef.current === "freedraw") {
        if (event.key === "[") { event.preventDefault(); setFreeDrawWidth((size) => Math.max(0.5, size - 0.5)); }
        if (event.key === "]") { event.preventDefault(); setFreeDrawWidth((size) => Math.min(24, size + 0.5)); }
        return;
      }
      if (!partialEraser) return;
      if (event.key === "[") { event.preventDefault(); setBrushSize((size) => Math.max(4, size - 4)); }
      if (event.key === "]") { event.preventDefault(); setBrushSize((size) => Math.min(240, size + 4)); }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => { window.removeEventListener("keydown", onKeyDown); document.removeEventListener("keydown", onKeyDown, true); };
  }, [partialEraser]);

  useEffect(() => {
    const endPreciseLine = (event) => {
      if (event.key === "Shift") straightLineAnchorRef.current = null;
    };
    window.addEventListener("keyup", endPreciseLine);
    return () => window.removeEventListener("keyup", endPreciseLine);
  }, []);

  useEffect(() => {
    const stopSpecialTool = (event) => {
      if (event.target.closest("[data-canvas-eraser-menu]")) return;
      const path = event.composedPath?.() || [];
      const clickedMainTool = path.some((node) => node instanceof HTMLInputElement && node.name === "editor-current-shape")
        || path.some((node) => node instanceof HTMLLabelElement && node.querySelector(":scope > input[name='editor-current-shape']"));
      if (clickedMainTool) {
        setPartialEraser(false); setMagicWand(false); eraseSessionRef.current = null; setBrushPosition(null);
      }
    };
    document.addEventListener("pointerdown", stopSpecialTool, true);
    document.addEventListener("click", stopSpecialTool, true);
    return () => { document.removeEventListener("pointerdown", stopSpecialTool, true); document.removeEventListener("click", stopSpecialTool, true); };
  }, []);

  useEffect(() => {
    apiRef.current?.updateScene({ appState: { currentItemStrokeWidth: freeDrawWidth } });
    const slider = document.querySelector("[data-canvas-freedraw-width]");
    const input = document.querySelector("[data-canvas-freedraw-number]");
    if (slider) slider.value = String(freeDrawWidth);
    if (input) input.value = String(freeDrawWidth);
  }, [freeDrawWidth]);

  useEffect(() => {
    apiRef.current?.updateScene({ appState: { viewBackgroundColor: backgroundImage ? "transparent" : backgroundColor } });
    const control = document.querySelector("[data-canvas-background-scale]");
    if (control) { control.value = String(backgroundScale); control.style.display = backgroundImage ? "block" : "none"; }
  }, [backgroundImage, backgroundScale, backgroundColor]);

  useEffect(() => {
    const mountNativeExtensions = () => {
      const toolbar = document.querySelector(".excalidraw .App-toolbar .Stack") || document.querySelector(".excalidraw .App-toolbar");
      if (toolbar && !toolbar.querySelector("[data-canvas-language]")) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.canvasLanguage = "true";
        button.className = "canvas-native-language";
        button.textContent = language === "zh-CN" ? "中文" : "EN";
        button.title = language === "zh-CN" ? "切换至 English" : "Switch to 中文";
        button.setAttribute("aria-label", button.title);
        button.addEventListener("click", () => {
          const next = button.textContent === "中文" ? "en" : "zh-CN";
          setLanguage(next);
          button.textContent = next === "zh-CN" ? "中文" : "EN";
          button.title = next === "zh-CN" ? "切换至 English" : "Switch to 中文";
          button.setAttribute("aria-label", button.title);
        });
        toolbar.append(button);
      }
      const eraser = document.querySelector(".excalidraw [data-testid='toolbar-eraser']")?.closest("label") || document.querySelector(".excalidraw button[title*='Eraser']")?.closest("label");
      if (eraser && !eraser.querySelector("[data-canvas-eraser-menu]")) {
        eraser.style.position = "relative";
        const wrapper = document.createElement("span"); wrapper.dataset.canvasEraserMenu = "true"; wrapper.className = "canvas-native-eraser";
        const button = document.createElement("button"); button.type = "button"; button.className = "canvas-native-eraser-trigger"; button.textContent = "⌄"; button.title = zh ? "更多橡皮工具" : "More eraser tools";
        const menu = document.createElement("div"); menu.className = "canvas-native-eraser-menu"; menu.hidden = true;
        const activatePixelTool = (kind) => {
          document.querySelector(".excalidraw [data-testid='toolbar-selection']")?.click();
          eraseSessionRef.current = null; setBrushPosition(null);
          setPartialEraser(kind === "partial"); setMagicWand(kind === "wand");
        };
        [[ui.partialEraser, "⌫", () => activatePixelTool("partial")], [ui.magicWand, "✦", () => activatePixelTool("wand")]].forEach(([label, icon, action]) => {
          const item = document.createElement("button"); item.type = "button"; item.className = "canvas-native-eraser-option"; item.textContent = icon; item.title = label; item.setAttribute("aria-label", label); item.addEventListener("click", (event) => { event.stopPropagation(); action(); menu.hidden = true; }); menu.append(item);
        });
        button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); menu.hidden = !menu.hidden; }); wrapper.append(button, menu); eraser.append(wrapper);
      }
      const freeDraw = document.querySelector(".excalidraw [data-testid='toolbar-freedraw']")?.closest("label");
      if (freeDraw && !freeDraw.querySelector("[data-canvas-freedraw-menu]")) {
        freeDraw.style.position = "relative";
        const wrapper = document.createElement("span"); wrapper.dataset.canvasFreedrawMenu = "true"; wrapper.className = "canvas-native-freedraw";
        const button = document.createElement("button"); button.type = "button"; button.className = "canvas-native-freedraw-trigger"; button.textContent = "⌄"; button.title = zh ? "笔刷预设" : "Brush presets";
        const menu = document.createElement("div"); menu.className = "canvas-native-freedraw-menu"; menu.hidden = true;
        const activateBrush = (width, opacity) => {
          setFreeDrawWidth(width);
          apiRef.current?.updateScene({ appState: { currentItemStrokeWidth: width, currentItemOpacity: opacity, activeTool: { type: "freedraw" } } });
          document.querySelector(".excalidraw [data-testid='toolbar-freedraw']")?.click();
        };
        [[zh ? "铅笔" : "Pencil", "✎", 2, 100], [zh ? "钢笔" : "Pen", "✒", 3, 100], [zh ? "马克笔" : "Marker", "▰", 14, 45]].forEach(([label, icon, width, opacity]) => {
          const item = document.createElement("button"); item.type = "button"; item.className = "canvas-native-freedraw-option"; item.textContent = icon; item.title = label; item.setAttribute("aria-label", label); item.addEventListener("click", (event) => { event.stopPropagation(); activateBrush(width, opacity); menu.hidden = true; }); menu.append(item);
        });
        button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); menu.hidden = !menu.hidden; }); wrapper.append(button, menu); freeDraw.append(wrapper);
      }
      const nativeWidthInputs = [...document.querySelectorAll(".excalidraw input[name='stroke-width']")];
      const nativeWidthPanel = nativeWidthInputs[0]?.parentElement?.parentElement;
      if (nativeWidthPanel && !nativeWidthPanel.parentElement?.querySelector("[data-canvas-freedraw-width]")) {
        nativeWidthPanel.style.display = "none";
        const control = document.createElement("div"); control.className = "canvas-freedraw-width";
        const slider = document.createElement("input"); slider.type = "range"; slider.min = "0.5"; slider.max = "24"; slider.step = "0.5"; slider.value = String(freeDrawWidth); slider.dataset.canvasFreedrawWidth = "true"; slider.title = zh ? "描边宽度（[ ] 调整）" : "Stroke width ([ ])";
        const number = document.createElement("input"); number.type = "number"; number.min = "0.5"; number.max = "24"; number.step = "0.5"; number.value = String(freeDrawWidth); number.dataset.canvasFreedrawNumber = "true"; number.title = zh ? "输入笔刷大小" : "Enter brush size";
        const setWidth = (value) => { const width = Math.max(0.5, Math.min(24, Number(value) || 0.5)); slider.value = String(width); number.value = String(width); setFreeDrawWidth(width); };
        slider.addEventListener("input", (event) => setWidth(event.target.value)); number.addEventListener("input", (event) => setWidth(event.target.value)); number.addEventListener("change", (event) => setWidth(event.target.value));
        control.append(slider, number); nativeWidthPanel.after(control);
      }
      document.querySelectorAll(".excalidraw .color-picker__top-picks").forEach((picks) => {
        if (picks.querySelector("[data-canvas-background-image]")) return;
        const ancestors = [picks, picks.parentElement, picks.parentElement?.parentElement, picks.parentElement?.parentElement?.parentElement, picks.parentElement?.parentElement?.parentElement?.parentElement];
        if (!ancestors.some((node) => node?.textContent?.includes(zh ? "画布背景" : "Canvas background"))) return;
        [...picks.querySelectorAll("button")].forEach((item) => { item.style.display = "none"; });
        const color = document.createElement("input"); color.type = "color"; color.value = backgroundColor; color.dataset.canvasBackgroundColor = "true"; color.className = "canvas-background-color"; color.title = zh ? "选择画布颜色" : "Choose canvas color"; color.addEventListener("input", (event) => { setBackgroundImage(null); setBackgroundColor(event.target.value); }); picks.append(color);
        const button = document.createElement("button"); button.type = "button"; button.dataset.canvasBackgroundImage = "true"; button.className = "color-picker__button canvas-background-image-swatch"; button.title = zh ? "选择背景图片" : "Choose background image"; button.textContent = "▧";
        button.addEventListener("click", () => backgroundInputRef.current?.click()); picks.append(button);
        const size = document.createElement("input"); size.type = "range"; size.min = "40"; size.max = "600"; size.step = "10"; size.value = String(backgroundScale); size.dataset.canvasBackgroundScale = "true"; size.className = "canvas-background-scale"; size.title = zh ? "纹理大小" : "Texture size";
        size.style.display = backgroundImage ? "block" : "none"; size.addEventListener("input", (event) => setBackgroundScale(Number(event.target.value))); picks.after(size);
      });
      document.querySelectorAll(".excalidraw .context-menu").forEach((menu) => {
        if (menu.querySelector("[data-canvas-remove-bg]")) return;
        const selected = apiRef.current?.getSceneElements().filter((element) => apiRef.current.getAppState().selectedElementIds[element.id]);
        if (selected?.length === 1 && selected[0].type === "image") {
          const button = document.createElement("button"); button.type = "button"; button.dataset.canvasRemoveBg = "true"; button.className = "context-menu-item"; button.textContent = ui.removeBg;
          button.addEventListener("click", removeSelectedImageBackground);
          const crop = [...menu.querySelectorAll("button")].find((item) => /Crop image|裁剪图片/.test(item.textContent || ""));
          if (crop) crop.after(button); else menu.append(button);
        }
      });
      if (!relationshipHostRef.current?.isConnected) {
        const nativeLinkButton = [...document.querySelectorAll(".excalidraw button")].find((button) => {
          if (button.closest(".context-menu") || button.closest("[data-canvas-relationship-host]")) return false;
          const label = `${button.getAttribute("aria-label") || ""} ${button.title || ""}`;
          return /(?:新建|创建|添加|编辑)?链接|(?:create|edit|add)\s+link/i.test(label);
        });
        if (nativeLinkButton?.parentElement) {
          const host = document.createElement("span");
          host.dataset.canvasRelationshipHost = "true";
          host.className = "canvas-native-relationship-host";
          nativeLinkButton.after(host);
          relationshipHostRef.current = host;
          setRelationshipHost(host);
        }
      }
    };
    const observer = new MutationObserver(mountNativeExtensions);
    const refreshOnContextMenu = () => window.setTimeout(mountNativeExtensions, 0);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("contextmenu", refreshOnContextMenu);
    mountNativeExtensions();
    return () => { observer.disconnect(); document.removeEventListener("contextmenu", refreshOnContextMenu); };
  }, []);

  const addFolder = useCallback(() => {
    setNameInput(ui.newFolder);
    setNameDialog({ type: "folder" });
  }, [ui.newFolder]);

  const saveSelection = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    const ids = api.getAppState().selectedElementIds;
    const elements = api.getSceneElements().filter((element) => ids[element.id]);
    if (!elements.length) {
      window.alert(ui.selectFirst);
      return;
    }
    const sceneFiles = api.getFiles();
    const files = Object.fromEntries(elements
      .filter((element) => element.type === "image" && element.fileId && sceneFiles[element.fileId])
      .map((element) => [element.fileId, storedFile(sceneFiles[element.fileId])])) ;
    const preview = await thumbnail(elements, sceneFiles);
    setNameInput(zh ? `素材 ${current.objects.length + 1}` : `Material ${current.objects.length + 1}`);
    setNameDialog({ type: "object", elements, files, preview });
  }, [current.objects.length, path, ui.selectFirst, zh]);

  const deleteFolder = useCallback((id, name) => {
    if (!window.confirm(zh ? `删除“${name}”及其全部内容？` : `Delete “${name}” and everything inside it?`)) return;
    setLibrary((root) => removeFolderById(root, id));
  }, [zh]);

  const moveFolder = useCallback((sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) return;
    setLibrary((root) => {
      const source = findFolder(root, sourceId);
      if (!source || containsFolder(source, targetId)) return root;
      const withoutSource = removeFolderById(root, sourceId);
      return updateFolderById(withoutSource, targetId, (target) => ({
        ...target,
        folders: [...target.folders, source],
      }));
    });
  }, []);

  const transferObject = useCallback((objectId, targetId, copy = false) => {
    const object = current.objects.find((item) => item.id === objectId);
    if (!object || !targetId) return;
    setLibrary((root) => {
      let next = copy ? root : updateFolder(root, path, (folder) => ({ ...folder, objects: folder.objects.filter((item) => item.id !== objectId) }));
      const transferred = copy ? { ...object, id: crypto.randomUUID(), name: `${object.name} ${zh ? "副本" : "copy"}` } : object;
      next = updateFolderById(next, targetId, (folder) => ({ ...folder, objects: [...folder.objects, transferred] }));
      return next;
    });
    setLibraryMenu(null); setDraggedObjectId(null);
  }, [current.objects, path, zh]);

  const renameObject = useCallback((object) => {
    setNameInput(object.name);
    setNameDialog({ type: "rename-object", id: object.id });
  }, []);

  const renameFolder = useCallback((folder) => {
    setNameInput(folder.name);
    setNameDialog({ type: "rename-folder", id: folder.id });
  }, []);

  const cloneLibraryFolder = useCallback((folder) => ({
    ...folder,
    id: crypto.randomUUID(),
    name: `${folder.name} ${zh ? "副本" : "copy"}`,
    folders: folder.folders.map(cloneLibraryFolder),
    objects: folder.objects.map((object) => ({ ...object, id: crypto.randomUUID() })),
  }), [zh]);

  const copyLibraryItem = useCallback((type, item, cut = false) => {
    setLibraryClipboard({ type, item, cut, sourcePath: path, sourceId: item.id });
    setLibrarySelection({ type, id: item.id });
    setLibraryMenu(null);
  }, [path]);

  const pasteLibraryItem = useCallback(() => {
    if (!libraryClipboard) return;
    if (libraryClipboard.type === "folder" && libraryClipboard.cut && path.includes(libraryClipboard.sourceId)) return;
    setLibrary((root) => {
      const item = libraryClipboard.type === "folder"
        ? (libraryClipboard.cut ? libraryClipboard.item : cloneLibraryFolder(libraryClipboard.item))
        : (libraryClipboard.cut ? libraryClipboard.item : { ...libraryClipboard.item, id: crypto.randomUUID(), name: `${libraryClipboard.item.name} ${zh ? "副本" : "copy"}` });
      let next = root;
      if (libraryClipboard.cut) {
        next = libraryClipboard.type === "folder"
          ? removeFolderById(next, libraryClipboard.sourceId)
          : updateFolder(next, libraryClipboard.sourcePath, (folder) => ({ ...folder, objects: folder.objects.filter((object) => object.id !== libraryClipboard.sourceId) }));
      }
      return updateFolder(next, path, (folder) => libraryClipboard.type === "folder"
        ? { ...folder, folders: [...folder.folders, item] }
        : { ...folder, objects: [...folder.objects, item] });
    });
    if (libraryClipboard.cut) setLibraryClipboard(null);
    setLibraryMenu(null);
  }, [cloneLibraryFolder, libraryClipboard, path, zh]);

  useEffect(() => {
    const shortcuts = (event) => {
      if (!isOpen || /INPUT|TEXTAREA/.test(event.target.tagName) || !(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if ((key === "c" || key === "x") && librarySelection) {
        const item = librarySelection.type === "folder"
          ? current.folders.find((folder) => folder.id === librarySelection.id)
          : current.objects.find((object) => object.id === librarySelection.id);
        if (item) {
          event.preventDefault();
          copyLibraryItem(librarySelection.type, item, key === "x");
        }
      } else if (key === "v" && libraryClipboard) {
        event.preventDefault();
        pasteLibraryItem();
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [copyLibraryItem, current, isOpen, libraryClipboard, librarySelection, pasteLibraryItem]);

  const chooseBackgroundImage = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataURL = reader.result;
      setBackgroundImage(dataURL);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }, []);

  const removeSelectedImageBackground = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    const selected = api.getSceneElements().filter((element) => api.getAppState().selectedElementIds[element.id]);
    const imageElement = selected.length === 1 && selected[0].type === "image" ? selected[0] : null;
    if (!imageElement) return;
    const file = api.getFiles()[imageElement.fileId];
    if (!file?.dataURL) return;
    setProcessingImage(true);
    try {
      const response = await fetch(file.dataURL);
      const image = await removeImageBackground(await response.blob());
      const fileId = crypto.randomUUID();
      api.addFiles([{ id: fileId, dataURL: image.dataUrl, mimeType: "image/png", created: Date.now() }]);
      api.updateScene({
        elements: api.getSceneElements().map((element) => element.id === imageElement.id
          ? { ...element, fileId, version: element.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31), updated: Date.now() }
          : element),
      });
    } catch {
      window.alert(ui.imageFailed);
    } finally {
      setProcessingImage(false);
    }
  }, [ui.imageFailed]);

  const scenePoint = useCallback((event, api) => {
    const state = api.getAppState();
    return { x: (event.clientX - state.offsetLeft) / state.zoom.value - state.scrollX, y: (event.clientY - state.offsetTop) / state.zoom.value - state.scrollY };
  }, []);

  const drawPreciseLine = useCallback((start, end) => {
    const api = apiRef.current;
    if (!api || Math.hypot(end.x - start.x, end.y - start.y) < 1) return;
    const appState = api.getAppState();
    const [line] = convertToExcalidrawElements([{
      type: "line",
      x: start.x,
      y: start.y,
      points: [[0, 0], [end.x - start.x, end.y - start.y]],
      strokeColor: appState.currentItemStrokeColor,
      backgroundColor: "transparent",
      fillStyle: appState.currentItemFillStyle,
      strokeWidth: appState.currentItemStrokeWidth || freeDrawWidth,
      strokeStyle: appState.currentItemStrokeStyle,
      roughness: appState.currentItemRoughness,
      opacity: appState.currentItemOpacity,
    }], { regenerateIds: true });
    api.updateScene({ elements: [...api.getSceneElements(), line] });
  }, [freeDrawWidth]);

  const removeAnchorDot = useCallback(() => {
    const id = straightLineAnchorRef.current?.elementId;
    if (!id || !apiRef.current) return;
    apiRef.current.updateScene({ elements: apiRef.current.getSceneElements().map((element) => element.id === id
      ? { ...element, isDeleted: true, version: element.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31), updated: Date.now() }
      : element) });
  }, []);

  const eraseSelectedImageArea = useCallback(async (event, finish = false) => {
    if (!partialEraser || !apiRef.current || processingImage) return false;
    const api = apiRef.current;
    let session = eraseSessionRef.current;
    if (!session) {
      const selected = api.getSceneElements().filter((element) => api.getAppState().selectedElementIds[element.id]);
      const image = selected.length === 1 && selected[0].type === "image" ? selected[0] : null;
      if (!image) {
        window.alert(ui.selectImage); setPartialEraser(false); return true;
      }
      const file = api.getFiles()[image.fileId];
      if (!file?.dataURL) return true;
      event.preventDefault(); event.stopPropagation();
      const canvas = await imageToCanvas(file);
      session = { image, canvas, context: canvas.getContext("2d"), last: null };
      eraseSessionRef.current = session;
    }
    const point = scenePoint(event, api);
    const image = session.image;
    if (point.x < image.x || point.x > image.x + image.width || point.y < image.y || point.y > image.y + image.height) return true;
    event.preventDefault(); event.stopPropagation();
    const scaleX = session.canvas.width / image.width;
    const scaleY = session.canvas.height / image.height;
    const currentPoint = { x: (point.x - image.x) * scaleX, y: (point.y - image.y) * scaleY };
    const radius = Math.max(2, brushSize / 2 * ((scaleX + scaleY) / 2));
    const context = session.context;
    context.save(); context.globalCompositeOperation = "destination-out"; context.lineCap = "round"; context.lineJoin = "round"; context.lineWidth = radius * 2;
    context.beginPath(); context.moveTo(session.last?.x ?? currentPoint.x, session.last?.y ?? currentPoint.y); context.lineTo(currentPoint.x, currentPoint.y); context.stroke(); context.restore();
    session.last = currentPoint;
    if (!finish) return true;
    setProcessingImage(true);
    try {
      const fileId = crypto.randomUUID();
      api.addFiles([{ id: fileId, dataURL: session.canvas.toDataURL("image/png"), mimeType: "image/png", created: Date.now() }]);
      api.updateScene({ elements: api.getSceneElements().map((element) => element.id === image.id ? { ...element, fileId, version: element.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31), updated: Date.now() } : element) });
    } catch {
      window.alert(ui.imageFailed);
    } finally {
      eraseSessionRef.current = null; setProcessingImage(false); setBrushPosition(null);
    }
    return true;
  }, [partialEraser, processingImage, brushSize, scenePoint, ui.imageFailed, ui.selectImage]);

  const magicWandAtPoint = useCallback(async (event) => {
    if (!magicWand || !apiRef.current || processingImage) return false;
    const api = apiRef.current;
    const selected = api.getSceneElements().filter((element) => api.getAppState().selectedElementIds[element.id]);
    const image = selected.length === 1 && selected[0].type === "image" ? selected[0] : null;
    if (!image) {
      window.alert(ui.selectImage);
      setMagicWand(false);
      return true;
    }
    const file = api.getFiles()[image.fileId];
    if (!file?.dataURL) return true;
    event.preventDefault();
    event.stopPropagation();
    const point = scenePoint(event, api);
    if (point.x < image.x || point.x > image.x + image.width || point.y < image.y || point.y > image.y + image.height) return true;
    setProcessingImage(true);
    try {
      const canvas = await imageToCanvas(file);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const sx = Math.max(0, Math.min(canvas.width - 1, Math.floor((point.x - image.x) / image.width * canvas.width)));
      const sy = Math.max(0, Math.min(canvas.height - 1, Math.floor((point.y - image.y) / image.height * canvas.height)));
      const start = (sy * canvas.width + sx) * 4; const seed = [pixels.data[start], pixels.data[start + 1], pixels.data[start + 2]];
      const queue = [sy * canvas.width + sx]; const seen = new Uint8Array(canvas.width * canvas.height);
      for (let i = 0; i < queue.length; i += 1) { const p = queue[i]; if (seen[p]) continue; seen[p] = 1; const o = p * 4; if (Math.hypot(pixels.data[o] - seed[0], pixels.data[o + 1] - seed[1], pixels.data[o + 2] - seed[2]) > 46) continue; pixels.data[o + 3] = 0; const x = p % canvas.width; const y = Math.floor(p / canvas.width); if (x) queue.push(p - 1); if (x < canvas.width - 1) queue.push(p + 1); if (y) queue.push(p - canvas.width); if (y < canvas.height - 1) queue.push(p + canvas.width); }
      context.putImageData(pixels, 0, 0);
      const fileId = crypto.randomUUID();
      api.addFiles([{ id: fileId, dataURL: canvas.toDataURL("image/png"), mimeType: "image/png", created: Date.now() }]);
      api.updateScene({ elements: api.getSceneElements().map((element) => element.id === image.id
        ? { ...element, fileId, version: element.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31), updated: Date.now() }
        : element) });
    } catch {
      window.alert(ui.imageFailed);
    } finally {
      setProcessingImage(false);
    }
    return true;
  }, [magicWand, processingImage, scenePoint, ui.imageFailed, ui.selectImage]);

  const submitName = useCallback((event) => {
    event.preventDefault();
    const name = nameInput.trim();
    if (!name || !nameDialog) return;
    if (nameDialog.type === "folder") {
      setLibrary((root) => updateFolder(root, path, (folder) => ({
        ...folder, folders: [...folder.folders, makeFolder(name)],
      })));
    } else if (nameDialog.type === "rename-object") {
      setLibrary((root) => updateFolder(root, path, (folder) => ({ ...folder, objects: folder.objects.map((item) => item.id === nameDialog.id ? { ...item, name } : item) })));
    } else if (nameDialog.type === "rename-folder") {
      setLibrary((root) => updateFolderById(root, nameDialog.id, (folder) => ({ ...folder, name })));
    } else if (nameDialog.type === "rename-canvas-node") {
      setRelationshipNames((currentNames) => {
        const next = { ...currentNames, [nameDialog.id]: name };
        relationshipNamesRef.current = next;
        return next;
      });
      window.setTimeout(() => {
        const api = apiRef.current;
        if (api) saveCanvas(api.getSceneElements(), api.getAppState(), api.getFiles());
      }, 0);
    } else {
      setLibrary((root) => updateFolder(root, path, (folder) => ({
        ...folder,
        objects: [...folder.objects, {
          id: crypto.randomUUID(), name,
          elements: nameDialog.elements, files: nameDialog.files, preview: nameDialog.preview,
        }],
      })));
    }
    setNameDialog(null);
  }, [nameDialog, nameInput, path]);

  const beginPlacement = useCallback((object) => {
    setPlacing(object);
    setIsOpen(false);
  }, []);

  const confirmPlacement = useCallback((event) => {
    if (!placing || !apiRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const api = apiRef.current;
    const state = api.getAppState();
    const x = (event.clientX - state.offsetLeft) / state.zoom.value - state.scrollX;
    const y = (event.clientY - state.offsetTop) / state.zoom.value - state.scrollY;
    if (placing.kind === "image") {
      const fileId = crypto.randomUUID();
      api.addFiles([{ id: fileId, dataURL: placing.imageData, mimeType: "image/png", created: Date.now() }]);
      const [imageElement] = convertToExcalidrawElements([{
        type: "image", fileId, x, y, width: placing.width, height: placing.height,
      }], { regenerateIds: true });
      api.updateScene({ elements: [...api.getSceneElements(), imageElement] });
      setPlacing(null);
      return;
    }
    if (placing.files && Object.keys(placing.files).length) {
      api.addFiles(Object.values(placing.files));
    }
    const minX = Math.min(...placing.elements.map((element) => element.x));
    const minY = Math.min(...placing.elements.map((element) => element.y));
    const cloned = placing.elements.map((element) => ({
      ...element,
      id: crypto.randomUUID(),
      seed: Math.floor(Math.random() * 2 ** 31),
      x: element.x + x - minX,
      y: element.y + y - minY,
      boundElements: null,
      frameId: null,
    }));
    api.updateScene({ elements: [...api.getSceneElements(), ...cloned] });
    setPlacing(null);
  }, [placing]);

  const removeObject = useCallback((id) => {
    setLibrary((root) => updateFolder(root, path, (folder) => ({
      ...folder, objects: folder.objects.filter((object) => object.id !== id),
    })));
  }, [path]);

  const deleteLibraryItem = useCallback((type, item) => {
    if (type === "folder") deleteFolder(item.id, item.name);
    else removeObject(item.id);
    setLibraryMenu(null);
    setLibrarySelection(null);
  }, [deleteFolder, removeObject]);

  const flushCanvasSave = useCallback(() => {
    if (canvasSaveTimerRef.current) {
      window.clearTimeout(canvasSaveTimerRef.current);
      canvasSaveTimerRef.current = null;
    }
    const payload = pendingCanvasPayloadRef.current;
    if (!payload) return;
    pendingCanvasPayloadRef.current = null;
    canvasWriteQueueRef.current = canvasWriteQueueRef.current
      .catch(() => undefined)
      .then(() => writeIndexedCanvas(payload))
      .catch(() => undefined);
  }, []);

  const saveCanvas = useCallback((elements, appState, files) => {
    const payload = {
      elements,
      files: files || apiRef.current?.getFiles?.() || {},
      appState: { viewBackgroundColor: appState.viewBackgroundColor || "#f2f2f7" },
      relationships: relationshipsRef.current,
      relationshipCollections: relationshipCollectionsRef.current,
      relationshipNames: relationshipNamesRef.current,
      savedAt: Date.now(),
    };
    const signature = JSON.stringify({
      elements: elements.map((element) => [element.id, element.version, element.isDeleted]),
      files: Object.keys(payload.files).sort(),
      background: payload.appState.viewBackgroundColor,
      relationships: payload.relationships,
      relationshipCollections: payload.relationshipCollections,
      relationshipNames: payload.relationshipNames,
    });
    if (signature === canvasSignatureRef.current) return;
    canvasSignatureRef.current = signature;
    pendingCanvasPayloadRef.current = payload;
    if (canvasSaveTimerRef.current) window.clearTimeout(canvasSaveTimerRef.current);
    canvasSaveTimerRef.current = window.setTimeout(flushCanvasSave, 450);
  }, [flushCanvasSave]);

  useEffect(() => {
    const flush = () => flushCanvasSave();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flushCanvasSave();
    };
  }, [flushCanvasSave]);

  const selectedRelationshipIds = useMemo(() => Object.keys(selectedElementIds).filter((id) => selectedElementIds[id]).sort(), [selectedElementIds]);
  const selectedRelationshipElement = useMemo(() => apiRef.current?.getSceneElements?.().find((element) => element.id === selectedRelationshipIds[0]) || null, [selectedRelationshipIds]);
  const selectedRelationshipNodeId = useMemo(() => selectedRelationshipIds.length > 1
    ? `collection:${selectedRelationshipIds.join("|")}`
    : selectedRelationshipIds[0] || null, [selectedRelationshipIds]);

  const registerRelationshipCollection = useCallback((ids) => {
    const memberIds = [...new Set(ids)].sort();
    if (memberIds.length < 2) return memberIds[0] || null;
    const collectionId = `collection:${memberIds.join("|")}`;
    const currentMembers = relationshipCollectionsRef.current[collectionId];
    if (!currentMembers || currentMembers.join("|") !== memberIds.join("|")) {
      const nextCollections = { ...relationshipCollectionsRef.current, [collectionId]: memberIds };
      relationshipCollectionsRef.current = nextCollections;
      setRelationshipCollections(nextCollections);
    }
    return collectionId;
  }, []);

  const relationshipNodeElements = useCallback((nodeId) => {
    const memberIds = relationshipCollectionsRef.current[nodeId] || [nodeId];
    const memberSet = new Set(memberIds);
    return apiRef.current?.getSceneElements?.().filter((element) => memberSet.has(element.id) && !element.isDeleted) || [];
  }, []);

  const addRelationship = useCallback((sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setRelationships((currentRelationships) => {
      const add = (map, from, to) => ({ ...map, [from]: [...new Set([...(map[from] || []), to])] });
      const next = add(add(currentRelationships, sourceId, targetId), targetId, sourceId);
      relationshipsRef.current = next;
      return next;
    });
    setRelationshipSourceId(null);
    setRelationshipMenuOpen(false);
    window.setTimeout(() => {
      const api = apiRef.current;
      if (api) saveCanvas(api.getSceneElements(), api.getAppState(), api.getFiles());
    }, 0);
  }, [saveCanvas]);

  const ingestNativeElementLinks = useCallback((elements, appState, files) => {
    const migrated = migrateNativeElementLinks(elements, relationshipsRef.current);
    const hasInternalLinks = elements.some((element) => elementIdFromNativeLink(element.link));
    if (!hasInternalLinks) return false;
    const cleanElements = withoutNativeLinks(elements);
    if (migrated.changed) {
      relationshipsRef.current = migrated.relationships;
      setRelationships(migrated.relationships);
    }
    removingNativeLinksRef.current = true;
    apiRef.current?.updateScene({ elements: cleanElements });
    window.setTimeout(() => { removingNativeLinksRef.current = false; }, 0);
    window.setTimeout(() => saveCanvas(cleanElements, appState, files), 0);
    return true;
  }, [saveCanvas]);

  const startRelationship = useCallback(() => {
    if (!selectedRelationshipNodeId) return;
    if (typeof apiRef.current?.setActiveTool === "function") {
      apiRef.current.setActiveTool({ type: "selection" });
    }
    const sourceId = registerRelationshipCollection(selectedRelationshipIds);
    setRelationshipSourceId(sourceId);
    setRelationshipMenuOpen(false);
  }, [registerRelationshipCollection, selectedRelationshipIds, selectedRelationshipNodeId]);

  useEffect(() => {
    if (!relationshipSourceId) return;
    if (!selectedRelationshipNodeId || selectedRelationshipNodeId === relationshipSourceId) return;
    const targetId = registerRelationshipCollection(selectedRelationshipIds);
    if (targetId) addRelationship(relationshipSourceId, targetId);
  }, [addRelationship, registerRelationshipCollection, relationshipSourceId, selectedRelationshipIds, selectedRelationshipNodeId]);

  const handleExcalidrawPointerDown = useCallback((_activeTool, pointerDownState) => {
    const target = pointerDownState?.hit?.element;
    if (!relationshipSourceId || !target || target.isDeleted || target.id === relationshipSourceId) return;
    window.setTimeout(() => {
      const ids = Object.keys(apiRef.current?.getAppState?.().selectedElementIds || {}).filter((id) => apiRef.current.getAppState().selectedElementIds[id]);
      const targetId = registerRelationshipCollection(ids.length ? ids : [target.id]);
      if (targetId && targetId !== relationshipSourceId) addRelationship(relationshipSourceId, targetId);
    }, 0);
  }, [addRelationship, registerRelationshipCollection, relationshipSourceId]);

  const focusRelationshipTarget = useCallback((targetId) => {
    const api = apiRef.current;
    const targets = relationshipNodeElements(targetId);
    const validGeometry = targets.length && targets.every((target) => [target.x, target.y, target.width, target.height].every(Number.isFinite)
      && Math.abs(target.x) < 10_000_000 && Math.abs(target.y) < 10_000_000);
    if (!api || !validGeometry) {
      setRelationships((currentRelationships) => {
        const next = Object.fromEntries(Object.entries(currentRelationships).map(([id, targets]) => [id, targets.filter((idValue) => idValue !== targetId)]));
        relationshipsRef.current = next;
        return next;
      });
      setRelationshipMenuOpen(false);
      return;
    }
    api.updateScene({ appState: { selectedElementIds: Object.fromEntries(targets.map((target) => [target.id, true])) } });
    if (typeof api.scrollToContent === "function") {
      api.scrollToContent(targets, {
        fitToViewport: true,
        viewportZoomFactor: 0.68,
        minZoom: 0.1,
        maxZoom: 1.5,
        animate: false,
      });
    }
    setRelationshipMenuOpen(false);
  }, [relationshipNodeElements]);

  const relationshipTargets = useMemo(() => (relationships[selectedRelationshipNodeId] || [])
    .map((id) => {
      const elements = relationshipNodeElements(id);
      if (!elements.length) return null;
      return { id, elements, type: relationshipCollections[id] ? "collection" : elements[0].type, name: relationshipNames[id] || "" };
    })
    .filter(Boolean), [relationshipCollections, relationshipNames, relationships, relationshipNodeElements, selectedRelationshipNodeId]);

  const relationshipTargetLabel = useCallback((target, index) => {
    if (target.name) return target.name;
    if (target.type === "collection") return zh ? `集合 ${index + 1}` : `Collection ${index + 1}`;
    if (target.type === "image") return zh ? `图片 ${index + 1}` : `Image ${index + 1}`;
    const typeNames = zh ? { rectangle: "矩形", ellipse: "椭圆", diamond: "菱形", arrow: "箭头", line: "线条", freedraw: "手绘", text: "文字", frame: "框架" } : {};
    return `${typeNames[target.type] || target.type} ${index + 1}`;
  }, [zh]);

  useEffect(() => {
    const renameSelectedCanvasNode = (event) => {
      if (event.key !== "F2" || /INPUT|TEXTAREA/.test(event.target.tagName) || !selectedRelationshipNodeId) return;
      event.preventDefault();
      const nodeId = registerRelationshipCollection(selectedRelationshipIds);
      const selectedType = selectedRelationshipIds.length > 1 ? "collection" : selectedRelationshipElement?.type;
      const fallback = selectedType === "collection" ? (zh ? "未命名集合" : "Untitled collection") : (zh ? "未命名对象" : "Untitled object");
      setNameInput(relationshipNamesRef.current[nodeId] || fallback);
      setNameDialog({ type: "rename-canvas-node", id: nodeId });
    };
    window.addEventListener("keydown", renameSelectedCanvasNode);
    return () => window.removeEventListener("keydown", renameSelectedCanvasNode);
  }, [registerRelationshipCollection, selectedRelationshipElement, selectedRelationshipIds, selectedRelationshipNodeId, zh]);

  const relationshipOverlayPosition = useMemo(() => {
    if (!relationshipOverlayElement || !canvasViewport || !relationshipTargets.length) return null;
    if (![relationshipOverlayElement.x, relationshipOverlayElement.y, relationshipOverlayElement.width, relationshipOverlayElement.height,
      canvasViewport.scrollX, canvasViewport.scrollY, canvasViewport.zoom, canvasViewport.offsetLeft, canvasViewport.offsetTop].every(Number.isFinite)) return null;
    const angle = Number.isFinite(relationshipOverlayElement.angle) ? relationshipOverlayElement.angle : 0;
    const centerX = relationshipOverlayElement.x + relationshipOverlayElement.width / 2;
    const centerY = relationshipOverlayElement.y + relationshipOverlayElement.height / 2;
    const cornerX = relationshipOverlayElement.width / 2;
    const cornerY = -relationshipOverlayElement.height / 2;
    const sceneX = centerX + cornerX * Math.cos(angle) - cornerY * Math.sin(angle);
    const sceneY = centerY + cornerX * Math.sin(angle) + cornerY * Math.cos(angle);
    return {
      left: (sceneX + canvasViewport.scrollX) * canvasViewport.zoom + canvasViewport.offsetLeft - 8,
      top: (sceneY + canvasViewport.scrollY) * canvasViewport.zoom + canvasViewport.offsetTop + 8,
    };
  }, [canvasViewport, relationshipOverlayElement, relationshipTargets.length]);

  const handleNativeLinkOpen = useCallback((element, event) => {
    const targetId = elementIdFromNativeLink(element.link);
    if (!targetId) return;
    event.preventDefault();
    const targetExists = apiRef.current?.getSceneElements?.().some((target) => target.id === targetId && !target.isDeleted);
    if (!targetExists) {
      apiRef.current?.updateScene({ elements: withoutNativeLinks(apiRef.current.getSceneElements()) });
      return;
    }
    addRelationship(element.id, targetId);
    focusRelationshipTarget(targetId);
  }, [addRelationship, focusRelationshipTarget]);

  useEffect(() => {
    const deleteShortcut = (event) => {
      if (!isOpen || /INPUT|TEXTAREA/.test(event.target.tagName) || !librarySelection || !["Delete", "Backspace"].includes(event.key)) return;
      const item = librarySelection.type === "folder"
        ? current.folders.find((folder) => folder.id === librarySelection.id)
        : current.objects.find((object) => object.id === librarySelection.id);
      if (item) {
        event.preventDefault();
        deleteLibraryItem(librarySelection.type, item);
      }
    };
    window.addEventListener("keydown", deleteShortcut);
    return () => window.removeEventListener("keydown", deleteShortcut);
  }, [current, deleteLibraryItem, isOpen, librarySelection]);

  const toggleBulkObject = useCallback((id) => {
    setBulkObjectIds((ids) => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const deleteBulkObjects = useCallback(() => {
    if (!bulkObjectIds.size) return;
    if (!window.confirm(zh ? `删除选中的 ${bulkObjectIds.size} 个素材？` : `Delete ${bulkObjectIds.size} selected materials?`)) return;
    setLibrary((root) => updateFolder(root, path, (folder) => ({ ...folder, objects: folder.objects.filter((object) => !bulkObjectIds.has(object.id)) })));
    setBulkObjectIds(new Set());
  }, [bulkObjectIds, path, zh]);

  const exportLibrary = useCallback(() => {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), library });
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `无限画布素材库-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupMenuOpen(false);
  }, [library]);

  const importLibrary = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const next = payload.library || payload;
      if (!Array.isArray(next.folders) || !Array.isArray(next.objects)) throw new Error("invalid library");
      if (!window.confirm(zh ? "导入会替换当前素材库，是否继续？" : "Importing will replace the current material library. Continue?")) return;
      setLibrary(next);
      setPath([]);
      setBulkObjectIds(new Set());
    } catch {
      window.alert(zh ? "素材库文件无效，无法导入。" : "This material library file is invalid.");
    } finally {
      event.target.value = "";
      setBackupMenuOpen(false);
    }
  }, [zh]);

  const handleCanvasPointerDown = useCallback((event) => {
    const api = apiRef.current;
    if (!api || event.target.closest(".App-toolbar, .library-trigger, .object-library")) return false;
    if (partialEraser && event.shiftKey) {
      event.preventDefault(); event.stopPropagation();
      partialStraightPromiseRef.current = eraseSelectedImageArea(event);
      return true;
    }
    if (activeToolRef.current !== "freedraw") return false;
    const point = scenePoint(event, api);
    if (event.shiftKey) {
      event.preventDefault(); event.stopPropagation();
      const anchor = straightLineAnchorRef.current;
      if (anchor) {
        removeAnchorDot();
        drawPreciseLine(anchor.point, point);
        straightLineAnchorRef.current = { point, elementId: null };
        return true;
      }
      straightLineAnchorRef.current = { point, elementId: null };
      return true;
    }
    freeDrawPointerRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      point,
      elementIds: new Set(api.getSceneElements().map((element) => element.id)),
    };
    return false;
  }, [drawPreciseLine, eraseSelectedImageArea, partialEraser, removeAnchorDot, scenePoint]);

  const handleCanvasPointerMove = useCallback((event) => {
    if (partialStraightPromiseRef.current) {
      event.preventDefault(); event.stopPropagation();
      return true;
    }
    const session = straightLineSessionRef.current;
    if (!session) return false;
    event.preventDefault(); event.stopPropagation();
    setStraightLinePreview({ x1: session.clientX, y1: session.clientY, x2: event.clientX, y2: event.clientY });
    return true;
  }, []);

  const handleCanvasPointerUp = useCallback((event) => {
    const api = apiRef.current;
    if (partialStraightPromiseRef.current) {
      const pending = partialStraightPromiseRef.current;
      partialStraightPromiseRef.current = null;
      const pointer = { clientX: event.clientX, clientY: event.clientY, preventDefault() {}, stopPropagation() {} };
      void Promise.resolve(pending).then(() => eraseSelectedImageArea(pointer, true));
      event.preventDefault(); event.stopPropagation();
      return true;
    }
    const session = straightLineSessionRef.current;
    if (session && api) {
      event.preventDefault(); event.stopPropagation();
      drawPreciseLine(session.point, scenePoint(event, api));
      straightLineSessionRef.current = null;
      setStraightLinePreview(null);
      return true;
    }
    const pointer = freeDrawPointerRef.current;
    freeDrawPointerRef.current = null;
    if (!pointer || !api || Math.hypot(event.clientX - pointer.clientX, event.clientY - pointer.clientY) > 4) {
      if (pointer) straightLineAnchorRef.current = null;
      return false;
    }
    window.setTimeout(() => {
      const dot = api.getSceneElements().filter((element) => element.type === "freedraw" && !element.isDeleted && !pointer.elementIds.has(element.id)).at(-1);
      if (dot) straightLineAnchorRef.current = { point: pointer.point, elementId: dot.id };
    }, 0);
    return false;
  }, [drawPreciseLine, eraseSelectedImageArea, scenePoint]);

  return (
    <main className={`app-shell ${placing ? "is-placing" : ""} ${(partialEraser || magicWand) ? "is-pixel-tool" : ""}`}>
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
            <span className="library-backup">
              <button className={`library-icon-action ${backupMenuOpen ? "is-active" : ""}`} onClick={() => setBackupMenuOpen((open) => !open)} title={zh ? "素材库备份与导入" : "Library backup and import"} aria-label={zh ? "素材库备份与导入" : "Library backup and import"}>⋯</button>
              {backupMenuOpen && <div className="library-backup-menu"><button onClick={exportLibrary}>{zh ? "导出素材库" : "Export library"}</button><button onClick={() => libraryImportRef.current?.click()}>{zh ? "导入素材库" : "Import library"}</button></div>}
            </span>
          </div>
          {searchOpen && <input className="library-search" autoFocus value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder={zh ? "搜索" : "Search"} aria-label={zh ? "搜索素材" : "Search materials"} />}
          {bulkEditing && <div className="bulk-actions"><span>{bulkObjectIds.size}</span><button onClick={deleteBulkObjects} title={ui.delete} aria-label={ui.delete}>⌫</button></div>}
          <p className="hint">{ui.hint} {ui.moveHint}</p>
          <div className="library-content">
            {visibleFolders.map((folder) => (
              <div className={`folder-card ${draggedFolderId === folder.id ? "is-dragging" : ""}`} key={folder.id} draggable
                onDragStart={() => setDraggedFolderId(folder.id)} onDragEnd={() => setDraggedFolderId(null)}
                onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedObjectId) transferObject(draggedObjectId, folder.id); else moveFolder(draggedFolderId, folder.id); setDraggedFolderId(null); setDraggedObjectId(null); }}>
                <button className="folder-open" onClick={() => setPath((items) => [...items, folder.id])} title={folder.name}>
                  <FolderIcon /><b>{folder.name}</b><small>{folder.folders.length + folder.objects.length}</small>
                </button>
                <button className="library-clip-action" onClick={() => { setLibrarySelection({ type: "folder", id: folder.id }); setLibraryMenu(libraryMenu === `folder:${folder.id}` ? null : `folder:${folder.id}`); }} title={zh ? "更多操作" : "More actions"}>⌄</button>
                {libraryMenu === `folder:${folder.id}` && <div className="object-transfer-menu"><button onClick={() => renameFolder(folder)}>{zh ? "重命名" : "Rename"}</button><button onClick={() => copyLibraryItem("folder", folder)}>{zh ? "复制" : "Copy"} <kbd>Ctrl+C</kbd></button><button onClick={() => copyLibraryItem("folder", folder, true)}>{zh ? "剪切" : "Cut"} <kbd>Ctrl+X</kbd></button><button disabled={!libraryClipboard} onClick={pasteLibraryItem}>{zh ? "粘贴" : "Paste"} <kbd>Ctrl+V</kbd></button><button className="transfer-delete" onClick={() => deleteLibraryItem("folder", folder)}>{zh ? "删除" : "Delete"} <kbd>Del</kbd></button></div>}
                <button className="folder-delete" onClick={() => deleteFolder(folder.id, folder.name)} title={ui.deleteFolder} aria-label={ui.deleteFolder}>×</button>
              </div>
            ))}
            {visibleObjects.map((object) => (
              <article className={`object-card ${bulkObjectIds.has(object.id) ? "is-selected" : ""}`} key={object.id} draggable={!bulkEditing} onDragStart={() => setDraggedObjectId(object.id)} onDragEnd={() => setDraggedObjectId(null)}>
                {bulkEditing && <button className="bulk-object-check" onClick={() => toggleBulkObject(object.id)} title={bulkObjectIds.has(object.id) ? (zh ? "取消选择" : "Deselect") : (zh ? "选择素材" : "Select material")}>{bulkObjectIds.has(object.id) ? "✓" : ""}</button>}
                <button className="object-preview" onClick={() => bulkEditing ? toggleBulkObject(object.id) : beginPlacement(object)} title={`${ui.place}: ${object.name}`}>
                  {object.preview ? <img src={object.preview} alt="" /> : <span>{object.elements?.length || 1}</span>}
                </button>
                <div><button className="object-name" onClick={() => bulkEditing ? toggleBulkObject(object.id) : beginPlacement(object)} onDoubleClick={() => renameObject(object)}>{object.name}</button><small>{object.kind === "image" ? "PNG" : `${object.elements.length} ${ui.objects}`}</small></div>
                {!bulkEditing && <button className="library-clip-action" onClick={() => { setLibrarySelection({ type: "object", id: object.id }); setLibraryMenu(libraryMenu === `object:${object.id}` ? null : `object:${object.id}`); }} title={zh ? "更多操作" : "More actions"}>⌄</button>}
                {libraryMenu === `object:${object.id}` && <div className="object-transfer-menu"><button onClick={() => renameObject(object)}>{zh ? "重命名" : "Rename"}</button><button onClick={() => copyLibraryItem("object", object)}>{zh ? "复制" : "Copy"} <kbd>Ctrl+C</kbd></button><button onClick={() => copyLibraryItem("object", object, true)}>{zh ? "剪切" : "Cut"} <kbd>Ctrl+X</kbd></button><button disabled={!libraryClipboard} onClick={pasteLibraryItem}>{zh ? "粘贴" : "Paste"} <kbd>Ctrl+V</kbd></button><button className="transfer-delete" onClick={() => deleteLibraryItem("object", object)}>{zh ? "删除" : "Delete"} <kbd>Del</kbd></button></div>}
                {!bulkEditing && <button className="object-actions" onClick={() => setObjectMenu(objectMenu === object.id ? null : object.id)} title={zh ? "移动或复制" : "Move or copy"}>⌄</button>}
                {objectMenu === object.id && <div className="object-transfer-menu"><small>{zh ? "移动到" : "Move to"}</small>{folderOptions.map((folder) => <button key={`move-${folder.id}`} onClick={() => transferObject(object.id, folder.id)}>{folder.name}</button>)}<small>{zh ? "复制到" : "Copy to"}</small>{folderOptions.map((folder) => <button key={`copy-${folder.id}`} onClick={() => transferObject(object.id, folder.id, true)}>{folder.name}</button>)}<button className="transfer-delete" onClick={() => { removeObject(object.id); setObjectMenu(null); }}>{ui.delete}</button></div>}
              </article>
            ))}
            {!visibleFolders.length && !visibleObjects.length && <p className="empty">{librarySearch ? (zh ? "未找到素材。" : "No materials found.") : ui.empty}</p>}
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
