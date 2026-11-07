const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'../js/ui.js'),'utf8');
const controls=fs.readFileSync(path.join(__dirname,'../js/input.js'),'utf8');
const sim=fs.readFileSync(path.join(__dirname,'../js/sim.js'),'utf8');
function setup(){
  const calls=[],listeners={},timers=new Map(),cleared=[];
  let clock=0,id=0;
  const elements=new Map();
  const element=()=>({hidden:true,textContent:'',classList:{remove(){},add(){}},children:[]});
  const c=vm.createContext({calls,addEventListener:(n,f)=>listeners[n]=f,
    $:s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s)},
    SFX:{start(){},toggleMute(){calls.push('mute')}},syncSound(){},showBanner(){},
    G:{auto:false,picks:[],pick:null,P:{down:0}},RIVAL_ON:true,ROOM:{},
    startRun:()=>calls.push('start'),togglePanel:()=>calls.push('panel'),togglePause:()=>calls.push('pause'),
    castSkill:i=>calls.push('cast'+i),dash:()=>calls.push('dash'),
    performance:{now:()=>clock},setInterval:f=>{timers.set(++id,f);return id},clearInterval:n=>cleared.push(n),
    document:{addEventListener:(n,f)=>listeners[n]=f,querySelector:s=>s.includes('#gearov')?[...elements.entries()].find(([id,el])=>(id==='#gearov'||id==='#lb')&&!el.hidden)?.[1]||null:null},choose:i=>calls.push('choose'+i),
  });
  vm.runInContext(sim.match(/^function canAct\(\).*$/m)[0],c);
  vm.runInContext(controls.slice(controls.indexOf('const keys='),controls.indexOf("cv.addEventListener('pointerdown'")),c);
  vm.runInContext(ui.slice(ui.indexOf('let pickOpenedAt='),ui.indexOf('function openPick()')),c);
  vm.runInContext(ui.slice(ui.indexOf('function closeCards()'),ui.indexOf('/* title:')),c);
  const run=s=>vm.runInContext(s,c);
  function key(k,opts={}){let prevented=false;c.handleGameKeydown({key:k,preventDefault(){prevented=true},...opts});return prevented}
  return {c,run,key,calls,listeners,timers,cleared,clock:v=>clock=v};
}
test('typing, composing and browser shortcuts never trigger game actions',()=>{
  const {key,calls,run}=setup();
  for(const field of ['input','textarea','select','contenteditable']){
    const target={closest:s=>s.startsWith('input,')?field:null};
    for(const k of ['m','Enter',' ','ArrowRight','1'])assert.equal(key(k,{target}),false);
  }
  key('m',{isComposing:true});key('p',{ctrlKey:true});key('m',{metaKey:true});key('1',{altKey:true});
  assert.deepEqual(calls,[]);assert.equal(run('keys.size'),0);
});
test('native button keys and an open leaderboard do not activate gameplay',()=>{
  const {key,calls,run}=setup();
  const target={closest:s=>s.startsWith('button,')?{}:null};
  for(const k of ['Enter',' ','ArrowRight'])assert.equal(key(k,{target}),false);
  for(const id of ['#lb','#gearov']){run(`$('${id}').hidden=false`);key('Escape');key('1');key('ArrowRight');run(`$('${id}').hidden=true`)}
  assert.deepEqual(calls,[]);assert.equal(run('keys.size'),0);
});
test('movement, skills and mute work while repeated toggle keys are ignored',()=>{
  const {key,calls,run}=setup();
  assert.equal(key('ArrowRight'),true);assert.equal(run("keys.has('arrowright')"),true);
  key('1');key(' ');key('m');key('m',{repeat:true});key('p',{repeat:true});key('1',{repeat:true});
  assert.deepEqual(calls,['cast1','dash','mute']);
});
test('changing focus clears held movement and card keys',()=>{
  const {key,run,listeners}=setup();key('w');run("pickKeyHeld.add('1');touch.on=true");listeners.focusin();
  assert.equal(run('keys.size'),0);assert.equal(run('pickKeyHeld.size'),0);assert.equal(run('touch.on'),false);
});
test('closing cards clears the timer and timer label before the next run',()=>{
  const {run,cleared}=setup();run("pickTimer=42;G.pick=[{}];G.picks=[{}];$('#picktimer').textContent='3s';closeCards()");
  assert.deepEqual(cleared,[42]);assert.equal(run('pickTimer'),null);assert.equal(run('G.pick'),null);assert.equal(run('G.picks.length'),0);assert.equal(run("$('#picktimer').textContent"),'');
});
test('a stale timer cannot select cards in a new run or clear its new timer',()=>{
  const {c,run,timers,cleared,calls,clock}=setup();
  // Execute the same scheduling block as openPick without constructing card DOM.
  const begin=ui.indexOf('  clearGameInput();stopPickTimer();',ui.indexOf('function openPick()'));
  const end=ui.indexOf('  const sk=q.s?',begin);
  c.cards=[{}];run('G.pick=cards;pickOpenedAt=0');vm.runInContext(ui.slice(begin,end),c);
  const old=timers.get(1);run('G={pick:[{}]};pickTimer=2');clock(9000);old();
  assert.deepEqual(calls,[]);assert.deepEqual(cleared,[1]);assert.equal(run('pickTimer'),2);
});
test('current duel selection still chooses once when its countdown expires',()=>{
  const {c,run,timers,calls,clock}=setup();
  c.cards=[{}];run('G.pick=cards;pickOpenedAt=0');const begin=ui.indexOf('  clearGameInput();stopPickTimer();',ui.indexOf('function openPick()'));
  vm.runInContext(ui.slice(begin,ui.indexOf('  const sk=q.s?',begin)),c);clock(8100);timers.get(1)();assert.deepEqual(calls,['choose0']);
});
test('ward restores health and applies its promised area effect and feedback',()=>{
  const c=vm.createContext({SPELLS:{ward:{cost:40,cd:14,col:'green'}},NODE_FX:{cost:.15,dmg:.12,cd:.08,dur:1,knock:.5,size:.15},TREES:{},calls:[],SFX:{ward(){c.calls.push('sound')}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/sim.js'),'utf8'),c);
  vm.runInContext(`heal=n=>calls.push(['heal',n]);aoe=(...args)=>calls.push(['aoe',...args]);trauma=()=>calls.push('trauma');shock=()=>calls.push('shock');
    G={over:false,relics:[],P:{x:10,y:20,maxHp:100,mana:100,down:0,haste:1},spells:[mkSpell('ward')]};castSkill(0);`,c);
  assert.equal(vm.runInContext('G.P.mana',c),60);assert.ok(Math.abs(vm.runInContext('G.P.shieldHp',c)-36.2)<1e-9);
  assert.equal(c.calls[0][0],'heal');assert.equal(c.calls[0][1],25);assert.equal(c.calls[1][0],'aoe');assert.equal(c.calls[1][3],80);assert.equal(c.calls[1][4],8);
  assert.deepEqual(Array.from(c.calls.slice(-3)),['trauma','shock','sound']);
});
