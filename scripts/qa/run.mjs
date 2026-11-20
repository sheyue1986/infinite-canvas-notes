import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../../', import.meta.url));
let server, browser;
async function run(file) {
  const child = spawn(process.execPath, ['scripts/qa/' + file], { cwd: directory, stdio: 'inherit', windowsHide: true });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  if (code !== 0) throw new Error(file + ' failed with exit code ' + code);
}
try {
  const available = await fetch('http://127.0.0.1:4195/').then(r => r.ok).catch(() => false);
  if (!available) {
    server = spawn(process.execPath, ['scripts/qa/server.mjs'], { cwd: directory, stdio: 'inherit', windowsHide: true });
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      ready = await fetch('http://127.0.0.1:4195/').then(r => r.ok).catch(() => false);
      if (ready) break;
      await delay(100);
    }
    if (!ready) throw new Error('Test server did not start');
  }
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--remote-debugging-port=9259', '--window-size=1440,1000', '--disable-gpu'] });
  await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  for (const file of ['selection-qa.mjs', 'tools-trace-qa.mjs', 'export-qa.mjs', 'lifecycle.mjs', 'test-advanced-editing.cjs', 'test-copic-picker.cjs']) await run(file);
} finally {
  await browser?.close();
  server?.kill();
}
