const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8');
function setup(){
  const elements=new Map(),element=()=>({hidden:true,innerHTML:'',querySelector(){return null},appendChild(){},classList:{add(){},remove(){}}});
  const c=vm.createContext({console,Math,Date,Set,Map,JSON,LANG:'en',L:(zh,en)=>en,LL:o=>o.en,tr:s=>s,
    W:2600,H:2000,TAU:Math.PI*2,clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),hyp:Math.hypot,blocked:()=>false,rocksNear:()=>[],
    SIMR:()=>.99,rnd:(a=1,b)=>b===undefined?a*.5:(a+b)/2,pick:a=>a[0],CAP:{fx:300,fl:100},
    document:{createElement:element,head:{appendChild(){}}},$:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)},
    ROOM:{},DAILY:false,SAVE:{gold:100,up:{},mode:'solo',asura:{max:0,best:0},runs:0,wins:0,bosses:0},
    showEnd(){vm.runInContext('G.ended=true',c)},applyUpgrades(){},persist(){},hitStop(){},showBanner(){},
    SFX:{hit(){},block(){},hurt(){},ward(){},pick(){},chest(){}}
  });
  const run=s=>vm.runInContext(s,c);
  for(const n of ['content','sim','ext','gear'])run(source(n));
  run(`ring=()=>{};spark=()=>{};trauma=()=>{};shock=()=>{};
    G={t:100,auto:false,spells:[],picks:[],relics:[],curse:{},fx:[],floats:[],en:[],grid:new Map(),kills:0,lv:1,bossSlain:0,goldRun:0,comboMax:0,score:0,dmgTaken:0,
       P:{x:0,y:0,hp:50,maxHp:100,mana:100,maxMana:100,inv:0,down:0,dash:0,shield:0,guard:0,def:1,dmg:1,dmgBonus:0,crit:0,haste:1,mag:1}};`);
  return {c,run,elements};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('full-health healing does not consume the shared cap; effective healing still obeys it',()=>{
  const {run}=setup();run('G.P.hp=100;heal(40);G.P.hp=50;heal(10)');
  near(run('G.P.hp'),60);near(run('G.healIn'),10);near(run('G.overheal'),40);
  run('heal(10)');near(run('G.P.hp'),62);near(run('G.healCapped'),8);
  run('G.t=101;heal(5)');near(run('G.P.hp'),67);
});
test('ward and timed protection retain separate budgets and expire independently',()=>{
  const {run}=setup();run('grantShield(4,20);grantShield(.8);dmgP(100,1,1);G.P.inv=0');
  near(run('G.P.hp'),50);near(run('G.P.shieldHp'),20);
  run('tickShields(1);dmgP(25,1,1)');near(run('G.P.hp'),45);near(run('G.P.shield'),0);
  run('grantShield(.8);grantShield(4,20);G.P.inv=0;dmgP(100,1,1)');near(run('G.P.hp'),45);near(run('G.P.guard'),.8);
});
test('rejuvenation grants timed protection even after a ward budget is exhausted',()=>{
  const {run}=setup();run("G.spells=[mkSpell('rejuv')];G.P.shieldHp=0;castSkill(0);G.P.inv=0;dmgP(20,1,1)");
  near(run('G.P.hp'),50);near(run('G.P.guard'),1.5);assert.equal(run('G.spells[0].casts'),1);
});
test('mana shield consumes only damage left after the ward and no mana during timed protection',()=>{
  const {run}=setup(),s=source('heroes');run(s.slice(s.indexOf('function heroMitigate('),s.indexOf('\n{const _hit=hit;')));
  run('G.P.mshield=3;grantShield(4,20);dmgP(10,1,1)');near(run('G.P.mana'),100);
  run('G.P.inv=0;dmgP(20,1,1)');near(run('G.P.mana'),94);near(run('G.P.hp'),46);
  run('G.P.inv=0;grantShield(1);dmgP(100,1,1)');near(run('G.P.mana'),94);near(run('G.P.hp'),46);
});
function equipLife(run){run("SAVE.gear={inv:[{id:'life',slot:'weapon',a:[{k:'life',v:2}]}],eq:{weapon:'life'}};gearApply(G.P);G.spells=[mkSpell('sword')];target={type:'rat',x:1,y:1,r:5,hp:1000,maxHp:1000};");}
test('equipment lifesteal follows the same damage at high and low hit rates',()=>{
  for(const spaced of [false,true]){
    const {run}=setup();equipLife(run);
    for(let i=0;i<10;i++)run(`G.t=${100+(spaced?i*.2:0)};hit(target,10,G.spells[0],true)`);
    near(run('G.healed'),2);near(run('G.P.hp'),52);
  }
});
test('lifesteal uses damage after enemy reduction and excludes overkill',()=>{
  const {run}=setup();equipLife(run);run('target.tired=.5;hit(target,100,G.spells[0],true)');near(run('G.healed'),1);
  // Isolate the kill side effects while exercising the complete hit calculation.
  run('target.hp=5;target.tired=0;kill=e=>{e.dead=true};hit(target,100,G.spells[0],true)');near(run('G.healed'),1.1);
});
const item=(id,r=0,v=3)=>({id,slot:'weapon',r,t:1,a:[{k:'dmg',v}],zh:id,en:id,new:1});
test('the same drop is processed once, including two tick hooks before effect removal',()=>{
  const {c,run}=setup();c.drop=item('one');run("G.fx=[{k:'gear',it:drop,x:0,y:0,t:120}];XH.tick[0](.01);XH.tick[0](.01);takeGear(drop)");
  assert.equal(run('SAVE.gear.inv.length'),1);assert.equal(run('SAVE.gear.found'),1);assert.equal(run('G.gearFound.length'),1);
});
test('a full protected bag salvages new loot once and does not list it as a retained drop',()=>{
  const {c,run}=setup();c.bag=Array.from({length:40},(_,i)=>({...item('old'+i),lock:true}));c.drop=item('salvaged');
  run('SAVE.gear={inv:bag,eq:{}};takeGear(drop);takeGear(drop)');
  const value=run('gearSalvage(drop)');assert.equal(run('SAVE.gold'),100+value);assert.equal(run('G.gearGold'),value);
  assert.equal(run('G.gearFound?.length||0'),0);assert.ok(run('SAVE.gear.removed.salvaged'));assert.equal(run('SAVE.gear.inv.length'),40);
});
test('automatic replacement preserves equipped and locked gear and credits its salvage',()=>{
  const {c,run}=setup();c.bag=Array.from({length:40},(_,i)=>({...item('old'+i),lock:i>1}));c.drop=item('upgrade',2,10);
  run("SAVE.gear={inv:bag,eq:{weapon:'old0'}};takeGear(drop)");
  assert.equal(run("!!gearById('old0')"),true);assert.equal(run("!!gearById('old1')"),false);assert.equal(run("!!gearById('old2')"),true);assert.equal(run("!!gearById('upgrade')"),true);
  assert.equal(run('SAVE.gear.inv.length'),40);assert.ok(run('G.gearGold>0'));
});
function settlement(run){const m=source('meta'),s=source('ui');run(m.slice(m.indexOf('function earnedRunRewards('),m.indexOf('function runAxp(')));run(s.slice(s.indexOf('function settleRunRewards('),s.indexOf('function showEnd(')));run('checkAch=()=>{};dayKey=()=>20261107');}
test('a one-second abandoned run with no kill or earned event pays no gold',()=>{
  const {run}=setup();settlement(run);
  run('G.t=1;G.abandoned=true;metaAfterRun=()=>({xp:0,ranks:[]});settleRunRewards()');
  assert.equal(run('G.settlement.gold'),0);assert.equal(run('SAVE.gold'),100);
});
test('settlement includes automatic salvage plus achievement and level rewards, with no second payout',()=>{
  const {run}=setup();settlement(run);
  run('SAVE.gold=140;G.gearGold=40;checkAch=()=>{SAVE.gold+=20};metaAfterRun=()=>{SAVE.gold+=30;return {xp:10}};settleRunRewards()');
  const total=run('G.runRewardGold');assert.equal(total,40+20+30+run('G.settlement.gold'));
  const gold=run('SAVE.gold');run('settleRunRewards()');assert.equal(run('SAVE.gold'),gold);assert.equal(run('SAVE.runs'),1);
});
test('daily and abandoned runs never overwrite the adventure survival record',()=>{
  for(const daily of [true,false]){
    const {run}=setup();settlement(run);run(`SAVE.best=50;G.t=100;DAILY=${daily};G.abandoned=${!daily};settleRunRewards()`);
    assert.equal(run('SAVE.best'),50);assert.equal(run('G.settlement.record'),false);
  }
});
test('a 2-minute Warlord or 4-minute boss on the highest Ascension tier unlocks the next tier',()=>{
  const first=setup();settlement(first.run);first.run('G.warlordSlain=1;ASURA_T=0;settleRunRewards()');
  assert.equal(first.run('SAVE.asura.max'),1);assert.equal(first.run('SAVE.asura.sel'),1);
  const lower=setup();settlement(lower.run);lower.run('SAVE.asura.max=3;SAVE.asura.sel=1;ASURA_T=1;G.bossSlain=1;settleRunRewards()');
  assert.equal(lower.run('SAVE.asura.max'),3);
  const abandoned=setup();settlement(abandoned.run);abandoned.run('G.warlordSlain=1;G.abandoned=true;settleRunRewards()');
  assert.equal(abandoned.run('SAVE.asura.max'),0);
});
test('twenty Ascension tiers and map milestones stay connected to real gameplay rules',()=>{
  const {run}=setup();
  assert.equal(run('ASURA.length'),20);
  assert.deepEqual(Array.from(run('Object.values(MAPS).filter(m=>m.tierNeed).map(m=>m.tierNeed)')),[2,5,10,15]);
  const normal=run('healMul(0)');run('ASURA_T=13');near(run('healMul(0)'),normal*.8);
  run('ASURA_T=0;spawnEnemy("assassin",100,100)');const base=run('G.en.at(-1).hp');
  run('ASURA_T=19;spawnEnemy("assassin",100,100)');assert.ok(run('G.en.at(-1).hp')>base*1.3);
});
test('solo enemies gain health and damage, and ranged enemies arrive earlier',()=>{
  const {run}=setup();run('G.t=50;ASURA_T=0;spawnEnemy("bandit",100,100)');
  const soloHp=run('G.en.at(-1).hp'),soloDamage=run('G.en.at(-1).dmg');
  run('SAVE.mode="daily";spawnEnemy("bandit",100,100)');
  assert.ok(soloHp>run('G.en.at(-1).hp')*1.14);
  assert.ok(soloDamage>run('G.en.at(-1).dmg')*1.11);
  assert.equal(run('spawnType(30,.1,true)'),'archer');
  assert.equal(run('spawnType(30,.1,false)'),'bandit');
});
test('Light Step grants six smaller stacks and permanent speed cannot reach the runaway range',()=>{
  const {run}=setup();run('G.P.spd=1;const light=PERKS.find(p=>p.en==="Light Step");for(let i=0;i<12;i++)light.a(G.P)');
  assert.equal(run('G.P.lightStep'),6);
  near(run('G.P.spd'),Math.pow(1.05,6));
  run('G.P.spd=4.3');assert.equal(run('moveSpeed(G.P)'),1.7);
});
test('boss volleys outpace a running hero and scale their damage with the boss',()=>{
  const {c,run}=setup();c.CAP.bu=500;c.SFX.bossAttack=()=>{};
  run('G.P.x=200;G.P.y=200;G.bullets=[];G.later=[];G.boss={x:0,y:0,n:0,hp:100,maxHp:100,dmg:22,rate:1};G.bossT=0;bossAI(.016)');
  assert.equal(run('G.bullets.length'),20);
  near(run('Math.hypot(G.bullets[0].vx,G.bullets[0].vy)'),172);
  near(run('G.bullets[0].d'),15);
  near(run('G.bossT'),2.7);
  run('G.boss.dmg=44;G.bossT=0;bossAI(.016)');
  near(run('G.bullets.at(-1).d'),30);
});
test('contract costs still apply alongside their rewards',()=>{
  const {run}=setup();
  run("CONTRACTS.find(c=>c.id==='thin').apply();CONTRACTS.find(c=>c.id==='greed').apply()");
  assert.equal(run('G.P.maxHp'),80);
  near(run('G.P.dmgBonus'),.2);
  assert.equal(run('G.curse.nochest'),1);
  assert.equal(run('G.goldRun'),200);
  near(run('G.curse.gold'),1.5);
});
test('Pact of Wind grants its relic immediately instead of leaving a timed drop on the ground',()=>{
  const {run}=setup();run("const pact=CONTRACTS.find(c=>c.id==='swift');pact.apply();pact.reward()");
  assert.equal(run('G.curse.spd'),1.2);
  assert.equal(run('G.relics.length'),1);
  assert.equal(run("G.fx.filter(f=>f.k==='relic').length"),0);
});
test('relics dropped in obstacles move to reachable ground; cursed relics can be collected after a short hold',()=>{
  const {c,run}=setup();const rock={x:90,y:90,w:40,h:40};c.rocksNear=()=>[rock];c.blocked=(x,y)=>x>90&&x<130&&y>90&&y<130;
  run('dropRelic(110,110)');const f=run('G.fx.at(-1)');assert.ok(Math.hypot(f.x-110,f.y-110)>=24);
  run('G.fx=[{k:"relic",id:"bind",x:25,y:0,t:60,hold:0}];collectRelics(.3)');
  assert.equal(run('G.relics.includes("bind")'),false);
  run('collectRelics(.3)');assert.equal(run('G.relics.includes("bind")'),true);
  assert.equal(run('G.fx[0].t'),0);
});
test('repeated end rendering invokes extension rewards only once',()=>{
  const {run}=setup();run("endCalls=0;xOn('end',()=>endCalls++);showEnd(false);showEnd(false)");assert.equal(run('endCalls'),1);
});
