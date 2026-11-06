'use strict';
/* lobby.js — menu-first front end: main menu → hero select (3D preview, weapon, skills, stats) → start. */
const ROLES={swordsman:['远程 · 均衡','Ranged · Balanced'],taoist:['法术 · 符咒','Caster · Talismans'],blademaster:['近战 · 重击','Melee · Bruiser'],qin:['控场 · 减速','Control · Slows'],monk:['近战 · 坚韧','Melee · Tank'],physician:['远程 · 毒伤','Ranged · Poison']};
const MENU_MODES=[
  {m:'solo',ic:['sword','#ffb79f'],zh:'出山',en:'Play',szh:()=>`单人无尽 · ${LL(DIFF[SAVE.diff||'normal'])}${(SAVE.asura&&SAVE.asura.sel)?` · 修罗 ${SAVE.asura.sel}`:''}`,sen:()=>`Solo endless · ${LL(DIFF[SAVE.diff||'normal'])}${(SAVE.asura&&SAVE.asura.sel)?` · Ascension ${SAVE.asura.sel}`:''}`,big:1},
  {m:'qpk',ic:['swords','#ff9c5a'],zh:'对决',en:'Duel',szh:()=>`3 分钟 · 打 AI 或好友`,sen:()=>`3 minutes · AI or friends`},
  {m:'daily',ic:['calendar','#ffd27a'],zh:'每日挑战',en:'Daily',szh:()=>(SAVE.daily&&SAVE.daily.day===dayKey())?`今日最佳 ${fmt(SAVE.daily.best)}`:`每天一张新图,全服比排名`,sen:()=>(SAVE.daily&&SAVE.daily.day===dayKey())?`Today's best ${fmt(SAVE.daily.best)}`:`A new map every day, ranked`},
];
/* retired entries (kept playable through SAVE.mode for old links, not offered): 'pk' ten-minute AI race, 'rush' boss rush */
let SCREEN='menu',HSKILL=null;
function showScreen(s){
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
    const go=m=>{if(m!=='room'&&typeof ROOM!=='undefined'&&ROOM.code)roomLeave(true);SAVE.mode=m;persist();renderTitle();showScreen('hero');SFX.pick(1)};
    b.onclick=ev=>{const sub=ev.target.closest&&ev.target.closest('.subs i');go(sub?sub.dataset.m:(o.m==='qpk'?'room':o.m))};
    b.querySelectorAll('.subs i').forEach(i=>i.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();ev.stopPropagation();go(i.dataset.m)}});if(o.big)box.appendChild(b);else row.appendChild(b)});box.appendChild(row);
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
  return `<div class="sdh">${ICON.spell(id)}<div><b>${LL(m)} <span class="catd" style="--cc:${cat[2]}">${L(cat[0],cat[1])}</span></b><small>${meta}</small></div></div><p>${L(m.d,m.de)}</p>${info&&info.awake?`<p class="aw">${ICON.misc('awake','#ffd27a','sm')} <b>${L('觉醒 Lv '+AWAKE_LV,'Awakening at Lv '+AWAKE_LV)}</b> ${L(info.awake[0],info.awake[1])}</p>`:''}${tree.some(isTrait)?`<div class="tree compact"><small class="tl">${L('特性','Traits')}</small>${tree.filter(isTrait).map(n=>`<span class="tn" title="${L(n.d,n.de)}">${ICON.node(n.fx,m.col,'sm')}<em>${L(n.zh,n.en)}</em><small>${L(n.d,n.de)}</small></span>`).join('')}</div>`:''}`;
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
