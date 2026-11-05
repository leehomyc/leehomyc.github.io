'use strict';
/* leaderboard.js — online leaderboard client (Google Apps Script backend, see service/README.md) */
const LEADERBOARD_URL='';   // paste the deployed web-app URL here; the board stays hidden while empty
const LB={
  token(){let t=null;try{t=localStorage.getItem('sl_token');if(!t){t=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('sl_token',t)}}catch(_){t=t||'anon'}return t},
  name(){try{return localStorage.getItem('sl_name')||''}catch(_){return ''}},
  setName(n){try{localStorage.setItem('sl_name',n)}catch(_){}},
  enabled(){return !!LEADERBOARD_URL},
  async fetch(board,filters={}){
    if(!LEADERBOARD_URL)return null;
    const q=new URLSearchParams({board,token:this.token(),...filters});
    const r=await fetch(LEADERBOARD_URL+'?'+q.toString(),{method:'GET'});
    return r.json();
  },
  async submit(run){
    if(!LEADERBOARD_URL)return {ok:false,error:'disabled'};
    const body=JSON.stringify({...run,token:this.token(),trap:''});
    const r=await fetch(LEADERBOARD_URL+'?ua='+encodeURIComponent((navigator.userAgent||'').slice(0,60)),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body});
    return r.json();
  },
};
const clsZh=k=>(CLASSES[k]||{}).zh||k,mapZh=k=>(MAPS[k]||{}).zh||k,diffZh=k=>(DIFF[k]||{}).zh||k;
function renderBoard(el,data,opts={}){
  el.textContent='';
  if(!data||!data.ok){el.innerHTML='<p class="lbnote">排行榜暂时无法加载。 Leaderboard unavailable right now.</p>';return}
  if(!data.rows.length){el.innerHTML='<p class="lbnote">还没有记录,来做第一个。 No runs yet; be the first.</p>';return}
  const t=document.createElement('table');t.className='lbt';
  t.innerHTML='<thead><tr><th>#</th><th>侠客 Hero</th><th>存活 Time</th><th>首领</th><th>击杀</th><th>连斩</th><th>地图 · 难度</th></tr></thead>';
  const tb=document.createElement('tbody');
  data.rows.forEach((r,i)=>{const tr=document.createElement('tr');if(opts.me&&r.name===opts.me)tr.className='me';
    const cells=[String(i+1),'',fmt(r.time),String(r.bosses),String(r.kills),'×'+r.combo,`${mapZh(r.map)} · ${diffZh(r.diff)}`];
    cells.forEach((v,j)=>{const td=document.createElement('td');if(j===1){const b=document.createElement('b');b.textContent=r.name;const s=document.createElement('small');s.textContent=' '+clsZh(r.cls);td.appendChild(b);td.appendChild(s)}else td.textContent=v;tr.appendChild(td)});
    tb.appendChild(tr)});
  t.appendChild(tb);el.appendChild(t);
  if(data.myRank){const p=document.createElement('p');p.className='lbnote';p.textContent=`你的最佳排名 Your best rank: #${data.myRank} / ${data.count}`;el.appendChild(p)}
}
let lbBoard='all';
async function openLeaderboard(){
  const ov=$('#lb');ov.hidden=false;$('#lbbody').innerHTML='<p class="lbnote">载入中… Loading…</p>';
  document.querySelectorAll('#lbtabs button').forEach(b=>b.classList.toggle('on',b.dataset.b===lbBoard));
  try{const d=await LB.fetch(lbBoard);renderBoard($('#lbbody'),d,{me:LB.name()})}catch(e){renderBoard($('#lbbody'),null)}
}
function wireLeaderboard(){
  const on=LB.enabled();$('#lbbtn').hidden=!on;
  $('#lbbtn').onclick=openLeaderboard;$('#lbclose').onclick=()=>{$('#lb').hidden=true};
  document.querySelectorAll('#lbtabs button').forEach(b=>b.onclick=()=>{lbBoard=b.dataset.b;openLeaderboard()});
}
/* called from the results screen */
async function submitRun(container){
  if(!LB.enabled())return;
  const box=document.createElement('div');box.className='lbsubmit';
  const saved=LB.name();
  box.innerHTML=`<label>江湖名号 Name <input id="lbname" maxlength="16" placeholder="无名侠客" value=""></label><button type="button" class="go sm" id="lbsend">上榜 Submit score</button><span id="lbmsg"></span>`;
  container.appendChild(box);
  const inp=$('#lbname');inp.value=saved;
  $('#lbsend').onclick=async()=>{
    const name=(inp.value||'').trim().slice(0,16)||'无名侠客';LB.setName(name);$('#lbsend').disabled=true;$('#lbmsg').textContent='提交中… Sending…';
    try{const r=await LB.submit({name,cls:G.cls,map:MAPID,diff:DIFFID,time:Math.round(G.t),kills:G.kills,bosses:G.bossSlain,level:G.lv,combo:G.comboMax,relics:G.relics.length});
      if(r.ok){$('#lbmsg').textContent='已上榜! On the board.';const d=await LB.fetch('all');const el=document.createElement('div');el.className='lbinline';renderBoard(el,d,{me:name});box.appendChild(el)}
      else{$('#lbmsg').textContent=r.error==='rate'?'请稍后再试。 Try again in a moment.':'未能提交。 Not accepted.';$('#lbsend').disabled=false}}
    catch(e){$('#lbmsg').textContent='网络错误。 Network error.';$('#lbsend').disabled=false}
  };
}
