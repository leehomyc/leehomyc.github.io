const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8');
function setup(){
 const c=vm.createContext({console,Date,Math,Set,Map,JSON,W:2600,H:2000,TAU:Math.PI*2,CAP:{fx:300,fl:100},SHRINES:[],L:(zh,en)=>en,LL:o=>o.en,LANG:'en',tr:s=>s,
  clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),hyp:Math.hypot,blocked:()=>false,rocksNear:()=>[],SIMR:()=>.99,rnd:(a=1,b)=>b===undefined?a*.5:(a+b)/2,pick:a=>a[0],
  SAVE:{gold:40000,up:{},mode:'solo',gear:{inv:[{id:'test',slot:'weapon',r:0,t:1,a:[{k:'dmg',v:3},{k:'hp',v:9}],zh:'测试剑',en:'Test blade',lock:true}],eq:{weapon:'test'}}},
  ROOM:{},showEnd(){},showBanner(){},applyUpgrades(){},persist(){c.SAVE.goldTs=Date.now();c.saved=JSON.stringify(c.SAVE)},
  SFX:{hit(){},block(){},hurt(){},ward(){},pick(){},chest(){},complete(){}},
  document:{createElement:()=>({}),head:{appendChild(){}}},$:()=>null,
 });
 const run=s=>vm.runInContext(s,c);
 for(const n of ['content','sim','ext','gear'])run(source(n));
 run("spark=()=>{};trauma=()=>{};shock=()=>{};ring=()=>{};G={auto:false,t:100,spells:[],relics:[],curse:{},fx:[],floats:[],en:[],kills:0,lv:1,score:0,P:{x:0,y:0,hp:50,maxHp:100,mana:100,maxMana:100,regen:1,def:1,dmg:1,dmgBonus:0,crit:0,haste:1,spd:1,mag:1}};");
 return {c,run};
}
test('upgrades spend the exact escalating price, persist, and preserve original rolls',()=>{
 const {c,run}=setup(),before=JSON.stringify(c.SAVE.gear.inv[0].a);
 assert.equal(run("gearUpgradeCost(gearById('test'))"),10000);
 assert.equal(run("buyGearUpgrade('test')"),true);assert.equal(c.SAVE.gold,30000);
 assert.equal(run("gearUpgradeCost(gearById('test'))"),15000);
 assert.equal(run("buyGearUpgrade('test')"),true);assert.equal(c.SAVE.gold,15000);
 assert.equal(c.SAVE.gear.inv[0].enhance,2);assert.equal(JSON.stringify(c.SAVE.gear.inv[0].a),before);
 assert.deepEqual(JSON.parse(run("JSON.stringify(gearAffixes(gearById('test')))")),[{k:'dmg',v:3.12},{k:'hp',v:11}]);
 assert.equal(JSON.parse(c.saved).gear.inv[0].enhance,2);assert.equal(JSON.parse(c.saved).gold,15000);
});
test('unaffordable, deleted, maximum-level and fully capped items never consume gold',()=>{
 const {c,run}=setup();c.SAVE.gold=9999;
 assert.equal(run("buyGearUpgrade('test')"),false);assert.equal(c.SAVE.gold,9999);assert.equal(c.SAVE.gear.inv[0].enhance,undefined);
 c.SAVE.gold=100000000;const gold=c.SAVE.gold;
 assert.equal(run("buyGearUpgrade('missing')"),false);
 c.SAVE.gear.inv[0].enhance=20;assert.equal(run("buyGearUpgrade('test')"),false);
 Object.assign(c.SAVE.gear.inv[0],{enhance:0,a:[{k:'crit',v:12}]});assert.equal(run("buyGearUpgrade('test')"),false);assert.equal(c.SAVE.gold,gold);
});
test('enhanced values respect existing affix caps and increase item comparison score',()=>{
 const {c,run}=setup();const base=run("gearScore(gearById('test'))");c.SAVE.gear.inv[0].enhance=20;
 assert.ok(run("gearScore(gearById('test'))")>base);
 c.SAVE.gear.inv[0].a=[{k:'crit',v:11.9},{k:'def',v:11.9},{k:'life',v:2.9}];
 assert.deepEqual(JSON.parse(run("JSON.stringify(gearAffixes(gearById('test')))")),[{k:'crit',v:12},{k:'def',v:12},{k:'life',v:3}]);
});
test('gear applies once per run and an upgrade affects the next run without stacking onto current stats',()=>{
 const {c,run}=setup();run('gearApply(G.P)');const hp=run('G.P.maxHp'),damage=run('G.P.dmg');
 run('gearApply(G.P)');assert.equal(run('G.P.maxHp'),hp);assert.equal(run('G.P.dmg'),damage);
 run("buyGearUpgrade('test');gearApply(G.P)");assert.equal(run('G.P.dmg'),damage);
 run('G={curse:{},spells:[],P:{hp:100,maxHp:100,dmg:1}};gearApply(G.P)');
 assert.equal(run('G.P.maxHp'),110);assert.ok(Math.abs(run('G.P.dmg')-1.0306)<1e-12);
});
test('the same equipped upgrade applies in solo and timed or endless duels',()=>{
 const {c,run}=setup();c.SAVE.gear.inv[0].enhance=2;
 for(const mode of ['solo','qpk','pk','room']){
  c.SAVE.mode=mode;run(`G={room:${mode==='room'},curse:{},spells:[],P:{hp:100,maxHp:100,dmg:1}};gearApply(G.P)`);
  assert.equal(run('G.P.maxHp'),111,mode);assert.ok(Math.abs(run('G.P.dmg')-1.0312)<1e-12,mode);
 }
});
test('player gear damage and lifesteal do not benefit the AI opponent',()=>{
 const {c,run}=setup();c.SAVE.gear.inv[0].a=[{k:'dmg',v:3},{k:'life',v:2}];
 run("gearApply(G.P);G.spells=[mkSpell('sword')];G.rival={dmg:1,crit:0,dmgBonus:0,dmgDealt:0};target={type:'rat',x:1,y:1,r:5,hp:1000,maxHp:1000};hit(target,10,Object.assign(mkSpell('sword'),{owner:'rival'}));");
 assert.equal(run('target.hp'),990);assert.equal(run('G.P.hp'),50);
 run("target.hp=1000;hit(target,10,G.spells[0])");assert.ok(run('target.hp')<990);assert.ok(run('G.P.hp')>50);
});
test('stale cloud progress neither refunds spent gold nor erases an item upgrade',()=>{
 const {c,run}=setup();const stale=JSON.parse(JSON.stringify(c.SAVE));stale.ts=1;stale.goldTs=1;stale.gear.inv[0].ts=1;
 run("buyGearUpgrade('test')");c.SAVE.ts=Date.now();c.stale=stale;
 const cloud=source('cloud');vm.runInContext(cloud.slice(cloud.indexOf('function mergeSave('),cloud.indexOf('async function cloudAuthChanged(')),c);
 const merged=run('mergeSave(SAVE,stale)');assert.equal(merged.gold,30000);assert.equal(merged.gear.inv[0].enhance,1);
});
