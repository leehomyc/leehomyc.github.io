import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup(mode='last') {
  const c=vm.createContext({console,setInterval(){},addEventListener(){},Date,Math,
    spark(){},showBanner(){},updateCores(){},trauma(){},closeCards(){},aoe(){},near(){},
    L:(zh,en)=>en,renderRoomResults(){},SFX:{revive(){},lose(){},win(){}}});
  for(const name of ['sim','net'])vm.runInContext(fs.readFileSync(new URL(`../../js/${name}.js`,import.meta.url),'utf8'),c);
  const run=s=>vm.runInContext(s,c);
  run(`spark=()=>{};aoe=()=>{};near=()=>{};
    ROOM.code='TEST';ROOM.playing=true;ROOM.host=true;ROOM.ended=false;ROOM.data={mode:${JSON.stringify(mode)},ai:{}};
    roomUid=()=> 'me';roomSetMe=patch=>Object.assign(ROOM.players.me,patch);
    roomPlayerList=()=>Object.entries(ROOM.players).map(([uid,p])=>({uid,...p}));
    aiFlush=()=>{for(const uid in ROOM.aiPend)Object.assign(ROOM.players[uid],ROOM.aiPend[uid]);ROOM.aiPend=null};
    ROOM.players={me:{alive:true,score:20,t:0},other:{alive:true,score:10,t:0},third:{alive:true,score:0,t:0}};
    G={room:true,auto:false,t:100,cores:2,coreT:0,slow:0,score:20,lv:1,kills:0,later:[],
      P:{hp:100,maxHp:100,maxMana:100,down:0,x:1,y:1},spells:[]};`);
  return {run};
}

test('each life permits one delayed revive; exhausted lives cause permanent elimination',()=>{
  const {run}=setup();
  for(const left of [1,0]){
    run('downed()');
    assert.equal(run('G.cores'),left);
    assert.equal(run('G.P.down'),4);
    assert.equal(run('G.P.hp'),0);
    assert.equal(run('G.over'),undefined);
    assert.equal(run('castSkill(0)'),false);
    run('downed();heal(100)');
    assert.equal(run('G.cores'),left);
    assert.equal(run('G.P.hp'),0);
    run('G.P.down=0;revive()');
    assert.equal(run('G.P.hp'),60);
  }
  run('downed()');
  assert.equal(run('G.over'),'lose');
  assert.equal(run('ROOM.players.me.alive'),false);
  assert.equal(run('ROOM.players.me.done'),true);
  run('revive();downed()');
  assert.equal(run('G.P.hp'),0);
  assert.equal(run('G.downs'),3);
});

test('endless lives do not regenerate; solo regeneration and timed room respawns remain available',()=>{
  const {run}=setup();
  run('G.cores=0;G.coreT=69;reviveCoreTick(100)');
  assert.equal(run('G.cores'),0);
  run('G.room=false;reviveCoreTick(70)');
  assert.equal(run('G.cores'),1);
  const timed=setup('time').run;
  timed('G.shared=true;G.cores=0;downed()');
  assert.equal(timed('G.P.down'),4);
  assert.equal(timed('G.over'),undefined);
});

test('AI uses finite lives with a full delay and stays eliminated',()=>{
  const {run}=setup();
  run(`G.rival={hp:100,maxHp:100,cores:2,inv:0,down:0,downs:0,x:0,y:0,score:10,lv:1,kills:0,
    mana:0,maxMana:100,regen:1,spells:[]};`);
  for(const left of [1,0]){
    run('G.rival.inv=0;rivalHurt(200)');
    assert.equal(run('G.rival.cores'),left);
    run('rivalTick(3.9)');
    assert.equal(run('G.rival.hp'),0);
    assert.ok(run('G.rival.down')>0);
    run('rivalTick(.11)');
    assert.equal(run('G.rival.hp'),100);
  }
  run(`G.rivalSeat='other';ROOM.players.other.ai=true;G.rival.inv=0;rivalHurt(200);rivalTick(1000)`);
  assert.equal(run('G.rival.eliminated'),true);
  assert.equal(run('G.rival.hp'),0);
  assert.equal(run('ROOM.players.other.alive'),false);
  assert.equal(run('ROOM.players.other.done'),true);
  assert.equal(run('G.over'),undefined);
});

test('one elimination leaves remaining players fighting; the last survivor wins',()=>{
  const {run}=setup();
  run('ROOM.players.third.alive=false;ROOM.players.third.done=true;roomCheckFinished()');
  assert.equal(run('G.over'),undefined);
  run('ROOM.players.other.alive=false;ROOM.players.other.done=true;roomCheckFinished()');
  assert.equal(run('G.over'),'pk');
  assert.equal(run('ROOM.endWhy'),'last');
});

test('a surviving guest continues when the eliminated player was the host',()=>{
  const {run}=setup();
  run(`ROOM.data.host='other';G.mirror=true;let detached=false;
    arenaDetach=eliminated=>{detached=eliminated;G.mirror=false};
    roomOnPlayers({me:{alive:true},other:{alive:false,done:true},third:{alive:true}})`);
  assert.equal(run('detached'),true);
  assert.equal(run('G.over'),undefined);
});

test('an eliminated host can finish results when the last survivor is AI',()=>{
  const {run}=setup();
  run(`G.over='lose';ROOM.ended=true;ROOM.players.me={alive:false,done:true,t:10};
    ROOM.players.third={alive:false,done:true,t:20};ROOM.players.other={ai:true,alive:true,done:false,score:1};
    roomCheckFinished()`);
  assert.equal(run('ROOM.players.other.done'),true);
  assert.equal(run('ROOM.results[0].uid'),'other');
});

test('elimination time determines endless placement before score',()=>{
  const {run}=setup();
  run(`ROOM.players.me={alive:false,t:10,score:9999};ROOM.players.other={alive:false,t:20,score:1};
    ROOM.players.third={alive:true,t:20,score:0}`);
  assert.equal(run('roomRank().map(p=>p.uid).join(",")'),'third,other,me');
});

test('XP received while reviving waits until the player returns and cannot heal a corpse',()=>{
  const {run}=setup();
  run(`G.P.down=4;G.P.hp=0;G.xp=5;G.need=6;G.lv=1;G.picks=[];G.curse={};
    Object.assign(G.P,{maxMana:100,mana:0,regen:1,spd:1,crit:.05,dmgBonus:0,attr:{str:0,vit:0,spr:0,agi:0}});
    xpNeed=()=>6;openPick=()=>{};SFX.levelup=()=>{};gainXP(2)`);
  assert.equal(run('G.P.hp'),0);
  assert.equal(run('G.lv'),1);
  assert.equal(run('G.pendingXP'),2);
  run('G.P.down=0;revive()');
  assert.equal(run('G.lv'),2);
  assert.equal(run('G.pendingXP'),0);
  assert.ok(run('G.P.hp')>0);
  run(`G.over='lose';G.P.hp=0;gainXP(1000)`);
  assert.equal(run('G.P.hp'),0);
  assert.equal(run('G.pendingXP'),0);
});

test('a completed mission cannot pay points during the revive penalty',()=>{
  const {run}=setup();
  run(`G.P.down=4;G.mission={n:0};G.picks=[];PK_EVENTS={mission:40};openPick=()=>{};SFX.complete=()=>{};checkMission()`);
  assert.equal(run('G.score'),20);
  assert.ok(run('G.mission'));
  run('G.P.down=0;checkMission()');
  assert.equal(run('G.score'),60);
  assert.equal(run('G.mission'),null);
});

test('the last human wins when all opponents have left the room',()=>{
  const {run}=setup();
  run('delete ROOM.players.other;delete ROOM.players.third;roomCheckFinished()');
  assert.equal(run('G.over'),'pk');
});

test('a stale heartbeat cannot settle a match with multiple living players',()=>{
  const {run}=setup();
  run(`ROOM.ended=true;ROOM.players.me.alive=false;ROOM.players.me.done=true;
    ROOM.lastSeen={other:Date.now()-30000,third:Date.now()-30000};roomCheckFinished()`);
  assert.equal(run('ROOM.results'),null);
});

test('AI winner settlement flushes the final combat stats using the game clock',()=>{
  const {run}=setup();
  run(`G.over='lose';G.t=124;ROOM.ended=true;ROOM.players.me={alive:false,done:true};
    ROOM.players.third={alive:false,done:true};ROOM.players.other={ai:true,alive:true,done:false,score:348,kills:179,t:145};
    G.rivalSeat='other';G.rival={score:349,kills:180,lv:14,hp:176,maxHp:176};roomCheckFinished()`);
  assert.equal(run('ROOM.results[0].score'),349);
  assert.equal(run('ROOM.results[0].kills'),180);
  assert.equal(run('ROOM.results[0].t'),124);
});
