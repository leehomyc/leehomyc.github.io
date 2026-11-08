'use strict';
/* gear.js — solo loot, equipment upgrades and legacy training.
   - Four slots. Items drop from bosses, the Warlord, bounty champions, chests, elites and (rarely) anything.
   - Rarity colours a light beam on the ground; legendaries carry a unique power that changes how the build plays.
   - Equipped gear applies once at run start in solo and duels. Legacy training remains solo-only.
   - Survival time and bosses slain determine item tier and rarity; Ascension remains a separate challenge. */
const GEAR_SLOTS={weapon:{zh:'兵器',en:'Weapon',g:'兵'},armor:{zh:'护甲',en:'Armour',g:'甲'},trinket:{zh:'饰物',en:'Trinket',g:'饰'},manual:{zh:'秘籍',en:'Manual',g:'籍'}};
const GEAR_RAR=[{k:'common',zh:'凡品',en:'Common',col:'#cfc6b2',n:1,m:.85,w:46},{k:'fine',zh:'良品',en:'Fine',col:'#6fb8ff',n:2,m:1,w:32},{k:'rare',zh:'精品',en:'Rare',col:'#ffd75a',n:3,m:1.12,w:15},{k:'epic',zh:'绝品',en:'Epic',col:'#c7a4f0',n:4,m:1.25,w:5.5},{k:'legend',zh:'传说',en:'Legendary',col:'#ff9c3a',n:3,m:1.3,w:1.5}];
/* affixes: b = base value at item tier 1; cap = per-item ceiling; x = handled at hit time rather than on the hero's stats */
const GEAR_AFX={
  dmg:{zh:'伤害 +{v}%',en:'+{v}% damage',b:3,slots:['weapon','trinket','manual'],pre:['破军','Warbreaker'],ap(P,v){P.dmg*=1+v/100}},
  crit:{zh:'暴击 +{v}%',en:'+{v}% crit chance',b:1.6,cap:12,slots:['weapon','trinket'],pre:['夺命','Deathmark'],ap(P,v){P.crit+=v/100}},
  hp:{zh:'生命 +{v}',en:'+{v} max HP',b:9,slots:['armor','trinket'],pre:['长生','Everlife'],ap(P,v){P.maxHp+=Math.round(v);P.hp+=Math.round(v)}},
  def:{zh:'受到伤害 -{v}%',en:'{v}% less damage taken',b:1.6,cap:12,slots:['armor'],pre:['金刚','Adamant'],ap(P,v){P.def*=1-v/100}},
  haste:{zh:'冷却 -{v}%',en:'-{v}% cooldowns',b:1.6,cap:15,slots:['manual','trinket'],pre:['迅雷','Swift-thunder'],ap(P,v){P.haste/=1-v/100}},
  regen:{zh:'内力回复 +{v}%',en:'+{v}% qi regen',b:5,slots:['manual','armor'],pre:['归元','Wellspring'],ap(P,v){P.regen*=1+v/100}},
  spd:{zh:'移速 +{v}%',en:'+{v}% move speed',b:1.6,cap:12,slots:['armor','trinket'],pre:['追风','Windchaser'],ap(P,v){P.spd*=1+v/100}},
  mag:{zh:'拾取范围 +{v}%',en:'+{v}% pickup range',b:7,slots:['trinket'],pre:['纳物','Lodestone'],ap(P,v){P.mag*=1+v/100}},
  skill:{zh:'武学伤害 +{v}%',en:'+{v}% skill damage',b:4.5,slots:['manual','weapon'],pre:['玄妙','Arcane'],x:1},
  auto:{zh:'普攻伤害 +{v}%',en:'+{v}% normal-attack damage',b:4.5,slots:['weapon'],pre:['连环','Chained'],x:1},
  boss:{zh:'对首领伤害 +{v}%',en:'+{v}% damage to bosses',b:5,slots:['weapon','trinket'],pre:['屠魔','Demonslayer'],x:1},
  elite:{zh:'对精英伤害 +{v}%',en:'+{v}% damage to elites',b:6,slots:['weapon','manual'],pre:['斩将','Captain-killer'],x:1},
  life:{zh:'吸血 {v}%',en:'{v}% lifesteal',b:.5,cap:3,slots:['weapon','armor'],pre:['饮血','Bloodthirsty'],x:1},
  gold:{zh:'金币 +{v}%',en:'+{v}% gold',b:6,slots:['trinket'],pre:['招财','Fortune'],x:1},
  xp:{zh:'经验 +{v}%',en:'+{v}% XP',b:4,slots:['manual','trinket'],pre:['悟道','Insight'],x:1},
  fire:{zh:'烈火武学 +{v}%',en:'+{v}% to fire skills',b:7,slots:['weapon','manual'],pre:['烈焰','Blazing'],x:1,el:1},
  ice:{zh:'寒冰武学 +{v}%',en:'+{v}% to ice skills',b:7,slots:['weapon','manual'],pre:['寒霜','Frostbound'],x:1,el:1},
  lightning:{zh:'紫电武学 +{v}%',en:'+{v}% to lightning skills',b:7,slots:['weapon','manual'],pre:['雷霆','Thundering'],x:1,el:1},
  acid:{zh:'毒性武学 +{v}%',en:'+{v}% to poison skills',b:7,slots:['weapon','manual'],pre:['剧毒','Venomous'],x:1,el:1},
  dark:{zh:'幽冥武学 +{v}%',en:'+{v}% to nether skills',b:7,slots:['weapon','manual'],pre:['幽冥','Nether'],x:1,el:1},
};
const GEAR_BASE={weapon:[['青锋剑','Azure Blade'],['雁翎刀','Wild-goose Sabre'],['梨花枪','Pear-blossom Spear'],['铁骨扇','Iron Fan'],['齐眉棍','Brow-high Staff'],['判官笔','Judge\'s Brush']],
  armor:[['软猬甲','Hedgehog Vest'],['锁子甲','Chain Coat'],['青布衫','Blue Robe'],['八卦袍','Trigram Robe'],['百衲衣','Patchwork Habit'],['鱼鳞甲','Fish-scale Mail']],
  trinket:[['羊脂玉佩','Mutton-fat Jade'],['驱虫香囊','Herb Sachet'],['菩提念珠','Bodhi Beads'],['青铜铃','Bronze Bell'],['护身符','Amulet'],['翡翠扳指','Jade Ring']],
  manual:[['拳经残卷','Fist Scroll'],['剑谱','Sword Manual'],['吐纳图','Breathing Chart'],['刀诀','Blade Verses'],['琴谱','Qin Score'],['百草经','Herbal Canon']]};
// Generated names need their known prefix and base translated separately.
// Keep English item names, saved stats and IDs intact.
function gearName(it){
  const zh=String(it?.zh||it?.en||''),en=String(it?.en||it?.zh||'');
  if(typeof LOC!=='undefined'&&(LOC==='ja'||LOC==='ko'))for(const bases of Object.values(GEAR_BASE))for(const base of bases){
    const suffix=' '+base[1];if(!en.endsWith(suffix))continue;const pre=en.slice(0,-suffix.length);
    if(Object.values(GEAR_AFX).some(a=>a.pre[1]===pre))return tr(pre)+' '+tr(base[1]);
  }
  return L(zh,en);
}
/* legendaries: a fixed name and a power that changes play, not only numbers */
const GEAR_LEG={
  chixiao:{slot:'weapon',zh:'赤霄剑',en:'Chixiao',d:'普攻带上烈火真气;燃烧的敌人受到的伤害 +25%',de:'Your normal attack carries Fire; burning enemies take +25% damage'},
  chengying:{slot:'weapon',zh:'承影剑',en:'Chengying',d:'普攻每第四次出手,0.3 秒后再出一次影击(满伤害)',de:'Every fourth normal attack repeats as a shadow strike 0.3 s later, at full damage'},
  zhanlu:{slot:'weapon',zh:'湛卢剑',en:'Zhanlu',d:'暴击时 35% 几率引下一道雷,造成 60% 伤害',de:'Crits have a 35% chance to call lightning for 60% damage'},
  yuchang:{slot:'weapon',zh:'鱼肠剑',en:'Fish-gut Dagger',d:'对生命高于 90% 的敌人伤害 ×2',de:'Double damage to enemies above 90% HP'},
  jinlv:{slot:'armor',zh:'金缕衣',en:'Gold-thread Robe',d:'生命跌破三成时,获得 2.5 秒金身(每 45 秒一次)',de:'Dropping below 30% HP grants 2.5 s of invulnerability (every 45 s)'},
  xuanwu:{slot:'armor',zh:'玄武甲',en:'Black Tortoise Mail',d:'被击时震开周围敌人并造成伤害(1.5 秒一次)',de:'When hit, a shockwave knocks back and damages nearby enemies (every 1.5 s)'},
  tiancan:{slot:'armor',zh:'天蚕衣',en:'Silkworm Robe',d:'轻功冷却 -30%;冲刺落点震伤周围敌人',de:'Dash cooldown -30%; each dash ends in a damaging burst'},
  juhun:{slot:'trinket',zh:'聚魂幡',en:'Soul Banner',d:'每击杀 100 名敌人,伤害 +1%(本局,最多 +40%)',de:'+1% damage per 100 kills this run (up to +40%)'},
  qiankun:{slot:'trinket',zh:'乾坤袋',en:'Bag of Heaven and Earth',d:'拾取范围 ×2,经验 +15%',de:'Pickup range ×2, +15% XP'},
  puti:{slot:'trinket',zh:'血菩提',en:'Blood Bodhi',d:'击杀精英回复 4% 生命',de:'Killing an elite heals 4% of max HP'},
  yijin:{slot:'manual',zh:'易筋经',en:'Sinew Classic',d:'施放武学后 3 秒内,普攻出手快 50%',de:'For 3 s after you cast a skill, the normal attack fires 50% faster'},
  jiuyin:{slot:'manual',zh:'九阴真经',en:'Nine Yin Manual',d:'内力九成以上时,武学伤害 +30%;武学击杀回复 2 内力',de:'Skills deal +30% while qi is above 90%; skill kills restore 2 qi'},
  beiming:{slot:'manual',zh:'北冥神功',en:'Northern Abyss Art',d:'武学命中有 4% 几率立刻刷新它的冷却',de:'Skill hits have a 4% chance to reset that skill\'s cooldown'},
};
// The former class legendary attacks are now weapon drops, with no separate unlock counter.
for(const cls in WEAPONS)for(const w of WEAPONS[cls])if(WEAPON_INFO[w]?.need==='legend'){
  const m=SPELLS[w];GEAR_LEG['hero_'+w]={slot:'weapon',cls,weapon:w,zh:m.zh,en:m.en,d:`${CLASSES[cls].zh}专属普攻:${m.d}`,de:`${CLASSES[cls].en} attack: ${m.de}`};
}
const GEAR_INV_MAX=40;
function gearSave(){SAVE.gear=SAVE.gear||{inv:[],eq:{},pity:0,seq:0,found:0};const g=SAVE.gear;g.inv=g.inv||[];g.eq=g.eq||{};g.removed=g.removed||{};return g}
function gearChanged(it){const g=gearSave();g.ts=Date.now();if(it)it.ts=g.ts;persist();if(typeof roomSyncEquipment==='function')roomSyncEquipment()}
function gearRemove(it){const g=gearSave();g.removed[it.id]=Date.now();g.inv=g.inv.filter(x=>x.id!==it.id);g.ts=Date.now()}
function gearById(id){return gearSave().inv.find(x=>x.id===id)}
function gearWeaponFor(cls){const it=gearById(gearSave().eq.weapon),leg=it&&GEAR_LEG[it.leg];return leg&&leg.cls===cls?leg.weapon:null}
function gearMigrateLegends(){
  const g=gearSave();SAVE.legendMigrated=SAVE.legendMigrated||{};let changed=false;
  for(const k in GEAR_LEG){const leg=GEAR_LEG[k];if(!leg.weapon||SAVE.legendMigrated[leg.weapon])continue;
    if(!SAVE.weaponOwned?.[leg.weapon]&&(SAVE.clsBest?.[leg.cls]||0)<3)continue;
    SAVE.legendMigrated[leg.weapon]=1;const id='legacy-legend-'+leg.weapon;
    if(!g.removed[id]&&!g.inv.some(x=>x.id===id)){const it=makeGear({rar:4,leg:k,tier:1});it.id=id;it.lock=true;g.inv.push(it);g.found=(g.found||0)+1;if(SAVE.weapon?.[leg.cls]===leg.weapon&&!g.eq.weapon)g.eq.weapon=id}changed=true;
  }
  if(changed)gearChanged();
}
function gearEquipped(){const g=gearSave(),out=[];for(const k in GEAR_SLOTS){const it=g.eq[k]&&gearById(g.eq[k]);if(it)out.push(it)}return out}
/* Item quality follows time survived and credited boss kills, independent of Ascension. */
function gearDepth(){return Math.floor((G?.t||0)/300)+Math.floor((G?.bossSlain||0)/2)}
function gearTierNow(){return 1+gearDepth()}
function rollGearRar(min){const t=gearDepth(),w=GEAR_RAR.map((r,i)=>i<min?0:r.w*(i>=3?1+t*.12:1));let r=rnd(w.reduce((a,b)=>a+b,0));for(let i=0;i<w.length;i++){if(r<w[i])return i;r-=w[i]}return 0}
function gearVal(k,tier,rm){const A=GEAR_AFX[k];let v=A.b*(1+(tier-1)*.22)*rm*rnd(.75,1.15);if(A.cap)v=Math.min(A.cap,v);return v<3?Math.round(v*10)/10:Math.round(v)}
function makeGear(opts={}){const g=gearSave();let ri=opts.rar!==undefined?opts.rar:rollGearRar(opts.min||0);
  g.pity=(g.pity||0)+1;if(ri<4&&g.pity>=45){ri=4} if(ri===4)g.pity=0;
  const R=GEAR_RAR[ri],tier=opts.tier||gearTierNow();let slot=opts.slot,leg=null;
  if(ri===4){const keys=Object.keys(GEAR_LEG).filter(k=>!slot||GEAR_LEG[k].slot===slot);leg=opts.leg||pick(keys);slot=GEAR_LEG[leg].slot}
  slot=slot||pick(Object.keys(GEAR_SLOTS));
  const pool=Object.keys(GEAR_AFX).filter(k=>GEAR_AFX[k].slots.includes(slot)),afx=[];
  const n=R.n;const sh=pool.slice().sort(()=>rnd()-.5);for(let i=0;i<n&&i<sh.length;i++)afx.push({k:sh[i],v:gearVal(sh[i],tier,R.m)});
  const base=pick(GEAR_BASE[slot]),top=GEAR_AFX[afx[0].k];
  const it={id:'g'+Date.now().toString(36)+(g.seq=(g.seq||0)+1),slot,r:ri,t:tier,a:afx,leg,zh:leg?GEAR_LEG[leg].zh:`${top.pre[0]}·${base[0]}`,en:leg?GEAR_LEG[leg].en:`${top.pre[1]} ${base[1]}`,new:1};
  return it}
const GEAR_UPGRADE_MAX=20;
function gearUpgradeLevel(it){const n=Number(it?.enhance||0);return Number.isFinite(n)?Math.max(0,Math.min(GEAR_UPGRADE_MAX,Math.floor(n))):0}
function gearAffixes(it,level=gearUpgradeLevel(it)){
  return (it?.a||[]).filter(a=>GEAR_AFX[a.k]&&Number.isFinite(a.v)).map(a=>{
    const A=GEAR_AFX[a.k],step=a.k==='hp'?Math.max(1,Math.round(a.v*.02)):a.v*.02;
    let v=Math.round((a.v+step*level)*100)/100;
    if(A.cap)v=Math.min(A.cap,v);
    return {k:a.k,v};
  });
}
function gearUpgradeCost(it){return Math.ceil(10000*Math.pow(1.5,gearUpgradeLevel(it))/100)*100}
function gearCanUpgrade(it){if(!it||gearUpgradeLevel(it)>=GEAR_UPGRADE_MAX)return false;const now=gearAffixes(it),next=gearAffixes(it,gearUpgradeLevel(it)+1);return next.some((a,i)=>a.v>now[i].v)}
function buyGearUpgrade(id){
  const it=gearById(id);if(!gearCanUpgrade(it))return false;
  const cost=gearUpgradeCost(it);if(!Number.isFinite(SAVE.gold)||SAVE.gold<cost)return false;
  SAVE.gold-=cost;it.enhance=gearUpgradeLevel(it)+1;gearChanged(it);return true;
}
function gearUpgradeLabel(it){const n=gearUpgradeLevel(it);return n?` +${n}`:''}
/* a single number for comparing two items of the same slot */
function gearScore(it){if(!it)return 0;let s=0;for(const a of gearAffixes(it))s+=a.v/GEAR_AFX[a.k].b;return s*(1+(it.leg?.6:0))}
function afxText(a){const A=GEAR_AFX[a.k];return L(A.zh,A.en).replace('{v}',a.v)}
function gearSalvage(it){return Math.round(12*(GEAR_RAR[it.r].n+(it.r===4?3:0))*(1+it.t*.35))}
/* ---------- dropping and picking up ---------- */
function gearOn(){return soloRun()&&(typeof ASURA_T!=='undefined')&&((SAVE.ach&&SAVE.ach.boss1)||(SAVE.gear&&SAVE.gear.found)||G.bossSlain>0)}
function dropGear(x,y,opts={}){if(!gearOn())return;const it=makeGear(opts);G.fx.push({k:'gear',it,x:clamp(x+rnd(-14,14),40,W-40),y:clamp(y+rnd(-14,14),40,H-40),t:120,T:120});
  const R=GEAR_RAR[it.r];if(it.r>=3&&typeof showSide==='function')showSide(`${R.zh}装备落地 · ${it.zh}`,`${R.en} item dropped · ${it.en}`,R.col,'relic');if(it.r>=3&&typeof SFX!=='undefined')SFX.chest()}
function takeGear(it){
  const g=gearSave();G.gearPicked=G.gearPicked||new Set();
  if(G.gearPicked.has(it.id)||g.inv.some(x=>x.id===it.id)||g.removed[it.id])return false;
  G.gearPicked.add(it.id);g.found=(g.found||0)+1;
  const salvage=item=>{const gold=gearSalvage(item);gearRemove(item);SAVE.gold+=gold;G.gearGold=(G.gearGold||0)+gold};
  if(g.inv.length>=GEAR_INV_MAX){
    const worst=g.inv.filter(x=>!x.lock&&!Object.values(g.eq).includes(x.id)).sort((a,b)=>(a.r-b.r)||(gearScore(a)-gearScore(b)))[0];
    if(worst&&(worst.r<it.r||gearScore(worst)<gearScore(it)))salvage(worst);
    else{salvage(it);gearChanged();return false}
  }
  G.gearFound=G.gearFound||[];G.gearFound.push(it);g.inv.push(it);gearChanged(it);
  const R=GEAR_RAR[it.r],cur=g.eq[it.slot]&&gearById(g.eq[it.slot]),up=gearScore(it)>gearScore(cur);
  if(typeof showSide==='function')showSide(`拾取 ${R.zh} · ${it.zh}${up?' ▲':''}`,`Picked up ${R.en} · ${it.en}${up?' ▲':''}`,R.col,'relic');
  spark(G.P.x,G.P.y,R.col,14,90);if(typeof SFX!=='undefined')(it.r>=3?SFX.chest():SFX.pick(1));return true;
}
xOn('tick',dt=>{const P=G.P;for(const f of G.fx){if(f.k==='gear'&&f.t>0&&P.down<=0&&hyp(f.x-P.x,f.y-P.y)<24*Math.min(3,P.mag)){f.t=0;takeGear(f.it)}}});
xOn('kill',(e,s)=>{if(!gearOn()||G.creditOff)return;
  if(e.type==='boss'){dropGear(e.x,e.y,{min:1});if((G.bossSlain||0)>=3)dropGear(e.x+20,e.y,{min:0})}
  else if(e.warlord||e.champion)dropGear(e.x,e.y,{min:1});
  else if(e.elite){if(rnd()<.05)dropGear(e.x,e.y)}
  else if(rnd()<.0005)dropGear(e.x,e.y)});
/* the chest list is filtered in chestTick right after an opening, so catch the open itself */
(()=>{const ct=chestTick;chestTick=function(dt){const before=G.chests.slice();ct(dt);if(!gearOn())return;for(const c of before)if(c.dead&&!c.gearDone){c.gearDone=1;if(c.kind==='gold')dropGear(c.x,c.y,{min:2});else if(c.kind!=='trap'&&rnd()<.25)dropGear(c.x,c.y)}}})();
/* light beams: height and brightness by rarity */
xOn('render',(tm,useRing)=>{for(const f of G.fx){if(f.k!=='gear'||f.t<=0)continue;const R=GEAR_RAR[f.it.r],h=[40,70,110,170,260][f.it.r],b=.6+f.it.r*.25;
  for(let i=0;i<10;i++){const y=i*h/10+((tm*50)%(h/10));glow(f.x,y+4,f.y,i%2?R.col:'#ffffff',(f.it.r>=3?18:12)-y*.03,(1-y/h)*b)}
  glow(f.x,6,f.y,R.col,f.it.r>=3?60:34,.7+Math.sin(tm*6)*.2);useRing(f.x,1,f.y,12+Math.sin(tm*5)*2,R.col,.8)}});
/* ---------- applying gear to a run ---------- */
function gearApply(P){if(G.gearApplied===P)return;G.gearApplied=P;const gx={skill:0,auto:0,boss:0,elite:0,life:0,el:{},legs:new Set(),gold:0,xp:0};
  for(const it of gearEquipped()){for(const a of gearAffixes(it)){const A=GEAR_AFX[a.k];if(A.ap)A.ap(P,a.v);else if(A.el)gx.el[a.k]=(gx.el[a.k]||0)+a.v;else gx[a.k]=(gx[a.k]||0)+a.v}if(it.leg)gx.legs.add(it.leg)}
  if(gx.gold)G.curse.gold=(G.curse.gold||1)*(1+gx.gold/100);if(gx.xp)G.curse.xp=(G.curse.xp||1)*(1+gx.xp/100);
  if(gx.legs.has('qiankun')){P.mag*=2;G.curse.xp=(G.curse.xp||1)*1.15}
  if(gx.legs.has('chixiao')){const w=G.spells[0];if(w&&!w.els.includes('fire')&&w.els.length<2)w.els.push('fire')}
  G.gx=gx}
const gxL=k=>G.gx&&G.gx.legs.has(k);
xOn('hit',(e,m,s,crit)=>{const gx=G.gx;if(!gx)return m;const P=G.P;let k=1;
  if(s){if(SPELLS[s.id].auto)k+=gx.auto/100;else k+=gx.skill/100;for(const el of s.els||[])if(gx.el[el])k+=gx.el[el]/100}
  if(e.type==='boss')k+=gx.boss/100;else if(e.elite||e.warlord||e.champion)k+=gx.elite/100;
  if(gxL('chixiao')&&e.burn>0)k+=.25;if(gxL('yuchang')&&e.hp>e.maxHp*.9)k+=1;if(gxL('juhun'))k+=Math.min(.4,Math.floor(G.kills/100)*.01);
  if(gxL('jiuyin')&&s&&!SPELLS[s.id].auto&&P.mana>=P.maxMana*.9)k+=.3;
  m*=k;
  if(crit&&gxL('zhanlu')&&rnd()<.35&&!e.dead){const x=e.x,y=e.y;later(.05,()=>{if(!e.dead)hit(e,m*.6,null,true,'#ffe066');ring(x,y,22,'#ffe066');spark(x,y,'#ffe066',8,120)})}
  if(s&&gxL('beiming')&&!SPELLS[s.id].auto&&s.cd>1&&rnd()<.04&&G.t-(G._bmT||0)>1){G._bmT=G.t;s.cd=0;if(G.floats.length<CAP.fl)G.floats.push({x:P.x,y:P.y-34,t:.9,v:L('北冥 · '+SPELLS[s.id].zh+' 刷新','Reset: '+SPELLS[s.id].en),c:'#9fe3f0'})}
  return m});
xOn('damage',(e,n)=>{if(G.gx?.life&&n>0)lifeSteal(n*G.gx.life/100)});
xOn('kill',(e,s)=>{if(!G.gx)return;const P=G.P;if(gxL('puti')&&(e.elite||e.warlord||e.champion))heal(P.maxHp*.04);if(gxL('jiuyin')&&s&&!SPELLS[s.id].auto)P.mana=Math.min(P.maxMana,P.mana+2)});
xOn('hurt',(n)=>{if(!G.gx)return n;const P=G.P;
  if(gxL('jinlv')&&P.hp-n*Math.max(.4,P.def)<P.maxHp*.3&&G.t-(G._jlT||-99)>45){G._jlT=G.t;grantShield(2.5);ring(P.x,P.y,46,'#ffd27a');showBanner('金缕衣 · 金身','Gold-thread Robe',1);return 0}
  if(gxL('xuanwu')&&G.t-(G._xwT||-9)>1.5){G._xwT=G.t;const d=18*P.dmg*(1+P.dmgBonus)*(1+G.t/300);near(P.x,P.y,70,e=>{if(e.type==='statue')return;const dx=e.x-P.x,dy=e.y-P.y,l=hyp(dx,dy)||1;if(l<70+e.r)hit(e,d,null,true,'#7fc98a',dx/l*260,dy/l*260)});ring(P.x,P.y,66,'#7fc98a')}
  return n});
xOn('fire',s=>{if(!G.gx)return;const w=G.spells[0];if(s!==w)return;
  if(gxL('chengying')){G._cyN=(G._cyN||0)+1;if(G._cyN%4===0)later(.3,()=>freeFire(w,1))}
  if(gxL('yijin')&&G.t<(G._yjT||0))w.cd*=.67});
xOn('cast',()=>{if(gxL('yijin'))G._yjT=G.t+3});
(()=>{const dz=dash;dash=function(){const r=dz();if(r&&G&&G.gx&&gxL('tiancan')&&!G.auto){const P=G.P;P.dashCd*=.7;later(.2,()=>{const d=22*P.dmg*(1+P.dmgBonus)*(1+G.t/300);near(P.x,P.y,60,e=>{if(e.type==='statue')return;const dx=e.x-P.x,dy=e.y-P.y,l=hyp(dx,dy)||1;if(l<60+e.r)hit(e,d,null,true,'#efe4cd',dx/l*200,dy/l*200)});ring(P.x,P.y,58,'#efe4cd')})}return r}})();

/* ---------- legacy training (kept for existing saves) ---------- */
const TRAINING=[
  {id:'ren',zh:'体魄',en:'Vigor',d:'生命 +1% / 级',de:'+1% max HP / rank',ap:(P,n)=>{P.maxHp=Math.round(P.maxHp*(1+.01*n));P.hp=P.maxHp}},
  {id:'du',zh:'锋芒',en:'Edge',d:'伤害 +1% / 级',de:'+1% damage / rank',ap:(P,n)=>{P.dmg*=1+.01*n}},
  {id:'chong',zh:'会心',en:'Precision',d:'暴击 +0.25% / 级',de:'+0.25% crit / rank',max:100,ap:(P,n)=>{P.crit+=.0025*n}},
  {id:'dai',zh:'护体',en:'Guard',d:'受到伤害 -0.3% / 级',de:'-0.3% damage taken / rank',max:50,ap:(P,n)=>{P.def*=1-Math.min(.15,.003*n)}},
  {id:'yinwei',zh:'回气',en:'Qi Flow',d:'内力回复 +1.5% / 级',de:'+1.5% qi regen / rank',ap:(P,n)=>{P.regen*=1+.015*n}},
  {id:'yangwei',zh:'疾攻',en:'Haste',d:'冷却 -0.3% / 级',de:'-0.3% cooldowns / rank',max:50,ap:(P,n)=>{P.haste/=1-Math.min(.15,.003*n)}},
  {id:'yinqiao',zh:'轻功',en:'Footwork',d:'移速 +0.3% / 级',de:'+0.3% speed / rank',max:50,ap:(P,n)=>{P.spd*=1+Math.min(.15,.003*n)}},
  {id:'yangqiao',zh:'财运',en:'Fortune',d:'金币 +1% / 级',de:'+1% gold / rank',ap:(P,n)=>{G.curse.gold=(G.curse.gold||1)*(1+.01*n)}},
];
function trainingSave(){SAVE.training=SAVE.training||{};return SAVE.training}
function trainingTotal(){return TRAINING.reduce((a,x)=>a+(trainingSave()[x.id]||0),0)}
function trainingCost(){return 150+30*trainingTotal()}
function trainingApply(P){const m=trainingSave();for(const x of TRAINING)if(m[x.id])x.ap(P,m[x.id])}
function buyTraining(id){const x=TRAINING.find(x=>x.id===id);if(!x)return false;const m=trainingSave(),n=m[id]||0,c=trainingCost();if(SAVE.gold<c||(x.max&&n>=x.max))return false;SAVE.gold-=c;m[id]=n+1;persist();return true}
function renderTraining(){const el=$('#shop');if(!el)return;const m=trainingSave(),cost=trainingCost();el.hidden=false;
  el.innerHTML=TRAINING.map(x=>{const n=m[x.id]||0,max=x.max&&n>=x.max;return `<button type="button" class="up" data-train="${x.id}" ${max||SAVE.gold<cost?'disabled':''}><b>${L(x.zh,x.en)}</b><span class="rk">Lv ${n}</span><span class="dd">${L(x.d,x.de)}</span><span class="pr">${max?L('已满','Max'):cost+' '+L('金','gold')}</span></button>`}).join('');
  el.querySelectorAll('[data-train]').forEach(b=>b.onclick=()=>{if(!buyTraining(b.dataset.train))return;if(typeof SFX!=='undefined')SFX.complete();renderTitle();renderRoad()});
}
(()=>{const au=applyUpgrades;applyUpgrades=function(P){au(P);trainingApply(P)}})();

/* ---------- the 行囊 panel ---------- */
xCss(`
#gearov .cbox{width:min(100%,980px)}
.gwrap{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:14px}
@media (max-width:720px){.gwrap{grid-template-columns:1fr}}
.geq{display:grid;gap:8px}
.gslot{display:flex;gap:10px;align-items:center;padding:8px 10px;border:1px solid #ffffff1c;border-radius:10px;background:#0c070bcc;cursor:pointer;min-height:58px;text-align:left;color:inherit;font:inherit}
.gslot.on{outline:2px solid var(--brass)}
.gico{width:40px;height:40px;flex:none;border-radius:8px;display:grid;place-items:center;font-family:var(--brush);font-size:24px;line-height:1;color:var(--rc,#cfc6b2);border:1px solid var(--rc,#cfc6b2);background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--rc,#888) 30%,transparent),#0a0609 70%);text-shadow:0 0 10px var(--rc)}
.gslot b{display:block;color:var(--rc,#efe4cd);font-size:14px}.gslot small{display:block;color:#a99f8d;font-size:12px}
.ginv{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:6px;align-content:start}
.gcell{position:relative;aspect-ratio:1;border-radius:8px;border:1px solid var(--rc);background:#0c070bcc;color:var(--rc);font-family:var(--brush);font-size:24px;display:grid;place-items:center;cursor:pointer;padding:0;text-shadow:0 0 10px var(--rc)}
.gico .ic,.gcell .ic{width:28px;height:28px}
.gcell.sel{outline:2px solid #fff}.gcell.eq::after{content:'装';position:absolute;right:2px;top:1px;font:700 10px var(--ui);color:#7dffb0}
html[lang=en] .gcell.eq::after{content:'E'}
html[lang=zh-Hant] .gcell.eq::after{content:'裝'}
html[lang=ja] .gcell.eq::after{content:'装'}
html[lang=ko] .gcell.eq::after{content:'착'}
.gcell.up::before{content:'▲';position:absolute;left:3px;top:1px;font:700 10px var(--ui);color:#7dffb0;text-shadow:none}
.gcell.nw{box-shadow:0 0 0 1px var(--rc),0 0 12px var(--rc)}
.gcell .lk{position:absolute;right:2px;bottom:0;font-size:10px}
.gdet{border:1px solid #ffffff1c;border-radius:10px;padding:10px 12px;background:#0c070bcc;display:grid;gap:6px;margin-top:10px}
.gdet h3{margin:0;font-family:var(--brush);font-weight:400;font-size:26px;color:var(--rc)}
.gdet .meta{font-size:12px;color:#a99f8d}
.gdet ul{margin:0;padding-left:18px;font-size:14px;line-height:1.5}
.gdet .leg{color:#ff9c3a;font-size:14px;font-style:italic}
.gdet .cmp{font-size:12px}.gdet .cmp b.up{color:#7dffb0}.gdet .cmp b.dn{color:#ff8e7a}
.gbtns{display:flex;gap:8px;flex-wrap:wrap}
.gfilt{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.gfilt button{font:700 12px var(--ui);padding:4px 10px;border-radius:999px;border:1px solid #ffffff2a;background:#0c070b;color:#cfc6b2;cursor:pointer}.gfilt button.on{border-color:var(--brass);color:var(--brass)}
.endgear{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0}.endgear span{display:inline-flex;align-items:center;justify-content:center;padding:3px 9px;border-radius:999px;border:1px solid var(--rc);color:var(--rc);font-size:13px;background:#0c070bcc}
`);
let gearSel=null,gearFilt='all';
function gearIcon(it){if(!it)return '·';const key={weapon:'sword',armor:'ward',trinket:'relic',manual:'book'}[it.slot]||'relic';return typeof ICON!=='undefined'?ICON.misc(key,GEAR_RAR[it.r]?.col||'#cfc6b2'):'◆'}
function gearDetail(it){if(!it)return '';const R=GEAR_RAR[it.r],g=gearSave(),cur=g.eq[it.slot]&&gearById(g.eq[it.slot]),isEq=cur&&cur.id===it.id;
  const diff=cur&&!isEq?gearScore(it)-gearScore(cur):0,level=gearUpgradeLevel(it),canUpgrade=gearCanUpgrade(it),cost=gearUpgradeCost(it),current=gearAffixes(it),next=gearAffixes(it,level+1);
  return `<div class="gdet" style="--rc:${R.col}"><h3>${xEsc(gearName(it))}${gearUpgradeLabel(it)}</h3><div class="meta">${L(R.zh,R.en)} · ${LL(GEAR_SLOTS[it.slot])} · ${L('品阶','Tier')} ${it.t} · ${L('强化等级','Upgrade level')} ${level}/${GEAR_UPGRADE_MAX}${isEq?L(' · 已装备',' · equipped'):''}</div>
  <ul>${current.map(a=>`<li>${afxText(a)}</li>`).join('')}</ul>${it.leg?`<div class="leg">✦ ${L(GEAR_LEG[it.leg].d,GEAR_LEG[it.leg].de)}</div>`:''}
  ${cur&&!isEq?`<div class="cmp">${L('对比当前','vs equipped')} ${xEsc(gearName(cur))}: <b class="${diff>=0?'up':'dn'}">${diff>=0?'▲':'▼'} ${Math.abs(diff).toFixed(1)}</b></div>`:''}
  <div class="gupgradebox"><b>${L('金币强化','Upgrade with gold')}</b>${canUpgrade?`<ul class="gpreview">${next.map((a,i)=>`<li><span>${afxText(current[i])}</span><b>→ ${afxText(a)}</b></li>`).join('')}</ul><button type="button" class="go sm" data-ga="upgrade" ${SAVE.gold<cost?'disabled':''}>${L(`升至 +${level+1}`,`Upgrade to +${level+1}`)} · ${cost.toLocaleString('en-US')} ${L('金币','gold')}</button>${SAVE.gold<cost?`<small>${L(`还差 ${(cost-SAVE.gold).toLocaleString('en-US')} 金币`,`Need ${(cost-SAVE.gold).toLocaleString('en-US')} more gold`)}</small>`:''}`:`<small>${level>=GEAR_UPGRADE_MAX?L('已达强化上限','Maximum upgrade level'):L('全部词条已达上限','All affixes are at their caps')}</small>`}</div>
  <div class="gbtns">${isEq?`<button type="button" class="go alt sm" data-ga="off">${L('卸下','Unequip')}</button>`:`<button type="button" class="go sm" data-ga="eq">${L('装备','Equip')}</button>`}<button type="button" class="go alt sm" data-ga="lock">${it.lock?L('解锁','Unlock'):L('锁定','Lock')}</button>${isEq||it.lock?'':`<button type="button" class="go alt sm" data-ga="sal">${L('分解','Salvage')} +${gearSalvage(it)} ${L('金','gold')}</button>`}</div></div>`}
function renderGear(){const box=$('#gearbody');if(!box)return;const g=gearSave(),eq=g.eq;
  const slots=Object.keys(GEAR_SLOTS).map(k=>{const it=eq[k]&&gearById(eq[k]),R=it?GEAR_RAR[it.r]:null;return `<button type="button" class="gslot${gearSel&&it&&gearSel===it.id?' on':''}" data-sl="${k}" style="--rc:${R?R.col:'#6a6256'}"><span class="gico">${gearIcon(it||{slot:k})}</span><span><b>${it?xEsc(gearName(it))+gearUpgradeLabel(it):LL(GEAR_SLOTS[k])}</b><small>${it?gearAffixes(it).slice(0,2).map(afxText).join(' · ')+(it.leg?' · ✦':''):L('空','empty')}</small></span></button>`}).join('');
  const list=g.inv.filter(it=>gearFilt==='all'||it.slot===gearFilt).sort((a,b)=>(b.r-a.r)||(b.t-a.t)||(gearScore(b)-gearScore(a)));
  const cells=list.map(it=>{const R=GEAR_RAR[it.r],isEq=Object.values(eq).includes(it.id),cur=eq[it.slot]&&gearById(eq[it.slot]),up=!isEq&&gearScore(it)>gearScore(cur);return `<button type="button" class="gcell${gearSel===it.id?' sel':''}${isEq?' eq':''}${up?' up':''}${it.new?' nw':''}" data-id="${it.id}" style="--rc:${R.col}" title="${xEsc(gearName(it))+gearUpgradeLabel(it)}">${gearIcon(it)}${gearUpgradeLevel(it)?`<span class="gplus">+${gearUpgradeLevel(it)}</span>`:''}${it.lock?'<span class="lk">🔒</span>':''}</button>`}).join('');
  const filt=['all',...Object.keys(GEAR_SLOTS)].map(k=>`<button type="button" data-f="${k}" class="${gearFilt===k?'on':''}">${k==='all'?L('全部','All'):LL(GEAR_SLOTS[k])}</button>`).join('');

  const sel=gearSel&&gearById(gearSel);
  box.innerHTML=`<div class="gear-wallet"><b>${ICON.misc('gold','#ffd27a','sm')} ${Math.floor(SAVE.gold||0).toLocaleString('en-US')} ${L('金币','gold')}</b><small>${L('装备与强化在下一局生效，单人和对决均有效','Equipment and upgrades apply next run, in solo and duels')}</small></div><div class="gwrap"><div><div class="gsec"><span>${L('已装备','Equipped')}</span></div><div class="geq">${slots}</div>${gearDetail(sel)}</div>
    <div><div class="gsec"><span>${L('行囊','Bag')} ${g.inv.length}/${GEAR_INV_MAX}</span></div><div class="gfilt">${filt}</div><div class="ginv">${cells||`<span class="meta" style="grid-column:1/-1;color:#a99f8d;font-size:13px">${L('暂无装备','No equipment')}</span>`}</div>
    </div></div>`;
  box.querySelectorAll('[data-sl]').forEach(b=>b.onclick=()=>{const id=eq[b.dataset.sl];if(id){gearSel=id;renderGear()}else{gearFilt=b.dataset.sl;renderGear()}});
  box.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{gearSel=b.dataset.id;const it=gearById(gearSel);if(it&&it.new){it.new=0;gearChanged(it)}renderGear();if(typeof SFX!=='undefined')SFX.pick(1)});
  box.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{gearFilt=b.dataset.f;renderGear()});
  box.querySelectorAll('[data-ga]').forEach(b=>b.onclick=()=>{const it=gearById(gearSel);if(!it)return;const a=b.dataset.ga;
    if(a==='upgrade'){if(!buyGearUpgrade(it.id))return;if(typeof SFX!=='undefined')SFX.complete();renderGear();if(typeof renderProg==='function')renderProg();return}
    if(a==='eq'){eq[it.slot]=it.id;it.new=0;const lg=GEAR_LEG[it.leg];if(lg?.weapon){SAVE.weapon=SAVE.weapon||{};SAVE.weapon[lg.cls]=lg.weapon}if(typeof SFX!=='undefined')SFX.chest()}else if(a==='off'){delete eq[it.slot]}else if(a==='lock'){it.lock=!it.lock}else if(a==='sal'){SAVE.gold+=gearSalvage(it);gearRemove(it);gearSel=null;if(typeof SFX!=='undefined')SFX.pick(1)}
    gearChanged(it);renderGear();if(typeof renderProg==='function')renderProg()});
}
function openGear(){let ov=$('#gearov');if(!ov){ov=document.createElement('div');ov.id='gearov';ov.className='overlay';ov.hidden=true;ov.innerHTML=`<div class="cbox"><div class="ch"><h2><span data-l10n="行囊|Gear">${L('行囊','Gear')}</span></h2><button type="button" class="go alt sm" id="gearclose" data-l10n="关闭|Close">${L('关闭','Close')}</button></div><div id="gearbody"></div></div>`;document.body.appendChild(ov);$('#gearclose').onclick=()=>{ov.hidden=true;if(typeof renderProg==='function')renderProg()};ov.addEventListener('click',e=>{if(e.target===ov)$('#gearclose').click()})}
  if(!gearSel){const eq=gearSave().eq;gearSel=eq.weapon||null}renderGear();ov.hidden=false}
function gearNewCount(){return gearSave().inv.filter(x=>x.new).length}
/* Bottom navigation and new-item count. */
(()=>{if(typeof renderProg!=='function')return;const rp=renderProg;renderProg=function(){rp();const bar=document.querySelector('#menu .tabbar');if(!bar)return;let b=$('#gearbtn');if(b&&!b.onclick)b.onclick=()=>{openGear();if(typeof SFX!=='undefined')SFX.pick(1)};
  if(!b){b=document.createElement('button');b.type='button';b.id='gearbtn';b.title=L('行囊:装备','Gear');b.onclick=()=>{openGear();if(typeof SFX!=='undefined')SFX.pick(1)};const road=bar.querySelector('[data-t=road]');if(road)road.after(b);else bar.prepend(b)}
  const n=gearNewCount();b.innerHTML=`${typeof ICON!=='undefined'?ICON.misc('relic','#ff9c3a','sm'):''}<span>${L('行囊','Gear')}</span>${n?` <b class="gn">${n}</b>`:''}`;b.hidden=false}})();
/* results: what dropped this run */
xOn('end',box=>{const found=(G.gearFound||[]).filter(it=>gearById(it.id));if(!found.length)return;const d=document.createElement('div');d.className='endgear';d.innerHTML=found.slice(0,12).map(it=>{const R=GEAR_RAR[it.r];return `<span style="--rc:${R.col}">${it.leg?'✦ ':''}${xEsc(gearName(it))}</span>`}).join('')+(found.length>12?`<span style="--rc:#cfc6b2">+${found.length-12}</span>`:'')+`<button type="button" class="go alt sm" id="endgearbtn">${L('去行囊','Open gear')}</button>`;const anchor=box.querySelector('details')||box.querySelector('.btns');if(anchor)anchor.before(d);else box.appendChild(d);const b=$('#endgearbtn');if(b)b.onclick=()=>openGear()});
