'use strict';
/* leaderboard.js — kept deliberately simple:
   · no typing: a new personal best score is posted automatically under the hero name/avatar from the top of the menu
   · results screen: one line, your rank and who is next above you
   · board: solo endless score / duel trophies / account level, top three on a podium, your own row pinned at the bottom
   Backend: Firestore through CLB in cloud.js. */
const LEADERBOARD_URL='';   // optional Google Apps Script web-app URL, used only when Firebase is unavailable
const LB={
  token(){let t=null;try{t=localStorage.getItem('sl_token');if(!t){t=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('sl_token',t)}}catch(_){t=t||'anon'}return t},
  name(){let n=(typeof SAVE!=='undefined'&&SAVE.name)||'';if(!n)try{n=localStorage.getItem('sl_name')||''}catch(_){}if(!n&&typeof CLOUD!=='undefined'&&CLOUD.user&&!CLOUD.user.isAnonymous&&CLOUD.user.displayName)n=CLOUD.user.displayName.slice(0,16);return n},
  setName(n){n=String(n||'').trim().slice(0,12);if(!n)return;if(typeof SAVE!=='undefined'){SAVE.name=n;SAVE.nameSet=true;persist()}try{localStorage.setItem('sl_name',n)}catch(_){}},
  cloud(){return typeof CLOUD!=='undefined'&&CLOUD.on()},
  enabled(){return typeof CLB!=='undefined'||!!LEADERBOARD_URL},
  me(){return this.cloud()?CLOUD.uid():null},
  isMe(r){const u=this.me();return u?r.uid===u:!r.uid&&!!this.name()&&r.name===this.name()},
  async fetch(board,filters={}){
    if(typeof CLB!=='undefined')return CLB.fetch(board,filters);
    if(!LEADERBOARD_URL||board==='ladder'||board==='level')return null;
    const q=new URLSearchParams({board:board==='daily'?'today':board,token:this.token(),...filters});
    const r=await fetch(LEADERBOARD_URL+'?'+q.toString(),{method:'GET'});
    return r.json();
  },
  async profiles(rows){if(typeof CLB==='undefined')return {};return CLB.profiles(rows.map(r=>r.uid))},
  async submit(run){
    if(this.cloud())return CLB.submit(run);
    if(!LEADERBOARD_URL)return {ok:false,error:'disabled'};
    const body=JSON.stringify({...run,token:this.token(),trap:''});
    const r=await fetch(LEADERBOARD_URL+'?ua='+encodeURIComponent((navigator.userAgent||'').slice(0,60)),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body});
    return r.json();
  },
};
const lbCompare=(a,b)=>(b.score||0)-(a.score||0)||(b.bosses||0)-(a.bosses||0)||(b.kills||0)-(a.kills||0)||(b.time||0)-(a.time||0)||String(a.uid||a.name||'').localeCompare(String(b.uid||b.name||''));
const MEDAL=['🥇','🥈','🥉'];
function lbAvOf(r){if(r.av&&r.av.e!==undefined)return r.av;const s=String(r.uid||r.name||'?');let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return {e:h%AVATARS.length,h:(h>>>8)%360}}
function lbDecorate(rows,prof){return rows.map(r=>{const p=(prof&&r.uid&&prof[r.uid])||{};const mine=LB.isMe(r);return {...r,name:mine?(LB.name()||r.name):(p.name||r.name||'?'),av:mine?SAVE.avatar:(p.av||lbAvOf(r)),mine}})}
function lbCls(k){const C=CLASSES[k];return C?`<span class="lbcls" style="--c:${C.col}">${C.g}</span>${esc(LL(C))}`:''}
function lbValue(r){const n=Math.round(r.score||0).toLocaleString('en-US');return lbBoard==='ladder'?`${n} 🏆`:lbBoard==='level'?`Lv ${n}`:n}
function lbRow(r,i){return `<li class="lbr${r.mine?' me':''}"><span class="rk">${i<3?MEDAL[i]:i+1}</span>${avatarHTML(r.av)}<span class="who"><b>${esc(r.name)}</b><small>${lbCls(r.cls)}</small></span><b class="mv">${lbValue(r)}</b></li>`}
function lbPodium(rows){const slot=(r,i)=>r?`<div class="pod p${i+1}${r.mine?' me':''}"><span class="md">${MEDAL[i]}</span>${avatarHTML(r.av,'big')}<b>${esc(r.name)}</b><span class="pv">${lbValue(r)}</span><i class="step"></i></div>`:`<div class="pod p${i+1} empty"><span class="md">${MEDAL[i]}</span><span class="av big ghost">?</span><b>—</b><i class="step"></i></div>`;
  return `<div class="podium3">${slot(rows[1],1)}${slot(rows[0],0)}${slot(rows[2],2)}</div>`}
/* ---- the board ---- */
let lbBoard='endless',lbSeq=0;
function lbRetry(body){body.innerHTML=`<p class="lbnote">${L('暂时无法加载','Unavailable right now')}</p>`;const b=document.createElement('button');b.type='button';b.className='go alt sm';b.textContent='↻';b.setAttribute('aria-label',L('重试','Retry'));b.onclick=()=>openLeaderboard(lbBoard);body.appendChild(b)}
async function openLeaderboard(board){
  if(['endless','ladder','level'].includes(board))lbBoard=board;const seq=++lbSeq;$('#lb').hidden=false;
  $('#lbbox').innerHTML=`<div class="lbhead"><div class="lbtabs">${[['endless','无尽分数','Endless'],['ladder','天梯榜','Ladder'],['level','级别','Level']].map(t=>`<button type="button" data-b="${t[0]}" class="${lbBoard===t[0]?'on':''}">${L(t[1],t[2])}</button>`).join('')}</div><button type="button" class="lbx" id="lbclose" aria-label="${L('关闭','Close')}">✕</button></div><div class="lbscroll" id="lbbody"><p class="lbnote">${L('载入中…','Loading…')}</p></div><div class="lbmine" id="lbmine"></div>`;
  $('#lbclose').onclick=closeLeaderboard;document.querySelectorAll('#lbbox [data-b]').forEach(b=>b.onclick=()=>{SFX.pick(1);openLeaderboard(b.dataset.b)});
  const body=$('#lbbody'),mine=$('#lbmine');
  try{
    const d=await LB.fetch(lbBoard);if(seq!==lbSeq)return;
    if(!d||!d.ok){lbRetry(body);return}
    const myI=d.rows.findIndex(r=>LB.isMe(r)),top=d.rows.slice(0,50);
    const render=prof=>{
      if(seq!==lbSeq)return;
      const rows=lbDecorate(top,prof);
      body.innerHTML=lbPodium(rows.slice(0,3))+(rows.length>3?`<ol class="lbl">${rows.slice(3).map((r,i)=>lbRow(r,i+3)).join('')}</ol>`:'')+(rows.length?'':`<p class="lbnote big">${L('还没人上榜','No one yet')}</p>`);
      mine.innerHTML=myI>=50?`<ol class="lbl">${lbRow(lbDecorate([d.rows[myI]],prof)[0],myI)}</ol>`:myI<0?`<p class="lbnote cta">${L('未上榜','Unranked')}</p>`:'';
      mine.hidden=myI>=0&&myI<50;
    };
    render({});
    // Scores already contain names/avatars. Refresh renamed profiles after showing them.
    if(lbBoard==='endless'&&top.length)LB.profiles(myI>=50?[...top,d.rows[myI]]:top).then(render).catch(e=>console.warn('profiles lookup',e));
  }catch(e){console.warn(e);if(seq===lbSeq)lbRetry(body)}
}
function closeLeaderboard(){$('#lb').hidden=true;lbSeq++;lbMenuRank()}
function wireLeaderboard(){
  const b=$('#lbbtn');if(b)b.onclick=()=>{SFX.pick(1);openLeaderboard()};
  addEventListener('online',lbFlushPending);addEventListener('focus',lbFlushPending);
  $('#lb').addEventListener('click',e=>{if(e.target.id==='lb')closeLeaderboard()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#lb').hidden)closeLeaderboard()});
  lbMenuRank();
}
async function lbMenuRank(){
  lbFlushPending();
  const b=$('#lbbtn'),rk=$('#lbrank');if(!b)return;b.hidden=false;if(!LB.enabled())return;
  try{const d=await LB.fetch('endless');if(!d||!d.ok)return;const i=d.rows.findIndex(r=>LB.isMe(r));rk.textContent=i>=0?'#'+(i+1):''}catch(_){}
}
let lbFlushing=false;
async function lbFlushPending(){
  const run=SAVE.lb?.pendingRun;
  if(lbFlushing||!run||!LB.cloud()||(run.uid&&run.uid!==CLOUD.uid()))return;
  lbFlushing=true;
  try{const result=await LB.submit(run);if(result?.ok&&SAVE.lb?.pendingRun?.uid===run.uid&&SAVE.lb.pendingRun.score<=run.score){delete SAVE.lb.pendingRun;persist()}}
  catch(e){console.warn('pending score upload failed',e)}
  finally{lbFlushing=false}
}
/* ---- after a run: post a new best automatically, show one line ---- */
async function submitRun(container,snapshot){
  const isRetry=!!snapshot;
  if(!snapshot){
    if((typeof RIVAL_ON!=='undefined'&&RIVAL_ON)||G.room||G.t<20||SAVE.mode!=='solo')return;
    // Capture the finished run before any read awaits; Retry uses this same snapshot.
    snapshot={uid:LB.me(),name:LB.name()||L('无名侠客','Nameless'),av:SAVE.avatar?{...SAVE.avatar}:null,cls:G.cls,map:MAPID,diff:DIFFID,mode:SAVE.mode||'solo',score:G.score||0,day:G.day||dayKey(),tier:ASURA_T||0,time:Math.round(G.t),kills:G.kills,bosses:G.bossSlain,level:G.lv,combo:G.comboMax,relics:G.relics.length};
  }
  const run=snapshot,dk=run.day;
  const S=SAVE.lb&&typeof SAVE.lb==='object'?SAVE.lb:(SAVE.lb={});
  if(!['score','endless-score'].includes(S.rankBy)){S.rankBy='endless-score';S.bestRun=null;S.dayBestRun=null}else S.rankBy='endless-score';
  const priorLocal=S.bestRun,priorDay=S.day===dk?S.dayBestRun:null;
  const result={uid:run.uid,score:run.score,time:run.time,bosses:run.bosses,kills:run.kills};
  const localPB=!priorLocal||lbCompare(run,priorLocal)<0;
  if(localPB){S.bestRun=result;if(!S.pendingRun||S.pendingRun.uid!==run.uid||lbCompare(run,S.pendingRun)<0)S.pendingRun={...run,allTime:true}}
  if(!priorDay||lbCompare(run,priorDay)<0){if(S.day!==dk)S.dayBestRun=null;S.day=dk;S.dayBestRun=result}
  if(localPB||!priorDay||lbCompare(run,priorDay)<0)persist();
  const pb=document.createElement('p');pb.className='lbpb';pb.textContent=`${L('个人最高分','Personal best')} · ${Math.round(S.bestRun.score).toLocaleString('en-US')}`;
  const line=document.createElement('button');line.type='button';line.className='lbline';line.innerHTML=`<span class="rk">…</span><span class="tx">${L('排名结算中','Ranking…')}</span>`;
  line.onclick=()=>{SFX.pick(1);openLeaderboard('endless')};
  const anchor=container.querySelector('.endmore');if(anchor){anchor.before(line);anchor.before(pb)}else{container.appendChild(line);container.appendChild(pb)}
  let all=null,today=null;try{[all,today]=await Promise.all([LB.fetch('endless').catch(()=>null),dk===dayKey()?LB.fetch('today').catch(()=>null):Promise.resolve(null)])}catch(_){}
  const mine=r=>run.uid?r.uid===run.uid:r.name===run.name;
  const old=all&&all.ok?all.rows.find(mine):null,oldDay=today&&today.ok?today.rows.find(mine):null;
  const previous=old&&priorLocal?(lbCompare(old,priorLocal)<0?old:priorLocal):(old||priorLocal);
  const previousDay=oldDay&&priorDay?(lbCompare(oldDay,priorDay)<0?oldDay:priorDay):(oldDay||priorDay);
  const allPB=!previous||lbCompare(run,previous)<0;
  const dayPB=!previousDay||lbCompare(run,previousDay)<0;
  const retry=isRetry&&S.pendingRun?.score===run.score&&S.pendingRun?.uid===run.uid;
  if(old&&lbCompare(old,S.bestRun)<0){S.bestRun={uid:old.uid,score:old.score,time:old.time,bosses:old.bosses,kills:old.kills};pb.textContent=`${L('个人最高分','Personal best')} · ${Math.round(old.score).toLocaleString('en-US')}`;if(S.pendingRun?.score<old.score)delete S.pendingRun;persist()}
  let posted=false;
  if(allPB||dayPB||retry){try{const r=await LB.submit({...run,allTime:allPB||retry});posted=!!(r&&r.ok)}catch(_){}
    if(posted&&(!run.uid||LB.me()===run.uid)){if((allPB||retry)&&S.pendingRun?.score<=run.score)delete S.pendingRun;persist();lbMenuRank()}}
  if((allPB||dayPB||retry)&&!posted){line.innerHTML=`<span class="rk">!</span><span class="tx">${L('上传失败','Upload failed')}</span><span class="arr">↻</span>`;line.onclick=()=>{SFX.pick(1);line.remove();submitRun(container,run)};return}
  if(!all||!all.ok){line.remove();return}
  const others=all.rows.filter(r=>!mine(r)),oldI=all.rows.indexOf(old);
  const best=posted&&allPB?run:old;
  if(!best){line.innerHTML=`<span class="rk">—</span><span class="tx">${posted?L('已上今日榜','On today’s board'):L('未上榜','Unranked')}</span><span class="arr">›</span>`;return}
  const list=[...others,best].sort(lbCompare),i=list.indexOf(best);
  const up=posted&&allPB?(oldI<0?'NEW':oldI-i>0?'▲'+(oldI-i):''):'';
  line.innerHTML=`<span class="rk${i<3?' gold':''}">#${i+1}</span>${up?`<span class="up">${up}</span>`:''}<span class="tx">${L('无尽分数','Endless')}</span><span class="arr">›</span>`;
  if(up)line.classList.add('pop');
}
