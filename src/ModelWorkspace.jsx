import React, { useEffect, useRef, useState } from "react";
import { disposeModel, loadModel } from "./model-import.js";
import ModelStudyControls from "./ModelStudyControls.jsx";
import { normalizeStudy } from "./model-study.js";
import { createModelPreview } from "./model-preview.js";

const messages = {
  oneModel: ["每次请选择一个模型，可同时选择其材质和贴图。", "Choose one model and optionally its material and texture files."],
  "windows-native": ["SKP 和 BLEND 需要 Windows 本机版及相应的建模软件。网页版可使用 GLB、glTF、OBJ 或 3DM。", "SKP and BLEND need the Windows app and the corresponding modeling software. The web app accepts GLB, glTF, OBJ or 3DM."],
  "sketchup-unavailable": ["未找到 SketchUp 2023 本机读取组件。可先在 SketchUp 中导出 OBJ 后导入。", "The local SketchUp 2023 reader was not found. Export an OBJ from SketchUp to import it."],
  "sketchup-conversion": ["无法读取此 SKP。请在 SketchUp 2023 中检查模型，或导出 OBJ 后导入。", "This SKP could not be read. Check it in SketchUp 2023 or export an OBJ."],
  duplicate: ["所选文件中有同名资源，请去除重复文件后重试。", "Selected resources contain duplicate file names."],
  size: ["本次导入的文件总大小超过 256 MB。", "The selected files exceed the 256 MB import limit."],
  unavailable: ["未找到本地 Blender 转换服务。请从任务栏打开本机版，或在 Blender 中导出 GLB。", "Local Blender conversion is unavailable. Open the installed app or export a GLB from Blender."],
  busy: ["Blender 正在处理另一个模型，请稍后重试。", "Blender is already converting another model. Try again shortly."],
  timeout: ["Blender 转换超时。请简化模型，或在 Blender 中导出 GLB。", "Blender conversion timed out. Simplify the model or export a GLB from Blender."],
  conversion: ["Blender 无法转换此文件。请用 Blender 打开检查，或另存为 GLB。", "Blender could not convert this file. Check it in Blender or export a GLB."],
  empty: ["未找到可显示的几何体。Rhino 曲面如缺少显示网格，请在 Rhino 中生成网格后重存。", "No visible geometry found. For Rhino surfaces without render meshes, generate meshes and save again."],
  missingAsset: ["部分配套资源缺失。请一并选取模型引用的 BIN、MTL 和贴图，或导出单文件 GLB。", "Some resources are missing. Include the referenced BIN, MTL and textures, or export a single GLB."],
  multipleMaterials: ["此 OBJ 引用了多个材质库，当前预览使用第一个。", "This OBJ references multiple material libraries. The preview uses the first."],
  rhinoGeometry: ["Rhino 报告部分对象或资源无法转换。请与原模型核对，必要时生成渲染网格并重新保存。", "Rhino reported objects or resources that could not be converted. Compare with the source and generate render meshes if needed."],
  blendAssets: ["若项目使用外链模型或贴图，请在 Blender 中打包资源或导出 GLB。", "For linked models or external textures, pack resources in Blender or export a GLB."],
  webgl: ["无法启动三维预览。请检查浏览器图形加速。", "3D preview could not start. Check browser graphics acceleration."],
  save: ["视角保存失败，请检查本地存储空间后重试。", "Could not save the view. Check local storage and try again."],
  invalid: ["无法读取模型。请检查文件是否完整，或重新导出 GLB。", "The model could not be read. Check the file or export a new GLB."],
};
const units = {
  Microns: "μm", Millimeters: "mm", Centimeters: "cm", Meters: "m", Kilometers: "km",
  Inches: "in", Feet: "ft", Yards: "yd", Miles: "mi",
};

export default function ModelWorkspace({ zh, onClose, droppedFiles, savedView, onSave, defaultName }) {
  const dialog = useRef(null);
  const input = useRef(null);
  const surface = useRef(null);
  const preview = useRef(null);
  const activeModel = useRef(null);
  const pending = useRef(null);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [white, setWhite] = useState(savedView?.white === true);
  const [shadows, setShadows] = useState(savedView?.shadows === true);
  const [study, setStudy] = useState(() => normalizeStudy(savedView?.study));
  const [panel, setPanel] = useState(null);
  const [fov, setFov] = useState(savedView?.camera?.fov ?? 42);
  const [northImage, setNorthImage] = useState("");
  const [twoPoint, setTwoPoint] = useState(savedView?.camera?.twoPoint === true);
  const [ortho, setOrtho] = useState(savedView?.camera?.orthographic === true);
  const [viewName, setViewName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [frameTime, setFrameTime] = useState(0);
  const [dragging, setDragging] = useState(false);
  const lastFrameTime = useRef(0);
  const t = (a, b) => zh ? a : b;
  const message = code => (messages[code] || messages.invalid)[zh ? 0 : 1];

  async function importFiles(files, restoreView) {
    if (!files.length || !preview.current || saving) return;
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    setError("");
    setLoading(true);
    const start = performance.now();
    let model;
    try {
      model = await loadModel(files, request.signal);
      request.signal.throwIfAborted();
      const nextStudy = normalizeStudy(restoreView?.study);
      const stats = preview.current.show(model.root, nextStudy.orientation);
      model.assetId = restoreView?.assetId;
      model.files = files;
      if (restoreView) preview.current.restore(restoreView.camera);
      setStudy(nextStudy);
      preview.current.study(nextStudy);
      setFov(preview.current.cameraState().fov);
      setNorthImage(preview.current.northImage());
      setTwoPoint(preview.current.cameraState().twoPoint);
      setOrtho(preview.current.cameraState().orthographic);
      if (activeModel.current) disposeModel(activeModel.current);
      activeModel.current = model;
      const update = () => {
        if (activeModel.current !== model || !preview.current) return;
        setInfo({ ...stats, name: model.name, format: model.format, units: model.units,
          warnings: [...model.warnings], seconds: (performance.now() - start) / 1000 });
        preview.current.render();
      };
      model.manager.onLoad = update;
      update();
    } catch (err) {
      if (model) disposeModel(model);
      if (!request.signal.aborted) setError(err.message);
    } finally {
      if (pending.current === request) {
        pending.current = null;
        setLoading(false);
      }
    }
  }

  async function saveView(event) {
    event.preventDefault();
    const model = activeModel.current;
    const name = viewName.trim();
    if (!model || !name || saving || loading) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        name, white, shadows, study, camera: preview.current.cameraState(), capture: preview.current.capture(),
        assetId: model.assetId, files: model.files,
      });
    } catch {
      setError("save");
    } finally {
      setSaving(false);
    }
  }

  const fit = axis => {
    preview.current.fit(axis);
    setTwoPoint(false);
    setOrtho(preview.current.cameraState().orthographic);
  };
  function changeStudy(value) {
    const next = normalizeStudy(value);
    if (next.orientation !== study.orientation && activeModel.current) {
      const camera = preview.current.cameraState();
      const stats = preview.current.show(activeModel.current.root, next.orientation);
      preview.current.restore(camera);
      setInfo(previous => ({ ...previous, ...stats }));
      setNorthImage(preview.current.northImage());
    }
    setStudy(next);
    preview.current.study(next);
  }

  const close = () => { if (!saving) onClose(); };

  useEffect(() => {
    const modal = dialog.current;
    modal.showModal();
    try {
      preview.current = createModelPreview(surface.current, ms => {
        const now = performance.now();
        if (now - lastFrameTime.current < 300) return;
        lastFrameTime.current = now;
        setFrameTime(ms);
      });
      preview.current.style(savedView?.white === true);
      preview.current.shadows(savedView?.shadows === true);
      if (droppedFiles?.length) void importFiles(droppedFiles, savedView);
    } catch {
      setError("webgl");
    }
    return () => {
      pending.current?.abort();
      pending.current = null;
      if (activeModel.current) disposeModel(activeModel.current);
      activeModel.current = null;
      preview.current?.dispose();
      preview.current = null;
      modal.close();
    };
  }, []);

  return <dialog className={"model-workspace" + (panel ? " has-study-panel" : "")} ref={dialog} aria-labelledby="model-title" onCancel={e => { e.preventDefault(); close(); }}
    onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); close(); } e.stopPropagation(); }}
    onDragOver={e => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
    onDrop={e => { e.preventDefault(); setDragging(false); void importFiles([...e.dataTransfer.files]); }}>
    <header className="model-header">
      <div className="model-heading">
        <h2 id="model-title">{t("三维模型预览", "3D model preview")}</h2>
        <span>{t("调整取景，保存后在底图上绘制草图", "Set the camera and save a view to sketch over")}</span>
      </div>
      <button type="button" className="model-close" aria-label={t("关闭三维预览", "Close 3D preview")} onClick={close} disabled={saving}>×</button>
    </header>
    <div className="model-tools">
      <button type="button" className="model-primary" disabled={saving} onClick={() => input.current.click()}>{t("选择模型", "Choose model")}</button>
      {info && <>
        <button type="button" onClick={() => fit()}>{t("适合窗口", "Fit")}</button>
        <button type="button" aria-expanded={Boolean(panel)} onClick={() => setPanel(panel ? null : "sun")}>
          {t("视图设置", "View settings")}
        </button>
      </>}
    </div>
    <div className="model-preview-layout">
    <div className={`model-surface ${dragging ? "is-dragging" : ""}`} ref={surface}>
      {(!info || loading || dragging) && <div className="model-empty">
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="m24 5 17 9.5v19L24 43 7 33.5v-19L24 5Zm0 19v19M7 14.5 24 24l17-9.5" />
        </svg>
        <strong role="status">{loading ? t("正在读取模型…", "Loading model…") : t("将模型拖到这里", "Drop a model here")}</strong>
        <span>SketchUp SKP · Rhino 3DM · Blender BLEND · GLB · glTF · OBJ</span>
        {loading && <button type="button" onClick={() => { pending.current?.abort(); setLoading(false); }}>{t("取消导入", "Cancel import")}</button>}
      </div>}
    </div>
      {info && panel && <aside className="model-settings">
        <div className="model-settings-header"><strong>{t("视图设置", "View settings")}</strong>
          <button type="button" onClick={() => setPanel(null)} aria-label={t("收起设置", "Close settings")}>×</button>
        </div>
        <div className="model-settings-tabs">
          {[["sun", t("日照", "Sun")], ["camera", t("取景", "Camera")], ["section", t("剖切", "Section")], ["groups", t("分组", "Groups")]].map(([key, label]) =>
            <button key={key} type="button" aria-pressed={panel === key} onClick={() => setPanel(key)}>{label}</button>)}
        </div>
        {panel === "camera" ? <section className="model-study-panel model-study-fields">
          <label>{t("投影与方向", "Projection and direction")}<select value={twoPoint ? "two" : ortho ? "ortho" : "orbit"}
            onChange={event => {
              const mode = event.target.value;
              if (mode === "two") preview.current.levelCamera(true);
              else preview.current.projection(mode === "ortho");
              setTwoPoint(mode === "two"); setOrtho(mode === "ortho");
            }}>
            <option value="orbit">{t("自由透视", "Orbit")}</option><option value="ortho">{t("正交", "Orthographic")}</option>
            <option value="two">{t("两点透视", "Two-point perspective")}</option>
          </select></label>
          <div className="model-settings-tabs">
            {[["top", t("顶视", "Top")], ["front", t("前视", "Front")], ["side", t("侧视", "Side")]].map(([axis, label]) =>
              <button type="button" key={axis} onClick={() => fit(axis)}>{label}</button>)}
          </div>
          <label className="model-study-check"><input type="checkbox" checked={white} onChange={event => {
            preview.current.style(event.target.checked); setWhite(event.target.checked);
          }} />{t("白模", "White model")}</label>
          <label>{t("视野角", "Field of view")} {fov}°<input type="range" min="10" max="120" step="1" value={fov}
            onChange={event => { const value = event.target.valueAsNumber; preview.current.fov(value); setFov(value); }} /></label>
          <div className="model-settings-tabs">{[50, 65, 90].map(value =>
            <button type="button" key={value} onClick={() => { preview.current.fov(value); setFov(value); }}>{value}°</button>)}</div>
          <label>{t("模型竖直轴", "Model up axis")}<select value={study.orientation}
            onChange={event => changeStudy({ ...study, orientation: event.target.value })}><option value="y">Y ↑</option><option value="z">Z ↑</option></select></label>
        </section> : <ModelStudyControls panel={panel} study={study} groups={info.groups} change={changeStudy} zh={zh}
          northImage={northImage} shadows={shadows} setShadows={enabled => { preview.current.shadows(enabled); setShadows(enabled); }} />}
      </aside>}
    </div>
    <footer className="model-footer">
      {error && <div className="model-warning" role="alert">{message(error)}</div>}
      {info ? <>
        <form className="model-save-view" onSubmit={saveView}>
          <input aria-label={t("视角名称", "View name")} value={viewName} maxLength={80}
            onChange={event => setViewName(event.target.value)} disabled={saving} />
          <button className="model-primary" disabled={loading || saving || !viewName.trim()}>
            {saving ? t("正在保存…", "Saving…") : t("保存视角并绘图", "Save view and sketch")}
          </button>
        </form>
        <div className="model-info">
          <strong title={info.name}>{info.name}</strong><span>{info.format.toUpperCase()}</span>
          <span>{t("尺寸", "Size")} {info.size.toArray().map(n => Number(n.toPrecision(4))).join(" × ")} {units[info.units] || info.units || t("模型单位", "model units")}</span>
          <span>{info.meshes.toLocaleString()} {t("个网格", "meshes")} · {info.triangles.toLocaleString()} {t("个三角面", "triangles")}</span>
          <span>{t("导入", "Import")} {info.seconds.toFixed(2)} s · {t("渲染提交", "Render submit")} {frameTime.toFixed(1)} ms</span>
        </div>
        {info.warnings.map(code => <div key={code} className="model-warning">{message(code)}</div>)}
        <div>{t("左键旋转 · 右键平移 · 滚轮缩放", "Left drag to orbit · Right drag to pan · Scroll to zoom")}
          {twoPoint && t(" · 保存后可在主菜单设置透视辅助线与方向吸附", " · Set perspective guides and snapping in the sketch menu after saving")}
        </div>
      </> : <div>{t("支持 SketchUp 2023 原生 SKP。OBJ 可连同 MTL 和贴图一起选取。", "SketchUp 2023 SKP supported. Select the MTL and textures alongside an OBJ.")}</div>}
    </footer>
    <input type="file" ref={input} hidden multiple
      accept=".glb,.gltf,.obj,.mtl,.3dm,.blend,.skp,.bin,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tga,.ktx2"
      onChange={e => { void importFiles([...e.target.files]); e.target.value = ""; }} />
  </dialog>;
}
