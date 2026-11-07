const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8');
function setup(){
 const writes=[],items=[{id:'weapon',zh:'玄妙·雁翎刀',en:'Arcane Sabre',enhance:7},{id:'armor',zh:'青布衫',en:'Blue Robe',enhance:3}];
 const c=vm.createContext({Promise,JSON,String,Array,console:{warn(){}},ROOM:{code:'TEST',playing:false,players:{}},gearEquipped:()=>items,roomUid:()=> 'me',netT:()=>({setPlayer:(code,uid,data)=>{writes.push({code,uid,data});return Promise.resolve()}}),L:(zh,en)=>zh});
 const net=source('net'),room=source('room');
 vm.runInContext(net.slice(net.indexOf('function roomEquipment(){'),net.indexOf('function roomSetReady(')),c);
 vm.runInContext(room.slice(room.indexOf('function roomEquipmentText('),room.indexOf('function roomJoinRow(')),c);
 return {c,writes,items};
}
test('room equipment shares names only and omits ids, upgrade levels and affixes',async()=>{
 const {c,writes}=setup();await c.roomSyncEquipment();
 assert.deepEqual(JSON.parse(JSON.stringify(writes[0])),{code:'TEST',uid:'me',data:{equipment:[{zh:'玄妙·雁翎刀',en:'Arcane Sabre'},{zh:'青布衫',en:'Blue Robe'}]}});
 assert.equal(c.roomEquipmentText({uid:'me'}),'装备：玄妙·雁翎刀、青布衫');
});
test('equipment changes sync in the lobby without repeated identical writes or mid-round updates',async()=>{
 const {c,writes,items}=setup();c.ROOM.players.me={equipment:JSON.parse(JSON.stringify(c.roomEquipment()))};
 assert.equal(await c.roomSyncEquipment(),false);assert.equal(writes.length,0);
 items.pop();assert.equal(await c.roomSyncEquipment(),true);assert.equal(writes[0].data.equipment.length,1);
 c.ROOM.playing=true;items.length=0;assert.equal(await c.roomSyncEquipment(),false);assert.equal(writes.length,1);
 c.ROOM.playing=false;await c.roomSyncEquipment();assert.equal(writes[1].data.equipment.length,0);
});
test('empty and older equipment records display Gear None without crashing',()=>{
 const {c,items}=setup();items.length=0;
 assert.equal(c.roomEquipmentText({uid:'me'}),'装备：无');
 assert.equal(c.roomEquipmentText({uid:'other'}),'装备：无');
 assert.equal(c.roomEquipmentText({uid:'other',equipment:[null,{},false]}),'装备：无');
 assert.equal(c.roomEquipmentText({uid:'other',equipment:[{zh:'测试剑',en:'Test sword',enhance:20}]}),'装备：测试剑');
});
