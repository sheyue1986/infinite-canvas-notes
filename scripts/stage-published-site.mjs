import { cp, readFile } from "node:fs/promises";

const source = new URL("../published-site/", import.meta.url);
const output = new URL("../dist/", import.meta.url);
const index = await readFile(new URL("index.html", source), "utf8");
if (!index.includes('src="./assets/index-icn-local-021-r2.js"')) {
  throw new Error("The desktop 0.2.1 publication bundle is missing.");
}
await cp(source, output, { recursive: true });
