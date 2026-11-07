const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=n=>fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8');
function realm(extra={}){const c=vm.createContext({console,Math,Date,Set,Map,L:(z,e)=>e,LL:o=>o.en,...extra});return {c,run:s=>vm.runInContext(s,c)}}
test('existing chests remain collectible after Greed, while every new chest is suppressed',()=>{
 const {run}=realm({W:2600,H:2000,TAU:Math.PI*2,CAP:{fx:100,gem:100},blocked:()=>false,onPond:()=>false,rocksNear:()=>[],clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),hyp:Math.hypot,rnd:()=>.5,SIMR:()=>.99,tier:()=>0,hasR:()=>false,PK_EVENTS:{chest:20},RIVAL_ON:false,ring(){},spark(){},trauma(){},shock(){},showBanner(){},openPick(){}});
 const s=src('sim');run(s.slice(s.indexOf('function chestClear('),s.indexOf('function srcName(')));
 run('G={curse:{nochest:1},P:{x:200,y:200,down:0},chests:[{x:200,y:200,t:0}],gems:[],picks:[],score:0,goldRun:0,t:50,chestT:0,slow:0};chestTick(.1)');
 assert.equal(run('G.chestsOpened'),1);assert.equal(run('G.score'),20);assert.equal(run('G.chests.length'),0);
 run('spawnChest(200,200,"gold");chestTick(.1)');assert.equal(run('G.chests.length'),0);assert.equal(run('G.score'),20);
 assert.equal((s.match(/G\.chests\.push\(/g)||[]).length,1,'all chest drops must use the shared spawn gate');
});
test('chests relocate away from obstacle edges with pickup clearance',()=>{
 const {run}=realm({W:1000,H:1000,TAU:Math.PI*2,blocked:()=>false,onPond:()=>false,rocksNear:()=>[{x:200,y:200,w:50,h:50}],clamp:(v,a,b)=>Math.max(a,Math.min(b,v))});const s=src('sim');run(s.slice(s.indexOf('function chestClear('),s.indexOf('function chestTick(')));
 run('G={P:{x:100,y:100},curse:{},chests:[]};const c=spawnChest(199,220)');assert.equal(run('chestClear(c.x,c.y)'),true);assert.notEqual(run('c.x'),199);
});
test('combo milestones add actual score equally for player and rival exactly at thresholds',()=>{
 const {run}=realm();const s=src('sim');run(s.slice(s.indexOf('const COMBO_TIERS='),s.indexOf('function comboMult(')));
 run('G={auto:false,score:0};const R={score:0};awardComboBonus(G,10,true);awardComboBonus(R,10,false);awardComboBonus(G,11,true)');assert.equal(run('G.score'),10);assert.equal(run('R.score'),10);assert.equal(run('G.sc.ev'),10);
 run('G.creditOff="remote";awardComboBonus(G,25,true)');assert.equal(run('G.score'),10);
});
function joinRealm(data){const writes=new Map(),session=new Map();const t={async getRoom(){return data},async setPlayer(){},subscribe(){return ()=>{}}};const {c,run}=realm({ROOM:{code:null,T:t},SAVE:{mode:'solo',cls:'swordsman'},MAPID:'valley',MAPS:{valley:{},snow:{}},FirestoreT:t,LocalT:{},location:{search:'',reload(){}},localStorage:{setItem:(k,v)=>writes.set(k,v)},sessionStorage:{setItem:(k,v)=>session.set(k,v)},netReady:async()=>{},netPick:()=>t,roomUid:()=> 'me',roomLeave(){},roomName:()=> 'test',weaponOf:()=> 'sword',roomEquipment:()=>[],roomOnRoom(){},roomOnPlayers(){},roomOnEvent(){},persist(){}});const s=src('net');run(s.slice(s.indexOf('async function roomJoinNow('),s.indexOf('function roomLeave(')));return {c,run,writes,session,t}}
test('cross-map join returns redirect outcome and preserves room mode before reload',async()=>{
 const {run,writes,session}=joinRealm({state:'lobby',map:'snow',host:'other'});assert.equal(await run('roomJoinNow("FA72",false)'),false);assert.equal(run('SAVE.mode'),'room');assert.equal(writes.get('sl_map'),'snow');assert.equal(session.get('sl_rejoin'),'FA72');
});
test('join waits for auth before choosing the online transport',async()=>{
 const {c,run,t}=joinRealm({state:'lobby',map:'valley',host:'other'});let ready=false;c.netReady=async()=>{await Promise.resolve();ready=true};c.netPick=()=>{assert.ok(ready);return t};assert.equal(await run('roomJoinNow("FA72",false)'),true);assert.equal(run('ROOM.code'),'FA72');
});
test('autojoin never opens solo hero screen while a map redirect is pending',async()=>{
 let screens=0;const {run}=realm({ROOM:{},SAVE:{mode:'solo'},URL,location:{href:'http://localhost/?room=FA72',search:'?room=FA72'},sessionStorage:{getItem:()=>null},roomJoin:async()=>false,showScreen:()=>screens++,history:{replaceState(){throw Error('should not change URL')}}});const s=src('net');run(s.slice(s.indexOf('async function roomAutoJoin('),s.indexOf('function roomErr(')));await run('roomAutoJoin()');assert.equal(screens,0);
});
test('interrupted room rounds cannot award ladder points or show a winner',()=>{
 const s=src('room');assert.ok(s.includes('done&&!aborted&&!ROOM.rewarded'));assert.ok(s.includes('win=done&&!aborted&&i===0'));assert.ok(src('meta').includes('G.abandoned||G.duelAborted?0:runTrophies()'));
});
test('failed player write leaves the old room intact and a later retry really joins',async()=>{
 const {c,run,t}=joinRealm({state:'lobby',map:'valley',host:'me'});run('ROOM.code="OLD1"');let left=0,record;c.roomLeave=()=>{left++};t.setPlayer=async()=>{throw Error('offline')};await assert.rejects(run('roomJoinNow("FA72",false)'),/offline/);assert.equal(run('ROOM.code'),'OLD1');assert.equal(left,0);
 t.setPlayer=async(code,uid,p)=>{record=p};assert.equal(await run('roomJoinNow("FA72",false)'),true);assert.equal(record.ready,true);assert.equal(left,1);
});
test('current-round abandonment interrupts the match before standings can award points',()=>{
 const ends=[];const {run}=realm({ROOM:{playing:true,data:{round:7}},G:{over:null},roomPlayerList:()=>[{uid:'guest',abandonedRound:7}],roomEndRun:reason=>ends.push(reason),roomRank:()=>[{uid:'guest'}]});const s=src('net');run(s.slice(s.indexOf('function roomCheckFinished(){'),s.indexOf('function roomRank(){')));run('roomCheckFinished()');assert.deepEqual(ends,['aborted']);assert.equal(run('ROOM.aborted'),true);assert.equal(run('G.duelAborted'),true);assert.equal(run('ROOM.results.length'),1);
});
test('old abandonment records do not interrupt a restarted round',()=>{
 const {run}=realm({ROOM:{playing:true,ended:false,data:{round:8,mode:'time'}},G:{over:null},roomPlayerList:()=>[{abandonedRound:7}],roomEndRun:()=>{throw Error('stale abort')}});const s=src('net');run(s.slice(s.indexOf('function roomCheckFinished(){'),s.indexOf('function roomRank(){')));run('roomCheckFinished()');assert.equal(run('ROOM.aborted'),undefined);
});
