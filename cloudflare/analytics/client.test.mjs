import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const source=readFileSync(new URL('../../spell-legion/js/analytics.js',import.meta.url),'utf8');
function setup(){
 let time=0;const sent=[];
 const c=vm.createContext({crypto:webcrypto,performance:{now:()=>time},document:{hidden:false,referrer:'https://game.example/play'},location:{origin:'https://game.example'},navigator:{userAgent:'desktop'},URL,setInterval(){},addEventListener(){},CLOUD:{user:{uid:'user-a',getIdToken:async()=> 'token-a'}},G:{auto:false,t:10,kills:2,bossSlain:0,lv:2},SAVE:{mode:'solo'},CLASS:'swordsman',DIFFID:'normal',fetch:async(url,options)=>{sent.push({token:options.headers.Authorization,body:JSON.parse(options.body)});return {ok:true};}});
 vm.runInContext(source,c);
 return {c,sent,run:s=>vm.runInContext(s,c),tick:()=>{time+=1000;vm.runInContext('metricsSample()',c);}};
}
test('battle time excludes pause, background and demo; internal links are direct',async()=>{
 const h=setup();await h.run('metricsStart()');await new Promise(r=>setImmediate(r));h.tick();h.c.G.paused=true;h.tick();h.c.document.hidden=true;h.tick();h.c.document.hidden=false;h.c.G.auto=true;h.tick();await h.run('metricsFlush()');
 const b=h.sent.at(-1).body;assert.equal(b.visibleMs,3000);assert.equal(b.playMs,1000);assert.equal(b.run.playMs,1000);assert.equal(b.source,'');
});
test('switching account during token refresh cannot send the old packet as the new user',async()=>{
 const h=setup();let release;h.c.CLOUD.user.getIdToken=()=>new Promise(r=>release=r);
 const pending=h.run('metricsStart()');h.tick();h.c.CLOUD.user={uid:'user-b',getIdToken:async()=> 'token-b'};h.tick();release('token-a');await pending;await new Promise(r=>setImmediate(r));await h.run('metricsFlush()');
 assert.ok(h.sent.length>=1);for(const packet of h.sent){assert.equal(packet.token,'Bearer token-b');assert.equal(packet.body.run,null);assert.equal(packet.body.playMs,0);}
});
test('ending a run preserves final counters and clears the active run',async()=>{
 const h=setup();await h.run('metricsStart()');await new Promise(r=>setImmediate(r));h.tick();h.c.G.kills=42;h.run("metricsEnd('win')");await new Promise(r=>setImmediate(r));
 const b=h.sent.at(-1).body;assert.equal(b.run.kills,42);assert.equal(b.run.outcome,'win');assert.equal(b.run.ended,true);assert.equal(h.run('METRICS.run'),null);
});

test('a run started before anonymous sign-in is counted once authentication arrives',async()=>{
 const h=setup();h.c.CLOUD.user=null;await h.run('metricsStart()');assert.equal(h.run('METRICS.pending'),true);
 h.c.CLOUD.user={uid:'late-user',getIdToken:async()=> 'late-token'};h.tick();await new Promise(r=>setImmediate(r));
 assert.equal(h.sent.length,1);assert.equal(h.sent[0].body.run.kills,2);assert.equal(h.sent[0].body.playMs,0);h.tick();await h.run('metricsFlush()');assert.equal(h.sent.at(-1).body.playMs,1000);
});
test('a new visitor reports promptly without waiting for the heartbeat interval',async()=>{
 const h=setup();h.c.G.auto=true;h.tick();await new Promise(r=>setImmediate(r));assert.equal(h.sent.length,1);assert.equal(h.sent[0].body.run,null);assert.equal(h.sent[0].body.playMs,0);
});
