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
      await cloudPull();renderAccount();if(typeof lbMenuRank==='function')lbMenuRank();
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
    if(data&&data.save){const merged=mergeSave(SAVE,data.save);Object.assign(SAVE,merged);if(typeof normalizeSave==='function')normalizeSave();persist(true)}
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
/* ---- email + password: register links the guest account (progress kept); sign-in merges the local save into the account's cloud save on pull ---- */
const AUTH_MSG={'auth/invalid-email':['邮箱格式不对','That email does not look right'],'auth/weak-password':['密码至少 6 位','Password needs 6+ characters'],'auth/email-already-in-use':['这个邮箱已注册,请直接登录','Already registered — sign in instead'],'auth/wrong-password':['密码不对','Wrong password'],'auth/invalid-credential':['邮箱或密码不对','Wrong email or password'],'auth/invalid-login-credentials':['邮箱或密码不对','Wrong email or password'],'auth/user-not-found':['没有这个账号,先注册','No account with this email — register first'],'auth/too-many-requests':['试得太多了,稍后再试','Too many attempts; try again later'],'auth/operation-not-allowed':['邮箱登录暂未开通','Email sign-in is not enabled yet'],'auth/network-request-failed':['网络不通','Network error'],'auth/missing-password':['请输入密码','Enter a password']};
function authMsg(e){const m=AUTH_MSG[e&&e.code];return m?L(m[0],m[1]):L('没成功,再试一次','Did not work; try again')}
function emailForm(){const f=$('#emailform');if(!f)return null;const em=(f.querySelector('.em').value||'').trim(),pw=f.querySelector('.pw').value||'';return {em,pw}}
async function cloudEmail(kind){
  if(!CLOUD.ready)return showMsg(L('无法连接账号服务','Account service unreachable'));
  const v=emailForm();if(!v)return;if(!v.em)return showMsg(L('请输入邮箱','Enter your email'));
  try{
    if(kind==='reset'){await CLOUD.auth.sendPasswordResetEmail(v.em);return showMsg(L('重置邮件已发送,请查收','Reset email sent — check your inbox'))}
    if(!v.pw)return showMsg(L('请输入密码','Enter a password'));
    if(kind==='signup'){
      if(CLOUD.user&&CLOUD.user.isAnonymous){const cred=firebase.auth.EmailAuthProvider.credential(v.em,v.pw);await CLOUD.user.linkWithCredential(cred);CLOUD.user=CLOUD.auth.currentUser;await cloudPush(true);renderAccount()}
      else await CLOUD.auth.createUserWithEmailAndPassword(v.em,v.pw);
      try{await CLOUD.auth.currentUser.sendEmailVerification()}catch(_){}
      showMsg(L('注册成功,进度已绑定到邮箱','Registered — your progress is now tied to this email'));
    }else{
      const local=JSON.parse(JSON.stringify(SAVE));await CLOUD.auth.signInWithEmailAndPassword(v.em,v.pw);Object.assign(SAVE,local);SAVE.ts=Date.now(); // onAuthStateChanged pulls and merges with the account's cloud save
      showMsg(L('已登录','Signed in'));
    }
    CLOUD.emailOpen=false;
  }catch(e){console.warn(e);showMsg(authMsg(e))}
}
async function cloudSignOut(){if(!CLOUD.ready)return;try{await CLOUD.auth.signOut()}catch(_){}showMsg(L('已退出,继续以游客身份游玩','Signed out; playing as guest'))}
function showMsg(t){const el=$('#accmsg');if(el){el.textContent=t;setTimeout(()=>{if(el.textContent===t)el.textContent=''},5000)}}
function renderAccount(){
  if(typeof renderStatus==='function')renderStatus();
  const el=$('#account');if(!el)return;
  const guest=!CLOUD.on()||CLOUD.isGuest();
  const who=(()=>{const u=CLOUD.user;if(!CLOUD.ready)return CLOUD.label();if(!u)return L('未登录','Not signed in');if(CLOUD.isGuest())return L('游客','Guest');const n=u.displayName||(u.email||'').split('@')[0]||L('已登录','Signed in');return n.length>18?n.slice(0,17)+'…':n})();el.innerHTML=`<span class="who" title="${CLOUD.user&&CLOUD.user.email||''}"><i class="dot ${CLOUD.on()?'on':''}"></i>${who}</span>${CLOUD.ready?(guest?`<button type="button" class="go sm" id="googlebtn">${L('Google 登录','Google')}</button><button type="button" class="go sm alt${CLOUD.emailOpen?' on':''}" id="emailbtn">${L('邮箱','Email')}</button>${CLOUD.emailOpen?`<form id="emailform" autocomplete="on" onsubmit="return false"><input class="em" type="email" placeholder="${L('邮箱','email')}" autocomplete="email" value="${CLOUD.emailDraft||''}"><input class="pw" type="password" placeholder="${L('密码(至少 6 位)','password (6+)')}" autocomplete="current-password" minlength="6"><div class="eb"><button type="button" class="go sm" data-k="signin">${L('登录','Sign in')}</button><button type="button" class="go sm alt" data-k="signup">${L('注册','Register')}</button><button type="button" class="lnk" data-k="reset">${L('忘记密码','Forgot?')}</button></div></form>`:''}`:`<button type="button" class="go sm alt" id="signoutbtn">${L('退出','Sign out')}</button>`):''}<small>${CLOUD.syncErr?L('云端同步失败,进度暂时仅保存在本机:','Cloud sync failed; progress is saved on this device only: ')+CLOUD.syncErr:CLOUD.on()?(guest?L('登录后多设备同步','Sign in to sync devices'):L('进度已跨设备同步','Progress syncs across your devices')):L('账号服务不可用,进度保存在本机','Account service unreachable; progress stays on this device')}</small><span id="accmsg" class="note"></span>`;
  const g=$('#googlebtn');if(g)g.onclick=cloudGoogle;const so=$('#signoutbtn');if(so)so.onclick=cloudSignOut;
  const eb=$('#emailbtn');if(eb)eb.onclick=()=>{CLOUD.emailOpen=!CLOUD.emailOpen;renderAccount();if(CLOUD.emailOpen){const i=$('#emailform .em');if(i)i.focus()}};
  const f=$('#emailform');if(f){f.querySelector('.em').oninput=e=>{CLOUD.emailDraft=e.target.value};f.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>cloudEmail(b.dataset.k));f.querySelector('.pw').onkeydown=e=>{if(e.key==='Enter')cloudEmail('signin')}}
}
/* ---- leaderboard on Firestore ----
   runs/{auto}            every posted personal best (all-time board)
   days/{day}/runs/{auto} the same run, filed under the day (today board)
   profiles/{uid}         current names are read from here, so a rename shows up on old posts
   run.av (avatar) is optional: if the security rules refuse it the run is posted without it. */
const CLB={
  cache:{},
  noAv:(()=>{try{return localStorage.getItem('sl_lb_noav')==='1'}catch(_){return false}})(),
  col(board){return board==='all'?CLOUD.db.collection('runs'):CLOUD.db.collection('days').doc(String(dayKey())).collection('runs')},
  async raw(board){ // newest copy within 45 s is reused: opening the board, the menu pill and the results card share one read
    const c=this.cache[board];if(c&&Date.now()-c.t<45000)return c.rows;
    let rows;
    const snap=await this.col(board).orderBy('time','desc').limit(150).get();rows=snap.docs.map(d=>d.data());
    this.cache[board]={t:Date.now(),rows};return rows;
  },
  async fetch(board,filters={}){
    let rows=(await this.raw(board)).slice();
    rows=rows.filter(r=>r.mode!=='pk'&&r.mode!=='qpk'&&r.mode!=='room'); // duels are a fixed 3 minutes, not survival
    const best={};for(const r of rows){const k=r.uid||r.name;if(!best[k]||r.time>best[k].time)best[k]=r}
    rows=Object.values(best).sort((a,b)=>b.time-a.time||b.bosses-a.bosses||b.kills-a.kills);
    return {ok:true,count:rows.length,rows,me:CLOUD.uid()};
  },
  async profiles(uids){ // current name / level / avatar for the rows on screen; best effort
    const out={},need=[...new Set(uids.filter(Boolean))].slice(0,90);
    try{for(let i=0;i<need.length;i+=30){const snap=await CLOUD.db.collection('profiles').where(firebase.firestore.FieldPath.documentId(),'in',need.slice(i,i+30)).get();snap.docs.forEach(d=>{out[d.id]=d.data()})}}catch(e){console.warn('profiles lookup',e)}
    return out;
  },
  async submit(run){
    if(!CLOUD.on())return {ok:false,error:'disabled'};
    const doc={name:String(run.name||'无名侠客').slice(0,16),cls:run.cls,map:run.map,diff:run.diff,mode:run.mode||'solo',time:Math.round(run.time),kills:Math.round(run.kills),bosses:Math.round(run.bosses),level:Math.round(run.level),combo:Math.round(run.combo),relics:Math.round(run.relics),score:Math.round(run.score||0),day:run.day||dayKey(),tier:Math.round(run.tier||0),uid:CLOUD.uid(),ts:firebase.firestore.FieldValue.serverTimestamp()};
    const post=async d=>{if(run.allTime!==false)await CLOUD.db.collection('runs').add(d);await CLOUD.db.collection('days').doc(String(d.day)).collection('runs').add(d)};
    try{
      if(!this.noAv&&run.av){try{await post({...doc,av:{e:run.av.e|0,h:run.av.h|0}})}catch(e){if(e.code!=='permission-denied')throw e;this.noAv=true;try{localStorage.setItem('sl_lb_noav','1')}catch(_){}await post(doc)}}
      else await post(doc);
      for(const b of ['all','today'])delete this.cache[b];
      return {ok:true};
    }catch(e){console.warn('submit failed',e);return {ok:false,error:e.code==='permission-denied'?'implausible':'network'}}
  }
};
