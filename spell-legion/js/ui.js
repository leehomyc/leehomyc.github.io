'use strict';
/* ui.js — HUD, cards, title/class select, lobby upgrades, results, input */
const SAVE_KEY='spell-legion-save';
let SAVE={gold:0,up:{},cls:'swordsman',best:0,wins:0,runs:0,autocast:false,rival:false,bosses:0,played:false,ach:{},diff:'normal',clsWins:{}};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s&&typeof s==='object')SAVE={...SAVE,...s}}catch(_){}
SAVE.ach=SAVE.ach||{};SAVE.clsWins=SAVE.clsWins||{};SAVE.weapon=SAVE.weapon||{};SAVE.weaponOwned=SAVE.weaponOwned||{};SAVE.tips=SAVE.tips||{};window.SAVE=SAVE;
function persist(quiet){if(!quiet)SAVE.ts=Date.now();try{localStorage.setItem(SAVE_KEY,JSON.stringify(SAVE))}catch(_){}if(!quiet&&typeof cloudSchedulePush==='function')cloudSchedulePush()}
const UPGRADES=[
  {id:'hp',zh:'体魄',en:'Vigor',d:'生命上限 +10% / 级',de:'+10% max HP per rank',max:5,cost:r=>80+r*r*60+r*60},
  {id:'dmg',zh:'锋芒',en:'Edge',d:'伤害 +6% / 级',de:'+6% damage per rank',max:5,cost:r=>100+r*r*70+r*80},
  {id:'qi',zh:'丹田',en:'Dantian',d:'内力回复 +12% / 级',de:'+12% qi regen per rank',max:5,cost:r=>90+r*r*60+r*70},
  {id:'core',zh:'复生核心',en:'Revive Core',d:'每局多一枚复生核心',de:'One more Revive Core per run',max:2,cost:r=>400+r*500},
  {id:'gold',zh:'财运',en:'Fortune',d:'金币获取 +15% / 级',de:'+15% gold per rank',max:5,cost:r=>120+r*r*70+r*90},
];
function applyUpgrades(P){const u=SAVE.up;P.maxHp=Math.round(P.maxHp*(1+.1*(u.hp||0)));P.hp=P.maxHp;P.dmg*=1+.06*(u.dmg||0);P.regen*=1+.12*(u.qi||0);G.cores+=u.core||0}

const keys=new Set();const touch={on:false,sx:0,sy:0,x:0,y:0};
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys.add(k);
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)&&document.activeElement?.tagName!=='BUTTON')e.preventDefault();
  SFX.start();
  if(k==='m'){const m=SFX.toggleMute();syncSound();showBanner(m?'静音':'声音开启',m?'Muted':'Sound on',.8);return}
  if(!G||G.auto){if(k==='enter'&&!$('#title').hidden)startRun();return}
  if(G.pick&&['1','2','3'].includes(k)){choose(+k-1);return}
  if(G.pick||G.ended)return;
  if(k==='c'||k==='t'){togglePanel();return}
  if(k==='p'||k==='escape'){if(G.panel){togglePanel();return}togglePause();return}
  if(G.paused||G.panel)return;
  if(k==='1'||k==='j')castSkill(1);if(k==='2'||k==='k')castSkill(2);if(k==='3'||k==='l')castSkill(3);
  if(k===' '||k==='shift')dash();
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{keys.clear();touch.on=false});
addEventListener('pointerdown',()=>SFX.start(),{once:false});
cv.addEventListener('pointerdown',e=>{touch.on=true;touch.sx=touch.x=e.clientX;touch.sy=touch.y=e.clientY;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(touch.on){touch.x=e.clientX;touch.y=e.clientY}});
['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,()=>touch.on=false));
cv.addEventListener('contextmenu',e=>{e.preventDefault();if(!G||G.auto)return;AUTOCAST=!AUTOCAST;SAVE.autocast=AUTOCAST;persist();autoLabel();showBanner(AUTOCAST?'武学自动施放':'武学手动施放',AUTOCAST?'Skills: auto-cast':'Skills: manual (1 / 2 / 3)',1.2);SFX.pick(1)});
cv.addEventListener('pointerdown',e=>{if(e.button===2)touch.on=false});
function input(){
  let x=0,y=0;
  if(keys.has('a')||keys.has('arrowleft'))x--;if(keys.has('d')||keys.has('arrowright'))x++;
  if(keys.has('arrowup')||keys.has('w'))y--;if(keys.has('s')||keys.has('arrowdown'))y++;
  if(touch.on){const dx=touch.x-touch.sx,dy=touch.y-touch.sy,l=hyp(dx,dy);if(l>6){x=dx/Math.max(l,36);y=dy/Math.max(l,36)}}
  return {x,y};
}

/* HUD */
const fmt=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
let hudT=0;
/* first-run tips: each fires once ever, at the moment the mechanic first matters */
const IS_TOUCH=matchMedia('(pointer:coarse)').matches;
const TIPS={
  move:{when:()=>G.t>.8,zh:IS_TOUCH?'拖动屏幕任意位置移动':'WASD / 方向键移动',en:IS_TOUCH?'Drag anywhere to move':'Move with WASD or the arrow keys'},
  skill:{when:()=>G.t>4&&G.spells[1]&&G.P.mana>=SPELLS[G.spells[1].id].cost,zh:IS_TOUCH?'点击下方图标释放武学,消耗蓝色内力':'按 1 / 2 / 3 释放武学,消耗蓝色内力',en:IS_TOUCH?'Tap a seal to cast a skill; it costs blue qi':'Press 1 / 2 / 3 to cast skills; they cost blue qi'},
  dash:{when:()=>G.P.hp<G.P.maxHp*.6||G.t>40,zh:IS_TOUCH?'点击「轻」轻功闪避,闪避中无敌':'按 Space 轻功闪避,闪避中无敌',en:IS_TOUCH?'Tap 轻 to dash; you are invulnerable while dashing':'Space dashes; you are invulnerable while dashing'},
  gems:{when:()=>G.gems.length>12,zh:'捡起蓝色晶石获得经验,升级后三选一',en:'Pick up blue gems for XP; each level offers three cards'},
  chest:{when:()=>G.chests.length>0,zh:'地图上出现宝箱:走过去打开,奖励一张额外卡牌和金币',en:'A chest appeared: walk over it for a bonus card and gold'},
  mission:{when:()=>!!G.mission,zh:'密令任务:跟随洋红色箭头,完成后奖励强化卡',en:'Mission: follow the magenta arrow; completing it grants an augment card'},
  combo:{when:()=>G.combo>=10,zh:'连斩:连续击杀不中断,经验加成越来越高',en:'Streak: keep killing without a pause for growing XP bonuses'},
  warlord:{when:()=>G.en.some(e=>e.warlord&&!e.dead),zh:'铁甲统领来了:击败它必掉法宝与宝箱',en:'The Iron Warlord: beating it always drops a relic and a chest'},
  auto:{when:()=>G.t>25&&!AUTOCAST,zh:'右键点击战场可切换武学自动施放',en:'Right-click the field to toggle auto-casting skills'},
};
let tipT=0,tipQ=null;
function tipTick(dt){
  if(G.auto||G.over)return;
  if(tipT>0){tipT-=dt;if(tipT<=0)$('#tip').classList.remove('on');return}
  if(G.pick||G.paused)return;
  for(const k in TIPS){if(SAVE.tips[k])continue;let ok=false;try{ok=TIPS[k].when()}catch(_){}if(!ok)continue;
    SAVE.tips[k]=1;persist();const t=TIPS[k],el=$('#tip');el.innerHTML=`<b>${t.zh}</b><small>${t.en}</small>`;el.classList.add('on');tipT=5.5;if(typeof SFX!=='undefined')SFX.pick(1);break}
}
function hud(dt){
  tipTick(dt);
  hudT-=dt;if(hudT>0)return;hudT=.05;
  const P=G.P;
  $('#xp').style.width=(G.xp/G.need*100)+'%';
  $('#hpfill').style.height=(P.hp/P.maxHp*100)+'%';$('#hpnum').textContent=Math.ceil(P.hp)+' / '+P.maxHp;
  $('#mpfill').style.height=(P.mana/P.maxMana*100)+'%';$('#mpnum').textContent=Math.floor(P.mana)+' / '+P.maxMana;
  $('#lv').textContent='Lv '+G.lv;
  $('#ptsbadge').hidden=true;
  $('#timer').textContent=fmt(G.t);$('#nextboss').textContent=G.boss?'首领战 BOSS':'首领 '+fmt(nextBossIn());
  $('#kills').textContent=G.kills+' 击杀';
  if(G.rival){const R=G.rival,tot=Math.max(1,G.score+R.score);$('#score').hidden=false;$('#s-you').textContent=G.score;$('#s-riv').textContent=R.score;$('#s-rname').textContent=R.name[0];$('#s-bar i').style.width=(G.score/tot*100)+'%';$('#score').classList.toggle('lead',G.score>=R.score);$('#nextboss').textContent=(G.boss?'首领战 BOSS · ':'')+'剩余 '+fmt(Math.max(0,PK_LEN-G.t))}
  const o=$('#obj');o.hidden=!G.mission;if(G.mission)o.textContent=missionText();
  const bf=$('#buff');bf.hidden=!P.buff;if(P.buff)bf.textContent={dmg:'伤害 +30%',spd:'疾行',haste:'冷却减半'}[P.buff.k]+' · '+Math.ceil(P.buff.t)+'s';
  if(G.boss){$('#bosshp i').style.width=(G.boss.hp/G.boss.maxHp*100)+'%'}
  // skill cooldown sweeps
  for(let i=0;i<4;i++){const el=$('#seal'+i);if(!el)continue;const s=G.spells[i];if(!s)continue;const sp=SPELLS[s.id];
    const cdT=sp.auto?0:(sp.cd*stat(s).cdM/P.haste),k=sp.auto?0:clamp(s.cd/Math.max(.01,cdT),0,1);
    el.style.setProperty('--cd',(k*360)+'deg');el.classList.toggle('cooling',k>0);el.classList.toggle('poor',!sp.auto&&P.mana<sp.cost);el.classList.toggle('active',s.active>0);
    const deny=G.fx.find(f=>f.k==='deny'&&f.i===i);el.classList.toggle('deny',!!deny)}
  const d=$('#sealdash');d.style.setProperty('--cd',(clamp(P.dashCd/1.4,0,1)*360)+'deg');d.classList.toggle('cooling',P.dashCd>0);
}
function drawRelics(){const box=$('#relics');if(!box)return;box.textContent='';for(const id of G.relics){const R=RELICS[id],d=document.createElement('div');d.className='relic';d.style.color=R.col;d.textContent=R.g;d.title=`${R.zh} ${R.en} · ${R.d} · ${R.de}`;box.appendChild(d)}}
let introT=null;
function bossIntro(zh,en,n){const el=$('#intro');el.innerHTML=`<div class="lb"></div><div class="bn"><small>第 ${n+1} 位首领 · Boss ${n+1}</small><b>${zh}</b><span>${en}</span>${BOSS_HINT[n%BOSS_HINT.length]?`<em>${BOSS_HINT[n%BOSS_HINT.length][0]}<br>${BOSS_HINT[n%BOSS_HINT.length][1]}</em>`:''}</div><div class="lb"></div>`;el.hidden=false;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');clearTimeout(introT);introT=setTimeout(()=>{el.classList.remove('on');setTimeout(()=>el.hidden=true,500)},3400)}
function updateCores(){const e=$('#cores');e.textContent='';for(let i=0;i<Math.max(2,G.cores);i++){const s=document.createElement('i');s.className='core'+(i<G.cores?'':' off');e.appendChild(s);e.append(' ')}}
function drawSeals(){
  if(G.auto)return;
  const box=$('#seals');box.textContent='';box.classList.toggle('auto',AUTOCAST);
  for(let i=0;i<4;i++){const s=G.spells[i],d=document.createElement('button');d.className='seal'+(s?'':' empty')+(i===0?' main':'');d.id='seal'+i;d.type='button';
    if(s){const m=SPELLS[s.id];
      const g=document.createElement('div');g.className='g';g.textContent=m.g;g.style.color=s.els[0]?ELS[s.els[0]].col:m.col;d.appendChild(g);
      const l=document.createElement('div');l.className='lv';l.textContent='Lv '+s.lv;d.appendChild(l);
      const key=document.createElement('div');key.className='key';key.textContent=m.auto?'自动':SPELL_KEYS[i];d.appendChild(key);
      if(!m.auto){const cst=document.createElement('div');cst.className='cost';cst.innerHTML=`<i>内力</i>${skillCost(s)}`;d.appendChild(cst)}
      d.title=`${m.zh} ${m.en} · Lv ${s.lv}${m.auto?' · 自动 auto':` · 消耗 ${skillCost(s)} 内力 · 冷却 ${m.cd}s`}\n${m.d}\n${m.de}`;
      if(s.els.length){const e=document.createElement('div');e.className='els';s.els.forEach(k=>{const b=document.createElement('i');b.style.background=ELS[k].col;b.style.color=ELS[k].col;e.appendChild(b)});d.appendChild(e)}
      if(s.augs.length){const a=document.createElement('div');a.className='aug';a.textContent=s.augs.map(k=>AUGS[k].g).join('');d.appendChild(a)}
      const cdm=document.createElement('div');cdm.className='cdm';d.appendChild(cdm);
      d.title=m.zh+' '+m.en+(m.auto?'':` · ${m.cost} 内力 · ${m.cd}s`);
      d.onpointerdown=ev=>{ev.preventDefault();if(!m.auto)castSkill(i)};
    }else{const key=document.createElement('div');key.className='key';key.textContent=SPELL_KEYS[i];d.appendChild(key)}
    box.appendChild(d)}
  const dd=document.createElement('button');dd.className='seal dash';dd.id='sealdash';dd.type='button';dd.innerHTML='<div class="g">轻</div><div class="lv">轻功</div><div class="key">Space</div><div class="cdm"></div>';dd.onpointerdown=ev=>{ev.preventDefault();dash()};box.appendChild(dd);
}
let bannerT=0;
function showBanner(zh,en,t){if(!G||G.auto)return;const b=$('#banner');b.innerHTML=`${zh}<small>${en}</small>`;b.classList.remove('on');void b.offsetWidth;b.classList.add('on');bannerT=t}
/* character panel: attributes and skill trees */
let panelTab='tree';
function togglePanel(){if(!G||G.auto||G.over||G.pick)return;G.panel=!G.panel;$('#char').hidden=!G.panel;if(G.panel){renderPanel();SFX.setState('title')}else SFX.setState(G.boss?'boss':'battle')}
function renderPanel(){
  const P=G.P;$('#sp').textContent=G.spells.reduce((a,s)=>a+s.pts,0);
  $('#tab-attr').classList.toggle('on',panelTab==='attr');$('#tab-tree').classList.toggle('on',panelTab==='tree');
  const A=$('#attrs');A.hidden=panelTab!=='attr';const T=$('#trees');T.hidden=panelTab!=='tree';
  if(panelTab==='attr'){A.textContent='';
    const note=document.createElement('p');note.className='pnote';note.textContent=`每升一级自动成长:生命 +8、伤害 +3%、内力 +5、回复 +3%、移速 +1%。目前 Lv ${G.lv}。 · Stats grow automatically every level.`;A.appendChild(note);
    const d=document.createElement('div');d.className='derived';
    d.innerHTML=`<span>生命 HP <b>${Math.ceil(P.hp)}/${P.maxHp}</b></span><span>内力 Qi <b>${Math.floor(P.mana)}/${P.maxMana}</b> (+${(P.regen).toFixed(1)}/s)</span><span>伤害 Damage <b>×${(P.dmg*(1+P.dmgBonus)).toFixed(2)}</b></span><span>暴击 Crit <b>${Math.round(P.crit*100)}%</b></span><span>移速 Speed <b>×${P.spd.toFixed(2)}</b></span><span>减伤 Mitigation <b>${Math.round((1-P.def)*100)}%</b></span>`;A.appendChild(d);
  }else{T.textContent='';
    G.spells.forEach((s,si)=>{const m=SPELLS[s.id],col=document.createElement('div');col.className='tree';col.style.setProperty('--c',m.col);
      col.innerHTML=`<div class="th"><span class="g">${m.g}</span><div><b>${m.zh}</b><small>${m.en} · Lv ${s.lv} · ${s.pts} 点</small></div></div>`;
      (TREES[s.id]||[]).forEach((n,i)=>{const r=s.nodes[i]||0,need=n.tier===1?0:n.tier===2?2:4,locked=s.pts<need;
        const b=document.createElement('div');b.className='node t'+n.tier+(r>=n.max?' max':'')+(locked?' locked':'')+(r>0?' has':'');
        b.innerHTML=`<span class="nn">${n.zh} <small>${n.en}</small></span><span class="nd">${n.d}</span><span class="nr">${r}/${n.max}${locked?' · 需先学 '+need+' 项':''}</span>`;col.appendChild(b)});
      T.appendChild(col)});
  }
}
document.querySelectorAll('#mode button').forEach(b=>b.onclick=()=>{SAVE.mode=b.dataset.m;persist();renderTitle();SFX.pick(1)});
document.querySelectorAll('#diff button').forEach(b=>b.onclick=()=>{SAVE.diff=b.dataset.d;DIFFID=SAVE.diff;persist();renderTitle();SFX.pick(1)});
document.querySelectorAll('#qual button').forEach(b=>b.onclick=()=>{try{localStorage.setItem('sl_quality',b.dataset.q)}catch(_){}b.textContent='重新载入… Reloading';setTimeout(()=>location.reload(),60)});
if(typeof wireLeaderboard==='function')wireLeaderboard();
$('#charbtn').onclick=()=>{togglePanel();$('#charbtn').blur()};
$('#charclose').onclick=()=>togglePanel();
$('#tab-attr').onclick=()=>{panelTab='attr';renderPanel()};$('#tab-tree').onclick=()=>{panelTab='tree';renderPanel()};
function togglePause(){if(G.over||G.pick)return;G.paused=!G.paused;$('#pausebtn').textContent=G.paused?'▶':'II';$('#pause').hidden=!G.paused;if(G.paused)SFX.setState('title');else SFX.setState(G.boss?'boss':'battle')}

/* cards */
function openPick(){
  if(G.pick||!G.picks.length)return;
  const q=G.picks.shift(),cards=buildCards(q);
  if(!cards.length){return openPick()}
  if(G.auto){pick(cards).a();return openPick()}
  G.pick=cards;$('#banner').classList.remove('on');bannerT=0;
  const T={level:['升级','Level up'],infuse:['灌注真气','Infuse '+SPELLS[q.s?.id]?.en],fuse:['真气融合','Fuse '+SPELLS[q.s?.id]?.en],aug:['密令完成:选择强化','Mission complete. Choose an augmentation'],awake:['武器觉醒','Weapon awakening · '+SPELLS[q.s?.id]?.en]}[q.kind];
  $('#cardtitle').innerHTML=`${T[0]}<small>${T[1]}${q.kind==='level'?' · 三选一 pick one':''}${G.picks.length?` · 之后还有 ${G.picks.length} 次 · ${G.picks.length} more after this`:''}</small>`;
  const row=$('#cardrow');row.textContent='';
  const adv=renderBuildStrip();
  cards.forEach((cd,i)=>{const b=document.createElement('button');b.className='card'+(cd.q?' '+cd.q.k:'')+(cd.isNew?' newskill':'');b.id='card'+i;b.style.setProperty('--c',cd.c);b.style.animationDelay=(i*.08)+'s';
    const cat=CATS[cd.cat]||CATS.passive,kind=cd.kind||'passive',K=KINDS[kind]||KINDS.passive;
    const sug=adv&&(cd.cat===adv.cat||(adv.cat==='defense'&&cd.cat==='heal')||(adv.cat==='melee'&&(cd.cat==='ranged'||cd.cat==='summon')));
    // header: what kind of card · category · rarity · suggested star
    const hd=document.createElement('div');hd.className='hd';
    hd.innerHTML=`<span class="kind" style="--cc:${K[2]}">${K[0]}</span>${kind!=='passive'&&kind!=='jackpot'?`<span class="catd" style="--cc:${cat[2]}">${cat[0]}</span>`:''}<span class="sp"></span>${cd.q&&cd.q.k!=='common'?`<span class="rar">${cd.q.zh}</span>`:''}${sug?'<span class="star" title="推荐 Suggested">★</span>':''}`;
    b.appendChild(hd);
    // glyph of the skill being changed, with a small badge for the node / element / augment
    const gw=document.createElement('div');gw.className='gw';gw.innerHTML=`<span class="g">${cd.g}</span>${cd.badge?`<span class="badge">${cd.badge}</span>`:''}`;b.appendChild(gw);
    const parts=[['n',cd.n],['sub',cd.sub],['fx',cd.fx],['fxe',cd.fxEn],['k','按 '+(i+1)+' · Press '+(i+1)]];
    parts.forEach(([k,v])=>{if(!v)return;const s=document.createElement('div');s.className=k;s.textContent=v;b.appendChild(s)});
    if(sug)b.classList.add('sugged');
    if(cd.skill){b.onmouseenter=()=>document.querySelectorAll('#build .bs').forEach(x=>x.classList.toggle('hl',x.dataset.skill===cd.skill));b.onmouseleave=()=>document.querySelectorAll('#build .bs.hl').forEach(x=>x.classList.remove('hl'))}
    b.onclick=()=>choose(i);row.appendChild(b)});
  const rr=$('#reroll');rr.hidden=q.kind!=='level';rr.disabled=G.rerolls<=0;rr.textContent=`重抽 Reroll (${G.rerolls})`;rr.onclick=()=>{if(G.rerolls<=0)return;G.rerolls--;const prev=G.pick.map(c=>c.n);G.pick=null;G.picks.unshift({...q,exclude:prev});SFX.throw();openPick()};
  if(cards.some(c=>c.q&&c.q.k==='legendary'))SFX.chest();else if(cards.some(c=>c.q&&c.q.k==='epic'))SFX.levelup();
  $('#cards').hidden=false;
}
function renderBuildStrip(){
  const el=$('#build');if(!el)return;el.textContent='';const P=G.P;
  G.spells.forEach((s,i)=>{const m=SPELLS[s.id],d=document.createElement('div');d.className='bs';d.dataset.skill=s.id;d.style.setProperty('--c',m.col);
    const nodes=Object.values(s.nodes||{}).reduce((a,b)=>a+b,0),cat=CATS[SKILL_CAT[s.id]]||CATS.passive;
    const tags=[i===0?'普攻':cat[0],s.els.length?s.els.map(k=>ELS[k].zh).join('+'):'',s.awake?'觉醒':''].filter(Boolean).join(' · ');
    d.innerHTML=`<span class="g">${m.g}</span><div><b>${m.zh} <small>Lv ${s.lv}</small></b><small>${tags}</small></div>`;el.appendChild(d)});
  for(let i=G.spells.length;i<4;i++){const d=document.createElement('div');d.className='bs empty';d.innerHTML=`<span class="g">·</span><div><b>空位 <small>键 ${SPELL_KEYS[i]}</small></b><small>Lv ${i===2?3:6} 时可选新武学 · new skill offered</small></div>`;el.appendChild(d)}
  const st=document.createElement('div');st.className='bstats';st.innerHTML=`<span class="lbl">你的属性 Your stats</span><span>生命 <b>${Math.ceil(P.hp)}/${P.maxHp}</b></span><span>伤害 <b>×${(P.dmg*(1+P.dmgBonus)).toFixed(2)}</b></span><span>暴击 <b>${Math.round(P.crit*100)}%</b></span><span>减伤 <b>${Math.round((1-P.def)*100)}%</b></span><span>移速 <b>×${P.spd.toFixed(2)}</b></span><span>内力 <b>${P.maxMana}</b> +${P.regen.toFixed(1)}/s</span><span>法宝 <b>${G.relics.length}</b></span>`;el.appendChild(st);
  const adv=typeof buildAdvice==='function'?buildAdvice():null;
  if(adv){const a=document.createElement('div');a.className='badv';a.style.setProperty('--cc',(CATS[adv.cat]||CATS.passive)[2]);a.innerHTML=`<b>提示</b> ${adv.zh} <small>${adv.en}</small>`;el.appendChild(a)}
  return adv;
}
function choose(i){
  if(!G.pick||!G.pick[i])return;
  const cd=G.pick[i];cd.a();G.pick=null;$('#cards').hidden=true;drawSeals();SFX.pick(1);if(!G.picks.length)showBanner(cd.n,cd.fx||'',1.1);openPick();
}
function closeCards(){G.picks=[];G.pick=null;$('#cards').hidden=true;G.panel=false;$('#char').hidden=true}

/* title: class select and lobby */
function renderWeapons(){
  const wr=$('#weapons');if(!wr)return;wr.textContent='';const cls=SAVE.cls,cur=weaponOf(cls);
  const h=document.createElement('span');h.className='wh';h.textContent='武器 Weapon';wr.appendChild(h);
  (WEAPONS[cls]||[]).forEach(w=>{const m=SPELLS[w],info=WEAPON_INFO[w]||{},own=weaponUnlocked(cls,w),b=document.createElement('button');b.type='button';b.className='wp'+(w===cur?' sel':'')+(own?'':' locked');b.style.setProperty('--c',m.col);
    const lock=own?'':(SAVE.gold>=(info.cost||0)?`<span class="buy">解锁 Unlock · ${info.cost} 金</span>`:`<span class="lk">🔒 用此职业斩杀一名首领,或 ${info.cost} 金 · slay a boss with this class, or ${info.cost} gold</span>`);
    b.innerHTML=`<span class="g">${m.g}</span><span class="t"><b>${m.zh} <small>${m.en}</small></b><small>${info.trait?info.trait[0]+' · '+info.trait[1]:''}</small><small class="dd">${m.d}</small>${lock}</span>`;
    b.onclick=()=>{if(!own){if(SAVE.gold>=(info.cost||0)){SAVE.gold-=info.cost;SAVE.weaponOwned[w]=true;persist();SFX.complete()}else{SFX.throw();return}}SAVE.weapon[cls]=w;persist();renderTitle();if(G&&G.auto){newGame(true,cls);demoBoost()}SFX.pick(1)};
    wr.appendChild(b)});
}
function renderTitle(){
  const row=$('#classes');row.textContent='';
  for(const k in CLASSES){const C=CLASSES[k],b=document.createElement('button');b.className='cls'+(SAVE.cls===k?' sel':'');b.type='button';b.style.setProperty('--c',C.col);
    b.innerHTML=`<div class="g">${C.g}</div><div class="n">${C.zh} <small>${C.en}</small></div><div class="d">${C.d}</div><div class="de">${C.de}</div><div class="sk">${[C.main,...C.skills].map(id=>`<span style="color:${SPELLS[id].col}">${SPELLS[id].g}</span>`).join('')}</div>`;
    b.onclick=()=>{SAVE.cls=k;CLASS=k;persist();renderTitle();if(G&&G.auto){newGame(true,k);demoBoost()}SFX.pick(1)};row.appendChild(b)}
  renderWeapons();if(typeof renderMeta==='function')renderMeta();if(typeof renderAccount==='function')renderAccount();if(typeof LB!=='undefined'&&$('#lbbtn'))$('#lbbtn').hidden=!LB.enabled();
  $('#gold').textContent=SAVE.gold;
  const shop=$('#shop');shop.textContent='';
  UPGRADES.forEach(u=>{const r=SAVE.up[u.id]||0,cost=u.cost(r),b=document.createElement('button');b.className='up';b.type='button';b.disabled=r>=u.max||SAVE.gold<cost;
    b.innerHTML=`<b>${u.zh} <small>${u.en}</small></b><span class="rk">${'●'.repeat(r)}${'○'.repeat(u.max-r)}</span><span class="dd">${u.d}</span><span class="pr">${r>=u.max?'已满 Max':cost+' 金'}</span>`;
    b.onclick=()=>{if(SAVE.gold>=cost&&r<u.max){SAVE.gold-=cost;SAVE.up[u.id]=r+1;persist();renderTitle();SFX.complete()}};shop.appendChild(b)});
  $('#record').textContent=(SAVE.runs?`${SAVE.runs} 局 · 最长存活 ${fmt(SAVE.best||0)} · 单局最多首领 ${SAVE.bosses||0}`:'')+(SAVE.pk?` · 对决 ${SAVE.pk.w} 胜 ${SAVE.pk.l} 负 · 最高 ${SAVE.pkBest||0} 分`:'');
  RIVAL_ON=(SAVE.mode==='pk');seedSim(null);document.querySelectorAll('#mode button').forEach(b=>b.classList.toggle('on',b.dataset.m===(SAVE.mode||'solo')));$('#modenote').textContent=RIVAL_ON?`对决:与 AI 对手争分 ${PK_LEN/60} 分钟,谁补刀谁拿全部分数 · PK: ${PK_LEN/60}-minute score race against an AI rival; last hit takes all the points`:SAVE.mode==='daily'?`每日挑战 · 种子 ${dayKey()} · 普通难度 · 今天所有人面对同样的怪潮、宝箱与卡牌${SAVE.daily&&SAVE.daily.day===dayKey()?` · 今日最佳 ${fmt(SAVE.daily.best)} / ${SAVE.daily.bosses} 首领`:''} · Daily: same seed for everyone today; compare on the leaderboard`:'单人:无尽模式,活得越久首领越多 · Solo: endless, survive and slay bosses';
  document.querySelectorAll('#qual button').forEach(b=>b.classList.toggle('on',b.dataset.q===QLEVEL));
  DIFFID=SAVE.diff||'normal';document.querySelectorAll('#diff button').forEach(b=>b.classList.toggle('on',b.dataset.d===DIFFID));
  const mp=$('#maps');mp.textContent='';for(const k in MAPS){const M=MAPS[k],locked=M.need&&!SAVE.ach[M.need],b=document.createElement('button');b.type='button';b.className='mapb'+(k===MAPID?' on':'')+(locked?' locked':'');b.disabled=locked;b.innerHTML=`<b>${M.zh}</b><small>${M.en}${locked?' · 🔒 '+ACH.find(a=>a.id===M.need).d:''}</small>`;b.onclick=()=>{try{localStorage.setItem('sl_map',k)}catch(_){}b.innerHTML='<b>载入中…</b>';setTimeout(()=>location.reload(),60)};mp.appendChild(b)}
  const al=$('#ach');al.textContent='';const done=ACH.filter(a=>SAVE.ach[a.id]).length;$('#achcount').textContent=`${done}/${ACH.length}`;
  ACH.forEach(a=>{const d=document.createElement('div');d.className='achi'+(SAVE.ach[a.id]?' done':'');d.innerHTML=`<span class="tick">${SAVE.ach[a.id]?'✓':'○'}</span><b>${a.zh} <small>${a.en}</small></b><span>${a.d}</span><em>+${a.gold} 金</em>`;al.appendChild(d)});
}
/* daily challenge: one seed per calendar day, so every player faces the same spawns, waves, chests and cards */
function dayKey(){const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()}
let DAILY=false;
function startRun(){
  if($('#startbtn').disabled)return;
  CLASS=SAVE.cls;DIFFID=SAVE.diff||'normal';
  DAILY=SAVE.mode==='daily';seedSim(DAILY?dayKey()*7919+1:null);
  $('#title').hidden=true;$('#intro').hidden=true;$('#end').hidden=true;$('#cards').hidden=true;$('#hud').hidden=false;$('#bossbar').hidden=true;$('#pause').hidden=true;$('#char').hidden=true;
  $('#banner').classList.remove('on');$('#pausebtn').textContent='II';
  SAVE_FIRST=!SAVE.played;SAVE.played=true;persist();
  newGame(false,CLASS);applyUpgrades(G.P);updateCores();drawSeals();drawRelics();
  showBanner(CLASSES[CLASS].zh+' 出山',AUTOCAST?'Keep moving. Skills cast themselves; Space dashes.':'Keep moving. 1/2/3 cast skills, Space dashes.',2.6);
  SFX.start();SFX.setState('battle');
}
function showEnd(ok){
  G.ended=true;const box=$('#endb'),tot=G.spells.reduce((a,s)=>a+s.dmg,0)||1,max=Math.max(...G.spells.map(s=>s.dmg),1);
  checkAch();
  const gold=Math.round((G.kills*.45+G.lv*3+G.bossSlain*220+Math.floor(G.t/10)*2+G.goldRun*.7+G.comboMax)*(1+.15*(SAVE.up.gold||0))*(G.relics.includes('bowl')?1.3:1)*D().gold);
  const pk=RIVAL_ON&&G.rival,pkRes=pk?(G.score>G.rival.score?'win':G.score<G.rival.score?'lose':'tie'):null;const pkBonus=pkRes==='win'?200:pkRes==='tie'?80:0;
  if(pk){SAVE.pk=SAVE.pk||{w:0,l:0};if(pkRes==='win')SAVE.pk.w++;else if(pkRes==='lose')SAVE.pk.l++;SAVE.pkBest=Math.max(SAVE.pkBest||0,G.score)}
  let dailyNew=false;if(DAILY){const dk=dayKey();if(!SAVE.daily||SAVE.daily.day!==dk)SAVE.daily={day:dk,best:0,bosses:0};if(G.t>SAVE.daily.best){SAVE.daily.best=G.t;SAVE.daily.bosses=G.bossSlain;dailyNew=true}}
  const meta=typeof metaAfterRun==='function'?metaAfterRun():null;
  const record=!pk&&G.t>(SAVE.best||0);SAVE.gold+=gold+pkBonus;SAVE.runs++;SAVE.wins+=G.bossSlain;SAVE.bosses=Math.max(SAVE.bosses||0,G.bossSlain);if(record)SAVE.best=G.t;persist();
  const rows=G.spells.slice().sort((a,b)=>b.dmg-a.dmg).map(s=>{const f=s.els.length===2?FUS[fusion(s)][1]:s.els[0]?ELS[s.els[0]].en:'';
    const casts=SPELLS[s.id].auto?'':` · ${s.casts} 次 · ${s.casts?Math.round(s.dmg/s.casts):0}/次`;
    return `<span>${SPELLS[s.id].zh} ${SPELLS[s.id].en}${f?` · ${f}`:''} · Lv ${s.lv}<small>${casts}</small></span><div class="bar"><i style="width:${s.dmg/max*100}%"></i></div><span>${Math.round(s.dmg/tot*100)}%</span>`}).join('');
  const R=G.rival,duel=R?(pkRes==='win'?[`胜利 · ${G.score} : ${R.score}`,`Victory · +${pkBonus} gold`]:pkRes==='lose'?[`落败 · ${G.score} : ${R.score}`,`Defeat · ${R.name[1]} out-scored you`]:[`平手 · ${G.score} : ${R.score}`,`Tied · +${pkBonus} gold`]):null;
  const cmp=R?`<div class="cmp"><div class="hd"><span></span><b>你 You</b><b>${R.name[0]}<small> ${CLASSES[R.cls].en}</small></b></div>
    ${[['分数 Score',G.score,R.score],['击杀 Kills',G.kills,R.kills],['等级 Level',G.lv,R.lv],['总伤害 Damage',Math.round(tot),Math.round(R.dmgDealt)],['倒地 Downs',2-G.cores+(SAVE.up.core||0),R.downs]].map(([n,a,b])=>`<div class="r"><span>${n}</span><b class="${a>=b?'w':''}">${a}</b><b class="${b>a?'w':''}">${b}</b></div>`).join('')}</div>`:'';
  box.innerHTML=`<h2 class="${pkRes||''}">${pk?(pkRes==='win'?'对决胜利':pkRes==='lose'?'对决落败':'对决平手'):DAILY?(dailyNew?'今日新纪录':'每日挑战'):record?'新纪录':'败亡'}</h2><p class="sub">${record?'New record · ':''}Survived ${fmt(G.t)} · ${G.bossSlain} boss${G.bossSlain===1?'':'es'} slain</p>${duel?`<p class="duel">${duel[0]} · ${duel[1]}</p>`:''}
  <div class="stat"><div><b>${fmt(G.t)}</b><span>存活 Survived</span></div><div><b>${G.kills}</b><span>击杀 Kills</span></div><div><b>${G.lv}</b><span>等级 Level</span></div><div><b>×${G.comboMax}</b><span>最高连斩 Best combo</span></div><div><b>${G.bossSlain}</b><span>首领 Bosses</span></div><div><b>${G.relics.length}</b><span>法宝 Relics</span></div><div><b class="gold">+${gold}</b><span>金币 Gold</span></div></div>
  ${(!ok&&G.killer)?(()=>{const T=G.t,log=(G.dmgLog||[]).filter(d=>d.t>=T-5),tot=log.reduce((a,d)=>a+d.n,0)||1,by={};for(const d of log){const k=d.src[0]+'|'+d.src[1];by[k]=(by[k]||0)+d.n}const rows=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,n])=>{const [zh,en]=k.split('|');return `<span>${zh} <small>${en}</small> ${Math.round(n/tot*100)}%</span>`}).join('');return `<div class="killed"><b>死于 ${G.killer[0]} · Killed by ${G.killer[1]}</b><div class="srcs"><small>最后 5 秒受到的伤害 · damage in the last 5 s:</small>${rows}</div></div>`})():''}
  ${meta?`<div class="metarow"><span>江湖经验 +${meta.xp}${meta.levelUp?` · <b>江湖等级 ${meta.after.lv}!</b> ${titleFor(meta.after.lv)[1]}`:` · Lv ${meta.after.lv} (${meta.after.x}/${meta.after.need})`}</span>${meta.done.map(([t,g])=>`<span class="td">✓ ${t.id==='streak'?'七日连续':taskText(t).zh} +${g} 金</span>`).join('')}</div>`:''}
  <div class="dmg">${rows}</div>${cmp}<div class="btns"><button class="go" id="againbtn">再来一局 Play again</button><button class="go alt" id="lobbybtn">回到山门 Lobby</button></div>`;
  $('#end').hidden=false;$('#againbtn').onclick=startRun;$('#lobbybtn').onclick=toLobby;$('#againbtn').focus();
  if(typeof submitRun==='function')submitRun(box);
}
function toLobby(){$('#end').hidden=true;$('#hud').hidden=true;$('#title').hidden=false;newGame(true,SAVE.cls);demoBoost();renderTitle();SFX.setState('title')}
$('#startbtn').onclick=startRun;
$('#pausebtn').onclick=()=>{togglePause();$('#pausebtn').blur()};
$('#resumebtn').onclick=()=>togglePause();
$('#quitbtn').onclick=()=>{G.paused=false;$('#pause').hidden=true;lose()};
AUTOCAST=SAVE.autocast===true;
function autoLabel(){const sb=$('#seals');if(sb)sb.classList.toggle('auto',AUTOCAST);$('#autobtn').textContent=AUTOCAST?'武学:自动施放 Skills: auto':'武学:手动 Skills: manual';$('#autonote').textContent=AUTOCAST?'武学自动施放,按 1/2/3 也可手动。':'按 1/2/3 释放武学。'}
$('#autobtn').onclick=()=>{AUTOCAST=!AUTOCAST;SAVE.autocast=AUTOCAST;persist();autoLabel()};autoLabel();
function syncSound(){const m=SFX.muted;$('#mutebtn').textContent=m?'声音:关 Sound off':'声音:开 Sound on';$('#sndbtn').textContent=m?'🔇':'🔊';$('#sndbtn').classList.toggle('off',m);$('#musicvol').value=Math.round(SFX.musicVol*100);$('#sfxvol').value=Math.round(SFX.sfxVol*100);$('#snd-mute').checked=m}
$('#mutebtn').onclick=()=>{SFX.toggleMute();syncSound()};
$('#sndbtn').onclick=()=>{SFX.start();const m=SFX.toggleMute();syncSound();$('#sndpanel').hidden=true;$('#sndbtn').blur();showBanner(m?'静音':'声音开启',m?'Muted':'Sound on',.7)};
$('#snd-mute').onchange=e=>{SFX.setMute(e.target.checked);syncSound()};
$('#musicvol').oninput=e=>{SFX.start();SFX.setMusic(e.target.value/100);if(SFX.muted){SFX.setMute(false);syncSound()}};
$('#sfxvol').oninput=e=>{SFX.start();SFX.setSfx(e.target.value/100);SFX.pick(1);if(SFX.muted){SFX.setMute(false);syncSound()}};
$('#sndclose').onclick=()=>{$('#sndpanel').hidden=true};
syncSound();
if(window.desktop){$('#exitbtn').hidden=false;$('#exitbtn').onclick=()=>window.desktop.quit()}

/* mobile: no double-tap or pinch zoom (iOS Safari ignores the viewport flag) */
(()=>{let lastTap=0,lastEl=null;document.addEventListener('touchend',e=>{const n=Date.now(),el=e.target.closest?e.target.closest('button,a,label,input,select'):null;
    if(n-lastTap<320){e.preventDefault();if(el&&el!==lastEl&&el.tagName!=='INPUT'&&el.tagName!=='SELECT')el.click()} // second quick tap on a different control still counts as a tap
    lastTap=n;lastEl=el},{passive:false});
  document.addEventListener('touchstart',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
  ['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
  document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});})();

/* save code: the whole SAVE object, base64 with a checksum, so progress can move between devices without an account */
function saveCode(){const j=JSON.stringify(SAVE);let h=0;for(let i=0;i<j.length;i++)h=(h*31+j.charCodeAt(i))|0;return 'SL1.'+(h>>>0).toString(36)+'.'+btoa(unescape(encodeURIComponent(j)))}
function loadCode(code){const m=/^SL1\.([0-9a-z]+)\.(.+)$/.exec((code||'').trim());if(!m)return 'bad';let j;try{j=decodeURIComponent(escape(atob(m[2])))}catch(_){return 'bad'}let h=0;for(let i=0;i<j.length;i++)h=(h*31+j.charCodeAt(i))|0;if((h>>>0).toString(36)!==m[1])return 'bad';let o;try{o=JSON.parse(j)}catch(_){return 'bad'}if(!o||typeof o.gold!=='number')return 'bad';Object.assign(SAVE,o);persist();return 'ok'}
$('#exportbtn').onclick=()=>{const p=$('#savepanel'),ta=$('#savecode');p.hidden=false;ta.value=saveCode();ta.readOnly=true;$('#saveapply').hidden=true;ta.select();let msg='复制这段存档码,在另一台设备「导入」。 Copy this code and import it on another device.';try{navigator.clipboard&&navigator.clipboard.writeText(ta.value).then(()=>{$('#savemsg').textContent='已复制到剪贴板 · Copied to clipboard'})}catch(_){}$('#savemsg').textContent=msg};
$('#importbtn').onclick=()=>{const p=$('#savepanel'),ta=$('#savecode');p.hidden=false;ta.value='';ta.readOnly=false;$('#saveapply').hidden=false;$('#savemsg').textContent='粘贴存档码后点「应用」(会覆盖本机存档)。 Paste a save code and press Apply (replaces this device\'s progress).';ta.focus()};
$('#saveapply').onclick=()=>{const r=loadCode($('#savecode').value);$('#savemsg').textContent=r==='ok'?'已导入! Imported.':'存档码无效。 Invalid code.';if(r==='ok'){AUTOCAST=SAVE.autocast===true;autoLabel();renderTitle();SFX.complete()}};
$('#saveclose').onclick=()=>{$('#savepanel').hidden=true};
