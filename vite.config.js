import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { cp } from "node:fs/promises";
import { join } from "node:path";

const dashModule = fileURLToPath(new URL("./src/line-style.js", import.meta.url)).replaceAll("\\", "/");
const shapeModule = fileURLToPath(new URL("./published-site/assets/basic-shapes-r10.js", import.meta.url)).replaceAll("\\", "/");
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
  }, {
    name: "infinite-canvas-basic-shapes",
    enforce: "pre",
    transform(source, id) {
      if (!/[/\\]@excalidraw[/\\]excalidraw[/\\]dist[/\\]prod[/\\]chunk-K2UTITRG\.js$/.test(id)) return;
      const replacements = [
        ['case"rectangle":case"iframe":case"embeddable":{let i;if(e.roundness)',
          'case"rectangle":case"iframe":case"embeddable":{const path=customShapePath(e);if(path)return t.path(path,rt(X1(e,n,o),!0));let i;if(e.roundness)'],
        ['function Qo(e,t=0){', 'function Qo(e,t=0){const outline=customShapeSegments(e,t);if(outline)return[outline,[]];'],
        ['var Zo=e=>{let{angle:t,width:n,height:r,x:o,y:i}=e,a=o+n/2,s=i+r/2,d=u(a,s),c;',
          'var Zo=e=>{let{angle:t,width:n,height:r,x:o,y:i}=e,a=o+n/2,s=i+r/2,d=u(a,s),c;const outline=customShapePoints(e);if(outline)return{type:"polygon",data:Qi(...outline.map(([x,y])=>T(u(x+o,y+i),d,t)))};'],
        ['m=u(r.x+U[0]*r.width,r.y+U[1]*r.height),b=T(m,p,r.angle)',
          'm=customArrowAnchor(r,U,5)??u(r.x+U[0]*r.width,r.y+U[1]*r.height),b=T(m,p,r.angle)'],
      ];
      for (const [before, after] of replacements) {
        if (source.split(before).length !== 2) throw new Error("Excalidraw 0.18.1 shape integration no longer matches");
        source = source.replace(before, after);
      }
      return "import { customShapePath, customShapeSegments, customShapePoints, customArrowAnchor, registerBasicShapeBindings } from " +
        JSON.stringify(shapeModule) + ";\n" + source + "\nregisterBasicShapeBindings(Jt, _n);";
    },
  }],
}));
