const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8');
function setup(){
 const handlers={},docHandlers={},pointer={},calls={mute:0,cast:0,dash:0,pause:0,pick:[]};
 const body={closest:()=>null},nodes={'#title':{hidden:true},'#hero':{hidden:true},'#end':{hidden:true},'#startbtn':{disabled:false,click(){calls.start=(calls.start||0)+1}}};
 const pads=[];
 const c=vm.createContext({console,Set,Math,Array,performance:{now:()=>1000},
  G:{P:{down:0},auto:false},pickOpenedAt:0,lobbyTab:'',
  document:{activeElement:body,hidden:false,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(k,f)=>docHandlers[k]=f},
  cv:{addEventListener:(k,f)=>pointer[k]=f,setPointerCapture:()=>calls.capture=(calls.capture||0)+1},
  navigator:{getGamepads:()=>pads},addEventListener:(k,f)=>handlers[k]=f,$:id=>nodes[id],hyp:Math.hypot,
  SFX:{start(){},toggleMute(){calls.mute++;return true}},syncSound(){},showBanner(){},L:(a,b)=>b,
  togglePause(){calls.pause++;c.G.paused=!c.G.paused},togglePanel(){c.G.panel=!c.G.panel},
  castSkill(){calls.cast++},dash(){calls.dash++},choose(i){calls.pick.push(i);c.G.pick=null},toLobby(){calls.lobby=(calls.lobby||0)+1},
 });
 vm.runInContext(source('sim').match(/^function canAct\(\).*$/m)[0],c);
 vm.runInContext(source('input'),c);
 const key=(key,extra={})=>{const e={key,target:body,preventDefault(){this.prevented=true},...extra};handlers.keydown(e);return e};
 return {c,calls,key,handlers,docHandlers,pointer,pads,nodes,body,evaluate:s=>vm.runInContext(s,c)};
}
test('typing, composition and browser shortcuts do not trigger game actions or consume spaces',()=>{
 const {c,calls,key,evaluate}=setup();const field={closest:()=>true};c.document.activeElement=field;
 for(const k of ['m','Enter','1',' ','p'])assert.equal(key(k,{target:field}).prevented,undefined);
 c.document.activeElement={closest:()=>null};key('m',{ctrlKey:true});key('m',{metaKey:true});key('m',{isComposing:true});
 assert.equal(calls.mute,0);assert.equal(calls.cast,0);assert.equal(calls.pause,0);assert.equal(calls.start,undefined);assert.equal(evaluate('keys.size'),0);
});
test('holding a toggle key changes pause or mute only once',()=>{
 const {key,c,calls}=setup();key('p');assert.equal(c.G.paused,true);key('p',{repeat:true});assert.equal(c.G.paused,true);assert.equal(calls.pause,1);
 key('m');key('m',{repeat:true});assert.equal(calls.mute,1);
});
test('a fresh card key works without an unrelated key release and cannot select the next card while held',()=>{
 const {c,key,handlers,calls}=setup();c.G.pick=Array.from({length:5},()=>({}));key('5');assert.deepEqual(calls.pick,[4]);
 c.G.pick=[{}];key('5',{repeat:true});key('5');assert.deepEqual(calls.pick,[4]);
 handlers.keyup({key:'5'});key('1');assert.deepEqual(calls.pick,[4,0]);
});
test('pointer movement belongs to one primary pointer and is cleared when capture is lost',()=>{
 const {pointer,evaluate,calls}=setup();
 pointer.pointerdown({button:2,pointerId:1});pointer.pointerdown({button:0,isPrimary:false,pointerId:2});assert.equal(calls.capture,undefined);
 pointer.pointerdown({button:0,isPrimary:true,pointerId:3,clientX:10,clientY:10});
 pointer.pointermove({pointerId:4,clientX:100,clientY:100});assert.equal(evaluate('touch.x'),10);
 pointer.pointermove({pointerId:3,clientX:46,clientY:10});assert.equal(evaluate('input().x'),1);
 pointer.lostpointercapture({pointerId:3});assert.equal(evaluate('touch.on'),false);assert.equal(evaluate('input().x'),0);
});
test('blur, backgrounding and form focus clear held movement',()=>{
 const {c,key,handlers,docHandlers,evaluate}=setup();key('w');assert.equal(evaluate('input().y'),-1);
 handlers.focusin();assert.equal(evaluate('keys.size'),0);
 key('w');handlers.blur();assert.equal(evaluate('keys.size'),0);
 key('w');c.document.hidden=true;docHandlers.visibilitychange();assert.equal(evaluate('keys.size'),0);
});
test('gamepad edges are recorded while a card or panel covers combat',()=>{
 const {c,pads,calls}=setup();const pad={connected:true,index:0,id:'test',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};pads.push(pad);c.padTick();
 c.G.pick=[{}];pad.buttons[2].pressed=true;c.padTick();c.G.pick=null;c.padTick();assert.equal(calls.cast,0);
 pad.buttons[2].pressed=false;c.padTick();pad.buttons[2].pressed=true;c.padTick();assert.equal(calls.cast,1);
 pad.buttons[2].pressed=false;c.padTick();c.G.panel=true;pad.buttons[2].pressed=true;c.padTick();c.G.panel=false;c.padTick();assert.equal(calls.cast,1);
});
test('core action readiness blocks overlays, death and delayed revives without blocking demo or passive effects',()=>{
 const {c}=setup();for(const state of [{paused:true},{panel:true},{pick:[{}]},{over:'lose'},{ended:true},{P:{down:2}}]){c.G={P:{down:0},...state};assert.equal(c.canAct(),false)}
 c.G={P:{down:0}};assert.equal(c.canAct(),true);c.G={P:{down:0},auto:true,pick:[{}]};assert.equal(c.canAct(),true);
 c.G={P:{down:0},_free:1,pick:[{}]};assert.equal(c.canAct(),true);
});
test('controllers cannot act in a background tab and holding a background press does not fire on return',()=>{
 const {c,pads,calls}=setup();const pad={connected:true,index:0,id:'test',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};pads.push(pad);c.padTick();
 c.document.hidden=true;pad.buttons[2].pressed=true;c.padTick();c.document.hidden=false;c.padTick();assert.equal(calls.cast,0);
 pad.buttons[2].pressed=false;c.padTick();pad.buttons[2].pressed=true;c.padTick();assert.equal(calls.cast,1);
});
test('skill and dash cooldown durations use the same effective values displayed by the HUD',()=>{
 const c=vm.createContext({G:{P:{haste:4}},SPELLS:{ward:{cd:12},palm:{cd:8}},stat:()=>({cdM:.5}),hasR:()=>false});
 const s=source('sim');vm.runInContext(s.match(/^const CD_FLOOR=.*$/m)[0],c);vm.runInContext(s.match(/^function skillCooldown.*$/m)[0],c);vm.runInContext(s.match(/^function dashCooldown.*$/m)[0],c);
 assert.equal(c.skillCooldown({id:'ward'}),10);assert.equal(c.skillCooldown({id:'palm'}),1);assert.equal(c.dashCooldown(),1.1);c.hasR=()=>true;assert.equal(c.dashCooldown(),.82);
});

test('Escape pauses and resumes an upgrade choice without selecting a hidden card',()=>{
 const {c,key,calls}=setup();const cards=[{}];c.G.pick=cards;
 key('Escape');assert.equal(c.G.paused,true);assert.equal(c.G.pick,cards);
 key('1');assert.deepEqual(calls.pick,[]);
 key('Escape');assert.equal(c.G.paused,false);assert.equal(c.G.pick,cards);
 key('1');assert.deepEqual(calls.pick,[0]);
});
