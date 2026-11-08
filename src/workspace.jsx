import React, { useEffect, useRef, useState } from "react";
import { exportToCanvas } from "@excalidraw/excalidraw";
import { createProject, deleteProject, list, materialData, read, write } from "./storage.js";

export function downloadJSON(value, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function imageCanvas(dataURL) {
  const image = new Image();
  image.src = dataURL;
  await image.decode();
  const scale = Math.min(1, 240 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function coverFor(scene) {
  if (!scene?.elements?.some(element => !element.isDeleted)) return null;
  const canvas = await exportToCanvas({
    elements: scene.elements, files: scene.files || {},
    appState: { viewBackgroundColor: "#ffffff", exportBackground: true },
    getDimensions(width, height) {
      const scale = Math.min(1, 240 / Math.max(width, height));
      return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scale };
    },
  });
  return canvasBlob(canvas);
}

const canvasBlob = canvas => new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.78));
let thumbnailQueue = Promise.resolve();

export function Preview({ id, material, store = "thumbs" }) {
  const target = useRef(null);
  const [url, setURL] = useState(null);
  useEffect(() => {
    let active = true;
    let objectURL;
    let visible = false;
    let queued = false;
    setURL(null);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible || queued) return;
      queued = true;
      const run = async () => {
        try {
          if (!active || !visible) return;
          let blob = await read(store, id);
          if (!blob && material && active && visible) {
            const data = await materialData(material);
            if (!active || !visible) return;
            blob = data.kind === "image" ? await canvasBlob(await imageCanvas(data.imageData)) : await coverFor(data);
            if (blob) {
              try { await write(store, id, blob); } catch { /* The thumbnail is still usable. */ }
            }
          }
          if (!active || !visible && !blob) return;
          observer.disconnect();
          if (!blob) return;
          objectURL = URL.createObjectURL(blob);
          setURL(objectURL);
        } finally {
          queued = false;
        }
      };
      if (material) thumbnailQueue = thumbnailQueue.then(run).catch(() => {});
      else void run().catch(() => {});
    }, { rootMargin: "32px" });
    observer.observe(target.current);
    return () => { active = false; observer.disconnect(); if (objectURL) URL.revokeObjectURL(objectURL); };
  }, [id, material, store]);
  return <span className="workspace-preview" ref={target}>{url ? <img src={url} alt="" /> : (material?.count ?? "◇")}</span>;
}

let legacyMigration;
export function Gallery({ Editor, readLegacy }) {
  const [projects, setProjects] = useState(null);
  const [opened, setOpened] = useState(null);
  const [error, setError] = useState("");
  const input = useRef(null);
  const refresh = async () => setProjects((await list("projects")).sort((a, b) => b.updated - a.updated));
  const run = async action => {
    setError("");
    try { await action(); } catch (err) { setError(err.message || "项目操作失败"); }
  };
  useEffect(() => {
    void run(async () => {
      legacyMigration ??= (async () => {
        if (await read("settings", "legacy-canvas")) return;
        const scene = await readLegacy();
        if (scene?.elements && !await read("projects", "legacy")) {
          await createProject("原有画布", scene, await coverFor(scene).catch(() => null), "legacy");
        }
        await write("settings", "legacy-canvas", true);
      })();
      await legacyMigration;
      await refresh();
    });
  }, []);
  const open = project => run(async () => setOpened({ ...project, scene: await read("scenes", project.id) }));
  const importProject = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await run(async () => {
      const data = JSON.parse(await file.text());
      const scene = data.type === "infinite-canvas-project" ? data.scene : data;
      if (!Array.isArray(scene?.elements) || ![undefined, "excalidraw", "infinite-canvas-project"].includes(data.type)) {
        throw new Error("请选择项目备份或 .excalidraw 文件。");
      }
      const project = await createProject(data.name || file.name.replace(/\.[^.]+$/, ""), scene);
      await open(project);
    });
  };
  if (opened) return <Editor key={opened.id} project={opened} onExit={async () => {
    setOpened(null);
    await run(refresh);
  }} />;
  return <main className="workspace-gallery">
    <header><div><h1>无限画布</h1><p>项目画廊</p></div><div className="workspace-actions">
      <button disabled={!projects} onClick={() => input.current.click()}>导入项目</button>
      <button disabled={!projects} onClick={() => run(async () => {
        const name = window.prompt("项目名称", "未命名画布")?.trim();
        if (name) await open(await createProject(name));
      })}>＋ 新建画布</button>
    </div></header>
    <input ref={input} type="file" hidden accept=".excalidraw,.json" onChange={importProject} />
    {error && <p role="alert">{error}</p>}
    {!projects ? <p>正在读取项目…</p> : projects.length === 0 ? <p>新建一张画布开始设计。</p> : null}
    <div className="workspace-projects">{projects?.map(project => <article key={project.id}>
      <button className="workspace-cover" onClick={() => open(project)}>
        <Preview id={project.id} store="covers" /><strong>{project.name}</strong>
        <small>{new Date(project.updated).toLocaleString()}</small>
      </button>
      <details><summary aria-label={`管理 ${project.name}`}>⋯</summary><div className="workspace-actions">
        <button onClick={() => run(async () => {
          const name = window.prompt("项目名称", project.name)?.trim();
          if (name && name !== project.name) { await write("projects", project.id, { ...project, name }); await refresh(); }
        })}>重命名</button>
        <button onClick={() => run(async () => {
          await createProject(project.name + " 副本", await read("scenes", project.id), await read("covers", project.id));
          await refresh();
        })}>复制</button>
        <button onClick={() => run(async () => {
          if (!window.confirm(`删除“${project.name}”？删除后可通过先前导出的项目备份恢复。`)) return;
          await deleteProject(project.id);
          await refresh();
        })}>删除</button>
      </div></details>
    </article>)}</div>
  </main>;
}
