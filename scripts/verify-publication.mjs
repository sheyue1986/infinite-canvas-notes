import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../published-site/', import.meta.url))); 
let checked = 0;
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await visit(file); continue; }
    if (!/\.(js|mjs|css)$/.test(file)) continue;
    const text = await readFile(file, 'utf8');
    const references = /(?:\bfrom\s*|\bimport\s*\(?\s*|new URL\(\s*)["'](\.\.?\/[^"']+)["']/g;
    for (const [, resource] of text.matchAll(references)) {
      const target = path.resolve(path.dirname(file), resource.split(/[?#]/)[0]);
      if (!target.startsWith(root + path.sep)) throw new Error('Resource escapes publication ' + resource);
      await stat(target).catch(() => { throw new Error(path.relative(root, file) + ' references missing ' + resource); });
      checked++;
    }
  }
}
await visit(root);
console.log(`Verified ${checked} local module and worker references.`);
