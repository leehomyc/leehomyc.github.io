'use strict';
const RELEASES={data:null,loading:null};
async function loadReleaseHistory(){
  if(RELEASES.data)return RELEASES.data;if(RELEASES.loading)return RELEASES.loading;
  const build=document.querySelector('meta[name=build]')?.content||'';
  RELEASES.loading=fetch('releases.json?v='+encodeURIComponent(build),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('release history unavailable');return r.json()}).then(data=>{if(!Array.isArray(data.entries)||!data.current)throw Error('invalid release history');RELEASES.data=data;$('#releasebtn').textContent='v'+data.current;return data}).finally(()=>{RELEASES.loading=null});return RELEASES.loading;
}
function closeReleaseHistory(){const el=$('#releaseov');if(el)el.hidden=true;$('#releasebtn')?.focus({preventScroll:true})}
function releaseText(row){return LOC==='zt'?tr(row.zh||row.en):row[LOC]||row.en||row.zh||''}
function renderReleaseHistory(){
  const el=$('#releaseov');if(!el||el.hidden||!RELEASES.data)return;
  el.innerHTML=`<section class="social-panel release-panel" role="dialog" aria-modal="true" aria-labelledby="releasetitle"><header><h2 id="releasetitle">${L('更新记录','Release notes')}</h2><button type="button" class="go alt sm" id="releaseclose">${L('关闭','Close')}</button></header><div class="release-list">${RELEASES.data.entries.map(row=>`<article class="release-entry"><header><b>v${esc(row.version)}</b><time>${new Date(row.at).toLocaleString(({zh:'zh-CN',zt:'zh-TW',en:'en-GB',ja:'ja-JP',ko:'ko-KR'})[LOC],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></header><p>${esc(releaseText(row))}</p></article>`).join('')}</div></section>`;$('#releaseclose').onclick=closeReleaseHistory;
}
function refreshReleaseHistory(){const b=$('#releasebtn');if(b)b.title=L('版本与更新记录','Version and release notes');renderReleaseHistory()}
async function openReleaseHistory(){
  let el=$('#releaseov');if(!el){el=document.createElement('div');el.id='releaseov';el.className='social-overlay';el.hidden=true;document.body.appendChild(el);el.onclick=e=>{if(e.target===el)closeReleaseHistory()}}
  el.hidden=false;el.innerHTML=`<section class="social-panel"><p>${L('加载中…','Loading…')}</p><button type="button" class="go alt sm" id="releaseclose">${L('关闭','Close')}</button></section>`;$('#releaseclose').onclick=closeReleaseHistory;
  try{await loadReleaseHistory();if(el.hidden)return;renderReleaseHistory();$('#releaseclose').focus({preventScroll:true})}catch{if(el.hidden)return;el.innerHTML=`<section class="social-panel"><p>${L('加载失败，请重试','Could not load. Please retry.')}</p><button type="button" class="go sm" id="releaseretry">${L('重试','Retry')}</button><button type="button" class="go alt sm" id="releaseclose">${L('关闭','Close')}</button></section>`;$('#releaseretry').onclick=openReleaseHistory;$('#releaseclose').onclick=closeReleaseHistory}
}
$('#releasebtn').onclick=openReleaseHistory;refreshReleaseHistory();loadReleaseHistory().catch(()=>{});
document.addEventListener('keydown',e=>{const el=$('#releaseov');if(!el||el.hidden)return;if(e.key==='Escape'){e.preventDefault();closeReleaseHistory()}else if(e.key==='Tab'){const buttons=[...el.querySelectorAll('button:not([disabled])')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});
