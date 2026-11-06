'use strict';
/* road.js — the 江湖 progression: three ladders a player climbs across runs, shown as pictures first and words second.
   1. 江湖等级 (account level)  — fed by every run; each level pays gold, milestones unlock titles
   2. 修罗层 (Ascension tiers)   — the solo difficulty ladder: clear two bosses on a tier to open the next; gold +15% per tier
   3. 天梯 (duel ladder)         — trophies from 3-minute duels; ranks from Bronze to Legend with a reward road
   The strip on the menu shows all three in one glance; the 江湖 tab shows the full ladders, the 修炼 shop (gold sink) and the titles. */
const TIER_COLS=['#c8864a','#cfd6dd','#ffd27a','#9fe3f0','#b9f2ff','#c7a4f0','#ff9c5a'];
function ladderIdx(tr){return Math.max(0,LADDER.indexOf(ladderOf(tr)))}
function ladderNext(tr){const i=ladderIdx(tr);return LADDER[i+1]||null}
function roadBits(){const a=accountLv(),t=titleFor(a.lv),tr=SAVE.trophies||0,lad=ladderOf(tr),nxt=ladderNext(tr),li=ladderIdx(tr);
  const A=SAVE.asura||{max:0,sel:0};return {a,t,tr,lad,nxt,li,lcol:TIER_COLS[li]||'#ffd27a',lpct:nxt?Math.round(100*(tr-lad[0])/Math.max(1,nxt[0]-lad[0])):100,tier:A.max||0,tierSel:Math.min(A.sel||0,A.max||0),tierMax:ASURA.length}}
function tierPips(max,sel,total){let s='';for(let i=1;i<=total;i++)s+=`<i class="${i<=max?'on':''}${i===sel?' sel':''}" title="${L(`修罗 ${i} 层`,`Tier ${i}`)}${i<=max?'':L(' · 未解锁',' · locked')}"></i>`;return s}
/* compact strip on the menu */
function renderProg(){const el=$('#prog');if(!el)return;const b=roadBits();const xpPct=Math.round(100*(b.a.x||0)/Math.max(1,b.a.need||1));const name=(typeof LB!=='undefined'&&LB.name())||SAVE.name||'';
  el.innerHTML=`<div class="pr id">${ICON.cls(SAVE.cls)}<button type="button" class="nm" id="namebtn" title="${L('点击改名','Tap to rename')}"><b>${esc(name)}</b><i class="pen">✎</i></button></div>
    <button type="button" class="pr lv" data-t="road" title="${L('江湖等级:每局都涨,升级得金币','Renown: every run adds XP, each level pays gold')}">${ICON.misc('crown','#ffe9a0')}<div><b>Lv ${b.a.lv}</b><span class="bar"><i style="width:${xpPct}%"></i></span></div></button>
    <button type="button" class="pr gold" data-t="road" title="${L('金币:在江湖页修炼属性','Gold: train permanent stats on the Journey tab')}">${ICON.misc('gold','#ffd27a')}<b>${SAVE.gold}</b></button>`;
  el.querySelectorAll('.pr[data-t]').forEach(x=>x.onclick=()=>{showTab('road');SFX.pick(1);const p=$('#road');if(p&&p.scrollIntoView)try{p.scrollIntoView({block:'start',behavior:'smooth'})}catch(_){}});
  const nb=$('#namebtn');if(nb)nb.onclick=()=>{const cur=LB.name();const inp=document.createElement('input');inp.className='nmedit';inp.maxLength=12;inp.value=cur;inp.setAttribute('aria-label',L('侠名','Hero name'));nb.replaceWith(inp);inp.focus();inp.select();
    let done=false;const fin=ok=>{if(done)return;done=true;const v=inp.value.trim().slice(0,12);if(ok&&v&&v!==cur){LB.setName(v);SFX.complete();if(typeof cloudSchedulePush==='function')cloudSchedulePush()}renderProg()};
    inp.onkeydown=e=>{if(e.key==='Enter')fin(true);else if(e.key==='Escape')fin(false)};inp.onblur=()=>fin(true)}}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
/* the full 江湖 tab */
function renderRoad(){const el=$('#road');if(!el)return;const shopEl=$('#shop'),recEl=$('#record');const b=roadBits();const xpPct=Math.round(100*(b.a.x||0)/Math.max(1,b.a.need||1));
  const road=TROPHY_ROAD.map(r=>`<span class="rr ${(SAVE.road||{})[r[0]]?'on':b.tr>=r[0]?'due':''}"><b>${r[0]}</b><small>${L(r[2],r[3])}</small></span>`).join('');
  const A=SAVE.asura||{max:0,sel:0};
  el.innerHTML=`
  <section class="rsec lv"><div class="rh">${ICON.misc('crown','#ffe9a0')}<div><b>${L('江湖等级','Renown')} <em>Lv ${b.a.lv}</em> · ${L(b.t[1],b.t[2])}</b><small>${L(`${b.a.x} / ${b.a.need} · 每局都涨 · 升级 +${100+b.a.lv*20} 金`,`${b.a.x} / ${b.a.need} · every run adds XP · next level pays ${100+b.a.lv*20} gold`)}${A.max?L(` · 修罗 ${A.max} 层已开(出山时选)`,` · Ascension ${A.max} open (pick it when you set out)`):''}</small><span class="bar"><i style="width:${xpPct}%"></i></span></div></div></section>
  <section class="rsec lad"><div class="rh">${ICON.misc('trophy',b.lcol)}<div><b>${L('天梯','Ladder')} <em>${L(b.lad[1],b.lad[2])} · ${b.tr} 🏆</em></b><small>${b.nxt?L(`再 ${b.nxt[0]-b.tr} 🏆 升段 · 对决赢 +10,输 -5`,`${b.nxt[0]-b.tr} more to rank up · duels: +10 win, −5 loss`):L('已是最高段位','Top rank reached')}</small><span class="bar lad"><i style="width:${b.lpct}%;background:${b.lcol}"></i></span></div>${typeof LB!=='undefined'&&LB.enabled()?`<button type="button" class="go alt sm" id="lbopen">${L('排行榜','Leaderboard')}</button>`:''}</div><div class="roadrow">${road}</div></section>
  <section class="rsec shop"><div class="rh">${ICON.misc('gold','#ffd27a')}<div><b>${L('修炼','Training')} <em>${SAVE.gold} ${L('金','gold')}</em></b><small>${L('金币的去处:永久属性。每级都算数,所有职业共享。','What gold is for: permanent stats, shared by every hero.')}</small></div></div></section>`;
  const lb=$('#lbopen');if(lb)lb.onclick=()=>{if(typeof openLeaderboard==='function')openLeaderboard()};
  if(shopEl){shopEl.hidden=false;el.querySelector('.rsec.shop').appendChild(shopEl)}if(recEl){recEl.hidden=false;el.querySelector('.rsec.shop').appendChild(recEl)}
  renderProg()}
