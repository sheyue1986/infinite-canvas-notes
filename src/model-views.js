import { convertToExcalidrawElements, exportToBlob } from "@excalidraw/excalidraw";
import { read } from "./storage.js";

const bottomLayer = "model-underlay";
const sketchLayer = "layer-base";

export function makeModelScene(view, capture, zh) {
  const fileId = crypto.randomUUID();
  const underlay = {
    id: view.underlayId,
    type: "image",
    x: 0,
    y: 0,
    width: 850,
    height: 850 * capture.height / capture.width,
    fileId,
    status: "saved",
    locked: true,
    customData: { infiniteLayer: bottomLayer },
  };
  return {
    elements: convertToExcalidrawElements([underlay], { regenerateIds: false }),
    files: { [fileId]: { id: fileId, dataURL: capture.dataURL, mimeType: "image/png", created: Date.now() } },
    appState: { viewBackgroundColor: "#f2f2f7" },
    scrollToContent: true,
    layers: {
      active: sketchLayer, mode: "manual", focus: null,
      items: [
        { id: bottomLayer, name: zh ? "三维底图" : "3D underlay", visible: true, locked: true, opacity: 100 },
        { id: sketchLayer, name: zh ? "草图 1" : "Sketch 1", visible: true, locked: false, opacity: 100 },
      ],
    },
  };
}

export async function modelProjectData(project) {
  const views = await Promise.all((project.modelViews || []).map(async view => ({
    ...view, scene: await read("scenes", [project.id, view.id]),
  })));
  const assets = await Promise.all([...new Set(views.map(view => view.assetId).filter(Boolean))].map(async id => ({
    id, files: await read("modelAssets", [project.id, id]),
  })));
  if (views.some(view => !view.scene) || assets.some(asset => !asset.files)) {
    throw new Error("项目缺少三维视角或模型文件。");
  }
  return { views, assets };
}

const fileData = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

export async function packModelProject(project) {
  const { views, assets } = await modelProjectData(project);
  return {
    views,
    assets: await Promise.all(assets.map(async asset => ({
      id: asset.id,
      files: await Promise.all(asset.files.map(async file => ({
        name: file.name, type: file.type, data: await fileData(file),
      }))),
    }))),
  };
}

export async function unpackModelProject(model) {
  if (!model) return {};
  if (!Array.isArray(model.assets) || !Array.isArray(model.views)) throw new Error("三维项目备份格式有误。");
  const assets = new Map();
  for (const asset of model.assets) {
    if (typeof asset?.id !== "string" || assets.has(asset.id) || !Array.isArray(asset.files) || !asset.files.length) {
      throw new Error("三维项目备份包含无效的模型资料。");
    }
    const files = [];
    for (const file of asset.files) {
      if (typeof file?.name !== "string" || !/^data:[^,]*;base64,/.test(file.data)) {
        throw new Error("三维项目备份包含无效的模型文件。");
      }
      const blob = await (await fetch(file.data)).blob();
      files.push(new File([blob], file.name, { type: file.type || blob.type }));
    }
    assets.set(asset.id, { id: asset.id, files });
  }
  const ids = new Set();
  for (const view of model.views) {
    if (typeof view?.id !== "string" || ids.has(view.id) || typeof view.name !== "string" ||
        !Array.isArray(view.scene?.elements) || (view.assetId != null && (!assets.has(view.assetId) ||
        !view.scene.elements.some(element => element.id === view.underlayId && element.type === "image")))) {
      throw new Error("三维项目备份包含无效的视角。");
    }
    ids.add(view.id);
  }
  return { views: model.views, assets: [...assets.values()] };
}

export async function exportViewPng(scene, view, transparent) {
  const elements = scene.elements.filter(element => !element.isDeleted && element.opacity > 0);
  const underlay = scene.elements.find(element => element.id === view.underlayId && !element.isDeleted);
  const sketch = elements.filter(element => element.id !== view.underlayId);
  if (!underlay && !sketch.length) throw new Error("此视角没有可导出的内容。");
  const options = {
    files: scene.files,
    appState: { ...scene.appState, exportBackground: !transparent },
    getDimensions(width, height) {
      const scale = Math.min(2, 4096 / Math.max(width, height));
      return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scale };
    },
    mimeType: "image/png",
  };
  // Keep the original framing even when the underlay is hidden or omitted.
  const image = underlay && (transparent ? { ...underlay, opacity: 0 } : underlay);
  return exportToBlob({ ...options, elements: image ? [image, ...sketch] : sketch });
}
