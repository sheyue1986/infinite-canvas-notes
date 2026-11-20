import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cp, readFile, stat } from 'node:fs/promises';

const source = new URL('../published-site/', import.meta.url);
const args = process.argv.slice(2);
const option = args.indexOf('--outDir');
if (option >= 0 && !args[option + 1]) throw new Error('--outDir requires a directory');

const project = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const destination = path.resolve(project, option >= 0 ? args[option + 1] : 'dist');
if (!destination.startsWith(project + path.sep) || destination === path.resolve(fileURLToPath(source))) {
  throw new Error('Build output must be a separate directory inside this project');
}
const output = pathToFileURL(destination + path.sep);
const index = await readFile(new URL('index.html', source), 'utf8');
if (!index.includes('src="./assets/index-icn-selection-r15.js"')) {
  throw new Error('The current application entry is missing.');
}
for (const [, name] of index.matchAll(/(?:src|href)="\.\/([^"#?]+)/g)) {
  const file = await stat(new URL(name, source));
  if (!file.isFile() || !file.size) throw new Error('Missing publication resource ' + name);
}
await cp(source, output, { recursive: true });
