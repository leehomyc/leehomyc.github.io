'use strict';
/* leaderboard.js — kept deliberately simple:
   · no typing: a new personal best is posted automatically under the hero name/avatar from the top of the menu
   · results screen: one line, your rank and who is next above you
   · board: 今日 / 总榜, top three on a podium, your own row pinned at the bottom
   Backend: Firestore through CLB in cloud.js. */
const LEADERBOARD_URL='';   // optional Google Apps Script web-app URL, used only when Firebase is unavailable
const LB={
  token(){let t=null;try{t=localStorage.getItem('sl_token');if(!t){t=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('sl_token',t)}}catch(_){t=t||'anon'}return t},
  name(){let n=(typeof SAVE!=='undefined'&&SAVE.name)||'';if(!n)try{n=localStorage.getItem('sl_name')||''}catch(_){}if(!n&&typeof CLOUD!=='undefined'&&CLOUD.user&&!CLOUD.user.isAnonymous&&CLOUD.user.displayName)n=CLOUD.user.displayName.slice(0,16);return n},
  setName(n){n=String(n||'').trim().slice(0,12);if(!n)return;if(typeof SAVE!=='undefined'){SAVE.name=n;SAVE.nameSet=true;persist()}try{localStorage.setItem('sl_name',n)}catch(_){}},
  cloud(){return typeof CLOUD!=='undefined'&&CLOUD.on()},
  enabled(){return this.cloud()||!!LEADERBOARD_URL},
  me(){return this.cloud()?CLOUD.uid():null},
  isMe(r){const u=this.me();return u?r.uid===u:r.name===this.name()},
  async fetch(board,filters={}){
    if(this.cloud())return CLB.fetch(board,filters);
    if(!LEADERBOARD_URL||board==='ladder')return null;
    const q=new URLSearchParams({board:board==='daily'?'today':board,token:this.token(),...filters});
    const r=await fetch(LEADERBOARD_URL+'?'+q.toString(),{method:'GET'});
    return r.json();
  },
  async profiles(rows){if(!this.cloud())return {};return CLB.profiles(rows.map(r=>r.uid))},
  async submit(run){
    if(this.cloud())return CLB.submit(run);
    if(!LEADERBOARD_URL)return {ok:false,error:'disabled'};
    const body=JSON.stringify({...run,token:this.token(),trap:''});
    const r=await fetch(LEADERBOARD_URL+'?ua='+encodeURIComponent((navigator.userAgent||'').slice(0,60)),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body});
    return r.json();
  },
};
const MEDAL=['🥇','🥈','🥉'];
function lbAvOf(r){if(r.av&&r.av.e!==undefined)return r.av;const s=String(r.uid||r.name||'?');let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return {e:h%AVATARS.length,h:(h>>>8)%360}}
function lbDecorate(rows,prof){return rows.map(r=>{const p=(prof&&r.uid&&prof[r.uid])||{};const mine=LB.isMe(r);return {...r,name:mine?(LB.name()||r.name):(p.name||r.name||'?'),av:mine?SAVE.avatar:(p.av||lbAvOf(r)),mine}})}
function lbCls(k){const C=CLASSES[k];return C?`<span class="lbcls" style="--c:${C.col}">${C.g}</span>${esc(LL(C))}`:''}
function lbRow(r,i){return `<li class="lbr${r.mine?' me':''}"><span class="rk">${i<3?MEDAL[i]:i+1}</span>${avatarHTML(r.av)}<span class="who"><b>${esc(r.name)}</b><small>${lbCls(r.cls)}</small></span><b class="mv">${fmt(r.time)}</b></li>`}
function lbPodium(rows){const slot=(r,i)=>r?`<div class="pod p${i+1}${r.mine?' me':''}"><span class="md">${MEDAL[i]}</span>${avatarHTML(r.av,'big')}<b>${esc(r.name)}</b><span class="pv">${fmt(r.time)}</span><i class="step"></i></div>`:`<div class="pod p${i+1} empty"><span class="md">${MEDAL[i]}</span><span class="av big ghost">?</span><b>—</b><i class="step"></i></div>`;
  return `<div class="podium3">${slot(rows[1],1)}${slot(rows[0],0)}${slot(rows[2],2)}</div>`}
/* ---- the board ---- */
let lbBoard='all',lbSeq=0;
async function openLeaderboard(board){
  if(board==='all'||board==='today')lbBoard=board;const seq=++lbSeq;$('#lb').hidden=false;
  $('#lbbox').innerHTML=`<div class="lbhead"><div class="lbtabs">${[['today','今日','Today'],['all','总榜','All time']].map(t=>`<button type="button" data-b="${t[0]}" class="${lbBoard===t[0]?'on':''}">${L(t[1],t[2])}</button>`).join('')}</div><button type="button" class="lbx" id="lbclose" aria-label="${L('关闭','Close')}">✕</button></div><div class="lbscroll" id="lbbody"><p class="lbnote">${L('载入中…','Loading…')}</p></div><div class="lbmine" id="lbmine"></div>`;
  $('#lbclose').onclick=closeLeaderboard;document.querySelectorAll('#lbbox [data-b]').forEach(b=>b.onclick=()=>{SFX.pick(1);openLeaderboard(b.dataset.b)});
  const body=$('#lbbody'),mine=$('#lbmine');
  try{
    const d=await LB.fetch(lbBoard);if(seq!==lbSeq)return;
    if(!d||!d.ok){body.innerHTML=`<p class="lbnote">${L('暂时无法加载','Unavailable right now')}</p>`;return}
    const myI=d.rows.findIndex(r=>LB.isMe(r)),top=d.rows.slice(0,50);
    const prof=await LB.profiles(myI>=50?[...top,d.rows[myI]]:top);if(seq!==lbSeq)return;
    const rows=lbDecorate(top,prof);
    body.innerHTML=lbPodium(rows.slice(0,3))+(rows.length>3?`<ol class="lbl">${rows.slice(3).map((r,i)=>lbRow(r,i+3)).join('')}</ol>`:'')+(rows.length?'':`<p class="lbnote big">${L('还没人上榜','No one yet')}</p>`);
    mine.innerHTML=myI>=0?`<ol class="lbl">${lbRow(lbDecorate([d.rows[myI]],prof)[0],myI)}</ol>`:`<p class="lbnote cta">${L('刷新个人最佳会自动上榜','Beat your best to get on the board')}</p>`;
  }catch(e){console.warn(e);if(seq===lbSeq)body.innerHTML=`<p class="lbnote">${L('暂时无法加载','Unavailable right now')}</p>`}
}
function closeLeaderboard(){$('#lb').hidden=true;lbSeq++;lbMenuRank()}
function wireLeaderboard(){
  const b=$('#lbbtn');if(b)b.onclick=()=>{SFX.pick(1);openLeaderboard()};
  $('#lb').addEventListener('click',e=>{if(e.target.id==='lb')closeLeaderboard()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#lb').hidden)closeLeaderboard()});
  lbMenuRank();
}
async function lbMenuRank(){
  const b=$('#lbbtn'),rk=$('#lbrank');if(!b)return;b.hidden=false;if(!LB.enabled())return;
  try{const d=await LB.fetch('all');if(!d||!d.ok)return;const i=d.rows.findIndex(r=>LB.isMe(r));rk.textContent=i>=0?'#'+(i+1):''}catch(_){}
}
/* ---- after a run: post a new best automatically, show one line ---- */
async function submitRun(container){
  if(!LB.enabled())return;
  if((typeof RIVAL_ON!=='undefined'&&RIVAL_ON)||G.room||G.abandoned||G.t<20||SAVE.mode==='qpk'||SAVE.mode==='room')return;
  const dk=G.day||dayKey(),t=Math.round(G.t);
  const line=document.createElement('button');line.type='button';line.className='lbline';line.innerHTML=`<span class="rk">…</span><span class="tx">${L('排名结算中','Ranking…')}</span>`;
  line.onclick=()=>{SFX.pick(1);openLeaderboard('all')};
  const anchor=container.querySelector('.endmore');if(anchor)anchor.before(line);else container.appendChild(line);
  let all=null,today=null;try{[all,today]=await Promise.all([LB.fetch('all').catch(()=>null),LB.fetch('today').catch(()=>null)])}catch(_){}
  const S=SAVE.lb&&typeof SAVE.lb==='object'?SAVE.lb:(SAVE.lb={best:0,day:0,dayBest:0});if(S.day!==dk){S.day=dk;S.dayBest=0}
  const mineT=d=>{if(!d||!d.ok)return null;const m=d.rows.find(r=>LB.isMe(r));return m?m.time:0};
  const ba=mineT(all),bd=mineT(today),allPB=t>(ba===null?S.best||0:ba),dayPB=t>(bd===null?S.dayBest||0:bd);
  let posted=false;
  if(allPB||dayPB){try{const r=await LB.submit({name:LB.name()||L('无名侠客','Nameless'),av:SAVE.avatar,cls:G.cls,map:MAPID,diff:DIFFID,mode:SAVE.mode||'solo',score:G.score||0,day:dk,tier:ASURA_T||0,time:t,kills:G.kills,bosses:G.bossSlain,level:G.lv,combo:G.comboMax,relics:G.relics.length,allTime:allPB});posted=!!(r&&r.ok)}catch(_){}
    if(posted){if(allPB)S.best=t;S.dayBest=Math.max(S.dayBest||0,t);persist();lbMenuRank()}}
  if((allPB||dayPB)&&!posted){line.innerHTML=`<span class="rk">!</span><span class="tx">${L('成绩没传上去,点击重试','Run not posted. Tap to retry')}</span><span class="arr">↻</span>`;line.onclick=()=>{SFX.pick(1);line.remove();submitRun(container)};return}
  if(!all||!all.ok){line.remove();return}
  /* rank with this run counted (only if it was posted) */
  const others=all.rows.filter(r=>!LB.isMe(r)),old=all.rows.find(r=>LB.isMe(r)),oldI=all.rows.indexOf(old);
  const best=posted&&allPB?{time:t,bosses:G.bossSlain,kills:G.kills}:old;
  if(!best){line.innerHTML=`<span class="rk">—</span><span class="tx">${posted?L('已上今日榜','On today’s board'):L('刷新个人最佳即可上榜','Beat your best to rank')}</span><span class="arr">›</span>`;return}
  const list=[...others,best].sort((a,b)=>b.time-a.time||(b.bosses||0)-(a.bosses||0)),i=list.indexOf(best),above=list[i-1];
  let aboveName='';if(above){const p=await LB.profiles([above]);aboveName=lbDecorate([above],p)[0].name}
  const up=posted&&allPB?(oldI<0?'NEW':oldI-i>0?'▲'+(oldI-i):''):'';
  line.innerHTML=`<span class="rk${i<3?' gold':''}">#${i+1}</span>${up?`<span class="up">${up}</span>`:''}<span class="tx">${above?L(`再撑 ${fmt(Math.max(1,above.time-best.time+1))} 超过 ${esc(aboveName)}`,`${fmt(Math.max(1,above.time-best.time+1))} more to pass ${esc(aboveName)}`):L('全服第一','Top of the board')}</span><span class="arr">›</span>`;
  if(up){line.classList.add('pop')}
}
