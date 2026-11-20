import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createToolPreferences } from '../../published-site/assets/tool-preferences.js';

let writes = 0;
let stored = '{}';
globalThis.localStorage = { getItem: () => stored, setItem: (_, value) => { writes++; stored = value; } };
const preferences = createToolPreferences();
const elements = Array.from({ length: 1000 }, (_, id) => ({ id, type: 'rectangle' }));
const start = performance.now();
preferences.rememberSelected(elements, 'strokeWidth', 4);
const elapsed = performance.now() - start;
assert.equal(JSON.parse(stored).rectangle.strokeWidth, 4);
const firstWrites = writes;
preferences.rememberSelected(elements, 'strokeWidth', 4);
if (process.argv[2] === 'after') {
  assert.equal(firstWrites, 1);
  assert.equal(writes, 1);
}
await writeFile(new URL(`preferences-${process.argv[2] || 'before'}.json`, import.meta.url), JSON.stringify({ objects: 1000, firstWrites, repeatWrites: writes - firstWrites, elapsedMs: elapsed }, null, 2));
console.log({ firstWrites, repeatWrites: writes - firstWrites, elapsedMs: elapsed });
