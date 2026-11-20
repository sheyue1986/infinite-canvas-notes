import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const fixtures = new URL('./fixtures/', import.meta.url);
const dxf = (await readdir(fixtures)).find(name => name.endsWith('.dxf'));
const origin = 'http://127.0.0.1:4173';
for (const job of [
  { route: '/api/export/dwg', file: dxf, magic: 'AC1015' },
  { route: '/api/models/blender', file: 'cube.blend', magic: 'glTF', headers: { Origin: origin, 'Sec-Fetch-Site': 'same-origin', 'X-Infinite-Canvas-Import': 'blend', 'Content-Type': 'application/octet-stream' } },
]) {
  const response = await fetch(origin + job.route, { method: 'POST', headers: job.headers, body: await readFile(new URL(job.file, fixtures)) });
  assert.ok(response.ok, job.route + ' returned HTTP ' + response.status);
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.equal(buffer.toString('ascii', 0, job.magic.length), job.magic);
  console.log(job.route, 'passed', buffer.length, 'bytes');
}
