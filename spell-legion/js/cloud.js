'use strict';
/* cloud.js — accounts and cloud save on Firebase (Auth + Firestore).
   Guest by default (anonymous account, created silently). Google, Facebook or email sign-in links the guest account, so progress carries over.
   Email accounts: verification link on register (resend + "I've verified" in Settings), password reset, change password.
   Any account can be deleted from Settings (save + profile removed, then the login itself).
   Facebook needs a Facebook app + the Facebook provider enabled in the Firebase console; until then FB_LOGIN stays false and the button is hidden.
   Everything degrades to the local save if Firebase cannot be reached (blocked network, offline). */
const FIREBASE_CONFIG={apiKey:"AIzaSyDeI9V8qBVB2B1lqZP5BaedYhaToHfs6Z8",authDomain:"spell-legion.firebaseapp.com",projectId:"spell-legion",storageBucket:"spell-legion.firebasestorage.app",messagingSenderId:"657647239907",appId:"1:657647239907:web:339874a2e3fca9cc833bd6"};
const FB_VER='10.14.1';
const FB_LOGIN=false; // flip to true once Facebook is enabled in Firebase Authentication (see I18N.md / ACCOUNTS.md)
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
    /* a sign-in that fell back to a full-page redirect (popup blocked, in-app browsers) finishes here */
    CLOUD.auth.getRedirectResult().catch(async e=>{if(e&&e.code==='auth/credential-already-in-use'&&e.credential){const local=JSON.parse(JSON.stringify(SAVE));await CLOUD.auth.signInWithCredential(e.credential);Object.assign(SAVE,local);SAVE.ts=Date.now()}else if(e&&e.code)showMsg(authMsg(e))});
    /* came back from the verification email in another tab: refresh the badge */
    addEventListener('focus',()=>{const u=CLOUD.auth&&CLOUD.auth.currentUser;if(u&&!u.isAnonymous&&!u.emailVerified&&hasPassword(u))u.reload().then(()=>{CLOUD.user=CLOUD.auth.currentUser;renderAccount()}).catch(()=>{})});
    CLOUD.auth.onAuthStateChanged(async u=>{
      CLOUD.user=u;renderAccount();
      if(!u){try{await CLOUD.auth.signInAnonymously()}catch(e){console.warn('anon sign-in failed',e);CLOUD.status='noauth';renderAccount()}return}
      await cloudPull();renderAccount();if(typeof lbMenuRank==='function')lbMenuRank();
    });
  }catch(e){console.warn('cloud unavailable',e);CLOUD.ready=false;CLOUD.status='off';renderAccount()}
}
/* ---- save merge: never lose progress from either side ---- */
function mergeSave(local,cloud){
  local=JSON.parse(JSON.stringify(local));cloud=cloud&&JSON.parse(JSON.stringify(cloud));
  if(typeof migrateProgression==='function'){migrateProgression(local);if(cloud)migrateProgression(cloud)}
  if(!cloud)return local;
  const clone=o=>JSON.parse(JSON.stringify(o));
  const progressed=o=>!!(o.runs||o.axp||o.gold||o.trophies||o.gear?.inv?.length||Object.values(o.up||{}).some(Boolean)||Object.values(o.training||{}).some(Boolean)||Object.values(o.mer||{}).some(Boolean)||o.asura?.max);
  const newer=progressed(cloud)&&!progressed(local)?cloud:progressed(local)&&!progressed(cloud)?local:(+cloud.ts||0)>(+local.ts||0)?cloud:local;
  const older=newer===local?cloud:local,out=clone({...older,...newer});
  const maxMap=(a={},b={})=>Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(k=>[k,Math.max(+a[k]||0,+b[k]||0)]));
  const unionMap=(a={},b={})=>Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(k=>[k,a[k]||b[k]]));
  for(const k of ['axp','best','wins','runs','bosses','pkBest','dirPeaks'])out[k]=Math.max(+local[k]||0,+cloud[k]||0);
  for(const k of ['up','training','mer','mastery','clsBest','rooms','pk','perks'])out[k]=maxMap(local[k],cloud[k]);
  for(const k of ['weaponOwned','ach','clsWins','tips','road','seenCls','legendMigrated','rankRewards'])out[k]=unionMap(local[k],cloud[k]);
  out.titles=[...new Set([...(local.titles||[]),...(cloud.titles||[])])];
  out.bountyNames=[...new Set([...(local.bountyNames||[]),...(cloud.bountyNames||[])])];
  out.codex={en:{},boss:{},relic:{},weapon:{}};for(const k of new Set([...Object.keys(local.codex||{}),...Object.keys(cloud.codex||{})]))out.codex[k]=unionMap(local.codex?.[k],cloud.codex?.[k]);
  // Currency and trophies can go down. Pick their latest explicit mutation, not the maximum.
  for(const [key,stamp] of [['gold','goldTs'],['trophies','ladderTs']]){
    const a=Object.hasOwn(local,key),b=Object.hasOwn(cloud,key);
    const src=!a?cloud:!b?local:(+local[stamp]||0)!==(+cloud[stamp]||0)?((+local[stamp]||0)>(+cloud[stamp]||0)?local:cloud):newer;
    out[key]=Math.max(0,+src[key]||0);if(src[stamp])out[stamp]=src[stamp];
  }
  const la=local.asura||{},ca=cloud.asura||{};out.asura={...ca,...la,max:Math.max(la.max||0,ca.max||0),best:Math.max(la.best||0,ca.best||0)};
  out.asura.sel=Math.min((newer.asura||older.asura||{}).sel||0,out.asura.max);
  if(local.gear||cloud.gear){
    const a=local.gear||{},b=cloud.gear||{},gn=!(a.inv||[]).length&&!Object.keys(a.removed||{}).length?b:!(b.inv||[]).length&&!Object.keys(b.removed||{}).length?a:(a.ts||local.ts||0)>(b.ts||cloud.ts||0)?a:b;
    const removed=maxMap(a.removed,b.removed),items=new Map();
    for(const it of [...(a.inv||[]),...(b.inv||[])]){if(removed[it.id])continue;const prev=items.get(it.id);if(!prev||(it.ts||0)>=(prev.ts||0))items.set(it.id,clone(it))}
    const eq={...(gn.eq||{})};for(const k in eq)if(!items.has(eq[k]))delete eq[k];
    out.gear={...a,...b,...gn,inv:[...items.values()],eq,removed,seq:Math.max(a.seq||0,b.seq||0),found:Math.max(a.found||0,b.found||0)};
  }
  const dayOf=o=>o.tasks?.day||0;out.tasks=clone(dayOf(cloud)>dayOf(local)?cloud.tasks:dayOf(local)>dayOf(cloud)?local.tasks:(local.tasks||cloud.tasks||null));
  if(out.tasks&&local.tasks?.day===cloud.tasks?.day){out.tasks.list=out.tasks.list.map(t=>{const matches=[...(local.tasks?.list||[]),...(cloud.tasks?.list||[])].filter(c=>c.id===t.id&&c.goal===t.goal&&c.c===t.c);return {...t,p:Math.max(t.p||0,...matches.map(c=>c.p||0)),done:matches.some(c=>c.done)?1:0}})}
  const dd=o=>o.daily?.day||0;out.daily=clone(dd(cloud)>dd(local)?cloud.daily:dd(local)>dd(cloud)?local.daily:(local.daily&&cloud.daily?(local.daily.best>=cloud.daily.best?local.daily:cloud.daily):(local.daily||cloud.daily||null)));
  const ls=local.season||{},cs=cloud.season||{};out.season=clone((ls.id||0)>(cs.id||0)?ls:(cs.id||0)>(ls.id||0)?cs:{...ls,...cs,peak:Math.max(ls.peak||0,cs.peak||0)});
  const lb=local.lb||{},cb=cloud.lb||{};out.lb={...(lb.day>cb.day?lb:cb),best:Math.max(lb.best||0,cb.best||0)};if(lb.day===cb.day)out.lb.dayBest=Math.max(lb.dayBest||0,cb.dayBest||0);
  out.ts=Math.max(+local.ts||0,+cloud.ts||0);if(typeof migrateProgression==='function')migrateProgression(out);delete out.autocast;return out;
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
/* ---- Google / Facebook sign-in: link the guest account so nothing is lost; if that login already has a save, merge into it.
   Popups are blocked in some in-app browsers (WeChat, Instagram, Facebook itself): fall back to a full-page redirect. ---- */
function authLang(){if(CLOUD.auth)CLOUD.auth.languageCode={zh:'zh-CN',zt:'zh-TW',en:'en',ja:'ja',ko:'ko'}[typeof LOC!=='undefined'?LOC:'en']||'en'}
function providerOf(kind){if(kind==='facebook'){const p=new firebase.auth.FacebookAuthProvider();p.addScope('email');return p}return new firebase.auth.GoogleAuthProvider()}
async function cloudProvider(kind){
  if(!CLOUD.ready)return showMsg(L('无法连接账号服务','Account service unreachable'));
  const prov=providerOf(kind),name=kind==='facebook'?'Facebook':'Google';authLang();
  try{
    if(CLOUD.user&&CLOUD.user.isAnonymous){
      try{await CLOUD.user.linkWithPopup(prov)}
      catch(e){if(e.code==='auth/credential-already-in-use'){const local=JSON.parse(JSON.stringify(SAVE));await CLOUD.auth.signInWithCredential(e.credential);Object.assign(SAVE,local);SAVE.ts=Date.now()}
        else if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-environment'){return CLOUD.user.linkWithRedirect(prov)}else throw e}
    }else{try{await CLOUD.auth.signInWithPopup(prov)}catch(e){if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-environment')return CLOUD.auth.signInWithRedirect(prov);throw e}}
    showMsg(L(`已登录 ${name}`,`Signed in with ${name}`));
  }catch(e){console.warn(e);showMsg(e&&AUTH_MSG[e.code]?authMsg(e):L('登录未完成','Sign-in not completed'))}
}
const cloudGoogle=()=>cloudProvider('google');
/* ---- email + password: register links the guest account (progress kept); sign-in merges the local save into the account's cloud save on pull ---- */
const AUTH_MSG={'auth/invalid-email':['邮箱格式不对','That email does not look right'],'auth/weak-password':['密码至少 6 位','Password needs 6+ characters'],'auth/email-already-in-use':['这个邮箱已注册,请直接登录','Already registered — sign in instead'],'auth/wrong-password':['密码不对','Wrong password'],'auth/invalid-credential':['邮箱或密码不对','Wrong email or password'],'auth/invalid-login-credentials':['邮箱或密码不对','Wrong email or password'],'auth/user-not-found':['没有这个账号,先注册','No account with this email — register first'],'auth/too-many-requests':['试得太多了,稍后再试','Too many attempts; try again later'],'auth/operation-not-allowed':['邮箱登录暂未开通','Email sign-in is not enabled yet'],'auth/network-request-failed':['网络不通','Network error'],'auth/missing-password':['请输入密码','Enter a password'],'auth/account-exists-with-different-credential':['这个邮箱已用别的方式注册,请用原来的方式登录','This email already has an account — sign in the way you did before'],'auth/popup-closed-by-user':['登录窗口被关闭了','The sign-in window was closed'],'auth/cancelled-popup-request':['登录窗口被关闭了','The sign-in window was closed'],'auth/requires-recent-login':['为了安全,请先退出再重新登录一次','For safety, sign out and sign in again first'],'auth/credential-already-in-use':['这个账号已绑定到别的存档','That login is already linked to another save'],'auth/missing-email':['请输入邮箱','Enter your email']};
function authMsg(e){const m=AUTH_MSG[e&&e.code];return m?L(m[0],m[1]):L('没成功,再试一次','Did not work; try again')}
function emailForm(){const f=$('#emailform');if(!f)return null;const em=(f.querySelector('.em').value||'').trim(),pw=f.querySelector('.pw').value||'';return {em,pw}}
async function cloudEmail(kind){
  if(!CLOUD.ready)return showMsg(L('无法连接账号服务','Account service unreachable'));
  const v=emailForm();if(!v)return;if(!v.em)return showMsg(L('请输入邮箱','Enter your email'));
  try{
    authLang();
    if(kind==='reset'){await CLOUD.auth.sendPasswordResetEmail(v.em);return showMsg(L(`如果 ${v.em} 已注册,重置密码的链接已发过去了(也看看垃圾邮件)`,`If ${v.em} has an account, a reset link is on its way (check spam too)`))}
    if(!v.pw)return showMsg(L('请输入密码','Enter a password'));
    if(kind==='signup'){
      if(CLOUD.user&&CLOUD.user.isAnonymous){const cred=firebase.auth.EmailAuthProvider.credential(v.em,v.pw);await CLOUD.user.linkWithCredential(cred);CLOUD.user=CLOUD.auth.currentUser;await cloudPush(true);renderAccount()}
      else await CLOUD.auth.createUserWithEmailAndPassword(v.em,v.pw);
      let sent=true;try{await CLOUD.auth.currentUser.sendEmailVerification()}catch(_){sent=false}
      CLOUD.emailOpen=false;renderAccount();
      showMsg(sent?L(`注册成功!验证链接已发到 ${v.em},点开即可完成验证`,`Registered! A verification link was sent to ${v.em}`):L('注册成功,进度已绑定到邮箱','Registered — your progress is now tied to this email'));return;
    }else{
      const local=JSON.parse(JSON.stringify(SAVE));await CLOUD.auth.signInWithEmailAndPassword(v.em,v.pw);Object.assign(SAVE,local);SAVE.ts=Date.now(); // onAuthStateChanged pulls and merges with the account's cloud save
      showMsg(L('已登录','Signed in'));
    }
    CLOUD.emailOpen=false;
  }catch(e){console.warn(e);showMsg(authMsg(e))}
}
/* ---- account actions in Settings ---- */
function hasPassword(u){return !!(u&&u.providerData&&u.providerData.some(p=>p.providerId==='password'))}
async function cloudResendVerify(){const u=CLOUD.auth&&CLOUD.auth.currentUser;if(!u)return;authLang();try{await u.sendEmailVerification();showMsg(L(`验证链接已重新发到 ${u.email}`,`Verification link sent again to ${u.email}`))}catch(e){showMsg(authMsg(e))}}
async function cloudCheckVerify(){const u=CLOUD.auth&&CLOUD.auth.currentUser;if(!u)return;try{await u.reload();CLOUD.user=CLOUD.auth.currentUser;renderAccount();showMsg(CLOUD.user.emailVerified?L('邮箱已验证 ✓','Email verified ✓'):L('还没验证,请点邮件里的链接','Not verified yet — open the link in the email'))}catch(e){showMsg(authMsg(e))}}
async function cloudChangePassword(){const u=CLOUD.auth&&CLOUD.auth.currentUser;if(!u||!u.email)return;authLang();try{await CLOUD.auth.sendPasswordResetEmail(u.email);showMsg(L(`改密码的链接已发到 ${u.email}`,`A link to set a new password was sent to ${u.email}`))}catch(e){showMsg(authMsg(e))}}
async function cloudDeleteAccount(){
  const u=CLOUD.auth&&CLOUD.auth.currentUser;if(!u||u.isAnonymous)return;
  if(!confirm(L('确定删除账号吗?云端存档和昵称会被永久删除,无法恢复。这台设备上的进度会保留。','Delete your account? Your cloud save and profile are removed for good. Progress on this device stays.')))return;
  const uid=u.uid;
  try{for(const c of ['saves','profiles'])try{await CLOUD.db.collection(c).doc(uid).delete()}catch(e){console.warn('delete '+c,e)}
    await u.delete();showMsg(L('账号已删除,继续以游客身份游玩','Account deleted; playing as guest'))}
  catch(e){console.warn(e);showMsg(authMsg(e))}
}
async function cloudSignOut(){if(!CLOUD.ready)return;try{await CLOUD.auth.signOut()}catch(_){}showMsg(L('已退出,继续以游客身份游玩','Signed out; playing as guest'))}
function showMsg(t){const el=$('#accmsg');if(el){el.textContent=t;setTimeout(()=>{if(el.textContent===t)el.textContent=''},5000)}}
function renderAccount(){
  if(typeof renderStatus==='function')renderStatus();
  const el=$('#account');if(!el)return;
  const guest=!CLOUD.on()||CLOUD.isGuest();
  const unverified=!guest&&CLOUD.user&&hasPassword(CLOUD.user)&&!CLOUD.user.emailVerified;
  const who=(()=>{const u=CLOUD.user;if(!CLOUD.ready)return CLOUD.label();if(!u)return L('未登录','Not signed in');if(CLOUD.isGuest())return L('游客','Guest');const n=u.displayName||(u.email||'').split('@')[0]||L('已登录','Signed in');return n.length>18?n.slice(0,17)+'…':n})();el.innerHTML=`<span class="who" title="${CLOUD.user&&CLOUD.user.email||''}"><i class="dot ${CLOUD.on()?'on':''}"></i>${who}</span>${CLOUD.ready?(guest?`<button type="button" class="go sm" id="googlebtn">${L('Google 登录','Google')}</button>${FB_LOGIN?`<button type="button" class="go sm fb" id="fbbtn">Facebook</button>`:''}<button type="button" class="go sm alt${CLOUD.emailOpen?' on':''}" id="emailbtn">${L('邮箱','Email')}</button>${CLOUD.emailOpen?`<form id="emailform" autocomplete="on" onsubmit="return false"><input class="em" type="email" placeholder="${L('邮箱','email')}" autocomplete="email" value="${CLOUD.emailDraft||''}"><span class="pwrap"><input class="pw" type="password" placeholder="${L('密码(至少 6 位)','password (6+)')}" autocomplete="current-password" minlength="6"><button type="button" class="eye" aria-label="${L('显示密码','Show password')}">👁</button></span><div class="eb"><button type="button" class="go sm" data-k="signin">${L('登录','Sign in')}</button><button type="button" class="go sm alt" data-k="signup">${L('注册','Register')}</button><button type="button" class="lnk" data-k="reset">${L('忘记密码','Forgot?')}</button></div></form>`:''}`:`${unverified?`<span class="unv">${L('邮箱未验证','Email not verified')}</span><button type="button" class="lnk" id="resendbtn">${L('重发验证邮件','Resend link')}</button><button type="button" class="lnk" id="checkbtn">${L('我已验证','I have verified')}</button>`:''}<button type="button" class="go sm alt" id="signoutbtn">${L('退出','Sign out')}</button><span class="acct">${hasPassword(CLOUD.user)?`<button type="button" class="lnk" id="pwbtn">${L('修改密码','Change password')}</button>`:''}<button type="button" class="lnk danger" id="delbtn">${L('删除账号','Delete account')}</button></span>`):''}<small>${CLOUD.syncErr?L('云端同步失败,进度暂时仅保存在本机:','Cloud sync failed; progress is saved on this device only: ')+CLOUD.syncErr:CLOUD.on()?(guest?L('登录后多设备同步','Sign in to sync devices'):L('进度已跨设备同步','Progress syncs across your devices')):L('账号服务不可用,进度保存在本机','Account service unreachable; progress stays on this device')}</small><span id="accmsg" class="note"></span>`;
  const g=$('#googlebtn');if(g)g.onclick=cloudGoogle;const fb=$('#fbbtn');if(fb)fb.onclick=()=>cloudProvider('facebook');const so=$('#signoutbtn');if(so)so.onclick=cloudSignOut;
  [['#resendbtn',cloudResendVerify],['#checkbtn',cloudCheckVerify],['#pwbtn',cloudChangePassword],['#delbtn',cloudDeleteAccount]].forEach(([s,f])=>{const b=$(s);if(b)b.onclick=f});
  const eb=$('#emailbtn');if(eb)eb.onclick=()=>{CLOUD.emailOpen=!CLOUD.emailOpen;renderAccount();if(CLOUD.emailOpen){const i=$('#emailform .em');if(i)i.focus()}};
  const f=$('#emailform');if(f){f.querySelector('.em').oninput=e=>{CLOUD.emailDraft=e.target.value};f.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>cloudEmail(b.dataset.k));f.querySelector('.pw').onkeydown=e=>{if(e.key==='Enter')cloudEmail('signin')};const eye=f.querySelector('.eye');if(eye)eye.onclick=()=>{const pw=f.querySelector('.pw');pw.type=pw.type==='password'?'text':'password'}}
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
      if(!this.noAv&&run.av){try{await post({...doc,av:{e:run.av.e|0,h:run.av.h|0}})}catch(e){if(e.code!=='permission-denied')throw e;await post(doc);this.noAv=true;try{localStorage.setItem('sl_lb_noav','1')}catch(_){}}} // only give up on avatars when the same run goes through without one
      else await post(doc);
      for(const b of ['all','today'])delete this.cache[b];
      return {ok:true};
    }catch(e){console.warn('submit failed',e);return {ok:false,error:e.code==='permission-denied'?'implausible':'network'}}
  }
};
