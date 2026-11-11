import { handwriting } from "./diagram-data.js";

export function placeStickyNote(event, api, scenePoint, convert, capture, kit, canDraw, zh) {
  if (!api || kit.active?.id !== "stickyNote" || event.button !== 0 || !event.isPrimary) return false;
  const state = api.getAppState();
  if (state.viewModeEnabled || state.openDialog) return false;
  event.preventDefault();
  event.stopPropagation();
  if (!canDraw({ ...state, activeTool: { ...state.activeTool, type: "rectangle" } })) return true;
  const point = scenePoint(event, api);
  const elements = convert([{
    type: "rectangle", ...point, width: 180, height: 140,
    backgroundColor: "#fff3a3", fillStyle: "solid", strokeColor: "#aa8439", strokeWidth: 1, roughness: 0,
    label: { text: zh ? "便签" : "Note", fontFamily: handwriting, fontSize: 21, strokeColor: "#282438" },
  }]);
  kit.activateById("select");
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...elements],
    appState: {
      selectedElementIds: { [elements[0].id]: true }, selectedGroupIds: {}, showHyperlinkPopup: false,
    },
    captureUpdate: capture,
  });
  event.target.closest(".excalidraw")?.focus({ preventScroll: true });
  return true;
}
