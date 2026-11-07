'use strict';
/* sim.js — game state, combat, skills, missions, shrines, cards, step */
let G=null,CLASS='swordsman',RIVAL_ON=false,SAVE_FIRST=false,DIFFID='normal';
const D=()=>DIFF[DIFFID]||DIFF.normal;
let ASURA_T=0,BOSSRUSH=false; // set from the title screen
const tier=n=>ASURA_T>=n; // is modifier n (1-based) active
function weaponOf(cls){const w=(typeof SAVE!=='undefined'&&SAVE.weapon&&SAVE.weapon[cls])||CLASSES[cls].main;return (WEAPONS[cls]||[]).includes(w)&&weaponUnlocked(cls,w)?w:CLASSES[cls].main}
function weaponUnlocked(cls,w){const i=WEAPON_INFO[w];if(!i||!i.need)return true;if(typeof SAVE==='undefined')return false;return !!(SAVE.weaponOwned&&SAVE.weaponOwned[w])||(i.need==='clsboss'&&!!(SAVE.clsWins&&SAVE.clsWins[cls]))}
function mkSpell(id){return {id,lv:1,cd:0,els:[],augs:[],dmg:0,active:0,casts:0,nodes:{},pts:0}}
const nd=(s,fx)=>{if(!s||!s.nodes)return 0;let r=0;const T=TREES[s.id]||[];for(const k in s.nodes)if(T[k]&&T[k].fx===fx)r+=s.nodes[k];return r}
function skillCost(s){return Math.round(SPELLS[s.id].cost*(1-NODE_FX.cost*nd(s,'cost'))*(G&&G.relics&&G.relics.includes('taiji')?.75:1)*(G&&G.relics&&G.relics.includes('bind')?.6:1))}
function newGame(auto,cls){
  cls=cls||CLASS;const C=CLASSES[cls];
  buildArena();if(typeof buildRuins==='function')buildRuins();
  const P={x:W/2,y:H/2,hp:C.hp,maxHp:C.hp,mana:C.mana,maxMana:C.mana,regen:C.regen,dmg:C.dmg,def:1,spd:C.spd,mag:1,haste:1,crit:.05,inv:0,face:1,walk:0,down:0,dash:0,dashCd:0,dx:0,dy:1,buff:null,cast:0,yaw:0,yaw0:0,shield:0,leap:null,cls,ap:0,sp:0,attr:{str:0,vit:0,spr:0,agi:0},dmgBonus:0};
  G={auto,t:0,P,cls,en:[],shots:[],bombs:[],bullets:[],gems:[],pools:[],fx:[],floats:[],arcs:[],later:[],ghosts:[],shocks:[],
     mush:[],grid:new Map(),spells:[mkSpell(weaponOf(cls)),mkSpell(C.skills[0])],pwaves:[],sariras:[],xp:0,lv:1,need:xpNeed(1),picks:[],kills:0,cores:2,coreT:0,
     spawnA:8,swarmT:55,mission:null,missionT:26,boss:null,bossT:0,paused:false,over:null,shake:0,trauma:0,shX:0,shY:0,hitStop:0,slow:0,flash:0,dmgTaken:0,
     shrines:SHRINES.map(s=>({x:s[0],y:s[1],cd:0})),elites:0,combo:0,comboT:0,comboMax:0,over9:0,chests:[],chestT:30,goldRun:0,rerolls:1,wave:0,ambush:0,warlord:0,bossN:0,bossSlain:0,warlordN:0,relics:[],novas:[],hazards:[],score:0,curse:{},contractN:0,hintT:0,hintN:0};
  if(typeof buildHero==='function')buildHero(cls,'player',weaponOf(cls));
  if(tier(5)){P.maxHp=Math.round(P.maxHp*.85);P.hp=P.maxHp}
  if(BOSSRUSH){G.lv=10;G.need=xpNeed(10);for(let i=0;i<9;i++)autoGrow();G.rerolls=3;G.spells[1].lv=4;G.spells.push(mkSpell(C.skills[1]));G.spells[2].lv=3;if(!auto){for(let i=0;i<3;i++)G.picks.push({kind:'level'});G.pickHold=3}} // boss rush: three opening cards so the build is yours, not auto-rolled
  if(RIVAL_ON)mkRival(cls);else{G.rival=null;if(typeof HEROES!=='undefined'&&HEROES.rival){scene.remove(HEROES.rival.g);scene.remove(HEROES.rival.sigil);HEROES.rival=null}}
  if(!auto&&typeof drawSeals==='function'){drawSeals();updateCores()}
}
const later=(t,f)=>G.later.push({t,f});
const BOSSES=[['血魔教主','Blood Demon Patriarch',null],['鬼面刀圣','Ghost-Mask Blade Saint','#8fe3ff'],['蛊母','Mother of Gu','#9ff06a'],['白骨尊者','Bone Venerable','#f4efe0'],['九幽魔尊','Lord of the Nine Hells','#b57cf0'],['千面妖姬','Thousand-Face Enchantress','#ff5fe8'],['铁面将军','Iron-Mask General','#c0c8d0']];
const RIVAL_SKIP=['qin'];const RIVAL_NEW=['oni','idol','wizard'];
const RIVAL_NAMES={swordsman:['青衣剑客','Azure Swordsman'],taoist:['玄机道人','Mystic Taoist'],qin:['素琴仙子','Plain-Qin Maiden'],oni:['红莲浪人','Crimson Ronin'],idol:['星光偶像','Starlight Idol'],wizard:['星辰术士','Astral Sorcerer'],blademaster:['黑风刀客','Black Wind Blademaster'],monk:['铁头陀','Iron Monk'],physician:['毒手郎中','Venom Doctor']};
function mkRival(playerCls,seat){
  const opts=Object.keys(RIVAL_NAMES).filter(k=>k!==playerCls&&CLASSES[k]&&!RIVAL_SKIP.includes(k)),cls=seat&&CLASSES[seat.cls]?seat.cls:pick(opts),C=CLASSES[cls];
  const a=rnd(TAU);const R={x:clamp(W/2+Math.cos(a)*220,60,W-60),y:clamp(H/2+Math.sin(a)*180,60,H-60),cls,name:RIVAL_NAMES[cls],hp:C.hp,maxHp:C.hp,dmg:C.dmg,crit:.05,spd:C.spd,mana:C.mana,maxMana:C.mana,regen:C.regen,
    spells:[Object.assign(mkSpell(C.main),{owner:'rival'}),Object.assign(mkSpell(C.skills[0]),{owner:'rival'})],kills:0,score:0,lv:1,xp:0,need:6,down:0,inv:0,dx:0,dy:1,walk:0,cast:0,yaw:0,yaw0:0,goal:null,goalT:0,dmgDealt:0,downs:0,lx:0,ly:0,dash:0,ai:(DIFFID==='easy'?.9:DIFFID==='hard'?1.45:1.2)*(typeof SAVE!=='undefined'&&SAVE.mode==='qpk'?Math.min(2.2,.85+(SAVE.trophies||0)/900):1)};
  R.av=(seat&&seat.av)||(typeof randomAvatar==='function'?randomAvatar():null);
  if(seat){R.name=[seat.name||RIVAL_NAMES[cls][0],seat.name||RIVAL_NAMES[cls][1]];R.ai=clamp(.85+(seat.skill||.8)*.45,.9,1.6);R.seat=seat.uid}
  R.dmg*=R.ai;R.spd*=1+(R.ai-1)*.3;
  G.rival=R;if(typeof buildHero==='function')buildHero(cls,'rival');
}
function rivalTick(dt){
  const R=G.rival;if(!R)return;const P=G.P;
  R.inv=Math.max(0,R.inv-dt);R.mana=Math.min(R.maxMana,R.mana+R.regen*dt);if(R.combo>0){R.comboT-=dt;if(R.comboT<=0)R.combo=0}for(const s of R.spells)s.cd=Math.max(0,s.cd-dt);
  if(R.down>0){R.down-=dt;if(R.down<=0){R.hp=R.maxHp;R.inv=1.5;aoe(R.x,R.y,80,40,null,'#6fd3e8',true,{quiet:1})}return}
  // level ups: straight stat growth, like a player picking damage cards
  while(R.xp>=R.need){R.xp-=R.need;R.lv++;R.need=xpNeed(R.lv);R.dmg*=1.05;R.maxHp+=7;R.hp=Math.min(R.maxHp,R.hp+14);R.regen*=1.02;const sp=R.spells[R.lv%2];sp.lv++;if(sp.lv===7)sp.els.push(pick(Object.keys(ELS)));if(sp.lv===14)sp.els.push(pick(Object.keys(ELS).filter(k=>!sp.els.includes(k))));if(R.lv===4&&R.spells.length<3)R.spells.push(Object.assign(mkSpell(CLASSES[R.cls].skills[1]),{owner:'rival'}));if(R.lv===9&&R.spells.length<4)R.spells.push(Object.assign(mkSpell(CLASSES[R.cls].skills[2]),{owner:'rival'}))}
  // movement: hunt enemy clusters, keep a little distance, avoid the player's zone, roam when idle
  let x=0,y=0,cnt=0,cx=0,cy=0;
  near(R.x,R.y,230,e=>{if(e.type==='statue')return;const d=hyp(e.x-R.x,e.y-R.y),w=e.type==='boss'?0:Math.min(6,pts(e));cnt+=w;cx+=e.x*w;cy+=e.y*w;if(d<48){x-=(e.x-R.x)/(d||1)*(48-d)/48*2.2;y-=(e.y-R.y)/(d||1)*(48-d)/48*2.2}});
  if(cnt){cx/=cnt;cy/=cnt;const d=hyp(cx-R.x,cy-R.y)||1;if(d>90){x+=(cx-R.x)/d*.9;y+=(cy-R.y)/d*.9}}
  // PK: hunt the big prize - boss or warlord - and poach it when it is low
  const prize=G.boss&&!G.boss.dead?G.boss:G.en.find(e=>e.warlord&&!e.dead);
  if(prize&&RIVAL_ON){const d=hyp(prize.x-R.x,prize.y-R.y)||1,want=prize.hp<prize.maxHp*.35?1.6:.7*R.ai,keep=prize.type==='boss'?150:90;if(d>keep){x+=(prize.x-R.x)/d*want;y+=(prize.y-R.y)/d*want}else if(d<keep*.6){x-=(prize.x-R.x)/d*.8;y-=(prize.y-R.y)/d*.8}}
  for(const b of G.bullets){const d=hyp(b.x-R.x,b.y-R.y);if(d<40){x-=(b.x-R.x)/(d||1)*1.6;y-=(b.y-R.y)/(d||1)*1.6}}
  let gt=null,gd=160;for(const g of G.gems){const d=hyp(g.x-R.x,g.y-R.y);if(d<gd){gd=d;gt=g}}
  if(gt){x+=(gt.x-R.x)/(gd||1)*.7;y+=(gt.y-R.y)/(gd||1)*.7}
  const pd=hyp(P.x-R.x,P.y-R.y)||1;if(pd<140){x-=(P.x-R.x)/pd*(140-pd)/140*1.5;y-=(P.y-R.y)/pd*(140-pd)/140*1.5}
  R.goalT-=dt;if(!R.goal||R.goalT<=0||hyp(R.goal[0]-R.x,R.goal[1]-R.y)<60){R.goal=pick([...SHRINES,...PAVS,[W/2,H/2],[rnd(200,W-200),rnd(200,H-200)]]);R.goalT=rnd(8,16)}
  if(!cnt){const d=hyp(R.goal[0]-R.x,R.goal[1]-R.y)||1;x+=(R.goal[0]-R.x)/d*.8;y+=(R.goal[1]-R.y)/d*.8}
  const l=hyp(x,y);if(l>.05){const m=Math.min(1,l),sp=84*R.spd*m;R.x+=x/l*sp*dt;R.y+=y/l*sp*dt;R.walk+=dt*8;R.dx=x/l;R.dy=y/l;R.yaw0=Math.atan2(R.dx,R.dy);collide(R,6)}
  // gems
  for(const g of G.gems){if(hyp(g.x-R.x,g.y-R.y)<34){g.dead=1;R.xp+=g.v}}
  // attacks
  const main=R.spells[0],st=stat(main),t=nearest(R.x,R.y,main.id==='slash'?70:200,true);
  if(main.cd<=0&&t){const a=Math.atan2(t.y-R.y,t.x-R.x);R.dx=Math.cos(a);R.dy=Math.sin(a);R.yaw0=Math.atan2(R.dx,R.dy);R.cast=1;
    if(main.id==='sword'){const n=2+Math.floor(main.lv/3);for(let i=0;i<n;i++)shoot(R.x,R.y-6,a+(i-(n-1)/2)*.13,main,22*st.m,{knock:60,pierce:2,r:3.5});main.cd=.46*st.cdM}
    else if(main.id==='charm'){const n=2+Math.floor(main.lv/3);for(let i=0;i<n;i++)shoot(R.x,R.y-6,a+(i-(n-1)/2)*.5,main,20*st.m,{v:190,life:1.3,r:4.5,knock:50,boom:1,home:1,boom:1});main.cd=.62*st.cdM}
    else if(main.id==='needle'){const n=3+Math.floor(main.lv/4);for(let i=0;i<n;i++)shoot(R.x,R.y-6,a+(i-(n-1)/2)*.1,main,12*st.m,{v:300,life:.8,pierce:1,r:2.5,knock:20});main.cd=.5*st.cdM}
    else if(main.id==='wave'){const n=2+Math.floor(main.lv/4);for(let i=0;i<n;i++)shoot(R.x,R.y-6,a+(i-(n-1)/2)*.22,main,15*st.m,{v:220,life:1,pierce:3,r:5.5,knock:40,slow:.5});main.cd=.58*st.cdM}
    else{const n=7+Math.floor(main.lv/4);for(let i=0;i<n;i++)shoot(R.x+Math.cos(a)*6,R.y+Math.sin(a)*6-6,a+(i-(n-1)/2)*.19,main,15*st.m,{v:330,life:.17,pierce:99,r:6,knock:120});G.fx.push({k:'wave',x:R.x,y:R.y,a,t:.22,T:.22,c:SPELLS.slash.col,w:1.2});main.cd=.46*st.cdM}}
  for(let i=1;i<R.spells.length;i++){const sk=R.spells[i],sp=SPELLS[sk.id],ss=stat(sk);if(sk.cd>0||R.mana<sp.cost||!countNear(R.x,R.y,170))continue;R.mana-=sp.cost;sk.cd=sp.cd*ss.cdM;R.cast=1;
    const a=t?Math.atan2(t.y-R.y,t.x-R.x):Math.atan2(R.dy,R.dx);
    if(sk.id==='palm'){const n=5+Math.floor(sk.lv/3);for(let j=0;j<n;j++)shoot(R.x+Math.cos(a)*8,R.y+Math.sin(a)*8-6,a+(j-(n-1)/2)*.17,sk,12*ss.m,{v:235,life:.46,pierce:3,knock:190,r:4});G.fx.push({k:'wave',x:R.x,y:R.y,a,t:.28,T:.28,c:sp.col})}
    else if(sk.id==='talis'){const c=t||{x:R.x+R.dx*100,y:R.y+R.dy*100};lob(R.x,R.y-6,c.x,c.y,sk,(30+sk.lv*1.3)*ss.m,(30+sk.lv),false)}
    else if(sk.id==='whirl'){sk.active=sp.dur;sk.tk=0}
    else if(sk.id==='roar'){aoe(R.x,R.y,95,16*ss.m,sk,sp.col,false,{quiet:1});near(R.x,R.y,110,e=>{if(e.type!=='boss'&&e.type!=='statue')e.frz=.9})}
    else if(sk.id==='leap'){R.x+=Math.cos(a)*120;R.y+=Math.sin(a)*120;collide(R,6);aoe(R.x,R.y,46,(34+sk.lv*1.5)*ss.m,sk,sp.col,false,{quiet:1})}
    else if(sk.id==='ward'){R.hp=Math.min(R.maxHp,R.hp+R.maxHp*.25);R.inv=4;aoe(R.x,R.y,80,8*ss.m,sk,sp.col,false,{quiet:1})}
    else if(sk.id==='array'||sk.id==='bagua'){sk.active=sp.dur;sk.a=0}
  }
  for(const sk of R.spells){if(sk.id==='whirl'&&sk.active>0){sk.active-=dt;sk.tk-=dt;if(sk.tk<=0){sk.tk=.11;near(R.x,R.y,64,e=>{const dx=e.x-R.x,dy=e.y-R.y,d=hyp(dx,dy)||1;if(d<52+e.r)hit(e,7*stat(sk).m,sk,false,undefined,-dy/d*90,dx/d*90)})}}
    if((sk.id==='array'||sk.id==='bagua')&&sk.active>0){sk.active-=dt;const ss=stat(sk),n=3+Math.floor(sk.lv/3),Rr=sk.id==='bagua'?58:40;sk.a=(sk.a||0)+dt*3.2;sk.pos=[];for(let i=0;i<n;i++){const a=sk.a+i/n*TAU,x=R.x+Math.cos(a)*Rr,y=R.y-4+Math.sin(a)*Rr;sk.pos.push([x,y,a]);near(x,y,16,e=>{if(hyp(e.x-x,e.y-y)<e.r+6&&(e.orbT||0)<=0){e.orbT=.34;hit(e,9*ss.m,sk,false,undefined,-Math.sin(a)*120,Math.cos(a)*120)}})}if(sk.active<=0)sk.pos=null}}
}
function rivalHurt(n,fx,fy){const R=G.rival;if(!R||R.down>0||R.inv>0)return;R.hp-=n;R.inv=.4;if(R.hp<=0){R.hp=0;R.down=4;R.downs++;spark(R.x,R.y,'#6fd3e8',20,120)}}

/* ---------- relics ---------- */
const hasR=k=>G.relics.includes(k);
function dropRelic(x,y){let left=Object.keys(RELICS).filter(k=>!hasR(k));if(!left.length){if(SIMR()<.5||(G.dupRelics||0)>=10){G.goldRun+=40;return}left=Object.keys(RELICS)} // a full set still drops now and then: duplicates become power (up to ten)
  const cursedOut=G.fx.filter(f=>f.k==='relic'&&RELICS[f.id].cursed).length;if(cursedOut>=2)left=left.filter(k=>!RELICS[k].cursed).concat(left.length?[]:[]);if(!left.length)left=Object.keys(RELICS).filter(k=>!RELICS[k].cursed);
  if(G.fx.length<CAP.fx)G.fx.push({k:'relic',id:pick(left),x,y,t:60,T:60})}
function takeRelic(id){const R=RELICS[id],P=G.P;if(hasR(id)){if((G.dupRelics||0)>=10){G.goldRun+=40;if(G.floats.length<CAP.fl)G.floats.push({x:P.x,y:P.y-30,t:.9,v:'+40',c:'#ffd27a'});return}P.dmgBonus+=.05;P.maxHp+=10;P.hp=Math.min(P.maxHp,P.hp+10);G.dupRelics=(G.dupRelics||0)+1;if(typeof showSide==='function')showSide(`重复法宝 → 伤害 +5%,生命 +10(${G.dupRelics}/10)`,`Duplicate relic: +5% damage, +10 HP (${G.dupRelics}/10)`,'#ffd27a','relic');spark(P.x,P.y,'#ffd27a',12,80);if(typeof SFX!=='undefined')SFX.chest();return}G.relics.push(id);if(typeof codexSee==='function')codexSee('relic',id);
  if(id==='boots')P.spd*=1.12;if(id==='feather'){G.cores++;updateCores()}if(id==='bowl')P.mag*=1.4;if(id==='chime')P.haste/=.85;if(id==='pill'){P.maxHp+=40;P.hp+=40}if(id==='shell')P.def*=.85;if(id==='bloodcurse'){P.dmgBonus+=.35;P.maxHp=Math.round(P.maxHp*.75);P.hp=Math.min(P.hp,P.maxHp)}if(id==='glass'){P.crit+=.25;P.def*=1.2}if(id==='wolf'){P.mag*=.7}if(id==='bind'){P.spd*=.9}
  if(typeof showSide==='function')showSide(`法宝 · ${R.zh}:${R.d}`,`Relic · ${R.en}: ${R.de}`,R.col||'#c7a4f0','relic');else showBanner(`法宝:${R.zh}`,`${R.en} · ${R.de}`,2);trauma(.2);G.flash=Math.max(G.flash,.25);if(typeof SFX!=='undefined')SFX.chest();if(typeof drawSeals==='function')drawSeals();if(typeof drawRelics==='function')drawRelics()}
/* ---------- feel ---------- */
function trauma(n,dx,dy){G.trauma=Math.min(1,G.trauma+n);if(dx!==undefined){G.shX+=dx*n*40;G.shY+=dy*n*40}}
function hitStop(t){const mode=typeof SHAKE!=='undefined'?SHAKE:'low';if(mode==='off'||G.auto)return; // 关: the game never freezes
  if(mode==='low'){if(G.t-(G.lastStop||0)<.3)return;G.lastStop=G.t;t=Math.min(t,.035)*.7} // 弱: at most one short freeze every 0.3 s
  G.hitStop=Math.max(G.hitStop,t)}
function shock(x,y,R,str,T=.45){if(G.shocks.length>=3)G.shocks.shift();G.shocks.push({x,y,t:0,T,R,str})}

/* ---------- spatial ---------- */
function gridOf(e){return (e.x>>5)+((e.y>>5)<<12)}
function near(x,y,r,fn){
  const x0=(x-r)>>5,x1=(x+r)>>5,y0=(y-r)>>5,y1=(y+r)>>5;
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){
    const a=G.grid.get(cx+(cy<<12));if(!a)continue;
    for(const e of a)if(!e.dead&&fn(e)===false)return;
  }
}
function nearest(x,y,max,skipStatue){ // bosses and elites count as closer than they are, so auto-attacks focus them
  let b=null,bd=max;for(const e of G.en){if(e.dead)continue;let d=hyp(e.x-x,e.y-y);if(d>max)continue;
    if(e.type==='statue'){if(skipStatue&&(d>130||!(G.mission&&G.mission.k==='statue')))continue;d*=.4} // a mission stele within reach is a priority target, so normal attacks aim at it
    else if(e.type==='boss')d*=.3;else if(e.warlord)d*=.4;else if(e.role==='shaman')d*=.5;else if(e.elite)d*=.65;if(d<bd){bd=d;b=e}}return b}
function has(s,el){return s&&s.els.includes(el)}
function fusion(s){return s&&s.els.length===2?fusKey(s.els[0],s.els[1]):null}

/* ---------- combat ---------- */
/* 克制: multiplier for this skill against this monster; elites with affixes add their own */
function affinity(e,s,noEl){
  const A=AFFINITY[e.type];let k=1,why=null;
  if(A&&s){const m=SPELLS[s.id],cat=SKILL_CAT[s.id],el=noEl?null:(s.els&&s.els[0]);
    const match=q=>q&&((q.cat&&q.cat===cat)||(q.el&&q.el===el)||(q.auto&&m.auto));
    if(match(A.weak)){k*=e.type==='wraith'||e.type==='firewisp'||e.type==='icesprite'?2:1.6;why='weak'}
    if(match(A.resist)){k*=A.resist.el?0:.5;why='resist'}}
  if(e.affix==='armor'&&s&&SKILL_CAT[s.id]==='ranged'){k*=.6;why=why||'resist'}
  if(e.affix==='swift'&&s&&SKILL_CAT[s.id]==='control'){k*=1.5;why=why||'weak'}
  return {k,why};
}
function hit(e,d,s,noEl,col,kx=0,ky=0){
  if(e.dead)return;
  if(s&&e.type!=='boss'&&e.type!=='statue'){const af=affinity(e,s,noEl);if(af.k!==1){d*=af.k;if(af.k===0)d=0;
    if(!G.auto&&(!G.floats||G.floats.length<60)&&(af.why==='weak'||(!e.afSaid&&G.en.length<90))){e.afSaid=1;if((e.afT||-9)<G.t-.7){e.afT=G.t;G.floats.push({x:e.x+rnd(-3,3),y:e.y-e.r-10,t:.75,v:af.why==='weak'?L('克!','WEAK!'):af.k===0?L('免疫','IMMUNE'):L('抗','RESIST'),c:af.why==='weak'?'#ffe066':'#9a9a9a',crit:af.why==='weak'})}}
    if(d===0)return}}
  if(e.shield&&(kx||ky)){const fx=G.P.x-e.x,fy=G.P.y-e.y,fl=hyp(fx,fy)||1,kl=hyp(kx,ky)||1;if((-kx/kl*fx/fl-ky/kl*fy/fl)>.3){d*=.3;if(G.fx.length<CAP.fx&&SIMR()<.3)G.fx.push({k:'ring',x:e.x,y:e.y,r:10,t:.2,T:.2,c:'#9fc4ff'})}}
  if(e.sleep>0&&e.sleepS)d*=1+NODE_FX.dmg*nd(e.sleepS,'dmg');
  const P=G.P,rv=s&&s.owner==='rival',O=rv?G.rival:P;let m=d*O.dmg*(1+(O.dmgBonus||0))*(e.shred>0?1.25:1)*(!rv&&P.buff&&P.buff.k==='dmg'?1.3:1)*(s&&!SPELLS[s.id].auto?ACTIVE_MULT*(P.parryBoost||1):1)*(e.type==='boss'&&e.exposed>0?1.6:1); // active skills hit much harder per cast than the normal attack: they cost qi and have cooldowns
  const cc=O.crit+(s?NODE_FX.crit*nd(s,'crit'):0),crit=SIMR()<Math.min(1,cc);if(crit)m*=2+Math.max(0,cc-1)*2; // crit chance caps at 100%; the overflow becomes crit damage
  if(s&&!rv){const lf=nd(s,'life');if(lf)heal(m*NODE_FX.life*lf,s);const ch=nd(s,'chain');if(ch&&SIMR()<NODE_FX.chain*ch&&!noEl)arc(e,m*.35,s,1)}
  if(!rv&&P.frenzy>0){e.hp-=m*.4;if(s)s.dmg+=m*.4;heal(m*.03)}
  if(!rv){if(hasR('jade'))heal(m*.03);if(hasR('pearl')&&!noEl&&SIMR()<.12)arc(e,m*.4,s||G.spells[0],1);if(hasR('iron'))e.slow=Math.max(e.slow||0,.6);if(hasR('blood')&&P.hp<P.maxHp*.5){e.hp-=m*.25;if(s)s.dmg+=m*.25}}
  if(!rv&&typeof onHitX==='function')m=onHitX(e,m,s,crit,noEl);if(e.tired)m*=e.tired;if(!rv)G.dealt=(G.dealt||0)+m;e.hp-=m;e.flash=crit?.14:.08;e.sq=crit?.5:.3;if(kx||ky){const l=hyp(kx,ky)||1;e.sqx=kx/l;e.sqy=ky/l}if(s)s.dmg+=m;if(rv)G.rival.dmgDealt+=m;
  const kk=e.type==='boss'?.12:e.type==='giant'?.4:e.type==='statue'?0:1;
  e.kx=(e.kx||0)+kx*kk;e.ky=(e.ky||0)+ky*kk;
  if(!rv&&!G.auto&&G.floats.length<CAP.fl&&(m>=Math.max(18,e.maxHp*.25)||(crit&&(G.P.crit<.5||e.type==='boss'||e.elite||SIMR()<.2)))&&(G.en.length<120||e.type==='boss'||e.elite||m>=e.maxHp*.5))G.floats.push({x:e.x+rnd(-4,4),y:e.y-e.r-3,t:.6,v:Math.round(m),c:crit?'#ffd75a':(col||'#efe4cd'),crit});
  if(crit&&!rv){if(typeof SHAKE!=='undefined'&&SHAKE==='high')hitStop(.045);trauma(.1,kx,ky);if(G.fx.length<CAP.fx)G.fx.push({k:'crit',x:e.x,y:e.y,t:.22,T:.22})}
  if(s&&!noEl&&s.els.length)applyEls(e,m,s);
  if(s&&has(s,'dark')&&e.type!=='boss'&&e.type!=='statue'&&e.hp>0&&e.hp<e.maxHp*.12)e.hp=0;
  if(typeof SFX!=='undefined')SFX.hit(e.type==='boss'||e.type==='giant'?1:0,crit);
  if(e.hp<=0)kill(e,s,kx,ky);
}
function applyEls(e,m,s){
  const fk=fusion(s);
  if(has(s,'fire')){e.burn=3;e.burnD=Math.max(e.burnD||0,m*.22+1);e.burnS=s}
  if(has(s,'ice')){if(!(e.slow>0)&&s)s.ctrl=(s.ctrl||0)+1;e.slow=1.5;if(SIMR()<.1&&e.type!=='boss')e.frz=1}
  if(has(s,'acid')){e.shred=3;if(SIMR()<.14)pool(e.x,e.y,22,3,5+s.lv*.6,s)}
  if(has(s,'lightning')&&SIMR()<.55)arc(e,m*.45,s,2);
  if(fk==='fire+ice'&&SIMR()<.14)pool(e.x,e.y,30,2.2,3+s.lv*.3,s,{steam:1});
}
function arc(from,d,s,n){
  const hits=[];
  near(from.x,from.y,80,e=>{if(e!==from&&hits.length<n&&e.type!=='statue')hits.push(e)});
  const fk=fusion(s);
  for(const e of hits){
    G.arcs.push({x:from.x,y:from.y,x2:e.x,y2:e.y,t:.13,c:'#ffe066'});
    const dd=(fk==='ice+lightning'&&e.slow>0)?d*2:d;
    const was=e.hp;hit(e,dd,s,true,'#ffe066');
    if(fk==='fire+lightning'){e.burn=3;e.burnD=Math.max(e.burnD||0,dd*.3);e.burnS=s}
    if(fk==='dark+lightning'&&was>0&&e.dead)heal(1.5);
  }
}
const healCap=t=>t<180?.12:Math.max(.045,.12-(t-180)/600*.075); // max healing per second as a share of max HP: 10% early, 3.5% from ~16 min
function heal(n,s){const P=G.P;const b=P.hp;let want=n*healMul(G.t)*(G.curse.heal||1);
  {const sec=Math.floor(G.t);if(G.healSec!==sec){G.healSec=sec;G.healIn=0}const room=P.maxHp*healCap(G.t)-G.healIn;if(want>room){const lost=Math.min(want-Math.max(0,room),Math.max(0,P.maxHp-P.hp-Math.max(0,room)));G.healCapped=(G.healCapped||0)+lost;want=Math.max(0,room)}G.healIn+=want}
  P.hp=Math.min(P.maxHp,P.hp+want);const got=P.hp-b;if(P.hp>P.maxHp*.35)G._nd=0;G.healed=(G.healed||0)+got;G.overheal=(G.overheal||0)+(want-got);if(s){s.healed=(s.healed||0)+got;s.overheal=(s.overheal||0)+(want-got)}}
function pool(x,y,r,t,dps,s,o={}){
  if(G.pools.length>45)G.pools.shift();
  const fk=fusion(s);
  G.pools.push({x,y,r,t,T:t,dps:dps*(fk==='acid+fire'?2:1),s,tk:.25,steam:o.steam,slow:o.steam||fk==='acid+ice',zap:fk==='acid+lightning'||(o.zap&&SIMR()<.5),col:o.steam?'#d7e8ec':fk==='acid+fire'?'#ff7a3c':o.poisMist?'#9ff06a':'#8ed45c'});
}
function aoe(x,y,r,d,s,col,noEl,o={}){
  ring(x,y,r,col||'#ffb04a',o);
  near(x,y,r+12,e=>{const dx=e.x-x,dy=e.y-y,dd=hyp(dx,dy)||1;if(dd<=r+e.r){const k=(1-dd/(r+e.r))*170+60;hit(e,d,s,noEl,col,dx/dd*k,dy/dd*k)}});
  if(o.quiet)return;
  const sz=clamp(r/30,.3,1);trauma(sz*.45);shock(x,y,r*2.2,.028*sz);if(r>26)hitStop(.035);
  if(typeof SFX!=='undefined')SFX.boom(sz,o.thunder);
}
function ring(x,y,r,c,o={}){G.fx.push({k:'ring',x,y,r,t:.3,T:.3,c,thunder:o.thunder})}
function spark(x,y,c,n=4,sp=60,o={}){if(G.fx.length>CAP.fx)return;for(let i=0;i<n;i++){const a=o.dir!==undefined?o.dir+rnd(-.7,.7):rnd(TAU),v=rnd(sp*.3,sp);const T=rnd(.22,.5);G.fx.push({k:'p',x,y,h:rnd(3,12),vh:rnd(10,sp),vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:T,T,c,g:1,sz:o.sz||rnd(2,3.6)})}}
/* poison: stacking damage over time (physician); stacks cap at 8, each tick hits once per stack */
function poison(e,d,s,n=1){if(e.dead||e.type==='statue')return;e.pois=Math.min(e.type==='boss'||e.warlord?10:5,(e.pois||0)+n);e.poisD=Math.max(e.poisD||0,d);e.poisS=s;e.poisT=4}
function kill(e,s,kx=0,ky=0){
  if(e.pois>0&&e.poisS&&!e.mistDone&&e.type!=='boss'){e.mistDone=1;const ps=e.poisS,st=stat(ps);const spread=e.plague||(ps.id==='needle'&&nd(ps,'chain')&&SIMR()<NODE_FX.chain*nd(ps,'chain')*2.5);if(spread)pool(e.x,e.y,26*(e.plague?1+NODE_FX.size*nd(e.plague,'size'):st.size),2.2,5*st.m,ps)}
  if(e.dead)return;e.dead=1;if(G.shared&&ARENA.host&&e.id){ARENA.killed.push(e.id);ARENA.byId.delete(e.id)}
  if(!G.auto&&typeof codexSee==='function'){codexSee('en',e.type);if(e.role)codexSee('en',e.role);if(e.affix)codexSee('en',e.affix);if(e.elite)codexSee('en','elite');if(e.warlord)codexSee('en','warlord');if(e.illusion)codexSee('en','illusion');if(e.type==='boss')codexSee('boss',e.n%BOSSES.length)}
  const dir=Math.atan2(ky,kx);
  if(!G.auto&&e.type!=='statue'){const now=G.t;if(now-(G.lastKillStop||0)>.14){G.lastKillStop=now;hitStop(e.type==='giant'?.07:e.elite?.05:.028)}if(e.elite||e.type==='giant'){trauma(.28,kx,ky);shock(e.x,e.y,110,.02,.3)}ring(e.x,e.y,e.type==='giant'?26:14,e.elite?'#ffd27a':'#ff8e5a')}
  spark(e.x,e.y,e.type==='statue'?'#ff3df0':e.type==='boss'?'#ff5a5a':e.elite?'#ffd27a':'#ff8e5a',e.type==='boss'?120:e.type==='giant'?26:e.elite?16:9,e.type==='boss'?220:110,{dir:(kx||ky)?dir:undefined,sz:e.type==='giant'?4:undefined});
  if(typeof addSplat==='function'&&e.type!=='statue'&&!G.auto)addSplat(e.x,e.y,e.type==='boss'?90:e.type==='giant'?34:14+(e.sc||1)*4,e.type==='boss'?'#8a0a14':e.illusion?'#8a2a7a':'#6e0b12');
  if(e.type!=='boss'&&e.type!=='statue'&&G.fx.length<CAP.fx){const sp=hyp(kx,ky);G.fx.push({k:'die',x:e.x,y:e.y,h:1,vh:70+sp*.5,kx:kx*1.6+rnd(-20,20),ky:ky*1.6+rnd(-20,20),rot:0,rv:rnd(6,14)*(SIMR()<.5?-1:1),t:.7,T:.7,type:e.type,fr:e.fr,sc:e.sc||1})}
  if(e.type==='statue'){if(G.mission&&G.mission.k==='statue'){G.mission.n--;checkMission()}return}
  const pv=pts(e);
  if(s&&s.owner==='rival'){const R=G.rival;R.kills++;R.combo=(R.combo||0)+1;R.comboT=2.4;R.comboMax=Math.max(R.comboMax||0,R.combo);{const gain=Math.round(pv*(1+Math.min(.6,Math.floor(R.combo/10)*.1)));R.score+=gain;R.sc=R.sc||{kill:0,big:0,streak:0};if(pv>=8)R.sc.big+=gain;else R.sc.kill+=gain;R.sc.streak+=gain-pv}G.rival.xp+=e.xp*2.2*G.rival.ai;if(RIVAL_ON&&pv>=8&&G.floats.length<80)G.floats.push({x:e.x,y:e.y-e.r-6,t:.9,v:L('对手','Rival')+' +'+pv,c:'#ff9c5a'});if(RIVAL_ON&&pv>=30&&typeof showSide==='function')showSide(`对手斩杀${e.type==='boss'?'首领':'精英'} +${pv} · 去补刀下一个大目标`,`Rival took ${e.type==='boss'?'the boss':'an elite'} +${pv} · claim the next big one`,'#ff9c5a','swords')}
  else if(G.creditOff){}
  else{G.kills++;comboHit();if(s&&!SPELLS[s.id].auto)G.skillKills=(G.skillKills||0)+1;if(e.elite)G.eliteKills=(G.eliteKills||0)+1;if(e.champion&&typeof dirChampionSlain==='function')dirChampionSlain(e);const gain=Math.round(pv*((RIVAL_ON||G.room)?comboMult():1));G.score+=gain;G.sc=G.sc||{kill:0,big:0,ev:0};if(e.type==='boss'||e.elite||e.warlord||e.role||e.affix)G.sc.big+=gain;else G.sc.kill+=gain;if((RIVAL_ON||G.room)&&(pv>=3||G.floats.length<CAP.fl)&&G.floats.length<80)G.floats.push({x:e.x,y:e.y-e.r-6,t:.8,v:'+'+gain,c:pv>=8?'#ffd27a':'#9fe3f0',score:1})}
  if((e.type==='giant'||e.elite)&&!(s&&s.owner==='rival')&&!G.creditOff){hitStop(.06);trauma(.3)}
  const drops=G.creditOff?0:(e.elite?4:1);
  for(let i=0;i<drops;i++){if(G.gems.length<CAP.gem)G.gems.push({x:e.x+rnd(-8,8),y:e.y+rnd(-8,8),v:e.xp,big:e.xp>=3});else gainXP(e.xp)} // when the field is full of gems the XP is granted directly, so late-game leveling never stalls
  if(e.elite&&!G.creditOff)G.gems.push({x:e.x,y:e.y,v:10,big:1});
  if(!(s&&s.owner==='rival')&&!G.creditOff&&hasR('charm')&&e.type!=='boss'){const x=e.x,y=e.y;later(.03,()=>{near(x,y,24,o=>{if(hyp(o.x-x,o.y-y)<20+o.r)hit(o,10*G.P.dmg*(1+G.P.dmgBonus),null,true,'#ff7a2c',(o.x-x)*4,(o.y-y)*4)});ring(x,y,20,'#ff7a2c')})}
  if(!G.creditOff&&((e.elite&&SIMR()<.3*Math.max(.15,1-G.relics.length/14))||e.warlord||e.type==='boss'))dropRelic(e.x,e.y); // elites drop fewer relics as the set fills up
  if(e.affix==='explode'){const x=e.x,y=e.y,d=e.dmg*1.3;later(.08,()=>{ring(x,y,34,'#ff4a2a');spark(x,y,'#ff6a3a',14,120);const P=G.P;if(hyp(P.x-x,P.y-y)<34+6)dmgP(d,x,y,['爆裂敌人','exploding enemy']);if(G.rival&&hyp(G.rival.x-x,G.rival.y-y)<40)rivalHurt(d,x,y)})}
  if(e.warlord&&!G.creditOff){G.chests.push({x:e.x,y:e.y,t:0});showBanner('统领已斩','Warlord slain: treasure drops',1.4);if(G.room)roomSendWave(8);trauma(.6);G.slow=Math.max(G.slow,.5);G.flash=.5;if(typeof SFX!=='undefined')SFX.win()}
  const fk=fusion(s);
  if(s&&has(s,'dark')&&SIMR()<.05)heal(1);
  if(fk==='dark+fire'&&e.burn>0){const d=e.maxHp*.5+s.lv*2,x=e.x,y=e.y;later(.05,()=>aoe(x,y,26,d,s,'#ff5a2c',true))}
  if(fk==='dark+ice'&&e.slow>0){near(e.x,e.y,38,o=>{if(o.type!=='boss')o.frz=.7});ring(e.x,e.y,36,'#8fdcf0')}
  if(fk==='acid+dark'&&e.shred>0)pool(e.x,e.y,26,3,6+s.lv*.6,s);
  if(typeof SFX!=='undefined')SFX.die(e.type,G.combo);
  if(typeof onKillX==='function')onKillX(e,s);
  if(e.type==='boss')bossSlain(e);
}
const COMBO_TIERS=[[10,'连斩','Combo'],[25,'无双','Unrivalled'],[50,'血洗','Bloodbath'],[100,'天下无敌','Invincible'],[200,'武林神话','Legend'],[500,'万人敌','Army-slayer'],[1000,'一骑当千','One against a thousand'],[2000,'神魔辟易','Gods step aside'],[5000,'斩尽','Annihilation']];
function comboMult(){return 1+Math.min(.6,Math.floor(G.combo/10)*.1)}
function comboHit(){
  G.combo++;G.comboT=Math.max(1.1,2.4-G.t/900);if(G.combo>G.comboMax)G.comboMax=G.combo;
  const t=COMBO_TIERS.find(t=>t[0]===G.combo);
  if(t){showBanner(`${t[1]} ×${G.combo}`,t[2]+' · '+Math.round((comboMult()-1)*100)+'% bonus',1.3);trauma(.3);if(G.room&&G.combo>=100)roomSendWave(6);G.slow=Math.max(G.slow,.12);G.flash=Math.max(G.flash,.25);if(typeof SFX!=='undefined')SFX.combo(COMBO_TIERS.indexOf(t))}
  if(G.combo>=30&&!G.over9){G.over9=1;showBanner('狂暴','Overdrive: faster strikes, faster feet',1.4);if(typeof SFX!=='undefined')SFX.overdrive()}
}
function comboTick(dt){if(G.combo>0){G.comboT-=dt;if(G.comboT<=0){if(G.combo>=10)showBanner(`连斩终结 ×${G.combo}`,'Streak ended',.8);G.combo=0;G.over9=0}}}
/* treasure chests: burst of mana gems, gold and a bonus card */
function chestTick(dt){if(G.curse.nochest)return;
  const P=G.P;G.chestT-=dt;
  if(G.chestT<=0&&G.chests.length<(G.t>600?1:2)){G.chestT=38+Math.min(120,G.t/10);/* chests thin out late */let x,y,n=0;do{const a=rnd(TAU),d=rnd(220,380);x=clamp(P.x+Math.cos(a)*d,60,W-60);y=clamp(P.y+Math.sin(a)*d,60,H-60)}while(n++<20&&(blocked(x,y)||onPond(x,y,1.3)));const kr=SIMR(),kind=G.t>150&&kr<.14?'gold':G.t>200&&kr<.3?'trap':'normal';G.chests.push({x,y,t:0,kind});const CB={gold:['金宝箱现世!必出法宝','A golden chest appeared: a relic is guaranteed'],trap:['有机关的宝箱现世','A trapped chest appeared'],normal:['宝箱现世','A treasure chest appeared']};showBanner(CB[kind][0],CB[kind][1],1)}
  for(const c of G.chests){if(!c.ok){c.ok=1;c.x=clamp(c.x,60,W-60);c.y=clamp(c.y,60,H-60);if(blocked(c.x,c.y)||onPond(c.x,c.y,1.3)){outer:for(let r=24;r<=240;r+=24)for(let k=0;k<12;k++){const a=k/12*TAU,x=clamp(c.x+Math.cos(a)*r,60,W-60),y=clamp(c.y+Math.sin(a)*r,60,H-60);if(!blocked(x,y)&&!onPond(x,y,1.3)){c.x=x;c.y=y;break outer}}}}
    c.t+=dt;if(P.down<=0&&hyp(c.x-P.x,c.y-P.y)<34){c.dead=1;const gold=c.kind==='gold',trap=c.kind==='trap';
    for(let i=0;i<10;i++){const a=i/10*TAU;G.gems.push({x:c.x+Math.cos(a)*18,y:c.y+Math.sin(a)*18,v:3,big:1})}
    if(trap){for(let i=0;i<14;i++){const a=i/14*TAU;spawnEnemy('assassin',clamp(c.x+Math.cos(a)*60,30,W-30),clamp(c.y+Math.sin(a)*60,30,H-30),1.2)}G.en.slice(-14).forEach(e=>{e.affix='swift';e.spd*=1.4});showBanner('机关!刺客从箱中涌出','A trap! Assassins pour out',1.2);trauma(.4)}
    if(gold){dropRelic(c.x,c.y);G.picks.push({kind:'level',forceQ:'legendary'})}
    G.goldRun+=Math.round(25*(trap?2:1)*(gold?2:1)*(hasR('bowl')?1.3:1));G.chestsOpened=(G.chestsOpened||0)+1;G.score+=PK_EVENTS.chest;(G.sc=G.sc||{kill:0,big:0,ev:0}).ev+=PK_EVENTS.chest;if(RIVAL_ON)G.floats.push({x:c.x,y:c.y-14,t:1,v:L('宝箱','Chest')+' +'+PK_EVENTS.chest,c:'#ffd27a',score:1});if(!gold&&SIMR()<.5)dropRelic(c.x,c.y);ring(c.x,c.y,70,gold?'#ffe9a0':trap?'#ff6a6a':'#ffd27a');spark(c.x,c.y,'#ffd27a',40,160);trauma(.35);shock(c.x,c.y,160,.03);G.slow=Math.max(G.slow,.2);
    const card=!gold&&(G.t<600||SIMR()<.5);if(card)G.picks.push({kind:'level'});showBanner(gold?'金宝箱开启:法宝 + 传说卡':trap?'机关宝箱开启:双倍金币':card?'宝箱开启':'宝箱开启:金币与经验',gold?'Golden chest: relic + legendary card':trap?'Trapped chest: double gold':card?'+25 gold, mana and a bonus card':'+25 gold and XP',1.4);if(typeof SFX!=='undefined')SFX.chest();openPick()}}
  G.chests=G.chests.filter(c=>!c.dead);
}
function srcName(e){if(!e)return ['未知','unknown'];if(e.type==='boss')return [e.name,e.en];if(e.champion)return [e.name,e.en];if(e.warlord)return ['铁甲统领','Iron Warlord'];const t=ETYPES[e.type]||{};const pre=e.illusion?['幻影','illusion ']:e.elite?['精英','elite ']:e.affix==='explode'?['爆裂','exploding ']:e.affix==='swift'?['疾风','swift ']:e.affix==='armor'?['重甲','armoured ']:e.role==='charger'?['冲锋','charging ']:e.role==='shaman'?['巫','shaman ']:['',''];return [pre[0]+(t.zh||e.type),pre[1]+(t.en||e.type)]}
function dmgP(n,fx,fy,src){
  if(typeof src==='string')src=[src,src];const P=G.P;if(P.down>0||P.inv>0||P.dash>0||G.over)return;
  if(P.shield>0){const cap=P.shieldHp===undefined?n:P.shieldHp;const abs=Math.min(n,cap);P.inv=.15;G.absorbed=(G.absorbed||0)+abs;if(P.shieldHp!==undefined)P.shieldHp-=abs;ring(P.x,P.y,30,'#7dffb0');if(typeof SFX!=='undefined')SFX.block();n-=abs;if(P.shieldHp!==undefined&&P.shieldHp<=0){P.shield=0;showBanner('护罩破碎','Ward shattered',.9)}if(n<=.5)return}
  if(P.vajra>0){const vs=G.spells.find(x=>x.id==='vajra');const st=vs?stat(vs):{m:1,size:1};G.skillBlocked=(G.skillBlocked||0)+n*.7;if(vs)vs.blocked=(vs.blocked||0)+n*.7;n*=.3;near(P.x,P.y,50*st.size,e=>{if(e.type==='statue')return;const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d<50*st.size+e.r){hit(e,14*st.m,vs,false,'#ffe9a0',dx/d*220,dy/d*220);e.goldT=.35;if(vs)vs.refl=(vs.refl||0)+1}});if(vs&&nd(vs,'life'))heal(2*nd(vs,'life'),vs);ring(P.x,P.y,40,'#ffe9a0')}
  if(typeof onHurtX==='function'){n=onHurtX(n,src,fx,fy);if(n<=0)return}
  {const dm=Math.max(.4,P.def);if(dm<1)G.mitigated=(G.mitigated||0)+n*(1-dm);else G.vulnerable=(G.vulnerable||0)+n*(dm-1);n*=dm}P.hp-=n;P.inv=.4;G.dmgTaken+=n; // mitigation caps at 60%
  G.dmgBy=G.dmgBy||{};{const k=(src||['敌人','enemy']).join('|');G.dmgBy[k]=(G.dmgBy[k]||0)+n}
  {const r=P.hp/P.maxHp;G.minHp=Math.min(G.minHp===undefined?1:G.minHp,Math.max(0,r));if(r<.2&&!G._nd){G._nd=1;G.nearDeath=(G.nearDeath||0)+1}}
  G.dmgLog=G.dmgLog||[];G.dmgLog.push({t:G.t,n,src:src||['敌人','enemy']});if(G.dmgLog.length>60)G.dmgLog.shift();if(P.hp<=0)G.killer=src||['敌人','enemy'];
  const dx=fx!==undefined?P.x-fx:0,dy=fy!==undefined?P.y-fy:0,l=hyp(dx,dy)||1;
  trauma(.55,dx/l,dy/l);hitStop(.07);
  G.fx.push({k:'hurt',t:.22,T:.22});
  if(typeof SFX!=='undefined')SFX.hurt();
  if(P.hp<=0)downed();
}
function downed(){
  const P=G.P;P.hp=0;
  if(G.shared&&!(ROOM.data&&ROOM.data.mode==='last')){G.downs=(G.downs||0)+1;P.down=4;G.combo=0;spark(P.x,P.y,'#6fd3e8',24,120);showBanner('倒下了 · 4 秒后复活','Down — back in 4 s',1.4);if(typeof SFX!=='undefined')SFX.revive();return}
  G.downs=(G.downs||0)+1;if(G.cores>0){G.cores--;G.revives=(G.revives||0)+1;P.down=1.6;G.slow=Math.max(G.slow,.6);updateCores();spark(P.x,P.y,'#6fd3e8',30,140);showBanner('核心复生','Revive Core used',1.4);if(typeof SFX!=='undefined')SFX.revive()}
  else lose();
}
function revive(){
  const P=G.P;P.hp=P.maxHp*.6;P.mana=P.maxMana;P.inv=1.5;aoe(P.x,P.y,100,70,null,'#6fd3e8',true);
  near(P.x,P.y,110,e=>{if(e.type!=='boss'&&e.type!=='statue')e.frz=1.2});
  trauma(.8);
}

/* ---------- skills ---------- */
const stat=s=>{
  const lvM=(1+.12*(s.lv-1))*(1+.05*(s.tr||0)),gi=s.augs.includes('giant'),fu=s.els.length===2?1.25:1,pa=(typeof PATHS!=='undefined'&&PATHS[s.path])||{size:1,knock:1,cd:1,m:1};
  return {m:lvM*(gi?1.3:1)*fu*(1+NODE_FX.dmg*nd(s,'dmg'))*pa.m*(s.vm||1),gi,burst:s.augs.includes('burst'),split:s.augs.includes('split'),cdM:(gi?1.15:1)*Math.max(.6,1-.04*(s.lv-1))*(1-NODE_FX.cd*nd(s,'cd'))*pa.cd*(s.vcd||1),
    n:nd(s,'count')+(s.vn||0),pierce:nd(s,'pierce')+(s.vp||0),size:(1+NODE_FX.size*nd(s,'size'))*pa.size*(s.vsz||1),dur:NODE_FX.dur*nd(s,'dur'),knock:(1+NODE_FX.knock*nd(s,'knock'))*pa.knock};
};
function shoot(x,y,a,s,d,o={}){
  if(G.shots.length>260)return;
  const st=stat(s),cols=s.els.map(k=>ELS[k].col);
  G.shots.push({x,y,vx:Math.cos(a)*(o.v||260),vy:Math.sin(a)*(o.v||260),life:o.life||.9,s,d,r:(o.r||3)*(st.gi?1.6:1),pierce:o.pierce||0,hitSet:o.hitSet||new Set(),col:cols[0]||SPELLS[s.id].col,col2:cols[1],split:o.nosplit?false:st.split,small:o.small,knock:o.knock||70,kind:s.id,spin:rnd(TAU),home:o.home,boom:o.boom,slow:o.slow,pois:o.pois});
}
function aimDir(range){const P=G.P,t=nearest(P.x,P.y,range,true);if(t)return Math.atan2(t.y-P.y,t.x-P.x);return Math.atan2(P.dy,P.dx)}
function autoFire(s){ // the normal attack of each class
  const P=G.P,st=stat(s);
  if(s.id==='sword'){
    const t=nearest(P.x,P.y,200,true);if(!t)return false;
    const fn=()=>{const tt=t.dead?nearest(P.x,P.y,210,true):t;if(!tt)return;const a=Math.atan2(tt.y-P.y,tt.x-P.x),n=2+Math.floor(s.lv/3)+st.n+(s.awake?2:0);
      for(let i=0;i<n;i++)shoot(P.x,P.y-6,a+(i-(n-1)/2)*.13,s,22*st.m*(s.awake?1.25:1),{knock:60*st.knock,pierce:2+st.pierce,r:3.5*st.size});P.cast=1;if(typeof SFX!=='undefined')SFX.sword()};
    fn();if(st.burst)later(.12,fn);s.cd=.46*st.cdM;
  }else if(s.id==='great'){ // greatsword: wide slow arc, every third swing (second when awakened) slams the ground
    const t=nearest(P.x,P.y,95,true);if(!t)return false;
    const a=Math.atan2(t.y-P.y,t.x-P.x);P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);P.cast=1.4;s.swing=(s.swing||0)+1;
    const R=74*st.size,col=s.els[0]?ELS[s.els[0]].col:SPELLS.great.col;let n=0;
    near(P.x,P.y,R+14,e=>{const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d>R+e.r)return;let da=Math.atan2(dy,dx)-a;da=Math.atan2(Math.sin(da),Math.cos(da));if(Math.abs(da)>1.15)return;n++;hit(e,36*st.m,s,false,undefined,dx/d*170*st.knock,dy/d*170*st.knock)});
    G.fx.push({k:'wave',x:P.x+Math.cos(a)*10,y:P.y+Math.sin(a)*10,a,t:.26,T:.26,c:col,w:1.25*st.size});if(n){hitStop(.045);trauma(.12,Math.cos(a),Math.sin(a))}
    const every=s.awake?2:3;
    if(s.swing%every===0){const sx=P.x+Math.cos(a)*34,sy=P.y+Math.sin(a)*34,sr=52*st.size*(s.awake?1.4:1);later(.08,()=>{aoe(sx,sy,sr,62*st.m,s,col);shock(sx,sy,150,.035);trauma(.4);hitStop(.07);spark(sx,sy,col,22,150);if(nd(s,'chain')&&SIMR()<NODE_FX.chain*nd(s,'chain'))later(.2,()=>aoe(sx+Math.cos(a)*40,sy+Math.sin(a)*40,sr*.8,40*st.m,s,col));if(typeof SFX!=='undefined')SFX.roar()})}
    if(typeof SFX!=='undefined')SFX.sword();s.cd=1.05*st.cdM;
  }else if(s.id==='whisk'){ // spirit whisk: sustained lash that ramps on one target, chains from Lv 5
    const range=170*st.size,t=(s.tgt&&!s.tgt.dead&&hyp(s.tgt.x-P.x,s.tgt.y-P.y)<range+20)?s.tgt:nearest(P.x,P.y,range,true);if(!t){s.hold=0;s.tgt=null;s.beam=null;return false}
    if(t!==s.tgt){s.tgt=t;s.hold=0}const cap=s.awake?1.2:.6;s.hold=Math.min(cap,(s.hold||0)+.025);
    const a=Math.atan2(t.y-P.y,t.x-P.x);P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);P.cast=Math.max(P.cast,.5);
    const d=9*st.m*(1+s.hold);hit(t,d,s,false,undefined,Math.cos(a)*12,Math.sin(a)*12);
    const links=[t];const extra=1+(s.lv>=5?1:0)+st.n+(s.awake?1:0);if(extra){let from=t;for(let i=0;i<extra;i++){let b=null,bd=95;near(from.x,from.y,95,e=>{if(links.includes(e)||e.type==='statue')return;const dd=hyp(e.x-from.x,e.y-from.y);if(dd<bd){bd=dd;b=e}});if(!b)break;links.push(b);hit(b,d*.6,s,false,undefined,0,0);from=b}}
    s.beam={pts:[[P.x,P.y],...links.map(e=>[e.x,e.y])],t:.14,hold:s.hold/cap};
    if(s.hold>=cap&&nd(s,'chain')&&SIMR()<NODE_FX.chain*nd(s,'chain')*.5)arc(t,d*3,s,1);
    if(SIMR()<.25&&typeof SFX!=='undefined')SFX.charm();s.cd=.12*st.cdM;
  }else if(s.id==='nodachi'){ // nodachi: lunge a step, then a very long blade arc
    const t=nearest(P.x,P.y,120,true);if(!t)return false;
    const a=Math.atan2(t.y-P.y,t.x-P.x),d0=hyp(t.x-P.x,t.y-P.y),lunge=Math.min(s.awake?70:44,Math.max(0,d0-26));
    const ox=P.x,oy=P.y;P.x+=Math.cos(a)*lunge;P.y+=Math.sin(a)*lunge;collide(P,6);P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);P.cast=1.3;
    if(G.ghosts.length<14)G.ghosts.push({x:ox,y:oy,yaw:P.yaw,t:.28,T:.28});
    const R=88*st.size,col=s.els[0]?ELS[s.els[0]].col:SPELLS.nodachi.col;let n=0;
    near(P.x,P.y,R+14,e=>{const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d>R+e.r)return;let da=Math.atan2(dy,dx)-a;da=Math.atan2(Math.sin(da),Math.cos(da));if(Math.abs(da)>1.35)return;n++;hit(e,44*st.m,s,false,undefined,dx/d*150*st.knock,dy/d*150*st.knock)});
    G.fx.push({k:'wave',x:P.x+Math.cos(a)*14,y:P.y+Math.sin(a)*14,a,t:.22,T:.22,c:col,w:1.5*st.size});
    if(nd(s,'chain')&&lunge>10&&SIMR()<NODE_FX.chain*nd(s,'chain')*2)later(.12,()=>aoe(ox,oy,34,22*st.m,s,col,false,{quiet:1}));
    if(s.awake&&lunge>10)pool(P.x-Math.cos(a)*lunge*.5,P.y-Math.sin(a)*lunge*.5,22,1.6,8*st.m,s);
    if(n){hitStop(.05);trauma(.14,Math.cos(a),Math.sin(a))}if(typeof SFX!=='undefined')SFX.sword();s.cd=.9*st.cdM;
  }else if(s.id==='drum'){ // war drum: expanding shockwave rings
    if(!countNear(P.x,P.y,150))return false;
    P.cast=1.2;const R=120*st.size*(s.awake?1.3:1),col=s.els[0]?ELS[s.els[0]].col:SPELLS.drum.col,rings=1+st.n+(s.awake?1:0);
    for(let i=0;i<rings;i++)later(i*.18,()=>{if(G.pwaves.length>12)return;G.pwaves.push({x:P.x,y:P.y,r:6,R,v:380,d:16*st.m,s,hit:new Set(),knock:110*st.knock,col});trauma(.08);if(typeof SFX!=='undefined')SFX.whirlTick()});
    s.cd=1.0*st.cdM;
  }else if(s.id==='staff'){ // iron staff: 360° sweep, every fourth strike (second awakened) a piercing thrust
    const t=nearest(P.x,P.y,90,true);if(!t)return false;
    const a=Math.atan2(t.y-P.y,t.x-P.x);P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);P.cast=1.2;s.swing=(s.swing||0)+1;
    const col=s.els[0]?ELS[s.els[0]].col:SPELLS.staff.col,every=s.awake?2:4;
    if(s.swing%every===0){const n=1+st.pierce;shoot(P.x,P.y-6,a,s,30*st.m,{v:420,life:.3*st.size*(s.awake?1.25:1),pierce:6+n,r:5*st.size,knock:160*st.knock});G.fx.push({k:'wave',x:P.x+Math.cos(a)*12,y:P.y+Math.sin(a)*12,a,t:.2,T:.2,c:col,w:.8});if(nd(s,'chain')&&SIMR()<NODE_FX.chain*nd(s,'chain')*2)later(.15,()=>aoe(P.x+Math.cos(a)*60,P.y+Math.sin(a)*60,34*st.size,22*st.m,s,col,false,{quiet:1}));if(typeof SFX!=='undefined')SFX.palm()}
    else{const R=62*st.size*(s.awake?1.25:1);let n=0;near(P.x,P.y,R+14,e=>{const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d>R+e.r)return;n++;hit(e,25*st.m,s,false,undefined,dx/d*130*st.knock,dy/d*130*st.knock)});G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.22,T:.22,c:col,full:1,w:.7});if(n){hitStop(.03);trauma(.08)}if(typeof SFX!=='undefined')SFX.slash()}
    s.cd=.56*st.cdM;
  }else if(s.id==='fist'){ // arhat fist: rapid single-target punches, every fifth (third awakened) a palm blast
    const t=nearest(P.x,P.y,46,true);if(!t)return false;
    const a=Math.atan2(t.y-P.y,t.x-P.x);P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);P.cast=.9;s.swing=(s.swing||0)+1;
    const col=s.els[0]?ELS[s.els[0]].col:SPELLS.fist.col,every=s.awake?3:5;
    if(s.swing%every===0){const R=60*st.size;near(P.x,P.y,R+14,e=>{const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d<R+e.r)hit(e,30*st.m*(s.awake?1.25:1),s,false,undefined,dx/d*260*st.knock,dy/d*260*st.knock)});G.fx.push({k:'wave',x:P.x,y:P.y,a,t:.26,T:.26,c:col,w:1.1});shock(P.x,P.y,120,.03);hitStop(.04);trauma(.14,-Math.cos(a),-Math.sin(a));if(typeof SFX!=='undefined')SFX.palm()}
    else{const targets=[t];for(let i=0;i<st.n;i++){let b=null,bd=60;near(P.x,P.y,60,e=>{if(targets.includes(e)||e.type==='statue')return;const dd=hyp(e.x-P.x,e.y-P.y);if(dd<bd){bd=dd;b=e}});if(b)targets.push(b)}
      for(const tt of targets){hit(tt,13.5*st.m*(s.awake?1.25:1),s,false,undefined,Math.cos(a)*40,Math.sin(a)*40);spark(tt.x,tt.y,col,3,70);if(nd(s,'life'))heal(.3*nd(s,'life'))}if(typeof SFX!=='undefined'&&SIMR()<.5)SFX.slash()}
    s.cd=.22*st.cdM;
  }else if(s.id==='needle'){ // poison needles: thin fast volley, stacks poison
    const t=nearest(P.x,P.y,220,true);if(!t)return false;
    const fn=()=>{const tt=t.dead?nearest(P.x,P.y,230,true):t;if(!tt)return;const a=Math.atan2(tt.y-P.y,tt.x-P.x),n=3+Math.floor(s.lv/4)+st.n+(s.awake?2:0);
      for(let i=0;i<n;i++)shoot(P.x,P.y-6,a+(i-(n-1)/2)*.09,s,8.5*st.m,{v:320,life:.8,pierce:1+st.pierce,r:2.6*st.size,knock:20*st.knock,pois:(s.awake?1.8:1)*st.m});P.cast=1;if(typeof SFX!=='undefined')SFX.throw()};
    fn();if(st.burst)later(.1,fn);s.cd=.5*st.cdM;
  }else if(s.id==='pouch'){ // herb pouch: lob at the thickest group, bursts into poison mist
    const cands=G.en.filter(e=>!e.dead&&e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<220);if(!cands.length)return false;
    let best=null,bs=-1;for(const e of cands){let n=0;for(const o of cands)if(hyp(o.x-e.x,o.y-e.y)<50)n++;if(n>bs){bs=n;best=e}}
    const throwAt=(tx,ty)=>lob(P.x,P.y-6,tx,ty,s,10*st.m,34*st.size*(s.awake?1.4:1),false,{mist:2.2+st.dur,pois:1});
    throwAt(best.x,best.y);for(let i=0;i<st.n+(s.awake?1:0);i++)later(.2*(i+1),()=>throwAt(best.x+rnd(-50,50),best.y+rnd(-50,50)));P.cast=1;if(typeof SFX!=='undefined')SFX.throw();s.cd=1.3*st.cdM;
  }else if(s.id==='charm'){
    const t=nearest(P.x,P.y,210,true);if(!t)return false;
    const fn=()=>{const tt=t.dead?nearest(P.x,P.y,220,true):t;if(!tt)return;const a=Math.atan2(tt.y-P.y,tt.x-P.x),n=2+Math.floor(s.lv/3)+st.n+(s.awake?2:0);
      for(let i=0;i<n;i++)shoot(P.x,P.y-6,a+(i-(n-1)/2)*.5,s,20*st.m,{v:190,life:1.3,r:4.5*st.size*(s.awake?1.3:1),knock:50*st.knock,home:1,boom:1});P.cast=1;if(typeof SFX!=='undefined')SFX.charm()};
    fn();if(st.burst)later(.14,fn);s.cd=.62*st.cdM;
  }else if(s.id==='wave'){
    const t=nearest(P.x,P.y,210,true);if(!t)return false;
    const fn=()=>{const tt=t.dead?nearest(P.x,P.y,220,true):t;if(!tt)return;const a=Math.atan2(tt.y-P.y,tt.x-P.x),n=2+Math.floor(s.lv/4)+st.n+(s.awake?2:0);
      for(let i=0;i<n;i++)shoot(P.x,P.y-6,a+(i-(n-1)/2)*.22,s,17*st.m,{v:220,life:1,pierce:3+st.pierce+(s.awake?2:0),r:5.5*st.size,knock:40*st.knock,slow:.5});P.cast=1;if(typeof SFX!=='undefined')SFX.charm()};
    fn();if(st.burst)later(.14,fn);s.cd=.58*st.cdM;
  }else if(s.id==='slash'){
    const t=nearest(P.x,P.y,70,true);if(!t)return false;
    const fn=()=>{const tt=t.dead?nearest(P.x,P.y,80,true):t;if(!tt)return;const a=Math.atan2(tt.y-P.y,tt.x-P.x),n=7+Math.floor(s.lv/4)+st.n*2+(s.awake?3:0);P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);
      for(let i=0;i<n;i++)shoot(P.x+Math.cos(a)*6,P.y+Math.sin(a)*6-6,a+(i-(n-1)/2)*.19,s,15*st.m,{v:330*st.size*(s.awake?1.25:1),life:.17*st.size,pierce:99,r:6*st.size,knock:120*st.knock});
      G.fx.push({k:'wave',x:P.x,y:P.y,a,t:.22,T:.22,c:s.els[0]?ELS[s.els[0]].col:SPELLS.slash.col,w:1.2});P.cast=1;trauma(.08,-Math.cos(a),-Math.sin(a));if(typeof SFX!=='undefined')SFX.slash()};
    fn();if(st.burst)later(.11,fn);s.cd=.46*st.cdM;
  }
  return true;
}
function canCast(i){const s=G.spells[i];if(!s||SPELLS[s.id].auto)return false;return s.cd<=0&&G.P.mana>=skillCost(s)&&G.P.down<=0}
const CD_FLOOR={ward:10,rejuv:9,zen:9,vajra:9,numb:8};
function castSkill(i){
  const s=G.spells[i];if(!s)return false;const sp=SPELLS[s.id],P=G.P;
  if(sp.auto)return false;
  const cost=skillCost(s);
  if(s.cd>0||P.mana<cost){if(!G.auto){G.fx.push({k:'deny',i,t:.3});if(typeof SFX!=='undefined')SFX.deny();if(!G.denyT||G.t-G.denyT>.6){G.denyT=G.t;G.floats.push({x:P.x,y:P.y-30,t:.8,v:s.cd>0?L(`冷却 ${Math.ceil(s.cd)}s`,`Cooldown ${Math.ceil(s.cd)}s`):L(`内力差 ${Math.ceil(cost-P.mana)}`,`${Math.ceil(cost-P.mana)} qi short`),c:s.cd>0?'#c9c2d6':'#6fd3e8'})}}return false}
  const st=stat(s);
  P.mana-=cost;s.cd=Math.max(CD_FLOOR[s.id]||0,sp.cd*st.cdM/P.haste);s.casts++;P.cast=1;if(P.parry>0){P.parry=0;P.parryBoost=1.6;later(1.2,()=>{P.parryBoost=1});ring(P.x,P.y,60,'#ffd27a')}
  if(s.id==='palm'){
    const fn=()=>{const a=aimDir(260),n=5+Math.floor(s.lv/3)+st.n;P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);
      for(let i=0;i<n;i++)shoot(P.x+Math.cos(a)*8,P.y+Math.sin(a)*8-6,a+(i-(n-1)/2)*.17,s,18*st.m,{v:235,life:.52*st.size,pierce:4+st.pierce,knock:190*st.knock,r:4.5*st.size});
      G.fx.push({k:'wave',x:P.x,y:P.y,a,t:.28,T:.28,c:s.els[0]?ELS[s.els[0]].col:sp.col});trauma(.22,-Math.cos(a),-Math.sin(a));hitStop(.02);
      if(typeof SFX!=='undefined')SFX.palm()};
    fn();if(st.burst)later(.18,fn);
  }else if(s.id==='array'||s.id==='bagua'){
    s.active=sp.dur+s.lv*.25+st.dur;s.a=0;ring(P.x,P.y,60,sp.col);trauma(.2);if(typeof SFX!=='undefined')SFX.array();
  }else if(s.id==='ward'){
    heal(P.maxHp*.25*st.m,s);P.shield=Math.min(7,3.5+s.lv*.06)+st.dur*.5;P.shieldHp=P.maxHp*(.35+.012*s.lv)*st.m; // the ward is a budget, not a wall: it breaks after absorbing a share of your max HPaoe(P.x,P.y,80*st.size,8*st.m,s,sp.col,false,{quiet:1});trauma(.25);shock(P.x,P.y,170,.03);if(typeof SFX!=='undefined')SFX.ward();
  }else if(s.id==='whirl'){
    s.active=sp.dur+s.lv*.06+st.dur;s.tk=0;trauma(.15);if(typeof SFX!=='undefined')SFX.whirl();
  }else if(s.id==='leap'){
    const a=aimDir(200);P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);P.dash=.24;P.ghostT=0;P.dashHit=new Set();P.leap=s;trauma(.15,-P.dx,-P.dy);if(typeof SFX!=='undefined')SFX.dash();
  }else if(s.id==='roar'){
    const fn=()=>{const R=95*(st.gi?1.2:1)*st.size;aoe(P.x,P.y,R,16*st.m,s,sp.col,false,{});near(P.x,P.y,R+15,e=>{if(e.type!=='boss'&&e.type!=='statue'){if(!(e.frz>0))s.ctrl=(s.ctrl||0)+1;e.frz=Math.max(e.frz||0,.9+s.lv*.05+st.dur)}});shock(P.x,P.y,260,.05,.5);trauma(.5);G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.3,T:.3,c:sp.col,full:1});if(typeof SFX!=='undefined')SFX.roar()};
    fn();if(st.burst)later(.3,fn);
  }else if(s.id==='sunder'){
    const cands=G.en.filter(e=>!e.dead&&e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<260);let best=null,bs=-1;for(const e of cands){let n=0;for(const o of cands)if(hyp(o.x-e.x,o.y-e.y)<60)n++;if(n>bs){bs=n;best=e}}
    const tx=best?best.x:P.x+P.dx*120,ty=best?best.y:P.y+P.dy*120,waves=3+st.n;
    for(let w=0;w<waves;w++)later(w*.22,()=>{for(let i=0;i<8;i++){const a=rnd(TAU),d=rnd(0,55*st.size);const x=tx+Math.cos(a)*d,y=ty+Math.sin(a)*d;later(i*.03,()=>aoe(x,y,30*st.size,(26+s.lv*2)*st.m,s,s.els[0]?ELS[s.els[0]].col:sp.col,false,{quiet:i>0}))}});
    G.fx.push({k:'wave',x:tx,y:ty,a:0,t:.5,T:.5,c:sp.col,full:1});trauma(.3);if(typeof SFX!=='undefined')SFX.array();
  }else if(s.id==='exorcise'){
    const R=110*st.size;aoe(P.x,P.y,R,(28+s.lv*1.5)*st.m,s,sp.col,false,{});near(P.x,P.y,R+10,e=>{if(e.type!=='boss'&&!e.warlord&&e.hp>0&&e.hp<e.maxHp*.25)hit(e,e.hp+1,s,true,sp.col)});G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.4,T:.4,c:sp.col,full:1});shock(P.x,P.y,300,.05,.5);if(typeof SFX!=='undefined')SFX.ward();
  }else if(s.id==='frenzy'){
    s.active=sp.dur+st.dur;P.frenzy=s.active;trauma(.3);G.flash=Math.max(G.flash,.3);if(typeof SFX!=='undefined')SFX.roar();
  }else if(s.id==='flow'){
    const t=nearest(P.x,P.y,220,true),x=t?t.x:P.x+P.dx*100,y=t?t.y:P.y+P.dy*100;pool(x,y,46*st.size,4+st.dur,(10+s.lv)*st.m,s,{steam:0});const pl=G.pools[G.pools.length-1];if(pl){pl.slow=1;pl.col=s.els[0]?ELS[s.els[0]].col:'#6fd3e8'}ring(x,y,46*st.size,sp.col);if(typeof SFX!=='undefined')SFX.ward();
  }else if(s.id==='ambush'){
    const fn=()=>{const n=10+st.n*2,o=rnd(TAU);for(let i=0;i<n;i++)shoot(P.x,P.y-6,o+i/n*TAU,s,11*st.m,{v:230,life:.9,pierce:2+st.pierce,r:5*st.size,knock:90*st.knock,slow:.6});G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.3,T:.3,c:sp.col,full:1});trauma(.2);if(typeof SFX!=='undefined')SFX.array()};
    fn();if(st.burst)later(.25,fn);
  }else if(s.id==='guangling'){
    s.active=sp.dur+st.dur;s.tk=0;trauma(.15);if(typeof SFX!=='undefined')SFX.shrine();
  }else if(s.id==='tiger'){ // pounce onto the thickest crowd, slam and stun
    const cands=G.en.filter(e=>!e.dead&&e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<190);let best=null,bs=-1;for(const e of cands){let n=0;for(const o of cands)if(hyp(o.x-e.x,o.y-e.y)<55)n++;if(n>bs){bs=n;best=e}}
    const tx=best?best.x:P.x+P.dx*90,ty=best?best.y:P.y+P.dy*90,a=Math.atan2(ty-P.y,tx-P.x),dist=Math.min(180,hyp(tx-P.x,ty-P.y));
    P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);P.dash=Math.max(.1,dist/600);P.ghostT=0;P.dashHit=new Set();P.leap=s;P.tigerPounce=1;trauma(.15,-P.dx,-P.dy);if(typeof SFX!=='undefined')SFX.dash();
  }else if(s.id==='vajra'){
    s.active=sp.dur+st.dur;P.vajra=s.active;ring(P.x,P.y,60,sp.col);trauma(.2);G.flash=Math.max(G.flash,.2);if(typeof SFX!=='undefined')SFX.ward();
  }else if(s.id==='zen'){
    s.active=sp.dur+st.dur;s.tk=0;P.zen=s.active;ring(P.x,P.y,50,sp.col);if(typeof SFX!=='undefined')SFX.shrine();
  }else if(s.id==='sarira'){
    const n=1+st.n;for(let i=0;i<n;i++)G.sariras.push({x:P.x,y:P.y,a:i/n*TAU,r:10,t:0,T:3+st.dur,s,col:s.els[0]?ELS[s.els[0]].col:sp.col,hit:new Map()});trauma(.2);G.flash=Math.max(G.flash,.2);if(typeof SFX!=='undefined')SFX.array();
  }else if(s.id==='gu'){
    const fn=()=>{const a=aimDir(240),n=4+st.n;for(let i=0;i<n;i++)shoot(P.x,P.y-6,a+(i-(n-1)/2)*.35,s,10*st.m,{v:170,life:1.6,pierce:3+st.pierce,r:5*st.size,knock:30,home:1,slow:.6,pois:1.5*st.m});G.fx.push({k:'wave',x:P.x,y:P.y,a,t:.22,T:.22,c:sp.col,w:.9});if(typeof SFX!=='undefined')SFX.charm()};
    fn();if(st.burst)later(.2,fn);
  }else if(s.id==='plague'){
    const n=8+st.n*2;const cands=G.en.filter(e=>!e.dead&&e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<240).sort((a,b)=>hyp(a.x-P.x,a.y-P.y)-hyp(b.x-P.x,b.y-P.y)).slice(0,n);
    for(const e of cands){poison(e,5*st.m,s,3);e.poisT=5+st.dur;e.plague=s;spark(e.x,e.y,sp.col,4,50)}G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.35,T:.35,c:sp.col,full:1});if(typeof SFX!=='undefined')SFX.ward();
  }else if(s.id==='rejuv'){
    s.active=sp.dur;s.tk=0;s.healLeft=P.maxHp*(.2+.05*nd(s,'life'))*st.m;let fed=0;near(P.x,P.y,90*st.size,e=>{if(fed<10&&e.pois>0&&hyp(e.x-P.x,e.y-P.y)<90*st.size+e.r){e.pois--;fed++;spark(e.x,e.y,'#7fc98a',3,60)}});if(fed){s.healLeft+=P.maxHp*.02*fed;showBanner(`以毒养生:+${fed*2}% 治疗`,`Fed on poison: +${fed*2}% healing`,1)}P.shield=Math.max(P.shield,1.5+st.dur);P.confuse=0;if(nd(s,'dmg'))aoe(P.x,P.y,70*st.size,12*st.m*nd(s,'dmg'),s,sp.col,false,{quiet:1});ring(P.x,P.y,50,sp.col);if(typeof SFX!=='undefined')SFX.ward();
  }else if(s.id==='numb'){
    const R=140*st.size;let det=0;near(P.x,P.y,R+15,e=>{if(e.type!=='boss'&&e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<R+e.r){e.sleep=Math.min(4.2,2.5+st.dur*.6)*(e.elite||e.warlord?.5:1);e.sleepS=s;e.shred=Math.max(e.shred||0,e.sleep);e.frz=0;s.ctrl=(s.ctrl||0)+1}else if(e.type==='boss'){e.slow=Math.max(e.slow||0,3);s.ctrl=(s.ctrl||0)+1}
      if(e.pois>0&&e.poisS&&hyp(e.x-P.x,e.y-P.y)<R+e.r){const dmg=e.poisD*e.pois*.6*Math.max(1,e.poisT/.6)*.8;hit(e,dmg,s,true,'#c6ff5a');s.det=(s.det||0)+dmg;e.pois=0;det++;spark(e.x,e.y,'#c6ff5a',5,80)}});
    if(det)showBanner(`引毒!${det} 个目标毒伤一次爆发`,`Venom burst: ${det} targets' poison detonated`,1.2);
    G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.5,T:.5,c:sp.col,full:1});shock(P.x,P.y,280,.04,.5);if(typeof SFX!=='undefined')SFX.shrine();
  }else if(s.id==='talis'){
    const cands=G.en.filter(e=>!e.dead&&e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<240);
    const fn=()=>{let best=null,bs=-1;for(const e of cands){if(e.dead)continue;let n=0;for(const o of cands)if(!o.dead&&hyp(o.x-e.x,o.y-e.y)<44)n++;if(n>bs){bs=n;best=e}}
      const tx=best?best.x:P.x+P.dx*120,ty=best?best.y:P.y+P.dy*120;lob(P.x,P.y-6,tx,ty,s,(30+s.lv*1.3)*st.m,(30+s.lv)*(st.gi?1.35:1)*st.size,st.split);if(st.n)later(.25,()=>lob(P.x,P.y-6,tx+rnd(-40,40),ty+rnd(-40,40),s,(30+s.lv*1.3)*st.m*.8,(30+s.lv)*st.size,false));if(typeof SFX!=='undefined')SFX.throw()};
    fn();if(st.burst)later(.22,fn);
  }
  return true;
}
function lob(x0,y0,x,y,s,d,r,split,o={}){G.bombs.push({x0,y0,x,y,t:0,T:.55,s,d,r,split,mist:o.mist,pois:o.pois})}
function sp_dur(s){return SPELLS[s.id].dur+NODE_FX.dur*nd(s,'dur')}
function sariraTick(dt){const P=G.P;for(const o of G.sariras){o.t+=dt;const st=stat(o.s),k=o.t/o.T;o.a+=dt*5;o.r=10+k*150*st.size;o.x=P.x+Math.cos(o.a)*o.r;o.y=P.y+Math.sin(o.a)*o.r;
    near(o.x,o.y,24,e=>{if(hyp(e.x-o.x,e.y-o.y)<e.r+12*st.size&&(o.hit.get(e)||0)<=o.t-.35){o.hit.set(e,o.t);hit(e,9*st.m,o.s,false,o.col,(e.x-o.x)*2,(e.y-o.y)*2)}});
    if(o.t>=o.T){o.dead=1;aoe(o.x,o.y,60*st.size,40*st.m,o.s,o.col,false,{});shock(o.x,o.y,200,.04);trauma(.3);if(nd(o.s,'chain')&&SIMR()<NODE_FX.chain*nd(o.s,'chain')*2)later(.25,()=>aoe(o.x+rnd(-40,40),o.y+rnd(-40,40),50*st.size,30*st.m,o.s,o.col,false,{}))}}
  G.sariras=G.sariras.filter(o=>!o.dead)}
function orbits(dt){
  const P=G.P;sariraTick(dt);
  for(const s of G.spells){
    if(s.id==='frenzy'&&s.active>0){s.active-=dt;P.frenzy=s.active;if(s.active<=0)P.frenzy=0;continue}
    if(s.id==='vajra'&&s.active>0){s.active-=dt;P.vajra=s.active;if(s.active<=0)P.vajra=0;continue}
    if(s.id==='zen'&&s.active>0){s.active-=dt;s.tk-=dt;P.zen=s.active;const st=stat(s),tot=sp_dur(s);if(s.tk<=0){s.tk=1;const R=90*st.size;heal(P.maxHp*.15*(1+.3*nd(s,'life'))*st.m*(2/Math.max(2,tot)),s);P.mana=Math.min(P.maxMana,P.mana+P.maxMana*.15);near(P.x,P.y,R+14,e=>{const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d<R+e.r)hit(e,10*st.m,s,false,undefined,dx/d*240*st.knock,dy/d*240*st.knock)});G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.3,T:.3,c:SPELLS.zen.col,full:1});if(typeof SFX!=='undefined')SFX.ward()}if(s.active<=0)P.zen=0;continue}
    if(s.id==='rejuv'&&s.active>0){s.active-=dt;s.tk-=dt;if(s.tk<=0){s.tk=.25;heal(s.healLeft/12,s)}continue}
    if(s.id==='guangling'&&s.active>0){s.active-=dt;s.tk-=dt;const st=stat(s);if(s.tk<=0){s.tk=.25;const R=120*st.size;near(P.x,P.y,R+12,e=>{if(hyp(e.x-P.x,e.y-P.y)<R+e.r){hit(e,4*st.m,s,false,undefined,0,0);if(!(e.slow>0))s.ctrl=(s.ctrl||0)+1;e.slow=Math.max(e.slow||0,.6)}});heal((1+nd(s,'life'))*st.m*1.5,s)}continue}
    if(s.id==='whirl'&&s.active>0){s.active-=dt;s.tk-=dt;const st=stat(s);if(s.tk<=0){s.tk=.11;const R=52*(st.gi?1.25:1)*st.size;near(P.x,P.y,R+12,e=>{const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d<R+e.r){const tx=-dy/d,ty=dx/d;hit(e,5*st.m,s,false,undefined,tx*90+dx/d*60,ty*90+dy/d*60)}});if(typeof SFX!=='undefined')SFX.whirlTick()}continue}
    if((s.id!=='array'&&s.id!=='bagua')||s.active<=0)continue;
    s.active-=dt;
    const st=stat(s),extra=s.augs.includes('extra'),bg=s.id==='bagua',n=(bg?2:3)+Math.floor(s.lv/3)+(extra?2:0)+st.n,R=(bg?58:38+s.lv*.8)*(st.gi?1.25:1)*st.size,sz=st.gi?8:6;
    s.a=(s.a||0)+dt*(extra?4.6:bg?2.6:3.4);s.pos=[];
    for(let i=0;i<n;i++){
      const a=s.a+i/n*TAU,x=P.x+Math.cos(a)*R,y=P.y-4+Math.sin(a)*R;s.pos.push([x,y,a]);
      near(x,y,sz+10,e=>{if(hyp(e.x-x,e.y-y)<e.r+sz&&(e.orbT||0)<=0){e.orbT=.3;const tx=-Math.sin(a),ty=Math.cos(a);hit(e,(bg?16:13)*st.m,s,false,undefined,tx*120+(e.x-P.x)*.5,ty*120+(e.y-P.y)*.5)}});
    }
    if(s.active<=0)s.pos=null;
  }
}
function countNear(x,y,r){let n=0;near(x,y,r,e=>{if(e.type!=='statue'&&hyp(e.x-x,e.y-y)<r)n++});return n}
function autoSpend(){}
const AUTO_WHEN={palm:['附近 ≥2 敌','≥2 enemies near'],array:['附近 ≥2 敌','≥2 enemies near'],bagua:['附近 ≥2 敌','≥2 enemies near'],talis:['附近 ≥4 敌','≥4 enemies near'],ward:['生命 <50% 或被围','HP <50% or surrounded'],whirl:['贴身 ≥3 敌','≥3 enemies close'],leap:['远处成群','a group at range'],roar:['被围或生命 <35%','surrounded or HP <35%'],sunder:['≥5 敌或首领战','≥5 enemies or a boss'],exorcise:['附近 ≥3 敌','≥3 enemies near'],frenzy:['附近 ≥5 敌','≥5 enemies near'],flow:['附近 ≥4 敌','≥4 enemies near'],ambush:['附近 ≥4 敌','≥4 enemies near'],guangling:['≥5 敌或生命 <40%','≥5 enemies or HP <40%'],tiger:['附近 ≥4 敌','≥4 enemies near'],vajra:['被围或生命 <45%','surrounded or HP <45%'],zen:['生命 <45% 或内力见底','HP <45% or qi empty'],sarira:['≥6 敌或首领战','≥6 enemies or a boss'],gu:['附近 ≥3 敌','≥3 enemies near'],plague:['附近 ≥6 敌','≥6 enemies near'],rejuv:['生命 <50%','HP <50%'],numb:['被围或毒已叠满','surrounded or poison stacked']};
function autoCast(){ // casts each skill when it is worth the qi
  if(!G.auto)return; // Skill automation belongs to the title demo only.
  const P=G.P;autoSpend();
  for(let i=1;i<G.spells.length;i++){
    const s=G.spells[i];if(!canCast(i))continue;const id=s.id;let go=false;
    if(id==='palm')go=countNear(P.x,P.y,150)>=2;
    else if(id==='array'||id==='bagua')go=countNear(P.x,P.y,140)>=2;
    else if(id==='talis')go=countNear(P.x,P.y,230)>=4;
    else if(id==='ward')go=P.hp<P.maxHp*.5||countNear(P.x,P.y,60)>=6;
    else if(id==='whirl')go=countNear(P.x,P.y,70)>=3;
    else if(id==='leap')go=countNear(P.x,P.y,200)>=4&&countNear(P.x,P.y,50)<4;
    else if(id==='roar')go=countNear(P.x,P.y,100)>=4||P.hp<P.maxHp*.35;
    else if(id==='sunder')go=countNear(P.x,P.y,260)>=5||G.boss;
    else if(id==='exorcise')go=countNear(P.x,P.y,120)>=3;
    else if(id==='frenzy')go=countNear(P.x,P.y,150)>=5;
    else if(id==='flow')go=countNear(P.x,P.y,220)>=4;
    else if(id==='ambush')go=countNear(P.x,P.y,120)>=4;
    else if(id==='guangling')go=countNear(P.x,P.y,120)>=5||P.hp<P.maxHp*.4;
    else if(id==='tiger')go=countNear(P.x,P.y,190)>=4;
    else if(id==='vajra')go=countNear(P.x,P.y,60)>=5||P.hp<P.maxHp*.45;
    else if(id==='zen')go=P.hp<P.maxHp*.45||(P.mana<P.maxMana*.2&&countNear(P.x,P.y,80)<3);
    else if(id==='sarira')go=countNear(P.x,P.y,160)>=6||G.boss;
    else if(id==='gu')go=countNear(P.x,P.y,240)>=3;
    else if(id==='plague')go=countNear(P.x,P.y,240)>=6;
    else if(id==='rejuv')go=P.hp<P.maxHp*.5;
    else if(id==='numb')go=countNear(P.x,P.y,140)>=6||(G.boss&&countNear(P.x,P.y,140)>=3);
    if(go)castSkill(i);
  }
}
function dash(){
  const P=G.P;if(P.dashCd>0||P.down>0||G.over)return false;
  const v=G.auto?autopilot():input();let dx=v.x,dy=v.y;if(!dx&&!dy){dx=P.dx;dy=P.dy}
  const l=hyp(dx,dy)||1;P.dx=dx/l;P.dy=dy/l;P.yaw0=Math.atan2(P.dx,P.dy);
  P.dash=.17;P.dashCd=hasR('boots')?.82:1.1;P.ghostT=0;P.dashHit=new Set();trauma(.12,-P.dx,-P.dy);
  if(typeof SFX!=='undefined')SFX.dash();
  return true;
}

/* ---------- missions & shrines ---------- */
function startMission(){if(G.shared)return;if(RIVAL_ON&&!G.room){const left=(G.quick?180:PK_LEN)-G.t;if(left<70)return}
  const P=G.P;let x,y,tries=0;
  do{const a=rnd(TAU),d=rnd(260,420);x=clamp(P.x+Math.cos(a)*d,90,W-90);y=clamp(P.y+Math.sin(a)*d,90,H-90);tries++}while(tries<30&&(blocked(x,y)||onPond(x,y,1.4)||hyp(x-P.x,y-P.y)<200));
  const k=pick(G.t>120?['mush','statue','seal','hunt']:['mush','statue']);
  if(k==='seal'){ // stand inside the circle for 8 s in total while it draws enemies
    G.mission={k,n:8,N:8,T:40,t:40,x,y,r:52,pulse:0};
  }else if(k==='hunt'){ // a marked elite flees; kill it before it escapes
    spawnEnemy(pick(['bandit','archer','giant']),x,y,1.6,true);const e=G.en[G.en.length-1];e.marked=1;e.spd*=1.15;e.xp*=4;
    G.mission={k,n:1,N:1,T:45,t:45,x,y,target:e};
  }else if(k==='mush'){
    G.mush=[];for(let i=0;i<5;i++){const o={x:x+rnd(-90,90),y:y+rnd(-70,70)};collide(o,6);G.mush.push(o)}
    G.mission={k,n:5,N:5,T:34,t:34,x,y};
  }else{
    for(let i=0;i<3;i++){const o={x:x+Math.cos(i/3*TAU)*60,y:y+Math.sin(i/3*TAU)*60};collide(o,8);
      const hp=90+G.t*1.6;G.en.push({...o,t0:G.t,type:'statue',hp,maxHp:hp,spd:0,dmg:0,r:8,xp:0,fr:0,vx:0,vy:0})}
    G.mission={k,n:3,N:3,T:38,t:38,x,y};
  }
  const MB={mush:['密令:采集灵芝 ×5','Gather 5 lingzhi'],statue:['密令:摧毁邪碑 ×3','Destroy 3 cursed steles'],seal:['密令:封印邪阵 · 站入法阵 8 秒','Seal the rift: stand in the circle for 8 s'],hunt:['密令:猎杀逃犯 · 它在逃','Hunt the fugitive before it escapes']};showBanner(MB[k][0],MB[k][1]+' · reward: an augment card',1.8);if(typeof SFX!=='undefined')SFX.mission();
}
function checkMission(){if(G.mission&&G.mission.n<=0){G.mission=null;G.score+=PK_EVENTS.mission;(G.sc=G.sc||{kill:0,big:0,ev:0}).ev+=PK_EVENTS.mission;if(RIVAL_ON)showBanner('密令 +'+PK_EVENTS.mission,'Mission bonus',1);G.missionT=45;G.mush=[];G.picks.push({kind:'aug'});if(typeof SFX!=='undefined')SFX.complete();openPick()}}
function missionText(){
  const m=G.mission;if(!m)return '';
  const t=Math.ceil(m.t);
  const body=m.k==='mush'?L(`密令:采集灵芝 ${m.N-m.n}/${m.N}`,`Mission: gather lingzhi ${m.N-m.n}/${m.N}`):m.k==='statue'?L(`密令:摧毁邪碑 ${m.N-m.n}/${m.N}`,`Mission: destroy the cursed steles ${m.N-m.n}/${m.N}`):m.k==='seal'?L(`密令:封印邪阵 ${Math.ceil(m.N-m.n)}/${m.N}s`,`Mission: seal the rift ${Math.ceil(m.N-m.n)}/${m.N}s`):L('密令:猎杀逃犯','Mission: hunt the fugitive');
  return body+` · ${t}s · `+L('奖励:强化卡','reward: augment card');
}
function missionTarget(){ // the nearest thing the player still has to reach or destroy
  const m=G.mission,P=G.P;if(!m)return null;let b=null,bd=1e9;
  if(m.k==='mush'){for(const o of G.mush){const d=hyp(o.x-P.x,o.y-P.y);if(d<bd){bd=d;b=o}}}
  else if(m.k==='seal')return {x:m.x,y:m.y};
  else if(m.k==='hunt')return m.target&&!m.target.dead?m.target:null;
  else for(const e of G.en){if(e.type!=='statue'||e.dead)continue;const d=hyp(e.x-P.x,e.y-P.y);if(d<bd){bd=d;b=e}}
  return b;
}
function shrineTick(dt){
  const P=G.P;
  for(const s of G.shrines){
    s.cd=Math.max(0,s.cd-dt);
    if(s.cd<=0&&P.down<=0&&hyp(s.x-P.x,s.y-P.y)<34){
      s.cd=50;heal(P.maxHp*.35);P.mana=P.maxMana;
      const k=pick(['dmg','spd','haste']);P.buff={k,t:20};
      const names={dmg:['神龛加持:伤害+30%','Shrine blessing: +30% damage'],spd:['神龛加持:疾行','Shrine blessing: speed'],haste:['神龛加持:冷却减半','Shrine blessing: cooldowns halved']};
      showBanner(names[k][0],names[k][1],1.6);ring(s.x,s.y,70,'#ffd27a');trauma(.15);
      if(typeof SFX!=='undefined')SFX.shrine();
    }
  }
  if(P.buff){P.buff.t-=dt;if(P.buff.t<=0)P.buff=null}
}

/* ---------- cards ---------- */
function gainXP(v){
  G.xp+=v*(BOSSRUSH?2.2:1)*((G.ev&&G.ev.xp)||1)*(G.curse.xp||1);
  while(G.xp>=G.need){G.xp-=G.need;G.lv++;G.need=xpNeed(G.lv);autoGrow();if(G.lv%5===0&&!(tier(8)&&G.lv%10!==0))G.rerolls++;G.picks.push({kind:'level'});if(typeof SFX!=='undefined'&&!G.auto)SFX.levelup()}
  if(G.picks.length&&!(G.pickHold>0)){if(typeof introOn!=='undefined'&&introOn)G.pickHold=2.2;else openPick()}
}
const RARITY=[{k:'common',zh:'',en:'',w:62,x:1},{k:'rare',zh:'稀有',en:'Rare',w:26,x:1.6},{k:'epic',zh:'史诗',en:'Epic',w:10,x:2.4},{k:'legendary',zh:'传说',en:'Legendary',w:2,x:4}];
function rollRarity(){let r=rnd(100);for(const q of RARITY){if(r<q.w)return q;r-=q.w}return RARITY[0]}
/* the number nodes a skill earns by level: every LV_PER_RANK levels, one rank in the next open number node (lowest tier first, spread evenly) */
function autoRank(s){const T=TREES[s.id]||[];let best=-1,br=1e9;T.forEach((n,i)=>{if(isTrait(n)||!nodeOpen(s,i))return;const r=s.nodes[i]||0;const key=r*10+n.tier;if(key<br){br=key;best=i}});if(best<0)return null;spendNode(s,best);return T[best]}
function levelUp(s,n){for(let i=0;i<n;i++){s.lv++;if((s.lv-1)%LV_PER_RANK===0)autoRank(s);if(s.lv===7)G.picks.unshift({kind:'infuse',s});if(s.lv===14)G.picks.unshift({kind:'fuse',s});if(s.lv===AWAKE_LV&&SPELLS[s.id].auto&&WEAPON_INFO[s.id])G.picks.unshift({kind:'awake',s})}}
/* the next thing this skill unlocks, so a level card reads as a step on a route rather than a percentage */
function milestone(s){const m=SPELLS[s.id],w=WEAPON_INFO[s.id],lv=s.lv;const tree=TREES[s.id]||[],openN=tree.filter((n,i)=>nodeOpen(s,i)).length;
  if(lv<7)return [`Lv 7 可灌注真气(火/冰/雷/毒/风)`,`Lv 7: infuse an element (fire/ice/thunder/poison/wind)`];
  if(!s.els.length)return ['下次灌注真气卡即可附魔','take an element card to enchant it'];
  if(s.els.length===1){const e0=s.els[0],opts=Object.keys(ELS).filter(k=>k!==e0).map(k=>FUS[fusKey(e0,k)]).filter(Boolean).slice(0,3);const zh=opts.map(f=>f[0]).join('/'),en=opts.map(f=>f[1]).join('/');if(lv<14)return [`Lv 14 可融合第二种真气 → ${zh}`,`Lv 14: fuse a second element → ${en}`];return [`下次融合卡:${zh}(${ELS[e0].zh} + 另一种真气)`,`take a fusion card: ${en} (${ELS[e0].en} + another element)`]}
  if(w&&w.awake&&!s.awake)return [`Lv ${AWAKE_LV} 觉醒:${w.awake[0]}`,`Lv ${AWAKE_LV} awakening: ${w.awake[1]}`];
  if(lv<40)return [`Lv 40 满级 → 真传无限叠加`,`Lv 40 max → transcend stacks without limit`];
  return null}
function previewLevels(s,lv){const c={...s,nodes:{...s.nodes},pts:s.pts,lv:s.lv},got=[];for(let i=0;i<lv;i++){c.lv++;if((c.lv-1)%LV_PER_RANK===0){const n=autoRank(c);if(n)got.push(n)}}return {c,got}}
function spellCard(s,q){const m=SPELLS[s.id],next=s.lv+1,lv=q.k==='common'?1:q.k==='rare'?2:q.k==='epic'?3:5;
  const pv=previewLevels(s,lv);const gotN=pv.got.filter(n=>n.fx!=='dmg'&&n.fx!=='cd');const gotTxt=gotN.length?gotN.map(n=>L(n.d.replace(' / 级',''),n.de.replace(' / rank',''))).join(' · '):'';
  const now=stat(s),after=stat(pv.c),cdNow=m.auto?null:(m.cd*now.cdM/G.P.haste),cdAfter=m.auto?null:(m.cd*after.cdM/G.P.haste);
  const pct=Math.round((after.m/now.m-1)*100),cdp=cdNow?Math.round((1-cdAfter/cdNow)*100):0;
  const plain=`${m.zh}升 ${lv} 级:伤害 +${pct}%`+(cdNow&&cdp?`,冷却 -${cdp}%`:'')+((next<=7&&s.lv+lv>=7&&!s.els.length)?' · 并可灌注真气':'')+((s.lv+lv>=14&&s.els.length===1)?' · 并可融合真气':'');
  const hm=SKILL_CAT[s.id]==='heal'?healMul(G.t)*(G.curse.heal||1):1,wd0=SKILL_CAT[s.id]==='heal'?L('治疗','heal'):SKILL_CAT[s.id]==='defense'?L('效果','effect'):L('伤害','damage');const nums=[`${wd0} ×${(now.m*hm).toFixed(2)} → ×${(after.m*hm).toFixed(2)}`+(hm<1?L(`(含治疗效率 ${Math.round(hm*100)}%)`,` (at ${Math.round(hm*100)}% heal efficiency)`):''),cdNow?`${L('冷却','cooldown')} ${cdNow.toFixed(1)}s → ${cdAfter.toFixed(1)}s`:''].filter(Boolean).join(' · ');
  const extra=(next<=7&&s.lv+lv>=7&&!s.els.length)?' · 解锁真气':(s.lv+lv>=14&&s.els.length===1)?' · 解锁融合':'';
  const isHeal=SKILL_CAT[s.id]==='heal',isDef=SKILL_CAT[s.id]==='defense',word=isHeal?['治疗量','Healing']:isDef?['效果','Effect']:['伤害','Damage'];
  return {g:m.g,c:m.col,skill:s.id,n:LL(m),sub:`Lv ${s.lv} → ${s.lv+lv} · ${nums}`,fx:(gotTxt?gotTxt+' · ':'')+L(`${word[0]} +${pct}%`+(cdNow&&cdp?` · 冷却 -${cdp}%`:'')+extra,`${word[1]} +${pct}%`+(cdNow&&cdp?` · cooldown -${cdp}%`:'')+(extra?L(extra,extra.includes('融合')?' · unlocks fusion':' · unlocks an element'):'')),fxEn:(()=>{const ms=milestone({...s,lv:s.lv+lv});return ms?L('路线:'+ms[0],'Route: '+ms[1]):''})(),q,cat:SKILL_CAT[s.id],kind:'level',a(){levelUp(s,lv);taken(SKILL_CAT[s.id],lv)}}}
function taken(cat,n){G.taken=G.taken||{};G.taken[cat]=(G.taken[cat]||0)+(n||1)}
function buildCards(q){
  if(q.kind==='ascend'){const cyc=q.cyc,all=[
      {id:'storm',zh:'天雷劫',en:'Thunder Tribulation',cost:['首领每 2:30 现身,伤害 +30%','A boss every 2:30, +30% damage'],gain:['每位首领必掉一张传说卡','Every boss drops a legendary card'],apply(){G.curse.bossEvery=150;G.curse.bossDmg=1.3;G.curse.bossLeg=1;G.cycAt=G.t;G.cycN=G.bossN}},
      {id:'blood',zh:'血战',en:'Blood War',cost:['敌人伤害 +50%','Enemies +50% damage'],gain:['你的伤害 +40%,暴击 +25%','+40% damage, +25% crit'],apply(){G.curse.edmg=(G.curse.edmg||1)*1.5;G.P.dmgBonus+=.4;G.P.crit+=.25}},
      {id:'army',zh:'万军',en:'Ten Thousand',cost:['怪潮 +60%,精英翻倍','+60% spawns, twice the elites'],gain:['金币 +60%,经验 +25%','+60% gold, +25% XP'],apply(){G.curse.spawn=(G.curse.spawn||1)*1.6;G.curse.elite=2;G.curse.gold=(G.curse.gold||1)*1.6;G.curse.xp=(G.curse.xp||1)*1.25}},
      {id:'hollow',zh:'空明',en:'Hollow Mind',cost:['治疗效果减半','Healing halved'],gain:['武学冷却 -30%,内力回复 +50%','-30% cooldowns, +50% qi regen'],apply(){G.curse.heal=.5;G.P.haste*=1/.7;G.P.regen*=1.5}}].filter(c=>!(G.ascends||[]).includes(c.id)).sort(()=>SIMR()-.5).slice(0,2);
    return [...all.map(c=>({g:'进',badge:'劫',c:'#ffd27a',n:L(`进化 · ${c.zh}`,`Evolve · ${c.en}`),sub:L(`第 ${cyc} 轮已通 · 新规则持续到本局结束`,`Cycle ${cyc} cleared · the rule lasts the run`),fx:L('获得:'+c.gain[0],'Gain: '+c.gain[1]),fxEn:L('代价:'+c.cost[0],'Price: '+c.cost[1]),q:RARITY[2],kind:'ascend',cat:'passive',a(){G.ascends=G.ascends||[];G.ascends.push(c.id);c.apply();trauma(.5);G.flash=.6;showBanner(`进化 · ${c.zh}`,`Evolved: ${c.en}`,2);if(typeof SFX!=='undefined')SFX.chest()}})),
      {g:'续',c:'#9fe3f0',n:L('照旧继续','Carry on as is'),sub:L(`第 ${cyc} 轮已通 · 不改规则`,`Cycle ${cyc} cleared · rules unchanged`),fx:L(`+${60*cyc} 金,继续无尽`,`+${60*cyc} gold, the run goes on`),fxEn:L('想收手时在暂停里「收官结算」,奖励不打折。','Cash out any time from the pause menu — full rewards.'),kind:'ascend',cat:'passive',a(){G.goldRun+=60*cyc}}]}
  if(q.kind==='contract'){const opts=CONTRACTS.filter(c=>!(G.contracts||[]).includes(c.id)).sort(()=>SIMR()-.5).slice(0,2);
    return [...opts.map(c=>({g:'契',c:'#ff6a6a',n:LL(c),sub:L('契约 · 本局有效','pact · lasts the run'),fx:L('获得:'+c.gain[0],'Gain: '+c.gain[1]),fxEn:L('代价:'+c.cost[0],'Price: '+c.cost[1]),kind:'contract',cat:'passive',a(){G.contracts=G.contracts||[];G.contracts.push(c.id);c.apply();c.reward();trauma(.4);G.flash=.4;showBanner(c.zh+' 已立',c.en+' sealed',1.4)}})),{g:'拒',c:'#efe4cd',n:L('不立契','Decline'),sub:'',fx:L('不付代价,也不拿奖励。','No price, no reward.'),fxEn:'',kind:'passive',cat:'passive',a(){}}]}
  if(q.kind==='awake'){const s=q.s,m=SPELLS[s.id],w=WEAPON_INFO[s.id];
    return [{g:m.g,badge:'觉',c:m.col,skill:s.id,n:L(`${m.zh} 觉醒`,`${m.en} Awakening`),sub:L('武器觉醒','weapon awakening'),fx:L(w.awake[0],w.awake[1]),fxEn:'',q:RARITY[3],cat:SKILL_CAT[s.id],kind:'awake',a(){s.awake=1;trauma(.5);G.flash=.6;shock(G.P.x,G.P.y,300,.05);showBanner(m.zh+' 觉醒',m.en+' awakened',1.8);if(typeof SFX!=='undefined')SFX.chest()}}]}
  if(q.kind==='infuse'||q.kind==='fuse'){
    const s=q.s,opts=Object.keys(ELS).filter(k=>!s.els.includes(k)).sort(()=>SIMR()-.5).slice(0,3);
    return opts.map(k=>{const el=ELS[k];
      if(q.kind==='infuse'||!s.els.length)return {g:SPELLS[s.id].g,badge:el.g,c:el.col,skill:s.id,n:L(`${SPELLS[s.id].zh} 灌注 ${el.zh}`,`${SPELLS[s.id].en} + ${el.en}`),sub:'',fx:L(el.d,el.de),fxEn:'',cat:'element',kind:'element',a(){s.els.push(k)}};
      const f=FUS[fusKey(s.els[0],k)]||[el.zh,el.en,el.d,el.de];
      return {g:SPELLS[s.id].g,badge:el.g,c:el.col,skill:s.id,n:L(`${SPELLS[s.id].zh} 融合 ${f[0]}`,`${SPELLS[s.id].en}: ${f[1]}`),sub:L(`${ELS[s.els[0]].zh} + ${el.zh}`,`${ELS[s.els[0]].en} + ${el.en}`),fx:L(f[2],f[3])+L(' · 伤害 +25%',' · damage +25%'),fxEn:'',cat:'element',kind:'fusion',a(){s.els.push(k)}};
    });
  }
  if(q.kind==='aug'){
    const opts=[];for(const s of G.spells)for(const k in AUGS)if(AUGS[k].for.includes(s.id)&&!s.augs.includes(k))opts.push([s,k]);
    opts.sort(()=>SIMR()-.5);
    return opts.slice(0,3).map(([s,k])=>{const a=AUGS[k],m=SPELLS[s.id];return {g:m.g,badge:a.g,c:m.col,skill:s.id,n:L(`${m.zh} · ${a.zh}`,`${m.en} · ${a.en}`),sub:'',fx:a.by&&a.by[s.id]?L(a.by[s.id][0],a.by[s.id][1]):L(a.d,a.de),fxEn:'',cat:'augment',kind:'augment',a(){s.augs.push(k)}}});
  }
  const pool=[],rollQ=()=>q.forceQ?(RARITY.find(r=>r.k===q.forceQ)||rollRarity()):rollRarity(); // every card rolls its own rarity: most hands are plain, a purple or gold card is a surprise
  G.spells.filter(s=>s.lv<40).forEach(s=>{pool.push(spellCard(s,rollQ()),spellCard(s,rollQ()))});
  G.spells.filter(s=>s.lv>=40).forEach(s=>{const m=SPELLS[s.id],q=rollQ(),n=q.k==='common'?1:q.k==='rare'?2:q.k==='epic'?3:5,tr=s.tr||0; // past the cap the skill keeps growing: 真传 stacks without limit
    pool.push({g:m.g,c:m.col,skill:s.id,q:q.k,n:L(`${m.zh} · 真传 +${n}`,`${m.en} · Transcend +${n}`),sub:L(`已满级 · 真传 ${tr} 层`,`Max level · transcend ${tr}`),fx:(()=>{const wd=SKILL_CAT[s.id]==='heal'?['治疗量','Healing']:SKILL_CAT[s.id]==='defense'?['效果','Effect']:['伤害','Damage'];return L(`${wd[0]} +${n*5}%(超越上限)`,`${wd[1]} +${n*5}% (beyond the cap)`)})(),fxEn:L(`倍率 ×${stat(s).m.toFixed(2)} → ×${(stat(s).m*(1+.05*(tr+n))/(1+.05*tr)).toFixed(2)}`,`multiplier ×${stat(s).m.toFixed(2)} → ×${(stat(s).m*(1+.05*(tr+n))/(1+.05*tr)).toFixed(2)}`),cat:SKILL_CAT[s.id],kind:'level',a(){s.tr=(s.tr||0)+n;taken(SKILL_CAT[s.id])}})});
  if(G.spells.length<4&&G.lv>=3)CLASSES[G.cls].skills.filter(k=>!G.spells.some(s=>s.id===k)).forEach(k=>{const m=SPELLS[k];
    const card={g:m.g,c:m.col,skill:k,n:LL(m),sub:L(`${m.cost} 内力 · ${m.cd}s`,`${m.cost} qi · ${m.cd}s`),fx:L(m.d,m.de),fxEn:'',cat:SKILL_CAT[k],isNew:1,kind:'new',a(){G.spells.push(mkSpell(k));taken(SKILL_CAT[k],2)}};pool.push(card,card)});
  G.spells.forEach(s=>(TREES[s.id]||[]).forEach((n,i)=>{if(isTrait(n)&&nodeOpen(s,i))pool.push(nodeCard(s,i,rollQ()))}));
  const P=G.P,perkNow={锋锐:()=>L('伤害','damage')+` ×${(P.dmg*(1+P.dmgBonus)).toFixed(2)}`,金钟罩:()=>L('减伤','damage taken')+` ${Math.round((1-P.def)*100)}%`,轻身:()=>L('移速','speed')+` ×${P.spd.toFixed(2)}`,内息:()=>L('内力','qi')+` ${P.maxMana} · +${P.regen.toFixed(1)}/s`,生息:()=>L('生命','HP')+` ${P.maxHp}`,摄物:()=>L('拾取','pickup')+` ×${P.mag.toFixed(2)}`,疾风:()=>L('冷却','cooldown')+` ×${(1/P.haste).toFixed(2)}`,致命:()=>L('暴击','crit')+` ${Math.min(100,Math.round(P.crit*100))}%`+(P.crit>1?L(` · 暴伤 ×${(2+(P.crit-1)*2).toFixed(1)}`,` · crit dmg ×${(2+(P.crit-1)*2).toFixed(1)}`):'')};
  const pc=v=>Math.round(v*100)+'%',perkVal={锋锐:Q=>[L('伤害','Damage'),pc(Q.dmg*(1+(Q.dmgBonus||0)))],金钟罩:Q=>[L('减伤','Damage cut'),Math.round((1-Q.def)*100)+'%'],轻身:Q=>[L('移速','Speed'),pc(Q.spd)],内息:Q=>[L('内力上限','Max qi'),Q.maxMana],生息:Q=>[L('生命上限','Max HP'),Q.maxHp],摄物:Q=>[L('拾取范围','Pickup range'),pc(Q.mag)],疾风:Q=>[L('冷却','Cooldown'),pc(1/Q.haste)],致命:Q=>[L('暴击率','Crit'),Math.min(100,Math.round(Q.crit*100))+'%']};
  PERKS.forEach(p=>{if(p.zh==='金钟罩'&&G.P.def<=.42)return;const q=rollQ(),times=(q.k==='common'?1:q.k==='rare'?2:q.k==='epic'?3:4)*(p.zh==='致命'&&q.k==='legendary'?.75:1)|0||1;
    const Q1=Object.assign({},G.P);for(let i=0;i<times;i++)p.a(Q1);const v0=perkVal[p.zh](G.P),v1=perkVal[p.zh](Q1);
    pool.push({g:p.g,c:'#efe4cd',n:LL(p),sub:times>1?L(`${times} 层`,`${times} stacks`):'',fx:`${v0[0]} ${v0[1]} → ${v1[1]}`,fxEn:L(p.d,p.de).replace(/\(.*\)/,''),q,cat:PERK_CAT[p.zh]||'passive',kind:'passive',a(){for(let i=0;i<times;i++)p.a(G.P);taken(PERK_CAT[p.zh]||'passive',times)}})});
  const out=[];const used=new Set(q.exclude||[]);
  const isNew=pool.filter(p=>p.isNew);
  if(isNew.length&&[3,6,10].includes(G.lv)){const opts=isNew.filter((c,i,a)=>a.findIndex(o=>o.n===c.n)===i).sort(()=>SIMR()-.5).slice(0,2);opts.forEach(nc=>{out.push(nc);used.add(nc.n)})}
  if(q.kind==='level'&&(G.lv===2||G.lv===4)&&!G.spells[0].path&&!BOSSRUSH){const w=G.spells[0],m=SPELLS[w.id];Object.keys(PATHS).sort(()=>SIMR()-.5).slice(0,2).forEach(k=>{const p=PATHS[k];const cd={g:m.g,badge:'派',c:'#ff9c5a',skill:w.id,n:L(`${m.zh} · ${p.zh}`,`${m.en} · ${p.en}`),sub:L('流派 · 一局一次','path · once per run'),fx:L(p.d,p.de),fxEn:L('之后的升级都按这个打法成长','later levels grow along this path'),q:RARITY[1],cat:SKILL_CAT[w.id],kind:'path',a(){w.path=k;if(p.crit)G.P.crit+=p.crit;taken(SKILL_CAT[w.id]);showBanner(`流派 · ${p.zh}`,`Path: ${p.en}`,1.4);if(typeof drawSeals==='function')drawSeals()}};out.push(cd);used.add(cd.n)})}
  if(q.kind==='level'&&G.lv<=3&&!G.turnOffered){const w=G.spells[0],tree=TREES[w.id]||[];const ti=tree.findIndex((n,j)=>isTrait(n)&&nodeOpen(w,j)&&n.tier===1);if(ti>=0){const nc=nodeCard(w,ti,rollQ());nc.turn=1;out.push(nc);used.add(nc.n);G.turnOffered=1}} // early on, offer a node that visibly changes how the weapon behaves
  const adv=typeof buildAdvice==='function'?buildAdvice():null; // the warning on the card screen always comes with a concrete fix
  if(adv&&q.kind==='level'){const fits=pool.filter(p=>!used.has(p.n)&&(p.cat===adv.cat||(adv.cat==='defense'&&p.cat==='heal')||(adv.cat==='melee'&&(p.cat==='ranged'||p.cat==='summon'))));if(fits.length){const p=pick(fits);used.add(p.n);out.push(p)}}
  let guard=0;while(out.length<3&&guard++<80){const p=pick(pool);if(!used.has(p.n)&&!(out.some(c=>c.isNew)&&p.isNew)){used.add(p.n);out.push(p)}}
  if(SIMR()<.03&&q.kind==='level'){ // jackpot: take all three
    const acts=out.map(c=>c.a);let done=false;out.forEach(c=>{c.jackpot=1;c.a=()=>{if(done)return;done=true;acts.forEach(f=>f());if(typeof showSide==='function')showSide('天降横财 · 三张全拿','Jackpot: all three taken','#ffd27a','jackpot')}});q.jackpot=1}
  return out;
}

/* level curve: slow early, keeps paying out late (gem values also rise every 4 minutes) */
/* level curve: the first levels are nearly free (Lv 2 after a handful of kills), then it settles into the long curve */
function xpNeed(lv){return lv<=8?Math.round(4+lv*3+lv*lv*.5):Math.round(12+lv*6+lv*lv*Math.min(2.6,.65+Math.max(0,lv-30)*.02)-60*Math.max(0,(16-lv)/8))}
function autoGrow(){const P=G.P;P.maxHp+=7;P.hp=Math.min(P.maxHp,P.hp+12);P.dmgBonus+=.02;P.maxMana+=5;P.mana=Math.min(P.maxMana,P.mana+10);P.regen*=1.03;P.spd*=1.01;P.crit+=.004;P.attr.str++;P.attr.vit++;P.attr.spr++;P.attr.agi++}
function spendAttr(id){const P=G.P;if(P.ap<=0)return false;P.ap--;P.attr[id]++;
  if(id==='str')P.dmgBonus+=.04;if(id==='vit'){P.maxHp+=8;P.hp+=8}if(id==='spr'){P.maxMana+=6;P.mana+=6;P.regen*=1.04}if(id==='agi'){P.spd*=1.02;P.crit+=.01}return true}
function nodeOpen(s,i){const n=TREES[s.id]&&TREES[s.id][i];if(!n)return false;const r=s.nodes[i]||0;if(r>=n.max)return false;if(isTrait(n))return s.lv>=(n.tier===1?1:n.tier===2?4:10);const need=n.tier===1?0:n.tier===2?2:4;return s.pts>=need}
function canNode(s,i){return nodeOpen(s,i)&&G.P.sp>0}
function spendNode(s,i){if(!nodeOpen(s,i))return false;s.pts++;s.nodes[i]=(s.nodes[i]||0)+1;return true}
function nodeCard(s,i,q){const n=TREES[s.id][i],m=SPELLS[s.id],r=s.nodes[i]||0,k=Math.min(n.max-r,q&&q.k==='legendary'?3:q&&q.k==='epic'?2:1);return {g:m.g,badge:n.zh[0],c:m.col,skill:s.id,n:L(`${m.zh} · ${n.zh}`,`${m.en} · ${n.en}`)+(k>1?` ×${k}`:''),sub:(()=>{const si=G.spells.indexOf(s),slot=si===0?L('普攻','main'):L(`键 ${SPELL_KEYS[si]}`,`key ${SPELL_KEYS[si]}`);return L(`${m.zh}(${slot}) · 特性 ${r+k}/${n.max}`,`${m.en} (${slot}) · trait ${r+k}/${n.max}`)})(),fx:L(n.d,n.de)+(k>1?` ×${k}`:''),fxEn:'',node:1,nodeFx:n.fx,q:k>1?q:undefined,cat:SKILL_CAT[s.id],kind:'tree',a(){for(let j=0;j<k;j++)spendNode(s,i)}}}
/* ---------- spawning ---------- */
/* entity caps: phones get fewer particles, bullets and bodies on screen so the frame stays smooth */
const CAP=(typeof PHONE!=='undefined'&&PHONE)?{en:340,fx:300,bu:170,gem:220,fl:22}:{en:560,fx:640,bu:280,gem:360,fl:40};
const diff=t=>Math.min(24,(1+t/120)*(t>240?1+(t-240)/220:1)); // enemy HP: steepens after the first boss, capped at 40x so late minions never become sponges
/* 怨气 doom: from 10 minutes the run must end — enemies hit harder every minute and healing tapers, so a stalemate (can't kill, can't die) cannot happen */
const DOOM_T=600;const doomDmg=t=>(t>DOOM_T?1+(t-DOOM_T)/500:1)*(t>1800?1+(t-1800)/300:1); // +12%/min after 10 min, steeper after 30: a good player goes much longer, nobody goes forever
const dodgeDmg=t=>(1+t/170)*doomDmg(t); // arrows, bombs, charges and ground attacks keep scaling — they can all be dodged or parried
/* healing tapers with run time: full for the first 5 minutes, 65% at 10, 40% at 15, floor 30% — so late runs cannot be out-healed */
const healMul=t=>t<240?1:Math.max(.25,1-(t-240)/1000);
function spawnEnemy(type,x,y,mul=1,elite){
  const b=ETYPES[type],t=G.t,sc=diff(t)*(tier(1)?1.15:1);
  const el=elite||(t>50&&type!=='assassin'&&SIMR()<Math.min(.22,.06+t/3600)*(tier(2)?1.8:1)*((G.ev&&G.ev.elite)||1)*(G.curse.elite||1)*(G.dir?G.dir.elite:1));
  let affix=null;const afT=tier(4)?120:300;if(t>afT&&SIMR()<Math.min(.35,(t-afT)/1500))affix=pick(['swift','explode','armor']);
  let role=null;if(type==='bandit'&&t>90&&SIMR()<.22)role='charger';if(type==='archer'&&t>200&&SIMR()<.3*(G.dir?G.dir.heal:1))role='shaman';
  const hp=b.hp*sc*mul*(el?5:1)*(affix==='armor'?1.8:1)*D().hp*(G.dir?G.dir.hp:1);
  G.en.push({x,y,type,hp,maxHp:hp,t0:t,spd:b.spd*rnd(.92,1.08)*(el?.9:1)*(affix==='swift'?1.5:1)*Math.min(1.35,1+Math.max(0,t-240)/900)*(G.curse.spd||1),dmg:b.dmg*Math.min(8,(1+t/300)*(t>240?1+(t-240)/420:1))*doomDmg(t)*(el?1.4:1)*D().dmg*(G.curse.edmg||1)*(G.dir?G.dir.dmg:1),r:b.r*(el?1.4:1),xp:b.xp*(1+t/260)|0||1,fr:rnd(1),vx:0,vy:0,shoot:b.shoot&&role!=='shaman',st:rnd(1,3),elite:el,sc:(el?1.5:1)*(affix==='armor'?1.15:1)*(role==='charger'?1.12:1),kx:0,ky:0,affix,role,ct:rnd(2,4)});
  const ne=G.en[G.en.length-1];if(b.mesh){ne.mesh=b.mesh;ne.sc=(ne.sc||1)*(b.sc||1);ne.tintv=b.tint;ne.ghost=b.ghost;ne.bomb=b.bomb;ne.shield=type==='brute'}
  if(el)G.elites++;
}
function edgePoint(){
  const P=(G.shared&&SIMR()<.55&&arenaSpawnAnchor())||((G.rival&&G.rival.down<=0&&SIMR()<.4)?G.rival:G.P),a=rnd(TAU),R=Math.max(VW,VH)*.62+rnd(20);
  const o={x:P.x+Math.cos(a)*R,y:P.y+Math.sin(a)*R};
  o.x=clamp(o.x,30,W-30);o.y=clamp(o.y,30,H-30);
  if(hyp(o.x-P.x,o.y-P.y)<110){o.x=clamp(P.x-Math.cos(a)*R,30,W-30);o.y=clamp(P.y-Math.sin(a)*R,30,H-30)}
  return o;
}
function spawnTick(dt){
  const t=G.t;
  if(G.en.length>CAP.en)return;
  const rate=Math.min(20,1.0+t/34+Math.max(0,t-240)/36+Math.max(0,1.6*(1-t/60)))*(G.boss?.4:1)*(G.en.length>CAP.en*.75?.45:1)*(tier(9)?1.25:1)*(G.curse.spawn||1)*(BOSSRUSH?.55:1)*(G.dir?G.dir.spawn:1)*(G.shared?1+.7*arenaRemoteN():1);G.spawnA+=rate*dt;
  while(G.spawnA>=1){G.spawnA--;
    const r=rnd(),o=edgePoint();
    let ty='assassin';
    if(t>25&&r<.45)ty='bandit';
    const lateR=clamp((t-480)/600,0,1);if(t>85&&r<.14+.10*lateR)ty='archer';
    if(t>150&&r<.07)ty='giant';
    if(t>150&&r>.45&&r<.53)ty='brute';if(t>210&&r>.53&&r<.585+.05*lateR)ty='bomber';if(t>300&&r>.585&&r<.64)ty='wraith';
    if(t>360&&r>.64&&r<.67)ty='firewisp';if(t>360&&r>.67&&r<.70)ty='icesprite';
    if(G.theme&&rnd()<.7)ty=G.theme.type;
    if(G.dir&&G.dir.counter&&G.dir.counterP>0&&rnd()<G.dir.counterP)ty=G.dir.counter; // the director sends what the build handles worst
    spawnEnemy(ty,o.x,o.y);
  }
  // themed surges: one monster type floods in for 22 s; the banner names what it is weak to, so the right skill matters
  if(!G.boss&&!BOSSRUSH&&t>120){G.themeT=(G.themeT===undefined?40:G.themeT)-dt;
    if(G.theme&&t>G.theme.until){G.theme=null}
    if(G.themeT<=0&&!G.theme){G.themeT=75+rnd(0,20);const opts=THEMES.filter(th=>t>=th.from&&!(G.ev&&G.ev.noTheme));const th=pick(opts);const A=AFFINITY[th.type];G.theme={type:th.type,until:t+22,zh:th.zh,en:th.en};
      showBanner(`${th.zh}! ${A.tip[0]}`,`${th.en}! ${A.tip[1]}`,2.6);if(typeof SFX!=='undefined')SFX.wave();
      const n=Math.round(10+t/60);for(let i=0;i<n;i++){const o=edgePoint();spawnEnemy(th.type,o.x,o.y)}}}
  const wave=Math.floor(t/30);if(wave>G.wave&&!G.boss){G.wave=wave;const mix=t>150?['刀客 · 弓手 · 铁甲力士','Bandit · Archer · Iron Giant']:t>85?['刀客 · 弓手','Bandit · Archer']:t>25?['刺客 · 刀客','Assassin · Bandit']:['刺客','Assassin'];showBanner(`第 ${wave} 波`,`Wave ${wave} · ${mix[1]}`,1);if(G.curse.waveChest&&!G.curse.nochest){const P=G.P;G.chests.push({x:clamp(P.x+rnd(-90,90),60,W-60),y:clamp(P.y+rnd(-90,90),60,H-60),t:0})}if(typeof SFX!=='undefined')SFX.wave()}
  G.swarmT-=dt;
  if(G.swarmT<=0&&!G.boss){G.swarmT=50;const P=G.P,n=18+Math.floor(t/8);
    for(let i=0;i<n;i++){const a=i/n*TAU,o={x:clamp(P.x+Math.cos(a)*180,30,W-30),y:clamp(P.y+Math.sin(a)*180,30,H-30)};spawnEnemy('assassin',o.x,o.y,.8)}
    G.ambush=20;showBanner('刺客来袭','Ambush: survive 20 s for a chest',1.2);if(typeof SFX!=='undefined')SFX.swarm();
  }
  if(!BOSSRUSH&&!G.auto&&G.contractN<2&&t>=(G.contractN===0?60:180)){G.contractN++;G.picks.push({kind:'contract'});if(typeof SFX!=='undefined')SFX.chest()}
  if(G.ambush>0){G.ambush-=dt;if(G.ambush<=0){const P=G.P;G.chests.push({x:clamp(P.x+rnd(-60,60),60,W-60),y:clamp(P.y+rnd(-60,60),60,H-60),t:0});showBanner('伏击已破','Ambush survived: a chest drops'+(RIVAL_ON?' · +'+PK_EVENTS.ambush:''),1.2);G.score+=PK_EVENTS.ambush;(G.sc=G.sc||{kill:0,big:0,ev:0}).ev+=PK_EVENTS.ambush;if(typeof SFX!=='undefined')SFX.complete()}}
  if(G.warlordNow){G.warlordNow=0;G.warlordN++;const o=edgePoint();spawnEnemy('giant',o.x,o.y,9+G.warlordN*3,true);const e=G.en[G.en.length-1];e.warlord=1;e.sc=2;e.r=16;e.name='铁甲统领';showBanner('铁甲统领','The Iron Warlord arrives',1.6)}
  if(!BOSSRUSH&&t>=G.warlordN*240+120&&!G.boss){if(tier(7)){const o2=edgePoint();spawnEnemy('giant',o2.x,o2.y,9+G.warlordN*3,true);const e2=G.en[G.en.length-1];e2.warlord=1;e2.sc=2;e2.r=16;e2.name='铁甲统领'}G.warlordN++;const o=edgePoint();spawnEnemy('giant',o.x,o.y,9+G.warlordN*3,true);const e=G.en[G.en.length-1];e.warlord=1;e.sc=2;e.r=16;e.spd*=1.15+G.warlordN*.05;e.hp=e.maxHp=Math.max(e.hp,powerHp(9));e.name='铁甲统领';showBanner('铁甲统领','The Iron Warlord arrives',1.6);trauma(.4);if(typeof SFX!=='undefined')SFX.bossIn()}
  if(t>=bossDue()&&!G.boss){const n=G.bossN,V=BOSSES[n%BOSSES.length],o=edgePoint(),k=1+n*1.25,hp=Math.round(Math.max((BOSSRUSH?5000:9000)*k*(1+t/600)*D().hp*(tier(10)?1.3:1)*(duelLen()&&t<BOSS_AT?.5:1),powerHp(BOSSRUSH?20:duelLen()&&t<BOSS_AT?18:26)));
    G.boss={x:o.x,y:o.y,t0:G.t,type:'boss',hp,maxHp:hp,spd:24+n*3,dmg:22*(1+n*.35)*D().dmg*(tier(6)?1.25:1)*Math.pow(G.bossK||1,.22)*(G.curse.bossDmg||1),r:20,xp:0,fr:0,vx:0,vy:0,kx:0,ky:0,n,name:V[0],en:V[1],tint:V[2],rate:Math.max(.55,1-n*.12)};G.en.push(G.boss);G.bossT=3;G.bossSpawned=1;
    const cyc=Math.floor(n/BOSSES.length)+1;if(cyc>=2){for(let i=0;i<Math.min(4,cyc);i++){const o2=edgePoint();spawnEnemy(pick(['giant','brute','archer']),o2.x,o2.y,3+cyc,true);const e2=G.en[G.en.length-1];e2.escort=1;e2.sc=1.4;e2.hp=e2.maxHp=Math.max(e2.hp,powerHp(3))}} // later cycles: the boss brings elite escorts
    showBanner(V[0]+'现身',V[1]+' emerges',2.6);trauma(.6);G.slow=Math.max(G.slow,.5);if(!G.auto&&typeof bossIntro==='function')bossIntro(V[0],V[1],n);if(!G.auto){$('#bossbar').hidden=false;$('#bossname').textContent=(cyc>=2?L(`第${['','一','二','三','四','五','六','七','八','九'][cyc]||cyc}轮 ${n%BOSSES.length+1}/${BOSSES.length} · `,`Cycle ${cyc} · ${n%BOSSES.length+1}/${BOSSES.length} · `):'')+L(V[0],V[1])}if(typeof SFX!=='undefined')SFX.bossIn();
  }
}
function bossAI(dt){
  const B=G.boss;if(!B||B.dead)return;const P=G.shared?arenaBossTarget(B):G.P;
  if(B.charge>0){B.charge-=dt;B.x+=B.cvx*dt;B.y+=B.cvy*dt;collide(B,B.r);if(B.charge<=0){ring(B.x,B.y,34,'#e0503f');trauma(.3);if(hyp(B.x-P.x,B.y-P.y)>60){B.exposed=2;showBanner('破绽!','OPENING!',1)}}return}
  if(B.tele>0){B.tele-=dt;if(B.tele<=0){const a=Math.atan2(B.ty-B.y,B.tx-B.x);B.cvx=Math.cos(a)*300;B.cvy=Math.sin(a)*300;B.charge=.62;if(typeof SFX!=='undefined')SFX.bossCharge()}return}
  G.bossT-=dt;if(G.bossT>0)return;
  const low=B.hp<B.maxHp*.5;G.bossT=(low?2.3:3.2)*(B.rate||1);
  const sig=BOSS_SIG[B.n%BOSSES.length]||[],base=(B.n>=1||tier(3))?['radial','aimed','charge','summon','nova']:['radial','aimed','charge','summon'];
  const k=(SIMR()<.45&&sig.length)?pick(sig):pick(base);
  if(k==='bloodrain'){ // Blood Demon: blood pools fall around the hero
    for(let i=0;i<5;i++){const a=rnd(TAU),d=i===0?0:rnd(40,130);hazard(clamp(P.x+Math.cos(a)*d,30,W-30),clamp(P.y+Math.sin(a)*d,30,H-30),30,1.1,3.5,14*(1+B.n*.3),6,'#ff2a3a')}}
  if(k==='drain'){ // Blood Demon: leech beam - stand still and it heals him
    B.drain=2.2;B.healed=0;B.drainHit=0;B.drainOut=0;B.drainHits=(B.drainHits||0)+1;ring(B.x,B.y,60,'#ff4a6a');ring(B.x,B.y,230,'#ff2a3a');showBanner('吸血!远离他','DRAINING - move away!',1.4);trauma(.2)}
  if(k==='spiral'){ // Ghost-Mask: rotating blade spiral
    const o=rnd(TAU),dir=SIMR()<.5?1:-1;for(let w=0;w<16;w++)later(w*.09,()=>{if(B.dead)return;for(let j=0;j<3;j++)bullet(B.x,B.y,o+dir*w*.42+j/3*TAU,96,11)})}
  if(k==='blink'){ // Ghost-Mask: vanish, reappear beside the hero, slash fan
    const a=rnd(TAU),tx=clamp(P.x+Math.cos(a)*70,30,W-30),ty=clamp(P.y+Math.sin(a)*70,30,H-30);ring(tx,ty,40,'#8fe3ff');B.hide=.55;
    later(.55,()=>{if(B.dead)return;B.x=tx;B.y=ty;ring(B.x,B.y,46,'#8fe3ff');trauma(.3);const aa=Math.atan2(P.y-B.y,P.x-B.x);for(let i=-3;i<=3;i++)bullet(B.x,B.y,aa+i*.14,150,12)})}
  if(k==='eggs'){ // Mother of Gu: eggs hatch into swift assassins
    for(let i=0;i<6;i++){const a=i/6*TAU+rnd(.4),d=rnd(70,150),x=clamp(P.x+Math.cos(a)*d,30,W-30),y=clamp(P.y+Math.sin(a)*d,30,H-30);ring(x,y,22,'#9ff06a');
      later(1.4,()=>{if(B.dead)return;spawnEnemy('assassin',x,y,.75);const e=G.en[G.en.length-1];if(e){e.affix='swift';e.spd*=1.5}ring(x,y,30,'#9ff06a')})}}
  if(k==='venom'){ // Mother of Gu: lingering poison cloud aimed at the hero
    const a=Math.atan2(P.y-B.y,P.x-B.x);for(let i=0;i<3;i++)hazard(clamp(P.x+Math.cos(a)*i*55,30,W-30),clamp(P.y+Math.sin(a)*i*55,30,H-30),42,1.3,7,6*(1+B.n*.3),9,'#9ff06a')}
  if(k==='bonewall'){ // Bone Venerable: slow bone walls you must dash through
    const o=Math.atan2(P.y-B.y,P.x-B.x)+rnd(-.3,.3);for(let w=0;w<2;w++)for(let i=-7;i<=7;i++){const a=o+i*.07+w*Math.PI;G.bullets.push({x:B.x+Math.cos(a)*20,y:B.y+Math.sin(a)*20,vx:Math.cos(a)*46,vy:Math.sin(a)*46,life:9,d:16,bone:1})}}
  if(k==='spikes'){ // Bone Venerable: spikes erupt in a line toward the hero
    const a=Math.atan2(P.y-B.y,P.x-B.x);for(let i=1;i<=8;i++)later(i*.13,()=>{if(B.dead)return;hazard(clamp(B.x+Math.cos(a)*i*42,30,W-30),clamp(B.y+Math.sin(a)*i*42,30,H-30),24,.5,.6,18*(1+B.n*.3),0,'#f4efe0')})}
  if(k==='hellring'){ // Nine Hells: ring of fire with one gap
    const gap=rnd(TAU);for(let i=0;i<12;i++){const a=i/12*TAU;if(Math.abs(((a-gap+Math.PI)%TAU+TAU)%TAU-Math.PI)<.5)continue;hazard(clamp(P.x+Math.cos(a)*95,30,W-30),clamp(P.y+Math.sin(a)*95,30,H-30),34,1.4,5,12*(1+B.n*.3),10,'#ff6a2a')}}
  if(k==='meteor'){ // Nine Hells: huge delayed strike on the hero's position
    hazard(P.x,P.y,90,1.6,.4,40*(1+B.n*.3),0,'#b57cf0');later(1.6,()=>{if(!B.dead){trauma(.7);shock(P.x,P.y,220,.05)}})}
  if(k==='mirror'){ // Enchantress: three illusions that hit hard but shatter fast
    for(let i=0;i<3;i++){const a=rnd(TAU),x=clamp(B.x+Math.cos(a)*60,30,W-30),y=clamp(B.y+Math.sin(a)*60,30,H-30);spawnEnemy('giant',x,y,.5,true);const e=G.en[G.en.length-1];if(e){e.hp=e.maxHp=Math.round(B.maxHp*.02);e.illusion=1;e.tint='#ff5fe8';e.spd*=1.6;e.sc=1.6;e.xp=6}ring(x,y,30,'#ff5fe8')}}
  if(k==='bewitch'){ // Enchantress: a pink ring - if it reaches you, your controls reverse for 2.5 s
    G.novas.push({x:B.x,y:B.y,r:10,R:300,v:170,d:6,confuse:2.5,col:'#ff5fe8'});ring(B.x,B.y,40,'#ff5fe8');trauma(.2)}
  if(k==='phalanx'){ // Iron General: a wall of armoured soldiers between him and the hero
    const a=Math.atan2(P.y-B.y,P.x-B.x),mx=(B.x+P.x)/2,my=(B.y+P.y)/2;for(let i=-3;i<=3;i++){const x=clamp(mx+Math.cos(a+Math.PI/2)*i*26,30,W-30),y=clamp(my+Math.sin(a+Math.PI/2)*i*26,30,H-30);spawnEnemy('bandit',x,y,1.2);const e=G.en[G.en.length-1];if(e){e.affix='armor';e.hp*=2;e.maxHp*=2;e.spd*=.6}ring(x,y,16,'#c0c8d0')}}
  if(k==='cannon'){ // Iron General: three volleys land on where you were
    for(let i=0;i<3;i++)later(i*.55,()=>{if(B.dead)return;hazard(P.x,P.y,46,.9,.3,22*(1+B.n*.3),0,'#c0c8d0');ring(B.x,B.y,30,'#c0c8d0');trauma(.15)})}
  if(k==='nova'){G.novas.push({x:B.x,y:B.y,r:10,R:260+B.n*30,v:150+B.n*15,d:18*(1+B.n*.3)});ring(B.x,B.y,40,'#ff2a3a');trauma(.3)}
  if(k==='radial'){const n=low?28:20,o=rnd(TAU);for(let i=0;i<n;i++){const a=o+i/n*TAU;bullet(B.x,B.y,a,82,12)}
    if(low)later(.5,()=>{if(B.dead)return;for(let i=0;i<n;i++){const a=o+.1+i/n*TAU;bullet(B.x,B.y,a,66,12)}})}
  if(k==='aimed'){for(let w=0;w<3;w++)later(w*.28,()=>{if(B.dead)return;const a=Math.atan2(P.y-B.y,P.x-B.x);for(let i=-2;i<=2;i++)bullet(B.x,B.y,a+i*.16,124,10)})}
  if(k==='charge'){B.tele=.8;B.tx=P.x;B.ty=P.y}
  if(k==='summon'){for(let i=0;i<14;i++){const a=i/14*TAU;spawnEnemy('assassin',clamp(B.x+Math.cos(a)*40,30,W-30),clamp(B.y+Math.sin(a)*40,30,H-30),.7)}ring(B.x,B.y,50,'#ff6a6a')}
  if(typeof SFX!=='undefined')SFX.bossAttack(k);
}
function hazard(x,y,r,tele,dur,burst,dps,col){if(G.hazards.length>70)G.hazards.shift();G.hazards.push({x,y,r,tele,T:tele,dur,burst,dps,col,tk:0})}
function hazardTick(dt){
  const P=G.P;
  for(const h of G.hazards){
    if(h.tele>0){h.tele-=dt;if(h.tele<=0){ring(h.x,h.y,h.r,h.col);if(P.down<=0&&hyp(P.x-h.x,P.y-h.y)<h.r+6){if(P.dash>0)parry();dmgP(h.burst,h.x,h.y,['首领地面攻击','boss ground attack'])}if(typeof SFX!=='undefined')SFX.bossAttack('radial')}continue}
    h.dur-=dt;if(h.dps>0){h.tk-=dt;if(h.tk<=0&&P.down<=0&&hyp(P.x-h.x,P.y-h.y)<h.r+4){h.tk=.5;dmgP(h.dps*.5,h.x,h.y,['首领毒雾/烈焰','boss hazard'])}}
  }
  G.hazards=G.hazards.filter(h=>h.tele>0||h.dur>0);
  const B=G.boss;if(B&&!B.dead){
    if(B.hide>0)B.hide-=dt;
    if(B.exposed>0)B.exposed-=dt;
    {const fd=G.t-(B.t0||G.t);B.tired=fd>60?Math.min(2.5,1+(fd-60)*.05):0;if(B.tired&&!B.tiredSaid){B.tiredSaid=1;showBanner('首领力竭:受到的伤害逐渐增加','The boss tires: it takes more damage each second',1.6)}}
    if(B.drain>0){B.drain-=dt;const d=hyp(P.x-B.x,P.y-B.y);if(d>=230&&!B.drainOut){B.drainOut=1;showBanner('已脱离吸血范围','Out of the drain',.8)}if(B.drain<=0&&d>=230&&!B.drainHit){B.exposed=3;showBanner('破绽!全力输出','OPENING - hit him now!',1.4);ring(B.x,B.y,70,'#ffd27a');trauma(.2);if(typeof SFX!=='undefined')SFX.levelup()}if(d<230&&P.down<=0){B.drainHit=1;const hb=B.hp;B.hp=Math.min(B.maxHp,B.hp+B.maxHp*.025*dt);/* 2.5%/s while you stand in the drain: a lesson, not a full reset */B.healed=(B.healed||0)+(B.hp-hb);B.healDrain=(B.healDrain||0)+(B.hp-hb);if(B.healed>=200&&G.floats.length<80){G.floats.push({x:B.x,y:B.y-30,t:.9,v:'+'+Math.round(B.healed),c:'#7dffb0'});B.healed=0}if(SIMR()<dt*6)dmgP(2,B.x,B.y,['吸血','leech beam']);G.fx.push({k:'p',x:P.x+rnd(-8,8),y:P.y+rnd(-8,8),h:6,vx:(B.x-P.x)*1.4,vy:(B.y-P.y)*1.4,vz:0,t:.5,T:.5,c:'#ff2a3a'})}}
  }
}
function parry(){const P=G.P;G.dodges=(G.dodges||0)+1;if(P.parryCd>0)return;P.parryCd=6;P.parry=4;const B=G.boss;if(B&&!B.dead&&hyp(B.x-P.x,B.y-P.y)<260){B.exposed=Math.max(B.exposed||0,2.2);ring(B.x,B.y,60,'#ffd27a');showBanner('破招!首领露出破绽','PARRY - the boss is open',1)}else showBanner('破招!下一式威力大增','PARRY - next skill empowered',1);ring(P.x,P.y,40,'#ffd27a');trauma(.25);G.slow=Math.max(G.slow,.25);if(typeof SFX!=='undefined')SFX.block()}
function bullet(x,y,a,v,d,arrow){if(G.bullets.length<CAP.bu)G.bullets.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:5,d,boss:arrow?0:1})}

/* ---------- step ---------- */
function step(dt){
  const P=G.P;G.t+=dt;{const vx=(P.x-(P.px===undefined?P.x:P.px))/dt,vy=(P.y-(P.py===undefined?P.y:P.py))/dt;P.vx=(P.vx||0)*.7+vx*.3;P.vy=(P.vy||0)*.7+vy*.3;P.px=P.x;P.py=P.y}if(typeof directorTick==='function')directorTick(dt);if(typeof extTick==='function')extTick(dt);{G.dpsT=(G.dpsT||0)+dt;if(G.dpsT>=1){G.dpsT-=1;const d=(G.dealt||0)-(G.dealtLast||0);G.dealtLast=G.dealt||0;G.dpsHist=(G.dpsHist||[]).concat([d]).slice(-20);G.dpsAvg=G.dpsHist.reduce((a,b)=>a+b,0)/G.dpsHist.length}} // rolling 20 s damage output: the first boss and the warlords are sized from it
  if(RIVAL_ON&&G.rival&&G.t+(G.pickWall||0)>=(G.quick?180:PK_LEN)&&!G.over)pkEnd();
  if(G.room&&typeof roomNetTick==='function')roomNetTick(dt);
  for(let i=G.later.length-1;i>=0;i--){const l=G.later[i];l.t-=dt;if(l.t<=0){G.later.splice(i,1);l.f()}}
  if(G.cores===0){G.coreT+=dt;if(G.coreT>=70){G.coreT=0;G.cores=1;updateCores()}}else G.coreT=0;
  G.grid.clear();
  for(const e of G.en){if(e.dead)continue;const k=gridOf(e);let a=G.grid.get(k);if(!a)G.grid.set(k,a=[]);a.push(e)}
  // player
  P.inv=Math.max(0,P.inv-dt);P.dashCd=Math.max(0,P.dashCd-dt);if(P.parryCd>0)P.parryCd-=dt;
  P.mana=Math.min(P.maxMana,P.mana+P.regen*dt);
  for(const s of G.spells)s.cd=Math.max(0,s.cd-dt*(P.buff&&P.buff.k==='haste'?2:1)*(G.over9?1.3:1));
  comboTick(dt);chestTick(dt);if(!G.auto&&(G.t|0)%2===0&&G.t-Math.floor(G.t)<dt)checkAch();
  if(hasR('pill'))heal(dt);
  for(const f of G.fx){if(f.k==='relic'&&P.down<=0&&hyp(f.x-P.x,f.y-P.y)<18){if(RELICS[f.id].cursed){f.hold=(f.hold||0)+dt;if(f.hold<1.1)continue}f.t=0;takeRelic(f.id)}else if(f.k==='relic'&&f.hold)f.hold=Math.max(0,f.hold-dt*2)}
  hazardTick(dt);
  if(G.P.burnT>0){G.P.burnT-=dt;G.P.btk=(G.P.btk||0)-dt;if(G.P.btk<=0){G.P.btk=.5;dmgP(G.P.burnD,G.P.x,G.P.y,['火煞灼烧','burning']);G.P.inv=0}}if(G.P.chillT>0)G.P.chillT-=dt;
  {const mk=Math.floor(G.t/300);if(mk>=2&&mk>(G.mkDone||1)&&!G.boss&&!BOSSRUSH&&!G.mirror&&!G.trib&&G.P.down<=0){G.mkDone=mk;G.trib={t:40,n:mk,next:1.5,hp0:G.dmgTaken,k:0};G.tribN=(G.tribN||0)+1;showBanner(`天劫 · ${mk*5} 分钟`,`Tribulation · ${mk*5} min: hold for 40 s`,2.4);trauma(.5);G.slow=Math.max(G.slow,.4);if(typeof SFX!=='undefined')SFX.bossIn()}
   if(G.trib){const T=G.trib;T.t-=dt;T.next-=dt;if(T.next<=0&&G.en.length<CAP.en){T.next=Math.max(1.4,4.2-T.n*.25);const o=edgePoint(),ty=pick(['giant','archer','bomber','brute','wraith','bandit']);spawnEnemy(ty,o.x,o.y,(1.6+T.n*.5)*Math.sqrt(G.bossK||1),true);const e=G.en[G.en.length-1];e.trib=1;e.sc=1.5;e.spd*=1.1;e.hp=e.maxHp=Math.max(e.hp,powerHp(2.2));T.k++}
     if(T.t<=0){G.trib=null;G.tribWon=(G.tribWon||0)+1;const P=G.P;G.chests.push({x:clamp(P.x+rnd(-50,50),60,W-60),y:clamp(P.y+rnd(-50,50),60,H-60),t:0,kind:T.n>=6?'gold':undefined});G.picks.push({kind:'level',forceQ:T.n>=6?'legendary':'epic'});G.pickHold=1.2;G.goldRun+=60+T.n*10;showBanner('渡劫成功',`Tribulation survived · ${T.n>=6?'legendary':'epic'} card + chest`,2.4);G.flash=.6;if(typeof SFX!=='undefined')SFX.win()}}}
  if(!G.doomWarned&&G.t>=DOOM_T){G.doomWarned=1;showBanner('怨气弥漫:此后敌人每分钟更凶狠','Dread rises: enemies hit harder every minute from here',3.5);if(typeof SFX!=='undefined')SFX.roar()}
  if(G.pickHold>0){G.pickHold-=dt;if(G.pickHold<=0&&G.picks.length&&!G.pick&&typeof openPick==='function')openPick()}
  if(P.parry>0)P.parry-=dt;
  for(const w of G.pwaves){const was=w.r;w.r+=w.v*dt;near(w.x,w.y,w.r+20,e=>{if(w.hit.has(e))return;const dx=e.x-w.x,dy=e.y-w.y,d=hyp(dx,dy)||1;if(d>=was-10&&d<=w.r+e.r){w.hit.add(e);hit(e,w.d,w.s,false,undefined,dx/d*w.knock,dy/d*w.knock);if(nd(w.s,'chain')&&SIMR()<NODE_FX.chain*nd(w.s,'chain')*.4&&G.pwaves.length<12)G.pwaves.push({x:e.x,y:e.y,r:4,R:50,v:260,d:w.d*.5,s:w.s,hit:new Set([e]),knock:w.knock*.5,col:w.col})}})}
  G.pwaves=G.pwaves.filter(w=>w.r<w.R);
  for(const sp of G.spells)if(sp.beam){sp.beam.t-=dt;if(sp.beam.t<=0)sp.beam=null}
  for(const nv of G.novas){const was=nv.r;nv.r+=nv.v*dt;const d=hyp(P.x-nv.x,P.y-nv.y);if(P.down<=0&&d>=was-8&&d<=nv.r+8&&!nv.hitP){nv.hitP=1;if(P.dash>0)parry();if(P.dash<=0&&P.inv<=0){dmgP(nv.d,nv.x+(nv.x-P.x),nv.y+(nv.y-P.y),['首领波纹','boss nova']);if(nv.confuse){P.confuse=nv.confuse;showBanner('神志颠倒','Bewitched: controls reversed',1.2)}}}}
  G.novas=G.novas.filter(nv=>nv.r<nv.R);
  if(false&&!G.auto&&SAVE_FIRST){G.hintT-=dt;if(G.hintT<=0&&G.hintN<4){const T=typeof IS_TOUCH!=='undefined'&&IS_TOUCH,H=T?[['拖动移动','Drag to move'],['点图标释放武学','Tap a skill to cast it'],['点「轻」闪避','Tap the big button to dash'],['升级时三选一','Pick one of three cards on each level']]:[['WASD 移动','Move with WASD or arrows'],['按 1 释放武学','Press 1 to cast your skill (costs qi)'],['Space 轻功闪避','Space dashes through enemies'],['升级时三选一','Pick one of three cards on each level']];showBanner(H[G.hintN][0],H[G.hintN][1],2.2);G.hintN++;G.hintT=G.hintN===1?6:9}}
  if(P.down>0){P.down-=dt;if(P.down<=0)revive()}
  else if(P.dash>0){
    P.dash-=dt;const sp=P.leap?600:560;P.x+=P.dx*sp*dt;P.y+=P.dy*sp*dt;collide(P,6);P.walk+=dt*20;
    if(P.dash<=0&&P.leap){const s=P.leap,st=stat(s);P.leap=null;const R=46*(st.gi?1.3:1)*st.size;aoe(P.x,P.y,R,(s.id==='tiger'?26+s.lv*1.1:34+s.lv*1.5)*st.m,s,s.els[0]?ELS[s.els[0]].col:SPELLS[s.id].col,false,{});hitStop(.05);
      if(s.id==='tiger'){near(P.x,P.y,R+20,e=>{if(e.type!=='boss'&&e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<R+e.r+10)e.frz=Math.max(e.frz||0,1.2+st.dur)});shock(P.x,P.y,200,.04);trauma(.3);if(nd(s,'chain')&&SIMR()<NODE_FX.chain*nd(s,'chain')*2&&countNear(P.x,P.y,200)>3)later(.3,()=>{if(!G.over&&P.down<=0){P.mana+=skillCost(s);castSkill(G.spells.indexOf(s))}})}}
    P.ghostT-=dt;if(P.ghostT<=0){P.ghostT=.028;if(G.ghosts.length<14)G.ghosts.push({x:P.x,y:P.y,yaw:P.yaw,t:.32,T:.32})}
    near(P.x,P.y,26,e=>{if(e.type==='statue'||P.dashHit.has(e))return;if(hyp(e.x-P.x,e.y-P.y)<e.r+12){P.dashHit.add(e);if(P.flashS){const fs=P.flashS,fst=stat(fs);hit(e,(26+fs.lv*1.3)*fst.m,fs,false,SPELLS.flash.col,P.dx*90,P.dy*90)}else hit(e,12*P.dmg,null,true,'#bff4ff',P.dx*150,P.dy*150)}});
    if(P.dash<=0&&P.flashS&&typeof flashEnd==='function')flashEnd();
  }else{
    let v=G.auto?autopilot():input();if(P.confuse>0){P.confuse-=dt;v={x:-v.x,y:-v.y}}
    if(v.x||v.y){const l=hyp(v.x,v.y)||1,m=Math.min(1,l),s=92*P.spd*(P.buff&&P.buff.k==='spd'?1.35:1)*(G.over9?1.12:1)*(P.frenzy>0?1.25:1)*(P.dance>0?1.4:1)*(P.chillT>0?.6:1)*m;P.x+=v.x/l*s*dt;P.y+=v.y/l*s*dt;P.walk+=dt*8;P.dx=v.x/l;P.dy=v.y/l;collide(P,6)}
    const main=G.spells[0];if(main&&main.cd<=0&&!autoFire(main))main.cd=.08;
    P.shield=Math.max(0,P.shield-dt);
    if(G.auto)autoCast();
    if(G.auto&&P.dashCd<=0&&SIMR()<.015)dash();
  }
  orbits(dt);
  for(const g of G.ghosts)g.t-=dt;G.ghosts=G.ghosts.filter(g=>g.t>0);
  if(!G.mirror){spawnTick(dt);bossAI(dt)}shrineTick(dt);rivalTick(dt);
  if(!G.mission){if(!G.boss){G.missionT-=dt;if(G.missionT<=0)startMission()}}
  else{const m=G.mission;m.t-=dt;
    if(m.k==='seal'){const inside=hyp(P.x-m.x,P.y-m.y)<m.r;if(inside&&P.down<=0){m.n-=dt;m.pulse+=dt;if(m.pulse>1.2){m.pulse=0;spawnTick(0);for(let i=0;i<4;i++){const a=rnd(TAU);spawnEnemy('assassin',clamp(m.x+Math.cos(a)*220,30,W-30),clamp(m.y+Math.sin(a)*220,30,H-30),.8)}ring(m.x,m.y,m.r,'#ff5fe8')}if(m.n<=0){m.n=0;checkMission()}}}
    if(m.k==='hunt'&&m.target){const e=m.target;if(e.dead){m.n=0;checkMission()}else{const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d<260){e.flee=1;e.fx=dx/d;e.fy=dy/d}else e.flee=0}}
    if(m.k==='mush'){for(let i=G.mush.length-1;i>=0;i--){const o=G.mush[i];if(hyp(o.x-P.x,o.y-P.y)<16){G.mush.splice(i,1);m.n--;spark(o.x,o.y,'#ff8a5a',8);if(typeof SFX!=='undefined')SFX.pick(1);checkMission();if(!G.mission)break}}}
    if(G.mission&&m.t<=0){G.mission=null;G.missionT=35;G.mush=[];G.en.forEach(e=>{if(e.type==='statue')e.dead=1;if(e.marked){e.marked=0;e.flee=0}});const part=10+Math.floor(G.t/60)*2;G.goldRun+=part;gainXP(Math.max(4,G.need*.15));showBanner(`密令失败 · 保留 ${part} 金与少量经验`,`Mission failed · ${part} gold and a little XP kept`,1.2)}
  }
  // enemies
  if(G.mirror)mirrorTick(dt);else for(const e of G.en){
    if(e.dead)continue;
    e.flash=Math.max(0,(e.flash||0)-dt);e.orbT=(e.orbT||0)-dt;e.frz=Math.max(0,(e.frz||0)-dt);e.slow=Math.max(0,(e.slow||0)-dt);e.shred=Math.max(0,(e.shred||0)-dt);
    if(e.burn>0){e.burn-=dt;e.btk=(e.btk||0)-dt;if(e.btk<=0){e.btk=.5;hit(e,e.burnD*.5,e.burnS,true,'#ff8a3c');if(e.dead)continue}}
    if(e.pois>0){e.poisT-=dt;e.ptk=(e.ptk||0)-dt;if(e.ptk<=0){e.ptk=.6;hit(e,e.poisD*e.pois*.5,e.poisS,true,'#9ff06a');if(e.dead)continue}if(e.poisT<=0)e.pois=0}
    if(e.sleep>0){e.sleep-=dt;if(e.sleep<=0&&e.sleepS&&nd(e.sleepS,'chain')&&SIMR()<NODE_FX.chain*nd(e.sleepS,'chain')*2)aoe(e.x,e.y,30,20*stat(e.sleepS).m,e.sleepS,SPELLS.numb.col,false,{quiet:1});continue}
    if(e.kx||e.ky){e.x+=e.kx*dt;e.y+=e.ky*dt;const f=Math.exp(-8*dt);e.kx*=f;e.ky*=f;if(Math.abs(e.kx)<2&&Math.abs(e.ky)<2){e.kx=e.ky=0}collide(e,e.r)}
    if(e.type==='statue')continue;
    if(e.type==='boss'&&(e.tele>0||e.charge>0)){if(hyp(e.x-P.x,e.y-P.y)<e.r+6&&e.charge>0)dmgP(26,e.x,e.y,['首领冲撞','boss charge']);continue}
    if(e.frz>0)continue;
    if(e.charm>0&&typeof charmTick==='function'){charmTick(e,dt);continue}
    if(e.role==='charger'){e.ct-=dt;const dP=hyp(P.x-e.x,P.y-e.y);
      if(e.cs>0){e.cs-=dt;e.x+=e.cvx*dt;e.y+=e.cvy*dt;collide(e,e.r);if(P.down<=0&&dP<e.r+7){if(P.dash>0)parry();else dmgP(e.dmg*2.5*(1+Math.max(0,G.t-600)/900),e.x,e.y,srcName(e))}if(e.cs<=0){ring(e.x,e.y,20,'#ff9c5a');e.ct=rnd(2.5,4)}continue}
      if(e.cw>0){e.cw-=dt;if(e.cw<=0){const a=Math.atan2(e.ty-e.y,e.tx-e.x);e.cvx=Math.cos(a)*330;e.cvy=Math.sin(a)*330;e.cs=.45;if(typeof SFX!=='undefined')SFX.bossCharge()}continue}
      if(e.ct<=0&&dP<180&&dP>40){e.cw=.6;e.tx=P.x;e.ty=P.y;continue}}
    if(e.role==='shaman'){e.ht=(e.ht||0)-dt;if(e.ht<=0){e.ht=1.2;near(e.x,e.y,70,o=>{if(o!==e&&o.type!=='statue'&&o.hp<o.maxHp){const big=o.type==='boss'||o.warlord;if(big){if(G.t-(o.shamT||-9)>1.1){o.shamT=G.t;o.shamN=0}o.shamN++;if(o.shamN>2)return}const hb=o.hp;o.hp=Math.min(o.maxHp,o.hp+o.maxHp*(big?.012:.08));o.healed=.4;if(big){o.healWiz=(o.healWiz||0)+(o.hp-hb);o.healLine={x:e.x,y:e.y,t:.6}}}});ring(e.x,e.y,60,'#7fc98a')}}
    const R=G.rival,useR=R&&R.down<=0&&hyp(R.x-e.x,R.y-e.y)<hyp(P.x-e.x,P.y-e.y)*.85,RT=G.shared?arenaNear(e,useR?hyp(R.x-e.x,R.y-e.y):hyp(P.x-e.x,P.y-e.y)*(P.down>0?9:1)):null,T=RT||(useR?R:P);
    let dx=T.x-e.x,dy=T.y-e.y,d=hyp(dx,dy)||1,sp=e.spd*(e.slow>0?.62:1);
    let ax=dx/d,ay=dy/d;
    if(e.role==='shaman'&&d<160){ax=-ax*.5;ay=-ay*.5}
    if(e.shoot){ if(d<140){ax=-ax*.3;ay=-ay*.3}
      e.st-=dt;if(e.st<=0&&d<230){e.st=rnd(2.2,3.4)-.6*clamp((G.t-480)/600,0,1);if(e.bomb){hazard(T.x+rnd(-14,14),T.y+rnd(-14,14),26,1.0,.2,14*dodgeDmg(G.t),0,'#ff6a2a');if(typeof SFX!=='undefined')SFX.throw()}else{const lateR=clamp((G.t-480)/600,0,1),v=84+56*lateR;let ax2=dx,ay2=dy;if(lateR>0){const tt=d/v;ax2=T.x+(T.vx||0)*tt*lateR-e.x;ay2=T.y+(T.vy||0)*tt*lateR-e.y} // from 8 minutes archers shoot faster and lead a running target
        bullet(e.x,e.y,Math.atan2(ay2,ax2),v,8*dodgeDmg(G.t),1);if(typeof SFX!=='undefined')SFX.arrow()}}}
    let sx=0,sy=0,cnt=0;
    near(e.x,e.y,e.r+8,o=>{if(o===e||o.type==='statue')return;const ox=e.x-o.x,oy=e.y-o.y,dd=hyp(ox,oy)||.01,m=e.r+o.r;if(dd<m){sx+=ox/dd*(m-dd);sy+=oy/dd*(m-dd);if(++cnt>6)return false}});
    e.x+=(ax*sp+sx*7)*dt;e.y+=(ay*sp+sy*7)*dt;e.fr+=dt*(3+sp*.07);
    if(e.flee){e.x+=e.fx*e.spd*1.6*dt;e.y+=e.fy*e.spd*1.6*dt;e.x=clamp(e.x,30,W-30);e.y=clamp(e.y,30,H-30)}
    if(!e.ghost)collide(e,e.r);
    if(RT){}else if(useR){if(d<e.r+6)rivalHurt(e.dmg,e.x,e.y)}else if(P.down<=0&&d<e.r+6){dmgP(e.dmg,e.x,e.y,srcName(e));const b=ETYPES[e.type]||{};if(b.burn){P.burnT=1.5;P.burnD=e.dmg*.15}if(b.chill)P.chillT=1.2}
    if(!useR&&R&&R.down<=0&&hyp(R.x-e.x,R.y-e.y)<e.r+6)rivalHurt(e.dmg*.5,e.x,e.y);
  }
  G.en=G.en.filter(e=>!e.dead);
  if(G.boss&&G.boss.dead)G.boss=null;
  // shots
  for(const b of G.shots){
    if(b.home){const t=nearest(b.x,b.y,140,true);if(t){const a=Math.atan2(b.vy,b.vx),ta=Math.atan2(t.y-b.y,t.x-b.x);let d=ta-a;d=Math.atan2(Math.sin(d),Math.cos(d));const na=a+clamp(d,-4.5*dt,4.5*dt),v=hyp(b.vx,b.vy);b.vx=Math.cos(na)*v;b.vy=Math.sin(na)*v}}
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;b.spin+=dt*12;if(b.zap&&typeof heroZap==='function')heroZap(b,dt);
    if(b.x<20||b.y<20||b.x>W-20||b.y>H-20||blocked(b.x,b.y)){b.life=0;spark(b.x,b.y,b.col,3,40);continue}
    near(b.x,b.y,b.r+22,e=>{
      if(b.life<=0||b.hitSet.has(e))return;
      if(hyp(e.x-b.x,e.y-b.y)<e.r+b.r){
        b.hitSet.add(e);const vl=hyp(b.vx,b.vy)||1;hit(e,b.d,b.s,false,b.col,b.vx/vl*b.knock,b.vy/vl*b.knock);if(b.slow){if(!(e.slow>0)&&b.s)b.s.ctrl=(b.s.ctrl||0)+1;e.slow=Math.max(e.slow||0,b.slow)}if(b.pois)poison(e,b.pois*3.5,b.s,1);spark(b.x,b.y,b.col,3,60,{dir:Math.atan2(b.vy,b.vx)});
        if(b.boom){const bx=b.x,by=b.y,bs=b.s,bd=b.d,bc=b.col;later(0,()=>{near(bx,by,32,o=>{if(o!==e&&hyp(o.x-bx,o.y-by)<20+o.r)hit(o,bd*.6,bs,false,bc,(o.x-bx)*3,(o.y-by)*3)});ring(bx,by,22,bc)})}
        if(b.charm&&typeof heroCharm==='function')heroCharm(e,b.charm,b.s);if(b.blast&&typeof heroBlast==='function'){heroBlast(b,e);b.life=0;return false}
        if(b.split){const a=Math.atan2(b.vy,b.vx);for(const off of [-.7,.7])shoot(b.x,b.y,a+off,b.s,b.d*.55,{v:200,life:.35,nosplit:true,small:1,hitSet:new Set([e]),pois:b.pois,slow:b.slow,home:b.home})}
        if(b.pierce>0)b.pierce--;else b.life=0;
        if(b.life<=0)return false;
      }
    });
  }
  G.shots=G.shots.filter(b=>b.life>0);
  for(const b of G.bombs){b.t+=dt;if(b.t>=b.T){b.dead=1;if(b.mist){const st=stat(b.s);aoe(b.x,b.y,b.r,b.d,b.s,SPELLS.pouch.col,false,{quiet:1});pool(b.x,b.y,b.r,b.mist,b.d*.9,b.s,{poisMist:1,zap:nd(b.s,'chain')>0});near(b.x,b.y,b.r+10,e=>{if(hyp(e.x-b.x,e.y-b.y)<b.r+e.r)poison(e,3*st.m,b.s,1)});ring(b.x,b.y,b.r,'#9ff06a');if(typeof SFX!=='undefined')SFX.throw();if(b.split)for(let i=0;i<2;i++){const a=i*Math.PI+rnd(.8);lob(b.x,b.y,b.x+Math.cos(a)*44,b.y+Math.sin(a)*44,b.s,b.d*.45,b.r*.55,false,{mist:b.mist*.6,pois:1})}continue}
    aoe(b.x,b.y,b.r,b.d,b.s,b.s.els[0]?ELS[b.s.els[0]].col:'#ffd75a',false,{thunder:1});
    if(b.split)for(let i=0;i<3;i++){const a=i/3*TAU+rnd(.5);lob(b.x,b.y,b.x+Math.cos(a)*40,b.y+Math.sin(a)*40,b.s,b.d*.45,b.r*.55,false)}}}
  G.bombs=G.bombs.filter(b=>!b.dead);
  for(const p of G.pools){p.t-=dt;p.tk-=dt;if(p.tk<=0){p.tk=.3;
      near(p.x,p.y,p.r+10,e=>{if(hyp(e.x-p.x,e.y-p.y)<p.r+e.r){hit(e,p.dps*.3,p.s,true,p.col);if(p.slow)e.slow=.8;if(p.zap&&SIMR()<.2)arc(e,p.dps,p.s,1)}});
    }
  }
  G.pools=G.pools.filter(p=>p.t>0);
  for(const b of G.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(P.dash>0&&!b.parried&&hyp(b.x-P.x,b.y-P.y+4)<16){b.parried=1;if(b.boss)parry();else{b.life=0;spark(b.x,b.y,'#ffd27a',4,60);if(P.parryCd<=0&&SIMR()<.25)parry()}}
    if(P.down<=0&&hyp(b.x-P.x,b.y-P.y+4)<7){dmgP(b.d,b.x-b.vx,b.y-b.vy,b.bone?['骨墙','bone wall']:b.boss?['首领飞刃','boss projectile']:['弓箭','arrow']);b.life=0}
    if(G.rival&&G.rival.down<=0&&hyp(b.x-G.rival.x,b.y-G.rival.y+4)<7){rivalHurt(b.d);b.life=0}
    if(b.x<20||b.y<20||b.x>W-20||b.y>H-20||blocked(b.x,b.y))b.life=0;}
  G.bullets=G.bullets.filter(b=>b.life>0);
  const mag=52*P.mag*(G.t<120?1.8:G.t<240?1.3:1);
  for(const g of G.gems){const d=hyp(g.x-P.x,g.y-P.y);
    if(g.pull||d<mag){g.pull=1;const s=180+(40-Math.min(d,40))*4;g.x+=(P.x-g.x)/(d||1)*s*dt;g.y+=(P.y-g.y)/(d||1)*s*dt;
      if(d<8){g.dead=1;gainXP(g.v*comboMult()*.6);if(typeof SFX!=='undefined'&&!G.auto)SFX.pick(0)}}}
  G.gems=G.gems.filter(g=>!g.dead);
  for(const f of G.fx){f.t-=dt;
    if(f.k==='p'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.95;f.vy*=.95;if(f.h!==undefined){f.h+=(f.vh||0)*dt;if(f.g)f.vh-=170*dt;if(f.h<.6){f.h=.6;f.vh=-(f.vh||0)*.3}}}
    if(f.k==='die'){f.x+=f.kx*dt;f.y+=f.ky*dt;f.kx*=.96;f.ky*=.96;f.h+=f.vh*dt;f.vh-=380*dt;f.rot+=f.rv*dt;if(f.h<0){f.h=0;f.vh=-f.vh*.25;f.rv*=.5}}
  }
  G.fx=G.fx.filter(f=>f.t>0);
  for(const f of G.floats){f.t-=dt;f.y-=16*dt}G.floats=G.floats.filter(f=>f.t>0);
  for(const e of G.en){if(e.sq>0)e.sq-=dt*3}
  for(const a of G.arcs)a.t-=dt;G.arcs=G.arcs.filter(a=>a.t>0);
  for(const s of G.shocks)s.t+=dt;G.shocks=G.shocks.filter(s=>s.t<s.T);
  if(G.shared){if(ARENA.host)arenaHostTick(dt);else if(G.mirror)arenaGuestTick(dt)}
}

/* ---------- title-screen pilot ---------- */
function autopilot(){
  const P=G.P;let x=0,y=0;
  for(const e of G.en){if(e.type==='statue')continue;const d=hyp(e.x-P.x,e.y-P.y);if(d<80){const w=(80-d)/80*(e.type==='boss'?4:1.2);x-=(e.x-P.x)/(d||1)*w;y-=(e.y-P.y)/(d||1)*w}}
  for(const b of G.bullets){const d=hyp(b.x-P.x,b.y-P.y);if(d<40){x-=(b.x-P.x)/(d||1)*1.6;y-=(b.y-P.y)/(d||1)*1.6}}
  let tgt=null,bd=240;for(const g of G.gems){const d=hyp(g.x-P.x,g.y-P.y);if(d<bd){bd=d;tgt=g}}
  if(tgt){x+=(tgt.x-P.x)/(bd||1)*.5;y+=(tgt.y-P.y)/(bd||1)*.5}
  if(G.mush.length){const m=G.mush[0],d=hyp(m.x-P.x,m.y-P.y)||1;x+=(m.x-P.x)/d*.9;y+=(m.y-P.y)/d*.9}
  const cx=W/2-P.x,cy=H/2-P.y,cd=hyp(cx,cy)||1;x+=cx/cd*(cd/700);y+=cy/cd*(cd/700);
  return {x,y};
}
function unlock(id){if(G.auto||!window.SAVE||SAVE.ach[id])return;const a=ACH.find(a=>a.id===id);if(!a)return;SAVE.ach[id]=true;SAVE.gold+=a.gold;persist();later(.3,()=>showBanner('成就:'+a.zh+' +'+a.gold+' 金',`Achievement: ${a.en} · +${a.gold} gold`,2.2));if(typeof SFX!=='undefined')SFX.complete()}
function checkAch(){if(G.auto)return;if(G.bossSlain>=1)unlock('boss1');if(G.bossSlain>=2)unlock('boss2');if(G.bossSlain>=4)unlock('boss4');if(G.comboMax>=100)unlock('combo100');if(G.comboMax>=200)unlock('combo200');if(G.t>=600)unlock('min10');if(G.t>=1200)unlock('min20');if(G.relics.length>=6)unlock('relic6');if(G.bossSlain>=1&&(typeof ASURA_T!=='undefined'&&ASURA_T>=5))unlock('hard');
  if(G.bossSlain>=1){SAVE.clsWins=SAVE.clsWins||{};if(!SAVE.clsWins[G.cls]){SAVE.clsWins[G.cls]=true;persist()}if(Object.keys(CLASSES).every(k=>SAVE.clsWins[k]))unlock('allcls')}}
function bossSlain(e){
  {const dur=G.t-(e.t0||G.t),k0=G.bossK||1;G.bossK=clamp(k0*clamp(30/Math.max(2,dur),.75,3.5),1,1e4);G.bossDur=dur;G.bossDurs=(G.bossDurs||[]).concat([Math.round(dur)]);G.bossRef={dps:e.maxHp/Math.max(1.5,dur),pow:powerIdx(),corr:clamp(35/Math.max(10,dur),.5,1)}} // a fight that dragged makes the next boss smaller, whatever the power index says // the next boss scales to how fast this one fell: a 30 s duel, never a 2 s speed bump
  const cr=!G.creditOff;if(cr){G.bossSlain++;G.rerolls+=2}G.bossN++;G.boss=null;if(cr&&!G.auto&&!BOSSRUSH&&!RIVAL_ON&&!G.room&&G.bossN%BOSSES.length===0){G.picks.push({kind:'ascend',cyc:G.bossN/BOSSES.length});G.pickHold=2.6}if(cr&&G.room)roomSendWave(12,true);if(cr)G.goldRun+=(100+G.bossN*50)*((G.ev&&G.ev.bossGold)||1);
  if(!cr){G.bullets=[];if(!G.auto)$('#bossbar').hidden=true;return}
  G.chests.push({x:e.x,y:e.y,t:0});if(G.curse.bossLeg){G.picks.push({kind:'level',forceQ:'legendary'});G.pickHold=Math.max(G.pickHold||0,2.4)}for(let i=0;i<12;i++){const a=i/12*TAU;G.gems.push({x:e.x+Math.cos(a)*26,y:e.y+Math.sin(a)*26,v:6,big:1})}
  G.slow=Math.max(G.slow,1.2);G.flash=1;trauma(1);shock(e.x,e.y,520,.08,1.2);G.bullets=[];
  if(!G.auto){$('#bossbar').hidden=true;showBanner(e.name+'伏诛'+(G.bossDur<15?` · ${Math.round(G.bossDur)} 秒斩杀`:''),`${e.en} slain`+(G.bossDur<15?` in ${Math.round(G.bossDur)} s`:' · next boss in 4:00'),2.4);if(typeof SFX!=='undefined')SFX.win();if(window.desktop&&G.bossSlain===1)window.desktop.achievement('FIRST_VICTORY')}
}
function pkEnd(){if(G.auto||G.over)return;closeCards();G.over='pk';G.slow=1.2;G.flash=.6;trauma(.6);later(1.6,()=>showEnd(G.score>=G.rival.score));if(typeof SFX!=='undefined')SFX.win()}
function win(){if(G.auto)return;closeCards();G.over='win';G.slow=1.6;G.flash=1;trauma(1);shock(G.boss?G.boss.x:G.P.x,G.boss?G.boss.y:G.P.y,520,.08,1.2);later(2.2,()=>showEnd(true));G.bullets=[];G.en.forEach(e=>{if(e.type!=='boss')e.frz=99});showBanner('血魔伏诛','The Patriarch falls',1.8);if(typeof SFX!=='undefined')SFX.win();if(window.desktop)window.desktop.achievement('FIRST_VICTORY')}
function lose(){if(G.auto){newGame(true);demoBoost();return}closeCards();G.over='lose';if(G.room&&typeof roomOnDeath==='function')roomOnDeath();G.slow=1;later(1.2,()=>showEnd(false));if(typeof SFX!=='undefined')SFX.lose()}
/* how hard you hit right now, as one number; the last boss fight calibrates what that number means in HP per second */
function powerIdx(){const P=G.P;let m=0;G.spells.forEach((s,i)=>{const c=SKILL_CAT[s.id];if(c==='heal'||c==='defense')return;m+=stat(s).m*(i===0?1:.3)});return P.dmg*(1+P.dmgBonus)*(1+Math.min(1,P.crit)*.8)*Math.max(.5,m)}
function powerHp(sec){const r=G.bossRef,field=(G.dpsAvg||0)*sec*.3;/* crowd damage overstates single-target output, so only 30% of it counts */if(!r||!r.dps)return field;const ratio=Math.pow(clamp(powerIdx()/r.pow,1,2.2),.6)*(r.corr||1);return Math.max(field*.8,r.dps*ratio*sec)}
function duelLen(){if(G.room&&typeof ROOM!=='undefined'&&ROOM.data&&ROOM.data.mode==='time')return ROOM.data.len||180;if(RIVAL_ON&&G.rival&&!G.room)return G.quick?180:PK_LEN;return 0}
function bossDue(){if(G.curse.bossEvery&&G.cycAt!==undefined)return G.cycAt+(G.bossN-G.cycN)*G.curse.bossEvery+G.curse.bossEvery;const dl=duelLen();return BOSSRUSH?25+G.bossN*75:(G.bossN+1)*((G.ev&&G.ev.bossEvery)||(dl?Math.min(BOSS_AT,Math.round(dl*.6)):BOSS_AT))}
function nextBossIn(){return Math.max(0,bossDue()-G.t)}
function demoBoost(){
  const g=G,C=CLASSES[g.cls],E=['lightning','fire','ice','acid'];g.spells=[weaponOf(g.cls),...C.skills.slice(0,3)].map((id,i)=>({...mkSpell(id),lv:i?6:9,els:[E[i]]}));
  g.t=95;g.P.maxHp=g.P.hp=600;g.lv=16;g.P.regen=30;
  for(let i=0;i<60*12;i++)step(1/60);
}

/* build advice shown on the card screen: which category the build is thin on (a suggestion, never a rule) */
function buildAdvice(){
  const t=G.taken||{},P=G.P,def=(t.defense||0)+(t.heal||0),off=(t.melee||0)+(t.ranged||0)+(t.summon||0)+(t.all||0),ctrl=t.control||0;
  const recent=G.dmgTaken-(G._advDmg||0);G._advDmg=G.dmgTaken;
  // counters: if the most common monster on the field right now is weak to a category the build lacks, say so
  const cnt={};for(const e of G.en)if(!e.dead&&AFFINITY[e.type])cnt[e.type]=(cnt[e.type]||0)+1;const top=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  if(top&&cnt[top]>=12){const A=AFFINITY[top];if(A.weak.cat&&!(t[A.weak.cat]>0)&&!G.spells.some(x=>SKILL_CAT[x.id]===A.weak.cat)){const can=G.spells.length<4&&CLASSES[G.cls].skills.some(k=>!G.spells.some(x=>x.id===k)&&SKILL_CAT[k]===A.weak.cat);if(can)return {cat:A.weak.cat,zh:`${ETYPES[top].zh}多:${A.tip[0]}`,en:`${ETYPES[top].en}s: ${A.tip[1]}`};
    if(A.weak.el&&G.spells.some(x=>x.lv>=7&&!x.els.length))return {cat:'element',zh:`${ETYPES[top].zh}怕${ELS[A.weak.el]?ELS[A.weak.el].zh:'特定'}`,en:`${ETYPES[top].en}s fear ${ELS[A.weak.el]?ELS[A.weak.el].en:'an element'}`};
    return {cat:'passive',zh:`${ETYPES[top].zh}多:${A.tip[0]}`,en:`${ETYPES[top].en}s: ${A.tip[1]}`}}}
  if(G.lv>=4&&def===0&&!G.spells.some(s=>SKILL_CAT[s.id]==='defense'||SKILL_CAT[s.id]==='heal')&&(P.hp<P.maxHp*.6||G.lv>=8))return {cat:'defense',zh:'缺防御',en:'No defense yet'};
  if(G.lv>=6&&off<def)return {cat:'melee',zh:'构筑偏防守,补点伤害会清得更快',en:'Build leans defensive; more damage clears faster'};
  if(G.lv>=10&&ctrl===0&&G.en.length>200)return {cat:'control',zh:'怪群很密,控制类武学能拉开空间',en:'Crowds are thick; a control skill buys space'};
  const low=G.spells.filter(s=>s.lv<5&&!SPELLS[s.id].auto);if(G.lv>=8&&low.length)return {cat:SKILL_CAT[low[0].id],zh:`${SPELLS[low[0].id].zh} 还在低级,升到 7 级可灌注真气`,en:`${SPELLS[low[0].id].en} is still low; Lv 7 unlocks an element`};
  return null;
}
