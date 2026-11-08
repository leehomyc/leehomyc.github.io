const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8');
function setup(){
  const elements=new Map();
  const node=()=>({hidden:false,textContent:'',innerHTML:'',children:[],dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(k,v){this[k]=v},appendChild(n){this.children.push(n)},get offsetWidth(){return 1}});
  const c=vm.createContext({console,Date,Math,Set,Map,JSON,W:2600,H:2000,TAU:Math.PI*2,SHRINES:[],CAP:{fx:100,fl:100},ROOM:{data:{mode:'time',len:180}},SAVE:{mode:'solo',up:{},perks:{},weapon:{}},
    buildArena(){},clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),rnd:()=>1,pick:a=>a[0],L:(zh,en)=>en,LL:o=>o.en,
    showBanner(){},updateCores(){},SFX:{revive(){}},document:{createElement:node},$:s=>{if(!elements.has(s))elements.set(s,node());return elements.get(s)},accountBonus:()=>0});
  const run=s=>vm.runInContext(s,c);
  run(source('content'));run(source('sim'));
  run("spark=()=>{};trauma=()=>{};lose=()=>{G.over='lose'};newGame(false,'swordsman');");
  return {c,run,elements};
}
test('timed room deaths always revive, halve current score once and never spend lives',()=>{
  for(const shared of [false,true]){
    const {run}=setup();run(`G.room=true;G.shared=${shared};G.score=101;G.cores=0;downed();`);
    assert.equal(run('G.score'),50);assert.equal(run('G.sc.deathLoss'),51);assert.equal(run('G.cores'),0);assert.equal(run('G.P.down'),4);assert.equal(run('G.over'),null);
    run('downed()');assert.equal(run('G.score'),50);assert.equal(run('G.downs'),1);
    run('G.P.down=0;downed()');assert.equal(run('G.score'),25);assert.equal(run('G.downs'),2);
  }
});
test('local timed duels apply the same unlimited revives and score loss to player and AI',()=>{
  const {run}=setup();run("RIVAL_ON=true;G.quick=true;mkRival('swordsman');G.score=100;G.cores=0;downed();G.rival.score=101;G.rival.hp=1;rivalHurt(10);");
  assert.equal(run('G.score'),50);assert.equal(run('G.rival.score'),50);assert.equal(run('G.rival.down'),4);assert.equal(run('G.rival.eliminated'),false);
});
test('solo and endless room runs start with three total lives and end on the third death',()=>{
  for(const room of [false,true]){
    const {run}=setup();run(`G.room=${room};ROOM.data.mode='last'`);
    assert.equal(run('G.cores+1'),3);
    run('downed()');assert.equal(run('G.cores'),1);assert.equal(run('G.over'),null);
    run('G.P.down=0;downed()');assert.equal(run('G.cores'),0);assert.equal(run('G.over'),null);
    run('G.P.down=0;downed()');assert.equal(run('G.over'),'lose');
  }
});
test('legacy permanent bonuses cannot increase the three-life starting budget',()=>{
  const {c,run}=setup();const ui=source('ui');
  vm.runInContext(ui.slice(ui.indexOf('function applyUpgrades('),ui.indexOf('/* HUD */')),c);
  run('SAVE.up.core=10;SAVE.perks.cores=10;applyUpgrades(G.P)');assert.equal(run('G.cores+1'),3);
});
test('room countdown follows the shared wall clock and quick duel countdown includes selection time',()=>{
  const {c,run}=setup();let now=100000;c.Date={now:()=>now};
  run("G.room=true;ROOM.data={mode:'time',len:180,startedAt:100000,delay:4000};G.t=0");assert.equal(run('duelRemaining()'),180);
  now=279200;assert.ok(Math.abs(run('duelRemaining()')-4.8)<1e-9);
  now=284000;assert.equal(run('duelRemaining()'),0);
  run('G.room=false;RIVAL_ON=true;G.rival={};G.quick=true;G.t=100;G.pickWall=20');assert.equal(run('duelRemaining()'),60);
  run('RIVAL_ON=false');assert.equal(run('duelRemaining()'),null);
});
test('life HUD shows three hearts in finite modes and hides the entire group in timed duels',()=>{
  const {c,run,elements}=setup(),ui=source('ui');
  vm.runInContext(ui.slice(ui.indexOf('function updateCores(){'),ui.indexOf('function updateDuelClock(){')),c);
  run('updateCores()');assert.equal(elements.get('#cores').children.length,3);assert.equal(elements.get('#cores')['aria-label'],'Lives 3/3');
  run("G.room=true;ROOM.data.mode='time';updateCores()");assert.equal(elements.get('#cores').hidden,true);
});
test('the final overlay shows 5 through 1, then clears at zero and on a new solo run',()=>{
  const {c,run,elements}=setup(),ui=source('ui');c.fmt=t=>String(t);
  vm.runInContext(ui.slice(ui.indexOf('function updateDuelClock(){'),ui.indexOf('/* Live skill inspection')),c);
  run('G.room=true;G.t=175');
  for(let digit=5;digit>=1;digit--){run(`G.t=${180-digit};updateDuelClock()`);assert.equal(elements.get('#duelfinal').textContent,String(digit));assert.equal(elements.get('#duelfinal').hidden,false)}
  run('G.t=180;updateDuelClock()');assert.equal(elements.get('#duelfinal').hidden,true);
  run('G.room=false;updateDuelClock()');assert.equal(elements.get('#duelfinal').hidden,true);
});
test('an endless room ends on the first eliminated player even with two survivors remaining',()=>{
  const {c,run}=setup(),net=source('net'),ends=[],writes=[];
  c.players=[{uid:'a',alive:false,done:true},{uid:'b',alive:true},{uid:'ai',ai:true,alive:true}];
  c.roomPlayerList=()=>c.players;c.roomEndRun=why=>{ends.push(why);run("G.over='pk'")};c.aiPut=(uid,patch)=>writes.push({uid,patch});c.aiFlush=()=>{};
  c.roomAllDone=()=>false;
  run("G.room=true;ROOM.data.mode='last';ROOM.playing=true;ROOM.host=true;");
  vm.runInContext(net.slice(net.indexOf('function roomCheckFinished(){'),net.indexOf('function roomRank(){')),c);
  run('roomCheckFinished()');assert.deepEqual(ends,['last']);assert.equal(writes.length,1);assert.equal(writes[0].patch.done,true);
});
test('endless AI uses the same three-life budget and is eliminated only on its third death',()=>{
  const {c,run}=setup();c.roomCheckFinished=()=>{};
  run("G.room=true;ROOM.data.mode='last';mkRival('swordsman');G.rival.score=500;");
  for(let n=0;n<3;n++){run('G.rival.down=0;G.rival.inv=0;G.rival.hp=1;rivalHurt(10)');assert.equal(run('G.rival.eliminated'),n===2)}
  assert.equal(run('G.rival.score'),500);
});
test('timed death overlay displays the actual deduction and clears after revival',()=>{
  const {c,run,elements}=setup(),ui=source('ui');
  vm.runInContext(ui.slice(ui.indexOf('function updateDuelDeath(){'),ui.indexOf('/* Live skill inspection')),c);
  run('G.room=true;G.score=101;downed();updateDuelDeath()');
  assert.equal(elements.get('#dueldeathloss').textContent,'DEATH −51');
  assert.equal(elements.get('#dueldeathrevive').textContent,'Reviving in 4 s');
  assert.equal(elements.get('#dueldeath').hidden,false);
  run('G.P.down=0;updateDuelDeath()');assert.equal(elements.get('#dueldeath').hidden,true);
});
test('duel selection header shows current ladder rank and points rather than solo records',()=>{
 const {c,run,elements}=setup(),ui=source('ui');c.ladderOf=()=>[0,'青铜','Bronze'];
 vm.runInContext(ui.slice(ui.indexOf('function renderAsura(){'),ui.indexOf('function renderTitle(){')),c);
 run("SAVE.mode='room';SAVE.trophies=15;renderAsura()");
 assert.equal(elements.get('#endlessbest').hidden,false);
 assert.match(elements.get('#endlessbest').innerHTML,/Ladder: Bronze/);assert.match(elements.get('#endlessbest').innerHTML,/15 pts/);
});
test('death breaks streak and overdrive in solo, timed and endless duels while retaining the best streak',()=>{
  for(const mode of ['solo','time','last']){const {run}=setup();run(`G.room=${mode!=='solo'};ROOM.data.mode='${mode}';G.combo=351;G.comboT=2;G.comboMax=351;G.over9=1;downed()`);assert.equal(run('G.combo'),0,mode);assert.equal(run('G.comboT'),0,mode);assert.equal(run('G.over9'),0,mode);assert.equal(run('G.comboMax'),351,mode);run('comboHit()');assert.equal(run('G.combo'),0,'lingering attacks while down must not restart streak');run('G.P.down=0;comboHit()');assert.equal(run('G.combo'),1);assert.equal(run('G.over9'),0)}
});
test('final death also clears the current streak and overdrive',()=>{const {run}=setup();run('G.cores=0;G.combo=50;G.comboT=2;G.over9=1;downed()');assert.equal(run('G.over'),'lose');assert.equal(run('G.combo'),0);assert.equal(run('G.over9'),0)});
test('AI opponents lose their streak on final elimination too',()=>{const {run}=setup();run("G.room=true;ROOM.data.mode='last';mkRival('swordsman');G.rival.cores=0;G.rival.hp=1;G.rival.combo=50;G.rival.comboT=2;G.rival.over9=1;rivalHurt(10)");assert.equal(run('G.rival.eliminated'),true);assert.equal(run('G.rival.combo'),0);assert.equal(run('G.rival.comboT'),0);assert.equal(run('G.rival.over9'),0)});
