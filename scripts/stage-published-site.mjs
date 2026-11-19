import { cp, readFile, stat } from "node:fs/promises";

const source = new URL("../published-site/", import.meta.url);
const output = new URL("../dist/", import.meta.url);
const index = await readFile(new URL("index.html", source), "utf8");
if (!index.includes('src="./assets/index-icn-selection-r15.js"')) {
  throw new Error("The current publication bundle (r15 selection build) is missing.");
}
const required = [
  // Entry bundle and stylesheets referenced directly by index.html.
  "index-icn-selection-r15.js", "index-icn-local-021.js", "index-icn-local-021.css", "index-m-qtGE-1.js",
  "workspace-sidebar.css", "ai-generation-r9.css", "shape-controls-r9.css", "canvas-workflow.css",
  "area-fill.css", "selection-properties.css", "export-hub.css",
  // Workspace, tools and panels loaded on demand by the running application.
  "workspace-sidebar-r10.js", "workspace-sidebar-pdf.js", "drawing-tools-r10.js", "drawing-tools.js",
  "basic-shapes-r10.js", "basic-shapes-union.js", "shape-controls-r10.js", "shape-controls-r9.css",
  "diagram-data.js", "diagram-editor-r4.js", "diagram-editor-r4.css", "sticky-note.js", "shortcut-transfer.js",
  "ai-generation-r10.js", "mcp-tools.js", "wireframe-prototype.js",
  "canvas-media.js", "canvas-presentations.js", "presentation-export.js",
  "area-fill-ui.js", "area-fill-union-ui.js", "bucket-fill-r11.js", "bucket-fill-union.js",
  "line-vertices.js", "precision-stroke.js",
  // Selection properties, boolean geometry and the export hub added after r14.
  "selection-properties.js", "object-property-ring.js", "boolean-geometry.js", "property-icons.js",
  "canvas-activity.js", "polygon-clipping.js", "tool-preferences.js",
  // Image tracing and the PDF/CAD/PSD export toolchain.
  "image-to-lines.js", "image-trace-worker.js", "trace-cleanup.js",
  "export-hub.js", "export-dxf.js", "export-dxf-writer.js", "export-psd.js",
  "pdf-lib.js", "pdf-export-regions.js",
  // PDF rendering engine (vendored pdf.js distribution).
  "pdfjs/pdf.js", "pdfjs/pdf.worker.js",
];
for (const asset of required) {
  let file;
  try {
    file = await stat(new URL("assets/" + asset, source));
  } catch {
    // index-icn-local-021.js is the pre-r15 entry bundle and is not present in
    // every publication snapshot; every other asset is mandatory.
    if (asset === "index-icn-local-021.js") continue;
    throw new Error("Missing publication asset: " + asset);
  }
  if (!file.isFile() || !file.size) throw new Error("Invalid publication asset: " + asset);
}
await cp(source, output, { recursive: true });
