import { CaptureUpdateAction, convertToExcalidrawElements, newElementWith } from "@excalidraw/excalidraw";
import { createBucketFill } from "../published-site/assets/bucket-fill-r11.js";
import { hexColor } from "./colors.jsx";
import { withElementOpacity } from "./layers.jsx";
import { readFillPaint } from "./closed-fill.js";

export const fillAt = createBucketFill({
  convertToExcalidrawElements, newElementWith, capture: CaptureUpdateAction.IMMEDIATELY,
  hexColor, withElementOpacity, readFillPaint,
});
