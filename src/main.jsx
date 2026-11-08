import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, CaptureUpdateAction, MainMenu, convertToExcalidrawElements, mutateElement, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./style.css";
import { emptyLibrary, exportTree, loadLibrary, materialData, packLibrary, packMaterial, saveLibrary, saveProjectScene, write } from "./storage.js";
import { Gallery, coverFor, downloadJSON } from "./workspace.jsx";
import { LibraryIcon, MaterialPanel, materialDragType } from "./material-panel.jsx";
import { LayerPanel, layerSafeElements, useLayers } from "./layers.jsx";
import { CalibrationDialog, PrecisionPanel, PrecisionGridRow, PrecisionOverlay } from "./precision.jsx";
import { defaults as precisionDefaults, measureAt, measured, preciseStroke } from "./precision-engine.js";
import { BrushKit, finalizeBrush, hasLineStyle, isDefaultToolKey, useBrushKit } from "./brush-kit.jsx";
import { ShortcutSettings, shortcutFromEvent } from "./tool-shortcuts.jsx";
import { fillAt } from "./bucket-fill.js";
import { createNudge } from "./nudge.js";
import { makePaintEngine, sceneImageFileIds } from "./paint-engine.js";

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

let libraryMigration;
function openMaterials() {
  return libraryMigration ??= (async () => {
    const existing = await loadLibrary();
    if (existing) return existing;
    const browserLibrary = await readIndexedLibrary();
    const local = loadLegacyLibrary();
    const source = isValidLibrary(browserLibrary) ? browserLibrary
      : (localStorage.getItem(STORAGE_KEY) && isValidLibrary(local) ? local : await readBundledLibrary());
    const migrated = packLibrary(source || emptyLibrary());
    await saveLibrary(null, migrated);
    return migrated;
  })().finally(() => { libraryMigration = undefined; });
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

function findFolderPath(root, id) {
  for (const folder of root.folders) {
    if (folder.id === id) return [id];
    const nested = findFolderPath(folder, id);
    if (nested) return [folder.id, ...nested];
  }
  return null;
}

function storedFile(file) {
  return {
    id: file.id,
    dataURL: file.dataURL,
    mimeType: file.mimeType || "image/png",
    created: typeof file.created === "number" ? file.created : Date.now(),
  };
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

function App({ project, onExit }) {
  const apiRef = useRef(null);
  const brushName = useRef("钢笔");
  const layers = useLayers(project, apiRef, brushName);
  const layerState = layers.state;
  const savedLibrary = useRef(null);
  const [libraryError, setLibraryError] = useState("");
  const placementRequest = useRef(0);
  const strokeProfile = useRef(null);
  const strokeRelease = useRef(null);
  const strokePointer = useRef(null);
  const strokePenPressure = useRef(.5);
  const penStatusTime = useRef(0);
  const paintCanvas = useRef(null);
  const paintEngine = useRef(null);
  const measureRef = useRef(null);
  const precisionRef = useRef({ ...precisionDefaults, ...project.scene?.precision });
  const [precision, setPrecision] = useState(precisionRef.current);
  const [precisionOpen, setPrecisionOpen] = useState(false);
  const [precisionSection, setPrecisionSection] = useState(null);
  const [precisionEditing, setPrecisionEditing] = useState(null);
  const [measureStatus, setMeasureStatus] = useState("");
  const [calibrationLength, setCalibrationLength] = useState(null);
  const strokeHold = useRef(null);
  const liveMeasure = useRef(null);
  const measureOutput = useRef(null);
  const [saveError, setSaveError] = useState("");
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
  const [relationshipOverlayElement, setRelationshipOverlayElement] = useState(null);
  const [canvasViewport, setCanvasViewport] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [path, setPath] = useState([]);
  const [nameDialog, setNameDialog] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "zh-CN");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [shortcutSettingsOpen, setShortcutSettingsOpen] = useState(false);
  const [eraserMenuOpen, setEraserMenuOpen] = useState(false);
  const [partialEraser, setPartialEraser] = useState(false);
  const [magicWand, setMagicWand] = useState(false);
  const drawingPointer = useRef(null);
  const queuedTool = useRef(null);
  const [nudgeEnabled, setNudgeEnabled] = useState(false);
  const bucketPointer = useRef(null);
  const nudgeCursor = useRef(null);
  const nudgePreview = useRef(null);
  const nudge = useMemo(() => createNudge(apiRef, nudgeCursor, nudgePreview), []);
  useEffect(() => () => nudge.cancel(), [nudge, nudgeEnabled]);
  const brushKit = useBrushKit(apiRef, layerState, kind => {
    setPartialEraser(kind === "partial");
    setMagicWand(kind === "wand");
    setNudgeEnabled(kind === "nudge");
    bucketPointer.current = null;
    eraseSessionRef.current = null;
    setBrushPosition(null);
  });
  const bucketEnabled = brushKit.active?.type === "bucket";
  const brushKitRef = useRef(brushKit);
  brushKitRef.current = brushKit;
  useEffect(() => {
    const engine = makePaintEngine(paintCanvas, apiRef, (profile, original) => {
      const state = layerState.current;
      const id = original?.id ?? (state.focus || (state.mode === "manual" ? state.active :
        state.items.find(item => item.tool === profile.name && item.visible && !item.locked && !item.archived)?.id));
      const target = state.items.find(item => item.id === id);
      return { id, allowed: !id || !!target && target.visible && !target.locked && !target.archived };
    });
    paintEngine.current = engine;
    return () => { engine.close(); paintEngine.current = null; };
  }, [layerState]);
  useEffect(() => { paintEngine.current?.texture(brushKit.pen?.texture); }, [brushKit.pen?.texture]);
  const [brushSize, setBrushSize] = useState(32);
  const [brushPosition, setBrushPosition] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [libraryClipboard, setLibraryClipboard] = useState(null);
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
  const materialImageInput = useRef(null);
  const libraryActions = useRef(null);
  const materialDrag = useRef(null);
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
  useEffect(() => {
    if (!isOpen || libraryReady) return;
    let active = true;
    setLibraryError("");
    openMaterials().then(value => {
      if (!active) return;
      savedLibrary.current = value;
      setLibrary(value);
      setLibraryReady(true);
    }).catch(() => { if (active) setLibraryError("素材库读取失败，关闭后重试。原有备份已保留。"); });
    return () => { active = false; };
  }, [isOpen, libraryReady]);

  useEffect(() => {
    let active = true;
    const loadCanvas = async () => {
      try {
        const saved = project.scene;
        if (saved?.elements && active) {
          const migrated = migrateNativeElementLinks(saved.elements, saved.relationships || {});
          const cleanElements = withoutNativeLinks(saved.elements);
          setCanvasInitialData({ ...saved, elements: cleanElements, relationships: migrated.relationships });
          setBackgroundColor(saved.appState?.viewBackgroundColor || "#f2f2f7");
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
    libraryWriteQueueRef.current = libraryWriteQueueRef.current.then(async () => {
      if (savedLibrary.current === library) return;
      try {
        await saveLibrary(savedLibrary.current, library);
        savedLibrary.current = library;
        setLibraryError("");
      } catch {
        setLibraryError("素材改动未保存。可导出备份，或点击重试。");
      }
    });
  }, [library, libraryReady]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    let slotFrame = 0;
    const activateTool = tool => {
      const kit = brushKitRef.current;
      if (typeof tool === "number") kit.activate(tool, false);
      else kit.activateById(tool);
    };
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229 ||
          event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog, [aria-modal="true"]')) return;
      if (["Escape", "Esc", "ESC"].includes(event.key)) {
        paintEngine.current?.cancel();
        queuedTool.current = null;
        bucketPointer.current = null;
        placementRequest.current++; measureRef.current = null; setMeasureStatus(""); setPrecisionEditing(null); setPartialEraser(false); setMagicWand(false); nudge.cancel(); eraseSessionRef.current = null; straightLineAnchorRef.current = null; setBrushPosition(null);
        setEraserMenuOpen(false); setLanguageMenuOpen(false); setBackgroundPanelOpen(false); setNameDialog(null); setRelationshipSourceId(null); setRelationshipMenuOpen(false);
        return;
      }
      if (event.ctrlKey || event.metaKey) return;
      const kit = brushKitRef.current;
      const consume = () => {
        event.preventDefault();
        event.stopPropagation();
      };
      const shortcut = shortcutFromEvent(event);
      const directTool = kit.shortcutForKey(shortcut) || kit.aliasForKey(shortcut);
      const slot = event.altKey && !event.shiftKey && /^Digit[1-8]$/.test(event.code) ? Number(event.code.at(-1)) - 1 : null;
      if (directTool || slot !== null) {
        consume();
        if (event.repeat) return;
        const tool = directTool || slot;
        if (drawingPointer.current !== null) queuedTool.current = tool;
        else { cancelAnimationFrame(slotFrame); activateTool(tool); }
        return;
      }
      if (isDefaultToolKey(shortcut)) { consume(); return; }
      let handled = false;
      if (event.altKey && !event.shiftKey && event.code === "KeyL" && kit.lineTarget) {
        handled = event.repeat || kit.toggleLineStyle();
      } else if (event.code === "BracketLeft" || event.code === "BracketRight") {
        const direction = event.code === "BracketLeft" ? -1 : 1;
        if (event.altKey && !event.shiftKey) handled = kit.adjust("dashDensity", direction * 5);
        else if (!event.altKey && event.shiftKey) handled = kit.adjust("opacity", direction * 5);
        else if (!event.altKey && !event.shiftKey) {
          if (nudgeEnabled) { kit.setNudgeRadius(kit.settings.nudgeRadius + direction * 4); handled = true; }
          else if (partialEraser) { setBrushSize(size => Math.min(240, Math.max(4, size + direction * 4))); handled = true; }
          else handled = kit.adjust("width", direction * .5);
        }
      } else if (event.altKey && !event.shiftKey && (event.code === "Minus" || event.code === "Equal")) {
        handled = kit.adjust("smoothing", event.code === "Minus" ? -5 : 5);
      }
      if (!handled) return;
      consume();
      const draft = apiRef.current?.getAppState().newElement;
      const profile = kit.currentPen();
      if (!kit.selection && draft && profile?.type === draft.type && hasLineStyle(draft.type) && !profile.engine) {
        if (draft.type === "freedraw") strokeProfile.current = profile;
        mutateElement(draft, {
          strokeStyle: profile.strokeStyle, strokeWidth: profile.width, opacity: profile.opacity,
          customData: { ...draft.customData, infiniteDashDensity: profile.dashDensity },
        });
      }
    };
    const releaseSlot = event => {
      if (drawingPointer.current !== event.pointerId) return;
      drawingPointer.current = null;
      const tool = queuedTool.current;
      queuedTool.current = null;
      if (tool !== null && event.type === "pointerup") slotFrame = requestAnimationFrame(() => activateTool(tool));
    };
    const clearPendingSlot = () => {
      drawingPointer.current = null;
      queuedTool.current = null;
      cancelAnimationFrame(slotFrame);
    };
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerup", releaseSlot, true);
    window.addEventListener("pointercancel", releaseSlot, true);
    window.addEventListener("blur", clearPendingSlot);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerup", releaseSlot, true);
      window.removeEventListener("pointercancel", releaseSlot, true);
      window.removeEventListener("blur", clearPendingSlot);
      cancelAnimationFrame(slotFrame);
    };
  }, [partialEraser, nudgeEnabled, nudge]);

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
    apiRef.current?.updateScene({ appState: { viewBackgroundColor: backgroundImage ? "transparent" : backgroundColor } });
    const control = document.querySelector("[data-canvas-background-scale]");
    if (control) { control.value = String(backgroundScale); control.style.display = backgroundImage ? "block" : "none"; }
  }, [backgroundImage, backgroundScale, backgroundColor]);

  useEffect(() => {
    const mountNativeExtensions = () => {
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
    };
    const observer = new MutationObserver(mountNativeExtensions);
    const refreshOnContextMenu = () => window.setTimeout(mountNativeExtensions, 0);
    observer.observe(document.querySelector(".canvas-shell"), { childList: true, subtree: true });
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
    const files = Object.fromEntries([...sceneImageFileIds(elements)].filter(id => sceneFiles[id]).map(id => [id, storedFile(sceneFiles[id])]));
    setNameInput(zh ? `素材 ${current.objects.length + 1}` : `Material ${current.objects.length + 1}`);
    setNameDialog({ type: "object", elements: layerSafeElements(elements), files });
  }, [current.objects.length, path, ui.selectFirst, zh]);

  const moveFolder = (sourceId, targetId) => {
    const location = root => {
      const source = findFolderPath(root, sourceId);
      const target = targetId === null ? [] : findFolderPath(root, targetId);
      if (!source || !target || target.includes(sourceId) || (source.at(-2) ?? null) === targetId) return null;
      return { source, target };
    };
    const destination = location(library);
    if (!destination) return false;
    setLibrary((root) => {
      const routes = location(root);
      if (!routes) return root;
      const moved = folderAt(root, routes.source);
      const withoutSource = updateFolder(root, routes.source.slice(0, -1), parent => ({
        ...parent, folders: parent.folders.filter(folder => folder.id !== sourceId),
      }));
      return updateFolder(withoutSource, routes.target, target => ({ ...target, folders: [...target.folders, moved] }));
    });
    const openIndex = path.indexOf(sourceId);
    if (openIndex !== -1) setPath([...destination.target, ...path.slice(openIndex)]);
    return true;
  };

  const transferObject = (entry, targetId) => {
    setLibrary(root => {
      if (!findFolder(root, targetId) || entry.path.at(-1) === targetId) return root;
      const object = folderAt(root, entry.path).objects.find(item => item.id === entry.item.id);
      if (!object) return root;
      const next = updateFolder(root, entry.path, folder => ({ ...folder, objects: folder.objects.filter(item => item.id !== object.id) }));
      return updateFolderById(next, targetId, folder => ({ ...folder, objects: [...folder.objects, object] }));
    });
  };

  const cloneLibraryFolder = useCallback((folder, name = folder.name) => ({
    ...folder,
    id: crypto.randomUUID(),
    name,
    folders: folder.folders.map(child => cloneLibraryFolder(child)),
    objects: folder.objects.map((object) => ({ ...object, id: crypto.randomUUID() })),
  }), []);

  const copyLibraryItem = (type, entry, cut) => {
    setLibraryClipboard({ type, item: entry.item, cut, sourcePath: entry.path, sourceId: entry.item.id });
  };

  const pasteLibraryItem = useCallback(() => {
    if (!libraryClipboard) return;
    if (libraryClipboard.type === "folder" && libraryClipboard.cut && path.includes(libraryClipboard.sourceId)) return;
    setLibrary((root) => {
      const source = libraryClipboard.type === "folder" ? findFolder(root, libraryClipboard.sourceId)
        : folderAt(root, libraryClipboard.sourcePath).objects.find(object => object.id === libraryClipboard.sourceId);
      if (!source) return root;
      const name = `${source.name} ${zh ? "副本" : "copy"}`;
      const item = libraryClipboard.cut ? source : libraryClipboard.type === "folder"
        ? cloneLibraryFolder(source, name)
        : { ...source, id: crypto.randomUUID(), name };
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
  }, [cloneLibraryFolder, libraryClipboard, path, zh]);

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
      strokeWidth: appState.currentItemStrokeWidth || 3,
      strokeStyle: appState.currentItemStrokeStyle,
      roughness: appState.currentItemRoughness,
      opacity: appState.currentItemOpacity,
    }], { regenerateIds: true });
    const profile = brushKitRef.current.mode.current;
    if (profile.strokeStyle === "dashed") mutateElement(line, { strokeStyle: "dashed", customData: { infiniteDashDensity: profile.dashDensity } }, false);
    api.updateScene({ elements: [...api.getSceneElements(), line] });
  }, []);

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
        ...folder, folders: [...folder.folders, { ...makeFolder(name), description: nameDialog.description?.trim() || "" }],
      })));
    } else if (nameDialog.type === "rename-object") {
      const tags = [...new Set((nameDialog.tags || "").split(/[,，]/).map(tag => tag.trim()).filter(Boolean))];
      setLibrary(root => updateFolder(root, nameDialog.path, folder => ({
        ...folder, objects: folder.objects.map(item => item.id === nameDialog.id ? { ...item, name, tags } : item),
      })));
    } else if (nameDialog.type === "rename-folder") {
      setLibrary(root => updateFolderById(root, nameDialog.id, folder => ({ ...folder, name, description: nameDialog.description?.trim() || "" })));
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
      const material = packMaterial({ id: crypto.randomUUID(), name, elements: nameDialog.elements, files: nameDialog.files });
      setLibrary((root) => updateFolder(root, path, (folder) => ({
        ...folder,
        objects: [...folder.objects, material],
      })));
    }
    setNameDialog(null);
  }, [nameDialog, nameInput, path]);

  const placeMaterial = async (object, clientX, clientY) => {
    const api = apiRef.current;
    if (!api) return;
    const request = ++placementRequest.current;
    let placing;
    try { placing = await materialData(object); }
    catch { setLibraryError("无法读取此素材，请检查备份。"); return; }
    if (request !== placementRequest.current || api !== apiRef.current) return;
    const state = api.getAppState();
    const x = (clientX - state.offsetLeft) / state.zoom.value - state.scrollX;
    const y = (clientY - state.offsetTop) / state.zoom.value - state.scrollY;
    api.setActiveTool({ type: "selection" });
    const insert = elements => api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), ...elements],
      appState: { selectedElementIds: Object.fromEntries(elements.map(element => [element.id, true])) },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    if (placing.kind === "image") {
      const fileId = crypto.randomUUID();
      api.addFiles([{ id: fileId, dataURL: placing.imageData, mimeType: placing.imageData.match(/^data:([^;,]+)/)?.[1] || "image/png", created: Date.now() }]);
      const [imageElement] = convertToExcalidrawElements([{
        type: "image", fileId, status: "saved", x, y, width: placing.width, height: placing.height,
      }], { regenerateIds: true });
      insert([imageElement]);
      return;
    }
    if (placing.files && Object.keys(placing.files).length) {
      api.addFiles(Object.values(placing.files));
    }
    const minX = Math.min(...placing.elements.map((element) => element.x));
    const minY = Math.min(...placing.elements.map((element) => element.y));
    const ids = new Map(placing.elements.map(element => [element.id, crypto.randomUUID()]));
    const groups = new Map();
    const binding = value => value && ids.has(value.elementId) ? { ...value, elementId: ids.get(value.elementId) } : null;
    const cloned = placing.elements.map(element => ({
      ...element,
      id: ids.get(element.id),
      x: element.x + x - minX,
      y: element.y + y - minY,
      groupIds: (element.groupIds || []).map(id => {
        if (!groups.has(id)) groups.set(id, crypto.randomUUID());
        return groups.get(id);
      }),
      boundElements: element.boundElements?.filter(item => ids.has(item.id)).map(item => ({ ...item, id: ids.get(item.id) })) || null,
      frameId: ids.get(element.frameId) || null,
      ...(element.type === "text" && { containerId: ids.get(element.containerId) || null }),
      ...(["arrow", "line"].includes(element.type) && { startBinding: binding(element.startBinding), endBinding: binding(element.endBinding) }),
    }));
    insert(cloned);
  };

  const flushCanvasSave = useCallback(() => {
    if (canvasSaveTimerRef.current) {
      window.clearTimeout(canvasSaveTimerRef.current);
      canvasSaveTimerRef.current = null;
    }
    const payload = pendingCanvasPayloadRef.current;
    if (!payload) return canvasWriteQueueRef.current;
    pendingCanvasPayloadRef.current = null;
    canvasWriteQueueRef.current = canvasWriteQueueRef.current
      .catch(() => undefined)
      .then(() => saveProjectScene(project.id, payload))
      .catch(error => {
        pendingCanvasPayloadRef.current ??= payload;
        setSaveError("画布未保存，请重试或导出项目备份。");
        throw error;
      });
    return canvasWriteQueueRef.current;
  }, [project.id]);

  const saveCanvas = useCallback((elements, appState, files) => {
    const referenced = sceneImageFileIds(elements);
    const payload = {
      elements,
      files: Object.fromEntries([...referenced].flatMap(id => {
        const file = (files || apiRef.current?.getFiles?.())?.[id];
        return file ? [[id, file]] : [];
      })),
      appState: { viewBackgroundColor: brushKitRef.current.samplingBackground.current ?? (appState.viewBackgroundColor || "#f2f2f7") },
      relationships: relationshipsRef.current,
      relationshipCollections: relationshipCollectionsRef.current,
      relationshipNames: relationshipNamesRef.current,
      precision: precisionRef.current,
      layers: { ...layerState.current, focus: null },
      savedAt: Date.now(),
    };
    const signature = JSON.stringify({
      precision: payload.precision,
      layers: payload.layers,
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
    canvasSaveTimerRef.current = window.setTimeout(() => { void flushCanvasSave().catch(() => {}); }, 450);
  }, [flushCanvasSave, layerState]);
  layers.save.current = saveCanvas;

  useEffect(() => {
    const flush = () => { void flushCanvasSave().catch(() => {}); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
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

  const exportLibrary = useCallback(async () => {
    try {
      downloadJSON({ version: 1, exportedAt: new Date().toISOString(), library: await exportTree(library) },
        `无限画布素材库-${new Date().toISOString().slice(0, 10)}.json`);
    } catch { setLibraryError("素材备份导出失败。"); }
  }, [library]);

  const importLibrary = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const next = payload.library || payload;
      if (!Array.isArray(next.folders) || !Array.isArray(next.objects)) throw new Error("invalid library");
      if (payload.type === "infinite-canvas-material-pack") {
        const pack = packLibrary(cloneLibraryFolder(next));
        setLibrary(root => updateFolder(root, path, folder => ({ ...folder, folders: [...folder.folders, pack] })));
        return;
      }
      if (!window.confirm(zh ? "导入会替换当前素材库，是否继续？" : "Importing will replace the current material library. Continue?")) return;
      setLibrary(packLibrary(next));
      setPath([]);
    } catch {
      window.alert(zh ? "素材库文件无效，无法导入。" : "This material library file is invalid.");
    } finally {
      event.target.value = "";
    }
  }, [zh, path, cloneLibraryFolder]);

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

  const changePrecision = next => {
    const previous = precisionRef.current;
    if (!next.grid || !next.gridVisible || !next.guide) setPrecisionEditing(current => current === "grid" && (!next.grid || !next.gridVisible) || current === "guide" && !next.guide ? null : current);
    precisionRef.current = next;
    setPrecision(next);
    if (previous.measure !== next.measure) layers.showMeasurements(next.measure);
    const api = apiRef.current;
    if (api) saveCanvas(api.getSceneElements(), api.getAppState(), api.getFiles());
  };
  const precisionCenter = () => {
    const api = apiRef.current;
    const point = api && scenePoint({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }, api);
    return point ? [point.x, point.y] : [0, 0];
  };
  const openGrid = () => {
    const current = precisionRef.current;
    const [x, y] = current.gridPlaced ? current.origin : precisionCenter();
    changePrecision({ ...current, grid: true, gridVisible: true, gridPlaced: true, origin: [x, y],
      vanishing: current.vanishing || [[x + 280, y], [x - 280, y], [x, y - 220]] });
  };
  const openGuide = () => {
    const current = precisionRef.current;
    const [x, y] = precisionCenter();
    changePrecision({ ...current, guide: true, guidePoints: current.guidePoints || [[x - 140, y - 75], [x + 140, y + 75]] });
    setPrecisionEditing("guide");
  };
  const startMeasure = kind => {
    setPrecisionEditing(null);
    measureRef.current = { kind, start: null, status: setMeasureStatus, calibrate: setCalibrationLength };
    setMeasureStatus("点击起点，Esc 取消");
  };
  const closePrecision = () => { setPrecisionOpen(false); setPrecisionEditing(null); };
  const projectScene = () => {
    const api = apiRef.current;
    const elements = api.getSceneElements();
    const used = sceneImageFileIds(elements);
    return { elements, files: Object.fromEntries(Object.entries(api.getFiles()).filter(([id]) => used.has(id))),
      appState: { viewBackgroundColor: brushKitRef.current.samplingBackground.current ?? api.getAppState().viewBackgroundColor },
      relationships: relationshipsRef.current, relationshipCollections: relationshipCollectionsRef.current,
      relationshipNames: relationshipNamesRef.current, precision: precisionRef.current,
      layers: { ...layerState.current, focus: null } };
  };
  const backToGallery = async () => {
    try {
      await paintEngine.current?.idle();
      await flushCanvasSave();
      await libraryWriteQueueRef.current;
      if (libraryReady && savedLibrary.current !== library) {
        setIsOpen(true);
        return;
      }
      const cover = await coverFor(projectScene()).catch(() => null);
      await write("covers", project.id, cover).catch(() => {});
      await onExit();
    } catch { setSaveError("画布未保存，请重试或导出项目备份。"); }
  };

  const removeMaterial = (type, entry) => {
    if (type === "folder") {
      if (!window.confirm(`删除“${entry.item.name}”及其全部内容？`)) return;
      setLibrary(root => removeFolderById(root, entry.item.id));
      if (path.includes(entry.item.id)) setPath(path.slice(0, path.indexOf(entry.item.id)));
      return;
    }
    if (!window.confirm(`删除素材“${entry.item.name}”？`)) return;
    setLibrary(root => updateFolder(root, entry.path, folder => ({
      ...folder, objects: folder.objects.filter(item => item.id !== entry.item.id),
    })));
  };
  const importImages = async (files, targetPath) => {
    let failed = 0;
    const objects = [];
    for (const file of files) {
      if (!/^image\/(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.type)) { failed++; continue; }
      try {
        const bitmap = await createImageBitmap(file);
        const { width, height } = bitmap;
        bitmap.close();
        const imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        const scale = Math.min(1, 480 / Math.max(width, height));
        objects.push(packMaterial({ id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ""),
          kind: "image", imageData, width: width * scale, height: height * scale }));
      } catch { failed++; }
    }
    if (objects.length) setLibrary(root => updateFolder(root, targetPath, folder => ({ ...folder, objects: [...folder.objects, ...objects] })));
    if (failed) setLibraryError(`${failed} 张图片无法导入。支持 PNG、JPEG、WebP、GIF、AVIF 和 BMP。`);
  };
  libraryActions.current = {
    close: () => setIsOpen(false), navigate: setPath, addPack: addFolder, saveSelection,
    movePack: moveFolder,
    retry: () => setLibrary(value => ({ ...value })), copy: copyLibraryItem, paste: pasteLibraryItem,
    remove: removeMaterial,
    edit: (type, entry) => {
      setNameInput(entry.item.name);
      setNameDialog({ type: type === "folder" ? "rename-folder" : "rename-object", id: entry.item.id,
        path: entry.path, description: entry.item.description, tags: entry.item.tags?.join("，") });
    },
    favorite: (type, item, sourcePath) => setLibrary(root => type === "folder"
      ? updateFolderById(root, item.id, folder => ({ ...folder, favorite: !folder.favorite }))
      : updateFolder(root, sourcePath, folder => ({
        ...folder, objects: folder.objects.map(object => object.id === item.id ? { ...object, favorite: !object.favorite } : object),
      }))),
    deleteMany: ids => {
      if (!window.confirm(`删除选中的 ${ids.size} 个素材？`)) return;
      const remove = folder => ({ ...folder, folders: folder.folders.map(remove),
        objects: folder.objects.filter(item => !ids.has(item.id)) });
      setLibrary(remove);
    },
    replace: entry => {
      const api = apiRef.current;
      const ids = api?.getAppState().selectedElementIds || {};
      const elements = api?.getSceneElements().filter(element => ids[element.id]) || [];
      if (!elements.length) { window.alert(ui.selectFirst); return; }
      if (!window.confirm(`用画布选区替换“${entry.item.name}”？`)) return;
      const allFiles = api.getFiles();
      const files = Object.fromEntries([...sceneImageFileIds(elements)].filter(id => allFiles[id]).map(id => [id, storedFile(allFiles[id])]));
      const packed = packMaterial({ ...entry.item, kind: undefined, elements: layerSafeElements(elements), files });
      setLibrary(root => updateFolder(root, entry.path, folder => ({
        ...folder, objects: folder.objects.map(item => item.id === packed.id ? packed : item),
      })));
    },
    exportPack: async pack => {
      try { downloadJSON({ type: "infinite-canvas-material-pack", version: 1, library: await exportTree(pack) }, pack.name + ".material-pack.json"); }
      catch { setLibraryError("素材包导出失败。"); }
    },
    importBackup: () => libraryImportRef.current?.click(), exportBackup: exportLibrary,
    importImages: () => materialImageInput.current?.click(), importFiles: importImages,
    place: (item, panel) => {
      const left = panel.left, right = window.innerWidth - panel.right;
      const x = left > right ? left / 2 : panel.right + right / 2;
      void placeMaterial(item, x, window.innerHeight / 2);
    },
    dragMaterial: (event, entry) => {
      materialDrag.current = { type: "object", entry };
      event.dataTransfer.setData(materialDragType, entry.item.id);
      event.dataTransfer.effectAllowed = "copyMove";
    },
    dragPack: (event, item) => {
      materialDrag.current = { type: "folder", item };
      event.dataTransfer.setData(materialDragType, item.id);
      event.dataTransfer.effectAllowed = "move";
    },
    canDrop: event => [...event.dataTransfer.types].includes(materialDragType),
    dropInPack: (event, targetId) => {
      if (![...event.dataTransfer.types].includes(materialDragType)) return;
      event.preventDefault();
      event.stopPropagation();
      const drag = materialDrag.current;
      if (drag?.type === "object") transferObject(drag.entry, targetId);
      if (drag?.type === "folder") moveFolder(drag.item.id, targetId);
      materialDrag.current = null;
    },
  };

  return (
    <main lang={language} className={`app-shell wheel-only ${(partialEraser || magicWand) ? "is-pixel-tool" : ""} ${brushKit.selection && ["native", "dimensions"].includes(brushKit.panel) ? `object-${brushKit.panel}` : ""}`}>
      <div
        className="canvas-shell"
        data-bucket={bucketEnabled || undefined}
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundRepeat: "repeat", backgroundSize: `${backgroundScale}px ${backgroundScale}px` } : undefined}
        onPointerMove={(event) => {
          if (handleCanvasPointerMove(event)) return;
          if (partialEraser || magicWand) {
            setBrushPosition({ x: event.clientX, y: event.clientY });
          }
          if (partialEraser) {
            if (event.buttons & 1) void eraseSelectedImageArea(event);
          }
        }}
        onDragOverCapture={event => {
          if (materialDrag.current?.type === "object" && [...event.dataTransfer.types].includes(materialDragType)) {
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = "copy";
          }
        }}
        onDropCapture={event => {
          if (![...event.dataTransfer.types].includes(materialDragType)) return;
          event.preventDefault();
          event.stopPropagation();
          const drag = materialDrag.current;
          materialDrag.current = null;
          if (drag?.type === "object") void placeMaterial(drag.entry.item, event.clientX, event.clientY);
        }}
        onPointerDownCapture={(event) => {
          if (event.button === 0 && event.isPrimary && event.target.closest("canvas")) drawingPointer.current = event.pointerId;
          if (event.button === 0 && event.target.closest("canvas") && apiRef.current &&
              !layers.canDraw(apiRef.current.getAppState())) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          if (measureRef.current && event.button === 0 && event.target.closest("canvas")) {
            event.preventDefault();
            event.stopPropagation();
            measureAt(event, apiRef.current, measureRef, precisionRef.current, () => layers.showMeasurements(true));
            return;
          }
          if (event.target.closest("canvas")) {
            if (bucketEnabled && event.button === 0 && event.isPrimary && !apiRef.current?.getAppState().openDialog) {
              event.preventDefault(); event.stopPropagation();
              if (brushKitRef.current.panel) brushKitRef.current.setPanel(null);
              bucketPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
              return;
            }
            if (nudgeEnabled && event.button === 0) {
              event.preventDefault(); event.stopPropagation();
              nudge.start(event, brushKit.settings.nudgeRadius);
              return;
            }
            const state = apiRef.current?.getAppState();
            if (state?.activeTool.type === "freedraw" && precisionRef.current.recognize) {
              strokeHold.current = { x: event.clientX, y: event.clientY, last: performance.now(), held: 0 };
            } else strokeHold.current = null;
            if (event.button === 0 && precisionRef.current.measure && ["freedraw", "line", "arrow", "rectangle", "ellipse", "diamond"].includes(state?.activeTool.type)) {
              liveMeasure.current = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY,
                zoom: state.zoom.value, type: state.activeTool.type, length: 0, next: 0 };
            }
            strokePointer.current = event.pointerType;
            strokePenPressure.current = event.pressure || .5;
            strokeProfile.current = brushKitRef.current.mode.current;
            brushName.current = strokeProfile.current.name;
            strokeRelease.current = null;
            if (apiRef.current?.getAppState().activeTool.type === "freedraw" &&
                paintEngine.current?.start(event, strokeProfile.current)) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
          }
          if (handleCanvasPointerDown(event)) return;
          if (partialEraser) void eraseSelectedImageArea(event);
          else if (magicWand) void magicWandAtPoint(event);
        }}
        onPointerMoveCapture={event => {
          if (nudgeEnabled) { nudge.move(event, brushKit.settings.nudgeRadius); return; }
          const draftStroke = event.buttons && strokeProfile.current?.strokeStyle === "dashed" && apiRef.current?.getAppState().newElement;
          if (draftStroke?.type === "freedraw" && draftStroke.strokeStyle !== "dashed") {
            mutateElement(draftStroke, { strokeStyle: "dashed", customData: { ...draftStroke.customData, infiniteDashDensity: strokeProfile.current.dashDensity } }, false);
          }
          const hold = strokeHold.current;
          if (hold && event.buttons && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 4) {
            hold.x = event.clientX; hold.y = event.clientY; hold.last = performance.now();
          }
          const live = liveMeasure.current;
          if (live?.type === "freedraw" && event.buttons) {
            live.length += Math.hypot(event.clientX - live.lastX, event.clientY - live.lastY);
            live.lastX = event.clientX; live.lastY = event.clientY;
          }
          if (live && event.buttons && performance.now() >= live.next && measureOutput.current) {
            live.next = performance.now() + 45;
            const output = measureOutput.current;
            const dx = Math.abs(event.clientX - live.x) / live.zoom, dy = Math.abs(event.clientY - live.y) / live.zoom;
            const settings = precisionRef.current;
            output.textContent = live.type === "freedraw" ? measured(live.length / live.zoom, settings) :
              ["rectangle", "ellipse", "diamond"].includes(live.type) ? measured(dx, settings) + " × " + measured(dy, settings) : measured(Math.hypot(dx, dy), settings);
            output.style.left = Math.min(innerWidth - 100, event.clientX + 12) + "px";
            output.style.top = Math.max(10, event.clientY - 28) + "px";
            output.hidden = false;
          }
          if (event.pointerType === "pen" && event.buttons) {
            const time = performance.now();
            if (time - penStatusTime.current > 80) {
              penStatusTime.current = time;
              for (const status of document.querySelectorAll(".brush-pen-status, .brush-pen-reading")) {
                status.hidden = false;
                status.textContent = `压感笔 · 压力 ${Math.round(event.pressure * 100)}% · 倾斜 ${Math.round(Math.hypot(event.tiltX, event.tiltY))}°`;
              }
            }
            const stroke = apiRef.current?.getAppState().newElement;
            if (stroke?.type === "freedraw" && stroke.simulatePressure && strokeProfile.current?.dynamics === "pressure") {
              mutateElement(stroke, { simulatePressure: false, pressures: stroke.points.map(() => strokePenPressure.current) }, false);
            }
          }
          if (paintEngine.current?.move(event)) { event.preventDefault(); event.stopPropagation(); }
        }}
        onPointerLeave={() => nudge.leave()}
        onPointerCancelCapture={event => { if (bucketPointer.current?.id === event.pointerId) bucketPointer.current = null; nudge.cancel(); liveMeasure.current = null; strokeHold.current = null; if (measureOutput.current) measureOutput.current.hidden = true; if (paintEngine.current?.end(event, true)) event.stopPropagation(); }}
        onPointerUpCapture={(event) => {
          const bucket = bucketPointer.current;
          if (bucketEnabled && bucket?.id === event.pointerId) {
            bucketPointer.current = null;
            event.preventDefault(); event.stopPropagation();
            const api = apiRef.current;
            if (api && event.target.closest("canvas") && Math.hypot(event.clientX - bucket.x, event.clientY - bucket.y) <= 6) {
              const result = fillAt(api, scenePoint(event, api), brushKitRef.current.currentPen(), layerState.current);
              if (result) api.setToast({ message: zh ? result.zh : result.en });
            }
            return;
          }
          if (nudgeEnabled && event.button === 0) { nudge.move(event, brushKit.settings.nudgeRadius); nudge.end(event); event.stopPropagation(); return; }
          liveMeasure.current = null;
          if (measureOutput.current) measureOutput.current.hidden = true;
          if (strokeHold.current) strokeHold.current.held = performance.now() - strokeHold.current.last;
          if (paintEngine.current?.end(event)) { event.preventDefault(); event.stopPropagation(); return; }
          if (apiRef.current && activeToolRef.current === "freedraw") {
            strokeRelease.current = scenePoint(event, apiRef.current);
          }
          if (handleCanvasPointerUp(event)) return;
          if (partialEraser && eraseSessionRef.current) void eraseSelectedImageArea(event, true);
        }}
      >
        {canvasReady && <Excalidraw
          excalidrawAPI={(api) => { apiRef.current = api; }}
          onLinkOpen={handleNativeLinkOpen}
          onPointerDown={handleExcalidrawPointerDown}
          onChange={(elements, appState, files) => {
            layers.sync(elements, appState);
            const activeTool = appState.activeTool?.type || "selection";
            const changedTool = activeToolRef.current !== activeTool;
            const enteredFreeDraw = activeTool === "freedraw" && changedTool;
            activeToolRef.current = activeTool;
            if (changedTool) {
              brushKitRef.current.nativeChanged(activeTool);
              if (activeTool !== "selection") setNudgeEnabled(false);
            }
            if (enteredFreeDraw) queueMicrotask(() => {
              if (activeToolRef.current === "freedraw") brushKitRef.current.applyLast();
            });
            const nextSelectedElementIds = appState.selectedElementIds || {};
            const selectedIds = Object.keys(nextSelectedElementIds).filter((id) => nextSelectedElementIds[id]);
            setSelectedElementIds(previous => {
              const previousIds = Object.keys(previous).filter(id => previous[id]);
              return previousIds.length === selectedIds.length && selectedIds.every(id => previous[id])
                ? previous : nextSelectedElementIds;
            });
            const overlayElements = selectedIds.length
              ? elements.filter(element => nextSelectedElementIds[element.id] && !element.isDeleted) : [];
            brushKitRef.current.syncSelection(overlayElements, bucketEnabled ? "bucket" : activeTool);
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
              ...(precisionRef.current.measure && overlayElements.length === 1 && {
                length: overlayElements[0].points?.reduce((sum, p, i, all) => i ? sum + Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1]) : sum, 0),
                area: overlayElements[0].width * overlayElements[0].height * ({ rectangle: 1, diamond: .5, ellipse: Math.PI / 4 }[overlayElements[0].type] || 0),
              }),
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
          onPointerUp={tool => {
            const stroke = apiRef.current?.getAppState().newElement;
            const profile = brushKitRef.current.pen;
            if (stroke && stroke.type !== "freedraw" && hasLineStyle(stroke.type) && profile?.type === stroke.type && profile.strokeStyle === "dashed") {
              mutateElement(stroke, { strokeStyle: "dashed", customData: { ...stroke.customData, infiniteDashDensity: profile.dashDensity } }, false);
            }
            if (tool.type === "freedraw" && stroke?.type === "freedraw") {
              finalizeBrush(stroke, strokeProfile.current, strokePointer.current, mutateElement, strokeRelease.current);
              const settings = precisionRef.current;
              const held = strokeHold.current?.held || 0;
              if (settings.guide || settings.snap && settings.grid || settings.recognize && held >= settings.hold) {
                const api = apiRef.current;
                // Excalidraw appends its raw release point after this callback returns.
                queueMicrotask(() => {
                  if (api !== apiRef.current) return;
                  const completed = api.getSceneElements().find(element => element.id === stroke.id);
                  if (completed) preciseStroke(completed, settings, held, (element, updates) => mutateElement(element, updates));
                });
              }
            }
          }}
          gridModeEnabled={false}
          objectsSnapModeEnabled={precision.snap}
          langCode={language}
          initialData={canvasInitialData}
        >
          <MainMenu>
            <MainMenu.Item onSelect={backToGallery}>返回项目画廊</MainMenu.Item>
            <MainMenu.Item onSelect={() => setLanguage(zh ? "en" : "zh-CN")}>{ui.language}</MainMenu.Item>
            <MainMenu.Item onSelect={() => downloadJSON({ type: "infinite-canvas-project", version: 1, name: project.name, scene: projectScene() }, project.name + ".canvas.json")}>导出项目备份</MainMenu.Item>
            <MainMenu.Item onSelect={() => {
              const { elements, appState, files } = projectScene();
              const exported = JSON.parse(serializeAsJSON(layerSafeElements(elements), appState, files, "local"));
              downloadJSON({ ...exported, files: { ...files, ...exported.files } }, project.name + ".excalidraw");
            }}>导出 Excalidraw 文件</MainMenu.Item>
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SearchMenu />
            <MainMenu.Item onSelect={() => setShortcutSettingsOpen(true)}>{zh ? "快捷键设置" : "Keyboard shortcuts"}</MainMenu.Item>
            <MainMenu.DefaultItems.Help />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
        </Excalidraw>}
        <canvas className="brush-paint-preview" ref={paintCanvas} aria-hidden="true" />
      </div>

      <LayerPanel controller={layers} hasSelection={selectedRelationshipIds.length > 0}
        onTogglePrecision={() => precisionOpen ? closePrecision() : setPrecisionOpen(true)} onClosePrecision={closePrecision}
        precisionTools={precisionOpen && <PrecisionPanel value={precision} change={changePrecision} start={startMeasure}
          section={precisionSection} setSection={setPrecisionSection} editing={precisionEditing} setEditing={setPrecisionEditing}
          openGuide={openGuide} openGrid={openGrid} />}
        gridLayer={<PrecisionGridRow value={precision} change={changePrecision}
          settings={() => { setPrecisionOpen(true); setPrecisionSection("grid"); }} edit={() => { if (!precision.gridVisible) openGrid(); setPrecisionEditing("grid"); }} />} />
      <PrecisionOverlay value={precision} viewport={canvasViewport} change={changePrecision} editing={precisionEditing} selected={relationshipOverlayElement} />
      {precision.measure && <output ref={measureOutput} className="precision-selected-measure" hidden />}
      {measureStatus && <div className="precision-status" role="status">{measureStatus}</div>}
      {calibrationLength && <CalibrationDialog length={calibrationLength} unit={precision.unit} close={() => setCalibrationLength(null)}
        apply={scale => { changePrecision({ ...precisionRef.current, scale }); setCalibrationLength(null); }} />}
      <BrushKit kit={brushKit} zh={zh} />
      {shortcutSettingsOpen && <ShortcutSettings kit={brushKit} zh={zh} close={() => setShortcutSettingsOpen(false)} />}
      {nudgeEnabled && <><div ref={nudgeCursor} className="nudge-cursor" hidden />
        <svg className="nudge-preview" aria-hidden="true"><path ref={nudgePreview} /></svg></>}
      {saveError && <button className="workspace-save-error" onClick={() => {
        setSaveError("");
        void flushCanvasSave().catch(() => {});
      }}>{saveError} 重试</button>}
      <input ref={backgroundInputRef} className="visually-hidden" type="file" accept="image/*" onChange={chooseBackgroundImage} />
      <input ref={libraryImportRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importLibrary} />

      <input ref={materialImageInput} className="visually-hidden" type="file" accept="image/*" multiple onChange={event => {
        void importImages([...event.target.files], path);
        event.target.value = "";
      }} />
      <button className="library-trigger" onClick={() => setIsOpen(open => !open)} aria-expanded={isOpen}
        title={ui.library} aria-label={ui.library}><LibraryIcon name="grid" /></button>
      {isOpen && <MaterialPanel library={library} path={path} current={current} ready={libraryReady}
        error={libraryError} zh={zh} clipboard={libraryClipboard} actionsRef={libraryActions} />}

      {selectedRelationshipElement && <span className="relationship-control">
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
        </span>}
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
            {(nameDialog.type === "folder" || nameDialog.type === "rename-folder") && <label>素材包说明
              <textarea value={nameDialog.description || ""} maxLength={300} onChange={event =>
                setNameDialog(value => ({ ...value, description: event.target.value }))} /></label>}
            {nameDialog.type === "rename-object" && <label>搜索标签（用逗号分隔）
              <input value={nameDialog.tags || ""} maxLength={200} onChange={event =>
                setNameDialog(value => ({ ...value, tags: event.target.value }))} /></label>}
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

createRoot(document.getElementById("root")).render(<Gallery Editor={App} readLegacy={readIndexedCanvas} />);
