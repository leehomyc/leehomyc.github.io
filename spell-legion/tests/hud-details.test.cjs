const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/ui.js'),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
test('health warnings use health percentage, clear after recovery and do not label death as low health',()=>{
  const context=vm.createContext({Math});vm.runInContext(extract('function vitalsStatus(', 'function updateVitalsFeedback('),context);
  const status=context.vitalsStatus;
  assert.equal(status(30,100,100,100).low,true);
  assert.equal(status(15,100,100,100).critical,true);
  assert.equal(status(31,100,100,100).low,false);
  assert.equal(status(0,100,0,100).low,false);
  assert.equal(status(60,400,20,100).critical,true);
  assert.equal(status(100,100,20,100).lowEnergy,true);
  assert.equal(status(100,100,21,100).lowEnergy,false);
});
test('skill details show current level and only purchased tree nodes, with ranks and effects',()=>{
  const context=vm.createContext({SPELLS:{staff:{en:'Arcane Staff',de:'Sweeping attack',auto:true}},TREES:{staff:[{en:'Power',de:'Damage +12% per rank',max:3},{en:'Range',de:'Wider attacks',max:2}]},L:(zh,en)=>en,LL:o=>o.en,ELS:{},AUGS:{}});
  vm.runInContext(extract('function skillHoverDetails(', 'let skillHoverAnchor='),context);
  const skill={id:'staff',lv:4,nodes:{0:2,1:0,99:1},els:[],augs:[]};
  const details=context.skillHoverDetails(skill);
  assert.equal(details.name,'Arcane Staff · Lv 4');
  assert.equal(details.description,'Sweeping attack');
  assert.deepEqual(Array.from(details.nodes),['Power · 2/3 — Damage +12% per rank']);
  skill.lv=5;skill.nodes[1]=1;
  const updated=context.skillHoverDetails(skill);
  assert.equal(updated.name,'Arcane Staff · Lv 5');assert.equal(updated.nodes.length,2);
});
