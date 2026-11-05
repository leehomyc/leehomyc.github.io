'use strict';
/* ui.js — HUD, cards, title/class select, lobby upgrades, results, input */
const SAVE_KEY='spell-legion-save';
let SAVE={gold:0,up:{},cls:'swordsman',best:0,wins:0,runs:0,autocast:false};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s&&typeof s==='object')SAVE={...SAVE,...s}}catch(_){}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(SAVE))}catch(_){}}
const UPGRADES=[
  {id:'hp',zh:'体魄',en:'Vigor',d:'生命上限 +10% / 级',de:'+10% max HP per rank',max:5,cost:r=>80+r*70},
  {id:'dmg',zh:'锋芒',en:'Edge',d:'伤害 +6% / 级',de:'+6% damage per rank',max:5,cost:r=>100+r*90},
  {id:'qi',zh:'丹田',en:'Dantian',d:'内力回复 +12% / 级',de:'+12% qi regen per rank',max:5,cost:r=>90+r*80},
  {id:'core',zh:'复生核心',en:'Revive Core',d:'每局多一枚复生核心',de:'One more Revive Core per run',max:2,cost:r=>300+r*300},
  {id:'gold',zh:'财运',en:'Fortune',d:'金币获取 +15% / 级',de:'+15% gold per rank',max:5,cost:r=>120+r*100},
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
function hud(dt){
  hudT-=dt;if(hudT>0)return;hudT=.05;
  const P=G.P;
  $('#xp').style.width=(G.xp/G.need*100)+'%';
  $('#hpfill').style.height=(P.hp/P.maxHp*100)+'%';$('#hpnum').textContent=Math.ceil(P.hp)+' / '+P.maxHp;
  $('#mpfill').style.height=(P.mana/P.maxMana*100)+'%';$('#mpnum').textContent=Math.floor(P.mana)+' / '+P.maxMana;
  $('#lv').textContent='Lv '+G.lv;
  const pts=P.ap+P.sp;$('#charbtn').classList.toggle('has',pts>0);$('#ptsbadge').textContent=pts||'';$('#ptsbadge').hidden=!pts;
  $('#timer').textContent=G.t<BOSS_AT?fmt(BOSS_AT-G.t):fmt(G.t-BOSS_AT);
  $('#kills').textContent=G.kills+' 击杀';
  if(G.rival){const R=G.rival,tot=Math.max(1,G.kills+R.kills);$('#score').hidden=false;$('#s-you').textContent=G.kills;$('#s-riv').textContent=R.kills;$('#s-rname').textContent=R.name[0];$('#s-bar i').style.width=(G.kills/tot*100)+'%';$('#score').classList.toggle('lead',G.kills>=R.kills)}
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
function updateCores(){const e=$('#cores');e.textContent='';for(let i=0;i<Math.max(2,G.cores);i++){const s=document.createElement('i');s.className='core'+(i<G.cores?'':' off');e.appendChild(s);e.append(' ')}}
function drawSeals(){
  if(G.auto)return;
  const box=$('#seals');box.textContent='';
  for(let i=0;i<4;i++){const s=G.spells[i],d=document.createElement('button');d.className='seal'+(s?'':' empty');d.id='seal'+i;d.type='button';
    if(s){const m=SPELLS[s.id];
      const g=document.createElement('div');g.className='g';g.textContent=m.g;g.style.color=s.els[0]?ELS[s.els[0]].col:m.col;d.appendChild(g);
      const l=document.createElement('div');l.className='lv';l.textContent='Lv '+s.lv;d.appendChild(l);
      const key=document.createElement('div');key.className='key';key.textContent=m.auto?'自动':SPELL_KEYS[i];d.appendChild(key);
      if(!m.auto){const cst=document.createElement('div');cst.className='cost';cst.textContent=m.cost;d.appendChild(cst)}
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
let panelTab='attr';
function togglePanel(){if(!G||G.auto||G.over||G.pick)return;G.panel=!G.panel;$('#char').hidden=!G.panel;if(G.panel){renderPanel();SFX.setState('title')}else SFX.setState(G.boss?'boss':'battle')}
function renderPanel(){
  const P=G.P;$('#ap').textContent=P.ap;$('#sp').textContent=P.sp;
  $('#tab-attr').classList.toggle('on',panelTab==='attr');$('#tab-tree').classList.toggle('on',panelTab==='tree');
  const A=$('#attrs');A.hidden=panelTab!=='attr';const T=$('#trees');T.hidden=panelTab!=='tree';
  if(panelTab==='attr'){A.textContent='';
    ATTRS.forEach(a=>{const row=document.createElement('div');row.className='arow';row.innerHTML=`<div class="g">${a.zh}</div><div class="n">${a.en}<small>${a.d} · ${a.de}</small></div><b>${P.attr[a.id]}</b>`;
      const b=document.createElement('button');b.type='button';b.textContent='+';b.disabled=P.ap<=0;b.onclick=()=>{if(spendAttr(a.id)){SFX.pick(1);renderPanel()}};row.appendChild(b);A.appendChild(row)});
    const d=document.createElement('div');d.className='derived';
    d.innerHTML=`<span>生命 HP <b>${Math.ceil(P.hp)}/${P.maxHp}</b></span><span>内力 Qi <b>${Math.floor(P.mana)}/${P.maxMana}</b> (+${(P.regen).toFixed(1)}/s)</span><span>伤害 Damage <b>×${(P.dmg*(1+P.dmgBonus)).toFixed(2)}</b></span><span>暴击 Crit <b>${Math.round(P.crit*100)}%</b></span><span>移速 Speed <b>×${P.spd.toFixed(2)}</b></span><span>减伤 Mitigation <b>${Math.round((1-P.def)*100)}%</b></span>`;A.appendChild(d);
  }else{T.textContent='';
    G.spells.forEach((s,si)=>{const m=SPELLS[s.id],col=document.createElement('div');col.className='tree';col.style.setProperty('--c',m.col);
      col.innerHTML=`<div class="th"><span class="g">${m.g}</span><div><b>${m.zh}</b><small>${m.en} · Lv ${s.lv} · ${s.pts} 点</small></div></div>`;
      (TREES[s.id]||[]).forEach((n,i)=>{const r=s.nodes[i]||0,ok=canNode(s,i),need=n.tier===1?0:n.tier===2?2:4,locked=s.pts<need;
        const b=document.createElement('button');b.type='button';b.className='node t'+n.tier+(r>=n.max?' max':'')+(locked?' locked':'')+(r>0?' has':'');b.disabled=!ok;
        b.innerHTML=`<span class="nn">${n.zh} <small>${n.en}</small></span><span class="nd">${n.d}</span><span class="nr">${r}/${n.max}${locked?' · 需 '+need+' 点':''}</span>`;
        b.onclick=()=>{if(spendNode(s,i)){SFX.levelup();renderPanel()}};col.appendChild(b)});
      T.appendChild(col)});
  }
}
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
  const T={level:['升级','Level up'],infuse:['灌注真气','Infuse '+SPELLS[q.s?.id]?.en],fuse:['真气融合','Fuse '+SPELLS[q.s?.id]?.en],aug:['密令完成:选择强化','Mission complete. Choose an augmentation']}[q.kind];
  $('#cardtitle').innerHTML=`${T[0]}<small>${T[1]}${q.kind==='level'?' · +3 属性点 +1 技能点 (按 C 分配)':''}</small>`;
  const row=$('#cardrow');row.textContent='';
  cards.forEach((cd,i)=>{const b=document.createElement('button');b.className='card'+(cd.q?' '+cd.q.k:'');b.id='card'+i;b.style.setProperty('--c',cd.c);b.style.animationDelay=(i*.08)+'s';
    const parts=[['g',cd.g],['n',cd.n],['e',cd.e],['d',cd.d],['de',cd.de],['k','按 '+(i+1)+' · Press '+(i+1)]];
    if(cd.q&&cd.q.zh){const r=document.createElement('div');r.className='rar';r.textContent=cd.q.zh+' '+cd.q.en;b.appendChild(r)}
    parts.forEach(([k,v])=>{if(!v)return;const s=document.createElement('div');s.className=k;s.textContent=v;b.appendChild(s)});
    b.onclick=()=>choose(i);row.appendChild(b)});
  const rr=$('#reroll');rr.hidden=q.kind!=='level';rr.disabled=G.rerolls<=0;rr.textContent=`重抽 Reroll (${G.rerolls})`;rr.onclick=()=>{if(G.rerolls<=0)return;G.rerolls--;G.pick=null;G.picks.unshift(q);SFX.throw();openPick()};
  if(cards.some(c=>c.q&&c.q.k==='legendary'))SFX.chest();else if(cards.some(c=>c.q&&c.q.k==='epic'))SFX.levelup();
  $('#cards').hidden=false;
}
function choose(i){
  if(!G.pick||!G.pick[i])return;
  G.pick[i].a();G.pick=null;$('#cards').hidden=true;drawSeals();SFX.pick(1);openPick();
}
function closeCards(){G.picks=[];G.pick=null;$('#cards').hidden=true;G.panel=false;$('#char').hidden=true}

/* title: class select and lobby */
function renderTitle(){
  const row=$('#classes');row.textContent='';
  for(const k in CLASSES){const C=CLASSES[k],b=document.createElement('button');b.className='cls'+(SAVE.cls===k?' sel':'');b.type='button';b.style.setProperty('--c',C.col);
    b.innerHTML=`<div class="g">${C.g}</div><div class="n">${C.zh} <small>${C.en}</small></div><div class="d">${C.d}</div><div class="de">${C.de}</div><div class="sk">${[C.main,...C.skills].map(id=>`<span style="color:${SPELLS[id].col}">${SPELLS[id].g}</span>`).join('')}</div>`;
    b.onclick=()=>{SAVE.cls=k;CLASS=k;persist();renderTitle();if(G&&G.auto){newGame(true,k);demoBoost()}SFX.pick(1)};row.appendChild(b)}
  $('#gold').textContent=SAVE.gold;
  const shop=$('#shop');shop.textContent='';
  UPGRADES.forEach(u=>{const r=SAVE.up[u.id]||0,cost=u.cost(r),b=document.createElement('button');b.className='up';b.type='button';b.disabled=r>=u.max||SAVE.gold<cost;
    b.innerHTML=`<b>${u.zh} <small>${u.en}</small></b><span class="rk">${'●'.repeat(r)}${'○'.repeat(u.max-r)}</span><span class="dd">${u.d}</span><span class="pr">${r>=u.max?'已满 Max':cost+' 金'}</span>`;
    b.onclick=()=>{if(SAVE.gold>=cost&&r<u.max){SAVE.gold-=cost;SAVE.up[u.id]=r+1;persist();renderTitle();SFX.complete()}};shop.appendChild(b)});
  $('#record').textContent=SAVE.runs?`${SAVE.runs} 局 · ${SAVE.wins} 胜 · 最佳 ${fmt(SAVE.best)}`:'';
}
function startRun(){
  if($('#startbtn').disabled)return;
  CLASS=SAVE.cls;
  $('#title').hidden=true;$('#end').hidden=true;$('#cards').hidden=true;$('#hud').hidden=false;$('#bossbar').hidden=true;$('#pause').hidden=true;$('#char').hidden=true;
  $('#banner').classList.remove('on');$('#pausebtn').textContent='II';
  newGame(false,CLASS);applyUpgrades(G.P);updateCores();drawSeals();
  showBanner(CLASSES[CLASS].zh+' 出山',AUTOCAST?'Keep moving. Skills cast themselves; Space dashes.':'Keep moving. 1/2/3 cast skills, Space dashes.',2.6);
  SFX.start();SFX.setState('battle');
}
function showEnd(ok){
  G.ended=true;const box=$('#endb'),tot=G.spells.reduce((a,s)=>a+s.dmg,0)||1,max=Math.max(...G.spells.map(s=>s.dmg),1);
  const gold=Math.round((G.kills*1.1+G.lv*6+(ok?250:0)+Math.floor(G.t/10)*3+G.goldRun+G.comboMax*2)*(1+.15*(SAVE.up.gold||0)));
  SAVE.gold+=gold;SAVE.runs++;if(ok){SAVE.wins++;if(!SAVE.best||G.t<SAVE.best)SAVE.best=G.t}persist();
  const rows=G.spells.slice().sort((a,b)=>b.dmg-a.dmg).map(s=>{const f=s.els.length===2?FUS[fusion(s)][1]:s.els[0]?ELS[s.els[0]].en:'';
    return `<span>${SPELLS[s.id].zh} ${SPELLS[s.id].en}${f?` · ${f}`:''} · Lv ${s.lv}</span><div class="bar"><i style="width:${s.dmg/max*100}%"></i></div><span>${Math.round(s.dmg/tot*100)}%</span>`}).join('');
  const R=G.rival,duel=R?(G.kills>R.kills?['击杀领先','You out-killed your rival']:G.kills<R.kills?['击杀落后','Your rival out-killed you']:['平手','Tied on kills']):null;
  const cmp=R?`<div class="cmp"><div class="hd"><span></span><b>你 You</b><b>${R.name[0]}<small> ${CLASSES[R.cls].en}</small></b></div>
    ${[['击杀 Kills',G.kills,R.kills],['等级 Level',G.lv,R.lv],['总伤害 Damage',Math.round(tot),Math.round(R.dmgDealt)],['倒地 Downs',2-G.cores+(SAVE.up.core||0),R.downs]].map(([n,a,b])=>`<div class="r"><span>${n}</span><b class="${a>=b?'w':''}">${a}</b><b class="${b>a?'w':''}">${b}</b></div>`).join('')}</div>`:'';
  box.innerHTML=`<h2>${ok?'凯旋':'败亡'}</h2>${duel?`<p class="duel">${duel[0]} · ${duel[1]}</p>`:''}<p class="sub">${ok?'Victory: the Blood Demon Patriarch is dead.':'Defeat: you ran out of Revive Cores.'}</p>
  <div class="stat"><div><b>${fmt(G.t)}</b><span>存活 Survived</span></div><div><b>${G.kills}</b><span>击杀 Kills</span></div><div><b>${G.lv}</b><span>等级 Level</span></div><div><b>×${G.comboMax}</b><span>最高连斩 Best combo</span></div><div><b class="gold">+${gold}</b><span>金币 Gold</span></div></div>
  <div class="dmg">${rows}</div>${cmp}<div class="btns"><button class="go" id="againbtn">再来一局 Play again</button><button class="go alt" id="lobbybtn">回到山门 Lobby</button></div>`;
  $('#end').hidden=false;$('#againbtn').onclick=startRun;$('#lobbybtn').onclick=toLobby;$('#againbtn').focus();
}
function toLobby(){$('#end').hidden=true;$('#hud').hidden=true;$('#title').hidden=false;newGame(true,SAVE.cls);demoBoost();renderTitle();SFX.setState('title')}
$('#startbtn').onclick=startRun;
$('#pausebtn').onclick=()=>{togglePause();$('#pausebtn').blur()};
$('#resumebtn').onclick=()=>togglePause();
$('#quitbtn').onclick=()=>{G.paused=false;$('#pause').hidden=true;lose()};
AUTOCAST=SAVE.autocast===true;
function autoLabel(){$('#autobtn').textContent=AUTOCAST?'武学:自动施放 Skills: auto':'武学:手动 Skills: manual';$('#autonote').textContent=AUTOCAST?'武学自动施放,按 1/2/3 也可手动。':'按 1/2/3 释放武学。'}
$('#autobtn').onclick=()=>{AUTOCAST=!AUTOCAST;SAVE.autocast=AUTOCAST;persist();autoLabel()};autoLabel();
function syncSound(){const m=SFX.muted;$('#mutebtn').textContent=m?'声音:关 Sound off':'声音:开 Sound on';$('#sndbtn').textContent=m?'🔇':'🔊';$('#sndbtn').classList.toggle('off',m);$('#musicvol').value=Math.round(SFX.musicVol*100);$('#sfxvol').value=Math.round(SFX.sfxVol*100);$('#snd-mute').checked=m}
$('#mutebtn').onclick=()=>{SFX.toggleMute();syncSound()};
$('#sndbtn').onclick=()=>{SFX.start();const p=$('#sndpanel');p.hidden=!p.hidden;syncSound();$('#sndbtn').blur()};
$('#snd-mute').onchange=e=>{SFX.setMute(e.target.checked);syncSound()};
$('#musicvol').oninput=e=>{SFX.start();SFX.setMusic(e.target.value/100);if(SFX.muted){SFX.setMute(false);syncSound()}};
$('#sfxvol').oninput=e=>{SFX.start();SFX.setSfx(e.target.value/100);SFX.pick(1);if(SFX.muted){SFX.setMute(false);syncSound()}};
$('#sndclose').onclick=()=>{$('#sndpanel').hidden=true};
syncSound();
if(window.desktop){$('#exitbtn').hidden=false;$('#exitbtn').onclick=()=>window.desktop.quit()}
