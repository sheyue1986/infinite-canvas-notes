import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { cp } from "node:fs/promises";
import { join } from "node:path";

const dashModule = fileURLToPath(new URL("./src/line-style.js", import.meta.url)).replaceAll("\\", "/");
const renderOutline = "return Om(vm(t,n))}function B1(";
const nativeDash = 'e.strokeStyle==="dashed"?Cm(e.strokeWidth):e.strokeStyle==="dotted"?k1(e.strokeWidth):void 0';
const excalidrawFonts = fileURLToPath(new URL("./node_modules/@excalidraw/excalidraw/dist/prod/fonts/", import.meta.url));

export default defineConfig(({ command }) => ({
  base: "./",
  resolve: { conditions: ["module", "browser", "production"] },
  optimizeDeps: { exclude: ["@excalidraw/excalidraw"] },
  plugins: [{
    name: "infinite-canvas-local-fonts",
    transformIndexHtml() {
      const assets = command === "build" ? "./" : "./node_modules/@excalidraw/excalidraw/dist/prod/";
      return [{
        tag: "script", injectTo: "head-prepend",
        children: `window.EXCALIDRAW_ASSET_PATH = new URL(${JSON.stringify(assets)}, document.baseURI).href;`,
      }];
    },
    async writeBundle({ dir }) {
      await cp(excalidrawFonts, join(dir, "fonts"), { recursive: true });
    },
  }, {
    name: "infinite-canvas-pressure-dashes",
    enforce: "pre",
    transform(source, id) {
      if (!/[/\\]@excalidraw[/\\]excalidraw[/\\]dist[/\\]prod[/\\]chunk-K2UTITRG\.js$/.test(id)) return;
      if (!source.includes(renderOutline) || !source.includes(nativeDash)) throw new Error("Excalidraw 0.18.1 dash integration no longer matches");
      // This outline is shared by the canvas renderer and SVG export.
      return 'import { dashPattern as infiniteDashPattern, splitStrokeDashes as infiniteSplitDashes } from ' + JSON.stringify(dashModule) + ';\n' +
        source.replace(renderOutline, 'if(e.strokeStyle==="dashed")return infiniteSplitDashes(t,e.strokeWidth,e.customData?.infiniteDashDensity).map(p=>Om(vm(p,{...n,last:true}))).join(" ");return Om(vm(t,n))}function B1(')
          .replace(nativeDash, 'e.strokeStyle==="dashed"&&Number.isFinite(e.customData?.infiniteDashDensity)?infiniteDashPattern(e.strokeWidth,e.customData.infiniteDashDensity,1.4):(' + nativeDash + ')');
    },
  }],
}));
