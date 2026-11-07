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
