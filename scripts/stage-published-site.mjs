import { cp, readFile, stat } from "node:fs/promises";

const source = new URL("../published-site/", import.meta.url);
const output = new URL("../dist/", import.meta.url);
const index = await readFile(new URL("index.html", source), "utf8");
if (!index.includes('src="./assets/index-icn-local-021-r10.js"')) {
  throw new Error("The desktop 0.2.1 publication bundle is missing.");
}
const required = [
  "index-icn-local-021-r10.js", "index-icn-local-021.css", "workspace-sidebar-r10.js", "workspace-sidebar.css",
  "drawing-tools-r10.js", "drawing-tools.js", "basic-shapes-r10.js", "shape-controls-r10.js", "shape-controls-r9.css",
  "diagram-data.js", "diagram-editor-r4.js", "diagram-editor-r4.css", "sticky-note.js", "shortcut-transfer.js",
  "ai-generation-r10.js", "ai-generation-r9.css", "mcp-tools.js", "wireframe-prototype.js",
  "canvas-media.js", "canvas-presentations.js", "canvas-workflow.css", "presentation-export.js",
];
for (const asset of required) {
  const file = await stat(new URL("assets/" + asset, source));
  if (!file.isFile() || !file.size) throw new Error("Invalid publication asset: " + asset);
}
await cp(source, output, { recursive: true });
