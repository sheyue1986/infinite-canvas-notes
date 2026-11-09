import { LoadingManager } from "three";
import rhinoScript from "rhino3dm/rhino3dm.js?url";
import rhinoWasm from "rhino3dm/rhino3dm.wasm?url";

const modelExtensions = /\.(glb|gltf|obj|3dm|blend|skp)$/i;
const localAssets = "https://model.invalid/";

export async function loadModel(files, signal) {
  const models = files.filter(file => modelExtensions.test(file.name));
  if (models.length !== 1) throw new Error("oneModel");
  const file = models[0];
  const format = file.name.split(".").at(-1).toLowerCase();

  if (files.reduce((bytes, item) => bytes + item.size, 0) > 256 * 1024 ** 2) throw new Error("size");

  const warnings = new Set();
  const urls = new Map();
  const runtime = new Map([
    [localAssets + "rhino3dm.js", new URL(rhinoScript, document.baseURI).href],
    [localAssets + "rhino3dm.wasm", new URL(rhinoWasm, document.baseURI).href],
  ]);
  const available = new Map();
  for (const item of files) {
    const name = item.name.toLowerCase();
    if (available.has(name)) throw new Error("duplicate");
    available.set(name, item);
  }
  const manager = new LoadingManager();
  manager.setURLModifier(url => {
    if (runtime.has(url) && format === "3dm") return runtime.get(url);
    if (/^(blob|data):/.test(url)) return url;
    const name = decodeURIComponent(url.split(/[\\/]/).at(-1)).toLowerCase();
    const asset = available.get(name);
    if (!asset) {
      warnings.add("missingAsset");
      return "data:application/octet-stream,";
    }
    if (!urls.has(asset)) urls.set(asset, URL.createObjectURL(asset));
    return urls.get(asset);
  });
  const release = () => {
    for (const url of urls.values()) URL.revokeObjectURL(url);
    urls.clear();
  };

  try {
    let root;
    let units;
    if (format === "3dm") {
      const { Rhino3dmLoader } = await import("three/addons/loaders/3DMLoader.js");
      const loader = new Rhino3dmLoader(manager).setLibraryPath(localAssets).setWorkerLimit(1);
      // The loader disposes its worker; an aborted decode must also release the awaiting task.
      try {
        const bytes = await file.arrayBuffer();
        signal.throwIfAborted();
        let abort;
        try {
          const canceled = new Promise((_, reject) => {
            abort = () => reject(signal.reason);
            signal.addEventListener("abort", abort, { once: true });
          });
          root = await Promise.race([loader.parseAsync(bytes), canceled]);
        } finally {
          signal.removeEventListener("abort", abort);
        }
        root.rotation.x = -Math.PI / 2;
        const unit = root.userData.settings?.modelUnitSystem;
        units = (unit?.name ?? (typeof unit === "string" ? unit : "")).replace(/^UnitSystem_/, "");
        if (root.userData.warnings?.length) warnings.add("rhinoGeometry");
      } finally {
        loader.dispose();
      }
    } else if (format === "obj") {
      const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");
      const loader = new OBJLoader(manager);
      const geometry = await file.text();
      const names = [...geometry.matchAll(/^\s*mtllib\s+(.+)$/gm)].map(match => match[1].trim());
      if (names.length > 1) warnings.add("multipleMaterials");
      if (names.length) {
        const material = available.get(names[0].split(/[\\/]/).at(-1).toLowerCase());
        if (material) {
          const { MTLLoader } = await import("three/addons/loaders/MTLLoader.js");
          loader.setMaterials(new MTLLoader(manager).parse(await material.text(), localAssets));
        } else warnings.add("missingAsset");
      }
      root = loader.parse(geometry);
    } else {
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      let data;
      let metersPerUnit = 1;
      if (format === "blend" || format === "skp") {
        if (location.origin !== "http://127.0.0.1:4173") throw new Error("windows-native");
        const response = await fetch(format === "skp" ? "/api/models/sketchup" : "/api/models/blender", {
          method: "POST", signal,
          headers: { "Content-Type": "application/octet-stream", "X-Infinite-Canvas-Import": format },
          body: file,
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const code = error.code || "unavailable";
          throw new Error(format === "skp" && ["unavailable", "conversion"].includes(code) ? "sketchup-" + code : code);
        }
        metersPerUnit = Number(response.headers.get("X-Infinite-Canvas-Meters-Per-Unit")) || 1;
        data = await response.arrayBuffer();
        if (format === "blend") warnings.add("blendAssets");
      } else data = await file.arrayBuffer();
      root = (await new GLTFLoader(manager).parseAsync(data, localAssets)).scene;
      root.scale.multiplyScalar(metersPerUnit);
      units = "Meters";
    }
    return { root, name: file.name, warnings, format, units, manager, release };
  } catch (error) {
    release();
    if (warnings.has("missingAsset")) throw new Error("missingAsset");
    throw error;
  }
}

export function disposeModel({ root, release }) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat()) if (material) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    material.dispose();
  }
  const images = new Set();
  for (const texture of textures) {
    if (texture.source?.data instanceof ImageBitmap) images.add(texture.source.data);
    texture.dispose();
  }
  for (const image of images) image.close();
  for (const geometry of geometries) geometry.dispose();
  release();
}
