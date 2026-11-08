'use strict';
/* Match history and consent-based friends. Email lookup is an exact, authenticated
   document read; emails are never placed in public player profiles or friend lists. */
const SOCIAL={uid:null,epoch:0,unsubs:[],incoming:[],outgoing:[],invites:[],profiles:{},tab:'friends',inviteCode:null,sentInvites:{},returnFocus:null,view:null,seq:0,error:'',historyBusy:false};
function socialUid(){return typeof CLOUD!=='undefined'&&CLOUD.registered()?CLOUD.uid():null}
function socialMergeHistory(a=[],b=[]){const rows=new Map();for(const r of [...a,...b])if(r&&typeof r.id==='string'){const old=rows.get(r.id);if(!old||(r.at||0)>=(old.at||0))rows.set(r.id,{...old,...r})}return [...rows.values()].sort((x,y)=>y.at-x.at).slice(0,200)}
function socialHistoryRows(uid=socialUid()){return (SAVE.history||[]).filter(r=>(r.uid||null)===(uid||null)).sort((a,b)=>b.at-a.at)}
function socialRecordMatch(roomResult){
  if(!G||G.auto||!G.ended||(G.room&&!roomResult))return;
  const uid=G.historyUid||null,id=G.historyId||(G.historyId=typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
  const pk=!!G.rival||!!G.room,aborted=!!(G.abandoned||G.duelAborted||roomResult?.aborted);
  const outcome=aborted?'abandoned':roomResult?(roomResult.waiting?'finished':roomResult.rank===1?'win':'lose'):G.rival?(G.score>G.rival.score?'win':G.score<G.rival.score?'lose':'tie'):G.retired?'cashed':G.over==='lose'?'fallen':'finished';
  const r={id,uid,at:Date.now(),mode:pk?'duel':'endless',outcome,score:Math.round(G.score||0),time:Math.round(G.t||0),kills:G.kills||0,bosses:G.bossSlain||0,level:G.lv||1,cls:G.cls||CLASS,map:MAPID,tier:ASURA_T||0,rank:roomResult?.rank||0,trophies:SAVE.trophies||0,delta:roomResult?.delta||G.metaReward?.dT||0,skills:G.spells.map(s=>({id:s.id,lv:s.lv})),provisional:!!roomResult?.waiting,synced:false};
  // One row per run, including rerendered multiplayer results.
  const prior=(SAVE.history||[]).find(x=>x.id===id);if(prior){if(!prior.provisional||roomResult?.waiting)return;r.at=prior.at}
  SAVE.history=socialMergeHistory(SAVE.history,[r]);persist();socialFlushHistory();
}
async function socialFlushHistory(){
  const uid=socialUid(),epoch=CLOUD.epoch;if(!uid||SOCIAL.historyBusy)return;
  SOCIAL.historyBusy=true;let uploaded=false;
  try{for(const r of socialHistoryRows(uid).filter(r=>!r.synced)){
    if(!socialUid()||CLOUD.uid()!==uid||CLOUD.epoch!==epoch)break;
    const {synced,...data}=r;await CLOUD.db.collection('battleHistory').doc(uid).collection('matches').doc(r.id).set({...data,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    if(CLOUD.uid()!==uid||CLOUD.epoch!==epoch)break;r.synced=true;uploaded=true;persist();
  }}catch(e){console.warn('history sync failed',e)}finally{SOCIAL.historyBusy=false;if(uploaded&&socialUid()===uid&&socialHistoryRows(uid).some(r=>!r.synced))setTimeout(socialFlushHistory,0)}
}
function socialFriends(){const by=new Map();for(const r of [...SOCIAL.incoming,...SOCIAL.outgoing])if(r.status==='accepted'){const uid=r.from===SOCIAL.uid?r.to:r.from;by.set(uid,{uid,request:r.id})}return [...by.values()]}
function socialStamp(){return firebase.firestore.FieldValue.serverTimestamp()}
async function socialPublishDirectory(){
  const u=CLOUD.user;if(!socialUid()||!u.email||!u.emailVerified)return;
  await CLOUD.db.collection('emailDirectory').doc(u.email.trim().toLowerCase()).set({uid:u.uid,updatedAt:socialStamp()});
}
function socialAuthChanged(){
  const uid=socialUid();if(SOCIAL.uid===uid)return;
  SOCIAL.unsubs.forEach(f=>f());SOCIAL.unsubs=[];SOCIAL.uid=uid;SOCIAL.epoch++;SOCIAL.seq++;SOCIAL.profiles={};SOCIAL.incoming=[];SOCIAL.outgoing=[];SOCIAL.invites=[];SOCIAL.sentInvites={};SOCIAL.view=null;SOCIAL.error='';socialNotify();
  if(!uid){if(!$('#socialov')?.hidden)socialOpen(SOCIAL.tab);return}
  const epoch=SOCIAL.epoch,listen=(collection,field,key)=>{
    const off=CLOUD.db.collection(collection).where(field,'==',uid).limit(100).onSnapshot(s=>{
      if(SOCIAL.epoch!==epoch)return;SOCIAL[key]=s.docs.map(d=>({id:d.id,...d.data()}));socialNotify();if(!$('#socialov')?.hidden)socialRender();
    },e=>{if(SOCIAL.epoch!==epoch)return;SOCIAL.error=L('连接失败，请稍后重试','Connection failed. Please retry.');socialMessage(SOCIAL.error);console.warn('social subscription failed',e)});SOCIAL.unsubs.push(off);
  };
  listen('friendRequests','to','incoming');listen('friendRequests','from','outgoing');listen('duelInvites','to','invites');
  socialPublishDirectory().catch(e=>console.warn('friend directory unavailable',e));socialFlushHistory();if($('#socialov')?.hidden===false)socialOpen(SOCIAL.tab);
}
async function socialGetProfile(uid){if(SOCIAL.profiles[uid])return SOCIAL.profiles[uid];const d=await CLOUD.db.collection('profiles').doc(uid).get();const p=d.exists?d.data():{};return SOCIAL.profiles[uid]={...p,name:String(p.name||L('侠客','Hero')),lv:Math.max(1,Math.floor(Number(p.lv)||1)),trophies:Math.max(0,Math.floor(Number(p.trophies)||0)),bestScore:Math.max(0,Number(p.bestScore)||0)}}
function socialName(p){return esc(p?.name||L('侠客','Hero'))}
function socialMessage(text){const el=$('#socialmsg');if(el&&$('#socialov')?.hidden===false){el.textContent=text;el.hidden=!text}else if(text&&typeof showBanner==='function')showBanner(text,text,3)}
function socialBusy(button,fn){button.disabled=true;return Promise.resolve().then(fn).catch(e=>{socialMessage(e.code?L('操作未完成，请稍后重试','Could not complete this action. Please retry.'):e.message||L('操作失败，请重试','Please retry'));console.warn('social action failed',e)}).finally(()=>{if(button.isConnected)button.disabled=false})}
async function socialAdd(email){
  const uid=socialUid(),em=String(email||'').trim().toLowerCase();if(!uid)throw Error(L('请先登录','Sign in first'));
  if(!CLOUD.user.emailVerified)throw Error(L('请先在设置中验证邮箱，再添加好友','Verify your email in Settings before adding friends'));
  if(!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(em))throw Error(L('请输入有效邮箱','Enter a valid email'));
  const found=await CLOUD.db.collection('emailDirectory').doc(em).get();
  if(!found.exists)throw Error(L('未找到此邮箱；对方需注册并验证邮箱','No player found. They need to register and verify their email'));
  const to=found.data().uid;if(to===uid)throw Error(L('这是你自己的账号','This is your own account'));
  if(socialFriends().some(f=>f.uid===to))throw Error(L('已经是好友','Already friends'));
  if([...SOCIAL.incoming,...SOCIAL.outgoing].some(r=>r.status==='pending'&&(r.from===to||r.to===to)))throw Error(L('已有待处理的好友申请','A friend request is already pending'));
  await CLOUD.db.collection('friendRequests').doc(uid+'_'+to).set({from:uid,to,status:'pending',createdAt:socialStamp()});socialMessage(L('好友申请已发送','Friend request sent'));
}
async function socialRequestAction(id,accept){const ref=CLOUD.db.collection('friendRequests').doc(id);if(accept)await ref.update({status:'accepted'});else await ref.delete()}
async function socialRemove(uid){for(const r of [...SOCIAL.incoming,...SOCIAL.outgoing])if(r.status==='accepted'&&(r.from===uid||r.to===uid))await CLOUD.db.collection('friendRequests').doc(r.id).delete();SOCIAL.view=null}
function socialInviteState(uid){
  if(ROOM.players?.[uid])return 'joined';
  return Date.now()-(SOCIAL.sentInvites[ROOM.code+'_'+uid]||0)<60000?'sent':'ready';
}
async function socialInvite(uid){
  if(!socialUid())throw Error(L('请先登录','Sign in first'));
  if(!socialFriends().some(f=>f.uid===uid))throw Error(L('请先添加对方为好友','Add this player as a friend first'));
  if(G&&!G.auto&&!G.ended)throw Error(L('请先结束当前对局','Finish your current match first'));
  if(!ROOM.code||SOCIAL.inviteCode!==ROOM.code||ROOM.playing||ROOM.data?.state!=='lobby')throw Error(L('房间已变化，请回到对决大厅重新邀请','The room changed. Open invitations again from the duel lobby'));
  if(roomPlayerList().length>=(ROOM.data.max||4))throw Error(L('房间已满','The room is full'));
  if(!netOnline())throw Error(L('对决服务暂未连接，请稍后重试','Duel service is offline. Please retry'));
  if(socialInviteState(uid)!=='ready')return;
  const code=ROOM.code;
  await CLOUD.db.collection('duelInvites').add({from:socialUid(),to:uid,code,createdAt:socialStamp(),expiresAt:firebase.firestore.Timestamp.fromMillis(Date.now()+9*60*1000)});
  SOCIAL.sentInvites[code+'_'+uid]=Date.now();socialMessage(L('邀请已发送，等待好友加入','Invitation sent. Waiting for your friend'));socialRender();
}
async function socialJoinInvite(invite){
  if(!socialUid())throw Error(L('请先登录','Sign in first'));
  if(!invite.expiresAt?.toMillis||invite.expiresAt.toMillis()<=Date.now())throw Error(L('邀请已过期，请让好友重新邀请','This invitation expired. Ask your friend to invite again'));
  if(G&&!G.auto&&!G.ended)throw Error(L('请先结束当前对局，再接受邀请','Finish your current match before joining'));
  let joined;try{joined=await roomJoin(invite.code)}catch(e){throw Error(roomErr(e))}
  if(joined===false)return;socialClose();if(G?.ended)toLobby();SAVE.mode='room';persist();renderTitle();showScreen('hero');
  // A cleanup failure must not turn a successful join into a failed invitation.
  CLOUD.db.collection('duelInvites').doc(invite.id).delete().catch(e=>console.warn('invite cleanup failed',e));
}
function socialNotify(){
  const count=SOCIAL.incoming.filter(r=>r.status==='pending').length,button=$('#friendsbtn');if(button){button.dataset.count=count||'';button.setAttribute('aria-label',L('好友','Friends')+(count?' '+count:''))}
  let box=$('#social-notice');if(!box){box=document.createElement('div');box.id='social-notice';document.body.appendChild(box)}
  const valid=SOCIAL.invites.filter(r=>r.expiresAt?.toMillis?.()>Date.now()).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)),r=valid[0];
  if(!r){box.hidden=true;return}if(box.dataset.id===r.id&&!box.hidden)return;
  box.hidden=false;box.dataset.id=r.id;box.innerHTML=`<span>${L('好友邀请你加入对决','A friend invited you to a duel')} · <b>${esc(r.code)}</b></span><button type="button" class="go sm">${L('加入','Join')}</button><button type="button" class="back" aria-label="${L('忽略邀请','Dismiss invitation')}">×</button>`;
  box.querySelector('.go').onclick=e=>socialBusy(e.currentTarget,()=>socialJoinInvite(r)).catch(()=>{});
  box.querySelector('.back').onclick=()=>CLOUD.db.collection('duelInvites').doc(r.id).delete().catch(()=>{});
}
function socialNumber(value){const n=Number(value);return Number.isFinite(n)?n:0}
function socialDate(at){return new Date(at).toLocaleString(typeof LOC!=='undefined'&&LOC==='zh'?'zh-CN':'en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function socialOutcome(r){return ({win:L('胜利','Won'),lose:L('落败','Lost'),tie:L('平局','Draw'),abandoned:r.mode==='duel'?L('对决中止','Interrupted'):L('已放弃','Abandoned'),cashed:L('收官','Cashed out'),fallen:L('败亡','Fallen'),finished:L('完成','Finished')})[r.outcome]||L('完成','Finished')}
function socialHistoryHTML(rows){return rows.length?rows.map(r=>`<article class="history-row"><div><b class="${r.outcome==='win'?'positive':''}">${r.mode==='duel'?L('对决','Duel'):L('无尽','Endless')} · ${socialOutcome(r)}</b><time>${socialDate(r.at)}</time></div><strong>${Math.round(socialNumber(r.score)).toLocaleString('en-US')} <small>${L('分','pts')}</small></strong><p>${esc(CLASSES[r.cls]?LL(CLASSES[r.cls]):r.cls||'')} · ${fmt(socialNumber(r.time))} · Lv ${socialNumber(r.level)||1} · ${socialNumber(r.kills)} ${L('击杀','kills')}${r.rank?' · #'+socialNumber(r.rank):''}${r.tier?' · '+L('修罗','Tier')+' '+socialNumber(r.tier):''}</p><details><summary>${L('对局详情','Match details')}</summary><p>${r.mode==='duel'?L('天梯：','Ladder: ')+Math.round(socialNumber(r.trophies))+' ('+(r.delta>0?'+':'')+socialNumber(r.delta)+') · ':''}${socialNumber(r.bosses)} ${L('首领','bosses')} · ${esc(MAPS[r.map]?LL(MAPS[r.map]):r.map||'')}</p><p>${(Array.isArray(r.skills)?r.skills:[]).filter(s=>s&&typeof s.id==='string').map(s=>`${esc(SPELLS[s.id]?LL(SPELLS[s.id]):s.id)} Lv ${socialNumber(s.lv)}`).join(' · ')}</p></details></article>`).join(''):`<p class="social-empty">${L('还没有战绩，完成一局后会记录在这里','No matches yet. Finish a match to record it here.')}</p>`}
async function socialLoadHistory(uid){
  const local=uid===socialUid()?socialHistoryRows(uid):[];if(!uid||!socialUid())return local;
  const snap=await CLOUD.db.collection('battleHistory').doc(uid).collection('matches').orderBy('at','desc').limit(50).get();
  return socialMergeHistory(local,snap.docs.map(d=>({...d.data(),id:d.id,synced:true})));
}
function socialOpen(tab='friends'){
  SOCIAL.returnFocus=document.activeElement;SOCIAL.inviteCode=tab==='invite'?ROOM.code:null;SOCIAL.tab=tab;SOCIAL.view=null;SOCIAL.profiles={};let el=$('#socialov');if(!el){el=document.createElement('div');el.id='socialov';el.className='social-overlay';el.hidden=true;document.body.appendChild(el);el.onclick=e=>{if(e.target===el)socialClose()}}
  el.hidden=false;el.innerHTML=`<section class="social-panel" role="dialog" aria-modal="true" aria-labelledby="socialtitle"><header><h2 id="socialtitle">${tab==='invite'?L('邀请好友对决','Invite friends to duel'):L('江湖','Community')}</h2><button type="button" class="go alt sm" id="socialclose">${L('关闭','Close')}</button></header><nav ${tab==='invite'?'hidden':''}><button type="button" id="socialhistory" class="${tab==='history'?'on':''}">${L('战绩','History')}</button><button type="button" id="socialfriends" class="${tab==='friends'?'on':''}">${L('好友','Friends')}</button></nav><div id="socialform"></div><p id="socialmsg" role="status" hidden></p><div id="socialbody"></div></section>`;
  $('#socialclose').onclick=socialClose;$('#socialhistory').onclick=()=>socialOpen('history');$('#socialfriends').onclick=()=>socialOpen('friends');
  if(tab==='friends'&&socialUid()){$('#socialform').innerHTML=`<form id="friendform"><label for="friendemail">${L('按邮箱添加好友','Add a friend by email')}</label><div><input id="friendemail" type="email" autocomplete="off" inputmode="email" placeholder="${L('好友的邮箱','Friend’s email')}" required maxlength="254"><button type="submit" class="go sm">${L('添加','Add')}</button></div><small>${L('对方同意申请后，可以查看战绩并邀请对决','Once accepted, you can view their history and invite them to a duel')}</small></form>`;$('#friendform').onsubmit=e=>{e.preventDefault();socialBusy(e.submitter||$('#friendform button'),()=>socialAdd($('#friendemail').value))}}
  if(tab==='invite'&&socialUid())$('#socialform').innerHTML=`<p class="invite-room">${L('房间','Room')} <b>${esc(SOCIAL.inviteCode||'')}</b> · ${L('选择好友发送邀请','Choose friends to invite')}</p>`;
  if(!socialUid())$('#socialform').innerHTML=`<p>${L('游客战绩保存在本机；登录后可同步战绩、添加好友','Guest history is stored on this device. Sign in to sync matches and add friends.')}</p><button type="button" class="go alt sm" id="socialsignin">${L('登录 / 注册','Sign in / Register')}</button>`;
  if($('#socialsignin'))$('#socialsignin').onclick=()=>{socialClose();lbSignIn()};socialRender();$('#socialclose').focus({preventScroll:true});
}
function socialClose(){const el=$('#socialov');if(el)el.hidden=true;SOCIAL.seq++;const b=SOCIAL.tab==='invite'?$('#rminvite'):$(SOCIAL.tab==='history'?'#historybtn':'#friendsbtn');(b||SOCIAL.returnFocus)?.focus({preventScroll:true})}
async function socialRender(){
  if($('#socialov')?.hidden!==false)return;const seq=++SOCIAL.seq,body=$('#socialbody');if(!body)return;
  try{
    if(SOCIAL.tab==='history'){body.innerHTML=socialHistoryHTML(socialHistoryRows());const rows=await socialLoadHistory(socialUid());if(seq!==SOCIAL.seq)return;body.innerHTML=socialHistoryHTML(rows);return}
    if(!socialUid()){body.innerHTML='';return}
    const friends=socialFriends(),requests=SOCIAL.incoming.filter(r=>r.status==='pending'),outgoing=SOCIAL.outgoing.filter(r=>r.status==='pending');
    const ids=[...new Set([...friends.map(f=>f.uid),...requests.map(r=>r.from),...outgoing.map(r=>r.to)])];await Promise.all(ids.map(uid=>socialGetProfile(uid)));if(seq!==SOCIAL.seq)return;
    if(SOCIAL.tab==='invite'){
      const valid=SOCIAL.inviteCode===ROOM.code&&ROOM.data?.state==='lobby'&&!ROOM.playing,full=roomPlayerList().length>=(ROOM.data?.max||4);
      body.innerHTML=!valid?`<p class="social-empty">${L('房间已变化，请关闭后重新邀请','The room changed. Close this list and open it again')}</p>`:(full?`<p>${L('房间已满','The room is full')}</p>`:'')+(friends.length?friends.map(f=>{const p=SOCIAL.profiles[f.uid],state=socialInviteState(f.uid),lad=ladderOf(p.trophies||0);return `<article class="friend-row">${p.av?avatarHTML(p.av):''}<div><b>${socialName(p)}</b><small>Lv ${p.lv||1} · ${L(lad[1],lad[2])} · ${p.trophies||0}</small></div><button type="button" class="go sm" data-invite="${esc(f.uid)}" ${full||state!=='ready'?'disabled':''}>${state==='joined'?L('已在房间','In room'):state==='sent'?L('已邀请','Invited'):L('邀请','Invite')}</button></article>`}).join(''):`<p class="social-empty">${L('还没有好友，请先到首页的好友页面按邮箱添加','No friends yet. Add friends by email from Friends on the home screen.')}</p>`);socialWireActions(body);return;
    }
    if(SOCIAL.view){const uid=SOCIAL.view,p=await socialGetProfile(uid);const lad=ladderOf(p.trophies||0);body.innerHTML=`<button type="button" class="back" id="friendback">‹ ${L('好友列表','Friends')}</button><div class="friend-profile">${p.av?avatarHTML(p.av):''}<h3>${socialName(p)}</h3><p>Lv ${p.lv||1} · ${L('天梯：','Ladder: ')}${L(lad[1],lad[2])} · ${p.trophies||0} ${L('分','pts')}</p><p>${L('无尽最高分','Endless best')} · ${Math.round(p.bestScore||0).toLocaleString('en-US')}</p><button type="button" class="back" id="friendremove">${L('移除好友','Remove friend')}</button></div><h3>${L('最近战绩','Recent matches')}</h3><div id="friendhistory">${L('加载中…','Loading…')}</div>`;$('#friendback').onclick=()=>{SOCIAL.view=null;socialRender()};$('#friendremove').onclick=e=>socialBusy(e.currentTarget,()=>socialRemove(uid));socialWireActions(body);const rows=await socialLoadHistory(uid);if(seq!==SOCIAL.seq)return;$('#friendhistory').innerHTML=socialHistoryHTML(rows);return}
    body.innerHTML=(requests.length?`<h3>${L('好友申请','Friend requests')}</h3>`+requests.map(r=>`<article class="friend-row"><b>${socialName(SOCIAL.profiles[r.from])}</b><div><button type="button" class="go sm" data-accept="${esc(r.id)}">${L('同意','Accept')}</button><button type="button" class="back" data-reject="${esc(r.id)}">${L('忽略','Decline')}</button></div></article>`).join(''):'')+`<h3>${L('我的好友','Friends')} · ${friends.length}</h3>`+(friends.length?friends.map(f=>{const p=SOCIAL.profiles[f.uid],lad=ladderOf(p.trophies||0);return `<article class="friend-row">${p.av?avatarHTML(p.av):''}<div><b>${socialName(p)}</b><small>Lv ${p.lv||1} · ${L(lad[1],lad[2])} · ${p.trophies||0}</small></div><div class="friend-actions"><button type="button" class="back" data-view="${esc(f.uid)}">${L('资料 / 战绩','Profile / History')}</button></div></article>`}).join(''):`<p class="social-empty">${L('添加好友，一起对决','Add friends and duel together')}</p>`)+(outgoing.length?`<h3>${L('已发送申请','Sent requests')}</h3>`+outgoing.map(r=>`<article class="friend-row"><b>${socialName(SOCIAL.profiles[r.to])}</b><span>${L('等待同意','Pending')}</span><button type="button" class="back" data-reject="${esc(r.id)}">${L('取消','Cancel')}</button></article>`).join(''):'');socialWireActions(body);
  }catch(e){if(seq===SOCIAL.seq){socialMessage(L('加载失败，请重试','Could not load. Please retry.'));body.insertAdjacentHTML('beforeend',`<button type="button" class="back" id="socialretry">${L('重试','Retry')}</button>`);$('#socialretry').onclick=()=>{SOCIAL.profiles={};socialRender()}}console.warn('social view failed',e)}
}
function socialWireActions(body){body.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>socialBusy(b,()=>socialRequestAction(b.dataset.accept,true)));body.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>socialBusy(b,()=>socialRequestAction(b.dataset.reject,false)));body.querySelectorAll('[data-invite]').forEach(b=>b.onclick=()=>socialBusy(b,()=>socialInvite(b.dataset.invite)));body.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{SOCIAL.view=b.dataset.view;socialRender()})}
$('#historybtn').onclick=()=>socialOpen('history');$('#friendsbtn').onclick=()=>socialOpen('friends');
document.addEventListener('keydown',e=>{if($('#socialov')?.hidden===false){if(e.key==='Escape'){e.preventDefault();socialClose()}else if(e.key==='Tab'){const buttons=[...$('#socialov').querySelectorAll('button:not([disabled]),input,summary')].filter(b=>b.getClientRects().length),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}});
addEventListener('online',socialFlushHistory);addEventListener('focus',()=>{socialFlushHistory();socialNotify()});setInterval(socialNotify,30000);

async function socialDeleteAccountData(){
  const uid=socialUid();if(!uid)return;
  const refs=[];
  for(const collection of ['friendRequests','duelInvites'])for(const field of ['from','to']){
    const snap=await CLOUD.db.collection(collection).where(field,'==',uid).get();refs.push(...snap.docs.map(d=>d.ref));
  }
  const history=await CLOUD.db.collection('battleHistory').doc(uid).collection('matches').get();refs.push(...history.docs.map(d=>d.ref));
  if(CLOUD.user.email&&CLOUD.user.emailVerified)refs.push(CLOUD.db.collection('emailDirectory').doc(CLOUD.user.email.toLowerCase()));
  for(let i=0;i<refs.length;i+=400){const b=CLOUD.db.batch();refs.slice(i,i+400).forEach(r=>b.delete(r));await b.commit()}
  SAVE.history=(SAVE.history||[]).filter(r=>r.uid!==uid);persist();
}
