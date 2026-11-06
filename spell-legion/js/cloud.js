'use strict';
/* cloud.js — accounts and cloud save on Firebase (Auth + Firestore).
   Guest by default (anonymous account, created silently), optional Google sign-in that links the guest account.
   Everything degrades to the local save if Firebase cannot be reached (blocked network, offline). */
const FIREBASE_CONFIG={apiKey:"AIzaSyDeI9V8qBVB2B1lqZP5BaedYhaToHfs6Z8",authDomain:"spell-legion.firebaseapp.com",projectId:"spell-legion",storageBucket:"spell-legion.firebasestorage.app",messagingSenderId:"657647239907",appId:"1:657647239907:web:339874a2e3fca9cc833bd6"};
const FB_VER='10.14.1';
const CLOUD={ready:false,user:null,db:null,auth:null,status:'off',pushT:0,lastPushed:'',
  on(){return this.ready&&!!this.user},
  uid(){return this.user?this.user.uid:null},
  isGuest(){return !!(this.user&&this.user.isAnonymous)},
  label(){if(!this.ready)return this.status==='loading'?L('连接中…','connecting…'):L('离线','offline');if(!this.user)return L('未登录','not signed in');return this.isGuest()?L('游客','Guest'):(this.user.displayName||this.user.email||L('已登录','signed in'))},
};
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=res;s.onerror=()=>rej(new Error('load '+src));document.head.appendChild(s)})}
async function cloudInit(){
  CLOUD.status='loading';renderAccount();
  try{
    const base=`https://www.gstatic.com/firebasejs/${FB_VER}/`;
    await Promise.race([Promise.all([loadScript(base+'firebase-app-compat.js')]).then(()=>Promise.all([loadScript(base+'firebase-auth-compat.js'),loadScript(base+'firebase-firestore-compat.js')])),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),12000))]);
    firebase.initializeApp(FIREBASE_CONFIG);
    CLOUD.auth=firebase.auth();CLOUD.db=firebase.firestore();
    try{await CLOUD.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)}catch(_){}
    CLOUD.ready=true;CLOUD.status='ready';
    CLOUD.auth.onAuthStateChanged(async u=>{
      CLOUD.user=u;renderAccount();
      if(!u){try{await CLOUD.auth.signInAnonymously()}catch(e){console.warn('anon sign-in failed',e);CLOUD.status='noauth';renderAccount()}return}
      await cloudPull();renderAccount();
    });
  }catch(e){console.warn('cloud unavailable',e);CLOUD.ready=false;CLOUD.status='off';renderAccount()}
}
/* ---- save merge: never lose progress from either side ---- */
function mergeSave(local,cloud){
  if(!cloud)return local;const out=JSON.parse(JSON.stringify(local));
  const max=k=>{out[k]=Math.max(+local[k]||0,+cloud[k]||0)};['gold','axp','best','wins','runs','bosses','pkBest'].forEach(max);
  out.up=Object.assign({},cloud.up||{});for(const k in (local.up||{}))out.up[k]=Math.max(out.up[k]||0,local.up[k]||0);
  ['weaponOwned','ach','clsWins','tips'].forEach(k=>{out[k]=Object.assign({},cloud[k]||{},local[k]||{})});
  if(cloud.pk||local.pk)out.pk={w:(cloud.pk?.w||0)>(local.pk?.w||0)?cloud.pk.w:(local.pk?.w||0),l:Math.max(cloud.pk?.l||0,local.pk?.l||0)};
  const newer=(+cloud.ts||0)>(+local.ts||0)?cloud:local;
  ['cls','weapon','mode','diff','autocast','name'].forEach(k=>{if(newer[k]!==undefined)out[k]=newer[k]});
  const dayOf=o=>o&&o.tasks&&o.tasks.day||0;out.tasks=dayOf(cloud)>dayOf(local)?cloud.tasks:dayOf(local)>dayOf(cloud)?local.tasks:(local.tasks||cloud.tasks);
  if(out.tasks&&cloud.tasks&&local.tasks&&cloud.tasks.day===local.tasks.day){out.tasks.list=local.tasks.list.map((t,i)=>{const c=cloud.tasks.list[i];return c&&c.id===t.id?{...t,p:Math.max(t.p||0,c.p||0),done:t.done||c.done}:t})}
  const sd=o=>o&&o.streak&&o.streak.last||0;out.streak=sd(cloud)>sd(local)?cloud.streak:local.streak||cloud.streak;
  const dd=o=>o&&o.daily&&o.daily.day||0;out.daily=dd(cloud)>dd(local)?cloud.daily:dd(local)>dd(cloud)?local.daily:(local.daily&&cloud.daily?(local.daily.best>=cloud.daily.best?local.daily:cloud.daily):(local.daily||cloud.daily));
  out.ts=Math.max(+local.ts||0,+cloud.ts||0);return out;
}
async function cloudPull(){
  if(!CLOUD.on())return;
  try{const snap=await CLOUD.db.collection('saves').doc(CLOUD.uid()).get();const data=snap.exists?snap.data():null;
    if(data&&data.save){const merged=mergeSave(SAVE,data.save);Object.assign(SAVE,merged);persist(true)}
    await cloudPush(true);
    if(typeof renderTitle==='function'&&!document.querySelector('#title').hidden)renderTitle();
  }catch(e){console.warn('pull failed',e)}
}
async function cloudPush(now){
  if(!CLOUD.on())return;
  const body=JSON.stringify(SAVE);if(body===CLOUD.lastPushed&&!now)return;const clean=JSON.parse(body); // Firestore rejects undefined fields; JSON round-trip drops them
  try{await CLOUD.db.collection('saves').doc(CLOUD.uid()).set({save:clean,ts:firebase.firestore.FieldValue.serverTimestamp()});CLOUD.lastPushed=body;CLOUD.syncErr='';
    const a=typeof accountLv==='function'?accountLv():{lv:1};const t=typeof titleFor==='function'?titleFor(a.lv):['','',''];
    await CLOUD.db.collection('profiles').doc(CLOUD.uid()).set({name:LB.name()||'无名侠客',lv:a.lv,title:t[1],guest:CLOUD.isGuest(),ts:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  }catch(e){console.warn('push failed',e);CLOUD.syncErr=String(e&&e.message||e).slice(0,80);renderAccount()}
}
function cloudSchedulePush(){if(!CLOUD.on())return;clearTimeout(CLOUD.pushT);CLOUD.pushT=setTimeout(()=>cloudPush(false),2500)}
/* ---- Google sign-in: link the guest account so nothing is lost; if the Google account already has a save, merge into it ---- */
async function cloudGoogle(){
  if(!CLOUD.ready)return showMsg(L('无法连接账号服务','Account service unreachable'));
  const prov=new firebase.auth.GoogleAuthProvider();
  try{
    if(CLOUD.user&&CLOUD.user.isAnonymous){
      try{await CLOUD.user.linkWithPopup(prov)}
      catch(e){if(e.code==='auth/credential-already-in-use'){const local=JSON.parse(JSON.stringify(SAVE));await CLOUD.auth.signInWithCredential(e.credential);Object.assign(SAVE,local);SAVE.ts=Date.now()}else throw e}
    }else await CLOUD.auth.signInWithPopup(prov);
    showMsg(L('已登录 Google','Signed in with Google'));
  }catch(e){console.warn(e);showMsg(L('登录未完成','Sign-in not completed'))}
}
async function cloudSignOut(){if(!CLOUD.ready)return;try{await CLOUD.auth.signOut()}catch(_){}showMsg(L('已退出,继续以游客身份游玩','Signed out; playing as guest'))}
function showMsg(t){const el=$('#accmsg');if(el){el.textContent=t;setTimeout(()=>{if(el.textContent===t)el.textContent=''},5000)}}
function renderAccount(){
  if(typeof renderStatus==='function')renderStatus();
  const el=$('#account');if(!el)return;
  const guest=!CLOUD.on()||CLOUD.isGuest();
  el.innerHTML=`<span class="who"><i class="dot ${CLOUD.on()?'on':''}"></i>${CLOUD.label()}</span>${CLOUD.ready?(guest?`<button type="button" class="go sm" id="googlebtn">${L('Google 登录','Sign in with Google')}</button>`:`<button type="button" class="go sm alt" id="signoutbtn">${L('退出','Sign out')}</button>`):''}<small>${CLOUD.syncErr?L('云端同步失败,进度暂时仅保存在本机:','Cloud sync failed; progress is saved on this device only: ')+CLOUD.syncErr:CLOUD.on()?(guest?L('游客进度已云端保存在此设备;登录 Google 可跨设备同步','Guest progress is cloud-saved for this device; sign in to sync across devices'):L('进度已跨设备同步','Progress syncs across your devices')):L('账号服务不可用,进度保存在本机','Account service unreachable; progress stays on this device')}</small><span id="accmsg" class="note"></span>`;
  const g=$('#googlebtn');if(g)g.onclick=cloudGoogle;const so=$('#signoutbtn');if(so)so.onclick=cloudSignOut;
}
/* ---- leaderboard on Firestore ---- */
const CLB={
  async fetch(board,filters={}){
    const col=board==='today'?CLOUD.db.collection('days').doc(String(dayKey())).collection('runs'):CLOUD.db.collection('runs');
    const snap=await col.orderBy('time','desc').limit(200).get();
    let rows=snap.docs.map(d=>d.data());
    for(const k of ['map','diff','cls','mode'])if(filters[k])rows=rows.filter(r=>r[k]===filters[k]);
    const best={};for(const r of rows){const k=r.uid||r.name;if(!best[k]||r.time>best[k].time)best[k]=r}
    rows=Object.values(best).sort((a,b)=>b.time-a.time);
    const mine=rows.findIndex(r=>r.uid===CLOUD.uid());
    return {ok:true,count:rows.length,myRank:mine>=0?mine+1:null,rows:rows.slice(0,50)};
  },
  async submit(run){
    if(!CLOUD.on())return {ok:false,error:'disabled'};
    const doc={name:String(run.name||'无名侠客').slice(0,16),cls:run.cls,map:run.map,diff:run.diff,mode:run.mode||'solo',time:Math.round(run.time),kills:Math.round(run.kills),bosses:Math.round(run.bosses),level:Math.round(run.level),combo:Math.round(run.combo),relics:Math.round(run.relics),score:Math.round(run.score||0),day:run.day||dayKey(),tier:Math.round(run.tier||0),uid:CLOUD.uid(),ts:firebase.firestore.FieldValue.serverTimestamp()};
    try{await CLOUD.db.collection('runs').add(doc);await CLOUD.db.collection('days').doc(String(doc.day)).collection('runs').add(doc);return {ok:true}}
    catch(e){console.warn('submit failed',e);return {ok:false,error:e.code==='permission-denied'?'implausible':'network'}}
  }
};
