let connection;
export function database() {
  return connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("infinite-canvas-workspace", 1);
    request.onupgradeneeded = () => {
      for (const name of ["index", "content", "thumbs", "settings", "projects", "scenes", "covers"]) {
        request.result.createObjectStore(name);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  }).catch(error => {
    connection = undefined;
    throw error;
  });
}

export async function transact(names, mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode);
    let result;
    tx.oncomplete = () => resolve(result?.result);
    tx.onabort = () => reject(tx.error || new Error("Storage transaction aborted"));
    try {
      result = action(name => tx.objectStore(name));
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}

export const read = (store, key) => transact([store], "readonly", get => get(store).get(key));
export const list = store => transact([store], "readonly", get => get(store).getAll());
export const write = (store, key, value) => transact([store], "readwrite", get => get(store).put(value, key));

export const emptyLibrary = () => ({ folders: [], objects: [] });
const pending = new Map();

export function packMaterial(object) {
  const { id, name, kind, elements, files, imageData, width, height } = object;
  if (typeof id !== "string" || typeof name !== "string" ||
      (kind === "image" ? typeof imageData !== "string" || !(width > 0 && height > 0) : !Array.isArray(elements) || !elements.length)) {
    throw new Error("Invalid material");
  }
  const contentId = crypto.randomUUID();
  pending.set(contentId, { elements, files, imageData, width, height });
  return { id, name, kind, contentId, count: elements?.length ?? 1, favorite: object.favorite === true,
    tags: Array.isArray(object.tags) ? object.tags.filter(tag => typeof tag === "string") : [] };
}

export function packLibrary(folder) {
  if (!Array.isArray(folder?.folders) || !Array.isArray(folder?.objects)) throw new Error("Invalid folder");
  return {
    id: folder.id, name: folder.name, favorite: folder.favorite === true,
    description: typeof folder.description === "string" ? folder.description : "",
    folders: folder.folders.map(child => {
      if (typeof child.id !== "string" || typeof child.name !== "string") throw new Error("Invalid folder");
      return packLibrary(child);
    }),
    objects: folder.objects.map(packMaterial),
  };
}

function flatten(root) {
  const result = new Map();
  const add = row => {
    if (result.has(row.key)) throw new Error("Duplicate library entry");
    result.set(row.key, row);
  };
  const visit = (folder, parent, order) => {
    const key = parent === null ? "root" : "folder:" + folder.id;
    add({ key, parent, order, type: "folder", id: folder.id, name: folder.name,
      favorite: folder.favorite, description: folder.description });
    folder.folders.forEach((child, index) => visit(child, key, index));
    folder.objects.forEach((object, index) =>
      add({ key: "object:" + object.id, parent: key, order: index, type: "object", object }));
  };
  visit(root, null, 0);
  return result;
}

export async function loadLibrary() {
  const rows = await list("index");
  const folders = new Map(rows.filter(row => row.type === "folder").map(row =>
    [row.key, { id: row.id, name: row.name, favorite: row.favorite, description: row.description, ...emptyLibrary() }]));
  for (const row of rows.sort((a, b) => a.order - b.order)) {
    if (row.parent === null) continue;
    const parent = folders.get(row.parent);
    if (!parent) throw new Error("Missing material folder");
    if (row.type === "folder") parent.folders.push(folders.get(row.key));
    else parent.objects.push(row.object);
  }
  return folders.get("root");
}

export async function saveLibrary(before, after) {
  const old = before ? flatten(before) : new Map();
  const next = flatten(after);
  const contents = new Set([...next.values()].flatMap(row => row.object ? [row.object.contentId] : []));
  await transact(["index", "content", "thumbs"], "readwrite", get => {
    for (const [key, row] of next) {
      if (JSON.stringify(old.get(key)) !== JSON.stringify(row)) get("index").put(row, key);
    }
    for (const [key, row] of old) {
      if (!next.has(key)) get("index").delete(key);
      if (row.object && !contents.has(row.object.contentId)) {
        get("content").delete(row.object.contentId);
        get("thumbs").delete(row.object.contentId);
      }
    }
    for (const id of contents) {
      if (pending.has(id)) get("content").put(pending.get(id), id);
    }
  });
  for (const id of contents) pending.delete(id);
}

export async function materialData(object) {
  const data = pending.get(object.contentId) || await read("content", object.contentId);
  if (!data) throw new Error("Missing material data");
  const { contentId, count, ...info } = object;
  return { ...info, ...data };
}

export async function exportTree(folder) {
  const [folders, objects] = await Promise.all([
    Promise.all(folder.folders.map(exportTree)),
    Promise.all(folder.objects.map(materialData)),
  ]);
  return { ...folder, folders, objects };
}

export async function saveProjectScene(id, scene) {
  await transact(["projects", "scenes"], "readwrite", get => {
    const projects = get("projects");
    const request = projects.get(id);
    request.onsuccess = () => {
      if (!request.result) return;
      projects.put({ ...request.result, updated: Date.now() }, id);
      get("scenes").put(scene, id);
    };
  });
}

export function createProject(name, scene, cover, id = crypto.randomUUID()) {
  const project = { id, name, updated: Date.now() };
  return transact(["projects", "scenes", "covers"], "readwrite", get => {
    get("projects").add(project, id);
    if (scene) get("scenes").put(scene, id);
    if (cover) get("covers").put(cover, id);
  }).then(() => project);
}

export function deleteProject(id) {
  return transact(["projects", "scenes", "covers"], "readwrite", get => {
    for (const name of ["projects", "scenes", "covers"]) get(name).delete(id);
  });
}
