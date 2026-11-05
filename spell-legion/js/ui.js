'use strict';
/* ui.js — HUD, cards, title/class select, lobby upgrades, results, input */
const SAVE_KEY='spell-legion-save';
let SAVE={gold:0,up:{},cls:'swordsman',best:0,wins:0,runs:0,autocast:false,rival:false,bosses:0,played:false,ach:{},diff:'normal',clsWins:{}};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s&&typeof s==='object')SAVE={...SAVE,...s}}catch(_){}
SAVE.ach=SAVE.ach||{};SAVE.clsWins=SAVE.clsWins||{};SAVE.weapon=SAVE.weapon||{};SAVE.weaponOwned=SAVE.weaponOwned||{};SAVE.tips=SAVE.tips||{};SAVE.asura=SAVE.asura||{max:0,sel:0,best:0};window.SAVE=SAVE;
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
  if(G.pick&&['1','2','3'].includes(k)){if(e.repeat||!pickArmed||performance.now()-pickOpenedAt<280)return;choose(+k-1);return}
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
function toggleAuto(){if(!G||G.auto)return;AUTOCAST=!AUTOCAST;SAVE.autocast=AUTOCAST;persist();autoLabel();drawSeals();showBanner(AUTOCAST?'武学自动施放':'武学手动施放',AUTOCAST?'Skills cast themselves':'Press 1 / 2 / 3 to cast',1.2);SFX.pick(1)}
// right-click anywhere on the battlefield (not on menus) toggles auto-cast; the HUD switch does the same for touch
document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('#title,#cards,#pause,#char,#end,#lb,#sndpanel,input,textarea'))return;e.preventDefault();toggleAuto()});
cv.addEventListener('pointerdown',e=>{if(e.button===2)touch.on=false});
function input(){
  let x=0,y=0;
  if(keys.has('a')||keys.has('arrowleft'))x--;if(keys.has('d')||keys.has('arrowright'))x++;
  if(keys.has('arrowup')||keys.has('w'))y--;if(keys.has('s')||keys.has('arrowdown'))y++;
  if(touch.on){const dx=touch.x-touch.sx,dy=touch.y-touch.sy,l=hyp(dx,dy);if(l>6){x=dx/Math.max(l,36);y=dy/Math.max(l,36)}}
  const gp=padState();if(gp&&(Math.abs(gp.x)>.2||Math.abs(gp.y)>.2)){x=gp.x;y=gp.y}
  return {x,y};
}
/* gamepad: left stick / d-pad move, A dash, X/Y/B skills 1/2/3, Start pause, RB toggles auto-cast; menus use A/B and d-pad */
const PAD={prev:{},t:0};
function padState(){try{const pads=navigator.getGamepads?navigator.getGamepads():[];const g=[...pads].find(p=>p&&p.connected);if(!g)return null;let x=g.axes[0]||0,y=g.axes[1]||0;const d=Math.hypot(x,y);if(d<.2){x=0;y=0}else{const k=Math.min(1,(d-.2)/.8)/d;x*=k;y*=k}if(g.buttons[14]&&g.buttons[14].pressed)x=-1;if(g.buttons[15]&&g.buttons[15].pressed)x=1;if(g.buttons[12]&&g.buttons[12].pressed)y=-1;if(g.buttons[13]&&g.buttons[13].pressed)y=1;return {x,y,g}}catch(_){return null}}
function padTick(){
  const s=padState();if(!s)return;const b=s.g.buttons,down=i=>!!(b[i]&&b[i].pressed),edge=i=>{const v=down(i),was=PAD.prev[i];PAD.prev[i]=v;return v&&!was};
  if(!G)return;SFX.start();
  if(!$('#title').hidden){if(edge(0)||edge(9))startRun();return}
  if(!$('#end').hidden){if(edge(0))startRun();if(edge(1))toLobby();return}
  if(G.pick){const n=G.pick.length;PAD.sel=PAD.sel||0;if(edge(14)||edge(4))PAD.sel=(PAD.sel+n-1)%n;if(edge(15)||edge(5))PAD.sel=(PAD.sel+1)%n;document.querySelectorAll('#cardrow .card').forEach((c,i)=>c.classList.toggle('padsel',i===PAD.sel));if(edge(0)&&performance.now()-pickOpenedAt>280)choose(PAD.sel);if(edge(3)&&G.rerolls>0)$('#reroll').click();return}
  if(edge(9)){togglePause();return}if(G.paused){if(edge(0)||edge(1))togglePause();return}
  if(edge(0))dash();if(edge(2))castSkill(1);if(edge(3))castSkill(2);if(edge(1))castSkill(3);if(edge(5))toggleAuto();
}
addEventListener('gamepadconnected',()=>{showBanner(L('手柄已连接','Controller connected'),'',1.2);if(!$('#loadnote'))return});

/* HUD */
const fmt=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
let hudT=0;
/* first-run tips: each fires once ever, at the moment the mechanic first matters */
const IS_TOUCH=matchMedia('(pointer:coarse)').matches;
const TIPS={
  move:{when:()=>G.t>.8,zh:IS_TOUCH?'拖动屏幕任意位置移动':'WASD / 方向键移动',en:IS_TOUCH?'Drag anywhere to move':'Move with WASD or the arrow keys'},
  skill:{when:()=>G.t>4&&G.spells[1]&&G.P.mana>=SPELLS[G.spells[1].id].cost,zh:IS_TOUCH?'点击下方图标释放武学,消耗蓝色内力':'按 1 / 2 / 3 释放武学,消耗蓝色内力',en:IS_TOUCH?'Tap a seal to cast a skill; it costs blue qi':'Press 1 / 2 / 3 to cast skills; they cost blue qi'},
  dash:{when:()=>G.P.hp<G.P.maxHp*.6||G.t>40,zh:IS_TOUCH?'点击「轻」轻功闪避,闪避中无敌':'按 Space 轻功闪避,闪避中无敌',en:IS_TOUCH?'Tap the dash seal; you are invulnerable while dashing':'Space dashes; you are invulnerable while dashing'},
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
    SAVE.tips[k]=1;persist();const t=TIPS[k],el=$('#tip');el.innerHTML=`<b>${L(t.zh,t.en)}</b>`;el.classList.add('on');tipT=5.5;if(typeof SFX!=='undefined')SFX.pick(1);break}
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
  $('#timer').textContent=fmt(G.t);$('#nextboss').textContent=G.boss?L('首领战','BOSS'):L('首领 ','boss in ')+fmt(nextBossIn());
  $('#kills').textContent=G.kills+L(' 击杀',' kills');
  if(G.rival){const R=G.rival,tot=Math.max(1,G.score+R.score);$('#score').hidden=false;$('#s-you').textContent=G.score;$('#s-riv').textContent=R.score;$('#s-rname').textContent=L(R.name[0],R.name[1]);$('#s-bar i').style.width=(G.score/tot*100)+'%';$('#score').classList.toggle('lead',G.score>=R.score);$('#nextboss').textContent=(G.boss?L('首领战 · ','BOSS · '):'')+L('剩余 ','left ')+fmt(Math.max(0,PK_LEN-G.t))}
  const o=$('#obj');o.hidden=!G.mission;if(G.mission)o.textContent=missionText();
  const bf=$('#buff');bf.hidden=!P.buff;if(P.buff)bf.textContent={dmg:L('伤害 +30%','Damage +30%'),spd:L('疾行','Swift'),haste:L('冷却减半','Cooldowns halved')}[P.buff.k]+' · '+Math.ceil(P.buff.t)+'s';
  if(G.boss){$('#bosshp i').style.width=(G.boss.hp/G.boss.maxHp*100)+'%'}
  // skill cooldown sweeps
  for(let i=0;i<4;i++){const el=$('#seal'+i);if(!el)continue;const s=G.spells[i];if(!s)continue;const sp=SPELLS[s.id];
    const cdT=sp.auto?0:(sp.cd*stat(s).cdM/P.haste),k=sp.auto?0:clamp(s.cd/Math.max(.01,cdT),0,1);
    el.style.setProperty('--cd',(k*360)+'deg');el.classList.toggle('cooling',k>0);el.classList.toggle('poor',!sp.auto&&P.mana<sp.cost);el.classList.toggle('active',s.active>0);
    const deny=G.fx.find(f=>f.k==='deny'&&f.i===i);el.classList.toggle('deny',!!deny)}
  const d=$('#sealdash');d.style.setProperty('--cd',(clamp(P.dashCd/1.4,0,1)*360)+'deg');d.classList.toggle('cooling',P.dashCd>0);
}
function drawRelics(){const box=$('#relics');if(!box)return;box.textContent='';for(const id of G.relics){const R=RELICS[id],d=document.createElement('div');d.className='relic';d.style.color=R.col;d.textContent=R.g;d.title=`${LL(R)} · ${L(R.d,R.de)}`;box.appendChild(d)}}
let introT=null,introOn=false;
function bossIntro(zh,en,n){const el=$('#intro');el.innerHTML=`<div class="lb"></div><div class="bn"><small>${L(`第 ${n+1} 位首领`,`Boss ${n+1}`)}</small><b>${L(zh,en)}</b><span>${L(en,zh)}</span>${BOSS_HINT[n%BOSS_HINT.length]?`<em>${L(BOSS_HINT[n%BOSS_HINT.length][0],BOSS_HINT[n%BOSS_HINT.length][1])}</em>`:''}</div><div class="lb"></div>`;el.hidden=false;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');introOn=true;$('#banner').classList.remove('on');clearTimeout(introT);introT=setTimeout(()=>{el.classList.remove('on');introOn=false;setTimeout(()=>el.hidden=true,500)},3400)}
function updateCores(){const e=$('#cores');e.textContent='';for(let i=0;i<Math.max(2,G.cores);i++){const s=document.createElement('i');s.className='core'+(i<G.cores?'':' off');e.appendChild(s);e.append(' ')}}
function drawSeals(){
  if(G.auto)return;
  const box=$('#seals');box.textContent='';box.classList.toggle('auto',AUTOCAST);
  for(let i=0;i<4;i++){const s=G.spells[i],d=document.createElement('button');d.className='seal'+(s?'':' empty')+(i===0?' main':'');d.id='seal'+i;d.type='button';
    if(s){const m=SPELLS[s.id];
      const g=document.createElement('div');g.className='g';g.textContent=m.g;g.style.color=s.els[0]?ELS[s.els[0]].col:m.col;d.appendChild(g);
      const l=document.createElement('div');l.className='lv';l.textContent='Lv '+s.lv;d.appendChild(l);
      const key=document.createElement('div');key.className='key';key.textContent=m.auto?L('自动','auto'):SPELL_KEYS[i];d.appendChild(key);
      if(!m.auto){const cst=document.createElement('div');cst.className='cost';cst.innerHTML=`<i>${L('内力','qi')}</i>${skillCost(s)}`;d.appendChild(cst)}
      d.title=`${LL(m)} · Lv ${s.lv}${m.auto?L(' · 自动',' · auto'):L(` · 消耗 ${skillCost(s)} 内力 · 冷却 ${m.cd}s`,` · ${skillCost(s)} qi · ${m.cd}s cooldown`)}\n${L(m.d,m.de)}`;
      if(s.els.length){const e=document.createElement('div');e.className='els';s.els.forEach(k=>{const b=document.createElement('i');b.style.background=ELS[k].col;b.style.color=ELS[k].col;e.appendChild(b)});d.appendChild(e)}
      if(s.augs.length){const a=document.createElement('div');a.className='aug';a.textContent=s.augs.map(k=>AUGS[k].g).join('');d.appendChild(a)}
      const cdm=document.createElement('div');cdm.className='cdm';d.appendChild(cdm);
      d.title=LL(m)+(m.auto?'':L(` · ${m.cost} 内力 · ${m.cd}s`,` · ${m.cost} qi · ${m.cd}s`));
      d.onpointerdown=ev=>{ev.preventDefault();if(!m.auto)castSkill(i)};
    }else{const key=document.createElement('div');key.className='key';key.textContent=SPELL_KEYS[i];d.appendChild(key)}
    box.appendChild(d)}
  const dd=document.createElement('button');dd.className='seal dash';dd.id='sealdash';dd.type='button';dd.innerHTML=`<div class="g">轻</div><div class="lv">${L('轻功','dash')}</div><div class="key">${IS_TOUCH?L('点击','tap'):'Space'}</div><div class="cdm"></div>`;dd.onpointerdown=ev=>{ev.preventDefault();dash()};box.appendChild(dd);
  const at=document.createElement('button');at.className='seal autosw'+(AUTOCAST?' on':'');at.id='autosw';at.type='button';at.innerHTML=`<div class="g">${AUTOCAST?'自':'手'}</div><div class="lv">${AUTOCAST?L('自动施放','auto-cast'):L('手动施放','manual')}</div><div class="key">${IS_TOUCH?L('切换','toggle'):L('右键','R-click')}</div>`;at.title=L('切换武学自动/手动施放(右键也可)','Toggle auto-cast (right-click also works)');at.onpointerdown=ev=>{ev.preventDefault();toggleAuto()};box.appendChild(at);
}
let bannerT=0;
function showBanner(zh,en,t){if(!G||G.auto)return;if(introOn&&t<2.5)return;const b=$('#banner');b.innerHTML=`${L(zh,en)}`;b.classList.remove('on');void b.offsetWidth;b.classList.add('on');bannerT=t}
/* character panel: attributes and skill trees */
let panelTab='tree';
function togglePanel(){if(!G||G.auto||G.over||G.pick)return;G.panel=!G.panel;$('#char').hidden=!G.panel;if(G.panel){renderPanel();SFX.setState('title')}else SFX.setState(G.boss?'boss':'battle')}
function renderPanel(){
  const P=G.P;$('#sp').textContent=G.spells.reduce((a,s)=>a+s.pts,0);
  $('#tab-attr').classList.toggle('on',panelTab==='attr');$('#tab-tree').classList.toggle('on',panelTab==='tree');
  const A=$('#attrs');A.hidden=panelTab!=='attr';const T=$('#trees');T.hidden=panelTab!=='tree';
  if(panelTab==='attr'){A.textContent='';
    const note=document.createElement('p');note.className='pnote';note.textContent=L(`每升一级自动成长:生命 +8、伤害 +3%、内力 +5、回复 +3%、移速 +1%。目前 Lv ${G.lv}。`,`Stats grow automatically every level.`);A.appendChild(note);
    const d=document.createElement('div');d.className='derived';
    d.innerHTML=`<span>${L('生命','HP')} <b>${Math.ceil(P.hp)}/${P.maxHp}</b></span><span>${L('内力','Qi')} <b>${Math.floor(P.mana)}/${P.maxMana}</b> (+${(P.regen).toFixed(1)}/s)</span><span>${L('伤害','Damage')} <b>×${(P.dmg*(1+P.dmgBonus)).toFixed(2)}</b></span><span>${L('暴击','Crit')} <b>${Math.round(P.crit*100)}%</b></span><span>${L('移速','Speed')} <b>×${P.spd.toFixed(2)}</b></span><span>${L('减伤','Mitigation')} <b>${Math.round((1-P.def)*100)}%</b></span>`;A.appendChild(d);
  }else{T.textContent='';
    G.spells.forEach((s,si)=>{const m=SPELLS[s.id],col=document.createElement('div');col.className='tree';col.style.setProperty('--c',m.col);
      col.innerHTML=`<div class="th"><span class="g">${m.g}</span><div><b>${LL(m)}</b><small>Lv ${s.lv} · ${s.pts} ${L('点','pts')}</small></div></div>`;
      (TREES[s.id]||[]).forEach((n,i)=>{const r=s.nodes[i]||0,need=n.tier===1?0:n.tier===2?2:4,locked=s.pts<need;
        const b=document.createElement('div');b.className='node t'+n.tier+(r>=n.max?' max':'')+(locked?' locked':'')+(r>0?' has':'');
        b.innerHTML=`<span class="nn">${LL(n)}</span><span class="nd">${L(n.d,n.de)}</span><span class="nr">${r}/${n.max}${locked?L(' · 需先学 '+need+' 项',' · needs '+need+' taken'):''}</span>`;col.appendChild(b)});
      T.appendChild(col)});
  }
}
document.querySelectorAll('#mode button').forEach(b=>b.onclick=()=>{SAVE.mode=b.dataset.m;persist();renderTitle();SFX.pick(1)});
document.querySelectorAll('#diff button').forEach(b=>b.onclick=()=>{SAVE.diff=b.dataset.d;DIFFID=SAVE.diff;persist();renderTitle();SFX.pick(1)});
document.querySelectorAll('#qual button').forEach(b=>b.onclick=()=>{try{localStorage.setItem('sl_quality',b.dataset.q)}catch(_){}b.textContent=L('重新载入…','Reloading…');setTimeout(()=>location.reload(),60)});
if(typeof wireLeaderboard==='function')wireLeaderboard();
$('#charbtn').onclick=()=>{togglePanel();$('#charbtn').blur()};
$('#charclose').onclick=()=>togglePanel();
$('#tab-attr').onclick=()=>{panelTab='attr';renderPanel()};$('#tab-tree').onclick=()=>{panelTab='tree';renderPanel()};
function togglePause(){if(G.over||G.pick)return;G.paused=!G.paused;$('#pausebtn').textContent=G.paused?'▶':'II';$('#pause').hidden=!G.paused;if(G.paused)SFX.setState('title');else SFX.setState(G.boss?'boss':'battle')}

/* cards */
let pickOpenedAt=0,pickArmed=false;addEventListener('keyup',()=>{if(G&&G.pick)pickArmed=true});
function openPick(){
  if(G.pick||!G.picks.length)return;
  const q=G.picks.shift(),cards=buildCards(q);
  if(!cards.length){return openPick()}
  if(G.auto){pick(cards).a();return openPick()}
  G.pick=cards;pickOpenedAt=performance.now();pickArmed=false;$('#banner').classList.remove('on');bannerT=0;
  const sk=q.s?LL(SPELLS[q.s.id]):'';const T={level:[L('升级','Level up'),L('三选一','pick one')],infuse:[L('灌注真气','Infuse an element'),sk],fuse:[L('真气融合','Fuse elements'),sk],aug:[L('密令完成','Mission complete'),L('选择一项强化','choose an augment')],awake:[L('武器觉醒','Weapon awakening'),sk],contract:[L('契约','A pact is offered'),L('付出代价,换取当下的力量;也可以拒绝','Pay a price for power now, or decline')]}[q.kind];
  $('#cardtitle').innerHTML=`${T[0]}<small>${T[1]}${G.picks.length?L(` · 之后还有 ${G.picks.length} 次`,` · ${G.picks.length} more after this`):''}</small>`;
  const row=$('#cardrow');row.textContent='';
  const adv=renderBuildStrip();
  cards.forEach((cd,i)=>{const b=document.createElement('button');b.className='card'+(cd.q?' '+cd.q.k:'')+(cd.isNew?' newskill':'');b.id='card'+i;b.style.setProperty('--c',cd.c);b.style.animationDelay=(i*.08)+'s';
    const cat=CATS[cd.cat]||CATS.passive,kind=cd.kind||'passive',K=KINDS[kind]||KINDS.passive;
    const sug=adv&&(cd.cat===adv.cat||(adv.cat==='defense'&&cd.cat==='heal')||(adv.cat==='melee'&&(cd.cat==='ranged'||cd.cat==='summon')));
    // header: what kind of card · category · rarity · suggested star
    const hd=document.createElement('div');hd.className='hd';
    hd.innerHTML=`<span class="kind" style="--cc:${K[2]}">${L(K[0],K[1])}</span>${kind!=='passive'&&kind!=='jackpot'?`<span class="catd" style="--cc:${cat[2]}">${L(cat[0],cat[1])}</span>`:''}<span class="sp"></span>${cd.q&&cd.q.k!=='common'?`<span class="rar">${L(cd.q.zh,cd.q.en)}</span>`:''}${sug?`<span class="star" title="${L('推荐','Suggested')}">★</span>`:''}`;
    b.appendChild(hd);
    // glyph of the skill being changed, with a small badge for the node / element / augment
    const gw=document.createElement('div');gw.className='gw';gw.innerHTML=`<span class="g">${cd.g}</span>${cd.badge?`<span class="badge">${cd.badge}</span>`:''}`;b.appendChild(gw);
    const parts=[['n',cd.n],['sub',cd.sub],['fx',cd.fx],['fxe',cd.fxEn],['k',L('按 ','Press ')+(i+1)]];
    parts.forEach(([k,v])=>{if(!v)return;const s=document.createElement('div');s.className=k;s.textContent=v;b.appendChild(s)});
    if(sug)b.classList.add('sugged');
    if(cd.skill){b.onmouseenter=()=>document.querySelectorAll('#build .bs').forEach(x=>x.classList.toggle('hl',x.dataset.skill===cd.skill));b.onmouseleave=()=>document.querySelectorAll('#build .bs.hl').forEach(x=>x.classList.remove('hl'))}
    b.onclick=()=>choose(i);row.appendChild(b)});
  const rr=$('#reroll');rr.hidden=q.kind!=='level';rr.disabled=G.rerolls<=0;rr.textContent=L('重抽','Reroll')+` (${G.rerolls})`;rr.onclick=()=>{if(G.rerolls<=0)return;G.rerolls--;const prev=G.pick.map(c=>c.n);G.pick=null;G.picks.unshift({...q,exclude:prev});SFX.throw();openPick()};
  if(cards.some(c=>c.q&&c.q.k==='legendary'))SFX.chest();else if(cards.some(c=>c.q&&c.q.k==='epic'))SFX.levelup();
  $('#cards').hidden=false;
}
function renderBuildStrip(){
  const el=$('#build');if(!el)return;el.textContent='';const P=G.P;
  G.spells.forEach((s,i)=>{const m=SPELLS[s.id],d=document.createElement('div');d.className='bs';d.dataset.skill=s.id;d.style.setProperty('--c',m.col);
    const nodes=Object.values(s.nodes||{}).reduce((a,b)=>a+b,0),cat=CATS[SKILL_CAT[s.id]]||CATS.passive;
    const tags=[i===0?L('普攻','normal attack'):L(cat[0],cat[1]),s.els.length?s.els.map(k=>LL(ELS[k])).join('+'):'',s.awake?L('觉醒','awakened'):''].filter(Boolean).join(' · ');
    d.innerHTML=`<span class="g">${m.g}</span><div><b>${LL(m)} <small>Lv ${s.lv}</small></b><small>${tags}</small></div>`;el.appendChild(d)});
  for(let i=G.spells.length;i<4;i++){const d=document.createElement('div');d.className='bs empty';const nx=[3,6,10].find(l=>l>G.lv);d.innerHTML=`<span class="g">·</span><div><b>${L('空位','Empty')} <small>${L('键','key')} ${SPELL_KEYS[i]}</small></b><small>${nx?L(`Lv ${nx} 时可选新武学`,`new skill offered at Lv ${nx}`):L('本局不再提供新武学','no more new skills this run')}</small></div>`;el.appendChild(d)}
  const st=document.createElement('div');st.className='bstats';st.innerHTML=`<span class="lbl">${L('你的属性','Your stats')}</span><span>${L('生命','HP')} <b>${Math.ceil(P.hp)}/${P.maxHp}</b></span><span>${L('伤害','Damage')} <b>×${(P.dmg*(1+P.dmgBonus)).toFixed(2)}</b></span><span>${L('暴击','Crit')} <b>${Math.round(P.crit*100)}%</b></span><span>${L('减伤','Mitigation')} <b>${Math.round((1-P.def)*100)}%</b></span><span>${L('移速','Speed')} <b>×${P.spd.toFixed(2)}</b></span><span>${L('内力','Qi')} <b>${P.maxMana}</b> +${P.regen.toFixed(1)}/s</span><span>${L('法宝','Relics')} <b>${G.relics.length}</b></span>`;el.appendChild(st);
  const adv=typeof buildAdvice==='function'?buildAdvice():null;
  if(adv){const a=document.createElement('div');a.className='badv';a.style.setProperty('--cc',(CATS[adv.cat]||CATS.passive)[2]);a.innerHTML=`<b>${L('提示','Tip')}</b> ${L(adv.zh,adv.en)}`;el.appendChild(a)}
  return adv;
}
function choose(i){
  if(!G.pick||!G.pick[i])return;
  const cd=G.pick[i];cd.a();G.pick=null;$('#cards').hidden=true;drawSeals();SFX.pick(1);if(!G.picks.length)showBanner(cd.n,cd.n,1.1);
  if(G.picks.length&&G.picks[0].kind==='level'&&G.t>60){G.pickHold=8;showBanner(L(`还有 ${G.picks.length} 次升级,8 秒后选`,`${G.picks.length} more level-up${G.picks.length>1?'s':''} in 8 s`),'',1)}else openPick();
}
function closeCards(){G.picks=[];G.pick=null;$('#cards').hidden=true;G.panel=false;$('#char').hidden=true}

/* title: class select and lobby */
function renderWeapons(){
  const wr=$('#weapons');if(!wr)return;wr.textContent='';const cls=SAVE.cls,cur=weaponOf(cls);
  const h=document.createElement('span');h.className='wh';h.textContent=L('武器','Weapon');wr.appendChild(h);
  (WEAPONS[cls]||[]).forEach(w=>{const m=SPELLS[w],info=WEAPON_INFO[w]||{},own=weaponUnlocked(cls,w),b=document.createElement('button');b.type='button';b.className='wp'+(w===cur?' sel':'')+(own?'':' locked');b.style.setProperty('--c',m.col);
    const lock=own?'':(SAVE.gold>=(info.cost||0)?`<span class="buy">${L('解锁','Unlock')} · ${info.cost} ${L('金','gold')}</span>`:`<span class="lk">🔒 ${L(`用此职业斩杀一名首领,或 ${info.cost} 金`,`slay a boss with this class, or ${info.cost} gold`)}</span>`);
    b.innerHTML=`<span class="g">${m.g}</span><span class="t"><b>${LL(m)}</b><small>${info.trait?L(info.trait[0],info.trait[1]):''}</small><small class="dd">${L(m.d,m.de)}</small>${lock}</span>`;
    b.onclick=()=>{if(!own){if(SAVE.gold>=(info.cost||0)){SAVE.gold-=info.cost;SAVE.weaponOwned[w]=true;persist();SFX.complete()}else{SFX.throw();return}}SAVE.weapon[cls]=w;persist();renderTitle();if(G&&G.auto){newGame(true,cls);demoBoost()}SFX.pick(1)};
    wr.appendChild(b)});
}
function renderAsura(){
  const el=$('#asura');if(!el)return;const A=SAVE.asura,on=(SAVE.mode==='solo'||SAVE.mode==='rush')&&(A.max>0||SAVE.wins>0);el.hidden=!on;if(!on)return;
  if(A.sel>A.max)A.sel=A.max;el.textContent='';const lab=document.createElement('span');lab.textContent=L('修罗','Ascension');el.appendChild(lab);
  for(let t=0;t<=Math.min(A.max,ASURA.length);t++){const b=document.createElement('button');b.type='button';b.textContent=t?String(t):L('无','Off');b.classList.toggle('on',t===(A.sel||0));b.onclick=()=>{A.sel=t;persist();renderTitle();SFX.pick(1)};el.appendChild(b)}
  const d=document.createElement('small');const sel=A.sel||0;d.textContent=sel?L(`第 ${sel} 层:`,`Tier ${sel}: `)+ASURA.slice(0,sel).map(x=>L(x.zh,x.en)).join(' · ')+L(` · 金币 +${Math.round(ASURA_GOLD*sel*100)}%`,` · gold +${Math.round(ASURA_GOLD*sel*100)}%`):L('一局斩杀两位首领即可解锁下一层;每层叠加一条规则,金币 +15%/层','Slay two bosses in one run to unlock the next tier; each tier stacks one rule and pays +15% gold');el.appendChild(d);
}
function renderTitle(){
  if(typeof loginTick==='function'){const lg=loginTick();const se=typeof seasonTick==='function'?seasonTick():null;if(lg||se){const el=$('#loadnote');if(el)el.textContent=(lg?L(`签到第 ${lg.day} 天:金 +${lg.gold}`,`Login day ${lg.day}: +${lg.gold} gold`):'')+(se?L(` · 新赛季!上季峰值 ${se.peak} 🏆,奖励金 ${se.reward}`,` · New season! Last peak ${se.peak} 🏆, reward ${se.reward} gold`):'')}}
  const row=$('#classes');row.textContent='';
  for(const k in CLASSES){const C=CLASSES[k],b=document.createElement('button');b.className='cls'+(SAVE.cls===k?' sel':'');b.type='button';b.style.setProperty('--c',C.col);
    b.innerHTML=`<div class="g">${C.g}</div><div class="n">${LL(C)}</div><div class="d">${L(C.d,C.de)}</div><div class="sk">${[C.main,...C.skills].map(id=>`<span style="color:${SPELLS[id].col}">${SPELLS[id].g}</span>`).join('')}</div>`;
    b.onclick=()=>{SAVE.cls=k;CLASS=k;persist();renderTitle();if(G&&G.auto){newGame(true,k);demoBoost()}SFX.pick(1)};row.appendChild(b)}
  renderWeapons();if(typeof renderMeta==='function')renderMeta();if(typeof renderCodex==='function')renderCodex();renderStatus();if(typeof renderAccount==='function')renderAccount();if(typeof LB!=='undefined'&&$('#lbbtn'))$('#lbbtn').hidden=!LB.enabled();
  $('#gold').textContent=SAVE.gold;
  const shop=$('#shop');shop.textContent='';
  UPGRADES.forEach(u=>{const r=SAVE.up[u.id]||0,cost=u.cost(r),b=document.createElement('button');b.className='up';b.type='button';b.disabled=r>=u.max||SAVE.gold<cost;
    b.innerHTML=`<b>${LL(u)}</b><span class="rk">${'●'.repeat(r)}${'○'.repeat(u.max-r)}</span><span class="dd">${L(u.d,u.de)}</span><span class="pr">${r>=u.max?L('已满','Max'):cost+' '+L('金','gold')}</span>`;
    b.onclick=()=>{if(SAVE.gold>=cost&&r<u.max){SAVE.gold-=cost;SAVE.up[u.id]=r+1;persist();renderTitle();SFX.complete()}};shop.appendChild(b)});
  $('#record').textContent=(SAVE.runs?L(`${SAVE.runs} 局 · 最长存活 ${fmt(SAVE.best||0)} · 单局最多首领 ${SAVE.bosses||0}`,`${SAVE.runs} runs · best ${fmt(SAVE.best||0)} · most bosses ${SAVE.bosses||0}`):'')+(SAVE.pk?L(` · 对决 ${SAVE.pk.w} 胜 ${SAVE.pk.l} 负 · 最高 ${SAVE.pkBest||0} 分`,` · PK ${SAVE.pk.w}W ${SAVE.pk.l}L · best ${SAVE.pkBest||0} pts`):'');
  RIVAL_ON=(SAVE.mode==='pk'||SAVE.mode==='qpk');seedSim(null);document.querySelectorAll('#mode button').forEach(b=>b.classList.toggle('on',b.dataset.m===(SAVE.mode||'solo')));$('#modenote').textContent=(RIVAL_ON&&SAVE.mode!=='qpk')?L(`对决:与 AI 对手争分 ${PK_LEN/60} 分钟,谁补刀谁拿全部分数`,`PK: a ${PK_LEN/60}-minute score race against an AI rival; the last hit takes all the points`):SAVE.mode==='daily'?L(`每日挑战 · 种子 ${dayKey()} · 普通难度 · 不计永久强化 · 今天所有人面对同样的怪潮、宝箱与卡牌 · ${resetIn()} 后刷新`,`Daily challenge · seed ${dayKey()} · Normal · no permanent upgrades · same spawns, chests and cards for everyone today · resets in ${resetIn()}`)+(SAVE.daily&&SAVE.daily.day===dayKey()?L(` · 今日最佳 ${fmt(SAVE.daily.best)} / ${SAVE.daily.bosses} 首领`,` · today's best ${fmt(SAVE.daily.best)} / ${SAVE.daily.bosses} bosses`):''):SAVE.mode==='qpk'?L(`快速对决:3 分钟,对手强度随你的段位(${L(ladderOf(SAVE.trophies||0)[1],ladderOf(SAVE.trophies||0)[2])} · ${SAVE.trophies||0} 🏆)提升;胜 +25🏆,负 -9🏆`,`Quick PK: 3 minutes; the rival scales with your league (${ladderOf(SAVE.trophies||0)[2]} · ${SAVE.trophies||0} 🏆); win +25 🏆, lose −9`):SAVE.mode==='rush'?L('首领连战:从 Lv 10 开始,每 75 秒一位首领,经验加倍,没有统领与契约','Boss rush: start at Lv 10, a boss every 75 s, double XP, no warlord or pacts'):L('单人:无尽模式,活得越久首领越多','Solo: endless; survive and slay bosses');
  renderAsura();
  document.querySelectorAll('#qual button').forEach(b=>b.classList.toggle('on',b.dataset.q===QLEVEL));
  DIFFID=SAVE.mode==='daily'?'normal':(SAVE.diff||'normal');document.querySelectorAll('#diff button').forEach(b=>{b.classList.toggle('on',b.dataset.d===DIFFID);b.disabled=SAVE.mode==='daily'});$('#diff').classList.toggle('locked',SAVE.mode==='daily');
  const mp=$('#maps');mp.textContent='';for(const k in MAPS){const M=MAPS[k],locked=M.need&&!SAVE.ach[M.need]&&!((SAVE.wins||0)>=(M.need==='boss2'?3:8)),b=document.createElement('button');b.type='button';b.className='mapb'+(k===MAPID?' on':'')+(locked?' locked':'');b.disabled=locked;b.innerHTML=`<b>${LL(M)}</b><small>${locked?'🔒 '+L(ACH.find(a=>a.id===M.need).d,ACH.find(a=>a.id===M.need).de)+L(`,或累计斩杀 ${M.need==='boss2'?3:8} 位首领 (${SAVE.wins||0})`,`, or ${M.need==='boss2'?3:8} bosses in total (${SAVE.wins||0})`):L(M.en,M.zh)}</small>`;b.onclick=()=>{try{localStorage.setItem('sl_map',k)}catch(_){}b.innerHTML=`<b>${L('载入中…','Loading…')}</b>`;setTimeout(()=>location.reload(),60)};mp.appendChild(b)}
  const al=$('#ach');al.textContent='';const done=ACH.filter(a=>SAVE.ach[a.id]).length;$('#achcount').textContent=`${done}/${ACH.length}`;
  ACH.forEach(a=>{const d=document.createElement('div');d.className='achi'+(SAVE.ach[a.id]?' done':'');d.innerHTML=`<span class="tick">${SAVE.ach[a.id]?'✓':'○'}</span><b>${LL(a)}</b><span>${L(a.d,a.de)}</span><em>+${a.gold} 金</em>`;al.appendChild(d)});
}
/* daily challenge: one seed per calendar day, so every player faces the same spawns, waves, chests and cards */
const RESET_TZ_OFFSET=8; // daily reset at midnight UTC+8 (Beijing / Hong Kong) for everyone
function tzDate(ms){return new Date((ms===undefined?Date.now():ms)+RESET_TZ_OFFSET*3600000)}
function dayKeyOf(d){return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate()}
function dayKey(){return dayKeyOf(tzDate())}
function yesterdayKey(){return dayKeyOf(tzDate(Date.now()-86400000))}
function resetIn(){const d=tzDate();const s=86400-(d.getUTCHours()*3600+d.getUTCMinutes()*60+d.getUTCSeconds());return `${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m`}
let DAILY=false;
function startRun(){
  if($('#startbtn').disabled)return;
  CLASS=SAVE.cls;DIFFID=SAVE.diff||'normal';
  DAILY=SAVE.mode==='daily';if(DAILY)DIFFID='normal';BOSSRUSH=SAVE.mode==='rush';ASURA_T=(SAVE.mode==='solo'||SAVE.mode==='rush')?Math.min(SAVE.asura.sel||0,SAVE.asura.max||0):0;seedSim(DAILY?dayKey()*7919+1:null);
  $('#title').hidden=true;$('#intro').hidden=true;$('#end').hidden=true;$('#cards').hidden=true;$('#hud').hidden=false;$('#bossbar').hidden=true;$('#pause').hidden=true;$('#char').hidden=true;
  $('#banner').classList.remove('on');$('#pausebtn').textContent='II';
  SAVE_FIRST=!SAVE.played;SAVE.played=true;persist();
  newGame(false,CLASS);if(!DAILY)applyUpgrades(G.P);G.day=dayKey();if(typeof codexSee==='function')codexSee('weapon',weaponOf(CLASS));G.quick=SAVE.mode==='qpk';
  if(!DAILY){G.P.dmgBonus+=masteryBonus(CLASS);if((SAVE.road||{})[300])G.rerolls++;if((SAVE.road||{})[1000]){G.cores++}}
  if(SAVE.mode==='solo'){const ev=todayEvent();ev.apply();G.event=ev;showBanner(L('今日活动:','Event: ')+L(ev.zh,ev.en),'',2.4)}updateCores();drawSeals();drawRelics();
  showBanner(CLASSES[CLASS].zh+' 出山',CLASSES[CLASS].en+' sets out',2.2);
  SFX.start();SFX.setState('battle');
}
function showEnd(ok){
  G.ended=true;const box=$('#endb'),tot=G.spells.reduce((a,s)=>a+s.dmg,0)||1,max=Math.max(...G.spells.map(s=>s.dmg),1);
  checkAch();
  const meta=typeof metaAfterRun==='function'?metaAfterRun():null;
  const gold=Math.round((G.kills*.45+G.lv*3+G.bossSlain*220+Math.floor(G.t/10)*2+G.goldRun*.7+G.comboMax)*(meta&&meta.firstBonus?2:1)*(G.event?1.5:1)*(1+.15*(SAVE.up.gold||0))*(G.relics.includes('bowl')?1.3:1)*(G.relics.includes('wolf')?1.6:1)*(G.curse.gold||1)*(1+ASURA_GOLD*ASURA_T)*D().gold);
  let tierUp=false;if(ASURA_T>=0&&(SAVE.mode==='solo')&&G.bossSlain>=2&&!G.abandoned&&SAVE.asura.max<=ASURA_T&&ASURA_T<ASURA.length){SAVE.asura.max=ASURA_T+1;tierUp=true}if(G.bossSlain>=2&&ASURA_T>(SAVE.asura.best||0))SAVE.asura.best=ASURA_T;
  const pk=RIVAL_ON&&G.rival,pkRes=pk?(G.score>G.rival.score?'win':G.score<G.rival.score?'lose':'tie'):null;const pkBonus=pkRes==='win'?200:pkRes==='tie'?80:0;
  if(pk){SAVE.pk=SAVE.pk||{w:0,l:0};if(pkRes==='win')SAVE.pk.w++;else if(pkRes==='lose')SAVE.pk.l++;SAVE.pkBest=Math.max(SAVE.pkBest||0,G.score)}
  let dailyNew=false;if(DAILY){const dk=G.day||dayKey();if(!SAVE.daily||SAVE.daily.day!==dk)SAVE.daily={day:dk,best:0,bosses:0};if(G.t>SAVE.daily.best){SAVE.daily.best=G.t;SAVE.daily.bosses=G.bossSlain;dailyNew=true}}
  const record=!pk&&!G.abandoned&&G.t>(SAVE.best||0);SAVE.gold+=gold+pkBonus;SAVE.runs++;SAVE.wins+=G.bossSlain;SAVE.bosses=Math.max(SAVE.bosses||0,G.bossSlain);if(record)SAVE.best=G.t;persist();
  const rows=G.spells.slice().sort((a,b)=>b.dmg-a.dmg).map(s=>{const f=s.els.length===2?FUS[fusion(s)][1]:s.els[0]?ELS[s.els[0]].en:'';
    const casts=SPELLS[s.id].auto?'':L(` · ${s.casts} 次 · ${s.casts?Math.round(s.dmg/s.casts):0}/次`,` · ${s.casts} casts · ${s.casts?Math.round(s.dmg/s.casts):0} per cast`);
    return `<span>${LL(SPELLS[s.id])}${f?` · ${f}`:''} · Lv ${s.lv}<small>${casts}</small></span><div class="bar"><i style="width:${s.dmg/max*100}%"></i></div><span>${Math.round(s.dmg/tot*100)}%</span>`}).join('');
  const R=G.rival,duel=R?(pkRes==='win'?[L('胜利','Victory')+` · ${G.score} : ${R.score}`,L(`+${pkBonus} 金`,`+${pkBonus} gold`)]:pkRes==='lose'?[L('落败','Defeat')+` · ${G.score} : ${R.score}`,L(`${R.name[0]}得分更高`,`${R.name[1]} out-scored you`)]:[L('平手','Tied')+` · ${G.score} : ${R.score}`,L(`+${pkBonus} 金`,`+${pkBonus} gold`)]):null;
  const cmp=R?`<div class="cmp"><div class="hd"><span></span><b>${L('你','You')}</b><b>${L(R.name[0],R.name[1])}<small> ${LL(CLASSES[R.cls])}</small></b></div>
    ${[[L('分数','Score'),G.score,R.score],[L('击杀','Kills'),G.kills,R.kills],[L('等级','Level'),G.lv,R.lv],[L('总伤害','Damage'),Math.round(tot),Math.round(R.dmgDealt)],[L('倒地','Downs'),2-G.cores+(SAVE.up.core||0),R.downs]].map(([n,a,b])=>`<div class="r"><span>${n}</span><b class="${a>=b?'w':''}">${a}</b><b class="${b>a?'w':''}">${b}</b></div>`).join('')}</div>`:'';
  box.innerHTML=`<h2 class="${pkRes||''}">${pk?(pkRes==='win'?L('对决胜利','Duel won'):pkRes==='lose'?L('对决落败','Duel lost'):L('对决平手','Duel tied')):G.abandoned?L('已放弃','Abandoned'):DAILY?(dailyNew?L('今日新纪录','New daily best'):L('每日挑战','Daily challenge')):record?L('新纪录','New record'):L('败亡','Fallen')}</h2><p class="sub">${L(`存活 ${fmt(G.t)} · 斩杀首领 ${G.bossSlain}`,`Survived ${fmt(G.t)} · ${G.bossSlain} boss${G.bossSlain===1?'':'es'} slain`)}${ASURA_T?` · ${L('修罗','Ascension')} ${ASURA_T}`:''}${BOSSRUSH?` · ${L('首领连战','Boss rush')}`:''}</p>${duel?`<p class="duel">${duel[0]} · ${duel[1]}</p>`:''}
  <div class="stat"><div><b>${fmt(G.t)}</b><span>${L('存活','Survived')}</span></div><div><b>${G.kills}</b><span>${L('击杀','Kills')}</span></div><div><b>${G.lv}</b><span>${L('等级','Level')}</span></div><div><b>×${G.comboMax}</b><span>${L('最高连斩','Best streak')}</span></div><div><b>${G.bossSlain}</b><span>${L('首领','Bosses')}</span></div><div><b>${G.relics.length}</b><span>${L('法宝','Relics')}</span></div><div><b>${Math.round(G.dmgTaken)}</b><span>${L('承受伤害','Damage taken')}</span></div><div><b>${Math.round(G.healed||0)}</b><span>${L('治疗量','Healing')}</span></div><div><b class="gold">+${gold}</b><span>${L('金币','Gold')}</span></div></div>
  ${(!ok&&G.killer)?(()=>{const T=G.t,log=(G.dmgLog||[]).filter(d=>d.t>=T-5),tot=log.reduce((a,d)=>a+d.n,0)||1,by={};for(const d of log){const k=d.src[0]+'|'+d.src[1];by[k]=(by[k]||0)+d.n}const rows=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,n])=>{const [zh,en]=k.split('|');return `<span>${L(zh,en)} ${Math.round(n/tot*100)}%</span>`}).join('');return `<div class="killed"><b>${L('死于 '+G.killer[0],'Killed by '+G.killer[1])}</b><div class="srcs"><small>${L('最后 5 秒受到的伤害:','Damage in the last 5 s:')}</small>${rows}</div></div>`})():''}
  ${tierUp?`<div class="nextgoal tier"><b>${L('修罗','Ascension')}</b> ${L(`第 ${ASURA_T+1} 层已解锁:${ASURA[ASURA_T].zh}`,`Tier ${ASURA_T+1} unlocked: ${ASURA[ASURA_T].en}`)}</div>`:''}
  ${(()=>{const g=nextGoal();return g?`<div class="nextgoal"><b>${L('下一局试试','Next run, try')}</b> ${L(g[0],g[1])}</div>`:''})()}
  ${meta?`<div class="metarow"><span>🏆 ${meta.dT>=0?'+':''}${meta.dT} → <b>${meta.trophies}</b> ${L(ladderOf(meta.trophies)[1],ladderOf(meta.trophies)[2])}</span>${meta.firstBonus?`<span class="td">${L('每日首胜/首局:金币 ×2','First of the day: gold ×2')}</span>`:''}${meta.road.map(([n,zh,en])=>`<span class="td">🏆 ${n} · ${L(zh,en)}</span>`).join('')}${meta.masteryUp?`<span class="td">${L(`${CLASSES[G.cls].zh}熟练度 ${meta.mastery.lv}`,`${CLASSES[G.cls].en} mastery ${meta.mastery.lv}`)}</span>`:''}<span>${L('江湖经验','Renown')} +${meta.xp}${meta.levelUp?` · <b>${L('江湖等级','Rank')} ${meta.after.lv}!</b> ${L(titleFor(meta.after.lv)[1],titleFor(meta.after.lv)[2])}`:` · Lv ${meta.after.lv} (${meta.after.x}/${meta.after.need})`}</span>${meta.done.map(([t,g])=>`<span class="td">✓ ${t.id==='streak'?L('七日连续','7-day streak'):L(taskText(t).zh,taskText(t).en)} +${g} ${L('金','gold')}</span>`).join('')}</div>`:''}
  <div class="dmg">${rows}</div>${cmp}<div class="btns"><button class="go" id="againbtn">${L('再来一局','Play again')}</button><button class="go alt" id="buildbtn">${L('换个构筑','Change build')}</button><button class="go alt" id="lobbybtn">${L('回到山门','Lobby')}</button></div>`;
  $('#end').hidden=false;$('#againbtn').onclick=startRun;$('#lobbybtn').onclick=toLobby;$('#buildbtn').onclick=()=>{toLobby();setTimeout(()=>{const w=$('#weapons');if(w)w.scrollIntoView({behavior:'smooth',block:'center'})},50)};$('#againbtn').focus();
  if(typeof submitRun==='function')submitRun(box);
}
function toLobby(){$('#end').hidden=true;$('#hud').hidden=true;$('#title').hidden=false;newGame(true,SAVE.cls);demoBoost();renderTitle();SFX.setState('title')}
$('#startbtn').onclick=startRun;
$('#pausebtn').onclick=()=>{togglePause();$('#pausebtn').blur()};
$('#resumebtn').onclick=()=>togglePause();
$('#quitbtn').onclick=()=>{G.paused=false;$('#pause').hidden=true;G.abandoned=true;lose()};
AUTOCAST=SAVE.autocast===true;
function autoLabel(){const sb=$('#seals');if(sb)sb.classList.toggle('auto',AUTOCAST);$('#autobtn').textContent=AUTOCAST?L('武学:自动施放','Skills: auto-cast'):L('武学:手动施放','Skills: manual');$('#autonote').textContent=AUTOCAST?L('武学自动施放,按 1/2/3 也可手动。','Skills cast themselves; 1/2/3 still work.'):L('按 1/2/3 释放武学。','Press 1/2/3 to cast skills.')}
$('#autobtn').onclick=()=>{AUTOCAST=!AUTOCAST;SAVE.autocast=AUTOCAST;persist();autoLabel()};autoLabel();
function syncSound(){const m=SFX.muted;$('#mutebtn').textContent=m?L('声音:关','Sound: off'):L('声音:开','Sound: on');$('#sndbtn').textContent=m?'🔇':'🔊';$('#sndbtn').classList.toggle('off',m);$('#musicvol').value=Math.round(SFX.musicVol*100);$('#sfxvol').value=Math.round(SFX.sfxVol*100);$('#snd-mute').checked=m}
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



document.querySelectorAll('.langbtn').forEach(b=>{b.classList.toggle('on',b.dataset.l===LANG);b.onclick=()=>{setLang(b.dataset.l);document.querySelectorAll('.langbtn').forEach(x=>x.classList.toggle('on',x.dataset.l===LANG));renderTitle();autoLabel();syncSound();if(G&&!G.auto){drawSeals()}}});

/* lobby tabs: one panel at a time, remembered */
let lobbyTab=(()=>{try{return localStorage.getItem('sl_tab')||''}catch(_){return ''}})();
function showTab(t){lobbyTab=t;try{localStorage.setItem('sl_tab',t)}catch(_){}document.querySelectorAll('.tabbar button[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t));document.querySelectorAll('.lobby .panel').forEach(p=>p.classList.toggle('on',p.dataset.p===t))}
document.querySelectorAll('.tabbar button[data-t]').forEach(b=>b.onclick=()=>{showTab(lobbyTab===b.dataset.t?'':b.dataset.t);SFX.pick(1)});
showTab(lobbyTab);
function runSummaryX(){}
function runSummary(){const C=CLASSES[SAVE.cls]||CLASSES.swordsman;const tsel=(SAVE.mode==='solo'||SAVE.mode==='rush')?Math.min(SAVE.asura.sel||0,SAVE.asura.max||0):0;return `${LL(C)} · ${LL(SPELLS[weaponOf(SAVE.cls)])} · ${SAVE.mode==='pk'?L('对决','PK'):SAVE.mode==='daily'?L('每日','Daily'):SAVE.mode==='rush'?L('首领连战','Boss rush'):L('单人','Solo')} · ${LL(DIFF[SAVE.mode==='daily'?'normal':(SAVE.diff||'normal')])}${tsel?` · ${L('修罗','Asc.')} ${tsel}`:''} · ${LL(MAPS[MAPID])}`}
function renderStatus(){const sb=$('#stickystart');if(sb)sb.querySelector('small').textContent=runSummary();const rs=$('#runsummary');if(rs)rs.textContent=runSummary();
  document.querySelectorAll('#mode button,#diff button,#qual button,.langbtn,.tabbar button[data-t],.cls,.wp,.mapb').forEach(b=>b.setAttribute('aria-pressed',b.classList.contains('on')||b.classList.contains('sel')?'true':'false'));
  const el=$('#status');if(!el)return;const a=typeof accountLv==='function'?accountLv():{lv:1};const t=typeof titleFor==='function'?titleFor(a.lv):['','',''];el.textContent=`${typeof CLOUD!=='undefined'?CLOUD.label():''} · 🏆 ${SAVE.trophies||0} ${typeof ladderOf==='function'?L(ladderOf(SAVE.trophies||0)[1],ladderOf(SAVE.trophies||0)[2]):''} · Lv ${a.lv} ${L(t[1],t[2])} · ${SAVE.gold} ${L('金','gold')}`}

$('#stickybtn').onclick=startRun;

if(IS_TOUCH){const tg=document.querySelector('#title .tag');if(tg)tg.innerHTML=L('选一位侠客出山。拖动屏幕移动,普攻自动,点击底部图标释放武学与轻功。每四分钟一位首领,能撑多久?','Pick a hero. Drag to move; the normal attack is automatic; tap the seals to cast skills and dash. A boss every four minutes — how long can you last?')}

/* next-run goal: one concrete suggestion from this run's numbers, never generic cheer */
function nextGoal(){
  const tot=G.spells.reduce((a,s)=>a+s.dmg,0)||1,act=G.spells.filter(s=>!SPELLS[s.id].auto),actShare=act.reduce((a,s)=>a+s.dmg,0)/tot,casts=act.reduce((a,s)=>a+s.casts,0);
  const bossAlive=G.boss&&!G.boss.dead,bossPct=bossAlive?G.boss.hp/G.boss.maxHp:0,mins=G.t/60;
  if(G.abandoned)return null;
  if(bossAlive&&bossPct>.5&&G.bossSlain===0)return ['清怪没问题,但首领几乎没掉血:选一条集中单体的路线(飞剑穿透/刀光/天雷符),并在「破绽」窗口全力输出。','Clearing was fine but the boss barely lost HP: take a single-target line (pierce, blade arcs, talismans) and unload during the OPENING window.'];
  if(bossAlive&&G.dmgTaken>G.P.maxHp*4)return ['首领战吃伤太多:记住他的招式提示,红圈/波纹亮起就轻功,或带一张防御/治疗卡再进场。','You took too much in the boss fight: watch the attack hints, dash on red rings and ripples, or bring a defense/heal card first.'];
  if(actShare<.2&&casts<mins*4)return ['武学几乎没用上(伤害占比 '+Math.round(actShare*100)+'%):开自动施放,或在怪群最密时按 1/2/3。','Your skills barely fired ('+Math.round(actShare*100)+'% of damage): turn on auto-cast, or press 1/2/3 when the crowd is thickest.'];
  if((G.healed||0)>G.dmgTaken*.8&&G.kills<mins*120)return ['防守很稳,但清怪太慢:下次把两张卡投给伤害或范围,防守只留一张。','Defense held but kills were slow: next time spend two cards on damage or area and keep only one on defense.'];
  if(G.relics.length<=1&&mins>4)return ['几乎没捡法宝:跟着金色箭头去宝箱和铁甲统领,法宝是中期最大的跳变。','You found almost no relics: follow the gold arrows to chests and the Iron Warlord; relics are the biggest mid-run jump.'];
  if(G.comboMax<50&&mins>3)return ['连斩很少超过 ×50:别在空地等怪,主动贴着怪群边缘走,经验加成会滚起来。','Streaks rarely passed ×50: don\'t wait in open ground; skirt the edge of the crowd and the XP bonus snowballs.'];
  if(G.spells.length<4&&mins>6)return ['只有两三门武学:在 Lv 3/6/10 时优先选新武学,构筑才会成形。','Only two or three skills: take the new-skill cards at Lv 3/6/10 so a build can form.'];
  const w=weaponOf(G.cls),other=(WEAPONS[G.cls]||[]).find(k=>k!==w);
  if(other&&weaponUnlocked(G.cls,other))return [`换一把武器试试:${SPELLS[other].zh},打法完全不同。`,`Try the other weapon: ${SPELLS[other].en} plays very differently.`];
  return ['试试另一位侠客或提高难度:困难难度金币 +40%。','Try another hero or raise the difficulty: Hard pays +40% gold.'];
}
