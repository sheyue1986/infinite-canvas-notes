import { precisionCommands } from "./precision-shortcuts.js";
import { isModifierKey, validCanvasShortcut } from "../published-site/assets/drawing-tools.js";
import { shapeCommandRows } from "../published-site/assets/basic-shapes-r10.js";

const section = (group, entries) => entries.map(([id, zh, en, key = "", native, value]) => ({ id, zh, en, key, group, native, value }));

export const commands = [
  ...section("precision", precisionCommands),
  ...section("view", [
    ["stats", "精确属性面板", "Precision properties"],
    ["zoomIn", "放大一级", "Zoom in", "Ctrl+Equal"],
    ["zoomOut", "缩小一级", "Zoom out", "Ctrl+Minus"],
    ["resetZoom", "缩放至 100%", "Reset zoom", "Ctrl+Digit0"],
    ["zoomToFit", "适合全部内容", "Fit drawing", "Shift+Digit1"],
    ["zoomToFitSelection", "适合选区", "Fit selection", "Shift+Digit3"],
    ["zoomToFitSelectionInViewport", "在视口适配选区", "Fit selection in viewport", "Shift+Digit2"],
    ["viewMode", "只读模式", "View mode", "Alt+KeyR"],
    ["zenMode", "专注模式", "Zen mode", "Alt+KeyZ"],
    ["toggleTheme", "切换明暗主题", "Toggle theme", "Alt+Shift+KeyD"],
  ]),
  ...section("selection", [
    ["selectAll", "全选", "Select all", "Ctrl+KeyA"],
    ["selectAllElementsInFrame", "选择画框内对象", "Select frame contents"],
    ["removeAllElementsFromFrame", "将内容移出画框", "Remove contents from frame"],
    ["selectionFilters", "打开选区筛选", "Show selection filters"],
    ["moveSelection", "移动选区模式", "Move selection mode"],
    ["holdSelection", "长按选区", "Hold to select"],
    ["touchSelection", "手指选取", "Touch selection"],
    ["selectionPartial", "相交／完全包含", "Crossing / enclosed"],
    ["selectionLocked", "包含锁定对象", "Include locked objects"],
    ["selectionLayer", "全部／当前图层", "All / active layer"],
    ["selectLayerContents", "全选当前图层内容", "Select current layer contents"],
    ["selectionHighlight", "突出显示选区", "Highlight selection"],
    ["selectionRotate", "启用选区旋转", "Enable rotation"],
    ["selectionScale", "缩放／拉伸／关闭", "Scale / stretch / off"],
    ["rotateLeft", "逆时针旋转 15°", "Rotate left 15°"],
    ["rotateRight", "顺时针旋转 15°", "Rotate right 15°"],
    ["selectionGrow", "放大选区 10%", "Grow selection 10%"],
    ["selectionShrink", "缩小选区 10%", "Shrink selection 10%"],
    ["nudgeLeft", "向左微移", "Nudge left", "ArrowLeft"],
    ["nudgeRight", "向右微移", "Nudge right", "ArrowRight"],
    ["nudgeUp", "向上微移", "Nudge up", "ArrowUp"],
    ["nudgeDown", "向下微移", "Nudge down", "ArrowDown"],
    ["nudgeLeftFast", "向左快移", "Nudge left faster", "Shift+ArrowLeft"],
    ["nudgeRightFast", "向右快移", "Nudge right faster", "Shift+ArrowRight"],
    ["nudgeUpFast", "向上快移", "Nudge up faster", "Shift+ArrowUp"],
    ["nudgeDownFast", "向下快移", "Nudge down faster", "Shift+ArrowDown"],
  ]),
  ...section("edit", [
    ["undo", "撤销", "Undo", "Ctrl+KeyZ"],
    ["redo", "重做", "Redo", "Ctrl+Shift+KeyZ"],
    ["copy", "复制对象", "Copy objects", "Ctrl+KeyC"],
    ["cut", "剪切", "Cut", "Ctrl+KeyX"],
    ["paste", "粘贴", "Paste", "Ctrl+KeyV"],
    ["copyAsPng", "复制透明 PNG", "Copy transparent PNG", "Alt+Shift+KeyC"],
    ["copyAsSvg", "复制 SVG", "Copy SVG"],
    ["copyText", "复制文字", "Copy text"],
    ["copyStyles", "复制样式", "Copy style", "Ctrl+Alt+KeyC"],
    ["pasteStyles", "粘贴样式", "Paste style", "Ctrl+Alt+KeyV"],
    ["duplicateSelection", "创建副本", "Duplicate", "Ctrl+KeyD"],
    ["deleteSelectedElements", "删除选区", "Delete selection", "Delete"],
    ["group", "分组", "Group", "Ctrl+KeyG"],
    ["ungroup", "取消分组", "Ungroup", "Ctrl+Shift+KeyG"],
    ["toggleElementLock", "锁定／解锁", "Lock / unlock", "Ctrl+Shift+KeyL"],
    ["flipHorizontal", "水平翻转", "Flip horizontally", "Shift+KeyH"],
    ["flipVertical", "垂直翻转", "Flip vertically", "Shift+KeyV"],
    ["bringForward", "上移一层", "Bring forward", "Ctrl+BracketRight"],
    ["sendBackward", "下移一层", "Send backward", "Ctrl+BracketLeft"],
    ["bringToFront", "置于顶层", "Bring to front", "Ctrl+Shift+BracketRight"],
    ["sendToBack", "置于底层", "Send to back", "Ctrl+Shift+BracketLeft"],
    ["alignTop", "顶部对齐", "Align top", "Ctrl+Shift+ArrowUp"],
    ["alignBottom", "底部对齐", "Align bottom", "Ctrl+Shift+ArrowDown"],
    ["alignLeft", "左侧对齐", "Align left", "Ctrl+Shift+ArrowLeft"],
    ["alignRight", "右侧对齐", "Align right", "Ctrl+Shift+ArrowRight"],
    ["alignVerticallyCentered", "垂直居中对齐", "Align vertical centers"],
    ["alignHorizontallyCentered", "水平居中对齐", "Align horizontal centers"],
    ["distributeHorizontally", "水平分布", "Distribute horizontally", "Alt+KeyH"],
    ["distributeVertically", "垂直分布", "Distribute vertically", "Alt+KeyV"],
    ["bindText", "将文字绑定到对象", "Bind text to object"],
    ["unbindText", "解除文字绑定", "Unbind text"],
    ["wrapSelectionInFrame", "用画框包裹选区", "Wrap selection in frame"],
    ["decreaseFontSize", "减小字号", "Decrease font size", "Ctrl+Shift+Comma"],
    ["increaseFontSize", "增大字号", "Increase font size", "Ctrl+Shift+Period"],
    ["widthDown", "减小笔刷／橡皮大小", "Decrease brush / eraser size", "BracketLeft"],
    ["widthUp", "增大笔刷／橡皮大小", "Increase brush / eraser size", "BracketRight"],
  ]),
  ...section("style", [
    ["strokeSolid", "描边设为实线", "Solid stroke", "", "changeStrokeStyle", "solid"],
    ["strokeDashed", "描边设为虚线", "Dashed stroke", "", "changeStrokeStyle", "dashed"],
    ["strokeDotted", "描边设为点线", "Dotted stroke", "", "changeStrokeStyle", "dotted"],
    ["strokeThin", "描边设为细线", "Thin stroke", "", "changeStrokeWidth", 1],
    ["strokeMedium", "描边设为中线", "Medium stroke", "", "changeStrokeWidth", 2],
    ["strokeBold", "描边设为粗线", "Bold stroke", "", "changeStrokeWidth", 4],
    ["fillSolid", "使用纯色填充", "Solid fill", "", "changeFillStyle", "solid"],
    ["fillHachure", "使用斜线填充", "Hachure fill", "", "changeFillStyle", "hachure"],
    ["fillCrossHatch", "使用交叉线填充", "Cross-hatch fill", "", "changeFillStyle", "cross-hatch"],
    ["opacityFull", "不透明度 100%", "Opacity 100%", "", "changeOpacity", 100],
    ["opacityHalf", "不透明度 50%", "Opacity 50%", "", "changeOpacity", 50],
    ["opacityQuarter", "不透明度 25%", "Opacity 25%", "", "changeOpacity", 25],
  ]),
  ...section("shape", shapeCommandRows),
  ...section("library", [
    ["toggleLibrary", "打开／关闭素材库", "Toggle material library"],
    ["searchMaterials", "搜索素材", "Search materials"],
    ["addMaterialFolder", "新建素材文件夹", "New material folder"],
    ["saveMaterial", "将选区存为素材", "Save selection as material"],
    ["exportMaterials", "导出素材库", "Export material library"],
    ["importMaterials", "导入素材库", "Import material library"],
    ["importMaterialImages", "导入图片素材", "Import material images"],
    ["removeBackground", "图片去底", "Remove image background"],
    ["setCanvasBackground", "设置画布背景图", "Set canvas background image"],
    ["clearCanvasBackground", "移除画布背景图", "Remove canvas background image"],
    ["startRelationship", "建立对象关系", "Link canvas objects"],
    ["exportProject", "导出项目备份", "Export project backup"],
    ["exportScene", "导出 Excalidraw 文件", "Export Excalidraw drawing"],
    ["toggleLayers", "打开／关闭图层", "Toggle layers"],
    ["addLayer", "新建图层", "New layer"],
    ["focusLayer", "聚焦当前图层", "Focus current layer"],
    ["searchMenu", "搜索画布文字", "Find canvas text", "Ctrl+KeyF"],
    ["loadScene", "打开画布文件", "Open drawing", "Ctrl+KeyO"],
    ["saveToActiveFile", "保存画布", "Save drawing", "Ctrl+KeyS"],
    ["saveFileToDisk", "另存画布", "Save drawing as", "Ctrl+Shift+KeyS"],
  ]),
];

export const shortcutById = Object.fromEntries(commands.map((command) => [command.id, command]));

export function keyChord(event) {
  if (!event.code || isModifierKey(event)) return "";
  return [event.ctrlKey || event.metaKey ? "Ctrl" : "", event.altKey ? "Alt" : "", event.shiftKey ? "Shift" : "", event.code].filter(Boolean).join("+");
}

export function keyLabel(chord) {
  return chord.replace(/Key([A-Z])/g, "$1").replace(/Digit(\d)/g, "$1")
    .replace(/Arrow(Left|Right|Up|Down)/g, (_, direction) => ({ Left: "←", Right: "→", Up: "↑", Down: "↓" })[direction])
    .replace(/BracketLeft/g, "[").replace(/BracketRight/g, "]").replace(/Quote/g, "'")
    .replace(/Equal/g, "=").replace(/Minus/g, "−").replace(/Slash/g, "/")
    .replace(/Comma/g, ",").replace(/Period/g, ".");
}

export function readShortcuts() {
  try {
    const saved = JSON.parse(localStorage.getItem("icn-shortcuts-v1")) || {};
    return Object.fromEntries(Object.entries(saved).filter(([id, key]) => shortcutById[id] && validCanvasShortcut(shortcutById[id], key)));
  } catch {
    return {};
  }
}

export function assignedKey(command, bindings) {
  const assigned = bindings[command.id] ?? command.key;
  return validCanvasShortcut(command, assigned) ? assigned : "";
}

const nativeCommand = Symbol("canvas command");

export function installCommandBridge(api) {
  // registerAction is the public entry point. The action registry is specific to Excalidraw 0.18.
  let request;
  api.registerAction({
    name: "icnExecuteCommand",
    label: "Canvas command",
    trackEvent: false,
    viewMode: true,
    keyTest: (event) => Boolean(request = (event.nativeEvent || event)[nativeCommand]),
    perform: (_, state, _value, app) => {
      const { id, value } = request;
      const manager = app.actionManager;
      const action = manager?.actions[id];
      if (action && (!state.viewModeEnabled || action.viewMode) && manager.isActionEnabled(action)) {
        manager.executeAction(action, "api", value);
      }
      return false;
    },
  });
}

export function runNativeCommand(id, value = null) {
  const editor = document.querySelector(".canvas-shell > .excalidraw, .canvas-shell .excalidraw-container");
  if (!editor) return;
  if (id === "paste") editor.focus({ preventScroll: true });
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code: "Unidentified" });
  event[nativeCommand] = { id, value };
  editor.dispatchEvent(event);
}

export function isCommandEvent(event) {
  return Boolean(event[nativeCommand]);
}

export const commandGroups = {
  precision: ["精准工具", "Precision tools"],
  view: ["画布与视图", "Canvas & view"],
  selection: ["选区与变换", "Selection & transforms"],
  edit: ["编辑与排列", "Edit & arrange"],
  style: ["样式预设", "Style presets"],
  shape: ["更换形状", "Change shape"],
  library: ["素材与文件", "Materials & files"],
};
export const nativeAliases = {
  redo: ["Ctrl+KeyY"],
  deleteSelectedElements: ["Backspace"],
  zoomIn: ["Shift+Equal", "Ctrl+NumpadAdd", "Shift+NumpadAdd"],
  zoomOut: ["Shift+Minus", "Ctrl+NumpadSubtract", "Shift+NumpadSubtract"],
  resetZoom: ["Shift+Digit0", "Ctrl+Numpad0", "Shift+Numpad0"],
};
