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
function renderProg(){const el=$('#prog');if(!el)return;const b=roadBits();const xpPct=Math.round(100*(b.a.x||0)/Math.max(1,b.a.need||1));
  el.innerHTML=`
  <button type="button" class="pr lv" data-t="road" title="${L('江湖等级:每局都涨,升级得金币','Renown: every run adds XP; each level pays gold')}">${ICON.misc('crown','#ffe9a0')}<div><b>Lv ${b.a.lv}</b><small>${L(b.t[1],b.t[2])}</small><span class="bar"><i style="width:${xpPct}%"></i></span></div></button>
  <button type="button" class="pr tier" data-t="road" title="${L('修罗层:单人难度阶梯,一局斩两位首领开下一层','Ascension: the solo ladder; two bosses in one run opens the next tier')}">${ICON.misc('boss','#ff5a45')}<div><b>${b.tier?L(`修罗 ${b.tier} 层`,`Tier ${b.tier}`):L('修罗','Ascension')}</b><span class="pips">${tierPips(b.tier,b.tierSel,b.tierMax)}</span></div></button>
  <button type="button" class="pr lad" data-t="road" title="${L('天梯:3 分钟对决赢奖杯,升段','Ladder: win trophies in 3-minute duels to rank up')}">${ICON.misc('trophy',b.lcol)}<div><b>${L(b.lad[1],b.lad[2])} <em>${b.tr}</em></b><span class="bar lad"><i style="width:${b.lpct}%;background:${b.lcol}"></i></span></div></button>`;
  el.querySelectorAll('.pr').forEach(x=>x.onclick=()=>{showTab('road');SFX.pick(1);const p=$('#road');if(p&&p.scrollIntoView)try{p.scrollIntoView({block:'start',behavior:'smooth'})}catch(_){}});}
/* the full 江湖 tab */
function renderRoad(){const el=$('#road');if(!el)return;const shopEl=$('#shop'),recEl=$('#record');const b=roadBits();const xpPct=Math.round(100*(b.a.x||0)/Math.max(1,b.a.need||1));
  const nextTitle=TITLES.find(r=>r[0]>b.a.lv);const titles=TITLES.map(r=>`<span class="tt ${b.a.lv>=r[0]?'on':''}" title="Lv ${r[0]}">${ICON.misc('crown',b.a.lv>=r[0]?'#ffe9a0':'#5a4a3a','sm')}<b>${L(r[1],r[2])}</b><small>Lv ${r[0]}</small></span>`).join('');
  const A=SAVE.asura||{max:0,sel:0};const tiers=ASURA.map((x,i)=>{const n=i+1,open=n<=(A.max||0),sel=n===(A.sel||0);return `<button type="button" class="tier ${open?'on':''} ${sel?'sel':''}" data-tier="${n}" ${open?'':'disabled'}><b>${n}</b><span>${L(x.zh,x.en)}</span><small>${L(`金币 +${Math.round(ASURA_GOLD*n*100)}%`,`gold +${Math.round(ASURA_GOLD*n*100)}%`)}</small></button>`}).join('');
  const road=TROPHY_ROAD.map(r=>`<span class="rr ${(SAVE.road||{})[r[0]]?'on':b.tr>=r[0]?'due':''}"><b>${r[0]}</b><small>${L(r[2],r[3])}</small></span>`).join('');
  const ranks=LADDER.map((r,i)=>`<span class="rk ${b.li>=i?'on':''}" style="--c:${TIER_COLS[i]}">${ICON.misc('trophy',b.li>=i?TIER_COLS[i]:'#5a4a3a','sm')}<b>${L(r[1],r[2])}</b><small>${r[0]}</small></span>`).join('');
  el.innerHTML=`
  <section class="rsec lv"><div class="rh">${ICON.misc('crown','#ffe9a0')}<div><b>${L('江湖等级','Renown')} <em>Lv ${b.a.lv}</em> · ${L(b.t[1],b.t[2])}</b><small>${L(`${b.a.x} / ${b.a.need} · 每局结算都涨 · 升级 +${100+b.a.lv*20} 金`,`${b.a.x} / ${b.a.need} · every run adds XP · next level pays ${100+b.a.lv*20} gold`)}${nextTitle?L(` · Lv ${nextTitle[0]} 得称号「${nextTitle[1]}」`,` · title "${nextTitle[2]}" at Lv ${nextTitle[0]}`):''}</small><span class="bar"><i style="width:${xpPct}%"></i></span></div></div><div class="titles">${titles}</div></section>
  <section class="rsec tier"><div class="rh">${ICON.misc('boss','#ff5a45')}<div><b>${L('修罗层','Ascension')} <em>${A.max?L(`已开 ${A.max} 层`,`${A.max} open`):L('未开','locked')}</em></b><small>${L('单人无尽的难度阶梯:在某一层一局斩杀两位首领,下一层开启;每层叠一条规则、金币 +15%。出山前在这里选层。','The solo ladder: slay two bosses in one run on a tier to open the next. Each tier stacks a rule and pays +15% gold. Pick your tier here before you set out.')}</small></div></div><div class="tiers"><button type="button" class="tier ${!(A.sel||0)?'sel':''} on" data-tier="0"><b>${L('无','Off')}</b><span>${L('普通规则','Base rules')}</span></button>${tiers}</div></section>
  <section class="rsec lad"><div class="rh">${ICON.misc('trophy',b.lcol)}<div><b>${L('天梯','Ladder')} <em>${L(b.lad[1],b.lad[2])} · ${b.tr} 🏆</em></b><small>${b.nxt?L(`再 ${b.nxt[0]-b.tr} 🏆 升「${b.nxt[1]}」 · 3 分钟对决赢 +10,输 -5`,`${b.nxt[0]-b.tr} more for ${b.nxt[2]} · 3-minute duels: +10 win, −5 loss`):L('已是最高段位','Top rank reached')}</small><span class="bar lad"><i style="width:${b.lpct}%;background:${b.lcol}"></i></span></div>${typeof LB!=='undefined'&&LB.enabled()?`<button type="button" class="go alt sm" id="lbopen">${L('排行榜','Leaderboard')}</button>`:''}</div><div class="ranks">${ranks}</div><div class="roadrow">${road}</div></section>
  <section class="rsec shop"><div class="rh">${ICON.misc('gold','#ffd27a')}<div><b>${L('修炼','Training')} <em>${SAVE.gold} ${L('金','gold')}</em></b><small>${L('金币的去处:永久属性。每级都算数,所有职业共享。','What gold is for: permanent stats, shared by every hero.')}</small></div></div></section>`;
  el.querySelectorAll('.tier[data-tier]').forEach(t=>t.onclick=()=>{const n=+t.dataset.tier;if(n>(A.max||0))return;A.sel=n;persist();renderTitle();renderRoad();SFX.pick(1)});
  const lb=$('#lbopen');if(lb)lb.onclick=()=>{if(typeof openLeaderboard==='function')openLeaderboard()};
  if(shopEl){shopEl.hidden=false;el.querySelector('.rsec.shop').appendChild(shopEl)}if(recEl){recEl.hidden=false;el.querySelector('.rsec.shop').appendChild(recEl)}
  renderProg()}
