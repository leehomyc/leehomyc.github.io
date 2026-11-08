'use strict';
/* arena.js — the shared duel arena (Brawl Stars style: everyone in one field, no player-vs-player damage).
   The room host runs the world: monsters, bosses, arrows, ground attacks. Every player runs their own hero, skills and cards.
   Guests see the host's monsters as mirrors, hit them locally (so hits feel instant) and report the damage;
   kill credit is reported by the players. World pickups are generated once and contested through arena-loot.js.
   Messages ride on link.js, with a room-event relay fallback. Losing sync interrupts the round without ladder rewards. */
const ARENA={on:false,host:false,remote:{},byId:new Map(),eid:0,known:{},acked:{},snapT:0,fxOut:[],killed:[],
  seq:0,unacked:[],acc:{},sendT:0,lastSnap:0,heroes:{},hostUid:null};
const DEF_KEYS=['type','maxHp','dmg','r','xp','elite','sc','affix','role','tint','tintv','mesh','ghost','bomb','shield','warlord','name','en','n','illusion','champion','escort','t0','shoot','spd','rate','bossArmor'];
const r0=v=>Math.round(v),r2=v=>Math.round(v*100)/100;
function arenaReset(){Object.assign(ARENA,{on:false,host:false,remote:{},byId:new Map(),known:{},acked:{},snapT:0,fxOut:[],killed:[],seq:0,unacked:[],acc:{},sendT:0,lastSnap:0,heroes:{},hostUid:null})}
/* Called after room start; players must have a live direct or relayed link. */
function arenaStart(){
  arenaReset();if(!G||!G.room||!ROOM.code||typeof linkOpenTo!=='function')return false;
  if(ROOM.host){if(!linkOpenUids().length&&!G.rivalSeat)return false;ARENA.host=true}
  else{const h=ROOM.data&&ROOM.data.host;if(!h||!linkOpenTo(h))return false;ARENA.hostUid=h;G.mirror=true;G.en=[];G.boss=null;ARENA.lastSnap=performance.now()}
  ARENA.reportSeen={};ARENA.snapSeq=0;ARENA.snapReceived=0;if(typeof arenaLootReset==='function')arenaLootReset();ARENA.on=true;G.shared=true;G.mission=null;return true}
function arenaStop(){if(G){G.shared=false;G.mirror=false}ARENA.on=false}
function arenaId(e){if(!e.id){e.id=++ARENA.eid;ARENA.byId.set(e.id,e)}return e.id}
function arenaName(uid){const p=ROOM.players&&ROOM.players[uid];return (p&&p.name)||'?'}

/* ---------- host ---------- */
function arenaNear(e,best){let T=null;for(const u in ARENA.remote){const r=ARENA.remote[u];if(r.down)continue;const d=hyp(r.x-e.x,r.y-e.y);if(d<best){best=d;T=r}}return T}
function arenaBossTarget(B){const P=G.P;let T=P.down>0?null:P,best=T?hyp(P.x-B.x,P.y-B.y):1e9;const R=arenaNear(B,best);return R||T||P}
function arenaSpawnAnchor(){const rs=Object.values(ARENA.remote).filter(r=>!r.down);return rs.length?pick(rs):null}
function arenaRemoteN(){return Object.keys(ARENA.remote).length}
function arenaKillFor(e,uid){if(e.dead)return;G.creditOff=uid;try{kill(e,null,0,0)}finally{G.creditOff=null}
  if(e.type==='boss'||e.warlord)showBanner(`${arenaName(uid)} 抢下了${e.type==='boss'?'首领':'统领'}`,`${arenaName(uid)} took the ${e.type==='boss'?'boss':'warlord'}`,1.8)}
function arenaOnGuest(uid,m){
  if(!ARENA.on||!ARENA.host||!G||G.auto)return;const now=performance.now();
  ARENA.reportSeen=ARENA.reportSeen||{};const seen=ARENA.reportSeen[uid]||(ARENA.reportSeen[uid]=new Set());
  const r=ARENA.remote[uid]||(ARENA.remote[uid]={x:m.x,y:m.y,vx:0,vy:0});Object.assign(r,{x:m.x,y:m.y,vx:m.vx||0,vy:m.vy||0,hp:m.hp,down:m.dn,power:Number.isFinite(m.bp)?Math.max(0,m.bp):0,mag:Math.max(1,Math.min(3.4,m.mag||1)),lt:now});
  if(typeof arenaLootGuestClaims==='function')arenaLootGuestClaims(uid,m);
  for(const report of m.reports||[{q:m.q,h:m.h||[]}]){if(seen.has(report.q))continue;seen.add(report.q);
    for(const h of report.h||[]){const [id,d,kl,frz,slow,sleep,shred,kx,ky]=h;const e=ARENA.byId.get(id);if(!e||e.dead)continue;
      if(d>0){e.hp-=d;e.flash=.1}
      if(frz)e.frz=Math.max(e.frz||0,frz);if(slow)e.slow=Math.max(e.slow||0,slow);if(sleep)e.sleep=Math.max(e.sleep||0,sleep);if(shred)e.shred=Math.max(e.shred||0,shred);
      if((kx||ky)&&e.type!=='boss'){e.kx=(e.kx||0)+kx;e.ky=(e.ky||0)+ky}
      if(kl||e.hp<=0){e.hp=Math.min(e.hp,0);arenaKillFor(e,uid)}}
  }
  let ack=ARENA.acked[uid]||0;while(seen.has(ack+1))ack++;ARENA.acked[uid]=ack;for(const q of seen)if(q<ack-128)seen.delete(q)
}
function arenaHostTick(dt){
  const now=performance.now();for(const u in ARENA.remote){if(!ROOM.players[u]){delete ARENA.remote[u];continue}if(now-ARENA.remote[u].lt>10000){arenaDetach(false);return}}
  for(const b of G.bullets)if(!b._s){b._s=1;ARENA.fxOut.push(['b',r0(b.x),r0(b.y),r0(b.vx),r0(b.vy),r2(b.d),r2(b.life),(b.boss?1:0)|(b.bone?2:0)])}
  for(const h of G.hazards)if(!h._s){h._s=1;ARENA.fxOut.push(['h',r0(h.x),r0(h.y),h.r,r2(h.tele),r2(h.dur),r2(h.burst),r2(h.dps),h.col,h.percent||0,h.status||null])}
  for(const n of G.novas)if(!n._s){n._s=1;ARENA.fxOut.push(['n',r0(n.x),r0(n.y),n.R,n.v,r2(n.d),n.confuse||0,n.col||''])}
  ARENA.snapT-=dt;if(ARENA.snapT>0)return;ARENA.snapT=Math.max(.1,...linkOpenUids().map(uid=>typeof linkInterval==='function'?linkInterval(uid):.1));ARENA.snapSeq=(ARENA.snapSeq||0)+1;
  const P=G.P,heroes=[[roomUid(),r0(P.x),r0(P.y),r2(Math.max(0,P.hp/P.maxHp)),P.down>0?1:0]];
  if(G.rival&&G.rivalSeat){const R=G.rival;heroes.push([G.rivalSeat,r0(R.x),r0(R.y),r2(Math.max(0,R.hp/R.maxHp)),R.down>0?1:0])}
  for(const u in ARENA.remote){const r=ARENA.remote[u];heroes.push([u,r0(r.x),r0(r.y),r2(r.hp||0),r.down?1:0])}
  const fx=ARENA.fxOut;ARENA.fxOut=[];const killed=new Set(ARENA.killed);ARENA.killed=[];
  for(const u of linkOpenUids()){const r=ARENA.remote[u],cx=r?r.x:P.x,cy=r?r.y:P.y;const known=ARENA.known[u]||new Set(),vis=new Set(),E=[],D=[];
    for(const e of G.en){if(e.dead)continue;if(e.type!=='boss'&&!e.warlord&&hyp(e.x-cx,e.y-cy)>760)continue;const id=arenaId(e);vis.add(id);
      E.push([id,r0(e.x),r0(e.y),Math.ceil(e.hp),(e.charge>0||e.cs>0?1:0)|(e.hide>0?4:0)|(e.frz>0?8:0)|(e.sleep>0?16:0)]);
      if(!known.has(id)||(typeof linkDirectOpen==='function'&&!linkDirectOpen(u))){const d={id};for(const k of DEF_KEYS)if(e[k]!==undefined&&typeof e[k]!=='object')d[k]=e[k];D.push(d)}}
    const gone=[];for(const id of known)if(!vis.has(id))gone.push(killed.has(id)?-id:id); // a negative id died; a positive one only left view
    ARENA.known[u]=vis;
    linkSend(u,{k:'s',n:ARENA.snapSeq,t:r2(G.t),a:ARENA.acked[u]||0,e:E,d:D,g:gone,h:heroes,f:fx,l:typeof arenaLootSnapshot==='function'?arenaLootSnapshot():[],w:[...(ARENA.grants?.[u]?.values()||[])]})}}

/* ---------- guest ---------- */
function arenaMirror(d){if(ARENA.byId.has(d.id))return;const e=Object.assign({hp:d.maxHp,fr:rnd(1),vx:0,vy:0,kx:0,ky:0,st:rnd(1,3),mirror:1,fresh:1},d);
  ARENA.byId.set(d.id,e);G.en.push(e);
  if(e.type==='boss'&&!G.auto){G.boss=e;$('#bossbar').hidden=false;$('#bossname').textContent=L(e.name||'首领',e.en||'Boss');showBanner((e.name||'首领')+'现身',(e.en||'The boss')+' emerges',2.2);trauma(.5);if(typeof SFX!=='undefined')SFX.roar()}}
function arenaDieFx(e){spark(e.x,e.y,e.type==='boss'?'#ff5a5a':e.elite?'#ffd27a':'#ff8e5a',e.type==='boss'?60:e.elite?12:6,90);
  if(e.type!=='boss'&&G.fx.length<CAP.fx)G.fx.push({k:'die',x:e.x,y:e.y,h:1,vh:70,kx:rnd(-20,20),ky:rnd(-20,20),rot:0,rv:rnd(6,14),t:.6,T:.6,type:e.type,fr:e.fr,sc:e.sc||1})}
function arenaFx(f,age=.05){
  if(f[0]==='b'){if(G.bullets.length<CAP.bu)G.bullets.push({x:f[1]+f[3]*age,y:f[2]+f[4]*age,vx:f[3],vy:f[4],d:f[5],life:f[6]-age,boss:f[7]&1,bone:f[7]&2?1:undefined})}
  else if(f[0]==='h'){hazard(f[1],f[2],f[3],Math.max(0,f[4]-age),f[5],f[6],f[7],f[8]);const h=G.hazards[G.hazards.length-1];h.percent=f[9]||0;h.status=f[10]||null;}
  else if(f[0]==='n')G.novas.push({x:f[1],y:f[2],r:10+f[4]*age,R:f[3],v:f[4],d:f[5],confuse:f[6]||undefined,col:f[7]||undefined})}
function arenaOnSnap(m){
  if(!ARENA.on||ARENA.host||!G||!G.mirror)return;if(m.n&&m.n<=(ARENA.snapReceived||0))return;ARENA.snapReceived=m.n||0;ARENA.lastSnap=performance.now();
  ARENA.unacked=ARENA.unacked.filter(u=>u.q>m.a);const pend={};for(const u of ARENA.unacked)pend[u.id]=(pend[u.id]||0)+u.d;for(const id in ARENA.acc)pend[id]=(pend[id]||0)+ARENA.acc[id][1];
  for(const d of m.d||[])arenaMirror(d);
  for(const g of m.g||[]){const id=Math.abs(g),e=ARENA.byId.get(id);if(!e)continue;ARENA.byId.delete(id);if(e.dead)continue;e.dead=1;
    if(g<0){arenaDieFx(e);if((e.myDmg||0)>e.maxHp*.25)G.floats.push({x:e.x,y:e.y-14,t:.9,v:L('被抢!','Stolen!'),c:'#ff9c8a'});
      if(e===G.boss){G.boss=null;$('#bossbar').hidden=true;showBanner(`${e.name||'首领'}被抢走了`,`Someone else took ${e.en||'the boss'}`,1.8)}}
    else if(e===G.boss){G.boss=null;$('#bossbar').hidden=true}}
  for(const [id,x,y,hp,fl] of m.e||[]){const e=ARENA.byId.get(id);if(!e||e.dead)continue;if(e.fresh){e.x=x;e.y=y;e.fresh=0}e.tx=x;e.ty=y;e.fl=fl;
    e.hp=Math.min(e.maxHp,hp-(pend[id]||0));e._b=e.hp;if(fl&8)e.frz=Math.max(e.frz||0,.12);if(fl&16)e.sleep=Math.max(e.sleep||0,.12);e.hide=fl&4?.15:0}
  // Each snapshot contains the complete visible enemy set. A coalesced relay may
  // skip an intermediate removal delta, so reconcile against that full set too.
  if(Array.isArray(m.e)){const visible=new Set(m.e.map(e=>e[0]));for(const [id,e] of ARENA.byId)if(!visible.has(id)){e.dead=1;ARENA.byId.delete(id);if(e===G.boss){G.boss=null;$('#bossbar').hidden=true}}}
  const seen={};for(const h of m.h||[]){if(h[0]===roomUid())continue;seen[h[0]]=1;ARENA.heroes[h[0]]={x:h[1],y:h[2],hp:h[3],down:h[4]}}
  for(const u in ARENA.heroes)if(!seen[u])delete ARENA.heroes[u];
  if(typeof arenaLootMirror==='function'){arenaLootMirror(m.l);arenaLootReceive(m.w)}
  for(const f of m.f||[])if(f.p)arenaFx(f.p,Math.max(.05,Math.min(3,(Date.now()-f.at)/1000)));else arenaFx(f);
  G.en=G.en.filter(e=>!e.dead);if(G.boss&&G.boss.dead)G.boss=null}
/* the guest's monsters: no AI of their own, they glide to where the host has them; contact damage is felt locally */
function mirrorTick(dt){const P=G.P;
  for(const e of G.en){if(e.dead)continue;
    e.flash=Math.max(0,(e.flash||0)-dt);e.orbT=(e.orbT||0)-dt;e.frz=Math.max(0,(e.frz||0)-dt);e.slow=Math.max(0,(e.slow||0)-dt);e.shred=Math.max(0,(e.shred||0)-dt);
    if(e.burn>0){e.burn-=dt;e.btk=(e.btk||0)-dt;if(e.btk<=0){e.btk=.5;hit(e,e.burnD*.5,e.burnS,true,'#ff8a3c');if(e.dead)continue}}
    if(e.pois>0){e.poisT-=dt;e.ptk=(e.ptk||0)-dt;if(e.ptk<=0){e.ptk=.6;hit(e,e.poisD*e.pois*.5,e.poisS,true,'#9ff06a');if(e.dead)continue}if(e.poisT<=0)e.pois=0}
    if(e.sleep>0)e.sleep-=dt;
    if(e.kx||e.ky){e.x+=e.kx*dt;e.y+=e.ky*dt;const f=Math.exp(-8*dt);e.kx*=f;e.ky*=f;if(Math.abs(e.kx)<2&&Math.abs(e.ky)<2)e.kx=e.ky=0}
    if(e.tx!==undefined){const dx=e.tx-e.x,dy=e.ty-e.y,d=hyp(dx,dy);if(d>150){e.x=e.tx;e.y=e.ty}else{const k=Math.min(1,dt*9);e.x+=dx*k;e.y+=dy*k;e.fr+=dt*(2+Math.min(d,20)*.15)}}
    if(e.type==='statue'||P.down>0)continue;
    const d=hyp(P.x-e.x,P.y-e.y);if(d>=e.r+7)continue;
    if(e.type==='boss'){dmgP(leaderContactDamage(e,G.P)*(e.fl&1?1.3:1),e.x,e.y,e.fl&1?['首领冲撞','boss charge']:srcName(e));continue}
    if(e.frz>0||e.sleep>0)continue;
    if(e.role==='charger'&&(e.fl&1)){if(P.dash>0)parry();else dmgP(e.dmg*2.5*(1+Math.max(0,G.t-600)/900),e.x,e.y,srcName(e));continue}
    dmgP(leaderContactDamage(e,P),e.x,e.y,srcName(e));const b=ETYPES[e.type]||{};if(b.burn){P.burnT=1.5;P.burnD=e.dmg*.15}if(b.chill)P.chillT=1.2}}
/* after each guest step: what my hero did to the mirrors becomes a report for the host */
function arenaGuestTick(dt){
  if(performance.now()-ARENA.lastSnap>10000){arenaDetach();return}
  const decay=(v,dt)=>Math.max(0,(v||0)-dt);
  for(const [id,e] of ARENA.byId){if(e.fresh)continue;
    const base=e._b===undefined?e.hp:e._b,dmg=Math.max(0,base-Math.max(0,e.hp));e._b=Math.max(0,e.hp);
    const a=ARENA.acc[id]||[id,0,0,0,0,0,0,0,0];let any=dmg>0;a[1]+=dmg;if(dmg>0)e.myDmg=(e.myDmg||0)+dmg;
    e._fz=decay(e._fz,dt);if((e.frz||0)>e._fz+.05){a[3]=r2(e.frz);e._fz=e.frz;any=1}
    e._sl=decay(e._sl,dt);if((e.slow||0)>e._sl+.05){a[4]=r2(e.slow);e._sl=e.slow;any=1}
    e._sp=decay(e._sp,dt);if((e.sleep||0)>e._sp+.05&&!(e.fl&16)){a[5]=r2(e.sleep);e._sp=e.sleep;any=1}
    e._sh=decay(e._sh,dt);if((e.shred||0)>e._sh+.05){a[6]=r2(e.shred);e._sh=e.shred;any=1}
    const ex=(e._kx||0)*Math.exp(-8*dt),ey=(e._ky||0)*Math.exp(-8*dt),ix=(e.kx||0)-ex,iy=(e.ky||0)-ey;if(hyp(ix,iy)>20){a[7]+=r0(ix);a[8]+=r0(iy);any=1}e._kx=e.kx||0;e._ky=e.ky||0;
    if(e.dead){a[2]=1;any=1;ARENA.byId.delete(id)}
    if(any)ARENA.acc[id]=a}
  ARENA.sendT-=dt;if(ARENA.sendT>0)return;ARENA.sendT=typeof linkInterval==='function'?Math.max(1/15,linkInterval(ARENA.hostUid)):1/15;
  const q=++ARENA.seq,h=[];for(const id in ARENA.acc){const a=ARENA.acc[id];a[1]=r2(a[1]);h.push(a);if(a[1]>0)ARENA.unacked.push({q,id:a[0],d:a[1]})}ARENA.acc={};
  const P=G.P;linkSend(ARENA.hostUid,{k:'m',q,x:r0(P.x),y:r0(P.y),vx:r0(P.vx||0),vy:r0(P.vy||0),hp:r2(Math.max(0,P.hp/P.maxHp)),dn:P.down>0?1:0,bp:buildBossDps(),mag:G.P.mag,lc:typeof arenaLootRequests==='function'?arenaLootRequests():[],la:ARENA.lootAcks||[],h})}
/* the host is gone: the mirrors become real monsters and the guest plays on alone */
function arenaDetach(eliminated){if(!G||G.over)return;if(eliminated)return;ROOM.aborted=true;G.duelAborted=true;roomSetMe({abandonedRound:ROOM.data.round||1});roomEndRun('sync');showBanner('同步中断 · 本局不计天梯','Arena sync lost · no ladder change',2)}
/* one router for everything that arrives on a link */
LINK.onmsg=(uid,m)=>{if(m.protocol!==2||m.round!==(ROOM.data?.round||0))return;if(m.k==='s')arenaOnSnap(m);else if(m.k==='m')arenaOnGuest(uid,m)};
/* who else is in my field, for the renderer: position, HP, and the class/name from the room */
function arenaHeroList(){const me=roomUid(),src=ARENA.host?Object.fromEntries(Object.entries(ARENA.remote).map(([u,r])=>[u,{x:r.x,y:r.y,hp:r.hp,down:r.down}])):ARENA.heroes,out=[];
  for(const u in src){if(u===me||(ARENA.host&&u===G.rivalSeat))continue;const h=src[u],p=(ROOM.players&&ROOM.players[u])||(typeof roomAIMap==='function'&&roomAIMap()[u])||{};if(h.down||p.alive===false)continue;out.push({...p,uid:u,x:h.x,y:h.y,hp:h.hp})}
  return out}

function arenaBuildDps(current){let total=current;for(const r of Object.values(ARENA.remote))if(!r.down)total+=r.power||0;if(G.rival&&G.rivalSeat&&!G.rival.eliminated)total+=buildBossDps(G.rival,G.rival.spells);return total}
