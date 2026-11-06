'use strict';
/* lobby.js — menu-first front end: main menu → hero select (3D preview, weapon, skills, stats) → start. */
const ROLES={swordsman:['远程 · 均衡','Ranged · Balanced'],taoist:['法术 · 符咒','Caster · Talismans'],blademaster:['近战 · 重击','Melee · Bruiser'],qin:['控场 · 减速','Control · Slows'],monk:['近战 · 坚韧','Melee · Tank'],physician:['远程 · 毒伤','Ranged · Poison']};
const MENU_MODES=[
  {m:'solo',ic:['sword','#ffb79f'],zh:'出山',en:'Play',szh:()=>`单人无尽 · ${LL(DIFF[SAVE.diff||'normal'])}${(SAVE.asura&&SAVE.asura.sel)?` · 修罗 ${SAVE.asura.sel}`:''}`,sen:()=>`Solo endless · ${LL(DIFF[SAVE.diff||'normal'])}${(SAVE.asura&&SAVE.asura.sel)?` · Ascension ${SAVE.asura.sel}`:''}`,big:1},
  {m:'qpk',ic:['swords','#ff9c5a'],zh:'快速对决',en:'Quick PK',szh:()=>`3 分钟 · ${L(ladderOf(SAVE.trophies||0)[1],'')} ${SAVE.trophies||0} 🏆`,sen:()=>`3 minutes · ${ladderOf(SAVE.trophies||0)[2]} ${SAVE.trophies||0} 🏆`},
  {m:'daily',ic:['calendar','#ffd27a'],zh:'每日挑战',en:'Daily',szh:()=>(SAVE.daily&&SAVE.daily.day===dayKey())?`今日最佳 ${fmt(SAVE.daily.best)} · ${resetIn()} 后刷新`:`今日同一张图、同一波怪 · ${resetIn()} 后刷新`,sen:()=>(SAVE.daily&&SAVE.daily.day===dayKey())?`Today's best ${fmt(SAVE.daily.best)} · resets in ${resetIn()}`:`Same map, same waves for everyone · resets in ${resetIn()}`},
  {m:'rush',ic:['boss','#ff5a45'],zh:'首领连战',en:'Boss rush',szh:()=>'从 Lv 10 起 · 每 75 秒一位首领',sen:()=>'Start at Lv 10 · a boss every 75 s'},
  {m:'pk',ic:['trophy','#ffd27a'],zh:'对决 10′',en:'PK 10′',szh:()=>SAVE.pk?`对决 ${SAVE.pk.w} 胜 ${SAVE.pk.l} 负`:'与 AI 对手争分十分钟',sen:()=>SAVE.pk?`PK ${SAVE.pk.w}W ${SAVE.pk.l}L`:'A ten-minute score race against an AI rival'},
];
let SCREEN='menu',HSKILL=null;
function showScreen(s){
  SCREEN=s;const m=$('#menu'),h=$('#hero');if(!m||!h)return;m.hidden=s!=='menu';h.hidden=s!=='hero';$('#title').classList.toggle('heroview',s==='hero');
  try{sessionStorage.setItem('sl_screen',s)}catch(_){}
  if(s==='hero'){renderHero();const cv=$('#pv');if(cv&&typeof previewInit==='function'&&typeof THREE!=='undefined'){try{previewInit(cv);previewSet(SAVE.cls,weaponOf(SAVE.cls))}catch(e){console.warn('preview',e)}}}
  if(typeof renderStatus==='function')renderStatus();
}
function renderMenu(){
  const box=$('#menubtns');if(!box)return;box.textContent='';
  MENU_MODES.forEach(o=>{const b=document.createElement('button');b.type='button';b.className='mb'+(o.big?' big':'');b.dataset.m=o.m;
    b.innerHTML=`${ICON.misc(o.ic[0],o.ic[1])}<div><b>${L(o.zh,o.en)}</b><small>${L(o.szh(),o.sen())}</small></div>`;
    b.onclick=()=>{SAVE.mode=o.m;persist();renderTitle();showScreen('hero');SFX.pick(1)};box.appendChild(b)});
}
function statBars(C){
  const all=Object.values(CLASSES);const mx=k=>Math.max(...all.map(c=>c[k]));
  const rows=[['hp',L('生命','HP'),C.hp,mx('hp'),'#ff6a6a'],['mana',L('内力','Qi'),C.mana,mx('mana'),'#6fd3e8'],['dmg',L('伤害','Damage'),C.dmg,mx('dmg'),'#ffb04a'],['spd',L('移速','Speed'),C.spd,mx('spd'),'#7dffb0'],['regen',L('回气','Qi regen'),C.regen,mx('regen'),'#c7a4f0']];
  return rows.map(([k,n,v,m,c])=>`<div class="sb"><span>${n}</span><i style="--w:${Math.round(v/m*100)}%;--c:${c}"></i><b>${k==='dmg'||k==='spd'?'×'+v.toFixed(2):v}</b></div>`).join('');
}
function skillDetail(id){
  const m=SPELLS[id];if(!m)return '';const tree=TREES[id]||[],cat=CATS[SKILL_CAT[id]]||CATS.passive;
  const meta=m.auto?L('普攻 · 自动','Normal attack · automatic'):L(`${m.cost} 内力 · 冷却 ${m.cd}s${m.dur?` · 持续 ${m.dur}s`:''}`,`${m.cost} qi · ${m.cd}s cooldown${m.dur?` · ${m.dur}s`:''}`);
  const info=WEAPON_INFO[id];
  return `<div class="sdh">${ICON.spell(id)}<div><b>${LL(m)} <span class="catd" style="--cc:${cat[2]}">${L(cat[0],cat[1])}</span></b><small>${meta}</small></div></div><p>${L(m.d,m.de)}</p>${info&&info.awake?`<p class="aw">${ICON.misc('awake','#ffd27a','sm')} <b>${L('觉醒 Lv '+AWAKE_LV,'Awakening at Lv '+AWAKE_LV)}</b> ${L(info.awake[0],info.awake[1])}</p>`:''}${tree.length?`<div class="tree">${tree.map(n=>`<span class="tn" title="${L(n.d,n.de)}">${ICON.node(n.fx,m.col,'sm')}<em>${L(n.zh,n.en)}</em><small>${L(n.d,n.de)}</small></span>`).join('')}</div>`:''}`;
}
function renderHero(){
  const C=CLASSES[SAVE.cls]||CLASSES.swordsman,cls=SAVE.cls;
  const hn=$('#hname');if(!hn)return;hn.textContent=LL(C);$('#hglyph').textContent=C.g;$('#hglyph').style.color=C.col;$('#hrole').textContent=L(ROLES[cls][0],ROLES[cls][1]);$('#hdesc').textContent=L(C.d,C.de);
  const w=weaponOf(cls),ids=[w,...C.skills];if(!HSKILL||!ids.includes(HSKILL))HSKILL=w;
  const sk=$('#hskills');sk.textContent='';ids.forEach((id,i)=>{const m=SPELLS[id],b=document.createElement('button');b.type='button';b.className='hs'+(id===HSKILL?' on':'');b.style.setProperty('--c',m.col);
    b.innerHTML=`${ICON.spell(id)}<span class="g">${m.g}</span><small>${i===0?L('普攻','Main'):i===4?L('终式','Ultimate'):SPELL_KEYS[i]}</small><b>${LL(m)}</b>`;b.title=LL(m);
    b.onclick=()=>{HSKILL=id;renderHero();SFX.pick(1)};sk.appendChild(b)});
  $('#skilldetail').innerHTML=skillDetail(HSKILL);
  $('#hstats').innerHTML=statBars(C);
  if(typeof previewSet==='function'&&typeof PV!=='undefined'&&PV)try{previewSet(cls,w)}catch(_){}
}
$('#backbtn').onclick=()=>{showScreen('menu');SFX.pick(1)};
(()=>{let s='menu';try{s=sessionStorage.getItem('sl_screen')||'menu'}catch(_){}showScreen(s==='hero'?'hero':'menu')})();
if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone)document.documentElement.classList.add('ios');
/* emblems on tab and mode buttons (data-ic) */
document.querySelectorAll('[data-ic]').forEach(b=>{if(b.querySelector('.ic'))return;const col={scroll:'#efe4cd',trophy:'#ffd27a',book:'#c7a4f0',crown:'#ffe9a0',gear:'#9fe3f0',sword:'#ffb79f',swords:'#ff9c5a',calendar:'#ffd27a',boss:'#ff5a45'}[b.dataset.ic]||'#ffd27a';b.insertAdjacentHTML('afterbegin',ICON.misc(b.dataset.ic,col,'sm'))});
