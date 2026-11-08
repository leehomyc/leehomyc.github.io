'use strict';
/* One host-owned set of world pickups. A pickup is removed atomically before its
   reward is granted; snapshots resend unacknowledged grants without duplicating them. */
function arenaLootReset(){ARENA.loot=new Map();ARENA.lootSeq=0;ARENA.rewardSeq=0;ARENA.grants={};ARENA.lootApplied=new Set();ARENA.lootAcks=[];ARENA.lootHolds=new Map()}
function arenaLootActor(uid){
  if(uid===roomUid())return !G.over&&G.P.down<=0?G.P:null;
  if(uid===G.rivalSeat)return G.rival&&!G.rival.eliminated&&G.rival.down<=0?G.rival:null;
  const r=ARENA.remote[uid],p=ROOM.players[uid];return r&&p&&p.alive!==false&&!p.done&&!r.down?r:null;
}
function arenaLootTrack(){
  if(!ARENA.loot)arenaLootReset();
  const active=new Set(),add=(kind,item)=>{if(!item.lootId)item.lootId=`${ROOM.data?.round||1}:${kind}:${++ARENA.lootSeq}`;active.add(item.lootId);if(!ARENA.loot.has(item.lootId))ARENA.loot.set(item.lootId,{id:item.lootId,kind,item})};
  for(const c of G.chests)if(!c.dead)add('c',c);
  for(const f of G.fx)if(f.k==='relic'&&f.t>0)add('r',f);
  for(const g of G.gems)if(!g.dead)add('g',g);
  for(const s of G.shrines)add('s',s);
  for(const [id,o] of ARENA.loot){if(!active.has(id)||o.item.dead||(o.kind==='r'&&o.item.t<=0))ARENA.loot.delete(id)}
}
function arenaLootSnapshot(){arenaLootTrack();return [...ARENA.loot.values()].map(o=>{const v=o.item;return o.kind==='r'?[o.id,'r',r0(v.x),r0(v.y),v.id,r2(v.t)]:o.kind==='g'?[o.id,'g',r0(v.x),r0(v.y),v.v,v.big?1:0]:o.kind==='s'?[o.id,'s',v.x,v.y,r2(v.cd)]:[o.id,'c',r0(v.x),r0(v.y),v.kind||'normal',r2(v.t||0)]})}
function arenaLootMirror(rows){
  if(!Array.isArray(rows))return;if(!ARENA.loot)arenaLootReset();const old=ARENA.loot,next=new Map(),chests=[],gems=[],relics=[],shrines=[];
  for(const a of rows){const [id,kind,x,y,value,extra]=a,prior=old.get(id),item=prior?.item||{lootId:id,x,y};item.x=x;item.y=y;
    if(kind==='r'){Object.assign(item,{k:'relic',id:value,t:extra,T:60});relics.push(item)}
    else if(kind==='g'){Object.assign(item,{v:value,big:extra,dead:false});gems.push(item)}
    else if(kind==='s'){item.cd=value;shrines.push(item)}
    else if(kind==='c'){Object.assign(item,{kind:value,t:extra,ok:1,dead:false});chests.push(item)}else continue;
    next.set(id,{id,kind,item});
  }
  ARENA.loot=next;G.chests=chests;G.gems=gems;G.shrines=shrines;G.fx=G.fx.filter(f=>f.k!=='relic');G.fx.push(...relics);
}
function arenaLootRadius(actor,kind){return kind==='g'?pickupRadius({mag:actor.mag||1}):kind==='r'?30:34}
function arenaLootClaim(uid,id){
  if(!ARENA.host||!ARENA.loot)return false;const o=ARENA.loot.get(id),actor=arenaLootActor(uid);if(!o||!actor)return false;
  const item=o.item;if(item.dead||o.kind==='r'&&item.t<=0||o.kind==='s'&&item.cd>0)return false;
  if(hyp(item.x-actor.x,item.y-actor.y)>arenaLootRadius(actor,o.kind)+5)return false;
  if(o.kind==='r'&&RELICS[item.id]?.cursed){const key=uid+'_'+id,old=ARENA.lootHolds.get(key),h=old&&G.t-old.last<1.8?old:{start:G.t};h.last=G.t;ARENA.lootHolds.set(key,h);if(uid===roomUid())item.hold=G.t-h.start;if(G.t-h.start<.6)return false}
  // Mark consumed before creating rewards or processing the next player's request.
  let reward={kind:o.kind,x:item.x,y:item.y};
  if(o.kind==='s'){item.cd=50;reward.buff=pick(['dmg','spd','haste'])}
  else{item.dead=true;if(o.kind==='r')item.t=0;ARENA.loot.delete(id)}
  if(o.kind==='r')reward.relic=item.id;
  if(o.kind==='g')reward.xp=item.v;
  if(o.kind==='c'){
    reward.chest=item.kind||'normal';reward.card=item.kind==='gold'?'legendary':G.t<600||SIMR()<.5?'normal':null;
    for(let i=0;i<10;i++){const a=i/10*TAU;spawnGem({x:item.x+Math.cos(a)*18,y:item.y+Math.sin(a)*18,v:3,big:1})}
    if(item.kind==='gold'||SIMR()<.5)dropRelic(item.x,item.y);
    if(item.kind==='trap')for(let i=0;i<14;i++){const a=i/14*TAU;spawnEnemy('assassin',clamp(item.x+Math.cos(a)*60,30,W-30),clamp(item.y+Math.sin(a)*60,30,H-30),1.2);const e=G.en[G.en.length-1];e.affix='swift';e.spd*=1.4}
  }
  const rid=`${ROOM.data?.round||1}:award:${++ARENA.rewardSeq}`;reward={...reward,rid};
  if(uid===roomUid()||uid===G.rivalSeat)arenaLootAward(uid,reward);
  else{const grants=ARENA.grants[uid]||(ARENA.grants[uid]=new Map());grants.set(rid,reward)}
  return true;
}
function arenaLootAward(uid,reward){
  if(!ARENA.lootApplied)arenaLootReset();if(ARENA.lootApplied.has(reward.rid))return false;ARENA.lootApplied.add(reward.rid);
  if(uid===G.rivalSeat){const R=G.rival;if(!R)return false;
    if(reward.kind==='g')R.xp+=reward.xp*.6;
    if(reward.kind==='c'){R.score+=PK_EVENTS.chest;R.xp+=30;if(reward.card)R.spells[0].lv+=reward.card==='legendary'?3:1}
    if(reward.kind==='s'){R.hp=Math.min(R.maxHp,R.hp+R.maxHp*.35);R.mana=R.maxMana}
    if(reward.kind==='r'){R.relics=R.relics||[];R.relics.push(reward.relic);if(reward.relic==='shell')R.maxHp*=1.15;else if(reward.relic==='boots')R.spd*=1.12;else if(reward.relic==='pill'){R.maxHp+=40;R.hp+=40}else if(reward.relic==='feather')R.cores=Math.min(RUN_LIVES-1,(R.cores||0)+1);else R.dmg*=1.05}
    return true;
  }
  if(uid!==roomUid())return false;
  if(reward.kind==='g'){gainXP(reward.xp*comboMult()*.6);if(typeof SFX!=='undefined')SFX.pick(0)}
  else if(reward.kind==='r')takeRelic(reward.relic);
  else if(reward.kind==='s'){heal(G.P.maxHp*.35);G.P.mana=G.P.maxMana;G.P.buff={k:reward.buff,t:20};showBanner('抢到神龛加持','Shrine blessing claimed',1.4);if(typeof SFX!=='undefined')SFX.shrine()}
  else if(reward.kind==='c'){
    const gold=reward.chest==='gold',trap=reward.chest==='trap';G.goldRun+=Math.round(25*(gold||trap?2:1)*(hasR('bowl')?1.3:1));G.chestsOpened=(G.chestsOpened||0)+1;G.score+=PK_EVENTS.chest;(G.sc=G.sc||{kill:0,big:0,ev:0}).ev+=PK_EVENTS.chest;
    if(reward.card){G.picks.push({kind:'level',...(reward.card==='legendary'?{forceQ:'legendary'}:{})});openPick()}
    ring(reward.x,reward.y,70,gold?'#ffe9a0':'#ffd27a');showBanner('抢到宝箱！','Chest claimed!',1.4);if(typeof SFX!=='undefined')SFX.chest();
  }
  return true;
}
function arenaLootTick(dt){
  if(!G.shared||!ARENA.on)return;
  if(ARENA.host){arenaLootTrack();for(const uid of [roomUid(),...(G.rivalSeat?[G.rivalSeat]:[])]){const actor=arenaLootActor(uid);if(!actor)continue;for(const o of [...ARENA.loot.values()])if(hyp(o.item.x-actor.x,o.item.y-actor.y)<=arenaLootRadius(actor,o.kind))arenaLootClaim(uid,o.id);else ARENA.lootHolds.delete(uid+'_'+o.id)}}
}
function arenaLootRequests(){
  if(!ARENA.loot||G.P.down>0||G.over)return [];const out=[];
  for(const o of ARENA.loot.values()){
    const item=o.item,near=hyp(item.x-G.P.x,item.y-G.P.y)<=arenaLootRadius(G.P,o.kind);
    if(o.kind==='r'&&RELICS[item.id]?.cursed){if(!near){item.hold=0;delete item._holdAt}else{item._holdAt=item._holdAt??G.t;item.hold=G.t-item._holdAt}}
    if(near&&(o.kind!=='s'||item.cd<=0))out.push(o.id);
  }
  return out;
}
function arenaLootReceive(grants){for(const reward of grants||[]){arenaLootAward(roomUid(),reward);if(!ARENA.lootAcks.includes(reward.rid))ARENA.lootAcks.push(reward.rid)}ARENA.lootAcks=ARENA.lootAcks.slice(-128)}
function arenaLootGuestClaims(uid,m){
  if(!ARENA.grants)arenaLootReset();const grants=ARENA.grants[uid];if(grants)for(const rid of m.la||[])grants.delete(rid);
  const requested=new Set((m.lc||[]).slice(0,160));for(const key of ARENA.lootHolds.keys())if(key.startsWith(uid+'_')&&!requested.has(key.slice(uid.length+1)))ARENA.lootHolds.delete(key);for(const id of requested)arenaLootClaim(uid,id);
}

function arenaLootSpawnAnchor(){const actors=[G.P,...Object.values(ARENA.remote).filter(r=>!r.down),...(G.rival&&!G.rival.eliminated?[G.rival]:[])];return pick(actors)}
