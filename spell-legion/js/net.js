'use strict';
/* net.js — multiplayer rooms (2–8 players). Everyone plays the same seeded arena in parallel;
   scores, HP and levels are shared live, and kills of bosses / warlords / streak milestones send ambush waves to the others.
   Modes: 'time' (fixed length, highest score wins) and 'last' (the match ends the moment anyone dies: that player loses, survivors rank by score).
   Transport: Firestore (rooms/{code}, players and events subcollections). A local BroadcastChannel transport covers testing and offline play
   between tabs of one browser (?local=1). */
const ROOM_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_LENS=[180,300,600];
const ROOM={code:null,data:null,players:{},me:null,host:false,playing:false,countdown:null,seed:0,ended:false,results:null,lastSeen:{},sendT:0,unsub:null,evSeen:new Set(),joinedAt:0,status:''};
function roomCode(){let c='';const a=new Uint8Array(4);crypto.getRandomValues(a);for(const b of a)c+=ROOM_ALPHABET[b%ROOM_ALPHABET.length];return c}
function roomUid(){if(typeof CLOUD!=='undefined'&&CLOUD.on()&&!netIsLocal())return CLOUD.uid();let t='';try{t=sessionStorage.getItem('sl_tab');if(!t){t='tab-'+Math.random().toString(36).slice(2,10);sessionStorage.setItem('sl_tab',t)}}catch(_){t='tab-'+LB.token().slice(0,8)}return t}
function roomName(){return (LB.name()||L('无名侠客','Nameless'))}
/* ---- transports ---- */
const FirestoreT={
  col(code){return CLOUD.db.collection('rooms').doc(code)},
  async createRoom(code,data){const ref=this.col(code);await CLOUD.db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.exists)throw new Error('exists');tx.set(ref,{...data,ts:firebase.firestore.FieldValue.serverTimestamp()})})},
  async getRoom(code){const s=await this.col(code).get();return s.exists?s.data():null},
  async setRoom(code,patch){await this.col(code).set({...patch,ts:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})},
  async setPlayer(code,uid,patch){await this.col(code).collection('players').doc(uid).set({...patch,ts:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})},
  async removePlayer(code,uid){try{await this.col(code).collection('players').doc(uid).delete()}catch(_){}},
  async addEvent(code,ev){await this.col(code).collection('events').add({...ev,ts:firebase.firestore.FieldValue.serverTimestamp()})},
  subscribe(code,h){const ref=this.col(code);let first=true;
    const u1=ref.onSnapshot(s=>h.room(s.exists?s.data():null),e=>console.warn('room',e));
    const u2=ref.collection('players').onSnapshot(s=>{const m={};s.forEach(d=>m[d.id]=d.data());h.players(m)},e=>console.warn('players',e));
    const u3=ref.collection('events').onSnapshot(s=>{if(first){first=false;return}s.docChanges().forEach(c=>{if(c.type==='added')h.event({id:c.doc.id,...c.doc.data()})})},e=>console.warn('events',e));
    return ()=>{u1();u2();u3()}},
};
const LocalT={
  key(code){return 'sl_room_'+code},
  read(code){try{return JSON.parse(localStorage.getItem(this.key(code))||'null')}catch(_){return null}},
  write(code,v){try{localStorage.setItem(this.key(code),JSON.stringify(v))}catch(_){}this.bc().postMessage({code});(this.subs||[]).forEach(f=>{if(f.code===code)setTimeout(f,0)})},
  bc(){return this._bc||(this._bc=new BroadcastChannel('sl_rooms'))},
  async createRoom(code,data){if(this.read(code))throw new Error('exists');this.write(code,{room:{...data,ts:Date.now()},players:{},events:[]})},
  async getRoom(code){const v=this.read(code);return v?v.room:null},
  async setRoom(code,patch){const v=this.read(code)||{room:{},players:{},events:[]};Object.assign(v.room,patch,{ts:Date.now()});this.write(code,v)},
  async setPlayer(code,uid,patch){const v=this.read(code);if(!v)return;v.players[uid]=Object.assign(v.players[uid]||{},patch,{ts:Date.now()});this.write(code,v)},
  async removePlayer(code,uid){const v=this.read(code);if(!v)return;delete v.players[uid];this.write(code,v)},
  async addEvent(code,ev){const v=this.read(code);if(!v)return;v.events.push({...ev,id:'e'+Date.now()+Math.random().toString(36).slice(2,6),ts:Date.now()});v.events=v.events.slice(-60);this.write(code,v)},
  subscribe(code,h){const seen=new Set((this.read(code)||{events:[]}).events.map(e=>e.id));
    const push=()=>{const v=this.read(code);h.room(v?v.room:null);h.players(v?v.players:{});if(v)v.events.forEach(e=>{if(!seen.has(e.id)){seen.add(e.id);h.event(e)}})};
    const f=m=>{if(m.data&&m.data.code===code)push()};this.bc().addEventListener('message',f);const sf=e=>{if(e.key===this.key(code))push()};addEventListener('storage',sf);push.code=code;(this.subs=this.subs||[]).push(push);setTimeout(push,0);
    return ()=>{this.bc().removeEventListener('message',f);removeEventListener('storage',sf);this.subs=this.subs.filter(x=>x!==push)}},
};
function netPick(){if(location.search.includes('local=1'))return LocalT;return (typeof CLOUD!=='undefined'&&CLOUD.on())?FirestoreT:LocalT}
function netT(){return ROOM.T||netPick()} // a room keeps the transport it was opened with, even if the cloud connects later
function netReady(ms=8000){const ok=()=>typeof CLOUD==='undefined'||!!CLOUD.user||(CLOUD.status!=='loading'&&CLOUD.status!=='ready');return new Promise(res=>{if(ok())return res();const t0=Date.now();const tick=()=>{if(ok()||Date.now()-t0>ms)return res();setTimeout(tick,150)};tick()})}
function netOnline(){return !netIsLocal()&&!ROOM.cloudFail}
function netIsLocal(){return netT()===LocalT}
/* ---- room lifecycle ---- */
/* room operations run one at a time: the lobby's auto-open and an explicit create/join can otherwise interleave and strand the player */
let roomOp=Promise.resolve();function roomQueue(fn){const p=roomOp.then(fn,fn);roomOp=p.catch(()=>{});return p}
function roomCreate(opts={}){return roomQueue(()=>roomCreateNow(opts))}
function roomJoin(code,isNew){return roomQueue(()=>roomJoinNow(code,isNew))}
async function roomCreateNow(opts={}){
  if(ROOM.code&&!opts.force)return ROOM.code; // already in a room: that one stands
  await netReady();let T=netPick();ROOM.T=T;ROOM.cloudFail=false;let uid=roomUid();let code='',tries=0;
  const mk=()=>({host:uid,mode:opts.mode||'time',len:opts.len||180,max:Math.min(8,Math.max(2,opts.max||4)),state:'lobby',map:MAPID,diff:'normal',round:0,created:Date.now()});
  while(tries++<6){code=roomCode();try{await Promise.race([T.createRoom(code,mk()),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),6000))]);break}
    catch(e){if(e.message==='exists'){code='';continue}
      if(T===FirestoreT){console.warn('cloud room unavailable, falling back to a local room',e);T=LocalT;ROOM.T=T;ROOM.cloudFail=true;uid=roomUid();code='';tries=0;continue} // cloud rooms not reachable: AI-only room on this device
      throw e}}
  if(!code)throw new Error('no code');
  await roomJoinNow(code,true);return code;
}
async function roomJoinNow(code,isNew){
  code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);if(code.length!==4)throw new Error('badcode');
  if(ROOM.code===code)return;const T=isNew?ROOM.T:netPick(),uid=roomUid();const data=await T.getRoom(code);if(!data)throw new Error('nosuch');
  if(data.state==='play'&&!isNew)throw new Error('playing');
  if(data.map&&MAPS[data.map]&&data.map!==MAPID){roomLeave(true);try{localStorage.setItem('sl_map',data.map);sessionStorage.setItem('sl_rejoin',code)}catch(_){}location.reload();return}
  roomLeave(true);ROOM.T=T;
  ROOM.code=code;ROOM.data=data;ROOM.host=data.host===uid;ROOM.joinedAt=Date.now();ROOM.playing=false;ROOM.ended=false;ROOM.results=null;ROOM.evSeen=new Set();ROOM.lastSeen={};
  await T.setPlayer(code,uid,{name:roomName(),cls:SAVE.cls,weapon:weaponOf(SAVE.cls),ready:ROOM.host,score:0,hp:1,lv:1,kills:0,alive:true,done:false,t:0,joined:Date.now(),lvA:(typeof accountLv==='function'?accountLv().lv:1)});
  ROOM.unsub=T.subscribe(code,{room:roomOnRoom,players:roomOnPlayers,event:roomOnEvent});
  try{sessionStorage.setItem('sl_rejoin',code)}catch(_){}
  SAVE.mode='room';persist();if(typeof renderTitle==='function')renderTitle();
}
function roomLeave(silent){
  if(!ROOM.code)return;const T=netT(),uid=roomUid(),code=ROOM.code;
  if(ROOM.unsub){ROOM.unsub();ROOM.unsub=null}
  T.removePlayer(code,uid);if(ROOM.host&&ROOM.data&&ROOM.data.state!=='play')T.setRoom(code,{state:'closed'});
  ROOM.code=null;ROOM.data=null;ROOM.players={};ROOM.host=false;ROOM.playing=false;ROOM.countdown=null;ROOM.T=null;
  try{sessionStorage.removeItem('sl_rejoin')}catch(_){}
  if(!silent&&typeof renderRoom==='function')renderRoom();
}
function roomSetMe(patch){if(!ROOM.code)return;return netT().setPlayer(ROOM.code,roomUid(),patch)}
function roomSetReady(v){roomSetMe({ready:!!v,cls:SAVE.cls,weapon:weaponOf(SAVE.cls),name:roomName()})}
async function roomHostSet(patch){if(!ROOM.code||!ROOM.host)return;await netT().setRoom(ROOM.code,patch)}
/* AI seats live in the room document (the host owns it), not in players/: the server only lets a player write their own player doc */
function roomAIMap(){return (ROOM.data&&ROOM.data.ai)||{}}
function aiPut(uid,patch){ROOM.aiPend=ROOM.aiPend||{};ROOM.aiPend[uid]=patch===null?null:{...(ROOM.aiPend[uid]||{}),...patch}}
async function aiFlush(){if(!ROOM.code||!ROOM.host||!ROOM.aiPend)return;const cur=roomAIMap(),next={...cur};for(const u in ROOM.aiPend){const v=ROOM.aiPend[u];next[u]=v===null?null:{...(cur[u]||{}),...v}}ROOM.aiPend=null;if(ROOM.data)ROOM.data.ai=next;try{await roomHostSet({ai:next})}catch(e){console.warn('ai seats',e)}if(typeof renderRoom==='function')renderRoom()}
function roomPlayerList(){const now=Date.now();const ai=Object.entries(roomAIMap()).filter(([u,v])=>v).map(([uid,p])=>({uid,...p,ai:true}));return Object.entries(ROOM.players).filter(([uid,p])=>p.ai||uid===roomUid()||now-(ROOM.lastSeen[uid]||now)<70000).map(([uid,p])=>({uid,...p})).concat(ai).sort((a,b)=>(a.joined||0)-(b.joined||0))}
/* ---- AI seats: opponents the host adds; the host's client plays them as score bots calibrated to the host's league ---- */
const AI_NAMES=[['无名剑客','Nameless Blade'],['黑衣客','Dark Robe'],['醉道人','Drunk Taoist'],['冷面僧','Stone Monk'],['夜游神','Night Walker'],['笑面狐','Smiling Fox'],['铁扇子','Iron Fan'],['小旋风','Little Whirlwind']];
function roomAICount(){return roomPlayerList().filter(p=>p.ai).length}
async function roomAddAI(){if(!ROOM.code||!ROOM.host)return;const ps=roomPlayerList();if(ps.length>=(ROOM.data.max||4))return;const n=roomAICount();const cls=pick(Object.keys(CLASSES)),nm=AI_NAMES[n%AI_NAMES.length];const li=typeof ladderIdx==='function'?ladderIdx(SAVE.trophies||0):0;
  aiPut('ai-'+n+'-'+Date.now().toString(36),{ai:true,name:L(nm[0],nm[1]),cls,weapon:weaponOf(cls),ready:true,score:0,hp:1,lv:1,kills:0,alive:true,done:false,t:0,joined:Date.now(),lvA:3+li*4,skill:clamp(.55+li*.12+Math.random()*.25,.4,1.6)});await aiFlush()}
async function roomRemoveAI(uid){if(!ROOM.code||!ROOM.host)return;if(ROOM.players[uid])await netT().removePlayer(ROOM.code,uid);aiPut(uid,null);await aiFlush()}
/* the host advances every AI seat once a second: a score curve that accelerates like a real build, a level that climbs, an HP line that dips and recovers, and in endless mode a fall at some point */
function roomAITick(){if(!ROOM.host||!ROOM.data||!ROOM.playing)return;const d=ROOM.data,len=d.mode==='time'?d.len:600;const wall=Math.max(0,(Date.now()-((d.startedAt||Date.now())+(d.delay||0)))/1000),hostT=(G&&!G.auto&&G.room)?G.t:0;let t=Math.max(wall,hostT);if(G&&!G.auto&&G.room&&G.over&&d.mode==='time')t=Math.max(t,len); // AI seats follow the host's clock; when the host's run is over the AIs finish too
  for(const p of roomPlayerList()){if(!p.ai||p.done)continue;const k=p.skill||.8;
    if(G&&!G.auto&&G.room&&G.rival&&G.rivalSeat===p.uid){const R=G.rival;const over=(d.mode==='time'&&t>=len)||!!G.over;aiPut(p.uid,{score:R.score,lv:R.lv,hp:Math.max(0,R.hp/R.maxHp),kills:R.kills,alive:true,done:over,t:Math.round(Math.min(t,len)),bosses:R.bosses||0,x:Math.round(R.x),y:Math.round(R.y)});continue}const final=(520+280*k)*(len/180);const f=Math.min(1,t/len);let score=Math.round(final*Math.pow(f,1.55)*(1+Math.sin(t*.37+k*9)*.03));const lv=Math.max(1,Math.round(1+Math.sqrt(t)*(.9+k*.5)));const hp=clamp(.55+.45*Math.sin(t*.21+k*5)*Math.cos(t*.07),.12,1);const kills=Math.round(score/2.4);
    let alive=true,done=false;if(d.mode==='last'){const fallAt=(150+k*260);if(t>=fallAt){alive=false;done=true;score=Math.round(final*Math.pow(fallAt/len,1.55))}}else if(t>=len){done=true;score=Math.round(final*(1+Math.sin(k*9)*.03))}
    const pos=roomAIPos(p.uid,k);aiPut(p.uid,{score,lv,hp:alive?hp:0,kills,alive,done,t:Math.round(Math.min(t,len)),bosses:Math.floor(t/240),x:pos.x,y:pos.y})}
  ROOM.aiN=(ROOM.aiN||0)+1;if(ROOM.aiN%2===0||roomPlayerList().some(p=>p.ai&&ROOM.aiPend&&ROOM.aiPend[p.uid]&&ROOM.aiPend[p.uid].done))aiFlush()}
/* an AI seat wanders the arena (one step per tick) so the others see a hero fighting somewhere, not just a number on the board */
function roomAIPos(uid,k){ROOM.aiPos=ROOM.aiPos||{};let s=ROOM.aiPos[uid];const bounds=()=>({w:typeof W!=='undefined'?W:2600,h:typeof H!=='undefined'?H:2000});const {w,h}=bounds();
  if(!s){const a=Math.random()*Math.PI*2;s=ROOM.aiPos[uid]={x:w/2+Math.cos(a)*300,y:h/2+Math.sin(a)*240,tx:0,ty:0,rest:0};}
  if(s.rest>0){s.rest--;return {x:Math.round(s.x),y:Math.round(s.y)}}
  if(!s.tx||Math.hypot(s.tx-s.x,s.ty-s.y)<40){s.tx=80+Math.random()*(w-160);s.ty=80+Math.random()*(h-160);if(Math.random()<.35)s.rest=1+Math.floor(Math.random()*2)}
  const sp=70+k*40,dx=s.tx-s.x,dy=s.ty-s.y,d=Math.hypot(dx,dy)||1,st=Math.min(d,sp);s.x+=dx/d*st;s.y+=dy/d*st;return {x:Math.round(s.x),y:Math.round(s.y)}}
/* lobby heartbeat so stale players (closed tab, lost connection) drop out of the list; leaving on unload */
setInterval(()=>{if(ROOM.code&&!ROOM.playing)roomSetMe({beat:Date.now()})},20000);
setInterval(()=>{if(ROOM.code&&ROOM.playing&&ROOM.host)roomAITick()},1000); // AI seats keep moving even after the host's own run has ended
addEventListener('pagehide',()=>{if(ROOM.code&&!ROOM.playing)roomLeave(true)});
function roomLinkWait(){if(!ROOM.host||typeof linkOpenTo!=='function'||typeof RTCPeerConnection==='undefined')return 0;const now=Date.now();let w=0;for(const p of roomPlayerList()){if(p.ai||p.uid===roomUid()||linkOpenTo(p.uid))continue;const t0=(ROOM.firstSeen||{})[p.uid]||now;w=Math.max(w,20000-(now-t0))}return Math.max(0,w)}
function roomCanStart(){const ps=roomPlayerList();return ROOM.host&&ps.length>=2&&ps.every(p=>p.ready||p.ai)&&roomLinkWait()<=0}
async function roomStart(){
  if(!roomCanStart())return;const seed=(Math.floor(Math.random()*2**31)|1);
  await roomHostSet({state:'play',seed,round:(ROOM.data.round||0)+1,startedAt:Date.now(),delay:4000});
}
async function roomBackToLobby(){if(!ROOM.host)return;await roomHostSet({state:'lobby'});await roomSetMe({ready:true,score:0,hp:1,lv:1,kills:0,alive:true,done:false,t:0});for(const p of roomPlayerList())if(p.ai)aiPut(p.uid,{score:0,hp:1,lv:1,kills:0,alive:true,done:false,t:0});await aiFlush()}
/* ---- snapshots ---- */
function roomOnRoom(data){
  if(!ROOM.code)return;
  if(!data||data.state==='closed'){const was=ROOM.code;roomLeave(true);ROOM.status=L('房间已关闭','The room was closed');if(typeof renderRoom==='function')renderRoom();if(typeof showBanner==='function'&&G&&!G.auto)showBanner('房间已关闭','Room closed',2);return}
  const prev=ROOM.data;ROOM.data=data;ROOM.host=data.host===roomUid();
  if(data.state==='play'&&(!prev||prev.state!=='play'||prev.round!==data.round)&&!ROOM.playing&&!ROOM.countdown){roomBeginCountdown(data)}
  if(data.state==='lobby'&&prev&&prev.state==='play'){ROOM.playing=false;ROOM.ended=false;ROOM.results=null;ROOM.countdown=null;if(G&&!G.auto&&!G.over){G.abandoned=true;closeCards();lose()}
    if(!ROOM.host)roomSetMe({ready:false,score:0,hp:1,lv:1,kills:0,alive:true,done:false,t:0});
    if(!$('#end').hidden&&typeof toLobby==='function'){toLobby();showScreen('hero')}
    if(typeof renderRoom==='function')renderRoom()}
  if(ROOM.playing&&G&&!G.auto){roomCheckFinished();if(typeof drawRoomBoard==='function')drawRoomBoard()} // AI seats arrive with the room document
  if(typeof renderRoom==='function')renderRoom();
}
function roomOnPlayers(map){
  if(!ROOM.code)return;const now=Date.now();ROOM.firstSeen=ROOM.firstSeen||{};for(const uid in map){if(!ROOM.firstSeen[uid])ROOM.firstSeen[uid]=now;const p=map[uid],old=ROOM.players[uid];if(!old||JSON.stringify(old)!==JSON.stringify(p))ROOM.lastSeen[uid]=now}
  ROOM.players=map;
  if(ROOM.playing&&G&&!G.auto){
    if(ROOM.data&&ROOM.data.mode==='last'&&!G.over){const dead=roomPlayerList().find(p=>p.uid!==roomUid()&&p.alive===false);if(dead){roomEndRun('last',dead)}}
    roomCheckFinished();
    if(typeof drawRoomBoard==='function')drawRoomBoard();
  }
  if(typeof renderRoom==='function')renderRoom();
}
function roomOnEvent(ev){
  if(!ROOM.code||!ev||ev.from===roomUid()||ROOM.evSeen.has(ev.id))return;ROOM.evSeen.add(ev.id);
  if(ev.k==='rtc'){if(typeof linkOnSignal==='function')linkOnSignal(ev);return}
  if(G&&G.shared)return;
  if(!ROOM.playing||!G||G.auto||G.over)return;
  if(ev.k==='wave'){const n=Math.min(16,ev.n||6),P=G.P;for(let i=0;i<n;i++){const a=i/n*TAU+SIMR()*.3,d=150+SIMR()*60;spawnEnemy(ev.big?'bandit':'assassin',clamp(P.x+Math.cos(a)*d,30,W-30),clamp(P.y+Math.sin(a)*d,30,H-30),1.1)}
    showBanner(`${ev.name||'?'} 送来 ${n} 名伏兵!`,`${ev.name||'?'} sent ${n} ambushers!`,1.6);trauma(.25);if(typeof SFX!=='undefined')SFX.throw()}
}
function roomSendWave(n,big){if(!ROOM.code||!ROOM.playing||(G&&G.shared))return;netT().addEvent(ROOM.code,{from:roomUid(),name:roomName(),k:'wave',n,big:!!big})}
/* ---- match flow ---- */
function roomBeginCountdown(data){
  ROOM.seed=data.seed;ROOM.countdown=Date.now()+(data.delay||4000);ROOM.ended=false;ROOM.results=null;ROOM.evSeen=new Set();
  if(ROOM.playing)return;
  const tick=()=>{if(!ROOM.countdown)return;const left=ROOM.countdown-Date.now();const el=$('#roomcount');if(left<=0){ROOM.countdown=null;if(el)el.hidden=true;ROOM.playing=true;if(typeof startRun==='function')startRun();return}
    if(el){el.hidden=false;el.innerHTML=`<small>${L('对决即将开始','Match starting')}</small><b>${Math.ceil(left/1000)}</b><span>${roomPlayerList().map(p=>`${CLASSES[p.cls]?CLASSES[p.cls].g:'?'} ${p.name}`).join(' · ')}</span>`}
    setTimeout(tick,100)};tick();
}
function roomNetTick(dt){
  if(!ROOM.code||!ROOM.playing||!G||G.auto)return;ROOM.sendT-=dt;
  if(ROOM.sendT<=0){ROOM.sendT=.6;const P=G.P;roomSetMe({x:Math.round(P.x),y:Math.round(P.y),score:G.score,hp:Math.max(0,P.hp/P.maxHp),lv:G.lv,kills:G.kills,alive:!G.over||G.over==='pk',done:!!G.ended||!!ROOM.ended,t:Math.round(G.t),cls:G.cls,bosses:G.bossSlain});if(typeof drawRoomBoard==='function')drawRoomBoard()}
  const d=ROOM.data;if(d&&d.mode==='time'&&!G.over){const wall=d.startedAt?(Date.now()-(d.startedAt+(d.delay||0)))/1000:G.t;if(G.t>=d.len||wall>=d.len)roomEndRun('time')}
}
function roomEndRun(why,who){
  if(!G||G.over)return;closeCards();G.over='pk';G.slow=1.2;G.flash=.6;trauma(.3);ROOM.endWhy=why;ROOM.endWho=who;
  later(1.4,()=>showEnd(true));if(typeof SFX!=='undefined')SFX.win();
}
function roomOnDeath(){ // called by lose(): in a room, a death is final and tells the others
  if(!ROOM.code||!ROOM.playing)return;ROOM.endWhy=ROOM.data.mode==='last'?'last':'time';ROOM.endWho={uid:roomUid()};
  roomSetMe({alive:false,done:true,score:G.score,hp:0,t:Math.round(G.t),lv:G.lv,kills:G.kills});
}
function roomAllDone(){const ps=roomPlayerList(),now=Date.now();return ps.length>0&&ps.every(p=>p.done||p.alive===false||(!p.ai&&now-(ROOM.lastSeen[p.uid]||now)>25000))}
function roomCheckFinished(){if(ROOM.results||!ROOM.ended)return;if(roomAllDone()){ROOM.results=roomRank();if(typeof renderRoomResults==='function')renderRoomResults()}}
function roomRank(){
  const ps=roomPlayerList(),mode=ROOM.data?ROOM.data.mode:'time';
  return ps.slice().sort((a,b)=>{const ad=a.alive===false?1:0,bd=b.alive===false?1:0;if(mode==='last'&&ad!==bd)return ad-bd;return (b.score||0)-(a.score||0)||(b.t||0)-(a.t||0)});
}
function roomMyRank(){const r=roomRank();return r.findIndex(p=>p.uid===roomUid())+1}
/* share link and auto-join */
function roomLink(code){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('room',code);return u.toString()}
async function roomAutoJoin(){
  let code=null;try{code=new URL(location.href).searchParams.get('room')||sessionStorage.getItem('sl_rejoin')}catch(_){}
  if(!code)return;if(typeof CLOUD!=='undefined'&&!CLOUD.on()&&!netIsLocal()){setTimeout(roomAutoJoin,800);return}
  try{await roomJoin(code);if(typeof showScreen==='function')showScreen('hero');if(location.search.includes('room='))history.replaceState(null,'',location.pathname)}catch(e){ROOM.status=roomErr(e);try{sessionStorage.removeItem('sl_rejoin')}catch(_){}if(typeof renderRoom==='function')renderRoom()}
}
function roomErr(e){const m=e&&e.message||'';return m==='nosuch'?(netOnline()?L('没有这个房间,检查一下房间码','No such room — check the code'):L('没找到房间:联机暂不可用,检查一下网络','Room not found: online rooms are unavailable — check your connection')):m==='badcode'?L('房间码是 4 位字母数字','Room codes are 4 letters/digits'):m==='playing'?L('这个房间正在对局中','That room is mid-match'):L('连接失败:','Connection failed: ')+m}
