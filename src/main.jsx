import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, exportToSvg } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./style.css";

const STORAGE_KEY = "infinite-canvas-notes-library-v2";

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

function App() {
  const apiRef = useRef(null);
  const [library, setLibrary] = useState(loadLibrary);
  const [isOpen, setIsOpen] = useState(false);
  const [path, setPath] = useState([]);
  const [placing, setPlacing] = useState(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [nameDialog, setNameDialog] = useState(null);
  const [nameInput, setNameInput] = useState("");

  const current = useMemo(() => folderAt(library, path), [library, path]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    const cancel = (event) => event.key === "Escape" && setPlacing(null);
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, []);

  const addFolder = useCallback(() => {
    setNameInput("新建素材文件夹");
    setNameDialog({ type: "folder" });
  }, []);

  const saveSelection = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    const ids = api.getAppState().selectedElementIds;
    const elements = api.getSceneElements().filter((element) => ids[element.id]);
    if (!elements.length) {
      window.alert("请先使用 Excalidraw 的选择工具选中画布内容。");
      return;
    }
    const preview = await thumbnail(elements, api.getFiles());
    setNameInput(`素材 ${current.objects.length + 1}`);
    setNameDialog({ type: "object", elements, preview });
  }, [current.objects.length, path]);

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
      >
        <Excalidraw
          excalidrawAPI={(api) => { apiRef.current = api; }}
          initialData={{ appState: { viewBackgroundColor: "#f2f2f7" }, elements: [] }}
        />
      </div>

      <button className="library-trigger" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
        ◫ <span>我的素材</span>
      </button>

      {isOpen && (
        <aside className="object-library" aria-label="我的素材库">
          <header>
            <button className="back-button" onClick={() => path.length ? setPath((items) => items.slice(0, -1)) : setIsOpen(false)}>
              {path.length ? "‹ 返回" : "×"}
            </button>
            <strong>{current.name || "我的素材"}</strong>
            <button onClick={addFolder} title="新建文件夹">＋</button>
          </header>
          <button className="save-selection" onClick={saveSelection}>＋ 将选区存为素材</button>
          <p className="hint">点击文件夹进入；点击素材后跟随鼠标，单击画布确认放置。</p>
          <div className="library-content">
            {current.folders.map((folder) => (
              <button className="folder-card" key={folder.id} onClick={() => setPath((items) => [...items, folder.id])}>
                <span>▰</span><b>{folder.name}</b><small>{folder.folders.length + folder.objects.length}</small>
              </button>
            ))}
            {current.objects.map((object) => (
              <article className="object-card" key={object.id}>
                <button className="object-preview" onClick={() => beginPlacement(object)} title={`放置：${object.name}`}>
                  {object.preview ? <img src={object.preview} alt="" /> : <span>{object.elements.length}</span>}
                </button>
                <div><button className="object-name" onClick={() => beginPlacement(object)}>{object.name}</button><small>{object.elements.length} 个对象</small></div>
                <button className="object-delete" onClick={() => removeObject(object.id)} aria-label={`删除 ${object.name}`}>×</button>
              </article>
            ))}
            {!current.folders.length && !current.objects.length && <p className="empty">此文件夹还没有素材。</p>}
          </div>
        </aside>
      )}

      {placing && (
        <div className="placement-ghost" style={{ left: pointer.x + 16, top: pointer.y + 16 }}>
          {placing.preview ? <img src={placing.preview} alt="" /> : <span>{placing.name}</span>}
          <small>单击放置 · Esc 取消</small>
        </div>
      )}

      {nameDialog && (
        <div className="name-dialog-backdrop" role="presentation">
          <form className="name-dialog" onSubmit={submitName} aria-label={nameDialog.type === "folder" ? "新建素材文件夹" : "保存素材"}>
            <strong>{nameDialog.type === "folder" ? "新建素材文件夹" : "保存选区为素材"}</strong>
            <input autoFocus value={nameInput} onChange={(event) => setNameInput(event.target.value)} aria-label="名称" />
            <div>
              <button type="button" onClick={() => setNameDialog(null)}>取消</button>
              <button type="submit">确定</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
