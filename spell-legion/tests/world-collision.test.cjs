const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8');
function setup(){
 const c=vm.createContext({Math,console,Set,Map,document:{querySelector:()=>({getContext:()=>({})})},i18nStatic(){},matchMedia:()=>({matches:false}),window:{},MAPID:'valley'}),run=s=>vm.runInContext(s,c);run(source('core'));return {c,run};
}
test('restarting a run keeps the rendered world layout regardless of combat seed',()=>{
 const {run}=setup();run('seedSim(1);buildArena();const first=JSON.stringify({rocks,maples,lanterns})');run('for(let i=0;i<500;i++)rnd();seedSim(12345);buildArena()');assert.equal(run('JSON.stringify({rocks,maples,lanterns})'),run('first'));
});
test('world generation never consumes the combat RNG',()=>{
 const {run}=setup();run('seedSim(987);const expected=Array.from({length:5},()=>rnd());seedSim(987);buildArena()');assert.equal(run('JSON.stringify(Array.from({length:5},()=>rnd()))'),run('JSON.stringify(expected)'));
});
test('different maps have their own repeatable layouts',()=>{
 const {run}=setup();run('buildArena();const valley=JSON.stringify(rocks);MAPID="snow";buildArena();const snow=JSON.stringify(rocks);MAPID="valley";buildArena()');assert.notEqual(run('valley'),run('snow'));assert.equal(run('JSON.stringify(rocks)'),run('valley'));
});
test('bamboo patches have no invisible projectile or player collision, while ruins remain solid',()=>{
 const {run}=setup();run('rocks=[{x:100,y:100,w:100,h:90,bamboo:1},{x:300,y:100,w:50,h:50,ruin:1}];rockGrid=null;const player={x:150,y:140};collide(player,6)');assert.equal(run('blocked(150,140)'),false);assert.equal(run('JSON.stringify(player)'),JSON.stringify({x:150,y:140}));assert.equal(run('blocked(320,120)'),true);run('const wallPlayer={x:320,y:120};collide(wallPlayer,6)');assert.equal(run('blocked(wallPlayer.x,wallPlayer.y)'),false);
});
test('generated bamboo patches stay passable across their full bounds',()=>{
 const {run}=setup();run('buildArena();const patches=rocks.filter(r=>r.bamboo)');assert.ok(run('patches.length')>0);assert.equal(run('patches.every(r=>[.1,.5,.9].every(u=>[.1,.5,.9].every(v=>!blocked(r.x+r.w*u,r.y+r.h*v))))'),true);
});
