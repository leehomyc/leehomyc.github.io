const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=n=>fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8');
function setup(){const c=vm.createContext({console,Math,Date,Set,Map,SAVE:{mode:'solo'},DAILY:false,W:2600,H:2000,TAU:Math.PI*2,clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),hyp:Math.hypot,rnd:()=>0,SIMR:()=>0,pick:a=>a[0],L:(z,e)=>e,showBanner(){},ring(){},hazard(){}});const run=s=>vm.runInContext(s,c);run(src('content'));run(src('sim'));run(src('director'));run('ring=()=>{};G={auto:false,over:false,room:false,spells:[],relics:[],en:[],hazards:[],t:180,effectiveDealt:12000,P:{hp:100,maxHp:100,def:1,down:0}};dirInit();G.dirStat={kpm:400,dmgRate:0,still:true};G.dir.hist=[{t:150,effective:0}]');return {c,run}}
test('damage cards add base bonuses then diminish, while capped pickup cards stop',()=>{
 const {run}=setup();run('const P={dmg:1,mag:1};const keen=PERKS.find(p=>p.en==="Keen Edge"),mag=PERKS.find(p=>p.en==="Lodestone");for(let i=0;i<5;i++){keen.a(P);mag.a(P)}');assert.ok(Math.abs(run('P.dmg')-1.6)<1e-8);assert.ok(Math.abs(run('P.mag')-3)<1e-8);
 run('for(let i=0;i<100;i++){keen.a(P);mag.a(P)}');assert.ok(run('P.dmg')>3.4);assert.ok(run('P.dmg')<7);assert.ok(Math.abs(run('P.mag')-3.4)<1e-8);assert.equal(run('P.pickupStacks'),6);
});
test('final pickup radius stays local even with stacked gear and relic multipliers',()=>{
 const {run}=setup();for(const t of [0,180,600])assert.ok(run(`pickupRadius({mag:400},${t})`)<=180);assert.equal(run('pickupRadius({mag:1},600)'),52);
});
test('rejuvenation cannot exceed its total healing budget at extreme skill power',()=>{
 const {run}=setup();assert.equal(run('rejuvHealing({maxHp:100},{m:1},0,0)'),12);assert.ok(run('rejuvHealing({maxHp:100},{m:9999},2,999)')<35);
});
test('qi spending outruns regen during repeated casts and cost reduction cannot make skills free',()=>{
 const {run}=setup();run('const P={mana:0,maxMana:100,regen:100,manaRest:1};manaRegen(P,1)');assert.equal(run('P.mana'),1.125);run('manaRegen(P,1)');assert.equal(run('P.mana'),5.625);assert.equal(run('skillCost(mkSpell("ward"))'),44);
 run('G.relics=["taiji","bind"];const s=mkSpell("ward");for(let i=0;i<TREES.ward.length;i++)if(TREES.ward[i].fx==="cost")s.nodes[i]=100');assert.ok(run('skillCost(s)')>0);
});
test('adaptation waits for wave boundaries, only scales new enemies and retreats when health drops',()=>{
 const {run}=setup();run('dirAdaptiveStep();const level=G.dir.adaptLevel;dirAdaptiveStep()');assert.equal(run('G.dir.adaptLevel'),1);
 run('G.t=210;dirAdaptiveStep();const e={type:"bandit",hp:100,maxHp:100,dmg:10,r:8,xp:1,sc:1};G.en.push(e);dirAdaptEnemy(e)');assert.equal(run('G.dir.adaptLevel'),2);assert.ok(run('e.hp')>100);assert.ok(run('e.hp')<=300);assert.ok(run('e.dmg')<=25);assert.ok(run('e.adaptArmor')<=.12);assert.equal(run('e.adaptAbility'),'blast');
 run('G.P.hp=30;G.t=240;dirAdaptiveStep()');assert.equal(run('G.dir.adaptLevel'),0);
});
test('competitive modes never receive player-specific adaptive enemies',()=>{
 const {run}=setup();run('G.room=true;G.dir.adaptProfile={level:8,hp:9999,def:.4,dps:99999};const e={type:"bandit",hp:100,maxHp:100,dmg:10};dirAdaptEnemy(e)');assert.equal(run('e.hp'),100);assert.equal(run('e.dmg'),10);
});
test('adaptive attacks telegraph for 1.25 seconds and cannot burst for more than 18% HP',()=>{
 const {c,run}=setup();const hazards=[];c.hazard=(x,y,r,tele,dur,burst,dps,col)=>{const h={x,y,r,tele,dur,burst};hazards.push(h);run('G.hazards').push(h)};
 run('const e={x:0,y:0,r:8,dmg:20,adaptAbility:"line",adaptCd:0};G.en=[e];dirEnemyAttack(e,{x:100,y:0},.1)');assert.equal(hazards.length,5);assert.ok(hazards.every(h=>h.tele===1.25&&h.burst<=18));
});
test('blooddrinker heals only after real HP loss, never on a blocked hit',()=>{
 const {run}=setup();run(`G.P.x=G.P.y=100;G.P.hp=100;G.P.dash=0;const leech={hp:10,maxHp:100};G.hazards=[{x:100,y:100,r:30,tele:.1,dur:.2,burst:20,dps:0,leech}];dmgP=n=>{G.P.hp-=n};hazardTick(.2)`);assert.equal(run('leech.hp'),13);
 run(`G.hazards=[{x:100,y:100,r:30,tele:.1,dur:.2,burst:20,dps:0,leech}];dmgP=()=>{};hazardTick(.2)`);assert.equal(run('leech.hp'),13);
});
test('Vitality keeps max-health growth but restores only five HP per stack',()=>{
 const {run}=setup();run('G.P.hp=10;const vitality=PERKS.find(p=>p.en==="Vitality");vitality.a(G.P);vitality.a(G.P)');assert.equal(run('G.P.maxHp'),150);assert.equal(run('G.P.hp'),20);
});
test('ignoring a rift buffs existing and future enemies once, then expires after 60 seconds',()=>{
 const {run}=setup();run('const e={type:"bandit",hp:50,maxHp:100,dmg:10,spd:30};G.en=[e];G.mission={k:"seal",n:5};failMission(G.mission);sealEmpower(e)');assert.equal(run('e.hp'),60);assert.equal(run('e.maxHp'),120);assert.equal(run('e.dmg'),12);assert.equal(run('e.spd'),36);assert.equal(run('G.sealRageUntil'),240);
 run('const next={type:"archer",hp:100,maxHp:100,dmg:20,spd:50};G.en.push(next);sealEmpower(next)');assert.equal(run('next.hp'),120);
 run('G.t=240;sealRageTick()');assert.equal(run('e.hp'),50);assert.equal(run('e.maxHp'),100);assert.equal(run('next.dmg'),20);assert.equal(run('G.sealRageUntil'),0);
});
test('a completed rift is never punished if the timer expires in the same frame',()=>{
 const {run}=setup();run('G.mission={k:"seal",n:0};failMission(G.mission)');assert.equal(run('G.sealRageUntil'),undefined);
});
test('boss skyfall locks a dodgeable location, lands there and deals a health percentage through armour',()=>{
 const {c,run}=setup();c.collide=()=>{};run(`spark=()=>{};trauma=()=>{};shock=()=>{};G.P.x=100;G.P.y=100;G.P.maxHp=100;G.P.hp=100;G.P.def=.4;G.P.dash=0;const B={type:'boss',x:300,y:300,hp:1000,maxHp:1000,n:0,r:20,skyCd:0};G.boss=B;bossSkyfall(B,.1)`);
 assert.equal(run('B.skyfall.x'),100);assert.equal(run('G.hazards[0].tele'),1.6);assert.equal(run('G.hazards[0].percent'),.2);
 run('dmgP=n=>{G.P.hp-=n*.4};hazardTick(1.6)');assert.equal(run('G.P.hp'),80);
 run('bossSkyfall(B,1.6)');assert.equal(run('B.x'),100);assert.equal(run('B.skyfall'),null);assert.ok(run('B.exposed')>0);
});
test('moving out of skyfall avoids all of its percentage damage',()=>{
 const {c,run}=setup();c.collide=()=>{};run(`G.P.x=G.P.y=100;G.P.dash=0;G.boss={type:'boss',x:300,y:300,hp:1000,maxHp:1000,n:2,r:20,skyCd:0};bossSkyfall(G.boss,.1);G.P.x=400;dmgP=()=>{throw Error('attack followed the player')};hazardTick(1.6)`);assert.equal(run('G.hazards[0].x'),100);
});
test('melody healing grows gently with skill power instead of multiplying with offensive damage',()=>{
 const {run}=setup();assert.equal(run('melodyHealing({maxHp:100},{m:1},0)'),9);
 assert.ok(run('melodyHealing({maxHp:100},{m:100},2)')<17);
 assert.ok(run('melodyHealing({maxHp:100},{m:101},2)')>run('melodyHealing({maxHp:100},{m:100},2)'));
});
test('injury reduces healing for 2.5 seconds without consuming budget on overheal',()=>{
 const {run}=setup();run('G.curse={};G.over=false;G.P.hp=20;G.t=100;G.woundedUntil=102.5;heal(10)');assert.equal(run('G.P.hp'),23.5);
 run('G.t=103;heal(5)');assert.equal(run('G.P.hp'),28.5);
});
test('standing still attracts a fixed, dodgeable lightning strike with a cooldown; duels exclude it',()=>{
 const {c,run}=setup();c.hazard=(x,y,r,tele,dur,burst,dps,col)=>run('G.hazards').push({x,y,r,tele,dur,burst,dps,col});
 run('G.P.x=G.P.y=100;dirStationaryStrike();dirStationaryStrike()');assert.equal(run('G.hazards.length'),1);assert.equal(run('G.hazards[0].percent'),.22);assert.equal(run('G.hazards[0].tele'),1.6);
 run('G.P.x=400;G.P.dash=0;dmgP=()=>{throw Error("strike followed player")};hazardTick(1.6)');
 run('G.room=true;G.hazards=[];G.t=1000;dirStationaryStrike()');assert.equal(run('G.hazards.length'),0);
});
test('boss phases create telegraphed combinations and delayed followups without retargeting marked ground',()=>{
 const {c,run}=setup();c.hazard=(x,y,r,tele,dur,burst,dps,col)=>run('G.hazards').push({x,y,r,tele,dur,burst,dps,col});
 run('G.P.x=G.P.y=100;G.later=[];const B={type:"boss",hp:350,maxHp:1000,x:300,y:300,patternCd:0};G.boss=B;bossPressurePatterns(B,1.1)');
 assert.equal(run('B.pressurePhase'),3);assert.equal(run('G.hazards.length'),5);assert.ok(run('G.hazards.every(h=>h.tele===1.5&&Math.abs(h.percent-.21)<1e-8)'));assert.equal(run('G.later.length'),1);
 run('G.P.x=600;G.later[0].f()');assert.equal(run('G.hazards[5].x'),100);
 run('G.room=true;G.hazards=[];B.patternCd=0;bossPressurePatterns(B,1)');assert.equal(run('G.hazards.length'),0);
});
test('boss sizing follows the full current build even if tiny monsters cap effective damage',()=>{const {run}=setup();run('G.P={...G.P,dmg:1,dmgBonus:0,crit:0,haste:1,regen:5,maxMana:130};G.spells=[mkSpell("wave")];G.dpsAvg=1000000;G.effectiveDpsAvg=1;const before=powerHp(30);G.P.dmgBonus=20;G.P.crit=2;G.spells[0].lv=30');assert.ok(run('powerHp(30)')>run('before')*100);run('G.room=true');assert.equal(run('powerHp(30)'),9000000)});
test('defeated bosses clear their pending combination telegraphs',()=>{const {run}=setup();run('G.P.x=G.P.y=100;G.hazards=[{tele:1,dur:1,patternBoss:{dead:true}}];dmgP=()=>{throw Error("dead boss attack")};hazardTick(2)');assert.equal(run('G.hazards.length'),0)});
test('late elites stay dangerous even when regular monsters cap effective damage',()=>{const {run}=setup();run('G.t=600;G.dir.adaptProfile={level:5,hp:1000,def:1,dps:100,buildDps:20000};const trash={type:"bandit",hp:100,maxHp:100,dmg:10,r:8,xp:1,sc:1};const elite={...trash,elite:true};dirAdaptEnemy(trash);dirAdaptEnemy(elite)');assert.ok(run('trash.maxHp')>300);assert.ok(run('trash.maxHp')<run('elite.maxHp'));assert.ok(run('elite.maxHp')>20000);assert.equal(run('elite.tenacious'),true)});
test('tenacious elites break sustained control briefly, while normal monsters remain controllable',()=>{const {run}=setup();run('const elite={tenacious:true,frz:2,sleep:0,r:10,x:0,y:0};dirControlResilience(elite,1.5)');assert.equal(run('elite.frz'),0);assert.equal(run('elite.resolve'),2);run('elite.frz=1;dirControlResilience(elite,.2)');assert.equal(run('elite.frz'),0);run('const trash={frz:2};dirControlResilience(trash,2)');assert.equal(run('trash.frz'),2)});
test('boss armour reduces damage and critical overflow contributes to build-based HP',()=>{const {run}=setup();run('G.P={...G.P,dmg:1,dmgBonus:0,crit:0,haste:1,regen:5,maxMana:130};G.spells=[mkSpell("wave")];G.curse={};G.fx=[];G.floats=[];const e={type:"boss",hp:1000,maxHp:1000,bossArmor:.35};hit(e,100,null,true);const normal=buildBossDps();G.P.crit=3');assert.equal(run('e.hp'),935);assert.ok(run('buildBossDps()')>=run('normal')*6)});
test('Enchantress gaze locks a marked location for 1.5 seconds and freezes only below half health',()=>{const {c,run}=setup();c.hazard=(x,y,r,tele,dur,burst,dps,col)=>run('G.hazards').push({x,y,r,tele,dur,burst,dps,col});run('G.P.x=G.P.y=100;const B={n:5,hp:600,maxHp:1000,gazeCd:0};bossCharmGaze(B,G.P,.1)');assert.equal(run('G.hazards[0].tele'),1.5);assert.equal(run('G.hazards[0].status.freeze'),0);run('B.hp=400;B.gazeCd=0;bossCharmGaze(B,G.P,.1);G.P.x=500');assert.equal(run('G.hazards[1].x'),100);assert.equal(run('G.hazards[1].status.freeze'),.65)});
test('boss control has a four-second protection interval and blocks actions only during the brief freeze',()=>{const {run}=setup();run('G.curse={};G.pick=null;G.paused=false;G.panel=false;applyBossControl(G.P,{freeze:.65,chill:2})');assert.equal(run('G.P.frozen'),.65);assert.equal(run('canAct()'),false);assert.equal(run('applyBossControl(G.P,{freeze:.65})'),false);run('G.P.frozen=0;G.t+=4.1');assert.equal(run('canAct()'),true);assert.equal(run('applyBossControl(G.P,{confuse:10})'),true);assert.equal(run('G.P.confuse'),1.8)});
test('dodging or shielding a gaze prevents its control effect',()=>{const {run}=setup();run('G.P.x=G.P.y=100;G.P.dash=0;G.curse={};G.hazards=[{x:100,y:100,r:52,tele:.1,dur:.3,percent:.1,status:{freeze:.65},dps:0}];dmgP=()=>{};hazardTick(.2)');assert.equal(run('G.P.frozen'),undefined);run('G.hazards=[{x:100,y:100,r:52,tele:.1,dur:.3,percent:.1,status:{freeze:.65},dps:0}];G.P.x=500;dmgP=()=>{throw Error("gaze followed dodging player")};hazardTick(.2)');assert.equal(run('G.P.frozen'),undefined)});
test('elemental resistance cannot erase an entire hit, and fusion element order never changes the result',()=>{const {run}=setup();run('const fire=mkSpell("sword");fire.els=["fire"];const fusionA=mkSpell("sword"),fusionB=mkSpell("sword");fusionA.els=["fire","ice"];fusionB.els=["ice","fire"]');assert.equal(run('affinity({type:"giant"},fire,false).k'),.5);assert.equal(run('affinity({type:"firewisp"},fire,false).k'),.35);assert.equal(run('affinity({type:"firewisp"},fusionA,false).k'),run('affinity({type:"firewisp"},fusionB,false).k'));assert.ok(run('affinity({type:"firewisp"},fusionA,false).k')>1)});
test('stacked monster defenses have a 25% damage floor, while boss armor is unchanged',()=>{const {run}=setup();assert.equal(run('enemyDamageFactor({type:"brute",adaptArmor:.22,sealEmpowered:true},.3,.3)'),.25);assert.equal(run('enemyDamageFactor({type:"boss",bossArmor:.35})'),.65);assert.equal(run('enemyDamageFactor({type:"bandit"},1.6)'),1.6)});
test('crowd-wide DPS is never used as one small monster’s HP budget',()=>{const {run}=setup();run('G.t=600;G.dir.adaptProfile={level:5,hp:100,def:1,dps:1e12,buildDps:100};const e={type:"bandit",hp:100,maxHp:100,dmg:10,r:8,xp:1,sc:1};dirAdaptEnemy(e)');assert.ok(run('e.hp')<500);assert.ok(Number.isFinite(run('e.hp')))});
test('normal-monster HP estimates ignore boss-only gear and do not assume every multishot hits one small target',()=>{const {run}=setup();run('G.P={...G.P,dmg:1,dmgBonus:0,crit:0,haste:1,regen:5,maxMana:130};G.spells=[mkSpell("sword")];G.spells[0].lv=40;G.gx={boss:0};const before=buildEnemyDps();G.gx.boss=5000');assert.equal(run('buildEnemyDps()'),run('before'));assert.ok(run('buildBossDps()')>run('buildEnemyDps()')*50)});

test('opening relief fades smoothly and is gone before late-game adaptation',()=>{const {run}=setup();assert.equal(run('openingPressure(0)'),.9);assert.ok(Math.abs(run('openingPressure(60)')-.95)<1e-9);assert.equal(run('openingPressure(120)'),1);assert.equal(run('openingPressure(600)'),1)});
