import http from 'node:http';
import { readFile } from 'node:fs/promises';

const root = new URL('../../published-site/', import.meta.url);
const types = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', woff2: 'font/woff2', wasm: 'application/wasm', json: 'application/json', png: 'image/png', svg: 'image/svg+xml' };
http.createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
  if (name.includes('..')) return res.writeHead(400).end();
  try {
    let data = await readFile(new URL(name, root));
    if (name === 'assets/index-icn-selection-r15.js') data = Buffer.from(data.toString().replace('apiRef:h,layers:_,kit:mt', 'apiRef:(window.__selectionQARef=h,h),layers:_,kit:mt'));
    res.writeHead(200, { 'Content-Type': types[name.split('.').at(-1)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404).end(); }
}).listen(4195, '127.0.0.1');
