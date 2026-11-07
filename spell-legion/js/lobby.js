'use strict';
/* lobby.js — menu-first front end: main menu → hero select (3D preview, weapon, skills, stats) → start. */
const ROLES={swordsman:['远程 · 均衡','Ranged · Balanced'],taoist:['法术 · 符咒','Caster · Talismans'],blademaster:['近战 · 重击','Melee · Bruiser'],qin:['控场 · 减速','Control · Slows'],monk:['近战 · 坚韧','Melee · Tank'],physician:['远程 · 毒伤','Ranged · Poison'],oni:['近战 · 爆发','Melee · Burst'],idol:['远程 · 魅惑','Ranged · Charm'],wizard:['法术 · 奥术','Caster · Arcane']};
const MENU_MODES=[
  {m:'solo',ic:['sword','#ffb79f'],zh:'出山',en:'Play',szh:()=>`单人无尽${(SAVE.asura&&SAVE.asura.sel)?` · 修罗 ${SAVE.asura.sel} 层`:''}`,sen:()=>`Solo endless${(SAVE.asura&&SAVE.asura.sel)?` · Ascension ${SAVE.asura.sel}`:''}`,big:1},
  {m:'qpk',ic:['swords','#ff9c5a'],zh:'对决',en:'Duel',szh:()=>`AI 或好友`,sen:()=>`AI or friends`},
];
/* retired entries (kept playable through SAVE.mode for old links, not offered): 'pk' ten-minute AI race, 'rush' boss rush */
let SCREEN='menu',HSKILL=null;
function showScreen(s){
  if(s==='hero'&&typeof syncAscensionMap==='function'&&syncAscensionMap())return;
  SCREEN=s;const m=$('#menu'),h=$('#hero');if(!m||!h)return;m.hidden=s!=='menu';h.hidden=s!=='hero';$('#title').classList.toggle('heroview',s==='hero');
  try{sessionStorage.setItem('sl_screen',s)}catch(_){}
  if(s==='hero'){renderHero();const cv=$('#pv');if(cv&&typeof previewInit==='function'&&typeof THREE!=='undefined'){try{previewInit(cv);previewSet(SAVE.cls,weaponOf(SAVE.cls))}catch(e){console.warn('preview',e)}}}
  if(typeof renderStatus==='function')renderStatus();
}
function renderMenu(){
  if(typeof renderProg==='function')try{renderProg()}catch(e){console.warn('prog',e)}
  const box=$('#menubtns');if(!box)return;box.textContent='';
  const row=document.createElement('div');row.className='mrow';
  MENU_MODES.forEach(o=>{const b=document.createElement('button');b.type='button';b.className='mb'+(o.big?' big':'');b.dataset.m=o.m;
    if(o.big){ // the main card: your hero, your tier, and today's next goal — the reason to press it
      const C=CLASSES[SAVE.cls]||CLASSES.swordsman,A=SAVE.asura||{},tier=Math.min(A.sel||0,A.max||0);const tasks=typeof todayTasks==='function'?todayTasks():[];const nt=tasks.find(t=>!t.done);const tt=nt&&typeof taskText==='function'?taskText(nt):null;const TGOLD=typeof TASK_GOLD!=='undefined'?TASK_GOLD:[150,220,320];
      b.innerHTML=`${ICON.cls(SAVE.cls)}<div><b>${L(o.zh,o.en)}</b><small>${LL(C)}${tier?` · ${L(`修罗 ${tier} 层`,`Tier ${tier}`)}`:''}</small>${tt?`<span class="goal"><em>${L('今日','Today')}</em><span class="gt">${L(tt.zh,tt.en)}</span><b>+${TGOLD[nt.tier]||150}</b><i><u style="width:${Math.min(100,Math.round(100*(nt.p||0)/nt.goal))}%"></u></i></span>`:''}</div>`}
    else b.innerHTML=`${ICON.misc(o.ic[0],o.ic[1])}<div><b>${L(o.zh,o.en)}</b><small>${L(o.szh(),o.sen())}</small>${o.subs?`<span class="subs">${o.subs.map(s=>`<i data-m="${s.m}" role="button" tabindex="0">${L(s.zh,s.en)}</i>`).join('')}</span>`:''}</div>`;
    if(o.m==='qpk'){
      const rank=roadBits();
      b.classList.add('duel-card');
      b.insertAdjacentHTML('beforeend',`<span class="duel-rank" style="--rank-color:${rank.lcol}">${ICON.misc('trophy',rank.lcol,'sm')}<span>${L(rank.lad[1],rank.lad[2])}</span><strong>${rank.tr}</strong></span>`);
    }
    const go=m=>{if(m!=='room'&&typeof ROOM!=='undefined'&&ROOM.code)roomLeave(true);SAVE.mode=m;persist();renderTitle();showScreen('hero');SFX.pick(1)};
    b.onclick=ev=>{const sub=ev.target.closest&&ev.target.closest('.subs i');const m=sub?sub.dataset.m:(o.m==='qpk'?'room':o.m);if(b.dataset.busy)return;b.dataset.busy=1;setTimeout(()=>{delete b.dataset.busy;go(m)},reduceMotion()?0:170)};
    b.querySelectorAll('.subs i').forEach(i=>i.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();ev.stopPropagation();go(i.dataset.m)}});if(o.big)box.appendChild(b);else row.appendChild(b)});box.appendChild(row);
}
function statBars(C){
  const all=Object.values(CLASSES);const mx=k=>Math.max(...all.map(c=>c[k]));
  const rows=[['hp',L('生命','HP'),C.hp,mx('hp'),'#ff6a6a'],['mana',L('内力','Qi'),C.mana,mx('mana'),'#6fd3e8'],['dmg',L('伤害','Damage'),C.dmg,mx('dmg'),'#ffb04a'],['spd',L('移速','Speed'),C.spd,mx('spd'),'#7dffb0'],['regen',L('回气','Qi regen'),C.regen,mx('regen'),'#c7a4f0']];
  return rows.map(([k,n,v,m,c])=>`<div class="sb" title="${n} ${k==='dmg'||k==='spd'?'×'+v.toFixed(2):v}"><span>${n}</span><i style="--w:${Math.round(v/m*100)}%;--c:${c}"></i><b>${k==='dmg'||k==='spd'?'×'+v.toFixed(2):v}</b></div>`).join('');
}
/* Two different things, shown two different ways:
   武器 — chosen here, before the run: big selectable cards, the selected one explains its normal attack below.
   武学 — never chosen here: the first skill comes with the hero, the rest arrive as level-up cards in the run.
   They are shown as a quiet row of seals (no selection frame), tap one to peek at it. */
function weaponDetail(w){
  const m=SPELLS[w],info=WEAPON_INFO[w]||{};if(!m)return '';
  return `<p><span class="wtag">${L('普攻 · 自动','Auto attack')}</span>${L(m.d,m.de).replace(/^(普攻[:：]|Normal attack\.\s*)/,'')}</p>`;
}
function skillDetail(id,start){
  const m=SPELLS[id];if(!m)return '';const cat=CATS[SKILL_CAT[id]]||CATS.passive;
  return `<div class="sdh">${ICON.spell(id)}<div><b>${LL(m)} <span class="catd" style="--cc:${cat[2]}">${L(cat[0],cat[1])}</span></b><small>${L(`${Math.round(m.cost*1.25)} 内力 · 冷却 ${m.cd}s`,`${Math.round(m.cost*1.25)} qi · ${m.cd}s cooldown`)}</small></div></div><p>${L(m.d,m.de)}</p>`;
}
function renderHero(){
  const C=CLASSES[SAVE.cls]||CLASSES.swordsman,cls=SAVE.cls;
  const hn=$('#hname');if(!hn)return;hn.textContent=LL(C);$('#hglyph').textContent=C.g;$('#hglyph').style.color=C.col;$('#hrole').textContent=L(ROLES[cls][0],ROLES[cls][1]);$('#hdesc').textContent=L(C.d,C.de);
  const w=weaponOf(cls);if(HSKILL&&!C.skills.includes(HSKILL))HSKILL=null;
  const wd=$('#wdetail');if(wd){wd.innerHTML=weaponDetail(w);const aw=(WEAPON_INFO[w]||{}).awake;wd.title=aw?L(`Lv ${AWAKE_LV} 觉醒:${aw[0]}`,`Lv ${AWAKE_LV} awakening: ${aw[1]}`):'';wd.style.setProperty('--c',SPELLS[w].col)}
  const sk=$('#hskills');sk.textContent='';C.skills.forEach((id,i)=>{const m=SPELLS[id],b=document.createElement('button');b.type='button';b.className='ks'+(i===0?' start':'')+(id===HSKILL?' on':'');b.style.setProperty('--c',m.col);
    b.innerHTML=`<span class="ring">${ICON.spell(id)}${i===0?`<em>${L('开局','Start')}</em>`:'<em class="up">↑</em>'}</span><b>${LL(m)}</b>`;b.title=LL(m);
    b.onclick=()=>{HSKILL=HSKILL===id?null:id;renderHero();SFX.pick(1)};sk.appendChild(b)});
  const sd=$('#skilldetail');sd.hidden=!HSKILL;sd.innerHTML=HSKILL?skillDetail(HSKILL,HSKILL===C.skills[0]):'';if(HSKILL)sd.style.setProperty('--c',SPELLS[HSKILL].col);
  $('#hstats').innerHTML=statBars(C);
  if(typeof previewSet==='function'&&typeof PV!=='undefined'&&PV)try{previewSet(cls,w)}catch(_){}
}
$('#backbtn').onclick=()=>{showScreen('menu');SFX.pick(1)};
(()=>{let s='menu';try{s=sessionStorage.getItem('sl_screen')||'menu'}catch(_){}showScreen(s==='hero'?'hero':'menu')})();
if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone)document.documentElement.classList.add('ios');
/* emblems on tab and mode buttons (data-ic) */
document.querySelectorAll('[data-ic]').forEach(b=>{if(b.querySelector('.ic'))return;const col={scroll:'#efe4cd',trophy:'#ffd27a',book:'#c7a4f0',crown:'#ffe9a0',gear:'#9fe3f0',sword:'#ffb79f',swords:'#ff9c5a',calendar:'#ffd27a',boss:'#ff5a45'}[b.dataset.ic]||'#ffd27a';b.insertAdjacentHTML('afterbegin',ICON.misc(b.dataset.ic,col,'sm'))});

/* tap feedback on the menu: a ring of light and a spray of embers from where you pressed */
function reduceMotion(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function menuBurst(el,ev){if(reduceMotion())return;const r=el.getBoundingClientRect(),x=(ev.clientX||r.left+r.width/2)-r.left,y=(ev.clientY||r.top+r.height/2)-r.top;
  const rip=document.createElement('span');rip.className='rip';rip.style.left=x+'px';rip.style.top=y+'px';el.appendChild(rip);setTimeout(()=>rip.remove(),650);
  for(let i=0;i<12;i++){const s=document.createElement('span');s.className='ember';const a=Math.random()*Math.PI*2,d=26+Math.random()*60;s.style.left=x+'px';s.style.top=y+'px';s.style.setProperty('--dx',(Math.cos(a)*d).toFixed(1)+'px');s.style.setProperty('--dy',(Math.sin(a)*d-24).toFixed(1)+'px');s.style.animationDelay=(Math.random()*.08).toFixed(2)+'s';el.appendChild(s);setTimeout(()=>s.remove(),800)}}
document.addEventListener('pointerdown',e=>{const el=e.target.closest&&e.target.closest('#menu .mb,#menu .tabbar button,#prog .pr,#prog .avb');if(el)menuBurst(el.classList.contains('avb')?el.closest('.pr'):el,e)},true);
