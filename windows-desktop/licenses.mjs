import { copyFile, readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const destination = path.join(process.argv[2], 'licenses');
await mkdir(destination, { recursive: true });
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const notices = [];
for (const [folder, entry] of Object.entries(lock.packages)) {
  if (!folder.startsWith('node_modules/')) continue;
  let files;
  try { files = await readdir(folder); } catch { continue; }
  const name = entry.name || folder.split('node_modules/').at(-1);
  notices.push(`${name} ${entry.version || ''}\nLicense: ${entry.license || 'See package notices'}\n`);
  for (const file of files.filter(file => /^(licen[sc]e|copying|copyright|notice)(\.|$)/i.test(file))) {
    const text = await readFile(path.join(folder, file), 'utf8');
    notices.push(`${file}\n${text}\n`);
  }
}
await writeFile(path.join(destination, 'Frontend-Third-Party-Notices.txt'), notices.join('\n\n'));
const assets = JSON.parse(await readFile('windows-desktop/obj/project.assets.json', 'utf8'));
const desktop = JSON.parse(await readFile(path.join(process.argv[2], 'Infinite Canvas Notes Desktop.deps.json'), 'utf8'));
for (const entry of Object.keys(desktop.libraries).filter(name => /^(runtimepack\.|Microsoft\.Web\.WebView2\/)/.test(name))) {
  const [name, version] = entry.replace(/^runtimepack\./, '').split('/');
  for (const cache of Object.keys(assets.packageFolders)) {
    const folder = path.join(cache, name.toLowerCase(), version);
    let files;
    try { files = await readdir(folder); } catch { continue; }
    for (const file of files.filter(file => /^(licen[cs]e|third-party-notices)(\.|$)/i.test(file))) {
      await copyFile(path.join(folder, file), path.join(destination, `${name}-${file}`));
    }
    break;
  }
}
await writeFile(path.join(destination, 'Runtime-Notices.txt'),
  'Blender is distributed as a separate executable under its GPL license. See runtime/blender/license and sources for the corresponding Blender source with libraries.\n' +
  'Blender source: https://download.blender.org/source/\n' +
  'Microsoft .NET and WebView2 notices are included in this folder.\n' +
  'WebView2 terms: https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4314.35/License\n');
