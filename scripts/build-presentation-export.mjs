import { rolldown } from "rolldown";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const file = path => fileURLToPath(new URL(path, import.meta.url));
const notices = await Promise.all([
  "../node_modules/pdf-lib/LICENSE.md",
  "../node_modules/pptxgenjs/LICENSE",
  "../node_modules/jszip/LICENSE.markdown",
].map(path => readFile(file(path), "utf8")));
const banner = "/*!\n" + notices.join("\n\n").replaceAll("*/", "* /") + "\n*/";
const build = await rolldown({
  input: file("../src/presentation-export.js"),
  platform: "browser",
});
try {
  await build.write({ file: file("../published-site/assets/presentation-export.js"), format: "es", codeSplitting: false, minify: true, banner });
} finally {
  await build.close();
}
