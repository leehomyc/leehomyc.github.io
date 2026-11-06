'use strict';
/* leaderboard.js — online leaderboard client (Google Apps Script backend, see service/README.md) */
const LEADERBOARD_URL='';   // paste the deployed web-app URL here; the board stays hidden while empty
const LB={
  token(){let t=null;try{t=localStorage.getItem('sl_token');if(!t){t=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('sl_token',t)}}catch(_){t=t||'anon'}return t},
  name(){let n='';try{n=localStorage.getItem('sl_name')||''}catch(_){}if(!n&&typeof CLOUD!=='undefined'&&CLOUD.user&&!CLOUD.user.isAnonymous&&CLOUD.user.displayName)n=CLOUD.user.displayName.slice(0,16);return n},
  setName(n){try{localStorage.setItem('sl_name',n)}catch(_){}},
  cloud(){return typeof CLOUD!=='undefined'&&CLOUD.on()},
  enabled(){return this.cloud()||!!LEADERBOARD_URL},
  async fetch(board,filters={}){
    if(this.cloud())return CLB.fetch(board,filters);
    if(!LEADERBOARD_URL)return null;
    const q=new URLSearchParams({board,token:this.token(),...filters});
    const r=await fetch(LEADERBOARD_URL+'?'+q.toString(),{method:'GET'});
    return r.json();
  },
  async submit(run){
    if(this.cloud())return CLB.submit(run);
    if(!LEADERBOARD_URL)return {ok:false,error:'disabled'};
    const body=JSON.stringify({...run,token:this.token(),trap:''});
    const r=await fetch(LEADERBOARD_URL+'?ua='+encodeURIComponent((navigator.userAgent||'').slice(0,60)),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body});
    return r.json();
  },
};
const clsZh=k=>CLASSES[k]?LL(CLASSES[k]):k,mapZh=k=>MAPS[k]?LL(MAPS[k]):k,diffZh=k=>DIFF[k]?LL(DIFF[k]):k;
function renderBoard(el,data,opts={}){
  el.textContent='';
  if(!data||!data.ok){el.innerHTML=`<p class="lbnote">${L('排行榜暂时无法加载。','Leaderboard unavailable right now.')}</p>`;return}
  if(!data.rows.length){el.innerHTML=`<p class="lbnote">${L('还没有记录,来做第一个。','No runs yet; be the first.')}</p>`;return}
  const t=document.createElement('table');t.className='lbt';
  t.innerHTML=`<thead><tr><th>#</th><th>${L('侠客','Hero')}</th><th>${L('存活','Time')}</th><th>${L('首领','Bosses')}</th><th>${L('击杀','Kills')}</th><th>${L('连斩','Streak')}</th><th>${L('地图 · 难度','Map · difficulty')}</th></tr></thead>`;
  const tb=document.createElement('tbody');
  data.rows.forEach((r,i)=>{const tr=document.createElement('tr');if((opts.uid&&r.uid===opts.uid)||(!opts.uid&&opts.me&&r.name===opts.me))tr.className='me';
    const cells=[String(i+1),'',fmt(r.time),String(r.bosses),String(r.kills),'×'+r.combo,`${mapZh(r.map)} · ${diffZh(r.diff)}${r.mode&&r.mode!=='solo'?' · '+(r.mode==='pk'?L('对决','PK'):r.mode==='rush'?L('连战','rush'):L('每日','daily')):''}${r.tier?' · '+L('修罗','Asc.')+' '+r.tier:''}`];
    cells.forEach((v,j)=>{const td=document.createElement('td');if(j===1){const b=document.createElement('b');b.textContent=r.name;const s=document.createElement('small');s.textContent=' '+clsZh(r.cls);td.appendChild(b);td.appendChild(s)}else td.textContent=v;tr.appendChild(td)});
    tb.appendChild(tr)});
  t.appendChild(tb);el.appendChild(t);
  if(data.myRank){const p=document.createElement('p');p.className='lbnote';p.textContent=L(`你的最佳排名:#${data.myRank} / ${data.count}`,`Your best rank: #${data.myRank} / ${data.count}`);el.appendChild(p)}
}
let lbBoard='all';
async function openLeaderboard(){
  const ov=$('#lb');ov.hidden=false;$('#lbbody').innerHTML=`<p class="lbnote">${L('载入中…','Loading…')}</p>`;
  document.querySelectorAll('#lbtabs button').forEach(b=>b.classList.toggle('on',b.dataset.b===lbBoard));
  try{const d=await LB.fetch(lbBoard);renderBoard($('#lbbody'),d,{me:LB.name(),uid:LB.cloud()?CLOUD.uid():null})}catch(e){renderBoard($('#lbbody'),null)}
}
function wireLeaderboard(){
  const on=LB.enabled();{const lb=$('#lbbtn');if(lb)lb.hidden=!on}
  {const lb=$('#lbbtn');if(lb)lb.onclick=openLeaderboard}$('#lbclose').onclick=()=>{$('#lb').hidden=true};
  document.querySelectorAll('#lbtabs button').forEach(b=>b.onclick=()=>{lbBoard=b.dataset.b;openLeaderboard()});
}
/* called from the results screen */
async function submitRun(container){
  if(!LB.enabled())return;
  const box=document.createElement('div');box.className='lbsubmit';
  const saved=LB.name();
  box.innerHTML=`<label>${L('江湖名号','Name')} <input id="lbname" maxlength="16" placeholder="${L('无名侠客','Nameless')}" value=""></label><button type="button" class="go sm" id="lbsend">${L('上榜','Submit score')}</button><span id="lbmsg"></span>`;
  container.appendChild(box);
  const inp=$('#lbname');inp.value=saved;
  $('#lbsend').onclick=async()=>{
    const name=(inp.value||'').trim().slice(0,16)||L('无名侠客','Nameless');LB.setName(name);$('#lbsend').disabled=true;$('#lbmsg').textContent=L('提交中…','Sending…');
    try{const r=await LB.submit({name,cls:G.cls,map:MAPID,diff:DIFFID,mode:SAVE.mode||'solo',score:G.score||0,day:G.day,tier:ASURA_T||0,time:Math.round(G.t),kills:G.kills,bosses:G.bossSlain,level:G.lv,combo:G.comboMax,relics:G.relics.length});
      if(r.ok){$('#lbmsg').textContent=L('已上榜!','On the board.');const d=await LB.fetch('all');const el=document.createElement('div');el.className='lbinline';renderBoard(el,d,{me:name});box.appendChild(el)}
      else{$('#lbmsg').textContent=r.error==='rate'?L('请稍后再试。','Try again in a moment.'):L('未能提交。','Not accepted.');$('#lbsend').disabled=false}}
    catch(e){$('#lbmsg').textContent=L('网络错误。','Network error.');$('#lbsend').disabled=false}
  };
}
