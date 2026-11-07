'use strict';
/* build.js — build depth and card flow.
   1. 变式 Variants: at skill Lv 6 a skill picks one of three mutually exclusive transformations that change how it plays.
   2. 羁绊 Bonds: two skills both at Lv 5 can be bound together (one fires the other, or they share elements and levels).
   3. Staged unlocks: a new player meets a few card kinds first; elements, augments, pacts, variants and bonds open with account level.
   4. 封禁 Banish: remove an option from the pool for the rest of the run (one charge, +1 per boss).
   5. Golden chests spin a roulette that pays 1, 3 or 5 extra rewards.
   6. Card tags: a short line on a card when it fits what the build already does. */

/* ---------- 1. variants ---------- */
function crowdPoint(R=260){const P=G.P;let best=null,bn=-1,n=0;for(const e of G.en){if(e.dead||e.type==='statue')continue;if(hyp(e.x-P.x,e.y-P.y)>R)continue;if(n++>40)break;let c=0;near(e.x,e.y,60,o=>{if(!o.dead&&hyp(o.x-e.x,o.y-e.y)<60)c++});if(c>bn){bn=c;best=e}}return best}
const VARIANTS={
  echo:{zh:'残影诀',en:'Afterimage',d:'每次出手 0.35 秒后重放一次(六成伤害);出手慢 15%',de:'Every use repeats 0.35 s later at 60% damage; 15% slower',ap(s){s.vcd*=1.15},fire(s){later(.35,()=>freeFire(s,.6))}},
  field:{zh:'化域诀',en:'Domain',d:'每次出手在最近的敌群留下 3 秒伤害领域',de:'Every use leaves a 3 s damage field on the nearest crowd',fire(s){const t=crowdPoint();if(!t)return;const st=stat(s);pool(t.x,t.y,34*Math.min(1.8,st.size),3,(SPELLS[s.id].auto?7:4)*st.m,s)}},
  storm:{zh:'引雷诀',en:'Thunder Call',d:'每次出手对附近三名敌人降雷(各五成伤害)',de:'Every use calls lightning on three nearby foes (50% damage each)',fire(s){const st=stat(s),P=G.P,hs=[];near(P.x,P.y,240,e=>{if(hs.length<3&&!e.dead&&e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<240)hs.push(e)});for(const e of hs){hit(e,(SPELLS[s.id].auto?11:6)*st.m,s,true,'#ffe066');ring(e.x,e.y,16,'#ffe066');spark(e.x,e.y,'#ffe066',5,110)}}},
  nova:{zh:'爆体诀',en:'Bursting',d:'此武学击杀的敌人炸开,伤及周围(四成伤害)',de:'Enemies it kills explode, hurting those nearby (40%)',kill(e,s){if(e.type==='boss')return;const st=stat(s),x=e.x,y=e.y;later(.04,()=>aoe(x,y,30*Math.min(1.6,st.size),(SPELLS[s.id].auto?9:5)*st.m,s,SPELLS[s.id].col,true,{quiet:1}))}},
  focus:{zh:'归一诀',en:'Unity',d:'伤害 ×2.2,范围 +30%;出手慢 60%',de:'×2.2 damage and +30% area; 60% slower',ap(s){s.vm*=2.2;s.vsz*=1.3;s.vcd*=1.6}},
  torrent:{zh:'连绵诀',en:'Torrent',d:'出手快一倍;伤害 -40%,内力消耗 -40%',de:'Twice as fast; -40% damage, -40% qi cost',ap(s){s.vcd*=.5;s.vm*=.6;s.vcost=.6}},
  guard:{zh:'护体诀',en:'Guarding',d:'出手时获得 0.8 秒护罩(普攻每 5 秒一次)',de:'Using it grants a 0.8 s shield (every 5 s for the normal attack)',fire(s){const P=G.P;if(SPELLS[s.id].auto&&G.t-(s.gT||-9)<5)return;s.gT=G.t;P.shield=Math.max(P.shield,.8);P.shieldHp=undefined;ring(P.x,P.y,26,'#7dffb0')}},
  drain:{zh:'吸星诀',en:'Star Drain',d:'命中回复内力;此武学击杀回复 0.5% 生命',de:'Hits restore qi; kills with it heal 0.5% HP',hit(e,m,s){const P=G.P;P.mana=Math.min(P.maxMana,P.mana+(SPELLS[s.id].auto?.6:1.5))},kill(e,s){heal(G.P.maxHp*.005,s)}},
  pierce:{zh:'穿云诀',en:'Cloudpierce',d:'+1 数量,+2 穿透;伤害 -15%',de:'+1 projectile and +2 pierce; -15% damage',only:['ranged'],ap(s){s.vn+=1;s.vp+=2;s.vm*=.85}},
  giantk:{zh:'千钧诀',en:'Thousand-weight',d:'击退 ×2,命中的敌人减速 1 秒;伤害 +15%',de:'Double knockback, hits slow for 1 s; +15% damage',only:['melee','control','summon'],ap(s){s.vm*=1.15},hit(e,m,s){e.slow=Math.max(e.slow||0,1)}},
};
function variantOpts(s){const cat=SKILL_CAT[s.id],ks=Object.keys(VARIANTS).filter(k=>!VARIANTS[k].only||VARIANTS[k].only.includes(cat));
  // a stable trio per skill (so players can learn and plan), varied by run seed among the eligible
  let h=0;for(const c of s.id+(G.cls||''))h=(h*31+c.charCodeAt(0))|0;const r=taskSeedRng(h+(G.day||0));return ks.sort(()=>r()-.5).slice(0,3)}
function setVariant(s,k){s.vari=k;s.vm=1;s.vcd=1;s.vsz=1;s.vn=0;s.vp=0;s.vcost=1;const V=VARIANTS[k];if(V.ap)V.ap(s)}
(()=>{const sc=skillCost;skillCost=function(s){return Math.round(sc(s)*(s&&s.vcost||1))}})();
xOn('fire',s=>{const V=s&&s.vari&&VARIANTS[s.vari];if(V&&V.fire)V.fire(s)});
xOn('cast',s=>{const V=s&&s.vari&&VARIANTS[s.vari];if(V&&V.fire)V.fire(s)});
xOn('hit',(e,m,s)=>{const V=s&&s.vari&&VARIANTS[s.vari];if(V&&V.hit)V.hit(e,m,s);return m});
xOn('kill',(e,s)=>{const V=s&&s.vari&&VARIANTS[s.vari];if(V&&V.kill&&!G.creditOff)V.kill(e,s)});
(()=>{const lu=levelUp;levelUp=function(s,n){const before=s.lv;lu(s,n);if(G&&!G.auto&&s.owner!=='rival'&&!s.vari&&before<6&&s.lv>=6&&kindOpen('variant')&&G.spells.includes(s))G.picks.unshift({kind:'variant',s})}})();

/* ---------- 2. bonds ---------- */
const BOND_KINDS={
  proc:{zh:'合击',en:'Combined Strike',d:'「{a}」命中有 8% 几率顺势放出「{b}」(七成伤害;越重的武学间隔越长)',de:'{a} hits have an 8% chance to unleash {b} at 70% (heavier skills recharge longer)'},
  share:{zh:'同修',en:'Shared Cultivation',d:'「{b}」获得「{a}」的真气,两门各 +2 级',de:'{b} gains {a}\'s elements; both gain +2 levels'},
};
function bondKey(a,b){return [a.id,b.id].sort().join('+')}
xOn('tick',dt=>{G._bondT=(G._bondT||0)+dt;if(G._bondT<1)return;G._bondT=0;if(!kindOpen('bond')||G.pick||G.picks.length)return;if(G.t-(G._bondLast||-99)<45)return;
  G.bonds=G.bonds||{};G.bondSeen=G.bondSeen||{};const sp=G.spells;for(let i=0;i<sp.length;i++)for(let j=i+1;j<sp.length;j++){const a=sp[i],b=sp[j];if(a.lv<5||b.lv<5)continue;const k=bondKey(a,b);if(G.bondSeen[k])continue;
    if(Object.values(G.bonds).filter(x=>x).length>=3)return;G.bondSeen[k]=1;G._bondLast=G.t;G.picks.push({kind:'bond',a,b});G.pickHold=.5;showBanner('武学羁绊','Skills resonate: a bond is offered',1.2);return}});
function bondCards(q){const a=q.a,b=q.b,ma=SPELLS[a.id],mb=SPELLS[b.id];
  // the one that fires more often drives the proc
  const [x,y]=(ma.auto||(!mb.auto&&(ma.cd||0)<(mb.cd||0)))?[a,b]:[b,a];const mx=SPELLS[x.id],my=SPELLS[y.id];
  const name=k=>L(`${mx.g}${my.g}${BOND_KINDS[k].zh}`,`${mx.en} & ${my.en}: ${BOND_KINDS[k].en}`);
  const txt=k=>L(BOND_KINDS[k].d.replace('{a}',mx.zh).replace('{b}',my.zh),BOND_KINDS[k].de.replace('{a}',mx.en).replace('{b}',my.en));
  const done=k=>{G.bonds[bondKey(a,b)]={k,x,y};trauma(.4);G.flash=.4;showBanner(`羁绊 · ${mx.g}${my.g}${BOND_KINDS[k].zh}`,`Bond: ${mx.en} & ${my.en}`,1.6);if(typeof SFX!=='undefined')SFX.chest()};
  const out=[{g:mx.g,badge:my.g,c:'#ffb0e0',skill:x.id,n:name('proc'),sub:L('羁绊 · 本局有效','bond · lasts the run'),fx:txt('proc'),fxEn:'',q:RARITY[2],kind:'bond',cat:SKILL_CAT[y.id],a(){done('proc')}}];
  if(x.els.length&&y.els.length<2&&x.els.some(e=>!y.els.includes(e)))out.push({g:my.g,badge:mx.g,c:'#ffb0e0',skill:y.id,n:name('share'),sub:L('羁绊 · 本局有效','bond · lasts the run'),fx:txt('share'),fxEn:'',q:RARITY[2],kind:'bond',cat:SKILL_CAT[y.id],a(){for(const e of x.els)if(!y.els.includes(e)&&y.els.length<2)y.els.push(e);levelUp(x,2);levelUp(y,2);done('share')}});
  else out.push({g:my.g,badge:mx.g,c:'#ffb0e0',skill:y.id,n:L(`${mx.g}${my.g}同修`,`${mx.en} & ${my.en}: Shared Cultivation`),sub:L('羁绊 · 本局有效','bond · lasts the run'),fx:L(`「${mx.zh}」与「${my.zh}」各 +3 级`,`${mx.en} and ${my.en} +3 levels each`),fxEn:'',q:RARITY[2],kind:'bond',cat:SKILL_CAT[y.id],a(){levelUp(x,3);levelUp(y,3);done('share')}});
  out.push({g:'缓',c:'#efe4cd',n:L('暂不结缘','Not now'),sub:'',fx:L('这一对之后不再出现','This pair will not be offered again'),fxEn:'',kind:'passive',cat:'passive',a(){}});
  return out}
xOn('hit',(e,m,s)=>{if(!s||!G.bonds||G._free)return m;for(const k in G.bonds){const B=G.bonds[k];if(!B||B.k!=='proc'||B.x!==s)continue;if(G.t-(B.t||-9)<Math.max(1.5,(SPELLS[B.y.id].cd||2)*.35)||SIMR()>=.08)continue;B.t=G.t;B.n=(B.n||0)+1;const y=B.y;later(.02,()=>freeFire(y,.7))}return m});

/* ---------- 3. staged unlocks ---------- */
const KIND_GATE={element:3,fusion:3,infuse:3,fuse:3,augment:2,aug:2,path:2,contract:5,variant:3,bond:4};
const KIND_NAME={element:['真气灌注','Elements'],augment:['强化','Augments'],path:['流派','Paths'],contract:['契约','Pacts'],variant:['武学变式','Variants'],bond:['武学羁绊','Bonds']};
function kindOpen(k){if(!soloRun())return true;const need=KIND_GATE[k];if(!need)return true;const lv=typeof accountLv==='function'?accountLv().lv:99;return lv>=need||(['element','fusion','infuse','fuse'].includes(k)&&SAVE.ach&&SAVE.ach.boss1)}
/* ---------- 4. banish ---------- */
function cardSig(cd){return (cd.kind||'')+'|'+(cd.skill||'')+'|'+(cd.kind==='tree'?cd.badge:cd.kind==='passive'?cd.g:'')}
(()=>{const bc=buildCards;buildCards=function(q){
  if(q.kind==='variant')return variantCards(q);if(q.kind==='bond')return bondCards(q);
  if(!kindOpen(q.kind)){if(q.kind==='aug'||q.kind==='contract')return bc({kind:'level'});return []}
  let out=bc(q);if(!G||G.auto||!['level'].includes(q.kind)||q.jackpot)return out;
  const banned=G.banned||new Set(),ok=c=>kindOpen(c.kind)&&!banned.has(cardSig(c));
  if(out.every(ok))return out;const keep=out.filter(ok),seen=new Set(keep.map(c=>c.n));
  for(let t=0;t<6&&keep.length<3;t++){const more=bc({...q,exclude:[...(q.exclude||[]),...seen]});for(const c of more){if(keep.length>=3)break;if(ok(c)&&!seen.has(c.n)&&!(c.isNew&&keep.some(k=>k.isNew))){keep.push(c);seen.add(c.n)}}}
  return keep.length?keep:out}})();
function variantCards(q){const s=q.s,m=SPELLS[s.id];return variantOpts(s).map(k=>{const V=VARIANTS[k];return {g:m.g,badge:V.zh[0],c:m.col,skill:s.id,n:L(`${m.zh} · ${V.zh}`,`${m.en} · ${V.en}`),sub:L('变式 · 三选一,不可更改','variant · pick one, it is permanent'),fx:L(V.d,V.de),fxEn:'',q:RARITY[2],cat:SKILL_CAT[s.id],kind:'variant',a(){setVariant(s,k);trauma(.4);G.flash=.4;showBanner(`${m.zh} · ${V.zh}`,`${m.en}: ${V.en}`,1.6);if(typeof SFX!=='undefined')SFX.chest();if(typeof drawSeals==='function')drawSeals()}}})}
Object.assign(KINDS,{variant:['变式','Variant','#ff8ad8','变'],bond:['羁绊','Bond','#ffb0e0','缘']});
Object.assign(KIND_HINT,{variant:['改变这门武学的打法,一局一次','Changes how this skill plays, once per run'],bond:['两门武学结成羁绊','Two skills bound together']});
const KIND_TITLE={variant:q=>[L('武学变式','Skill variant'),LL(SPELLS[q.s.id])],bond:q=>[L('武学羁绊','A bond is offered'),`${LL(SPELLS[q.a.id])} · ${LL(SPELLS[q.b.id])}`]};
xOn('start',()=>{G.banish=1;G.banned=new Set()});
(()=>{const bs=bossSlain;bossSlain=function(e){bs(e);if(G&&!G.auto)G.banish=(G.banish||0)+1}})();
xCss(`
.card .xban{position:absolute;right:6px;bottom:6px;font:700 11px var(--ui);padding:3px 7px;border-radius:999px;border:1px solid #ff8e7a66;background:#1a0b0ecc;color:#ffb3a6;cursor:pointer;z-index:2}
.card .xban:hover{background:#3a1216}
.card .xtag{display:inline-block;margin:4px auto 0;font:700 11px var(--ui);padding:2px 8px;border-radius:999px;background:#2a1d0a;color:#ffd27a;border:1px solid #ffd27a55}
.card .xnew{position:absolute;left:-6px;top:-8px;font:800 11px var(--ui);padding:2px 8px;border-radius:999px;background:#ff5a8a;color:#fff;box-shadow:0 2px 8px #0008;z-index:2}
.card{position:relative}
#roul{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 45%,#2a1a05d0,#0b060ef0)}
#roul[hidden]{display:none}
#roul .rbox{display:grid;gap:14px;justify-items:center;text-align:center}
#roul h2{margin:0;font-family:var(--brush);font-weight:400;font-size:clamp(34px,6vw,56px);color:#ffe9a0;text-shadow:0 0 24px #ffb04a}
#roul .reels{display:flex;gap:10px}
#roul .reel{width:clamp(58px,12vw,92px);height:clamp(78px,15vw,118px);border-radius:12px;border:2px solid #ffd27a;background:#140b07;display:grid;place-items:center;font-family:var(--brush);font-size:clamp(34px,7vw,56px);color:#ffd27a;text-shadow:0 0 18px #ffb04a;box-shadow:inset 0 0 24px #000,0 0 22px #ffb04a55}
#roul .reel.off{opacity:.18;border-color:#5a4a30}
#roul .reel.hit{animation:rpop .35s ease-out}
@keyframes rpop{0%{transform:scale(1.35)}100%{transform:scale(1)}}
#roul .rlist{font:700 15px var(--ui);color:#efe4cd;display:grid;gap:4px;min-height:24px}
#roul small{font:600 13px var(--ui);color:#a99f8d}
`);
const xFirstCard=new Set();
xOn('card',(b,cd,i,q)=>{if(!G||G.auto)return;
  // first time this kind of card is ever shown: a ribbon, so new systems announce themselves
  SAVE.seenK=SAVE.seenK||{};if(cd.kind&&KIND_NAME[cd.kind]&&!SAVE.seenK[cd.kind]){const lv=typeof accountLv==='function'?accountLv().lv:99;if(soloRun()&&lv<=(KIND_GATE[cd.kind]||1)+2){const r=document.createElement('span');r.className='xnew';r.textContent=L('新系统','New');b.appendChild(r)}if(!xFirstCard.has(cd.kind)){xFirstCard.add(cd.kind);setTimeout(()=>{SAVE.seenK[cd.kind]=1;persist(true)},300)}}
  // fit tags
  const tags=[];const top=G.spells.slice().sort((x,y)=>y.dmg-x.dmg)[0];
  if(cd.skill&&top&&top.id===cd.skill&&top.dmg>0&&['level','tree','augment','element','path'].includes(cd.kind))tags.push(L('主力武学','Your top damage'));
  if(cd.kind==='element'){const s=G.spells.find(x=>x.id===cd.skill);if(s&&s.els.length===0)tags.push(L('Lv 14 可再融合','Fuses at Lv 14'))}
  if(cd.kind==='new'&&kindOpen('bond'))tags.push(L('可与现有武学结羁绊','Can bond with your skills'));
  if(cd.kind==='level'&&cd.skill){const s=G.spells.find(x=>x.id===cd.skill);if(s&&!s.vari&&s.lv<6&&s.lv+(cd.q&&cd.q.k!=='common'?3:1)>=6&&kindOpen('variant'))tags.push(L('将解锁变式','Unlocks a variant'))}
  if(tags.length){const t=document.createElement('div');t.className='xtag';t.textContent=tags[0];b.appendChild(t)}
  // banish
  if(q&&q.kind==='level'&&!q.jackpot&&(G.banish||0)>0&&cd.kind!=='path'&&kindOpen('augment')){const x=document.createElement('button');x.type='button';x.className='xban';x.textContent=L(`封禁 (${G.banish})`,`Banish (${G.banish})`);x.title=L('本局不再出现这张卡,并重抽这一手','Remove this option for the run and redraw the hand');
    x.onclick=ev=>{ev.stopPropagation();if(!G.pick||(G.banish||0)<=0)return;G.banish--;G.banned.add(cardSig(cd));const prev=G.pick.map(c=>c.n);G.pick=null;G.picks.unshift({...q,exclude:prev});if(typeof SFX!=='undefined')SFX.throw();openPick();showBanner(L('已封禁','Banished'),'',.7)};b.appendChild(x)}});

/* ---------- 5. golden chest roulette ---------- */
(()=>{const ct=chestTick;chestTick=function(dt){const golds=G.chests.filter(c=>c.kind==='gold'&&!c.dead);ct(dt);if(G.auto)return;for(const c of golds)if(c.dead){roulette();break}}})();
function roulette(){let ov=$('#roul');if(!ov){ov=document.createElement('div');ov.id='roul';ov.hidden=true;document.body.appendChild(ov)}
  const r=SIMR(),n=r<.1?5:r<.45?3:1,G0=G;const GL=['剑','符','卦','雷','金','宝','玉','丹','龙','凤'];
  ov.innerHTML=`<div class="rbox"><h2>${L('金宝箱','Golden chest')}</h2><div class="reels">${[0,1,2,3,4].map(i=>`<div class="reel" id="reel${i}">?</div>`).join('')}</div><div class="rlist" id="rlist"></div><small>${L('点击继续','Tap to continue')}</small></div>`;ov.hidden=false;G.panel=true;G.roul=1;
  if(typeof pickOpenedAt!=='undefined')try{pickOpenedAt=performance.now()+4000}catch(_){}
  const rewards=[];for(let i=0;i<n;i++)rewards.push(rouletteReward());
  const order=n===1?[2]:n===3?[1,2,3]:[0,1,2,3,4];let spin=setInterval(()=>{for(let i=0;i<5;i++){const el=$('#reel'+i);if(el&&!el.dataset.done)el.textContent=GL[Math.floor(Math.random()*GL.length)]}},70);
  if(typeof SFX!=='undefined')SFX.throw();
  const stopAt=(k)=>{const i=order[k],el=$('#reel'+i);if(!el)return;el.dataset.done=1;el.textContent=rewards[k].g;el.classList.add('hit');const li=document.createElement('div');li.textContent=rewards[k].t;$('#rlist').appendChild(li);if(typeof SFX!=='undefined')SFX.pick(1)};
  for(let i=0;i<5;i++)if(!order.includes(i)){setTimeout(()=>{const el=$('#reel'+i);if(el){el.dataset.done=1;el.textContent='·';el.classList.add('off')}},500+i*90)}
  order.forEach((_,k)=>setTimeout(()=>stopAt(k),900+k*380));
  let closed=false;const close=()=>{if(closed)return;closed=true;clearInterval(spin);ov.hidden=true;if(G===G0){G.panel=false;G.roul=0;for(const rw of rewards)rw.a()}if(typeof SFX!=='undefined')(n>=3?SFX.chest():SFX.pick(1))};
  setTimeout(()=>{clearInterval(spin);if(n>=5){showBanner('五连!','JACKPOT ×5',1.2)}},900+n*380);
  setTimeout(()=>{ov.onclick=close},900+n*380+200);setTimeout(close,900+n*380+2600)}
function rouletteReward(){const opts=[];const sp=G.spells.filter(s=>s.lv<40);
  if(sp.length){const s=pick(sp),m=SPELLS[s.id];opts.push({g:m.g,t:L(`${m.zh} +2 级`,`${m.en} +2 levels`),a(){levelUp(s,2)}})}
  const p=pick(PERKS);opts.push({g:p.g,t:L(`${p.zh}:${p.d}`,`${p.en}: ${p.de}`),a(){p.a(G.P)}});
  opts.push({g:'金',t:L('金币 +80','+80 gold'),a(){G.goldRun+=80}});
  opts.push({g:'宝',t:L('一件法宝','A relic'),a(){dropRelic(G.P.x+20,G.P.y)}});
  if(typeof gearOn==='function'&&gearOn())opts.push({g:'装',t:L('一件装备(精品以上)','A piece of gear (rare or better)'),a(){dropGear(G.P.x-20,G.P.y,{min:2})}});
  return pick(opts)}
