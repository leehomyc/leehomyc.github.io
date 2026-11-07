import {proxyFirebase} from './cn-proxy.mjs';
const PROJECT='spell-legion';
const ORIGINS=new Set(['https://spelllegion.com','https://spell-legion.pages.dev','https://hyang.org','https://leehomyc.github.io']);
let keyCache={until:0,keys:[]};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
export async function authenticate(request){
 const token=request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
 if(!token||token.length>12000)throw fail('Sign in required',401);
 let h,p,s,parts;try{parts=token.split('.');if(parts.length!==3)throw Error();h=JSON.parse(new TextDecoder().decode(decode(parts[0])));p=JSON.parse(new TextDecoder().decode(decode(parts[1])));s=decode(parts[2]);}catch{throw fail('Invalid token',401);}
 const now=Date.now()/1000;
 if(h.alg!=='RS256'||!h.kid||p.aud!==PROJECT||p.iss!==`https://securetoken.google.com/${PROJECT}`||typeof p.sub!=='string'||!p.sub||p.sub.length>128||!Number.isFinite(p.exp)||p.exp<=now||!Number.isFinite(p.iat)||p.iat>now+60)throw fail('Invalid token claims',401);
 if(keyCache.until<Date.now()){
  const r=await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if(!r.ok)throw fail('Authentication service unavailable',503);
  keyCache={keys:(await r.json()).keys,until:Date.now()+3600000};
 }
 const jwk=keyCache.keys.find(k=>k.kid===h.kid);if(!jwk)throw fail('Unknown signing key',401);
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,s,new TextEncoder().encode(parts.slice(0,2).join('.'))))throw fail('Invalid signature',401);
 return p;
}
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{12,80}$/.test(v);
const num=(v,max)=>Number.isFinite(v)&&v>=0&&v<=max;
const choice=(v,list,fallback)=>list.includes(v)?v:fallback;
export function validatePacket(b){
 if(!b||!id(b.id)||!id(b.session)||!num(b.visibleMs,120000)||!num(b.playMs,120000)||b.playMs>b.visibleMs)throw fail('Invalid heartbeat');

 if(b.run){const r=b.run;if(!id(r.id)||!num(r.playMs,120000)||!num(r.simSeconds,86400)||!num(r.kills,1000000)||!num(r.bosses,1000)||!num(r.level,10000))throw fail('Invalid run');}
 return b;
}
async function ingest(request,env,claims){
 if(!ORIGINS.has(request.headers.get('Origin')))throw fail('Origin denied',403);
 if(+(request.headers.get('Content-Length')||0)>8192)throw fail('Packet too large',413);
 const raw=await request.text();if(raw.length>8192)throw fail('Packet too large',413);
 let b;try{b=JSON.parse(raw);}catch{throw fail('Invalid JSON');}validatePacket(b);
 const db=env.ANALYTICS_DB,now=Date.now(),uid=claims.sub;
 // Idempotency applies to the entire packet; D1 batch executes atomically.
 // A receipt is inserted first; duplicate packet IDs are rejected before mutation.
 const registered=claims.firebase?.sign_in_provider&&claims.firebase.sign_in_provider!=='anonymous'?1:0;
 const existing=await db.prepare('SELECT id FROM analytics_receipts WHERE id=?').bind(b.id).first();if(existing)return json({ok:true,duplicate:true});
 const oldSession=await db.prepare('SELECT uid,last_seen FROM analytics_sessions WHERE id=?').bind(b.session).first();
 if(oldSession&&oldSession.uid!==uid)throw fail('Session owner changed; start a new session',409);
 if(oldSession&&now-oldSession.last_seen<5000&&!b.run?.ended)throw fail('Heartbeat rate limited; retry later',429);
 const country=/^[A-Z]{2}$/.test(request.cf?.country||'')?request.cf.country:'XX';
 const day=new Date(now+8*3600000).toISOString().slice(0,10);
 const device=choice(b.device,['mobile','desktop','tablet'],'desktop');
 let source='direct';try{source=new URL(b.source).hostname.slice(0,120);}catch{}
 const statements=[
 db.prepare('INSERT INTO analytics_receipts(id,created) VALUES(?,?)').bind(b.id,now),
 db.prepare('INSERT INTO analytics_actors(uid,first_seen,last_seen,registered,registered_seen) VALUES(?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET last_seen=excluded.last_seen,registered=MAX(registered,excluded.registered),registered_seen=COALESCE(registered_seen,excluded.registered_seen)').bind(uid,now,now,registered,registered?now:null),
 db.prepare('INSERT INTO analytics_sessions(id,uid,first_seen,last_seen,country,device,source,visible_ms,play_ms,playing) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen,visible_ms=visible_ms+excluded.visible_ms,play_ms=play_ms+excluded.play_ms,playing=excluded.playing WHERE uid=excluded.uid').bind(b.session,uid,now,now,country,device,source,Math.round(b.visibleMs),Math.round(b.playMs),b.playing?1:0)
 ];
 statements.push(db.prepare('INSERT INTO analytics_activity(session_id,day,uid,country,device,source,visible_ms,play_ms) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(session_id,day) DO UPDATE SET visible_ms=visible_ms+excluded.visible_ms,play_ms=play_ms+excluded.play_ms WHERE uid=excluded.uid').bind(b.session,day,uid,country,device,source,Math.round(b.visibleMs),Math.round(b.playMs)));
 if(b.run){const r=b.run;const old=await db.prepare('SELECT uid FROM analytics_runs WHERE id=?').bind(r.id).first();if(old&&old.uid!==uid)throw fail('Run owner mismatch',403);
 statements.push(db.prepare('INSERT INTO analytics_runs(id,session_id,uid,started,updated,mode,cls,difficulty,play_ms,sim_seconds,kills,bosses,level,ended,outcome) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,play_ms=play_ms+excluded.play_ms,sim_seconds=MAX(sim_seconds,excluded.sim_seconds),kills=MAX(kills,excluded.kills),bosses=MAX(bosses,excluded.bosses),level=MAX(level,excluded.level),ended=MAX(ended,excluded.ended),outcome=CASE WHEN ended=1 THEN outcome ELSE excluded.outcome END WHERE uid=excluded.uid').bind(r.id,b.session,uid,now,now,choice(r.mode,['solo','qpk','pk','room','daily','rush'],'solo'),choice(r.cls,['swordsman','taoist','blademaster','qin','monk','physician'],'other'),choice(r.difficulty,['easy','normal','hard'],'normal'),Math.round(r.playMs),r.simSeconds,r.kills,r.bosses,r.level,r.ended?1:0,choice(r.outcome,['win','lose','tie','abandoned','finished','in_progress'],'in_progress')));
 }
 try{await db.batch(statements);}catch(e){if(String(e).includes('UNIQUE constraint failed: analytics_receipts'))return json({ok:true,duplicate:true});throw e;}
 return json({ok:true});
}
async function dashboard(request,env,claims){
 const allowed=(env.ADMIN_EMAILS||'harryyang.hk@gmail.com').split(',').map(x=>x.trim().toLowerCase());
 if(claims.email_verified!==true||!allowed.includes(String(claims.email||'').toLowerCase()))throw fail('Administrator access required',403);
 const days=choice(Number(new URL(request.url).searchParams.get('days')),[1,7,30,90],7),now=Date.now(),since=Math.floor((now+8*3600000)/86400000)*86400000-8*3600000-(days-1)*86400000;
 const sinceDay=new Date(since+8*3600000).toISOString().slice(0,10);
 const queries={
 overview:['SELECT COUNT(DISTINCT uid) users,COUNT(DISTINCT session_id) sessions,COALESCE(SUM(play_ms),0) play_ms,COALESCE(SUM(visible_ms),0) visible_ms FROM analytics_activity WHERE day>=?',sinceDay],
 registrationSnapshot:['SELECT registered_accounts,anonymous_accounts,captured FROM analytics_registration_snapshot WHERE id=1'],
 accounts:['SELECT COUNT(*) observed_accounts,SUM(registered) registered_accounts,MIN(first_seen) tracking_started FROM analytics_actors'],
 online:['SELECT COUNT(DISTINCT uid) online,COUNT(DISTINCT CASE WHEN playing=1 THEN uid END) playing FROM analytics_sessions WHERE last_seen>=?',now-90000],
 runs:['SELECT COUNT(*) starts,SUM(ended) completions,AVG(CASE WHEN ended=1 THEN sim_seconds END) avg_sim_seconds,SUM(bosses) bosses FROM analytics_runs WHERE started>=?',since],
 countries:['SELECT country,COUNT(DISTINCT uid) users,COUNT(DISTINCT session_id) sessions,SUM(play_ms) play_ms FROM analytics_activity WHERE day>=? GROUP BY country ORDER BY users DESC LIMIT 50',sinceDay],
 sources:['SELECT source,COUNT(DISTINCT uid) users,COUNT(DISTINCT session_id) sessions FROM analytics_activity WHERE day>=? GROUP BY source ORDER BY users DESC LIMIT 30',sinceDay],
 devices:['SELECT device,COUNT(DISTINCT uid) users,SUM(play_ms) play_ms FROM analytics_activity WHERE day>=? GROUP BY device ORDER BY users DESC',sinceDay],
 daily:['SELECT day,COUNT(DISTINCT uid) users,COUNT(DISTINCT session_id) sessions,SUM(play_ms) play_ms FROM analytics_activity WHERE day>=? GROUP BY day ORDER BY day',sinceDay],
 classes:['SELECT cls,COUNT(*) starts,SUM(ended) completions,AVG(CASE WHEN ended=1 THEN sim_seconds END) avg_sim_seconds,SUM(kills) kills,SUM(play_ms) play_ms FROM analytics_runs WHERE started>=? GROUP BY cls ORDER BY starts DESC',since],
 modes:['SELECT mode,COUNT(*) starts,SUM(ended) completions,SUM(play_ms) play_ms FROM analytics_runs WHERE started>=? GROUP BY mode ORDER BY starts DESC',since],
 funnel:['SELECT COUNT(DISTINCT s.uid) visitors,COUNT(DISTINCT r.uid) players,COUNT(DISTINCT CASE WHEN a.registered=1 THEN s.uid END) registered_players FROM analytics_activity s JOIN analytics_actors a ON a.uid=s.uid LEFT JOIN analytics_runs r ON r.uid=s.uid AND r.started>=? WHERE s.day>=?',since,sinceDay],
 retention:["WITH cohort AS (SELECT uid,date(first_seen/1000,'unixepoch','+8 hours') day FROM analytics_actors) SELECT c.day cohort,COUNT(DISTINCT c.uid) users,COUNT(DISTINCT CASE WHEN s.day=date(c.day,'+1 day') THEN c.uid END) d1,COUNT(DISTINCT CASE WHEN s.day=date(c.day,'+7 day') THEN c.uid END) d7 FROM cohort c LEFT JOIN analytics_activity s ON s.uid=c.uid WHERE c.day>=date(?/1000,'unixepoch','+8 hours') GROUP BY c.day ORDER BY c.day DESC",since],
 recent:['SELECT started,mode,cls,difficulty,sim_seconds,kills,bosses,level,ended,outcome FROM analytics_runs ORDER BY started DESC LIMIT 30']
 };
 const entries=Object.entries(queries);const results=await env.ANALYTICS_DB.batch(entries.map(([,q])=>env.ANALYTICS_DB.prepare(q[0]).bind(...q.slice(1))));
 return json({generated:now,days,since,timeZone:'Asia/Hong_Kong',...Object.fromEntries(entries.map(([k],i)=>[k,results[i].results]))});
}
async function handle(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/api/connection-region')return new Response(JSON.stringify({cn:request.cf?.country==='CN'||(url.hostname==='127.0.0.1'&&url.searchParams.get('country')==='CN')}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(url.pathname.startsWith('/api/cn-proxy/'))return proxyFirebase(request);
 if(!url.pathname.startsWith('/api/analytics/'))return env.ASSETS.fetch(request);
 try{
  if(!env.ANALYTICS_DB)return json({error:'Analytics database is not configured'},503);
  if(url.pathname==='/api/analytics/ingest'&&request.method==='OPTIONS'){if(!ORIGINS.has(request.headers.get('Origin')))return json({error:'Origin denied'},403);return new Response(null,{status:204});}
  const p=await authenticate(request);
  if(url.pathname==='/api/analytics/ingest'&&request.method==='POST')return await ingest(request,env,p);
  if(url.pathname==='/api/analytics/dashboard'&&request.method==='GET')return await dashboard(request,env,p);
  return json({error:'Not found'},404);
 }catch(e){return json({error:e.status?e.message:'Analytics service unavailable'},e.status||503);}
}
export default {async fetch(request,env){const response=await handle(request,env);const origin=request.headers.get('Origin');if(new URL(request.url).pathname==='/api/analytics/ingest'&&ORIGINS.has(origin)){const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Methods','POST, OPTIONS');headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');headers.set('Access-Control-Max-Age','3600');headers.set('Vary','Origin');return new Response(response.body,{status:response.status,headers});}return response;}};
