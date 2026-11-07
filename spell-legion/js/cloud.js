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
const CLOUD={ready:false,user:null,db:null,auth:null,status:'off',pushT:0,lastPushed:'',epoch:0,syncedUid:null,pullTask:null,writeTask:Promise.resolve(),authBusy:false,initializing:true,
  on(){return this.ready&&!!this.user},
  uid(){return this.user?this.user.uid:null},
  isGuest(){return !!(this.user&&this.user.isAnonymous)},
  label(){if(!this.ready)return this.status==='loading'?L('连接中…','connecting…'):L('离线','offline');if(!this.user)return L('未登录','not signed in');return this.isGuest()?L('游客','Guest'):(this.user.displayName||this.user.email||L('已登录','signed in'))},
};
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=res;s.onerror=()=>rej(new Error('load '+src));document.head.appendChild(s)})}
async function cloudInit(){
  CLOUD.status='loading';renderAccount();
  try{
    if(window.SPELL_CONNECTION_READY)await window.SPELL_CONNECTION_READY;
    const base=window.SPELL_CN_PROXY?`${window.SPELL_CN_PROXY_BASE}/sdk/firebasejs/${FB_VER}/`:`https://www.gstatic.com/firebasejs/${FB_VER}/`;
    await Promise.race([Promise.all([loadScript(base+'firebase-app-compat.js')]).then(()=>Promise.all([loadScript(base+'firebase-auth-compat.js'),loadScript(base+'firebase-firestore-compat.js')])),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),12000))]);
    firebase.initializeApp(FIREBASE_CONFIG);
    CLOUD.auth=firebase.auth();CLOUD.db=firebase.firestore();
    if(window.SPELL_CN_PROXY)CLOUD.db.settings({experimentalForceLongPolling:true});
    try{await CLOUD.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)}catch(_){}
    CLOUD.ready=true;CLOUD.status='ready';
    CLOUD.auth.onAuthStateChanged(u=>{cloudAuthChanged(u).catch(e=>console.warn('auth state failed',e))});
    // Complete redirects issued by an older version, without restoring a stale local snapshot.
    CLOUD.auth.getRedirectResult().then(r=>r.user&&cloudAuthChanged(r.user)).catch(async e=>{
      try{if(e?.code==='auth/credential-already-in-use'&&e.credential){const r=await CLOUD.auth.signInWithCredential(e.credential);await cloudAuthChanged(r.user)}else showMsg(authMsg(e))}
      catch(err){showMsg(authMsg(err))}
    });
    addEventListener('focus',()=>{const u=CLOUD.auth?.currentUser;if(u&&!u.isAnonymous&&!u.emailVerified&&hasPassword(u))u.reload().then(()=>{if(CLOUD.auth.currentUser?.uid===u.uid){CLOUD.user=CLOUD.auth.currentUser;renderAccount()}}).catch(()=>{})});
  }catch(e){console.warn('cloud unavailable',e);CLOUD.ready=false;CLOUD.initializing=false;CLOUD.status='off';renderAccount()}
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
  if(['score','endless-score'].includes(lb.rankBy)||['score','endless-score'].includes(cb.rankBy)){
    const better=(a,b)=>{if(!a)return b;if(!b)return a;for(const k of ['score','bosses','kills','time']){if((a[k]||0)!==(b[k]||0))return (a[k]||0)>(b[k]||0)?a:b}return a};
    out.lb.rankBy='endless-score';out.lb.bestRun=clone(better(lb.bestRun,cb.bestRun)||null);
    out.lb.pendingRun=clone(better(lb.pendingRun,cb.pendingRun)||null);
    out.lb.day=Math.max(lb.day||0,cb.day||0);out.lb.dayBestRun=clone(lb.day===cb.day?better(lb.dayBestRun,cb.dayBestRun)||null:(lb.day>cb.day?lb.dayBestRun:cb.dayBestRun)||null);
  }
  out.ts=Math.max(+local.ts||0,+cloud.ts||0);if(typeof migrateProgression==='function')migrateProgression(out);delete out.autocast;return out;
}
async function cloudAuthChanged(user){
  if(user&&CLOUD.auth.currentUser?.uid!==user.uid)return false;
  if(!user&&CLOUD.auth.currentUser)return cloudAuthChanged(CLOUD.auth.currentUser);
  if(user&&CLOUD.user?.uid===user.uid){CLOUD.user=user;CLOUD.initializing=false;renderAccount();return CLOUD.syncedUid===user.uid?cloudPush(true):cloudPull()}
  clearTimeout(CLOUD.pushT);CLOUD.epoch++;CLOUD.user=user;CLOUD.syncedUid=null;CLOUD.pullTask=null;CLOUD.writeTask=Promise.resolve();CLOUD.lastPushed='';CLOUD.syncErr='';
  CLOUD.initializing=!user;renderAccount();
  if(!user){
    try{const r=await (window.SPELL_CN_PROXY?Promise.race([CLOUD.auth.signInAnonymously(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('auth/network-request-failed')),12000))]):CLOUD.auth.signInAnonymously());if(CLOUD.auth.currentUser?.uid===r.user.uid)return await cloudAuthChanged(r.user)}
    catch(e){console.warn('anon sign-in failed',e);CLOUD.status='noauth';CLOUD.initializing=false;renderAccount()}
    return false;
  }
  CLOUD.initializing=false;const ok=await cloudPull();
  if(CLOUD.user?.uid===user.uid){renderAccount();if(typeof lbMenuRank==='function')lbMenuRank()}
  return ok;
}
function cloudCompleteSignIn(user){cloudAuthChanged(user).catch(e=>console.warn('sign-in sync failed',e))}
function cloudSession(uid,epoch){return CLOUD.on()&&CLOUD.user.uid===uid&&CLOUD.epoch===epoch&&CLOUD.auth.currentUser?.uid===uid}
async function cloudPull(){
  if(!CLOUD.on())return false;
  if(CLOUD.pullTask)return CLOUD.pullTask;
  const uid=CLOUD.uid(),epoch=CLOUD.epoch;CLOUD.syncedUid=null;
  const task=Promise.resolve().then(async()=>{
    try{
      const snap=await CLOUD.db.collection('saves').doc(uid).get();
      if(!cloudSession(uid,epoch))return false;
      // Cached data cannot prove that the server save is absent or current.
      if(snap.metadata?.fromCache)throw new Error('Cloud save is offline');
      const data=snap.exists?snap.data():null;
      if(data?.save){Object.assign(SAVE,mergeSave(SAVE,data.save));if(typeof normalizeSave==='function')normalizeSave();persist(true)}
      CLOUD.syncedUid=uid;const ok=await cloudPush(true);
      if(cloudSession(uid,epoch)&&typeof renderTitle==='function'&&!document.querySelector('#title').hidden)renderTitle();
      return ok;
    }catch(e){if(cloudSession(uid,epoch)){CLOUD.syncErr=String(e?.message||e).slice(0,80);renderAccount()}console.warn('pull failed',e);return false}
  });
  CLOUD.pullTask=task;
  try{return await task}finally{if(CLOUD.pullTask===task)CLOUD.pullTask=null}
}
async function cloudPush(now){
  if(!CLOUD.on()||CLOUD.syncedUid!==CLOUD.uid())return false;
  const uid=CLOUD.uid(),epoch=CLOUD.epoch;
  const task=CLOUD.writeTask.catch(()=>{}).then(async()=>{
    if(!cloudSession(uid,epoch)||CLOUD.syncedUid!==uid)return false;
    const body=JSON.stringify(SAVE);if(body===CLOUD.lastPushed&&!now)return true;
    const clean=JSON.parse(body),a=typeof accountLv==='function'?accountLv():{lv:1},t=typeof titleFor==='function'?titleFor(a.lv):['','',''];
    const profile={name:LB.name()||'无名侠客',lv:a.lv,axp:Math.max(0,SAVE.axp||0),trophies:Math.max(0,SAVE.trophies||0),cls:SAVE.cls,guest:CLOUD.isGuest(),title:t[1],ts:firebase.firestore.FieldValue.serverTimestamp(),...(SAVE.avatar?{av:{e:SAVE.avatar.e|0,h:SAVE.avatar.h|0}}:{})};
    try{
      await CLOUD.db.collection('saves').doc(uid).set({save:clean,ts:firebase.firestore.FieldValue.serverTimestamp()});
      if(!cloudSession(uid,epoch))return false;
      await CLOUD.db.collection('profiles').doc(uid).set(profile,{merge:true});
      if(!cloudSession(uid,epoch))return false;
      if(typeof CLB!=='undefined')delete CLB.cache.profiles;
      CLOUD.lastPushed=body;CLOUD.syncErr='';return true;
    }catch(e){if(cloudSession(uid,epoch)){CLOUD.syncErr=String(e?.message||e).slice(0,80);renderAccount()}console.warn('push failed',e);return false}
  });
  CLOUD.writeTask=task;return task;
}
function cloudSchedulePush(){if(!CLOUD.on())return;clearTimeout(CLOUD.pushT);const uid=CLOUD.uid(),epoch=CLOUD.epoch;CLOUD.pushT=setTimeout(()=>{if(cloudSession(uid,epoch)){if(CLOUD.syncedUid===uid)cloudPush(false);else cloudPull()}},2500)}
function syncAuthButtons(){document.querySelectorAll('#account button').forEach(b=>b.disabled=CLOUD.authBusy||CLOUD.initializing)}
async function cloudAuthAction(action){
  if(CLOUD.authBusy||CLOUD.initializing)return;
  CLOUD.authBusy=true;syncAuthButtons();
  try{return await action()}finally{CLOUD.authBusy=false;syncAuthButtons()}
}
/* ---- Google / Facebook sign-in: link the guest account so nothing is lost; if that login already has a save, merge into it.
   Redirect fallback is only used on the Firebase auth origin; other hosts keep the popup flow. ---- */
function authLang(){if(CLOUD.auth)CLOUD.auth.languageCode={zh:'zh-CN',zt:'zh-TW',en:'en',ja:'ja',ko:'ko'}[typeof LOC!=='undefined'?LOC:'en']||'en'}
function providerOf(kind){if(kind==='facebook'){const p=new firebase.auth.FacebookAuthProvider();p.addScope('email');return p}return new firebase.auth.GoogleAuthProvider()}
async function cloudProvider(kind){
  if(!CLOUD.ready)return showMsg(L('无法连接账号服务','Account service unreachable'));
  return cloudAuthAction(async()=>{
    const prov=providerOf(kind),name=kind==='facebook'?'Facebook':'Google';authLang();
    try{
      let result;
      try{result=CLOUD.user?.isAnonymous?await CLOUD.user.linkWithPopup(prov):await CLOUD.auth.signInWithPopup(prov)}
      catch(e){
        if(e.code==='auth/credential-already-in-use'&&e.credential)result=await CLOUD.auth.signInWithCredential(e.credential);
        else if((e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-environment')&&location.hostname===FIREBASE_CONFIG.authDomain){
          persist(true);return await (CLOUD.user?.isAnonymous?CLOUD.user.linkWithRedirect(prov):CLOUD.auth.signInWithRedirect(prov));
        }else throw e;
      }
      cloudCompleteSignIn(result.user);renderAccount();showMsg(L(`已登录 ${name}`,`Signed in with ${name}`));
    }catch(e){console.warn(e);showMsg(authMsg(e))}
  });
}
const cloudGoogle=()=>cloudProvider('google');
/* ---- email + password: register links the guest account (progress kept); sign-in merges the local save into the account's cloud save on pull ---- */
const AUTH_MSG={'auth/popup-blocked':['请允许弹窗后重试','Allow popups and try again'],'auth/operation-not-supported-in-environment':['请在浏览器中打开登录','Open in a browser to sign in'],'auth/unauthorized-domain':['此网站尚未启用登录','Sign-in is not enabled for this website'],'auth/invalid-email':['邮箱格式不对','That email does not look right'],'auth/weak-password':['密码至少 7 个字符','Password needs 7+ characters'],'auth/email-already-in-use':['这个邮箱已注册,请直接登录','Already registered — sign in instead'],'auth/wrong-password':['密码不对','Wrong password'],'auth/invalid-credential':['邮箱或密码不对','Wrong email or password'],'auth/invalid-login-credentials':['邮箱或密码不对','Wrong email or password'],'auth/user-not-found':['没有这个账号,先注册','No account with this email — register first'],'auth/too-many-requests':['试得太多了,稍后再试','Too many attempts; try again later'],'auth/operation-not-allowed':['邮箱登录暂未开通','Email sign-in is not enabled yet'],'auth/network-request-failed':['网络不通','Network error'],'auth/missing-password':['请输入密码','Enter a password'],'auth/account-exists-with-different-credential':['这个邮箱已用别的方式注册,请用原来的方式登录','This email already has an account — sign in the way you did before'],'auth/popup-closed-by-user':['登录窗口被关闭了','The sign-in window was closed'],'auth/cancelled-popup-request':['登录窗口被关闭了','The sign-in window was closed'],'auth/requires-recent-login':['为了安全,请先退出再重新登录一次','For safety, sign out and sign in again first'],'auth/credential-already-in-use':['这个账号已绑定到别的存档','That login is already linked to another save'],'auth/missing-email':['请输入邮箱','Enter your email']};
function authMsg(e){const m=AUTH_MSG[e&&e.code];return m?L(m[0],m[1]):L('没成功,再试一次','Did not work; try again')}
function emailForm(){const f=$('#emailform');if(!f)return null;const em=(f.querySelector('.em').value||'').trim(),pw=f.querySelector('.pw').value||'';return {em,pw}}
async function cloudEmail(kind){
  if(!CLOUD.ready)return showMsg(L('无法连接账号服务','Account service unreachable'));
  const v=emailForm();if(!v)return;if(!v.em)return showMsg(L('请输入邮箱','Enter your email'));
  if($('#emailform .em')?.validity?.typeMismatch)return showMsg(authMsg({code:'auth/invalid-email'}));
  if(kind!=='reset'&&!v.pw)return showMsg(L('请输入密码','Enter a password'));
  if(kind==='signup'&&[...v.pw].length<7)return showMsg(authMsg({code:'auth/weak-password'}));
  return cloudAuthAction(async()=>{
    try{
      authLang();
      if(kind==='reset'){await CLOUD.auth.sendPasswordResetEmail(v.em);return showMsg(L(`如果 ${v.em} 已注册,重置密码的链接已发过去了(也看看垃圾邮件)`,`If ${v.em} has an account, a reset link is on its way (check spam too)`))}
      let result;
      if(kind==='signup'){
        result=CLOUD.user?.isAnonymous?await CLOUD.user.linkWithCredential(firebase.auth.EmailAuthProvider.credential(v.em,v.pw)):await CLOUD.auth.createUserWithEmailAndPassword(v.em,v.pw);
        cloudCompleteSignIn(result.user);
        let sent=true;try{await result.user.sendEmailVerification()}catch(_){sent=false}
        CLOUD.emailOpen=false;renderAccount();
        showMsg(sent?L(`注册成功!验证链接已发到 ${v.em},点开即可完成验证`,`Registered! A verification link was sent to ${v.em}`):L('注册成功,进度已绑定到邮箱','Registered — your progress is now tied to this email'));
      }else{
        result=await CLOUD.auth.signInWithEmailAndPassword(v.em,v.pw);cloudCompleteSignIn(result.user);
        CLOUD.emailOpen=false;renderAccount();showMsg(L('已登录','Signed in'));
      }
    }catch(e){console.warn(e);showMsg(authMsg(e))}
  });
}
/* ---- account actions in Settings ---- */
function hasPassword(u){return !!(u&&u.providerData&&u.providerData.some(p=>p.providerId==='password'))}
async function cloudResendVerify(){const u=CLOUD.auth?.currentUser;if(!u)return;return cloudAuthAction(async()=>{authLang();try{await u.sendEmailVerification();showMsg(L(`验证链接已重新发到 ${u.email}`,`Verification link sent again to ${u.email}`))}catch(e){showMsg(authMsg(e))}})}
async function cloudCheckVerify(){const u=CLOUD.auth?.currentUser;if(!u)return;return cloudAuthAction(async()=>{try{await u.reload();if(CLOUD.auth.currentUser?.uid!==u.uid)return;CLOUD.user=CLOUD.auth.currentUser;if(CLOUD.user.emailVerified)await CLOUD.user.getIdToken(true);if(CLOUD.auth.currentUser?.uid!==u.uid)return;renderAccount();showMsg(CLOUD.user.emailVerified?L('邮箱已验证 ✓','Email verified ✓'):L('还没验证,请点邮件里的链接','Not verified yet — open the link in the email'))}catch(e){showMsg(authMsg(e))}})}
async function cloudChangePassword(){const u=CLOUD.auth&&CLOUD.auth.currentUser;if(!u||!u.email)return;authLang();try{await CLOUD.auth.sendPasswordResetEmail(u.email);showMsg(L(`改密码的链接已发到 ${u.email}`,`A link to set a new password was sent to ${u.email}`))}catch(e){showMsg(authMsg(e))}}
async function cloudDeleteAccount(){
  const u=CLOUD.auth&&CLOUD.auth.currentUser;if(!u||u.isAnonymous)return;
  if(!confirm(L('永久删除账号和云存档？','Permanently delete account and cloud save?')))return;
  const uid=u.uid;
  try{for(const c of ['saves','profiles'])try{await CLOUD.db.collection(c).doc(uid).delete()}catch(e){console.warn('delete '+c,e)}
    await u.delete();showMsg(L('账号已删除,继续以游客身份游玩','Account deleted; playing as guest'))}
  catch(e){console.warn(e);showMsg(authMsg(e))}
}
async function cloudSignOut(){if(!CLOUD.ready)return;return cloudAuthAction(async()=>{try{await CLOUD.auth.signOut();showMsg(L('已退出,继续以游客身份游玩','Signed out; playing as guest'));return true}catch(e){showMsg(authMsg(e));return false}})}
function showMsg(t){const message={text:t,until:Date.now()+5000};CLOUD.message=message;const el=$('#accmsg');if(el)el.textContent=t;setTimeout(()=>{if(CLOUD.message===message){CLOUD.message=null;const current=$('#accmsg');if(current)current.textContent=''}},5000)}
function accountEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderAccount(){
  const oldPassword=$('#emailform .pw')?.value||'',oldType=$('#emailform .pw')?.type||'password';
  if(typeof renderStatus==='function')renderStatus();
  const el=$('#account');if(!el)return;
  const guest=!CLOUD.on()||CLOUD.isGuest();
  const unverified=!guest&&CLOUD.user&&hasPassword(CLOUD.user)&&!CLOUD.user.emailVerified;
  const who=(()=>{const u=CLOUD.user;if(!CLOUD.ready)return CLOUD.label();if(!u)return L('未登录','Not signed in');if(CLOUD.isGuest())return L('游客','Guest');const n=u.displayName||(u.email||'').split('@')[0]||L('已登录','Signed in');return n.length>18?n.slice(0,17)+'…':n})();el.innerHTML=`<span class="who" title="${accountEscape(CLOUD.user?.email)}"><i class="dot ${CLOUD.on()?'on':''}"></i>${accountEscape(who)}</span>${CLOUD.ready?(guest?`<button type="button" class="go sm" id="googlebtn">${L('Google 登录','Google')}</button>${FB_LOGIN?`<button type="button" class="go sm fb" id="fbbtn">Facebook</button>`:''}<button type="button" class="go sm alt${CLOUD.emailOpen?' on':''}" id="emailbtn">${L('邮箱','Email')}</button>${CLOUD.emailOpen?`<form id="emailform" autocomplete="on" onsubmit="return false"><input class="em" type="email" placeholder="${L('邮箱','email')}" autocomplete="email" value="${accountEscape(CLOUD.emailDraft)}"><span class="pwrap"><input class="pw" type="password" placeholder="${L('密码（至少 7 个字符）','password (7+)')}" autocomplete="current-password"><button type="button" class="eye" aria-label="${L('显示密码','Show password')}">👁</button></span><div class="eb"><button type="button" class="go sm" data-k="signin">${L('登录','Sign in')}</button><button type="button" class="go sm alt" data-k="signup">${L('注册','Register')}</button><button type="button" class="lnk" data-k="reset">${L('忘记密码','Forgot?')}</button></div></form>`:''}`:`${unverified?`<span class="unv">${L('邮箱未验证','Email not verified')}</span><button type="button" class="lnk" id="resendbtn">${L('重发验证邮件','Resend link')}</button><button type="button" class="lnk" id="checkbtn">${L('我已验证','I have verified')}</button>`:''}<button type="button" class="go sm alt" id="signoutbtn">${L('退出','Sign out')}</button><span class="acct">${hasPassword(CLOUD.user)?`<button type="button" class="lnk" id="pwbtn">${L('修改密码','Change password')}</button>`:''}<button type="button" class="lnk danger" id="delbtn">${L('删除账号','Delete account')}</button></span>`):''}${CLOUD.syncErr?`<small>${L('同步失败','Sync failed')}</small>`:''}<span id="accmsg" class="note">${CLOUD.message?.until>Date.now()?accountEscape(CLOUD.message.text):''}</span>`;
  const g=$('#googlebtn');if(g)g.onclick=cloudGoogle;const fb=$('#fbbtn');if(fb)fb.onclick=()=>cloudProvider('facebook');const so=$('#signoutbtn');if(so)so.onclick=cloudSignOut;
  [['#resendbtn',cloudResendVerify],['#checkbtn',cloudCheckVerify],['#pwbtn',cloudChangePassword],['#delbtn',cloudDeleteAccount]].forEach(([s,f])=>{const b=$(s);if(b)b.onclick=f});
  const eb=$('#emailbtn');if(eb)eb.onclick=()=>{CLOUD.emailOpen=!CLOUD.emailOpen;renderAccount();if(CLOUD.emailOpen){const i=$('#emailform .em');if(i)i.focus()}};
  const f=$('#emailform');if(f){f.querySelector('.pw').value=oldPassword;f.querySelector('.pw').type=oldType;f.querySelector('.em').oninput=e=>{CLOUD.emailDraft=e.target.value};f.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>cloudEmail(b.dataset.k));f.querySelector('.pw').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();cloudEmail('signin')}};const eye=f.querySelector('.eye');if(eye)eye.onclick=()=>{const pw=f.querySelector('.pw');pw.type=pw.type==='password'?'text':'password'}}
  syncAuthButtons();
  if(!CLOUD.ready&&!CLOUD.initializing){const retry=document.createElement('button');retry.type='button';retry.className='go sm alt';retry.textContent=L('重试连接','Retry connection');retry.onclick=()=>location.reload();el.appendChild(retry)}
}
/* ---- leaderboard on Firestore ----
   runs/{auto}            every posted personal best (all-time board)
   days/{day}/runs/{auto} the same run, filed under the day (today board)
   profiles/{uid}         current names are read from here, so a rename shows up on old posts
   run.av (avatar) is optional: if the security rules refuse it the run is posted without it. */
const CLB={
  cache:{},pending:{},epoch:0,
  noAv:(()=>{try{return localStorage.getItem('sl_lb_noav')==='1'}catch(_){return false}})(),
  // These collections are public. Reading must not wait for Auth or the Firebase SDK.
  async query(parent,structuredQuery){
    if(window.SPELL_CONNECTION_READY)await window.SPELL_CONNECTION_READY;
    const path=`/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents${parent?'/'+parent:''}:runQuery`;
    const direct=`https://firestore.googleapis.com${path}`;
    const proxyOrigin=['spelllegion.com','spell-legion.pages.dev','127.0.0.1'].includes(location.hostname)?location.origin:'https://spelllegion.com';
    const proxy=`${proxyOrigin}/api/cn-proxy/firestore${path}`;
    const body=JSON.stringify({structuredQuery});
    const read=async(url,ms)=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);
      try{
        const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body,signal:controller.signal});
        if(!response.ok)throw new Error('Leaderboard read failed: '+response.status);
        return await response.json();
      }finally{clearTimeout(timer)}
    };
    try{
      let result;
      try{result=await read(direct,6000)}
      catch(e){
        if(window.SPELL_CN_PROXY||!['spelllegion.com','spell-legion.pages.dev','hyang.org','leehomyc.github.io','127.0.0.1'].includes(location.hostname))throw e;
        result=await read(proxy,10000);
      }
      const decode=v=>v.integerValue!==undefined?Number(v.integerValue):v.doubleValue!==undefined?v.doubleValue:v.stringValue!==undefined?v.stringValue:v.booleanValue!==undefined?v.booleanValue:v.mapValue?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)])):v.arrayValue?(v.arrayValue.values||[]).map(decode):v.timestampValue||null;
      return result.filter(x=>x.document).map(x=>({...Object.fromEntries(Object.entries(x.document.fields||{}).map(([k,v])=>[k,decode(v)])),_id:x.document.name.split('/').pop()}));
    }catch(e){console.warn('leaderboard query failed',e);throw e}
  },
  async raw(board){
    const day=board==='today'?dayKey():0,key=day?'today:'+day:'endless';
    const c=this.cache[key];if(c&&Date.now()-c.t<45000)return c.rows;
    if(this.pending[key])return this.pending[key];
    const epoch=this.epoch;
    const pending=this.query(day?'days/'+day:'',{from:[{collectionId:'runs'}],orderBy:[{field:{fieldPath:'score'},direction:'DESCENDING'}],limit:150}).then(rows=>{
      if(epoch===this.epoch)this.cache[key]={t:Date.now(),rows};return rows;
    });
    this.pending[key]=pending;
    try{return await pending}finally{if(this.pending[key]===pending)delete this.pending[key]}
  },
  async fetch(board){
    if(board==='ladder'||board==='level'){
      const key='profiles',cached=this.cache[key];
      const profiles=cached&&Date.now()-cached.t<45000?cached.rows:await this.query('',{from:[{collectionId:'profiles'}],limit:500});
      if(!cached||Date.now()-cached.t>=45000)this.cache[key]={t:Date.now(),rows:profiles};
      const field=board==='ladder'?'trophies':'lv';
      const byName=new Map(),me=CLOUD.uid();
      for(const p of profiles.filter(p=>p._id&&p.name)){
        const row={uid:p._id,name:p.name,av:p.av,cls:p.cls,score:Math.max(0,Number(p[field])||0),axp:p.axp||0,guest:!!p.guest};
        if(board==='ladder'&&row.score<=0||board==='level'&&row.score<=1&&row.axp<=0)continue;
        const key=p.name.normalize('NFKC').trim().toLocaleLowerCase(),old=byName.get(key);
        if(!key)continue;
        if(!old||row.score>old.score||(row.score===old.score&&((board==='level'&&row.axp>old.axp)||((board!=='level'||row.axp===old.axp)&&(row.uid===me||old.uid!==me&&old.guest&&!row.guest)))))byName.set(key,row);
      }
      const rows=[...byName.values()];
      rows.sort((a,b)=>b.score-a.score||(board==='level'?b.axp-a.axp:0)||String(a.uid).localeCompare(String(b.uid)));
      return {ok:true,count:rows.length,rows,me:CLOUD.uid()};
    }
    const raw=await this.raw(board),best=new Map();
    for(const r of raw){
      if((board==='endless'&&r.mode!=='solo')||['pk','qpk','room'].includes(r.mode)||!Number.isFinite(r.score)||r.score<0)continue;
      const k=r.uid||r.name;if(!k)continue;
      if(!best.has(k)||lbCompare(r,best.get(k))<0)best.set(k,r);
    }
    const named=new Map(),me=CLOUD.uid();
    for(const r of best.values()){
      const key=String(r.name||r.uid||'').normalize('NFKC').trim().toLocaleLowerCase(),old=named.get(key);
      if(!old||lbCompare(r,old)<0||lbCompare(r,old)===0&&r.uid===me)named.set(key,r);
    }
    const rows=[...named.values()].sort(lbCompare);
    return {ok:true,count:rows.length,rows,me:CLOUD.uid()};
  },
  async profiles(uids){
    const out={},need=[...new Set(uids.filter(Boolean))].slice(0,90);
    try{for(let i=0;i<need.length;i+=30){
      const ids=need.slice(i,i+30),base=`projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/profiles/`;
      const rows=await this.query('',{from:[{collectionId:'profiles'}],where:{fieldFilter:{field:{fieldPath:'__name__'},op:'IN',value:{arrayValue:{values:ids.map(uid=>({referenceValue:base+uid}))}}}}});
      for(const row of rows)if(row._id)out[row._id]=row;
    }}catch(e){console.warn('profiles lookup',e)}
    return out;
  },
  async submit(run){
    if(!CLOUD.on())return {ok:false,error:'disabled'};
    if(run.uid&&run.uid!==CLOUD.uid())return {ok:false,error:'account-changed'};
    const doc={name:String(run.name||'Nameless').slice(0,16),cls:run.cls,map:run.map,diff:run.diff,mode:run.mode||'solo',time:Math.round(run.time),kills:Math.round(run.kills),bosses:Math.round(run.bosses),level:Math.round(run.level),combo:Math.round(run.combo),relics:Math.round(run.relics),score:Math.round(run.score||0),day:run.day||dayKey(),tier:Math.round(run.tier||0),uid:CLOUD.uid(),ts:firebase.firestore.FieldValue.serverTimestamp()};
    const post=async d=>{
      const batch=CLOUD.db.batch();
      if(run.allTime!==false)batch.set(CLOUD.db.collection('runs').doc(),d);
      batch.set(CLOUD.db.collection('days').doc(String(d.day)).collection('runs').doc(),d);
      await batch.commit();
    };
    try{
      if(!this.noAv&&run.av){try{await post({...doc,av:{e:run.av.e|0,h:run.av.h|0}})}catch(e){if(e.code!=='permission-denied')throw e;await post(doc);this.noAv=true;try{localStorage.setItem('sl_lb_noav','1')}catch(_){}}}
      else await post(doc);
      this.epoch++;this.cache={};this.pending={};
      return {ok:true};
    }catch(e){console.warn('submit failed',e);return {ok:false,error:e.code==='permission-denied'?'implausible':'network'}}
  }
};
