import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, convertToExcalidrawElements, exportToSvg } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./style.css";

const STORAGE_KEY = "infinite-canvas-notes-library-v2";
const LANGUAGE_KEY = "infinite-canvas-notes-language";

const makeFolder = (name = "新建文件夹") => ({
  id: crypto.randomUUID(), name, folders: [], objects: [],
});

function loadLibrary() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return value || { folders: [], objects: [] };
  } catch {
    return { folders: [], objects: [] };
  }
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

function App() {
  const apiRef = useRef(null);
  const [library, setLibrary] = useState(loadLibrary);
  const [isOpen, setIsOpen] = useState(false);
  const [path, setPath] = useState([]);
  const [placing, setPlacing] = useState(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [nameDialog, setNameDialog] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "zh-CN");
  const [processingImage, setProcessingImage] = useState(false);
  const [draggedFolderId, setDraggedFolderId] = useState(null);
  const [contextImage, setContextImage] = useState(null);

  const zh = language === "zh-CN";
  const ui = zh ? {
    library: "我的素材", newFolder: "新建文件夹", save: "将选区存为素材", removeBg: "图片去底", processing: "正在去底…",
    hint: "点击文件夹进入；点击素材后跟随鼠标，单击画布确认放置。", empty: "此文件夹还没有素材。",
    back: "‹ 返回", place: "放置", objects: "个对象", delete: "删除", cancel: "取消", confirm: "确定",
    folderDialog: "新建素材文件夹", saveDialog: "保存选区为素材", name: "名称", placed: "单击放置 · Esc 取消",
    selectFirst: "请先使用选择工具选中画布内容。", imageFailed: "图片处理失败，请换一张图片重试。", language: "切换至 English", deleteFolder: "删除文件夹", moveHint: "拖到另一文件夹以移动",
  } : {
    library: "My library", newFolder: "New folder", save: "Save selection", removeBg: "Remove background", processing: "Processing…",
    hint: "Open a folder, then choose a material. Click the canvas to place it.", empty: "This folder is empty.",
    back: "‹ Back", place: "Place", objects: "objects", delete: "Delete", cancel: "Cancel", confirm: "Confirm",
    folderDialog: "New material folder", saveDialog: "Save selection", name: "Name", placed: "Click to place · Esc to cancel",
    selectFirst: "Select content on the canvas first.", imageFailed: "Couldn't process this image. Please try another one.", language: "Switch to 中文", deleteFolder: "Delete folder", moveHint: "Drag onto another folder to move",
  };

  const current = useMemo(() => folderAt(library, path), [library, path]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    const cancel = (event) => event.key === "Escape" && setPlacing(null);
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
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
    const preview = await thumbnail(elements, api.getFiles());
    setNameInput(zh ? `素材 ${current.objects.length + 1}` : `Material ${current.objects.length + 1}`);
    setNameDialog({ type: "object", elements, preview });
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

  const openImageContextMenu = useCallback((event) => {
    const api = apiRef.current;
    if (!api) return;
    const selected = api.getSceneElements().filter((element) => api.getAppState().selectedElementIds[element.id]);
    const image = selected.length === 1 && selected[0].type === "image" ? selected[0] : null;
    if (!image) return;
    event.preventDefault();
    setContextImage({ element: image, x: event.clientX, y: event.clientY });
  }, []);

  const removeSelectedImageBackground = useCallback(async () => {
    const api = apiRef.current;
    if (!api || !contextImage) return;
    const file = api.getFiles()[contextImage.element.fileId];
    if (!file?.dataURL) return;
    setProcessingImage(true);
    setContextImage(null);
    try {
      const response = await fetch(file.dataURL);
      const image = await removeImageBackground(await response.blob());
      const fileId = crypto.randomUUID();
      api.addFiles([{ id: fileId, dataURL: image.dataUrl, mimeType: "image/png", created: Date.now() }]);
      api.updateScene({
        elements: api.getSceneElements().map((element) => element.id === contextImage.element.id
          ? { ...element, fileId, version: element.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31), updated: Date.now() }
          : element),
      });
    } catch {
      window.alert(ui.imageFailed);
    } finally {
      setProcessingImage(false);
    }
  }, [contextImage, ui.imageFailed]);

  const submitName = useCallback((event) => {
    event.preventDefault();
    const name = nameInput.trim();
    if (!name || !nameDialog) return;
    if (nameDialog.type === "folder") {
      setLibrary((root) => updateFolder(root, path, (folder) => ({
        ...folder, folders: [...folder.folders, makeFolder(name)],
      })));
    } else {
      setLibrary((root) => updateFolder(root, path, (folder) => ({
        ...folder,
        objects: [...folder.objects, {
          id: crypto.randomUUID(), name,
          elements: nameDialog.elements, preview: nameDialog.preview,
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

  return (
    <main className={`app-shell ${placing ? "is-placing" : ""}`}>
      <div
        className="canvas-shell"
        onPointerMove={(event) => placing && setPointer({ x: event.clientX, y: event.clientY })}
        onPointerDownCapture={confirmPlacement}
        onContextMenu={openImageContextMenu}
      >
        <Excalidraw
          excalidrawAPI={(api) => { apiRef.current = api; }}
          langCode={language}
          initialData={{ appState: { viewBackgroundColor: "#f2f2f7" }, elements: [] }}
        />
      </div>

      <button className="language-toggle" onClick={() => setLanguage((value) => value === "zh-CN" ? "en" : "zh-CN")} title={ui.language} aria-label={ui.language}>
        <span>文</span>
      </button>
      <button className="library-trigger" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
        ◫ <span>{ui.library}</span>
      </button>

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
            <button className="save-selection" onClick={saveSelection}>＋ {ui.save}</button>
          </div>
          <p className="hint">{ui.hint} {ui.moveHint}</p>
          <div className="library-content">
            {current.folders.map((folder) => (
              <div className={`folder-card ${draggedFolderId === folder.id ? "is-dragging" : ""}`} key={folder.id} draggable
                onDragStart={() => setDraggedFolderId(folder.id)} onDragEnd={() => setDraggedFolderId(null)}
                onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); moveFolder(draggedFolderId, folder.id); setDraggedFolderId(null); }}>
                <button className="folder-open" onClick={() => setPath((items) => [...items, folder.id])} title={folder.name}>
                  <FolderIcon /><b>{folder.name}</b><small>{folder.folders.length + folder.objects.length}</small>
                </button>
                <button className="folder-delete" onClick={() => deleteFolder(folder.id, folder.name)} title={ui.deleteFolder} aria-label={ui.deleteFolder}>×</button>
              </div>
            ))}
            {current.objects.map((object) => (
              <article className="object-card" key={object.id}>
                <button className="object-preview" onClick={() => beginPlacement(object)} title={`${ui.place}: ${object.name}`}>
                  {object.preview ? <img src={object.preview} alt="" /> : <span>{object.elements?.length || 1}</span>}
                </button>
                <div><button className="object-name" onClick={() => beginPlacement(object)}>{object.name}</button><small>{object.kind === "image" ? "PNG" : `${object.elements.length} ${ui.objects}`}</small></div>
                <button className="object-delete" onClick={() => removeObject(object.id)} aria-label={`${ui.delete} ${object.name}`}>×</button>
              </article>
            ))}
            {!current.folders.length && !current.objects.length && <p className="empty">{ui.empty}</p>}
          </div>
        </aside>
      )}

      {placing && (
        <div className="placement-ghost" style={{ left: pointer.x + 16, top: pointer.y + 16 }}>
          {placing.preview ? <img src={placing.preview} alt="" /> : <span>{placing.name}</span>}
          <small>{ui.placed}</small>
        </div>
      )}

      {nameDialog && (
        <div className="name-dialog-backdrop" role="presentation">
          <form className="name-dialog" onSubmit={submitName} aria-label={nameDialog.type === "folder" ? ui.folderDialog : ui.saveDialog}>
            <strong>{nameDialog.type === "folder" ? ui.folderDialog : ui.saveDialog}</strong>
            <input autoFocus value={nameInput} onChange={(event) => setNameInput(event.target.value)} aria-label={ui.name} />
            <div>
              <button type="button" onClick={() => setNameDialog(null)}>{ui.cancel}</button>
              <button type="submit">{ui.confirm}</button>
            </div>
          </form>
        </div>
      )}

      {contextImage && (
        <div className="image-context-menu" style={{ left: contextImage.x, top: contextImage.y }} role="menu">
          <button onClick={removeSelectedImageBackground} disabled={processingImage}>{processingImage ? ui.processing : ui.removeBg}</button>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
