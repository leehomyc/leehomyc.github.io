import { cp, mkdir, rm, writeFile, readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'spell-legion');
const output = resolve(root, 'cloudflare/dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
await cp(resolve(root,'cloudflare/analytics/worker.mjs'), resolve(output,'_worker.js'));
const html = await readFile(resolve(output, 'index.html'), 'utf8');
const missing = [];
for (const [, path] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(https?:|data:|\/\/)/.test(path)) continue;
  try { await stat(resolve(output, path.split('?')[0])); } catch { missing.push(path); }
}
if (missing.length) throw new Error(`Missing assets: ${missing.join(', ')}`);
await writeFile(resolve(output, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
/index.html
  Cache-Control: no-cache
/js/*
  Cache-Control: public, max-age=0, must-revalidate
/css/*
  Cache-Control: public, max-age=0, must-revalidate
`);
await writeFile(resolve(output, '_redirects'), `/play / 302\n/spell-legion / 302\n/spell-legion/ / 302\n`);
console.log(`Pages assets prepared and references checked: ${output}`);
