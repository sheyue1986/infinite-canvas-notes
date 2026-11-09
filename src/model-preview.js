import {
  Box3, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial,
  OrthographicCamera, PCFShadowMap, PerspectiveCamera, Plane, PlaneGeometry, Scene, ShadowMaterial, Vector3, Vector4, WebGLRenderer,
} from "three";
import { sunVector } from "./model-study.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function createModelPreview(element, onFrame) {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  element.append(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color("#f2f2f7");
  const holder = new Group();
  scene.add(holder);
  scene.add(new HemisphereLight(0xffffff, 0xbab6c8, 2));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 8, 5);
  scene.add(key);
  const clay = new MeshStandardMaterial({ color: "#e2dfeb", roughness: 0.9, side: 2 });
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.25, right: 1.25, top: 1.25, bottom: -1.25, near: 0.1, far: 16 });
  key.shadow.normalBias = 0.004;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.localClippingEnabled = true;
  const sectionPlane = new Plane();
  const sectionPlanes = [sectionPlane];
  let materials = new Set([clay]);
  let groups = [];
  let originalVisibility = new Map();
  let modelSize = new Vector3();
  let orientationGroup;
  let shadowsEnabled = false;
  let sunAltitude = 51;
  let twoPoint = false;
  const ground = new Mesh(new PlaneGeometry(20, 20), new ShadowMaterial({ opacity: 0.24, depthWrite: false }));
  ground.material.allowOverride = false;
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.visible = false;
  scene.add(ground);
  const perspective = new PerspectiveCamera(42, 1, 0.001, 400);
  const ortho = new OrthographicCamera(-1, 1, 1, -1, 0.001, 400);
  let camera = perspective;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.maxDistance = 100;
  let frame = 0;
  let fixedAspect = null;
  const render = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const start = performance.now();
      renderer.render(scene, camera);
      onFrame(performance.now() - start);
    });
  };
  controls.addEventListener("change", render);
  function updateProjection(aspect) {
    perspective.aspect = aspect;
    perspective.updateProjectionMatrix();
    ortho.left = -aspect;
    ortho.right = aspect;
    ortho.updateProjectionMatrix();
  }

  function projection(orthographic) {
    const next = orthographic ? ortho : perspective;
    if (camera === next) return;
    next.position.copy(camera.position);
    const distance = Math.max(0.001, next.position.distanceTo(controls.target));
    const halfFov = Math.tan(perspective.fov * Math.PI / 360);
    if (orthographic) ortho.zoom = 1 / (distance * halfFov);
    else next.position.sub(controls.target).normalize().multiplyScalar(1 / (ortho.zoom * halfFov)).add(controls.target);
    camera = next;
    controls.object = camera;
    camera.updateProjectionMatrix();
    controls.update();
    render();
  }

  function levelCamera(enabled, adjust = true) {
    if (enabled) projection(false);
    twoPoint = enabled;
    controls.minPolarAngle = enabled ? Math.PI / 2 : 0;
    controls.maxPolarAngle = enabled ? Math.PI / 2 : Math.PI;
    if (enabled && adjust) {
      const offset = camera.position.clone().sub(controls.target);
      if (Math.min(Math.abs(offset.x), Math.abs(offset.z)) < 0.03 * offset.length()) {
        let yaw = Math.atan2(offset.x, offset.z);
        yaw += Math.PI / 4;
        const distance = Math.max(0.1, offset.length());
        offset.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(distance);
        camera.position.copy(controls.target).add(offset);
      }
    }
    controls.update();
    render();
  }

  function updateShadow() {
    const enabled = shadowsEnabled && sunAltitude > 0;
    if (renderer.shadowMap.enabled === enabled) return;
    renderer.shadowMap.enabled = enabled;
    ground.visible = enabled;
    for (const material of materials) material.needsUpdate = true;
  }

  function guides() {
    camera.updateMatrixWorld();
    const vanishing = [[1, 0, 0], [0, 0, 1], [0, 1, 0]].map(axis => {
      const { x, y, w } = new Vector4(...axis, 0).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
      const scale = Math.max(Math.abs(x), Math.abs(y), Math.abs(w), 1e-9);
      return [(x + w) / (2 * scale), (w - y) / (2 * scale), w / scale];
    });
    return { vanishing };
  }

  function collectGroups(root) {
    if (Array.isArray(root.userData.layers) && root.userData.layers.length) {
      const found = new Map();
      for (const object of root.children) {
        const index = object.userData.attributes?.layerIndex;
        if (!Number.isInteger(index) || index < 0) continue;
        if (!found.has(index)) found.set(index, []);
        found.get(index).push(object);
      }
      if (found.size) return [...found].map(([index, objects]) => ({
        id: "layer:" + index, name: root.userData.layers[index]?.fullPath || root.userData.layers[index]?.name,
        visible: objects.some(object => object.visible), objects,
      }));
    }
    let parent = root;
    const path = [];
    while (!parent.geometry && parent.children.length === 1) {
      parent = parent.children[0];
      path.push(0);
    }
    const candidates = parent.geometry ? [parent] : parent.children;
    return candidates.flatMap((object, index) => {
      let renderable = false;
      object.traverse(child => { if (child.geometry) renderable = true; });
      return renderable ? [{ id: "node:" + [...path, index].join("."), name: typeof object.userData.name === "string" ? object.userData.name : object.name, visible: object.visible, objects: [object] }] : [];
    });
  }

  const resize = () => {
    const { clientWidth, clientHeight } = element;
    if (!clientWidth || !clientHeight) return;
    const aspect = fixedAspect ?? clientWidth / clientHeight;
    const width = Math.min(clientWidth, Math.round(clientHeight * aspect));
    const height = Math.min(clientHeight, Math.round(clientWidth / aspect));
    Object.assign(renderer.domElement.style, {
      width: width + "px", height: height + "px",
      left: (clientWidth - width) / 2 + "px", top: (clientHeight - height) / 2 + "px",
    });
    renderer.setSize(width, height, false);
    updateProjection(aspect);
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(element);

  function fit(axis = "orbit") {
    const direction = {
      orbit: [1, 0.75, 1.2], top: [0, 1, 0.00001], front: [0, 0, 1], side: [1, 0, 0],
    }[axis];
    levelCamera(false);
    projection(axis !== "orbit");
    const halfFov = Math.atan(Math.tan(perspective.fov * Math.PI / 360) * Math.min(1, perspective.aspect));
    ortho.zoom = Math.min(1, perspective.aspect) / 0.68;
    ortho.updateProjectionMatrix();
    camera.position.set(...direction).normalize().multiplyScalar(0.68 / Math.sin(halfFov));
    controls.target.set(0, 0, 0);
    controls.update();
    render();
  }

  function inspect(root) {
    root.updateMatrixWorld(true);
    const bounds = new Box3();
    const box = new Box3();
    let meshes = 0;
    let triangles = 0;
    root.traverseVisible(object => {
      if (!object.geometry?.attributes.position?.count) return;
      box.setFromObject(object);
      bounds.union(box);
      if (object.isMesh) {
        meshes++;
        const count = object.geometry.index?.count ?? object.geometry.attributes.position.count;
        triangles += Math.floor(count / 3) * (object.isInstancedMesh ? object.count : 1);
      }
    });
    const size = bounds.getSize(new Vector3());
    const extent = size.length();
    if (bounds.isEmpty() || !Number.isFinite(extent) || !extent) throw new Error("empty");
    return { size, extent, floor: bounds.min.y, center: bounds.getCenter(new Vector3()), meshes, triangles };
  }

  return {
    fit,
    show(root, up = "y") {
      if (root.parent === orientationGroup) for (const [object, visible] of originalVisibility) object.visible = visible;
      const oriented = new Group();
      oriented.rotation.x = up === "z" ? -Math.PI / 2 : 0;
      oriented.add(root);
      const { extent, center, floor, ...stats } = inspect(oriented);
      fixedAspect = null;
      holder.clear();
      holder.scale.setScalar(1 / extent);
      holder.position.copy(center).multiplyScalar(-1 / extent);
      holder.add(oriented);
      orientationGroup = oriented;
      groups = collectGroups(root);
      originalVisibility = new Map(groups.flatMap(group => group.objects.map(object => [object, object.visible])));
      modelSize.copy(stats.size).divideScalar(extent);
      materials = new Set([clay]);
      ground.position.y = (floor - center.y) / extent - 0.002;
      root.traverse(object => {
        if (object.isMesh) object.castShadow = object.receiveShadow = true;
        for (const material of [object.material].flat()) if (material) materials.add(material);
      });
      resize();
      fixedAspect = perspective.aspect;
      fit();
      return { ...stats, groups: groups.map(({ objects, ...group }) => group) };
    },
    projection(orthographic) {
      levelCamera(false);
      projection(orthographic);
    },
    levelCamera,
    study(study) {
      const { altitude, direction } = sunVector(study.sun);
      sunAltitude = altitude;
      key.position.set(...direction).multiplyScalar(8);
      key.intensity = altitude > 0 ? 2.2 : 0;
      const radius = Math.min(7, Math.max(1.25, 0.8 / Math.max(0.1, direction[1])));
      Object.assign(key.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius });
      key.shadow.camera.updateProjectionMatrix();
      updateShadow();

      for (const group of groups) {
        for (const object of group.objects) object.visible = study.visibility[group.id] ?? originalVisibility.get(object);
      }
      const { axis, position, enabled, reverse } = study.section;
      const sign = reverse ? 1 : -1;
      sectionPlane.normal.set(0, 0, 0);
      sectionPlane.normal[axis] = sign;
      sectionPlane.constant = -(position / 100 - 0.5) * modelSize[axis] * sign;
      const clipping = enabled ? sectionPlanes : null;
      for (const material of materials) {
        if (material.clippingPlanes === clipping) continue;
        material.clippingPlanes = clipping;
        material.clipShadows = enabled;
        material.needsUpdate = true;
      }
      render();
    },
    style(white) { scene.overrideMaterial = white ? clay : null; render(); },
    shadows(enabled) {
      shadowsEnabled = enabled;
      updateShadow();
      render();
    },
    fov(value) {
      perspective.fov = value;
      perspective.updateProjectionMatrix();
      render();
    },
    northImage() {
      if (!orientationGroup) return "";
      const top = new OrthographicCamera(-0.6, 0.6, 0.6, -0.6, 0.01, 10);
      top.position.set(0, 3, 0);
      top.up.set(0, 0, -1);
      top.lookAt(0, 0, 0);
      const ratio = renderer.getPixelRatio();
      try {
        renderer.setPixelRatio(1);
        renderer.setSize(144, 144, false);
        renderer.render(scene, top);
        return renderer.domElement.toDataURL("image/png");
      } finally {
        renderer.setPixelRatio(ratio);
        resize();
      }
    },
    cameraState() {
      return { orthographic: camera === ortho, position: camera.position.toArray(), target: controls.target.toArray(), zoom: camera.zoom, aspect: perspective.aspect, fov: perspective.fov, twoPoint };
    },
    restore(state) {
      if (!state || ![state.position, state.target].every(value =>
        Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)) ||
        !Number.isFinite(state.zoom) || state.zoom <= 0) return;
      if (Number.isFinite(state.aspect) && state.aspect >= 0.1 && state.aspect <= 10) {
        fixedAspect = state.aspect;
        resize();
      }
      if (Number.isFinite(state.fov)) perspective.fov = Math.min(120, Math.max(10, state.fov));
      perspective.updateProjectionMatrix();
      projection(state.orthographic === true);
      camera.position.fromArray(state.position);
      camera.zoom = state.zoom;
      camera.updateProjectionMatrix();
      controls.target.fromArray(state.target);
      levelCamera(state.twoPoint === true && !state.orthographic, false);
      controls.update();
      render();
    },
    capture() {
      const { clientWidth, clientHeight } = renderer.domElement;
      const multiplier = 2048 / Math.max(clientWidth, clientHeight);
      const width = Math.max(1, Math.round(clientWidth * multiplier));
      const height = Math.max(1, Math.round(clientHeight * multiplier));
      const pixelRatio = renderer.getPixelRatio();
      try {
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        renderer.render(scene, camera);
        const thumbnail = document.createElement("canvas");
        thumbnail.width = 112;
        thumbnail.height = Math.max(1, Math.round(112 * height / width));
        thumbnail.getContext("2d").drawImage(renderer.domElement, 0, 0, thumbnail.width, thumbnail.height);
        return {
          width, height, guide: guides(), dataURL: renderer.domElement.toDataURL("image/png"),
          thumbnail: thumbnail.toDataURL("image/webp", 0.75),
        };
      } finally {
        renderer.setPixelRatio(pixelRatio);
        resize();
      }
    },
    render,
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      clay.dispose();
      ground.geometry.dispose();
      ground.material.dispose();
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
