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
function netT(){if(location.search.includes('local=1'))return LocalT;return (typeof CLOUD!=='undefined'&&CLOUD.on())?FirestoreT:LocalT}
function netIsLocal(){return netT()===LocalT}
/* ---- room lifecycle ---- */
async function roomCreate(opts={}){
  const T=netT(),uid=roomUid();let code='',tries=0;
  while(tries++<6){code=roomCode();try{await T.createRoom(code,{host:uid,mode:opts.mode||'time',len:opts.len||180,max:Math.min(8,Math.max(2,opts.max||4)),state:'lobby',map:MAPID,diff:'normal',round:0,created:Date.now()});break}catch(e){if(e.message!=='exists')throw e;code=''}}
  if(!code)throw new Error('no code');
  await roomJoin(code,true);return code;
}
async function roomJoin(code,isNew){
  code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);if(code.length!==4)throw new Error('badcode');
  const T=netT(),uid=roomUid();const data=await T.getRoom(code);if(!data)throw new Error('nosuch');
  if(data.state==='play'&&!isNew)throw new Error('playing');
  if(data.map&&MAPS[data.map]&&data.map!==MAPID){roomLeave(true);try{localStorage.setItem('sl_map',data.map);sessionStorage.setItem('sl_rejoin',code)}catch(_){}location.reload();return}
  roomLeave(true);
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
  ROOM.code=null;ROOM.data=null;ROOM.players={};ROOM.host=false;ROOM.playing=false;ROOM.countdown=null;
  try{sessionStorage.removeItem('sl_rejoin')}catch(_){}
  if(!silent&&typeof renderRoom==='function')renderRoom();
}
function roomSetMe(patch){if(!ROOM.code)return;return netT().setPlayer(ROOM.code,roomUid(),patch)}
function roomSetReady(v){roomSetMe({ready:!!v,cls:SAVE.cls,weapon:weaponOf(SAVE.cls),name:roomName()})}
async function roomHostSet(patch){if(!ROOM.code||!ROOM.host)return;await netT().setRoom(ROOM.code,patch)}
function roomPlayerList(){const now=Date.now();return Object.entries(ROOM.players).filter(([uid])=>uid===roomUid()||now-(ROOM.lastSeen[uid]||now)<70000).map(([uid,p])=>({uid,...p})).sort((a,b)=>(a.joined||0)-(b.joined||0))}
/* lobby heartbeat so stale players (closed tab, lost connection) drop out of the list; leaving on unload */
setInterval(()=>{if(ROOM.code&&!ROOM.playing)roomSetMe({beat:Date.now()})},20000);
addEventListener('pagehide',()=>{if(ROOM.code&&!ROOM.playing)roomLeave(true)});
function roomCanStart(){const ps=roomPlayerList();return ROOM.host&&ps.length>=2&&ps.every(p=>p.ready)}
async function roomStart(){
  if(!roomCanStart())return;const seed=(Math.floor(Math.random()*2**31)|1);
  await roomHostSet({state:'play',seed,round:(ROOM.data.round||0)+1,startedAt:Date.now(),delay:4000});
}
async function roomBackToLobby(){if(!ROOM.host)return;await roomHostSet({state:'lobby'});await roomSetMe({ready:true,score:0,hp:1,lv:1,kills:0,alive:true,done:false,t:0})}
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
  if(typeof renderRoom==='function')renderRoom();
}
function roomOnPlayers(map){
  if(!ROOM.code)return;const now=Date.now();for(const uid in map){const p=map[uid],old=ROOM.players[uid];if(!old||JSON.stringify(old)!==JSON.stringify(p))ROOM.lastSeen[uid]=now}
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
  if(!ROOM.playing||!G||G.auto||G.over)return;
  if(ev.k==='wave'){const n=Math.min(16,ev.n||6),P=G.P;for(let i=0;i<n;i++){const a=i/n*TAU+SIMR()*.3,d=150+SIMR()*60;spawnEnemy(ev.big?'bandit':'assassin',clamp(P.x+Math.cos(a)*d,30,W-30),clamp(P.y+Math.sin(a)*d,30,H-30),1.1)}
    showBanner(`${ev.name||'?'} 送来 ${n} 名伏兵!`,`${ev.name||'?'} sent ${n} ambushers!`,1.6);trauma(.25);if(typeof SFX!=='undefined')SFX.throw()}
}
function roomSendWave(n,big){if(!ROOM.code||!ROOM.playing)return;netT().addEvent(ROOM.code,{from:roomUid(),name:roomName(),k:'wave',n,big:!!big})}
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
  if(ROOM.sendT<=0){ROOM.sendT=1;const P=G.P;roomSetMe({score:G.score,hp:Math.max(0,P.hp/P.maxHp),lv:G.lv,kills:G.kills,alive:!G.over||G.over==='pk',done:!!G.ended||!!ROOM.ended,t:Math.round(G.t),cls:G.cls,bosses:G.bossSlain});if(typeof drawRoomBoard==='function')drawRoomBoard()}
  const d=ROOM.data;if(d&&d.mode==='time'&&G.t>=d.len&&!G.over)roomEndRun('time');
}
function roomEndRun(why,who){
  if(!G||G.over)return;closeCards();G.over='pk';G.slow=1.2;G.flash=.6;trauma(.3);ROOM.endWhy=why;ROOM.endWho=who;
  later(1.4,()=>showEnd(true));if(typeof SFX!=='undefined')SFX.win();
}
function roomOnDeath(){ // called by lose(): in a room, a death is final and tells the others
  if(!ROOM.code||!ROOM.playing)return;ROOM.endWhy=ROOM.data.mode==='last'?'last':'time';ROOM.endWho={uid:roomUid()};
  roomSetMe({alive:false,done:true,score:G.score,hp:0,t:Math.round(G.t),lv:G.lv,kills:G.kills});
}
function roomAllDone(){const ps=roomPlayerList(),now=Date.now();return ps.length>0&&ps.every(p=>p.done||p.alive===false||(now-(ROOM.lastSeen[p.uid]||now)>25000))}
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
function roomErr(e){const m=e&&e.message||'';return m==='nosuch'?L('没有这个房间','No such room'):m==='badcode'?L('房间码是 4 位字母数字','Room codes are 4 letters/digits'):m==='playing'?L('这个房间正在对局中','That room is mid-match'):L('连接失败:','Connection failed: ')+m}
