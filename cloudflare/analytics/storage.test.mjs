import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
const db={prepare(q){return {args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(q).get(...this.args)||null;},run(){const s=sql.prepare(q);return {results:/^\s*(SELECT|WITH)/i.test(q)?s.all(...this.args):(s.run(...this.args),[])};}};},async batch(ss){sql.exec('BEGIN');try{const result=ss.map(s=>s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');console.error(e);throw e;}}};
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='storage-test';globalThis.fetch=async()=>Response.json({keys:[jwk]});
let clock=Date.parse('2026-11-06T15:59:00Z');Date.now=()=>clock;
async function request(path,body,admin=false,uid='player-1'){
 const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const p={sub:uid,aud:'spell-legion',iss:'https://securetoken.google.com/spell-legion',iat:clock/1000-1,exp:clock/1000+300,firebase:{sign_in_provider:admin?'google.com':'anonymous'},...(admin?{email:'harryyang.hk@gmail.com',email_verified:true}:{})};
 const text=encode({alg:'RS256',kid:jwk.kid})+'.'+encode(p);const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(text));
 const req=new Request('https://spelllegion.com/api/analytics/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+text+'.'+Buffer.from(sig).toString('base64url'),Origin:'https://spelllegion.com'},...(body?{body:JSON.stringify(body)}:{})});Object.defineProperty(req,'cf',{value:{country:'HK'}});
 return worker.fetch(req,{ANALYTICS_DB:db,ASSETS:{}});
}
const packet={id:crypto.randomUUID(),session:crypto.randomUUID(),visibleMs:30000,playMs:10000,playing:true,device:'desktop',source:'https://example.com/foo',run:{id:crypto.randomUUID(),mode:'solo',cls:'swordsman',difficulty:'normal',playMs:10000,simSeconds:20,kills:10,bosses:0,level:2}};
assert.equal((await request('ingest',packet)).status,200);
assert.equal((await (await request('ingest',packet)).json()).duplicate,true);
assert.equal((await request('dashboard?days=7')).status,403);
clock+=120000;
assert.equal((await request('ingest',{...packet,id:crypto.randomUUID(),playMs:5000,run:{...packet.run,playMs:5000}})).status,200);
const response=await request('dashboard?days=1',null,true);assert.equal(response.status,200);const d=await response.json();
assert.equal(d.overview[0].users,1);assert.equal(d.overview[0].play_ms,5000);assert.equal(d.daily.length,1);assert.equal(d.daily[0].day,'2026-11-07');assert.equal(d.countries[0].country,'HK');assert.equal(d.sources[0].source,'example.com');
const week=await (await request('dashboard?days=7',null,true)).json();assert.equal(week.overview[0].play_ms,15000);assert.equal(week.retention[0].d1,1);
assert.equal((await request('ingest',{...packet,id:crypto.randomUUID()},false,'other-player')).status,409);
const corsReq=new Request('https://spelllegion.com/api/analytics/ingest',{method:'OPTIONS',headers:{Origin:'https://hyang.org'}});const cors=await worker.fetch(corsReq,{ANALYTICS_DB:db});assert.equal(cors.status,204);assert.equal(cors.headers.get('Access-Control-Allow-Origin'),'https://hyang.org');
assert.equal((await worker.fetch(new Request(corsReq,{headers:{Origin:'https://evil.example'}}),{ANALYTICS_DB:db})).status,403);
console.log('Passed: signed ingest and real SQL, atomic deduplication, owner checks, cross-midnight active users/time, country/referrer aggregation, D1 retention and protected dashboard.');
