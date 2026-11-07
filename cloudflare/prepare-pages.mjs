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
await cp(resolve(root,'cloudflare/analytics/cn-proxy.mjs'), resolve(output,'cn-proxy.mjs'));
await writeFile(resolve(output,'_routes.json'),JSON.stringify({version:1,include:['/api/analytics/*','/api/cn-proxy/*','/api/connection-region'],exclude:[]}));
const revision=process.env.CF_PAGES_COMMIT_SHA||await readFile(resolve(root,'RELEASE_SOURCE'),'utf8').catch(()=> 'local');
await writeFile(resolve(output,'version.json'),JSON.stringify({revision:revision.trim(),built:new Date().toISOString()}));
const html = await readFile(resolve(output, 'index.html'), 'utf8');
const missing = [];
for (const [, path] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) continue;
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
/admin/*
  Cache-Control: no-store
/version.json
  Cache-Control: no-store
/js/cn-connection-boot.js
  Cache-Control: no-cache
`);
await writeFile(resolve(output, '_redirects'), `/play / 302\n/spell-legion / 302\n/spell-legion/ / 302\n`);
console.log(`Pages assets prepared and references checked: ${output}`);
