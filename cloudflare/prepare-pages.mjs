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
await cp(resolve(root,'cloudflare/cn/boot.js'),resolve(output,'cn-connection-boot.js'));
const indexPath=resolve(output,'index.html');
let index=await readFile(indexPath,'utf8');
if(!index.includes('<script src="js/i18n.js'))throw new Error('Connection bootstrap insertion point missing');
index=index.replace('<script src="js/i18n.js','<script src="cn-connection-boot.js"></script>\n<script src="js/i18n.js');
await writeFile(indexPath,index);
const cloudPath=resolve(output,'js/cloud.js');
let cloud=await readFile(cloudPath,'utf8');
if(!cloud.includes("  try{\n    const base=`https://www.gstatic.com/firebasejs/${FB_VER}/`;"))throw new Error('Auth bootstrap insertion point missing');
cloud=cloud.replace("  try{\n    const base=`https://www.gstatic.com/firebasejs/${FB_VER}/`;","  try{\n    await window.SPELL_CONNECTION_READY;\n    const base=window.SPELL_CN_PROXY?`/api/cn-proxy/sdk/firebasejs/${FB_VER}/`:`https://www.gstatic.com/firebasejs/${FB_VER}/`;");
cloud=cloud.replace('    CLOUD.auth=firebase.auth();CLOUD.db=firebase.firestore();','    CLOUD.auth=firebase.auth();CLOUD.db=firebase.firestore();\n    if(window.SPELL_CN_PROXY)CLOUD.db.settings({experimentalForceLongPolling:true});');
if(!cloud.includes('await CLOUD.auth.signInAnonymously();'))throw new Error('Anonymous sign-in insertion point missing');
cloud=cloud.replace('await CLOUD.auth.signInAnonymously();',"await (window.SPELL_CN_PROXY?Promise.race([CLOUD.auth.signInAnonymously(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('auth/network-request-failed')),12000))]):CLOUD.auth.signInAnonymously());");
if(!cloud.includes('  async query(parent,structuredQuery){'))throw new Error('Leaderboard insertion point missing');
cloud=cloud.replace('  async query(parent,structuredQuery){','  async query(parent,structuredQuery){await window.SPELL_CONNECTION_READY;');
await writeFile(cloudPath,cloud);
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
/cn-connection-boot.js
  Cache-Control: no-cache
`);
await writeFile(resolve(output, '_redirects'), `/play / 302\n/spell-legion / 302\n/spell-legion/ / 302\n`);
console.log(`Pages assets prepared and references checked: ${output}`);
