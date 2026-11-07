const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8');
function context(extra={}){return vm.createContext({console,Date,Math,Set,Map,JSON,SAVE:{},G:{},RIVAL_ON:false,BOSSRUSH:false,ASURA_T:0,DAILY:false,...extra})}
function loadMerge(c){const s=source('cloud');vm.runInContext(s.slice(s.indexOf('function mergeSave('),s.indexOf('async function cloudPull(')),c)}
function plain(o){return JSON.parse(JSON.stringify(o))}
test('new-device merge restores cloud progression and preserves fields introduced by other systems',()=>{
  const c=context();loadMerge(c);
  const cloud={ts:100,gold:700,axp:900,trophies:850,asura:{max:5,sel:4,best:4},gear:{inv:[{id:'a',r:4}],eq:{weapon:'a'}},mer:{du:3},mastery:{monk:1234},road:{300:1},avatar:{e:2},variantUnlock:{sword:1},rooms:{w:2,p:3}};
  const result=c.mergeSave({gold:0,up:{},ts:200,asura:{max:0,sel:0},gear:{inv:[],eq:{}}},cloud);
  for(const k of ['gold','axp','trophies','asura','mer','mastery','road','avatar','variantUnlock','rooms'])assert.deepEqual(plain(result[k]),cloud[k],k);
  assert.equal(result.gear.inv[0].id,'a');assert.equal(result.gear.eq.weapon,'a');
});
test('endless starts with a stronger director while boss rush keeps its previous opening',()=>{
  const s=source('director');
  const c=context({SAVE:{mode:'solo',skill:0},G:{}});
  vm.runInContext(s.slice(s.indexOf('function dirInit(){'),s.indexOf('function dirMeasure(){')),c);
  c.dirInit();assert.equal(c.G.dir.base,1.15);
  c.SAVE.mode='rush';c.G={};c.dirInit();assert.equal(c.G.dir.base,.9);
});
test('new Ascension milestones automatically choose the latest unlocked map',()=>{
  let stored='',reloads=0;
  const c=context({MAPS:{valley:{},snow:{tierNeed:2},ember:{tierNeed:5},moon:{tierNeed:10},marsh:{tierNeed:15}},SAVE:{mode:'solo',asura:{max:10}},MAPID:'valley',localStorage:{setItem:(k,v)=>{if(k==='sl_map')stored=v}},sessionStorage:{setItem(){}},location:{reload:()=>reloads++}});
  const s=source('ui');vm.runInContext(s.slice(s.indexOf('function ascensionMapFor('),s.indexOf('function renderTitle(){')),c);
  assert.deepEqual([0,1,2,4,5,9,10,14,15,20].map(c.ascensionMapFor),['valley','valley','snow','snow','ember','ember','moon','moon','marsh','marsh']);
  assert.equal(c.syncAscensionMap(),true);assert.equal(stored,'moon');assert.equal(reloads,1);
  c.SAVE.mode='daily';assert.equal(c.syncAscensionMap(),false);assert.equal(reloads,1);
});
test('stale cloud cannot refund spent gold or undo a ladder loss',()=>{
  const c=context();loadMerge(c);
  const result=c.mergeSave({ts:30,gold:10,goldTs:30,trophies:90,ladderTs:30,runs:5,up:{hp:1}},{ts:20,gold:500,goldTs:20,trophies:100,ladderTs:20,runs:4});
  assert.equal(result.gold,10);assert.equal(result.trophies,90);assert.equal(result.up.hp,1);
});
test('merge unions independent drops and does not resurrect salvaged gear',()=>{
  const c=context();loadMerge(c);
  const result=c.mergeSave({ts:30,gear:{ts:30,inv:[{id:'a',lock:true,ts:30}],eq:{},removed:{sold:30}}},{ts:20,gear:{ts:20,inv:[{id:'a',lock:false,ts:20},{id:'b'},{id:'sold'}],eq:{weapon:'sold'}}});
  assert.deepEqual(Array.from(result.gear.inv,x=>x.id).sort(),['a','b']);assert.equal(result.gear.inv.find(x=>x.id==='a').lock,true);assert.deepEqual(plain(result.gear.eq),{});
});
test('room matches receive no generic trophies before room placement is known',()=>{
  const c=context({G:{room:true,t:180,bossSlain:2,score:0,rival:{score:99}}});vm.runInContext(source('meta'),c);
  assert.equal(c.runTrophies(),0);
});
test('room placement is awarded once and a loss really subtracts 5 trophies',()=>{
  const nodes={};const c=context({SAVE:{gold:0,trophies:100},G:{room:true,t:180,score:10,P:{}},ROOM:{results:true,rewarded:false,data:{},host:false},roomUid:()=> 'me',roomRank:()=>[{uid:'other',cls:'monk',score:20},{uid:'me',cls:'monk',score:10}],CLASSES:{monk:{}},L:(a,b)=>b,esc:x=>x,LL:()=>'',ICON:{cls:()=>'',misc:()=>''},persist:()=>{},$:id=>id==='#rmagain'?null:(nodes[id]||={})});
  vm.runInContext(source('meta'),c);c.SAVE.trophies+=c.runTrophies();const s=source('room');vm.runInContext(s.slice(s.indexOf('function renderRoomResults(')),c);c.renderRoomResults();c.renderRoomResults();assert.equal(c.SAVE.trophies,95);assert.equal(c.SAVE.gold,60);
});
test('startRun excludes all permanent upgrades from daily and duel modes',()=>{
  const s=source('ui');assert.match(s,/if\(!DAILY&&!inRoom&&!RIVAL_ON\)applyUpgrades/);
  const legacyLine=s.split('\n').find(l=>l.includes('G.P.dmgBonus+=masteryBonus'));
  if(legacyLine){const c=context({G:{P:{dmgBonus:0},cores:2,rerolls:1},SAVE:{road:{300:1,1000:1}},CLASS:'monk',inRoom:true,masteryBonus:()=>.1});vm.runInContext(legacyLine,c);assert.equal(c.G.P.dmgBonus,0);assert.equal(c.G.cores,2);assert.equal(c.G.rerolls,1)}
});
function gearContext(extra={}){
  const hooks={};const c=context({SAVE:{gold:0,up:{},weapon:{}},G:{t:600,bossSlain:2,curse:{},spells:[],P:{}},WEAPONS:{swordsman:['sword','swordcase']},WEAPON_INFO:{sword:{},swordcase:{need:'legend'}},CLASSES:{swordsman:{main:'sword',zh:'剑客',en:'Swordsman'}},SPELLS:{sword:{zh:'剑',en:'Sword'},swordcase:{zh:'剑匣',en:'Sword Case',d:'飞剑',de:'Flying swords'}},xOn:(k,f)=>(hooks[k]||=[]).push(f),xCss:()=>{},chestTick:()=>{},dash:()=>{},applyUpgrades:()=>{},persist:()=>{},pick:a=>a[0],rnd:(a=1,b)=>b===undefined?a*.5:(a+b)/2,...extra});vm.runInContext(source('meta'),c);vm.runInContext(source('gear'),c);return c;
}
test('solo, boss rush and daily challenges never increase ladder trophies',()=>{
  const c=context({G:{t:600,bossSlain:2},ASURA_T:5});vm.runInContext(source('meta'),c);
  assert.equal(c.runTrophies(),0);c.BOSSRUSH=true;assert.equal(c.runTrophies(),0);c.BOSSRUSH=false;c.DAILY=true;assert.equal(c.runTrophies(),0);
});
test('quick duels use fixed win/loss/tie values and report the actual delta at zero',()=>{
  const c=context({SAVE:{trophies:0,gold:0},G:{score:100,rival:{score:0}},RIVAL_ON:true,persist:()=>{}});vm.runInContext(source('meta'),c);
  assert.equal(c.runTrophies(),25);c.G.score=0;assert.equal(c.runTrophies(),0);c.G.rival.score=10;assert.equal(c.runTrophies(),-9);assert.equal(c.awardDuel(-9).dT,0);
});
test('rank crossings grant their rewards once, including crossings in room matches',()=>{
  const c=context({SAVE:{trophies:149,gold:0,rankRewards:{}},persist:()=>{}});vm.runInContext(source('meta'),c);
  const first=c.awardDuel(20);assert.equal(first.gold,450);assert.equal(c.SAVE.gold,450);c.awardDuel(-30);assert.equal(c.awardDuel(30).gold,0);assert.equal(c.SAVE.gold,450);
});
test('legacy migration is idempotent and preserves investments without retaining parallel progression',()=>{
  const c=context({SAVE:{gold:100,axp:0,up:{hp:3},mer:{ren:7,du:4},mastery:{swordsman:99999},road:{300:1,1000:1},trophies:900,weaponTokens:1,login:{n:7},first:{run:1},streak:{n:7}}});vm.runInContext(source('meta'),c);
  c.migrateProgression();const once=plain(c.SAVE);c.migrateProgression();assert.deepEqual(plain(c.SAVE),once);assert.equal(c.SAVE.gold,600);assert.equal(c.SAVE.training.ren,7);assert.equal(c.SAVE.up.hp,3);assert.equal(c.SAVE.perks.cores,1);assert.ok(c.accountBonus()>=.1);assert.equal(c.SAVE.rankRewards[900],1);
  for(const k of ['mer','mastery','road','login','first','streak','weaponTokens'])assert.equal(c.SAVE[k],undefined,k);
});
test('merging an old cloud save into a migrated save neither repeats token refunds nor loses training',()=>{
  const c=context({SAVE:{gold:100,up:{},mer:{ren:3},weaponTokens:1,ts:20}});vm.runInContext(source('meta'),c);loadMerge(c);const old=plain(c.SAVE);c.migrateProgression();c.SAVE.training.ren=4;c.SAVE.ts=30;c.SAVE.goldTs=30;
  const a=c.mergeSave(c.SAVE,old),b=c.mergeSave(a,old);assert.equal(a.gold,600);assert.equal(b.gold,600);assert.equal(b.training.ren,4);assert.equal(b.weaponTokens,undefined);assert.equal(b.mer,undefined);
});
test('gear tier and rarity depend on survival and credited kills, independent of Ascension',()=>{
  const c=gearContext();c.ASURA_T=0;const tier=c.gearTierNow(),rar=c.rollGearRar(0);c.ASURA_T=10;assert.equal(c.gearTierNow(),tier);assert.equal(c.rollGearRar(0),rar);c.G.t+=300;assert.ok(c.gearTierNow()>tier);c.G.bossSlain+=2;assert.ok(c.gearTierNow()>tier+1);
});
test('only unified training consumes gold and cap checks prevent wasted purchases',()=>{
  const c=gearContext({SAVE:{gold:1000,training:{}}});assert.equal(c.buyTraining('ren'),true);assert.equal(c.SAVE.gold,850);assert.equal(c.SAVE.training.ren,1);assert.equal(c.trainingCost(),180);assert.equal(c.buyTraining('unknown'),false);c.SAVE.training.dai=50;const before=c.SAVE.gold;assert.equal(c.buyTraining('dai'),false);assert.equal(c.SAVE.gold,before);
});
test('legacy legendary ownership migrates to one stable, locked equipment item',()=>{
  const c=gearContext({SAVE:{gold:0,weapon:{swordsman:'swordcase'},weaponOwned:{swordcase:true},clsBest:{swordsman:3}}});c.gearMigrateLegends();c.gearMigrateLegends();assert.equal(c.SAVE.gear.inv.length,1);assert.equal(c.SAVE.gear.inv[0].id,'legacy-legend-swordcase');assert.equal(c.SAVE.gear.inv[0].lock,true);assert.equal(c.gearWeaponFor('swordsman'),'swordcase');c.gearRemove(c.SAVE.gear.inv[0]);c.gearMigrateLegends();assert.equal(c.SAVE.gear.inv.length,0);
});
test('equipped legendary attacks only activate in adventure; regular weapons are free',()=>{
  const c=gearContext({SAVE:{gold:0,mode:'solo',weapon:{swordsman:'swordcase'},weaponOwned:{swordcase:true}}});c.gearMigrateLegends();const s=source('sim');vm.runInContext(s.slice(s.indexOf('function weaponOf('),s.indexOf('function mkSpell(')),c);assert.equal(c.weaponOf('swordsman'),'swordcase');
  for(const mode of ['daily','room','qpk','pk']){c.SAVE.mode=mode;assert.equal(c.weaponOf('swordsman'),'sword',mode)}assert.equal(c.weaponUnlocked('swordsman','sword'),true);
});
test('run experience and daily task rewards settle once; no streak or first-win multiplication remains',()=>{
  const c=context({SAVE:{gold:0,up:{},axp:0},G:{t:120,kills:5,bossSlain:0,lv:2,comboMax:0,relics:[]},dayKey:()=>20261107,CLASSES:{swordsman:{}},persist:()=>{}});vm.runInContext(source('meta'),c);const reward=c.metaAfterRun(),gold=c.SAVE.gold,xp=c.SAVE.axp;assert.ok(reward.xp>0);assert.equal(c.metaAfterRun(),reward);assert.equal(c.SAVE.gold,gold);assert.equal(c.SAVE.axp,xp);assert.equal(reward.firstBonus,undefined);assert.equal(c.SAVE.streak,undefined);
});

test('cloud merges keep all four codex sections initialized for fresh and partial saves',()=>{
  const c=context();loadMerge(c);
  const fresh=c.mergeSave({gold:0},{gold:0});
  for(const k of ['en','boss','relic','weapon'])assert.deepEqual(plain(fresh.codex[k]),{});
  const partial=c.mergeSave({codex:{weapon:{sword:1}}},{codex:{en:{firewisp:1}}});
  assert.equal(partial.codex.weapon.sword,1);assert.equal(partial.codex.en.firewisp,1);assert.deepEqual(plain(partial.codex.boss),{});
});
test('settings shows only controls after visiting adventure, achievements and codex',()=>{
  const panels=['road','tasks','ach','codex','settings'].map(p=>({dataset:{p},hidden:false,classList:{toggle(k,on){this[k]=on}}}));
  const title={};const c=context({lobbyTab:'',L:zh=>zh,$:()=>title,renderRoad:()=>{},document:{querySelector:()=>({classList:{toggle(){}},scrollTop:0}),querySelectorAll:s=>s==='.lobby .panel'?panels:[]}});
  vm.runInContext(source('ui').split('\n').find(l=>l.startsWith('function showTab(')),c);
  for(const prev of ['road','ach','codex','']){c.showTab(prev);c.showTab('settings');assert.deepEqual(panels.filter(p=>!p.hidden).map(p=>p.dataset.p),['settings']);assert.equal(title.textContent,'设置')}
  c.showTab('road');assert.deepEqual(panels.filter(p=>!p.hidden).map(p=>p.dataset.p),['road','tasks','ach','codex']);
});
