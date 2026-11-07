'use strict';
/* ui.js — HUD, cards, title/class select, lobby upgrades, results, input */
const SAVE_KEY='spell-legion-save';
let SAVE={gold:0,up:{},cls:'swordsman',best:0,wins:0,runs:0,rival:false,bosses:0,played:false,ach:{},diff:'normal',clsWins:{}};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s&&typeof s==='object')SAVE={...SAVE,...s}}catch(_){}
SAVE.ach=SAVE.ach||{};SAVE.clsWins=SAVE.clsWins||{};SAVE.clsBest=SAVE.clsBest||{};if(!CLASSES[SAVE.cls])SAVE.cls='swordsman';SAVE.weapon=SAVE.weapon||{};SAVE.weaponOwned=SAVE.weaponOwned||{};SAVE.tips=SAVE.tips||{};SAVE.asura=SAVE.asura||{max:0,sel:0,best:0};window.SAVE=SAVE;
/* a save written by an older build (or synced from another device) may name a retired mode, class or difficulty; fold it back onto what the menu offers */
function normalizeSave(){delete SAVE.autocast;const MODES=['solo','room','daily','qpk','pk','rush'];if(!MODES.includes(SAVE.mode))SAVE.mode='solo';if(typeof CLASSES!=='undefined'&&!CLASSES[SAVE.cls])SAVE.cls='swordsman';if(typeof DIFF!=='undefined'&&!DIFF[SAVE.diff])SAVE.diff='normal';if(SAVE.asura&&typeof ASURA!=='undefined'){SAVE.asura.max=Math.min(SAVE.asura.max||0,ASURA.length);SAVE.asura.sel=Math.min(SAVE.asura.sel||0,SAVE.asura.max)}if(typeof migrateProgression==='function')migrateProgression();if(typeof gearMigrateLegends==='function')gearMigrateLegends()}
normalizeSave();
/* a random anime-style name and avatar so nobody starts as "Nameless"; tap either to change; both travel with the save (so with the account) */
const NAME_ZA=['星','月','夜','雪','樱','风','雷','炎','霜','影','绯','苍','白','黑','紫','空','雾','焰','光','桃'],NAME_ZM=['野','宫','原','见','乃','川','森','濑','花','咲'],NAME_ZB=['凛','葵','斗','羽','音','叶','真','琉','翔','奈','空','零','七','瞳','岚','由','希','遥','千','夏'],NAME_ZS=['酱','君','丸','姬','之刃','猫','狐','兔','喵','大人'];
const NAME_E1=['Kira','Ren','Yuki','Sora','Hikari','Aoi','Rin','Kaito','Mika','Haru','Nova','Zero','Luna','Kuro','Shiro','Akane','Raiden','Momo','Kaze','Nyx','Hana','Tora','Suzu','Riku'],NAME_E2=['-chan','-kun','','',' Blade',' Fox',' Star',' Spark',' Moon',' Storm'];
const NAME_J1=['星野','月野','白川','黒川','桜井','風間','雪村','森川'],NAME_J2=['リン','アオイ','カイト','ソラ','ハル','ミカ','レン','ユキ'];
const tr2=s=>{const Z=I18N.D.zt;return Z?toTrad(s):s};
const NAME_K1=['하늘','별','달','바람','서리','눈꽃','번개','불꽃','이슬','노을','그림자','새벽','청','백','흑','홍'],NAME_K2=['검','령','비','연','후','결','율','린','온','솔','휘','담','현','설'],NAME_K3=['','','','','님','이','공자','소저'];
function randomName(){const r=a=>a[Math.floor(Math.random()*a.length)];if(LOC==='ja')return r(NAME_J1)+r(NAME_J2);if(LOC==='ko')return (r(NAME_K1)+r(NAME_K2)+r(NAME_K3)).slice(0,8);if(LANG==='zh'){if(LOC!=='zh'){const k=Math.random();return tr2(k<.5?r(NAME_ZA)+r(NAME_ZM)+r(NAME_ZB):r(NAME_ZA)+r(NAME_ZB))}const k=Math.random();return k<.45?r(NAME_ZA)+r(NAME_ZM)+r(NAME_ZB):k<.8?r(NAME_ZA)+r(NAME_ZB)+r(NAME_ZS):r(NAME_ZB)+r(NAME_ZB)+r(NAME_ZS)}return (r(NAME_E1)+r(NAME_E2)).slice(0,12)}
const AVATARS=['🐱','🦊','🐼','🐰','🐯','🐸','🐲','🦉','🐺','🐧','🐨','🐵','🦁','🐻','🐹','🦄','🐙','🐤','🦝','🐮'];
function randomAvatar(){return {e:Math.floor(Math.random()*AVATARS.length),h:Math.floor(Math.random()*360)}}
function avatarHTML(a,cls){a=a||{e:0,h:30};return `<span class="av${cls?' '+cls:''}" style="--h:${a.h|0}">${AVATARS[a.e%AVATARS.length]||AVATARS[0]}</span>`}
(()=>{if(SAVE.nameV!==2){if(!SAVE.nameSet)SAVE.name=randomName();SAVE.nameV=2}let n=SAVE.name||'';if(!n)n=randomName();SAVE.name=n.slice(0,12);if(!SAVE.avatar)SAVE.avatar=randomAvatar();try{localStorage.setItem('sl_name',SAVE.name)}catch(_){}})();
let savedGold=SAVE.gold,savedTrophies=SAVE.trophies;
function persist(quiet){if(!quiet){SAVE.ts=Date.now();if(SAVE.gold!==savedGold)SAVE.goldTs=SAVE.ts;if(SAVE.trophies!==savedTrophies)SAVE.ladderTs=SAVE.ts}savedGold=SAVE.gold;savedTrophies=SAVE.trophies;try{localStorage.setItem(SAVE_KEY,JSON.stringify(SAVE))}catch(_){}if(!quiet&&typeof cloudSchedulePush==='function')cloudSchedulePush()}
function applyUpgrades(P){const u=SAVE.up;P.maxHp=Math.round(P.maxHp*(1+.1*(u.hp||0)));P.hp=P.maxHp;P.dmg*=1+.06*(u.dmg||0);P.regen*=1+.12*(u.qi||0);G.cores+=u.core||0;P.dmgBonus+=accountBonus();G.rerolls+=SAVE.perks?.rerolls||0;G.cores+=SAVE.perks?.cores||0}

/* HUD */
const fmt=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
let hudT=0;
const IS_TOUCH=matchMedia('(pointer:coarse)').matches;
function hud(dt){
  hudT-=dt;if(hudT>0)return;hudT=.05;
  const P=G.P;
  $('#xp').style.width=(G.xp/G.need*100)+'%';
  $('#hpfill').style.height=(P.hp/P.maxHp*100)+'%';const hmul=healMul(G.t)*(G.curse.heal||1);$('#hpnum').textContent=Math.ceil(P.hp)+' / '+P.maxHp;{const he=$('#healeff');if(he){const show=hmul<1||(G.healCapped||0)>0;he.hidden=!show;if(show)he.textContent=L(`治疗 ${Math.round(hmul*100)}% · 上限 ${Math.round(P.maxHp*healCap(G.t))}/秒`,`heal ${Math.round(hmul*100)}% · cap ${Math.round(P.maxHp*healCap(G.t))}/s`)}}
  $('#mpfill').style.height=(P.mana/P.maxMana*100)+'%';$('#mpnum').textContent=Math.floor(P.mana)+' / '+P.maxMana;
  if(IS_TOUCH){$('#hpfill2').style.width=(P.hp/P.maxHp*100)+'%';$('#hpnum2').textContent=Math.ceil(P.hp)+'/'+P.maxHp+(hmul<1?` · ${L('治疗','heal')} ${Math.round(hmul*100)}%`:'');$('#mpfill2').style.width=(P.mana/P.maxMana*100)+'%';$('#mpnum2').textContent=Math.floor(P.mana)+'/'+P.maxMana}
  $('#lv').textContent='Lv '+G.lv;
  $('#ptsbadge').hidden=true;
  $('#timer').textContent=fmt(G.t);$('#nextboss').textContent=G.theme?L(G.theme.zh,G.theme.en):G.boss?L('首领战','BOSS'):L('首领 ','boss in ')+fmt(nextBossIn());$('#nextboss').classList.toggle('theme',!!G.theme);
  $('#kills').textContent=G.kills+L(' 击杀',' kills');
  $('#score').hidden=true;if(!(G.room&&ROOM.playing)&&typeof drawBoard==='function'&&(!G._bw||performance.now()-G._bw>250)){G._bw=performance.now();drawBoard()}if(G.rival){const lead=G.score>=G.rival.score;if(G.leadWas!==undefined&&lead!==G.leadWas&&G.t>20&&typeof showSide==='function')showSide(lead?`反超!领先 ${G.score-G.rival.score}`:`被反超,落后 ${G.rival.score-G.score}`,lead?`Lead taken: +${G.score-G.rival.score}`:`Overtaken by ${G.rival.score-G.score}`,lead?'#7dffb0':'#ff6a6a','swords');G.leadWas=lead}
  if(G.rival&&!G.room){const R=G.rival,tot=Math.max(1,G.score+R.score);$('#s-you').textContent=G.score;$('#s-riv').textContent=R.score;$('#s-rname').textContent=L(R.name[0],R.name[1]);$('#s-bar i').style.width=(G.score/tot*100)+'%';$('#score').classList.toggle('lead',G.score>=R.score);const left=Math.max(0,(G.quick?180:PK_LEN)-G.t-(G.pickWall||0)),diff=G.score-R.score;$('#nextboss').textContent=(G.boss?L('首领战 · ','BOSS · '):'')+L('剩余 ','left ')+fmt(left);
    const ob=$('#pkfinal');if(left<=30&&left>0){ob.hidden=false;const tgt=G.boss&&!G.boss.dead?L(`首领 ${pts(G.boss)} 分`,`boss ${pts(G.boss)} pts`):G.chests.length?L('宝箱 +'+PK_EVENTS.chest,'chest +'+PK_EVENTS.chest):G.mission?L('密令 +'+PK_EVENTS.mission,'mission +'+PK_EVENTS.mission):(G.en.find(e=>e.elite&&!e.dead)?L('精英 ×3 分','elite ×3 pts'):L('连斩加成','streak bonus'));
      ob.innerHTML=`<b class="${diff>=0?'lead':'behind'}">${diff>=0?L(`领先 ${diff}`,`Ahead by ${diff}`):L(`落后 ${-diff}`,`Behind by ${-diff}`)}</b> · ${L('最后 30 秒 · 去抢:','Final 30 s · go for:')} ${tgt}`;ob.classList.add('final')}else if(ob.classList.contains('final')){ob.hidden=true;ob.classList.remove('final')}}
  {const ct=$('#coretm');if(ct){const reviving=endlessDuel()&&P.down>0&&!G.over,show=reviving||(G.cores===0&&!RIVAL_ON&&!endlessDuel());ct.hidden=!show;if(show)ct.textContent=reviving?L(`复活倒计时 ${Math.ceil(P.down)} 秒`,`Reviving in ${Math.ceil(P.down)} s`):L(`核心恢复 ${Math.ceil(70-G.coreT)}s`,`core in ${Math.ceil(70-G.coreT)}s`)}}
  const o=$('#obj');o.hidden=!(G.mission||G.trib||G.bounty);if(G.trib)o.textContent=L(`天劫 · 撑住 ${Math.ceil(G.trib.t)}s · 精英 ×${G.trib.k}`,`Tribulation · hold ${Math.ceil(G.trib.t)}s · elites ×${G.trib.k}`);else if(G.mission)o.textContent=missionText();else if(G.bounty&&typeof bountyText==='function')o.textContent=bountyText();
  const bf=$('#buff');bf.hidden=!P.buff;if(P.buff)bf.textContent={dmg:L('伤害 +30%','Damage +30%'),spd:L('疾行','Swift'),haste:L('冷却减半','Cooldowns halved')}[P.buff.k]+' · '+Math.ceil(P.buff.t)+'s';
  if(G.boss){$('#bosshp i').style.width=(G.boss.hp/G.boss.maxHp*100)+'%';$('#bossbar').classList.toggle('tired',!!G.boss.tired);const op=G.boss.exposed>0;$('#bossbar').classList.toggle('open',op);const ob=$('#openbar');if(ob){ob.hidden=!op;if(op){ob.style.width=Math.min(100,G.boss.exposed/3*100)+'%';ob.textContent=L('破绽 · 伤害 +60% · ','OPENING · +60% · ')+G.boss.exposed.toFixed(1)+'s'}}$('#seals').classList.toggle('opening',op);
    {const B=G.boss,bh=$('#bossheal');if(bh){const w=Math.round(B.healWiz||0),dr=Math.round(B.healDrain||0);bh.hidden=!(w||dr);if(!(w||dr))bh.textContent='';else bh.innerHTML=(w?`<i class="wiz">${L('巫师治疗','Shaman heals')} +${w}</i>`:'')+(dr?`<i class="dr">${L('吸血回复','Drain heals')} +${dr}</i>`:'')}}
    const B=G.boss,pb=$('#bosspois');if(pb){if(B.pois>0&&B.poisS){const dps=B.poisD*B.pois*.6/.6,left=B.poisT,pred=Math.min(B.hp,dps*left);pb.hidden=false;pb.textContent=L(`毒 ×${B.pois} · ${left.toFixed(1)}s · 约 ${Math.round(pred)}`,`Poison ×${B.pois} · ${left.toFixed(1)}s · ~${Math.round(pred)}`);const pf=$('#bosspoisfill');if(pf){pf.style.left=(Math.max(0,B.hp-pred)/B.maxHp*100)+'%';pf.style.width=(pred/B.maxHp*100)+'%';pf.hidden=false}}else{pb.hidden=true;const pf=$('#bosspoisfill');if(pf)pf.hidden=true}}}
  const P2=G.P,sl=$('#seals');if(sl){sl.classList.toggle('parry',P2.parry>0);const pl=$('#parrylbl');if(pl){pl.hidden=!(P2.parry>0||P2.parryBoost>1);pl.textContent=P2.parryBoost>1?L('破招加成 ×1.6 生效中','Parry bonus ×1.6 active'):L(`破招!下一式 ×1.6 · ${Math.ceil(P2.parry)}s`,`PARRY: next skill ×1.6 · ${Math.ceil(P2.parry)}s`)}}
  // skill cooldown sweeps
  for(let i=0;i<4;i++){const el=$('#seal'+i);if(!el)continue;const s=G.spells[i];if(!s)continue;const sp=SPELLS[s.id];
    const cdT=sp.auto?0:skillCooldown(s),k=sp.auto?0:clamp(s.cd/Math.max(.01,cdT),0,1);
    const cost=sp.auto?0:skillCost(s),short=Math.ceil(cost-P.mana);el.style.setProperty('--cd',(k*360)+'deg');el.classList.toggle('cooling',k>0);el.classList.toggle('poor',!sp.auto&&short>0);el.classList.toggle('active',s.active>0);
    if(!sp.auto){let nd=el.querySelector('.need');if(!nd){nd=document.createElement('span');nd.className='need';el.appendChild(nd)}const txt=k>0?(s.cd<=5?String(Math.ceil(s.cd)):''):short>0?'-'+short:'';if(nd.textContent!==txt)nd.textContent=txt;nd.classList.toggle('qi',k<=0&&short>0);
      const ready=k<=0&&short<=0;if(ready&&el.dataset.was==='0'){el.classList.remove('ready');void el.offsetWidth;el.classList.add('ready')}el.dataset.was=ready?'1':'0'}
    const deny=G.fx.find(f=>f.k==='deny'&&f.i===i);el.classList.toggle('deny',!!deny)}
  const d=$('#sealdash');d.style.setProperty('--cd',(clamp(P.dashCd/dashCooldown(),0,1)*360)+'deg');d.classList.toggle('cooling',P.dashCd>0);
}
function drawRelics(){const box=$('#relics');if(!box)return;box.textContent='';const MAXS=PHONE?4:7,list=G.relics.length>MAXS?G.relics.slice(-(MAXS-1)):G.relics;for(const id of list){const R=RELICS[id],d=document.createElement('div');d.className='relic';d.style.color=R.col;d.textContent=R.g;d.title=`${LL(R)} · ${L(R.d,R.de)}`;box.appendChild(d)}
  if(G.relics.length>MAXS){const d=document.createElement('div');d.className='relic more';d.textContent='+'+(G.relics.length-(MAXS-1));d.title=G.relics.slice(0,-(MAXS-1)).map(id=>LL(RELICS[id])).join(' · ');box.appendChild(d)}}
let introT=null,introOn=false;
function bossIntro(zh,en,n){const el=$('#intro');el.innerHTML=`<div class="lb"></div><div class="bn"><small>${n>=BOSSES.length?L(`第 ${Math.floor(n/BOSSES.length)+1} 轮 · ${n%BOSSES.length+1}/${BOSSES.length} `,`Cycle ${Math.floor(n/BOSSES.length)+1} · ${n%BOSSES.length+1}/${BOSSES.length}`):L(`第 ${n+1} 位首领`,`Boss ${n+1}`)}</small><b>${L(zh,en)}</b>${BOSS_HINT[n%BOSS_HINT.length]?`<em>${L(BOSS_HINT[n%BOSS_HINT.length][0],BOSS_HINT[n%BOSS_HINT.length][1])}</em>`:''}</div><div class="lb"></div>`;el.hidden=false;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');introOn=true;$('#banner').classList.remove('on');clearTimeout(introT);introT=setTimeout(()=>{el.classList.remove('on');introOn=false;setTimeout(()=>el.hidden=true,500)},3400)}
function updateCores(){const e=$('#cores');e.textContent='';for(let i=0;i<Math.max(2,G.cores);i++){const s=document.createElement('i');s.className='core'+(i<G.cores?'':' off');e.appendChild(s);e.append(' ')}}
function drawSeals(){
  if(G.auto)return;
  const box=$('#seals');box.textContent='';
  for(let i=0;i<4;i++){const s=G.spells[i],d=document.createElement('button');d.className='seal'+(s?'':' empty')+(i===0?' main':'');d.id='seal'+i;d.type='button';
    if(s){const m=SPELLS[s.id];
      const g=document.createElement('div');g.className='g';g.innerHTML=typeof ICON!=='undefined'?ICON.spell(s.id)+`<span class="gm">${m.g}</span>`:m.g;g.style.color=s.els[0]?ELS[s.els[0]].col:m.col;d.appendChild(g);
      const l=document.createElement('div');l.className='lv';l.textContent='Lv '+s.lv;d.appendChild(l);
      const key=document.createElement('div');key.className='key';key.textContent=m.auto?L('自动','auto'):SPELL_KEYS[i];d.appendChild(key);
      if(!m.auto){const cst=document.createElement('div');cst.className='cost';cst.innerHTML=`<i>${L('内力','qi')}</i>${skillCost(s)}`;d.appendChild(cst)}
      d.title=`${LL(m)} · Lv ${s.lv}${m.auto?L(' · 自动',' · auto'):L(` · 消耗 ${skillCost(s)} 内力 · 冷却 ${m.cd}s`,` · ${skillCost(s)} qi · ${m.cd}s cooldown`)}\n${L(m.d,m.de)}`;
      if(s.els.length){const e=document.createElement('div');e.className='els';s.els.forEach(k=>{const b=document.createElement('i');b.style.background=ELS[k].col;b.style.color=ELS[k].col;e.appendChild(b)});d.appendChild(e)}
      if(s.augs.length){const a=document.createElement('div');a.className='aug';a.textContent=s.augs.map(k=>AUGS[k].g).join('');d.appendChild(a)}
      const cdm=document.createElement('div');cdm.className='cdm';d.appendChild(cdm);
            d.onpointerdown=ev=>{ev.preventDefault();if(!m.auto&&ev.button===0)castSkill(i)};
      d.oncontextmenu=ev=>{ev.preventDefault();ev.stopPropagation()};
    }else{const key=document.createElement('div');key.className='key';key.textContent=SPELL_KEYS[i];d.appendChild(key)}
    box.appendChild(d)}
  const dd=document.createElement('button');dd.className='seal dash';dd.id='sealdash';dd.type='button';dd.innerHTML=`<div class="g">${typeof ICON!=='undefined'?ICON.misc('dash','#9fe3f0'):''}<span class="gm">轻</span></div><div class="lv">${L('轻功','dash')}</div><div class="key">${IS_TOUCH?L('点击','tap'):'Space'}</div><div class="cdm"></div>`;dd.onpointerdown=ev=>{ev.preventDefault();if(ev.button===0)dash()};box.appendChild(dd);
}
let bannerT=0;
/* side toast: pickups and other low-stakes news stack at the right edge, away from the hero and the danger zone */
function showSide(zh,en,col,ic){if(!G||G.auto)return;const box=$('#side');if(!box)return;const last=box.lastElementChild;if(last&&last.dataset.k===L(zh,en)){last.dataset.n=(+last.dataset.n||1)+1;last.querySelector('span').textContent=L(zh,en)+' ×'+last.dataset.n;clearTimeout(last._to);last._to=setTimeout(()=>{last.classList.remove('on');setTimeout(()=>last.remove(),400)},3400);return}const d=document.createElement('div');d.dataset.k=L(zh,en);d.className='st';d.style.setProperty('--c',col||'#ffd27a');d.innerHTML=`${ic&&typeof ICON!=='undefined'?ICON.misc(ic,col||'#ffd27a','sm'):''}<span>${L(zh,en)}</span>`;box.appendChild(d);const maxT=IS_TOUCH?2:4;while(box.children.length>maxT)box.removeChild(box.firstChild);setTimeout(()=>d.classList.add('on'),20);d._to=setTimeout(()=>{d.classList.remove('on');setTimeout(()=>d.remove(),400)},IS_TOUCH?2600:3400)}
function showBanner(zh,en,t){if(!G||G.auto)return;if(introOn&&t<2.5)return;const b=$('#banner');b.innerHTML=`${L(zh,en)}`;b.classList.remove('on');void b.offsetWidth;b.classList.add('on');bannerT=t}
/* character panel: attributes and skill trees */
let panelTab='tree';
function togglePanel(){if(!G||G.auto||G.over||G.pick)return;clearGameInput();G.panel=!G.panel;$('#char').hidden=!G.panel;if(G.panel){renderPanel();SFX.setState('title')}else SFX.setState(G.boss?'boss':'battle')}
function renderPanel(){
  const P=G.P;$('#sp').textContent=G.spells.reduce((a,s)=>a+s.pts,0);
  $('#tab-attr').classList.toggle('on',panelTab==='attr');$('#tab-tree').classList.toggle('on',panelTab==='tree');
  const A=$('#attrs');A.hidden=panelTab!=='attr';const T=$('#trees');T.hidden=panelTab!=='tree';
  if(panelTab==='attr'){A.textContent='';
    const d=document.createElement('div');d.className='derived';
    d.innerHTML=`<span>${L('生命','HP')} <b>${Math.ceil(P.hp)}/${P.maxHp}</b></span><span>${L('内力','Qi')} <b>${Math.floor(P.mana)}/${P.maxMana}</b> (+${(P.regen).toFixed(1)}/s)</span><span>${L('伤害','Damage')} <b>×${(P.dmg*(1+P.dmgBonus)).toFixed(2)}</b></span><span>${L('暴击','Crit')} <b>${Math.round(P.crit*100)}%</b></span><span>${L('移速','Speed')} <b>×${P.spd.toFixed(2)}</b></span><span>${L('减伤','Mitigation')} <b>${Math.round((1-P.def)*100)}%</b></span>`;A.appendChild(d);
  }else{T.textContent='';
    G.spells.forEach((s,si)=>{const m=SPELLS[s.id],col=document.createElement('div');col.className='tree';col.style.setProperty('--c',m.col);
      col.innerHTML=`<div class="th"><span class="g">${m.g}</span><div><b>${LL(m)}</b><small>Lv ${s.lv}</small></div></div>`;
      const T0=TREES[s.id]||[];
      for(const grp of ['trait','num']){const idx=T0.map((n,i)=>i).filter(i=>(grp==='trait')===isTrait(T0[i]));if(!idx.length)continue;
        const h=document.createElement('small');h.className='tgrp';h.textContent=grp==='trait'?L('特性','Traits'):L('数值','Stats');col.appendChild(h);
        idx.forEach(i=>{const n=T0[i],r=s.nodes[i]||0,locked=!nodeOpen(s,i)&&r<n.max,trait=grp==='trait',need=trait?(n.tier===1?1:n.tier===2?4:10):0;
          const b=document.createElement('div');b.className='node t'+n.tier+(r>=n.max?' max':'')+(locked&&trait?' locked':'')+(r>0?' has':'')+(trait?' trait':' num');
          b.innerHTML=`${ICON.node(n.fx,SPELLS[s.id].col,'sm')}<span class="nn">${LL(n)}</span><span class="nd">${L(n.d,n.de)}</span><span class="nr">${r}/${n.max}${locked&&trait&&s.lv<need?L(` · Lv ${need} 开放`,` · opens at Lv ${need}`):''}</span>`;col.appendChild(b)})}
      T.appendChild(col)});
  }
}
document.querySelectorAll('#mode button').forEach(b=>b.onclick=()=>{SAVE.mode=b.dataset.m;persist();renderTitle();SFX.pick(1)});
document.querySelectorAll('#diff button').forEach(b=>b.onclick=()=>{SAVE.diff=b.dataset.d;DIFFID=SAVE.diff;persist();renderTitle();SFX.pick(1)});
document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{applyQuality(b.dataset.q);syncQuality()});
function syncQuality(){document.querySelectorAll('[data-q]').forEach(b=>{const on=b.dataset.q===QLEVEL;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))})}
if(typeof wireLeaderboard==='function')wireLeaderboard();
$('#charbtn').onclick=()=>{togglePanel();$('#charbtn').blur()};
$('#charclose').onclick=()=>togglePanel();
$('#tab-attr').onclick=()=>{panelTab='attr';renderPanel()};$('#tab-tree').onclick=()=>{panelTab='tree';renderPanel()};
/* the pause screen shows the build at a glance: every skill with its level, element and path, plus the relics */
function renderPauseBuild(){const el=$('#pausebuild');if(!el)return;el.innerHTML=G.spells.map((s,i)=>{const m=SPELLS[s.id];const tags=[s.els.length===2?L(FUS[fusion(s)][0],FUS[fusion(s)][1]):s.els[0]?LL(ELS[s.els[0]]):'',s.path&&typeof PATHS!=='undefined'&&PATHS[s.path]?LL(PATHS[s.path]):'',s.awake?L('觉醒','awakened'):''].filter(Boolean).join(' · ');return `<div class="pb" style="--c:${m.col}">${ICON.spell(s.id,'sm')}<div><b>${LL(m)} <small>Lv ${s.lv}${s.tr?L(` · 真传 ${s.tr}`,` · Transcend ${s.tr}`):''}</small></b><small>${tags||(i===0?L('普攻','normal attack'):L(CATS[SKILL_CAT[s.id]||'passive'][0],CATS[SKILL_CAT[s.id]||'passive'][1]))}</small></div></div>`}).join('')+`<div class="pbr">${G.relics.map(id=>`<span title="${L(RELICS[id].d,RELICS[id].de)}" style="--c:${RELICS[id].col||'#c7a4f0'}">${RELICS[id].g}</span>`).join('')}${G.relics.length?'':`<small>${L('尚无法宝','no relics yet')}</small>`}</div><small class="pbt">${L(`${fmt(G.t)} · Lv ${G.lv} · ${G.kills} 击杀 · 最高连斩 ×${G.comboMax}`,`${fmt(G.t)} · Lv ${G.lv} · ${G.kills} kills · best streak ×${G.comboMax}`)}</small>`}
function togglePause(){if(G.over||G.pick)return;clearGameInput();G.paused=!G.paused;$('#pausebtn').textContent=G.paused?'▶':'II';$('#pause').hidden=!G.paused;if(G.paused){$('#pausesettings').open=false;renderPauseBuild();quitLabel();SFX.setState('title')}else SFX.setState(G.boss?'boss':'battle')}

/* cards */
let pickOpenedAt=0,pickTimer=null;const PICK_LIMIT=8;
function stopPickTimer(timer=pickTimer){
  if(timer!==null)clearInterval(timer);
  if(timer===pickTimer){pickTimer=null;const el=$('#picktimer');if(el)el.textContent=''}
}
function openPick(){
  if(G.pick||!G.picks.length)return;
  const q=G.picks.shift(),cards=buildCards(q);
  if(!cards.length){return openPick()}
  if(G.auto){pick(cards).a();return openPick()}
  G.pick=cards;pickOpenedAt=performance.now();$('#banner').classList.remove('on');bannerT=0;
  clearGameInput();stopPickTimer();
  if(RIVAL_ON||(G.room&&ROOM.code)){
    const game=G,selection=cards,openedAt=pickOpenedAt;
    const timer=setInterval(()=>{
      if(G!==game||G.pick!==selection){stopPickTimer(timer);return}
      const left=Math.max(0,PICK_LIMIT-(performance.now()-openedAt)/1000);
      const el=$('#picktimer');if(el)el.textContent=`${Math.ceil(left)}s`;
      if(left<=0){const sug=document.querySelector('#cardrow .card.sugged');choose(sug?+sug.id.replace('card',''):0)}
    },200);pickTimer=timer;
  }
  const sk=q.s?LL(SPELLS[q.s.id]):'';const T={level:q.jackpot?[L('天降横财!','Jackpot!'),L('全部获得','Take all')]:[L('升级','Level up'),L('选择一项','pick one')],infuse:[L('灌注真气','Infuse an element'),sk],fuse:[L('真气融合','Fuse elements'),sk],aug:[L('密令完成','Mission complete'),''],awake:[L('武器觉醒','Weapon awakening'),sk],contract:[L('契约','Pact'),''],ascend:[L(`第 ${q.cyc} 轮七位首领皆灭`,`Cycle ${q.cyc}: all seven bosses slain`),'']}[q.kind]||(typeof KIND_TITLE!=='undefined'&&KIND_TITLE[q.kind]?KIND_TITLE[q.kind](q):[L('抉择','Choose'),'']);
  $('#cardtitle').innerHTML=`${T[0]}<small>${T[1]}${G.picks.length?` · +${G.picks.length}`:''}</small>`;
  const row=$('#cardrow');row.textContent='';
  const adv=renderBuildStrip();
  cards.forEach((cd,i)=>{const b=document.createElement('button');b.className='card'+(cd.q?' '+cd.q.k:'')+(cd.isNew?' newskill':'');b.id='card'+i;b.style.setProperty('--c',cd.c);b.style.animationDelay=(i*.08)+'s';
    const kind=cd.kind||'passive',K=KINDS[kind]||KINDS.passive;
    const sug=adv&&(cd.cat===adv.cat||(adv.cat==='defense'&&cd.cat==='heal')||(adv.cat==='melee'&&(cd.cat==='ranged'||cd.cat==='summon')));
    // header: what kind of card · category · rarity · suggested star
    b.dataset.kind=kind;b.style.setProperty('--k',K[2]);
    const hd=document.createElement('div');hd.className='hd';
    hd.innerHTML=`<span class="kind"><i>${LANG==='zh'?tr(K[3]||''):({path:'◇',element:'✧',fusion:'⊕',augment:'+',passive:'▤',awake:'✦',contract:'♢',ascend:'↑',jackpot:'★'}[kind]||K[3]||'')}</i>${L(K[0],K[1])}</span><span class="sp"></span>${cd.q&&cd.q.k!=='common'?`<span class="rar ${cd.q.k}">${cd.q.k==='legendary'?'✦ ':cd.q.k==='epic'?'◆ ':'● '}${L(cd.q.zh,cd.q.en)}</span>`:''}`;
    b.appendChild(hd);
    // glyph of the skill being changed, with a small badge for the node / element / augment
    const gw=document.createElement('div');gw.className='gw';gw.innerHTML=typeof ICON!=='undefined'?ICON.card(cd):`<span class="g">${cd.g}</span>${cd.badge?`<span class="badge">${cd.badge}</span>`:''}`;b.appendChild(gw);
    const parts=[['n',cd.n],['sub',cd.sub],['fx',cd.fx],['fxe',cd.fxEn],['k',IS_TOUCH?'':String(i+1)]];
    parts.forEach(([k,v])=>{if(!v)return;const s=document.createElement('div');s.className=k;s.textContent=v;b.appendChild(s)});
    if(sug)b.classList.add('sugged');
    if(cd.skill){b.onmouseenter=()=>document.querySelectorAll('#build .bs').forEach(x=>x.classList.toggle('hl',x.dataset.skill===cd.skill));b.onmouseleave=()=>document.querySelectorAll('#build .bs.hl').forEach(x=>x.classList.remove('hl'))}
    b.onclick=()=>choose(i);row.appendChild(b);if(typeof cardDecor==='function')cardDecor(b,cd,i,q)});
  const rr=$('#reroll');rr.hidden=q.kind!=='level';rr.disabled=G.rerolls<=0;rr.textContent=L('重抽','Reroll')+` (${G.rerolls})`;rr.onclick=()=>{if(G.rerolls<=0)return;G.rerolls--;const prev=G.pick.map(c=>c.n);G.pick=null;G.picks.unshift({...q,exclude:prev});SFX.throw();openPick()};
  if(cards.some(c=>c.q&&c.q.k==='legendary'))SFX.chest();else if(cards.some(c=>c.q&&c.q.k==='epic'))SFX.levelup();
  $('#cards').hidden=false;
}
function renderBuildStrip(){
  const el=$('#build');if(!el)return;el.textContent='';
  const touched=new Set((G.pick||[]).map(c=>c.skill).filter(Boolean));
  G.spells.forEach((s,i)=>{if(el.children.length>=4)return;const m=SPELLS[s.id],d=document.createElement('div');d.className='bs';d.dataset.skill=s.id;d.style.setProperty('--c',m.col);
    const cat=CATS[SKILL_CAT[s.id]]||CATS.passive;
    const tags=[i===0?'':L(cat[0],cat[1]),s.path&&typeof PATHS!=='undefined'&&PATHS[s.path]?LL(PATHS[s.path]):'',s.els.length?s.els.map(k=>LL(ELS[k])).join('+'):'',s.awake?L('觉醒','awakened'):''].filter(Boolean).join(' · ');
    d.classList.toggle('hl0',touched.has(s.id));d.dataset.lv='Lv '+s.lv;d.innerHTML=`<span class="slot">${i===0?L('普攻','main'):SPELL_KEYS[i]}</span>${typeof ICON!=='undefined'?ICON.spell(s.id,'sm'):`<span class="g">${m.g}</span>`}<div><b>${LL(m)} <small>Lv ${s.lv}${s.tr?L(` · 真传 ${s.tr}`,` · Transcend ${s.tr}`):''}</small></b><small>${tags}</small></div>`;el.appendChild(d)});
  const adv=typeof buildAdvice==='function'?buildAdvice():null;
  return adv;
}
function choose(i){
  if(!G.pick||!G.pick[i])return;
  const cd=G.pick[i];const spent=Math.min(PICK_LIMIT+1,(performance.now()-pickOpenedAt)/1000);stopPickTimer();
  if(RIVAL_ON&&G.rival&&!G.room&&spent>.3){G.pickWall=(G.pickWall||0)+spent;const R=G.rival,rate=R.score/Math.max(20,G.t);const gain=Math.round(rate*spent);if(gain>0){R.score+=gain;if(G.floats.length<CAP.fl)G.floats.push({x:G.P.x,y:G.P.y-40,t:1.2,v:L(`对手 +${gain}`,`Rival +${gain}`),c:'#ff9c5a'})}}
  cd.a();G.pick=null;$('#cards').hidden=true;drawSeals();SFX.pick(1);if(cd.skill){const si=G.spells.findIndex(s=>s.id===cd.skill),se=$('#seal'+si);if(se){se.classList.remove('ready');void se.offsetWidth;se.classList.add('ready')}}if(!G.picks.length)showBanner(cd.n,cd.n,1.1);
  if(G.picks.length&&G.picks[0].kind==='level'&&G.t>60){G.pickHold=8;showBanner(L(`还有 ${G.picks.length} 次`,`${G.picks.length} more`),'',1)}else openPick();
}
function closeCards(){stopPickTimer();clearGameInput();G.picks=[];G.pick=null;$('#cards').hidden=true;G.panel=false;$('#char').hidden=true}

/* title: class select and lobby */
function renderWeapons(){
  const wr=$('#weapons');if(!wr)return;wr.textContent='';const cls=SAVE.cls,cur=weaponOf(cls);
  const h=document.createElement('span');h.className='wh';h.textContent=L('武器','Weapon');wr.appendChild(h);
  (WEAPONS[cls]||[]).filter(w=>WEAPON_INFO[w]?.need!=='legend'||weaponUnlocked(cls,w)).forEach(w=>{
    const m=SPELLS[w],info=WEAPON_INFO[w]||{},b=document.createElement('button');b.type='button';b.className='wp'+(w===cur?' sel':'');b.style.setProperty('--c',m.col);
    b.innerHTML=`${ICON.spell(w)}<span class="t"><b>${LL(m)}</b><small>${info.trait?L(info.trait[0],info.trait[1]):''}</small><small class="dd">${L(m.d,m.de)}</small></span>`;
    b.onclick=()=>{SAVE.weapon[cls]=w;persist();renderTitle();if(G&&G.auto){newGame(true,cls);demoBoost()}SFX.pick(1)};wr.appendChild(b);
  });
}
function renderAsura(){
  /* 修罗 = the only difficulty choice: one stepper, the reward always visible, the newest rule in one line.
     Locked tiers are simply out of reach of the arrows; the next unlock lives in the ▶ tooltip. */
  const el=$('#asura');if(!el)return;const A=SAVE.asura,on=SAVE.mode==='solo';el.hidden=!on;if(!on)return;
  const max=A.max||0;if((A.sel||0)>max)A.sel=max;const sel=A.sel||0,gold=t=>Math.round(ASURA_GOLD*t*100);
  const unlockTip=L('一局斩杀两位首领,开启下一层','Slay two bosses in one run to open the next tier');
  el.textContent='';el.classList.toggle('lockedall',max===0);el.classList.toggle('lit',sel>0);
  const lab=document.createElement('span');lab.className='al';lab.innerHTML=`${ICON.misc('boss','#ff5a45','sm')}${L('修罗','Ascension')}`;el.appendChild(lab);
  if(max===0){const n=document.createElement('small');n.className='ad';n.textContent=L('🔒 首领 ×2','🔒 2 bosses');el.appendChild(n);return}
  const step=d=>{const t=sel+d;if(t<0||t>max)return;A.sel=t;persist();renderTitle();SFX.pick(1)};
  const mk=(txt,d,dis,tip)=>{const b=document.createElement('button');b.type='button';b.className='st';b.textContent=txt;b.disabled=dis;b.title=tip;b.setAttribute('aria-label',tip);b.onclick=()=>step(d);return b};
  el.appendChild(mk('‹',-1,sel<=0,L('降一层','One tier down')));
  const v=document.createElement('b');v.className='av';v.textContent=sel?String(sel):L('无','Off');v.title=sel?ASURA.slice(0,sel).map(x=>L(x.zh,x.en)).join('\n'):L('普通规则','Base rules');el.appendChild(v);
  el.appendChild(mk('›',1,sel>=max,sel>=max?(max>=ASURA.length?L('已是最高层','Highest tier'):unlockTip):L('升一层','One tier up')));
  const d=document.createElement('small');d.className='ad';
  d.innerHTML=sel?`<em>${L(`金币 +${gold(sel)}%`,`+${gold(sel)}% gold`)}</em>${L(ASURA[sel-1].zh,ASURA[sel-1].en)}`:`${L('金币 +0%','+0% gold')}`;
  d.title=sel?ASURA.slice(0,sel).map((x,i)=>`${i+1}. ${L(x.zh,x.en)}`).join('\n'):unlockTip;el.appendChild(d);
}
function renderTitle(){
  const row=$('#classes');row.textContent='';
  for(const k in CLASSES){const C=CLASSES[k],b=document.createElement('button');b.className='cls'+(SAVE.cls===k?' sel':'');b.type='button';b.style.setProperty('--c',C.col);
    b.innerHTML=`${typeof NEW_HEROES!=='undefined'&&NEW_HEROES.includes(k)&&!(SAVE.seenCls||{})[k]?`<i class="newb">${L('新','NEW')}</i>`:''}${typeof ICON!=='undefined'?ICON.cls(k):''}<div class="g">${C.g}</div><div class="n">${LL(C)}</div><div class="d">${typeof ROLES!=='undefined'?L(ROLES[k][0],ROLES[k][1]):L(C.d,C.de)}</div><div class="sk">${[weaponOf(k),...C.skills].map(id=>`<span style="color:${SPELLS[id].col}">${SPELLS[id].g}</span>`).join('')}</div>`;
    b.onclick=()=>{SAVE.cls=k;CLASS=k;SAVE.seenCls=SAVE.seenCls||{};SAVE.seenCls[k]=1;persist();renderTitle();if(G&&G.auto){newGame(true,k);demoBoost()}SFX.pick(1)};row.appendChild(b)}
  if(typeof renderMenu==='function')renderMenu();if(typeof renderHero==='function'&&$('#hname'))renderHero();
  const safe=(n,f)=>{try{f()}catch(e){console.error('lobby:'+n,e)}};safe('weapons',renderWeapons);if(typeof renderMeta==='function')safe('meta',renderMeta);if(typeof renderCodex==='function')safe('codex',renderCodex);safe('status',renderStatus);if(typeof renderAccount==='function')safe('account',renderAccount);if($('#lbbtn'))$('#lbbtn').hidden=false;
  $('#gold').textContent=SAVE.gold;
  if(typeof renderTraining==='function')renderTraining();
  $('#record').hidden=false;$('#record').textContent=(SAVE.runs?L(`${SAVE.runs} 局 · 最长存活 ${fmt(SAVE.best||0)} · 单局最多首领 ${SAVE.bosses||0}`,`${SAVE.runs} runs · best ${fmt(SAVE.best||0)} · most bosses ${SAVE.bosses||0}`):'')+(SAVE.pk?L(` · 对决 ${SAVE.pk.w} 胜 ${SAVE.pk.l} 负 · 最高 ${SAVE.pkBest||0} 分`,` · PK ${SAVE.pk.w}W ${SAVE.pk.l}L · best ${SAVE.pkBest||0} pts`):'');
  RIVAL_ON=(SAVE.mode==='pk'||SAVE.mode==='qpk');seedSim(null);document.querySelectorAll('#mode button').forEach(b=>b.classList.toggle('on',b.dataset.m===(SAVE.mode||'solo')));{const on=$('#mode button.on');if(on&&on.scrollIntoView)try{on.scrollIntoView({inline:'nearest',block:'nearest'})}catch(_){}}$('#modenote').textContent=(RIVAL_ON&&SAVE.mode!=='qpk')?L(`对决 · ${PK_LEN/60} 分钟`,`PK · ${PK_LEN/60} min`):SAVE.mode==='daily'?L(`每日挑战 · ${resetIn()} 后刷新`,`Daily · resets in ${resetIn()}`)+(SAVE.daily&&SAVE.daily.day===dayKey()?L(` · 今日最佳 ${fmt(SAVE.daily.best)} / ${SAVE.daily.bosses} 首领`,` · today's best ${fmt(SAVE.daily.best)} / ${SAVE.daily.bosses} bosses`):''):SAVE.mode==='qpk'?L('对决 · 3 分钟','PK · 3 min'):SAVE.mode==='rush'?L('首领连战:从 Lv 10 开始,每 75 秒一位首领,经验加倍,没有统领与契约','Boss rush: start at Lv 10, a boss every 75 s, double XP, no warlord or pacts'):'';
  {const mc=$('#modechip');if(mc){const m=SAVE.mode||'solo';const txt={solo:['出山 · 单人无尽','Solo endless'],qpk:['对决 · 3 分钟','Duel · 3 min'],pk:['对决 · 10 分钟','Duel · 10 min'],daily:['每日挑战 · 全服同一局','Daily · same run for everyone'],rush:['首领连战','Boss rush'],room:['对决','Duel']}[m]||['',''];const ic={solo:'sword',qpk:'swords',pk:'trophy',daily:'calendar',rush:'boss',room:'crown'}[m]||'sword';mc.innerHTML=`${ICON.misc(ic,'#ffd27a','sm')}<b>${L(txt[0],txt[1])}</b>`}}
  {const op=$('#opp');if(op){const duel=SAVE.mode==='qpk'||SAVE.mode==='room';op.hidden=!duel;op.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.o===SAVE.mode))}}
  renderAsura();if(typeof renderRoom==='function')renderRoom();
  syncQuality();
  DIFFID='normal';document.querySelectorAll('#diff button').forEach(b=>{b.classList.toggle('on',b.dataset.d===DIFFID);b.disabled=SAVE.mode==='daily'});$('#diff').classList.toggle('locked',SAVE.mode==='daily');
  const mp=$('#maps');mp.textContent='';for(const k in MAPS){const M=MAPS[k],locked=M.need&&!SAVE.ach[M.need]&&!((SAVE.wins||0)>=(M.need==='boss2'?3:8)),b=document.createElement('button');b.type='button';b.className='mapb'+(k===MAPID?' on':'')+(locked?' locked':'');b.disabled=locked;const needN=M.need==='boss2'?2:4,totN=M.need==='boss2'?3:8;b.innerHTML=`<b>${LL(M)}</b><small>${locked?`🔒 ${SAVE.wins||0}/${totN}`:''}</small>`;if(locked)b.title=L(`一局斩 ${needN} 位首领解锁 · 累计 ${SAVE.wins||0}/${totN}`,`Slay ${needN} bosses in a run to unlock · ${SAVE.wins||0}/${totN}`);b.onclick=()=>{try{localStorage.setItem('sl_map',k)}catch(_){}b.innerHTML=`<b>${L('载入中…','Loading…')}</b>`;setTimeout(()=>location.reload(),60)};mp.appendChild(b)}
  const al=$('#ach');al.textContent='';const done=ACH.filter(a=>SAVE.ach[a.id]).length;$('#achcount').textContent=`${done}/${ACH.length}`;
  ACH.forEach(a=>{const d=document.createElement('div');d.className='achi'+(SAVE.ach[a.id]?' done':'');d.innerHTML=`<span class="tick">${SAVE.ach[a.id]?'✓':'○'}</span><b>${LL(a)}</b><span>${L(a.d,a.de)}</span><em>+${a.gold} ${L('金','gold')}</em>`;al.appendChild(d)});
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
  CLASS=SAVE.cls;DIFFID='normal';
  const inRoom=SAVE.mode==='room'&&ROOM.code&&ROOM.playing;if(SAVE.mode==='room'&&!inRoom)return; // rooms start from the room panel, never from the Start button
  closeCards();{const sd=$('#side');if(sd)sd.hidden=false}
  if(typeof metricsEnd==='function')metricsEnd('abandoned');
  DAILY=SAVE.mode==='daily';if(DAILY)DIFFID='normal';BOSSRUSH=SAVE.mode==='rush';ASURA_T=(SAVE.mode==='solo'||SAVE.mode==='rush')?Math.min(SAVE.asura.sel||0,SAVE.asura.max||0):0;
  if(inRoom){RIVAL_ON=false;DIFFID=(typeof roomHasAI==='function'&&roomHasAI())?(ROOM.data.diff||'normal'):'normal';seedSim(ROOM.seed)}else seedSim(DAILY?dayKey()*7919+1:null);
  $('#title').hidden=true;$('#intro').hidden=true;$('#end').hidden=true;$('#cards').hidden=true;$('#hud').hidden=false;$('#bossbar').hidden=true;$('#pause').hidden=true;$('#char').hidden=true;
  $('#banner').classList.remove('on');$('#pausebtn').textContent='II';
  SAVE.played=true;persist();
  newGame(false,CLASS);G.room=!!inRoom;if(!DAILY&&!inRoom&&!RIVAL_ON)applyUpgrades(G.P);G.day=dayKey();if(inRoom){const seat=ROOM.host?roomPlayerList().find(p=>p.ai):null;if(seat){mkRival(CLASS,seat);G.rivalSeat=seat.uid}else G.rivalSeat=null;if(typeof arenaStart==='function')arenaStart();ROOM.ended=false;ROOM.rewarded=false;roomSetMe({score:0,hp:1,lv:1,kills:0,alive:true,done:false,t:0,cls:CLASS});drawRoomBoard()}else{const rb=$('#roomboard');if(rb)rb.hidden=true}if(typeof codexSee==='function')codexSee('weapon',weaponOf(CLASS));G.quick=SAVE.mode==='qpk';
  updateCores();drawSeals();drawRelics();
  if(typeof metricsStart==='function')metricsStart();
  SFX.start();SFX.setState('battle');if(IS_TOUCH)goFullscreen(true);
}
function settleRunRewards(){
  if(G.settlement)return G.settlement;
  const goldBeforeSettlement=SAVE.gold;
  checkAch();
  const meta=typeof metaAfterRun==='function'?metaAfterRun():null;
  const gold=Math.round((G.kills*.45+G.lv*3+G.bossSlain*220+Math.floor(G.t/10)*2+G.goldRun*.7+G.comboMax)*(1+.15*(SAVE.up.gold||0))*(G.relics.includes('bowl')?1.3:1)*(G.relics.includes('wolf')?1.6:1)*(G.curse.gold||1)*(1+ASURA_GOLD*ASURA_T)*D().gold*(G.retireBonus||1)*(G.abandoned?.5:1));
  let tierUp=false;if(ASURA_T>=0&&(SAVE.mode==='solo')&&G.bossSlain>=2&&!G.abandoned&&SAVE.asura.max<=ASURA_T&&ASURA_T<(typeof ASURA_CAP!=='undefined'?ASURA_CAP:ASURA.length)){SAVE.asura.max=ASURA_T+1;tierUp=true}if(G.bossSlain>=2&&ASURA_T>(SAVE.asura.best||0))SAVE.asura.best=ASURA_T;
  const pk=RIVAL_ON&&G.rival,pkRes=pk?(G.score>G.rival.score?'win':G.score<G.rival.score?'lose':'tie'):null;const pkBonus=pkRes==='win'?200:pkRes==='tie'?80:0;
  if(pk){SAVE.pk=SAVE.pk||{w:0,l:0};if(pkRes==='win')SAVE.pk.w++;else if(pkRes==='lose')SAVE.pk.l++;SAVE.pkBest=Math.max(SAVE.pkBest||0,G.score)}
  let dailyNew=false;if(DAILY){const dk=G.day||dayKey();if(!SAVE.daily||SAVE.daily.day!==dk)SAVE.daily={day:dk,best:0,bosses:0};if(G.t>SAVE.daily.best){SAVE.daily.best=G.t;SAVE.daily.bosses=G.bossSlain;dailyNew=true}}
  const room=!!G.room&&ROOM.code;if(room){ROOM.ended=true;roomSetMe({done:true,score:G.score,alive:!(G.over&&G.over!=='pk'),t:Math.round(G.t),lv:G.lv,kills:G.kills,hp:Math.max(0,G.P.hp/G.P.maxHp)})}
  const record=!pk&&!room&&!DAILY&&!G.abandoned&&G.t>(SAVE.best||0);SAVE.gold+=gold+pkBonus;G.runRewardGold=SAVE.gold-goldBeforeSettlement+(G.gearGold||0);SAVE.runs++;SAVE.wins+=G.bossSlain;SAVE.bosses=Math.max(SAVE.bosses||0,G.bossSlain);if(record)SAVE.best=G.t;persist();
  return G.settlement={meta,gold,tierUp,pk,pkRes,dailyNew,room,record};
}
function showEnd(ok){if(G.ended)return;if(typeof metricsEnd==='function')metricsEnd(G.abandoned?'abandoned':G.over==='lose'?'lose':G.rival?(G.score>G.rival.score?'win':G.score<G.rival.score?'lose':'tie'):'finished');stopPickTimer();clearGameInput();G._zeroSaid=0;{const sd=$('#side');if(sd){sd.textContent='';sd.hidden=true}}{const nb=$('#nextboss');if(nb&&G.rival)nb.textContent=L('对决结束','Match over')}if(typeof dirRunEnd==='function')try{dirRunEnd()}catch(_){}
  G.ended=true;const box=$('#endb'),damageTotal=G.spells.reduce((a,s)=>a+s.dmg,0),tot=Math.max(1,damageTotal),max=Math.max(...G.spells.map(s=>s.dmg),1);
  const {meta,gold,tierUp,pk,pkRes,dailyNew,room,record}=settleRunRewards();
  const rows=G.spells.slice().sort((a,b)=>b.dmg-a.dmg).map(s=>{const f=s.els.length===2?L(FUS[fusion(s)][0],FUS[fusion(s)][1]):s.els[0]?LL(ELS[s.els[0]]):'';
    if(SKILL_CAT[s.id]==='defense'&&((s.blocked||0)>0||(s.refl||0)>0)){return `<span>${LL(SPELLS[s.id])} · Lv ${s.lv}<small>${L(` · 挡住 ${Math.round(s.blocked||0)} · 反击 ${s.refl||0} 次 · 反击伤害 ${Math.round(s.dmg)} · ${s.casts} 次`,` · blocked ${Math.round(s.blocked||0)} · ${s.refl||0} rebounds · ${Math.round(s.dmg)} rebound damage · ${s.casts} casts`)}</small></span><div class="bar def"><i style="width:${Math.min(100,(s.blocked||0)/Math.max(1,G.dmgTaken+(s.blocked||0))*100)}%"></i></div><span>${L('防御','defense')}</span>`}
    if((SKILL_CAT[s.id]==='control'||(s.ctrl||0)>20)&&(s.ctrl||0)>0){return `<span>${LL(SPELLS[s.id])} · Lv ${s.lv}<small>${L(` · 控制 ${s.ctrl} 人${s.det?` · 引爆毒伤 ${Math.round(s.det)}`:''}${s.healed?` · 治疗 ${Math.round(s.healed)}`:''} · ${s.casts} 次`,` · controlled ${s.ctrl}${s.det?` · detonated ${Math.round(s.det)} poison`:''}${s.healed?` · healed ${Math.round(s.healed)}`:''} · ${s.casts} casts`)}</small></span><div class="bar"><i style="width:${s.dmg/max*100}%"></i></div><span>${Math.round(s.dmg/tot*100)}%</span>`}
    if(SKILL_CAT[s.id]==='heal'&&(s.healed||0)>0){const eff=s.healed/Math.max(1,s.healed+(s.overheal||0));return `<span>${LL(SPELLS[s.id])} · Lv ${s.lv}<small>${L(` · 治疗 ${Math.round(s.healed)} · 有效 ${Math.round(eff*100)}% · ${s.casts} 次`,` · healed ${Math.round(s.healed)} · ${Math.round(eff*100)}% effective · ${s.casts} casts`)}</small></span><div class="bar heal"><i style="width:${Math.min(100,s.healed/Math.max(1,G.healed||1)*100)}%"></i></div><span>${L('治疗','heal')}</span>`}
    const casts=SPELLS[s.id].auto?'':L(` · ${s.casts} 次 · ${s.casts?Math.round(s.dmg/s.casts):0}/次`,` · ${s.casts} casts · ${s.casts?Math.round(s.dmg/s.casts):0} per cast`);
    return `<span>${LL(SPELLS[s.id])}${f?` · ${f}`:''} · Lv ${s.lv}<small>${casts}</small></span><div class="bar"><i style="width:${s.dmg/max*100}%"></i></div><span>${Math.round(s.dmg/tot*100)}%</span>`}).join('');
  const R=G.rival;
  const cmp=R?`<div class="cmp"><div class="hd"><span></span><b>${L('你','You')}</b><b>${L(R.name[0],R.name[1])}<small> ${LL(CLASSES[R.cls])}</small></b></div>
    ${[[L('分数','Score'),G.score,R.score],[L('击杀','Kills'),G.kills,R.kills],[L('等级','Level'),G.lv,R.lv],[L('总伤害','Damage'),Math.round(damageTotal),Math.round(R.dmgDealt)],[L('倒地','Downs'),G.downs||0,R.downs||0,true]].map(([n,a,b,lower])=>`<div class="r"><span>${n}</span><b class="${(lower?a<b:a>b)?'w':''}">${a}</b><b class="${(lower?b<a:b>a)?'w':''}">${b}</b></div>`).join('')}
    <div class="scbreak"><b>${L('你的得分构成','Your score')}</b> ${(()=>{const sc=G.sc||{kill:0,big:0,ev:0},t=Math.max(1,sc.kill+sc.big+sc.ev);return `<span>${L('小怪','minions')} ${sc.kill} (${Math.round(sc.kill/t*100)}%)</span><span>${L('精英/首领','elites & bosses')} ${sc.big} (${Math.round(sc.big/t*100)}%)</span><span>${L('宝箱/密令/伏击','chests, missions & ambushes')} ${sc.ev} (${Math.round(sc.ev/t*100)}%)</span>`})()}</div>
    ${(()=>{const rs=G.rival&&G.rival.sc;if(!rs)return '';const t=Math.max(1,rs.kill+rs.big);return `<div class="scbreak rival"><b>${L('对手得分构成','Rival score')}</b> <span>${L('小怪','minions')} ${rs.kill} (${Math.round(rs.kill/t*100)}%)</span><span>${L('精英/首领','elites & bosses')} ${rs.big} (${Math.round(rs.big/t*100)}%)</span><span>${L('其中连斩加成','of which streak bonus')} ${rs.streak}</span></div>`})()}
</div>`:'';
  box.innerHTML=`<h2 class="${pkRes||''}">${room?L('对决结束','Match over'):pk?(pkRes==='win'?L('对决胜利','Duel won'):pkRes==='lose'?L('对决落败','Duel lost'):L('对决平手','Duel tied')):G.abandoned?L('已放弃','Abandoned'):DAILY?(dailyNew?L('今日新纪录','New daily best'):L('每日挑战','Daily challenge')):G.retired?L('收官','Cashed out'):record?L('新纪录','New record'):L('败亡','Fallen')}</h2>${ASURA_T?`<p class="sub">${L(`修罗 ${ASURA_T} 层`,`Ascension ${ASURA_T}`)}</p>`:''}
  ${room?'<div id="roomres" class="roomres"></div>':''}
  ${pk?`<p class="result-rank">${L(ladderOf(SAVE.trophies||0)[1],ladderOf(SAVE.trophies||0)[2])} · ${SAVE.trophies||0} 🏆 (${meta?.dT>0?'+':''}${meta?.dT||0}) · ${G.score} : ${R.score}</p>`:''}
  ${room?'':`<div class="rewards"><span class="rw gold">${ICON.misc('gold','#ffd27a','sm')}+${G.runRewardGold}<small>${L('金币','gold')}</small></span>${meta&&meta.xp?`<span class="rw xp">${ICON.misc('crown','#ffe9a0','sm')}+${meta.xp}<small>${L('冒险经验','renown')}</small></span>`:''}${meta&&meta.levelUp?`<span class="rw lv">Lv ${meta.after.lv}<small>${L('升级!','level up!')}</small></span>`:''}</div>`}
  <details class="endmore"><summary>${L('详细数据','Details')}<i></i></summary>  <div class="stat main"><div>${ICON.misc('hourglass','#9fe3f0','sm')}<b>${fmt(G.t)}</b><span>${L('存活','Survived')}</span></div><div>${ICON.misc('crit','#ff6a6a','sm')}<b>${G.kills}</b><span>${L('击杀','Kills')}</span></div><div>${ICON.misc('boss','#ff5a45','sm')}<b>${G.bossSlain}</b><span>${L('首领','Bosses')}</span></div><div>${ICON.misc('burst','#ff9c5a','sm')}<b>×${G.comboMax}</b><span>${L('最高连斩','Best streak')}</span></div></div>
  ${!ok&&G.killer?`<div class="killed"><b>${G.abandoned?L('放弃','Abandoned'):L(`死于 ${G.killer[0]}`,`Killed by ${G.killer[1]}`)}</b></div>`:''}
  ${tierUp?`<div class="nextgoal tier">${L(`修罗 ${ASURA_T+1} 层已开`,`Ascension ${ASURA_T+1} unlocked`)}</div>`:''}
  
<p class="sub">${L(`存活 ${fmt(G.t)} · 斩杀首领 ${G.bossSlain}`,`Survived ${fmt(G.t)} · ${G.bossSlain} boss${G.bossSlain===1?'':'es'} slain`)}${ASURA_T?` · ${L('修罗','Ascension')} ${ASURA_T}`:''}${BOSSRUSH?` · ${L('首领连战','Boss rush')}`:''}${G.bossN>=7&&!BOSSRUSH?` · ${L(`第 ${Math.floor(G.bossN/7)+(G.bossN%7?1:0)} 轮`,`cycle ${Math.floor(G.bossN/7)+(G.bossN%7?1:0)}`)}`:''}${(G.ascends||[]).length?` · ${L('进化','Evolved')}: ${G.ascends.map(a=>{const x={storm:['天雷劫','Thunder'],blood:['血战','Blood War'],army:['万军','Ten Thousand'],hollow:['空明','Hollow Mind']}[a]||[a,a];return L(x[0],x[1])}).join('、')}`:''}${G.tribWon?` · ${L(`渡劫 ${G.tribWon} 次`,`${G.tribWon} tribulation${G.tribWon>1?'s':''}`)}`:''}${G.champSlain?` · ${L(`悬赏 ${G.champSlain}`,`${G.champSlain} bount${G.champSlain>1?'ies':'y'}`)}`:''}${G.bountyDone?` · ${L(`挑战 ${G.bountyDone}`,`${G.bountyDone} challenge${G.bountyDone>1?'s':''}`)}`:''}</p>${meta?`<div class="metarow">${meta.ranks.map(([n,zh,en])=>`<span class="td">🏆 ${L(zh,en)}</span>`).join('')}<span>${meta.levelUp?`<b>${L('冒险等级','Renown')} ${meta.after.lv}!</b> ${L(titleFor(meta.after.lv)[1],titleFor(meta.after.lv)[2])}${meta.lvGold?` · +${meta.lvGold} ${L('金','gold')}`:''}`:`Lv ${meta.after.lv} (${meta.after.x}/${meta.after.need})`}</span>${meta.done.map(([t,g])=>`<span class="td">✓ ${L(taskText(t).zh,taskText(t).en)} +${g} ${L('金','gold')}</span>`).join('')}</div>`:''}<div class="stat more"><div>${ICON.misc('awake','#ffd27a','sm')}<b>${G.lv}</b><span>${L('等级','Level')}</span></div><div>${ICON.misc('gold','#ffd27a','sm')}<b class="gold">+${gold}</b><span>${L('金币','Gold')}</span></div><div>${ICON.misc('relic','#c7a4f0','sm')}<b>${G.relics.length}</b><span>${L('法宝','Relics')}</span></div><div>${ICON.misc('knock','#ff6a6a','sm')}<b>${Math.round(G.dmgTaken)}</b><span>${L('承受伤害','Damage taken')}</span></div><div>${ICON.misc('heartplus','#7fc98a','sm')}<b>${Math.round(G.healed||0)}</b><span>${L('治疗量','Healing')}${G.overheal||G.healCapped?`<small> · ${L('溢出','overheal')} ${Math.round((G.overheal||0)+(G.healCapped||0))}</small>`:''}</span></div><div>${ICON.misc('heartplus','#ff6a6a','sm')}<b>${G.minHp===undefined?'—':Math.round(G.minHp*100)+'%'}</b><span>${L('最低生命','Lowest HP')}${G.nearDeath?`<small> · ${L(`濒死 ${G.nearDeath} 次`,`${G.nearDeath}× near death`)}</small>`:''}</span></div><div>${ICON.misc('ward','#9fe3f0','sm')}<b>${Math.round((G.mitigated||0)+(G.skillBlocked||0)+(G.absorbed||0))}</b><span>${L('免去伤害','Prevented')}<small>${L(` 减伤 ${Math.round(G.mitigated||0)} · 技能 ${Math.round(G.skillBlocked||0)} · 护罩 ${Math.round(G.absorbed||0)}`+(G.vulnerable?` · 易伤多受 ${Math.round(G.vulnerable)}`:''),` armour ${Math.round(G.mitigated||0)} · skills ${Math.round(G.skillBlocked||0)} · shield ${Math.round(G.absorbed||0)}`+(G.vulnerable?` · vulnerability +${Math.round(G.vulnerable)}`:''))}</small></span></div><div>${ICON.misc('dash','#9fe3f0','sm')}<b>${G.dodges||0}</b><span>${L('破招/穿招','Parries')}</span></div></div><div class="dmg">${rows}</div>${cmp}</details>${room?'':`<div class="btns"><button class="go big" id="againbtn">${L('再来一局','Play again')}</button><button class="go alt sm" id="buildbtn">${L('换侠客','Change hero')}</button><button class="go alt" id="lobbybtn">${L('返回','Back')}</button></div>`}`;
  $('#end').hidden=false;if(room){roomCheckFinished();renderRoomResults()}else{$('#againbtn').onclick=startRun;$('#lobbybtn').onclick=toLobby;$('#buildbtn').onclick=()=>{toLobby();if(typeof showScreen==='function')showScreen('hero')};$('#againbtn').focus()}
  if(typeof submitRun==='function'&&!room)submitRun(box);
}
function toLobby(){closeCards();$('#end').hidden=true;$('#hud').hidden=true;$('#title').hidden=false;newGame(true,SAVE.cls);demoBoost();renderTitle();if(typeof showScreen==='function')showScreen('menu');SFX.setState('title')}
$('#startbtn').onclick=startRun;
$('#pausebtn').onclick=()=>{togglePause();$('#pausebtn').blur()};
$('#resumebtn').onclick=()=>togglePause();
$('#quitbtn').onclick=()=>{G.paused=false;$('#pause').hidden=true;if(!RIVAL_ON&&!G.room&&G.bossSlain>=1){G.retired=1;G.retireBonus=1;win()}else{G.abandoned=true;lose()}};
function quitLabel(){const q=$('#quitbtn');if(!q||!G)return;const cash=!RIVAL_ON&&!G.room&&G.bossSlain>=1;q.innerHTML=cash?L('收官','Cash out'):L('放弃 · 金币 ×0.5','Abandon · gold ×0.5')}
function syncSound(){
 const m=SFX.muted;
 document.querySelectorAll('#sndbtn').forEach(b=>{b.textContent=m?'🔇':'🔊';b.classList.toggle('off',m)});
 for(const [kind,value] of [['music',SFX.musicVol],['sfx',SFX.sfxVol]]){
  const percent=Math.round(value*100);
  document.querySelectorAll('[data-audio="'+kind+'"]').forEach(el=>el.value=percent);
  document.querySelectorAll('[data-audio-value="'+kind+'"]').forEach(el=>el.textContent=percent+'%');
  const off=kind==='music'?SFX.musicMuted:SFX.sfxMuted;
  document.querySelectorAll('[data-audio-mute="'+kind+'"]').forEach(b=>{b.textContent=off?'🔇':'🔊';b.classList.toggle('off',off);b.setAttribute('aria-pressed',String(off));const name=kind==='music'?L('音乐','Music'):L('音效','Effects');b.setAttribute('aria-label',name+' · '+(off?L('开启','Unmute'):L('静音','Mute'))) });
 }
}
document.querySelectorAll('#sndbtn').forEach(b=>b.onclick=()=>{SFX.start();SFX.toggleMute();syncSound();b.blur()});
document.querySelectorAll('[data-audio]').forEach(el=>el.oninput=()=>{
 SFX.start();if(el.dataset.audio==='music')SFX.setMusic(el.value/100);else SFX.setSfx(el.value/100);
 syncSound();
});
document.querySelectorAll('[data-audio-mute]').forEach(b=>b.onclick=()=>{SFX.start();if(b.dataset.audioMute==='music')SFX.toggleMusicMute();else SFX.toggleSfxMute();syncSound()});
syncSound();
if(window.desktop){$('#exitbtn').hidden=false;$('#exitbtn').onclick=()=>window.desktop.quit()}

/* mobile: no double-tap or pinch zoom (iOS Safari ignores the viewport flag) */
(()=>{let lastTap=0,lastEl=null;document.addEventListener('touchend',e=>{const n=Date.now(),el=e.target.closest?e.target.closest('button,a,label,input,select'):null;
    if(n-lastTap<320){e.preventDefault();if(el&&el!==lastEl&&el.tagName!=='INPUT'&&el.tagName!=='SELECT')el.click()} // second quick tap on a different control still counts as a tap
    lastTap=n;lastEl=el},{passive:false});
  document.addEventListener('touchstart',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
  ['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
  document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});})();



/* switchLang(l, manual): manual picks are remembered and beat the IP guess from then on */
function langRefresh(){document.querySelectorAll('.langbtn').forEach(x=>x.classList.toggle('on',x.dataset.l===LOC));if(typeof renderLangPick==='function')renderLangPick();
  renderTitle();syncSound();if(typeof renderGear==='function'&&$('#gearov')&&!$('#gearov').hidden)renderGear();if(typeof openLeaderboard==='function'&&!$('#lb').hidden)openLeaderboard();const bn=$('#buildnote');if(bn)bn.textContent=L('版本 ','Build ')+((document.querySelector('meta[name=build]')||{}).content||'dev');if(G&&!G.auto){drawSeals();drawRelics();if(G.paused){renderPauseBuild();quitLabel()}if(G.panel)renderPanel()}if(typeof showTab==='function'&&typeof lobbyTab!=='undefined')showTab(lobbyTab)}
function switchLang(l,manual){if(!LANGS.includes(l))return;setLang(l,()=>{
  if(manual&&!SAVE.nameSet){SAVE.name=randomName();try{localStorage.setItem('sl_name',SAVE.name)}catch(_){}persist()}
  langRefresh();
},!!manual)}
document.querySelectorAll('.langbtn').forEach(b=>{b.classList.toggle('on',b.dataset.l===LOC);b.onclick=()=>{switchLang(b.dataset.l,true);SFX.pick(1)}});
/* language picker on the main menu: globe + the current language in its own script; the list names every language in its own script */
const LANG_NAMES=LOC_NAME;
function renderLangPick(){const cur=$('#langcur'),m=$('#langmenu');if(!cur||!m)return;cur.textContent=LANG_NAMES[LOC]||LOC;
  m.innerHTML=`<small>${L('语言','Language')}</small>`+LANGS.map(l=>`<button type="button" role="option" data-l="${l}" aria-selected="${l===LOC}" class="${l===LOC?'on':''}"><span>${LANG_NAMES[l]}</span>${l===LOC?'<i>✓</i>':''}</button>`).join('');
  m.querySelectorAll('button').forEach(b=>b.onclick=ev=>{ev.stopPropagation();langMenu(false);if(b.dataset.l!==LOC){switchLang(b.dataset.l,true)}SFX.pick(1)})}
function langMenu(open){const m=$('#langmenu'),b=$('#langchip');if(!m||!b)return;m.hidden=!open;b.setAttribute('aria-expanded',open?'true':'false');$('#langpick').classList.toggle('open',open);if(open){const f=m.querySelector('button.on')||m.querySelector('button');if(f)f.focus()}}
{const lc=$('#langchip');if(lc){lc.onclick=ev=>{ev.stopPropagation();langMenu($('#langmenu').hidden);SFX.pick(1)};
  document.addEventListener('click',ev=>{if(!$('#langmenu').hidden&&!ev.target.closest('#langpick'))langMenu(false)});
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!$('#langmenu').hidden){langMenu(false);lc.focus()}});renderLangPick()}}
/* ?lang= has done its job once it is saved: tidy the address bar (other params such as ?room= stay) */
if(LANG_FROM_URL)try{const u=new URL(location.href);u.searchParams.delete('lang');history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(_){}
/* first visit with no pick yet: ask which country the IP is in (two free services, first answer wins), cache it, and switch if it differs.
   Only switches while the player is still on the menus, never mid-run. */
(async function langAuto(){let pick=null,cached=null;try{pick=localStorage.getItem('sl_lang');cached=localStorage.getItem('sl_lang_ip')}catch(_){}
  if(LANGS.includes(pick)||LANGS.includes(cached)||LANG_FROM_URL)return;
  const request=I18N.request;
  const get=(url,key)=>fetch(url,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(j=>j[key]?String(j[key]).toUpperCase():Promise.reject());
  const t=new Promise((_,rej)=>setTimeout(rej,2500));
  let cc=null;try{cc=await Promise.race([Promise.any([get('https://api.country.is/','country'),get('https://get.geojs.io/v1/ip/country.json','country')]),t])}catch(_){return}
  if(request!==I18N.request)return;
  const l=LANG_BY_COUNTRY[cc]||'en';try{localStorage.setItem('sl_lang_ip',l)}catch(_){}
  if(l!==LOC&&(!G||G.auto)&&$('#end').hidden)switchLang(l,false)})();

/* Lobby pages share one visibility rule. */
let lobbyTab='';
function showTab(t){lobbyTab=t;const lb=document.querySelector('#menu .lobby');if(lb){lb.classList.toggle('open',!!t);if(t){lb.scrollTop=0;const ti=$('#lobbytitle');if(ti)ti.textContent=t==='road'?L('冒险','Journey'):t==='ach'?L('成就','Achievements'):L('设置','Settings')}}document.querySelectorAll('.tabbar button[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t));document.querySelectorAll('.lobby .panel').forEach(p=>{const on=p.dataset.p===t||(t==='road'&&['tasks','ach','codex'].includes(p.dataset.p));p.hidden=!on;p.classList.toggle('on',on)});if(t==='road'&&typeof renderRoad==='function')renderRoad()}
document.querySelectorAll('.tabbar button[data-t]').forEach(b=>b.onclick=()=>{showTab(lobbyTab===b.dataset.t?'':b.dataset.t);SFX.pick(1)});
lobbyTab='';showTab('');
{const lbk=$('#lobbyback');if(lbk)lbk.onclick=()=>{showTab('');SFX.pick(1)}}
addEventListener('keydown',e=>{if(e.key==='Escape'&&lobbyTab&&!$('#menu').hidden){showTab('');e.stopPropagation()}},true);
function runSummary(){const C=CLASSES[SAVE.cls]||CLASSES.swordsman;const tsel=(SAVE.mode==='solo'||SAVE.mode==='rush')?Math.min(SAVE.asura.sel||0,SAVE.asura.max||0):0;return `${LL(C)} · ${LL(SPELLS[weaponOf(SAVE.cls)])} · ${SAVE.mode==='pk'?L('对决','PK'):SAVE.mode==='qpk'?L('打 AI 对手 3′','vs AI 3′'):SAVE.mode==='daily'?L('每日','Daily'):SAVE.mode==='rush'?L('首领连战','Boss rush'):SAVE.mode==='room'?L('多人房间','Room'):L('单人','Solo')}${tsel?` · ${L(`修罗 ${tsel} 层`,`Ascension ${tsel}`)}`:''} · ${LL(MAPS[MAPID])}`}
function renderStatus(){const sb=$('#stickystart');if(sb)sb.querySelector('small').textContent=runSummary();const rs=$('#runsummary');if(rs)rs.textContent=runSummary();
  document.querySelectorAll('#mode button,#diff button,[data-q],.langbtn,.tabbar button[data-t],.cls,.wp,.mapb').forEach(b=>b.setAttribute('aria-pressed',b.classList.contains('on')||b.classList.contains('sel')?'true':'false'));
}


$('#stickybtn').onclick=startRun;
document.querySelectorAll('#opp button').forEach(b=>b.onclick=()=>{SAVE.mode=b.dataset.o;persist();renderTitle();SFX.pick(1)});

if(IS_TOUCH){const tg=document.querySelector('#title .tag');if(tg)tg.innerHTML=L('拖动移动,点图标出招。','Drag to move, tap to cast.')}

/* next-run goal: one concrete suggestion from this run's numbers, never generic cheer */
/* the closest unearned achievement, measured against this run, with what it unlocks */
/* fullscreen (Android / desktop browsers; iOS only via Add to Home Screen) */
function goFullscreen(quiet){const el=document.documentElement;if(document.fullscreenElement)return;const f=el.requestFullscreen||el.webkitRequestFullscreen;if(!f){if(!quiet)showBanner('全屏不可用','Fullscreen unavailable',1.2);return}try{const p=f.call(el,{navigationUI:'hide'});if(p&&p.catch)p.catch(()=>{})}catch(_){}}
const fsb=$('#fsbtn');if(fsb)fsb.onclick=()=>goFullscreen(false);
/* update check: GitHub Pages caches index.html for 10 minutes; if a newer build is live, offer a reload */
(async()=>{const mine=(document.querySelector('meta[name=build]')||{}).content||'dev';if(mine==='dev'||location.protocol==='file:')return;const note=$('#buildnote');if(note)note.textContent=L('版本 ','Build ')+mine;
  try{const r=await fetch(location.pathname.replace(/[^/]*$/,'')+'index.html?nocache='+Date.now(),{cache:'no-store'});const t=await r.text();const m=t.match(/name="build" content="([^"]+)"/);if(m&&m[1]!==mine){const b=document.createElement('button');b.type='button';b.className='go';b.id='updbtn';b.textContent=L('更新','Update');b.onclick=()=>location.reload(true);document.body.appendChild(b)}}catch(_){}})();
/* while the card screen is up on a phone, the sound button must not cover the cards */
new MutationObserver(()=>{document.body.classList.toggle('picking',!$('#cards').hidden)}).observe($('#cards'),{attributes:true,attributeFilter:['hidden']});

/* touch layout (Diablo Immortal / Wild Rift style): left thumb moves, right thumb has a big dash button with the skills in an arc around it */
if(IS_TOUCH){document.body.classList.add('touchhud');const vb=$('#vbars');if(vb)vb.hidden=false}

/* the title writes itself in, one brush stroke per character, then a slow gold glint runs through it */
(()=>{const h=document.querySelector('#menu .entitle');if(h&&!h.dataset.ink){h.dataset.ink=1;const t=h.textContent.trim();h.setAttribute('aria-label',t);h.textContent='';[...t].forEach((ch,i)=>{const sp=document.createElement('span');sp.textContent=ch===' '?'\u00a0':ch;sp.style.setProperty('--i',i);sp.setAttribute('aria-hidden','true');h.appendChild(sp)})}})();
document.querySelectorAll('#menu .vname').forEach(v=>{if(v.dataset.ink)return;v.dataset.ink=1;const t=v.textContent.trim();v.setAttribute('aria-label',t);v.textContent='';let i=0;t.split(' ').forEach(w=>{const box=v.classList.contains('ven')?document.createElement('div'):v;if(box!==v){box.className='w';v.appendChild(box)}[...w].forEach(ch=>{const sp=document.createElement('span');sp.textContent=ch;sp.style.setProperty('--i',i++);sp.setAttribute('aria-hidden','true');box.appendChild(sp)})})});
/* feedback mail: pre-fill the subject and a few lines that help reproduce a problem */
{const fb=$('#fbmail');if(fb)fb.addEventListener('click',()=>{try{const v=(document.querySelector('meta[name=version]')||{}).content||'';const body=[L('想说的话:','What happened / what you would like:'),'','','—',`${location.href.split('?')[0]} ${v}`,`${LANG} · ${navigator.userAgent}`,`${L('侠客','Hero')}: ${SAVE.cls} · Lv ${typeof accountLv==='function'?accountLv().lv:''}`].join('\n');
  fb.href=`mailto:harryyang.hk@gmail.com?subject=${encodeURIComponent(L('魔咒军团 反馈','Spell Legion feedback'))}&body=${encodeURIComponent(body)}`}catch(_){}})}
