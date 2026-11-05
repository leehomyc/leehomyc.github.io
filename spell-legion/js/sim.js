'use strict';
/* sim.js — game state, combat, skills, missions, shrines, cards, step */
let G=null,CLASS='swordsman',RIVAL_ON=false;
function mkSpell(id){return {id,lv:1,cd:0,els:[],augs:[],dmg:0,active:0,casts:0,nodes:{},pts:0}}
const nd=(s,fx)=>{if(!s||!s.nodes)return 0;let r=0;const T=TREES[s.id]||[];for(const k in s.nodes)if(T[k]&&T[k].fx===fx)r+=s.nodes[k];return r}
function skillCost(s){return Math.round(SPELLS[s.id].cost*(1-NODE_FX.cost*nd(s,'cost')))}
function newGame(auto,cls){
  cls=cls||CLASS;const C=CLASSES[cls];
  buildArena();if(typeof buildRuins==='function')buildRuins();
  const P={x:W/2,y:H/2,hp:C.hp,maxHp:C.hp,mana:C.mana,maxMana:C.mana,regen:C.regen,dmg:C.dmg,def:1,spd:C.spd,mag:1,haste:1,crit:.05,inv:0,face:1,walk:0,down:0,dash:0,dashCd:0,dx:0,dy:1,buff:null,cast:0,yaw:0,yaw0:0,shield:0,leap:null,cls,ap:0,sp:0,attr:{str:0,vit:0,spr:0,agi:0},dmgBonus:0};
  G={auto,t:0,P,cls,en:[],shots:[],bombs:[],bullets:[],gems:[],pools:[],fx:[],floats:[],arcs:[],later:[],ghosts:[],shocks:[],
     mush:[],grid:new Map(),spells:[mkSpell(C.main),mkSpell(C.skills[0])],xp:0,lv:1,need:14,picks:[],kills:0,cores:2,coreT:0,
     spawnA:0,swarmT:55,mission:null,missionT:26,boss:null,bossT:0,paused:false,over:null,shake:0,trauma:0,shX:0,shY:0,hitStop:0,slow:0,flash:0,dmgTaken:0,
     shrines:SHRINES.map(s=>({x:s[0],y:s[1],cd:0})),elites:0,combo:0,comboT:0,comboMax:0,over9:0,chests:[],chestT:30,goldRun:0,rerolls:1,wave:0,ambush:0,warlord:0,bossN:0,bossSlain:0,warlordN:0};
  if(typeof buildHero==='function')buildHero(cls,'player');
  if(RIVAL_ON)mkRival(cls);else{G.rival=null;if(typeof HEROES!=='undefined'&&HEROES.rival){scene.remove(HEROES.rival.g);scene.remove(HEROES.rival.sigil);HEROES.rival=null}}
  if(!auto&&typeof drawSeals==='function'){drawSeals();updateCores()}
}
const later=(t,f)=>G.later.push({t,f});
const BOSSES=[['血魔教主','Blood Demon Patriarch',null],['鬼面刀圣','Ghost-Mask Blade Saint','#8fe3ff'],['蛊母','Mother of Gu','#9ff06a'],['白骨尊者','Bone Venerable','#f4efe0'],['九幽魔尊','Lord of the Nine Hells','#b57cf0']];
const RIVAL_NAMES={swordsman:['青衣剑客','Azure Swordsman'],taoist:['玄机道人','Mystic Taoist'],blademaster:['黑风刀客','Black Wind Blademaster']};
function mkRival(playerCls){
  const opts=Object.keys(CLASSES).filter(k=>k!==playerCls),cls=pick(opts),C=CLASSES[cls];
  const a=rnd(TAU);const R={x:clamp(W/2+Math.cos(a)*220,60,W-60),y:clamp(H/2+Math.sin(a)*180,60,H-60),cls,name:RIVAL_NAMES[cls],hp:C.hp,maxHp:C.hp,dmg:C.dmg,crit:.05,spd:C.spd,mana:C.mana,maxMana:C.mana,regen:C.regen,
    spells:[Object.assign(mkSpell(C.main),{owner:'rival'}),Object.assign(mkSpell(C.skills[0]),{owner:'rival'})],kills:0,lv:1,xp:0,need:6,down:0,inv:0,dx:0,dy:1,walk:0,cast:0,yaw:0,yaw0:0,goal:null,goalT:0,dmgDealt:0,downs:0,lx:0,ly:0,dash:0};
  G.rival=R;if(typeof buildHero==='function')buildHero(cls,'rival');
}
function rivalTick(dt){
  const R=G.rival;if(!R)return;const P=G.P;
  R.inv=Math.max(0,R.inv-dt);R.mana=Math.min(R.maxMana,R.mana+R.regen*dt);for(const s of R.spells)s.cd=Math.max(0,s.cd-dt);
  if(R.down>0){R.down-=dt;if(R.down<=0){R.hp=R.maxHp;R.inv=1.5;aoe(R.x,R.y,80,40,null,'#6fd3e8',true,{quiet:1})}return}
  // level ups: straight stat growth, like a player picking damage cards
  while(R.xp>=R.need){R.xp-=R.need;R.lv++;R.need=xpNeed(R.lv);R.dmg*=1.06;R.maxHp+=6;R.hp=Math.min(R.maxHp,R.hp+12);const sp=R.spells[R.lv%2];sp.lv++;if(sp.lv===7)sp.els.push(pick(Object.keys(ELS)));if(sp.lv===14)sp.els.push(pick(Object.keys(ELS).filter(k=>!sp.els.includes(k))));if(R.lv===4&&R.spells.length<3)R.spells.push(Object.assign(mkSpell(CLASSES[R.cls].skills[1]),{owner:'rival'}))}
  // movement: hunt enemy clusters, keep a little distance, avoid the player's zone, roam when idle
  let x=0,y=0,cnt=0,cx=0,cy=0;
  near(R.x,R.y,230,e=>{if(e.type==='statue'||e.type==='boss')return;const d=hyp(e.x-R.x,e.y-R.y);cnt++;cx+=e.x;cy+=e.y;if(d<48){x-=(e.x-R.x)/(d||1)*(48-d)/48*2.2;y-=(e.y-R.y)/(d||1)*(48-d)/48*2.2}});
  if(cnt){cx/=cnt;cy/=cnt;const d=hyp(cx-R.x,cy-R.y)||1;if(d>90){x+=(cx-R.x)/d*.9;y+=(cy-R.y)/d*.9}}
  for(const b of G.bullets){const d=hyp(b.x-R.x,b.y-R.y);if(d<40){x-=(b.x-R.x)/(d||1)*1.6;y-=(b.y-R.y)/(d||1)*1.6}}
  let gt=null,gd=160;for(const g of G.gems){const d=hyp(g.x-R.x,g.y-R.y);if(d<gd){gd=d;gt=g}}
  if(gt){x+=(gt.x-R.x)/(gd||1)*.7;y+=(gt.y-R.y)/(gd||1)*.7}
  const pd=hyp(P.x-R.x,P.y-R.y)||1;if(pd<140){x-=(P.x-R.x)/pd*(140-pd)/140*1.5;y-=(P.y-R.y)/pd*(140-pd)/140*1.5}
  R.goalT-=dt;if(!R.goal||R.goalT<=0||hyp(R.goal[0]-R.x,R.goal[1]-R.y)<60){R.goal=pick([...SHRINES,...PAVS,[W/2,H/2],[rnd(200,W-200),rnd(200,H-200)]]);R.goalT=rnd(8,16)}
  if(!cnt){const d=hyp(R.goal[0]-R.x,R.goal[1]-R.y)||1;x+=(R.goal[0]-R.x)/d*.8;y+=(R.goal[1]-R.y)/d*.8}
  const l=hyp(x,y);if(l>.05){const m=Math.min(1,l),sp=84*R.spd*m;R.x+=x/l*sp*dt;R.y+=y/l*sp*dt;R.walk+=dt*8;R.dx=x/l;R.dy=y/l;R.yaw0=Math.atan2(R.dx,R.dy);collide(R,6)}
  // gems
  for(const g of G.gems){if(hyp(g.x-R.x,g.y-R.y)<26){g.dead=1;R.xp+=g.v}}
  // attacks
  const main=R.spells[0],st=stat(main),t=nearest(R.x,R.y,main.id==='slash'?70:200,true);
  if(main.cd<=0&&t){const a=Math.atan2(t.y-R.y,t.x-R.x);R.dx=Math.cos(a);R.dy=Math.sin(a);R.yaw0=Math.atan2(R.dx,R.dy);R.cast=1;
    if(main.id==='sword'){const n=1+Math.floor(main.lv/4);for(let i=0;i<n;i++)shoot(R.x,R.y-6,a+(i-(n-1)/2)*.13,main,14*st.m,{knock:60});main.cd=.5*st.cdM}
    else if(main.id==='charm'){const n=1+Math.floor(main.lv/4);for(let i=0;i<n;i++)shoot(R.x,R.y-6,a+(i-(n-1)/2)*.5,main,11*st.m,{v:190,life:1.3,r:4,knock:50,home:1,boom:1});main.cd=.62*st.cdM}
    else{const n=7+Math.floor(main.lv/4);for(let i=0;i<n;i++)shoot(R.x+Math.cos(a)*6,R.y+Math.sin(a)*6-6,a+(i-(n-1)/2)*.19,main,19*st.m,{v:330,life:.17,pierce:99,r:6,knock:120});G.fx.push({k:'wave',x:R.x,y:R.y,a,t:.22,T:.22,c:SPELLS.slash.col,w:1.2});main.cd=.46*st.cdM}}
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

/* ---------- feel ---------- */
function trauma(n,dx,dy){G.trauma=Math.min(1,G.trauma+n);if(dx!==undefined){G.shX+=dx*n*40;G.shY+=dy*n*40}}
function hitStop(t){G.hitStop=Math.max(G.hitStop,t)}
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
  let b=null,bd=max;for(const e of G.en){if(e.dead||(skipStatue&&e.type==='statue'))continue;let d=hyp(e.x-x,e.y-y);if(d>max)continue;if(e.type==='boss')d*=.3;else if(e.warlord)d*=.4;else if(e.elite)d*=.65;if(d<bd){bd=d;b=e}}return b}
function has(s,el){return s&&s.els.includes(el)}
function fusion(s){return s&&s.els.length===2?fusKey(s.els[0],s.els[1]):null}

/* ---------- combat ---------- */
function hit(e,d,s,noEl,col,kx=0,ky=0){
  if(e.dead)return;
  const P=G.P,rv=s&&s.owner==='rival',O=rv?G.rival:P;let m=d*O.dmg*(1+(O.dmgBonus||0))*(e.shred>0?1.25:1)*(!rv&&P.buff&&P.buff.k==='dmg'?1.3:1);
  const crit=Math.random()<O.crit+(s?NODE_FX.crit*nd(s,'crit'):0);if(crit)m*=2;
  if(s&&!rv){const lf=nd(s,'life');if(lf)heal(m*NODE_FX.life*lf);const ch=nd(s,'chain');if(ch&&Math.random()<NODE_FX.chain*ch&&!noEl)arc(e,m*.35,s,1)}
  e.hp-=m;e.flash=.08;if(s)s.dmg+=m;if(rv)G.rival.dmgDealt+=m;
  const kk=e.type==='boss'?.12:e.type==='giant'?.4:e.type==='statue'?0:1;
  e.kx=(e.kx||0)+kx*kk;e.ky=(e.ky||0)+ky*kk;
  if(!rv&&G.floats.length<80&&(m>=8||crit))G.floats.push({x:e.x+rnd(-4,4),y:e.y-e.r-3,t:.6,v:Math.round(m),c:crit?'#ffd75a':(col||'#efe4cd'),crit});
  if(crit&&!rv)hitStop(.03);
  if(s&&!noEl&&s.els.length)applyEls(e,m,s);
  if(s&&has(s,'dark')&&e.type!=='boss'&&e.type!=='statue'&&e.hp>0&&e.hp<e.maxHp*.12)e.hp=0;
  if(typeof SFX!=='undefined')SFX.hit(e.type==='boss'||e.type==='giant'?1:0,crit);
  if(e.hp<=0)kill(e,s,kx,ky);
}
function applyEls(e,m,s){
  const fk=fusion(s);
  if(has(s,'fire')){e.burn=3;e.burnD=Math.max(e.burnD||0,m*.22+1);e.burnS=s}
  if(has(s,'ice')){e.slow=1.5;if(Math.random()<.1&&e.type!=='boss')e.frz=1}
  if(has(s,'acid')){e.shred=3;if(Math.random()<.14)pool(e.x,e.y,22,3,5+s.lv*.6,s)}
  if(has(s,'lightning')&&Math.random()<.55)arc(e,m*.45,s,2);
  if(fk==='fire+ice'&&Math.random()<.14)pool(e.x,e.y,30,2.2,3+s.lv*.3,s,{steam:1});
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
function heal(n){const P=G.P;P.hp=Math.min(P.maxHp,P.hp+n)}
function pool(x,y,r,t,dps,s,o={}){
  if(G.pools.length>45)G.pools.shift();
  const fk=fusion(s);
  G.pools.push({x,y,r,t,T:t,dps:dps*(fk==='acid+fire'?2:1),s,tk:.25,steam:o.steam,slow:o.steam||fk==='acid+ice',zap:fk==='acid+lightning',col:o.steam?'#d7e8ec':fk==='acid+fire'?'#ff7a3c':'#8ed45c'});
}
function aoe(x,y,r,d,s,col,noEl,o={}){
  ring(x,y,r,col||'#ffb04a',o);
  near(x,y,r+12,e=>{const dx=e.x-x,dy=e.y-y,dd=hyp(dx,dy)||1;if(dd<=r+e.r){const k=(1-dd/(r+e.r))*170+60;hit(e,d,s,noEl,col,dx/dd*k,dy/dd*k)}});
  if(o.quiet)return;
  const sz=clamp(r/30,.3,1);trauma(sz*.45);shock(x,y,r*2.2,.028*sz);if(r>26)hitStop(.035);
  if(typeof SFX!=='undefined')SFX.boom(sz,o.thunder);
}
function ring(x,y,r,c,o={}){G.fx.push({k:'ring',x,y,r,t:.3,T:.3,c,thunder:o.thunder})}
function spark(x,y,c,n=4,sp=60,o={}){if(G.fx.length>640)return;for(let i=0;i<n;i++){const a=o.dir!==undefined?o.dir+rnd(-.7,.7):rnd(TAU),v=rnd(sp*.3,sp);const T=rnd(.22,.5);G.fx.push({k:'p',x,y,h:rnd(3,12),vh:rnd(10,sp),vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:T,T,c,g:1,sz:o.sz||rnd(2,3.6)})}}
function kill(e,s,kx=0,ky=0){
  if(e.dead)return;e.dead=1;
  const dir=Math.atan2(ky,kx);
  spark(e.x,e.y,e.type==='statue'?'#ff3df0':e.type==='boss'?'#ff5a5a':'#ff8e5a',e.type==='boss'?120:e.type==='giant'?18:6,e.type==='boss'?220:80,{dir:(kx||ky)?dir:undefined});
  if(e.type!=='boss'&&e.type!=='statue'&&G.fx.length<640){const sp=hyp(kx,ky);G.fx.push({k:'die',x:e.x,y:e.y,h:1,vh:70+sp*.5,kx:kx*1.6+rnd(-20,20),ky:ky*1.6+rnd(-20,20),rot:0,rv:rnd(6,14)*(Math.random()<.5?-1:1),t:.7,T:.7,type:e.type,fr:e.fr,sc:e.sc||1})}
  if(e.type==='statue'){if(G.mission&&G.mission.k==='statue'){G.mission.n--;checkMission()}return}
  if(s&&s.owner==='rival')G.rival.kills++;else{G.kills++;comboHit()}
  if((e.type==='giant'||e.elite)&&!(s&&s.owner==='rival')){hitStop(.06);trauma(.3)}
  const drops=e.elite?4:1;
  for(let i=0;i<drops;i++)if(G.gems.length<360)G.gems.push({x:e.x+rnd(-8,8),y:e.y+rnd(-8,8),v:e.xp,big:e.xp>=3});
  if(e.elite)G.gems.push({x:e.x,y:e.y,v:10,big:1});
  if(e.affix==='explode'){const x=e.x,y=e.y,d=e.dmg*1.3;later(.08,()=>{ring(x,y,34,'#ff4a2a');spark(x,y,'#ff6a3a',14,120);const P=G.P;if(hyp(P.x-x,P.y-y)<34+6)dmgP(d,x,y);if(G.rival&&hyp(G.rival.x-x,G.rival.y-y)<40)rivalHurt(d,x,y)})}
  if(e.warlord){G.chests.push({x:e.x,y:e.y,t:0});showBanner('统领已斩','Warlord slain: treasure drops',1.4);trauma(.6);G.slow=Math.max(G.slow,.5);G.flash=.5;if(typeof SFX!=='undefined')SFX.win()}
  const fk=fusion(s);
  if(s&&has(s,'dark')&&Math.random()<.05)heal(1);
  if(fk==='dark+fire'&&e.burn>0){const d=e.maxHp*.5+s.lv*2,x=e.x,y=e.y;later(.05,()=>aoe(x,y,26,d,s,'#ff5a2c',true))}
  if(fk==='dark+ice'&&e.slow>0){near(e.x,e.y,38,o=>{if(o.type!=='boss')o.frz=.7});ring(e.x,e.y,36,'#8fdcf0')}
  if(fk==='acid+dark'&&e.shred>0)pool(e.x,e.y,26,3,6+s.lv*.6,s);
  if(typeof SFX!=='undefined')SFX.die(e.type,G.combo);
  if(e.type==='boss')bossSlain(e);
}
const COMBO_TIERS=[[10,'连斩','Combo'],[25,'无双','Unrivalled'],[50,'血洗','Bloodbath'],[100,'天下无敌','Invincible'],[200,'武林神话','Legend']];
function comboMult(){return 1+Math.min(.6,Math.floor(G.combo/10)*.1)}
function comboHit(){
  G.combo++;G.comboT=2.4;if(G.combo>G.comboMax)G.comboMax=G.combo;
  const t=COMBO_TIERS.find(t=>t[0]===G.combo);
  if(t){showBanner(`${t[1]} ×${G.combo}`,t[2]+' · '+Math.round((comboMult()-1)*100)+'% bonus',1.3);trauma(.3);G.slow=Math.max(G.slow,.12);G.flash=Math.max(G.flash,.25);if(typeof SFX!=='undefined')SFX.combo(COMBO_TIERS.indexOf(t))}
  if(G.combo>=30&&!G.over9){G.over9=1;showBanner('狂暴','Overdrive: faster strikes, faster feet',1.4);if(typeof SFX!=='undefined')SFX.overdrive()}
}
function comboTick(dt){if(G.combo>0){G.comboT-=dt;if(G.comboT<=0){if(G.combo>=10)showBanner(`连斩终结 ×${G.combo}`,'Streak ended',.8);G.combo=0;G.over9=0}}}
/* treasure chests: burst of mana gems, gold and a bonus card */
function chestTick(dt){
  const P=G.P;G.chestT-=dt;
  if(G.chestT<=0&&G.chests.length<2){G.chestT=38;let x,y,n=0;do{const a=rnd(TAU),d=rnd(220,380);x=clamp(P.x+Math.cos(a)*d,60,W-60);y=clamp(P.y+Math.sin(a)*d,60,H-60)}while(n++<20&&(blocked(x,y)||onPond(x,y,1.3)));G.chests.push({x,y,t:0});showBanner('宝箱现世','A treasure chest appeared',1)}
  for(const c of G.chests){c.t+=dt;if(P.down<=0&&hyp(c.x-P.x,c.y-P.y)<22){c.dead=1;
    for(let i=0;i<10;i++){const a=i/10*TAU;G.gems.push({x:c.x+Math.cos(a)*18,y:c.y+Math.sin(a)*18,v:3,big:1})}
    G.goldRun+=25;ring(c.x,c.y,70,'#ffd27a');spark(c.x,c.y,'#ffd27a',40,160);trauma(.35);shock(c.x,c.y,160,.03);G.slow=Math.max(G.slow,.2);
    G.picks.push({kind:'level'});showBanner('宝箱开启','+25 gold, mana and a bonus card',1.4);if(typeof SFX!=='undefined')SFX.chest();openPick()}}
  G.chests=G.chests.filter(c=>!c.dead);
}
function dmgP(n,fx,fy){
  const P=G.P;if(P.down>0||P.inv>0||P.dash>0||G.over)return;
  if(P.shield>0){P.inv=.3;ring(P.x,P.y,30,'#7dffb0');if(typeof SFX!=='undefined')SFX.block();return}
  n*=P.def;P.hp-=n;P.inv=.4;G.dmgTaken+=n;
  const dx=fx!==undefined?P.x-fx:0,dy=fy!==undefined?P.y-fy:0,l=hyp(dx,dy)||1;
  trauma(.55,dx/l,dy/l);hitStop(.07);
  G.fx.push({k:'hurt',t:.22,T:.22});
  if(typeof SFX!=='undefined')SFX.hurt();
  if(P.hp<=0)downed();
}
function downed(){
  const P=G.P;P.hp=0;
  if(G.cores>0){G.cores--;P.down=1.6;G.slow=Math.max(G.slow,.6);updateCores();spark(P.x,P.y,'#6fd3e8',30,140);showBanner('核心复生','Revive Core used',1.4);if(typeof SFX!=='undefined')SFX.revive()}
  else lose();
}
function revive(){
  const P=G.P;P.hp=P.maxHp*.6;P.mana=P.maxMana;P.inv=1.5;aoe(P.x,P.y,100,70,null,'#6fd3e8',true);
  near(P.x,P.y,110,e=>{if(e.type!=='boss'&&e.type!=='statue')e.frz=1.2});
  trauma(.8);
}

/* ---------- skills ---------- */
const stat=s=>{
  const lvM=1+.17*(s.lv-1),gi=s.augs.includes('giant'),fu=s.els.length===2?1.25:1;
  return {m:lvM*(gi?1.3:1)*fu*(1+NODE_FX.dmg*nd(s,'dmg')),gi,burst:s.augs.includes('burst'),split:s.augs.includes('split'),cdM:(gi?1.15:1)*Math.max(.6,1-.04*(s.lv-1))*(1-NODE_FX.cd*nd(s,'cd')),
    n:nd(s,'count'),pierce:nd(s,'pierce'),size:1+NODE_FX.size*nd(s,'size'),dur:NODE_FX.dur*nd(s,'dur'),knock:1+NODE_FX.knock*nd(s,'knock')};
};
function shoot(x,y,a,s,d,o={}){
  if(G.shots.length>260)return;
  const st=stat(s),cols=s.els.map(k=>ELS[k].col);
  G.shots.push({x,y,vx:Math.cos(a)*(o.v||260),vy:Math.sin(a)*(o.v||260),life:o.life||.9,s,d,r:(o.r||3)*(st.gi?1.6:1),pierce:o.pierce||0,hitSet:o.hitSet||new Set(),col:cols[0]||SPELLS[s.id].col,col2:cols[1],split:o.nosplit?false:st.split,small:o.small,knock:o.knock||70,kind:s.id,spin:rnd(TAU),home:o.home,boom:o.boom});
}
function aimDir(range){const P=G.P,t=nearest(P.x,P.y,range,true);if(t)return Math.atan2(t.y-P.y,t.x-P.x);return Math.atan2(P.dy,P.dx)}
function autoFire(s){ // the normal attack of each class
  const P=G.P,st=stat(s);
  if(s.id==='sword'){
    const t=nearest(P.x,P.y,200,true);if(!t)return false;
    const fn=()=>{const tt=t.dead?nearest(P.x,P.y,210,true):t;if(!tt)return;const a=Math.atan2(tt.y-P.y,tt.x-P.x),n=1+Math.floor(s.lv/4)+st.n;
      for(let i=0;i<n;i++)shoot(P.x,P.y-6,a+(i-(n-1)/2)*.13,s,14*st.m,{knock:60*st.knock,pierce:st.pierce,r:3*st.size});P.cast=1;if(typeof SFX!=='undefined')SFX.sword()};
    fn();if(st.burst)later(.12,fn);s.cd=.5*st.cdM;
  }else if(s.id==='charm'){
    const t=nearest(P.x,P.y,210,true);if(!t)return false;
    const fn=()=>{const tt=t.dead?nearest(P.x,P.y,220,true):t;if(!tt)return;const a=Math.atan2(tt.y-P.y,tt.x-P.x),n=1+Math.floor(s.lv/4)+st.n;
      for(let i=0;i<n;i++)shoot(P.x,P.y-6,a+(i-(n-1)/2)*.5,s,11*st.m,{v:190,life:1.3,r:4*st.size,knock:50*st.knock,home:1,boom:1});P.cast=1;if(typeof SFX!=='undefined')SFX.charm()};
    fn();if(st.burst)later(.14,fn);s.cd=.62*st.cdM;
  }else if(s.id==='slash'){
    const t=nearest(P.x,P.y,70,true);if(!t)return false;
    const fn=()=>{const tt=t.dead?nearest(P.x,P.y,80,true):t;if(!tt)return;const a=Math.atan2(tt.y-P.y,tt.x-P.x),n=7+Math.floor(s.lv/4)+st.n*2;P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);
      for(let i=0;i<n;i++)shoot(P.x+Math.cos(a)*6,P.y+Math.sin(a)*6-6,a+(i-(n-1)/2)*.19,s,19*st.m,{v:330*st.size,life:.17*st.size,pierce:99,r:6*st.size,knock:120*st.knock});
      G.fx.push({k:'wave',x:P.x,y:P.y,a,t:.22,T:.22,c:s.els[0]?ELS[s.els[0]].col:SPELLS.slash.col,w:1.2});P.cast=1;trauma(.08,-Math.cos(a),-Math.sin(a));if(typeof SFX!=='undefined')SFX.slash()};
    fn();if(st.burst)later(.11,fn);s.cd=.46*st.cdM;
  }
  return true;
}
function canCast(i){const s=G.spells[i];if(!s||SPELLS[s.id].auto)return false;return s.cd<=0&&G.P.mana>=skillCost(s)&&G.P.down<=0}
function castSkill(i){
  const s=G.spells[i];if(!s)return false;const sp=SPELLS[s.id],P=G.P;
  if(sp.auto)return false;
  const cost=skillCost(s);
  if(s.cd>0||P.mana<cost){if(!G.auto){G.fx.push({k:'deny',i,t:.3});if(typeof SFX!=='undefined')SFX.deny()}return false}
  const st=stat(s);
  P.mana-=cost;s.cd=sp.cd*st.cdM/P.haste;s.casts++;P.cast=1;
  if(s.id==='palm'){
    const fn=()=>{const a=aimDir(260),n=5+Math.floor(s.lv/3)+st.n;P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);
      for(let i=0;i<n;i++)shoot(P.x+Math.cos(a)*8,P.y+Math.sin(a)*8-6,a+(i-(n-1)/2)*.17,s,12*st.m,{v:235,life:.46*st.size,pierce:3+st.pierce,knock:190*st.knock,r:4*st.size});
      G.fx.push({k:'wave',x:P.x,y:P.y,a,t:.28,T:.28,c:s.els[0]?ELS[s.els[0]].col:sp.col});trauma(.22,-Math.cos(a),-Math.sin(a));hitStop(.02);
      if(typeof SFX!=='undefined')SFX.palm()};
    fn();if(st.burst)later(.18,fn);
  }else if(s.id==='array'||s.id==='bagua'){
    s.active=sp.dur+s.lv*.25+st.dur;s.a=0;ring(P.x,P.y,60,sp.col);trauma(.2);if(typeof SFX!=='undefined')SFX.array();
  }else if(s.id==='ward'){
    heal(P.maxHp*.25);P.shield=4+s.lv*.15+st.dur;aoe(P.x,P.y,80*st.size,8*st.m,s,sp.col,false,{quiet:1});trauma(.25);shock(P.x,P.y,170,.03);if(typeof SFX!=='undefined')SFX.ward();
  }else if(s.id==='whirl'){
    s.active=sp.dur+s.lv*.06+st.dur;s.tk=0;trauma(.15);if(typeof SFX!=='undefined')SFX.whirl();
  }else if(s.id==='leap'){
    const a=aimDir(200);P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy);P.dash=.24;P.ghostT=0;P.dashHit=new Set();P.leap=s;trauma(.15,-P.dx,-P.dy);if(typeof SFX!=='undefined')SFX.dash();
  }else if(s.id==='roar'){
    const fn=()=>{const R=95*(st.gi?1.2:1)*st.size;aoe(P.x,P.y,R,16*st.m,s,sp.col,false,{});near(P.x,P.y,R+15,e=>{if(e.type!=='boss'&&e.type!=='statue')e.frz=Math.max(e.frz||0,.9+s.lv*.05+st.dur)});shock(P.x,P.y,260,.05,.5);trauma(.5);G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.3,T:.3,c:sp.col,full:1});if(typeof SFX!=='undefined')SFX.roar()};
    fn();if(st.burst)later(.3,fn);
  }else if(s.id==='talis'){
    const cands=G.en.filter(e=>!e.dead&&e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<240);
    const fn=()=>{let best=null,bs=-1;for(const e of cands){if(e.dead)continue;let n=0;for(const o of cands)if(!o.dead&&hyp(o.x-e.x,o.y-e.y)<44)n++;if(n>bs){bs=n;best=e}}
      const tx=best?best.x:P.x+P.dx*120,ty=best?best.y:P.y+P.dy*120;lob(P.x,P.y-6,tx,ty,s,(30+s.lv*1.3)*st.m,(30+s.lv)*(st.gi?1.35:1)*st.size,st.split);if(st.n)later(.25,()=>lob(P.x,P.y-6,tx+rnd(-40,40),ty+rnd(-40,40),s,(30+s.lv*1.3)*st.m*.8,(30+s.lv)*st.size,false));if(typeof SFX!=='undefined')SFX.throw()};
    fn();if(st.burst)later(.22,fn);
  }
  return true;
}
function lob(x0,y0,x,y,s,d,r,split){G.bombs.push({x0,y0,x,y,t:0,T:.55,s,d,r,split})}
function orbits(dt){
  const P=G.P;
  for(const s of G.spells){
    if(s.id==='whirl'&&s.active>0){s.active-=dt;s.tk-=dt;const st=stat(s);if(s.tk<=0){s.tk=.11;const R=52*(st.gi?1.25:1)*st.size;near(P.x,P.y,R+12,e=>{const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d<R+e.r){const tx=-dy/d,ty=dx/d;hit(e,7*st.m,s,false,undefined,tx*90+dx/d*60,ty*90+dy/d*60)}});if(typeof SFX!=='undefined')SFX.whirlTick()}continue}
    if((s.id!=='array'&&s.id!=='bagua')||s.active<=0)continue;
    s.active-=dt;
    const st=stat(s),extra=s.augs.includes('extra'),bg=s.id==='bagua',n=(bg?2:3)+Math.floor(s.lv/3)+(extra?2:0)+st.n,R=(bg?58:38+s.lv*.8)*(st.gi?1.25:1)*st.size,sz=st.gi?8:6;
    s.a=(s.a||0)+dt*(extra?4.6:bg?2.6:3.4);s.pos=[];
    for(let i=0;i<n;i++){
      const a=s.a+i/n*TAU,x=P.x+Math.cos(a)*R,y=P.y-4+Math.sin(a)*R;s.pos.push([x,y,a]);
      near(x,y,sz+10,e=>{if(hyp(e.x-x,e.y-y)<e.r+sz&&(e.orbT||0)<=0){e.orbT=.34;const tx=-Math.sin(a),ty=Math.cos(a);hit(e,(bg?13:9)*st.m,s,false,undefined,tx*120+(e.x-P.x)*.5,ty*120+(e.y-P.y)*.5)}});
    }
    if(s.active<=0)s.pos=null;
  }
}
let AUTOCAST=false;
function countNear(x,y,r){let n=0;near(x,y,r,e=>{if(e.type!=='statue'&&hyp(e.x-x,e.y-y)<r)n++});return n}
function autoSpend(){const P=G.P;let g=0;while(P.sp>0&&g++<50){const s=pick(G.spells),T=TREES[s.id]||[];const opts=T.map((n,i)=>i).filter(i=>canNode(s,i));if(!opts.length){P.sp--;break}spendNode(s,pick(opts))}}
function autoCast(){ // casts each skill when it is worth the qi
  const P=G.P;if(G.auto)autoSpend();
  for(let i=1;i<G.spells.length;i++){
    const s=G.spells[i];if(!canCast(i))continue;const id=s.id;let go=false;
    if(id==='palm')go=countNear(P.x,P.y,150)>=2;
    else if(id==='array'||id==='bagua')go=countNear(P.x,P.y,110)>=3;
    else if(id==='talis')go=countNear(P.x,P.y,230)>=4;
    else if(id==='ward')go=P.hp<P.maxHp*.5||countNear(P.x,P.y,60)>=6;
    else if(id==='whirl')go=countNear(P.x,P.y,70)>=3;
    else if(id==='leap')go=countNear(P.x,P.y,200)>=4&&countNear(P.x,P.y,50)<4;
    else if(id==='roar')go=countNear(P.x,P.y,100)>=4||P.hp<P.maxHp*.35;
    if(go)castSkill(i);
  }
}
function dash(){
  const P=G.P;if(P.dashCd>0||P.down>0||G.over)return false;
  const v=G.auto?autopilot():input();let dx=v.x,dy=v.y;if(!dx&&!dy){dx=P.dx;dy=P.dy}
  const l=hyp(dx,dy)||1;P.dx=dx/l;P.dy=dy/l;P.yaw0=Math.atan2(P.dx,P.dy);
  P.dash=.17;P.dashCd=1.1;P.ghostT=0;P.dashHit=new Set();trauma(.12,-P.dx,-P.dy);
  if(typeof SFX!=='undefined')SFX.dash();
  return true;
}

/* ---------- missions & shrines ---------- */
function startMission(){
  const P=G.P;let x,y,tries=0;
  do{const a=rnd(TAU),d=rnd(260,420);x=clamp(P.x+Math.cos(a)*d,90,W-90);y=clamp(P.y+Math.sin(a)*d,90,H-90);tries++}while(tries<30&&(blocked(x,y)||onPond(x,y,1.4)||hyp(x-P.x,y-P.y)<200));
  const k=pick(['mush','statue']);
  if(k==='mush'){
    G.mush=[];for(let i=0;i<5;i++){const o={x:x+rnd(-90,90),y:y+rnd(-70,70)};collide(o,6);G.mush.push(o)}
    G.mission={k,n:5,N:5,T:34,t:34,x,y};
  }else{
    for(let i=0;i<3;i++){const o={x:x+Math.cos(i/3*TAU)*60,y:y+Math.sin(i/3*TAU)*60};collide(o,8);
      const hp=90+G.t*1.6;G.en.push({...o,t0:G.t,type:'statue',hp,maxHp:hp,spd:0,dmg:0,r:8,xp:0,fr:0,vx:0,vy:0})}
    G.mission={k,n:3,N:3,T:38,t:38,x,y};
  }
  showBanner(k==='mush'?'密令:采集灵芝 ×5':'密令:摧毁邪碑 ×3',(k==='mush'?'Gather 5 lingzhi':'Destroy 3 cursed steles')+' · reward: an augment card',1.8);if(typeof SFX!=='undefined')SFX.mission();
}
function checkMission(){if(G.mission&&G.mission.n<=0){G.mission=null;G.missionT=45;G.mush=[];G.picks.push({kind:'aug'});if(typeof SFX!=='undefined')SFX.complete();openPick()}}
function missionText(){
  const m=G.mission;if(!m)return '';
  const t=Math.ceil(m.t);
  return (m.k==='mush'?`密令:采集灵芝 ${m.N-m.n}/${m.N}`:`密令:摧毁邪碑 ${m.N-m.n}/${m.N}`)+` · ${t}s · 奖励:强化卡 Reward: augment card`;
}
function missionTarget(){ // the nearest thing the player still has to reach or destroy
  const m=G.mission,P=G.P;if(!m)return null;let b=null,bd=1e9;
  if(m.k==='mush'){for(const o of G.mush){const d=hyp(o.x-P.x,o.y-P.y);if(d<bd){bd=d;b=o}}}
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
  G.xp+=v;
  while(G.xp>=G.need){G.xp-=G.need;G.lv++;G.need=xpNeed(G.lv);autoGrow();G.P.sp+=1;if(G.lv%5===0)G.rerolls++;G.picks.push({kind:'level'});if(typeof SFX!=='undefined'&&!G.auto)SFX.levelup()}
  if(G.picks.length)openPick();
}
const RARITY=[{k:'common',zh:'',en:'',w:62,x:1},{k:'rare',zh:'稀有',en:'Rare',w:26,x:1.6},{k:'epic',zh:'史诗',en:'Epic',w:10,x:2.4},{k:'legendary',zh:'传说',en:'Legendary',w:2,x:4}];
function rollRarity(){let r=rnd(100);for(const q of RARITY){if(r<q.w)return q;r-=q.w}return RARITY[0]}
function levelUp(s,n){for(let i=0;i<n;i++){s.lv++;if(s.lv===7)G.picks.unshift({kind:'infuse',s});if(s.lv===14)G.picks.unshift({kind:'fuse',s})}}
function spellCard(s,q){const m=SPELLS[s.id],next=s.lv+1,lv=q.k==='common'?1:q.k==='rare'?2:q.k==='epic'?3:5;
  const note=next===7?'第 7 级:灌注真气 · Lv 7 infuses an element':next===14?'第 14 级:真气融合 · Lv 14 fuses a second element':(m.auto?'伤害 +17% · Damage +17%':'伤害 +17%,冷却 -4% · +17% damage, -4% cooldown');
  return {g:m.g,c:m.col,n:m.zh,e:`${m.en} · Lv ${s.lv} → ${s.lv+lv}`,d:(lv>1?`+${lv} 级! · `:'')+note,de:'',q,a(){levelUp(s,lv)}}}
function buildCards(q){
  if(q.kind==='infuse'||q.kind==='fuse'){
    const s=q.s,opts=Object.keys(ELS).filter(k=>!s.els.includes(k)).sort(()=>Math.random()-.5).slice(0,3);
    return opts.map(k=>{const el=ELS[k];
      if(q.kind==='infuse')return {g:el.g,c:el.col,n:el.zh,e:`${el.en} · ${SPELLS[s.id].en}`,d:el.d,de:el.de,a(){s.els.push(k)}};
      const f=FUS[fusKey(s.els[0],k)];
      return {g:el.g,c:el.col,n:`${f[0]}`,e:`${f[1]} = ${ELS[s.els[0]].en} + ${el.en}`,d:f[2],de:f[3]+' +25% damage.',a(){s.els.push(k)}};
    });
  }
  if(q.kind==='aug'){
    const opts=[];for(const s of G.spells)for(const k in AUGS)if(AUGS[k].for.includes(s.id)&&!s.augs.includes(k))opts.push([s,k]);
    opts.sort(()=>Math.random()-.5);
    return opts.slice(0,3).map(([s,k])=>{const a=AUGS[k];return {g:a.g,c:'#d6a54a',n:`${a.zh} · ${SPELLS[s.id].zh}`,e:`${a.en} · ${SPELLS[s.id].en}`,d:a.d,de:a.de,a(){s.augs.push(k)}}});
  }
  const pool=[];
  G.spells.filter(s=>s.lv<40).forEach(s=>{const q=rollRarity();pool.push(spellCard(s,q),spellCard(s,q))});
  if(G.spells.length<4&&G.lv>=3)CLASSES[G.cls].skills.filter(k=>!G.spells.some(s=>s.id===k)).forEach(k=>{const m=SPELLS[k];
    const card={g:m.g,c:m.col,n:m.zh,e:`新武学 New skill · ${m.en} · ${SPELL_KEYS[G.spells.length]}`,d:m.d,de:m.de,a(){G.spells.push(mkSpell(k))}};pool.push(card,card)});
  PERKS.forEach(p=>{const q=rollRarity(),times=q.k==='common'?1:q.k==='rare'?2:q.k==='epic'?3:5;pool.push({g:p.g,c:'#efe4cd',n:p.zh,e:p.en+(times>1?` ×${times}`:''),d:p.d+(times>1?` ×${times}`:''),de:p.de,q,a(){for(let i=0;i<times;i++)p.a(G.P)}})});
  const out=[];const used=new Set();
  const isNew=pool.filter(p=>p.e.startsWith('新武学'));
  if(isNew.length&&[3,6].includes(G.lv)){const nc=pick(isNew);out.push(nc);used.add(nc.n)}
  let guard=0;while(out.length<3&&guard++<60){const p=pick(pool);if(!used.has(p.n)){used.add(p.n);out.push(p)}}
  if(Math.random()<.03&&q.kind==='level'){ // jackpot: take all three
    const all=out.slice();out.length=0;out.push({g:'囍',c:'#ffd27a',n:'天降横财',e:'JACKPOT · take all three',d:all.map(c=>c.n).join(' + '),de:'All three cards at once.',q:RARITY[3],a(){all.forEach(c=>c.a())}},...all.slice(0,2))}
  return out;
}

/* level curve: slow early, keeps paying out late (gem values also rise every 4 minutes) */
function xpNeed(lv){return Math.round(9+lv*4.2+lv*lv*.42)}
function autoGrow(){const P=G.P;P.maxHp+=8;P.hp=Math.min(P.maxHp,P.hp+12);P.dmgBonus+=.03;P.maxMana+=5;P.mana=Math.min(P.maxMana,P.mana+10);P.regen*=1.03;P.spd*=1.01;P.crit+=.004;P.attr.str++;P.attr.vit++;P.attr.spr++;P.attr.agi++}
function spendAttr(id){const P=G.P;if(P.ap<=0)return false;P.ap--;P.attr[id]++;
  if(id==='str')P.dmgBonus+=.04;if(id==='vit'){P.maxHp+=8;P.hp+=8}if(id==='spr'){P.maxMana+=6;P.mana+=6;P.regen*=1.04}if(id==='agi'){P.spd*=1.02;P.crit+=.01}return true}
function canNode(s,i){const n=TREES[s.id]&&TREES[s.id][i];if(!n)return false;const r=s.nodes[i]||0;if(r>=n.max)return false;const need=n.tier===1?0:n.tier===2?2:4;return s.pts>=need&&G.P.sp>0}
function spendNode(s,i){if(!canNode(s,i))return false;G.P.sp--;s.pts++;s.nodes[i]=(s.nodes[i]||0)+1;return true}
/* ---------- spawning ---------- */
const diff=t=>(1+t/170)*(t>240?1+(t-240)/220:1); // endless: the curve steepens after the first boss
function spawnEnemy(type,x,y,mul=1,elite){
  const b=ETYPES[type],t=G.t,sc=diff(t);
  const el=elite||(t>50&&type!=='assassin'&&Math.random()<Math.min(.22,.06+t/3600));
  let affix=null;if(t>300&&Math.random()<Math.min(.35,(t-300)/1500))affix=pick(['swift','explode','armor']);
  const hp=b.hp*sc*mul*(el?4:1)*(affix==='armor'?1.8:1);
  G.en.push({x,y,type,hp,maxHp:hp,t0:t,spd:b.spd*rnd(.92,1.08)*(el?.9:1)*(affix==='swift'?1.5:1)*Math.min(1.35,1+Math.max(0,t-240)/900),dmg:b.dmg*(1+t/360)*(t>240?1+(t-240)/600:1)*(el?1.4:1),r:b.r*(el?1.4:1),xp:b.xp*(1+Math.floor(t/240)*.5)|0||1,fr:rnd(1),vx:0,vy:0,shoot:b.shoot,st:rnd(1,3),elite:el,sc:(el?1.5:1)*(affix==='armor'?1.15:1),kx:0,ky:0,affix});
  if(el)G.elites++;
}
function edgePoint(){
  const P=(G.rival&&G.rival.down<=0&&Math.random()<.4)?G.rival:G.P,a=rnd(TAU),R=Math.max(VW,VH)*.62+rnd(20);
  const o={x:P.x+Math.cos(a)*R,y:P.y+Math.sin(a)*R};
  o.x=clamp(o.x,30,W-30);o.y=clamp(o.y,30,H-30);
  if(hyp(o.x-P.x,o.y-P.y)<110){o.x=clamp(P.x-Math.cos(a)*R,30,W-30);o.y=clamp(P.y-Math.sin(a)*R,30,H-30)}
  return o;
}
function spawnTick(dt){
  const t=G.t;
  if(G.en.length>520)return;
  const rate=Math.min(16,1.25+t/30+Math.max(0,t-240)/40)*(G.boss?.5:1)*(G.en.length>380?.4:1);G.spawnA+=rate*dt;
  while(G.spawnA>=1){G.spawnA--;
    const r=rnd(),o=edgePoint();
    let ty='assassin';
    if(t>25&&r<.45)ty='bandit';
    if(t>85&&r<.14)ty='archer';
    if(t>150&&r<.07)ty='giant';
    spawnEnemy(ty,o.x,o.y);
  }
  const wave=Math.floor(t/30);if(wave>G.wave&&!G.boss){G.wave=wave;const mix=t>150?'刀客 · 弓手 · 铁甲力士':t>85?'刀客 · 弓手':t>25?'刺客 · 刀客':'刺客';showBanner(`第 ${wave} 波`,`Wave ${wave} · ${mix}`,1);if(typeof SFX!=='undefined')SFX.wave()}
  G.swarmT-=dt;
  if(G.swarmT<=0&&!G.boss){G.swarmT=50;const P=G.P,n=18+Math.floor(t/8);
    for(let i=0;i<n;i++){const a=i/n*TAU,o={x:clamp(P.x+Math.cos(a)*180,30,W-30),y:clamp(P.y+Math.sin(a)*180,30,H-30)};spawnEnemy('assassin',o.x,o.y,.8)}
    G.ambush=20;showBanner('刺客来袭','Ambush: survive 20 s for a chest',1.2);if(typeof SFX!=='undefined')SFX.swarm();
  }
  if(G.ambush>0){G.ambush-=dt;if(G.ambush<=0){const P=G.P;G.chests.push({x:clamp(P.x+rnd(-60,60),60,W-60),y:clamp(P.y+rnd(-60,60),60,H-60),t:0});showBanner('伏击已破','Ambush survived: a chest drops',1.2);if(typeof SFX!=='undefined')SFX.complete()}}
  if(t>=G.warlordN*240+120&&!G.boss){G.warlordN++;const o=edgePoint();spawnEnemy('giant',o.x,o.y,9+G.warlordN*3,true);const e=G.en[G.en.length-1];e.warlord=1;e.sc=2;e.r=16;e.spd*=1.15+G.warlordN*.05;e.name='铁甲统领';showBanner('铁甲统领','The Iron Warlord arrives',1.6);trauma(.4);if(typeof SFX!=='undefined')SFX.bossIn()}
  if(t>=(G.bossN+1)*BOSS_AT&&!G.boss){const n=G.bossN,V=BOSSES[n%BOSSES.length],o=edgePoint(),k=1+n*1.1,hp=Math.round(5600*k*(1+t/900));
    G.boss={x:o.x,y:o.y,t0:G.t,type:'boss',hp,maxHp:hp,spd:24+n*3,dmg:22*(1+n*.35),r:20,xp:0,fr:0,vx:0,vy:0,kx:0,ky:0,n,name:V[0],en:V[1],tint:V[2],rate:Math.max(.55,1-n*.12)};G.en.push(G.boss);G.bossT=3;G.bossSpawned=1;
    showBanner(V[0]+'现身',V[1]+' emerges',2.2);trauma(.6);if(!G.auto){$('#bossbar').hidden=false;$('#bossname').textContent=V[0]+' · '+V[1]}if(typeof SFX!=='undefined')SFX.bossIn();
  }
}
function bossAI(dt){
  const B=G.boss,P=G.P;if(!B||B.dead)return;
  if(B.charge>0){B.charge-=dt;B.x+=B.cvx*dt;B.y+=B.cvy*dt;collide(B,B.r);if(B.charge<=0){ring(B.x,B.y,34,'#e0503f');trauma(.3)}return}
  if(B.tele>0){B.tele-=dt;if(B.tele<=0){const a=Math.atan2(B.ty-B.y,B.tx-B.x);B.cvx=Math.cos(a)*300;B.cvy=Math.sin(a)*300;B.charge=.62;if(typeof SFX!=='undefined')SFX.bossCharge()}return}
  G.bossT-=dt;if(G.bossT>0)return;
  const low=B.hp<B.maxHp*.5;G.bossT=(low?2.3:3.2)*(B.rate||1);
  const k=pick(['radial','aimed','charge','summon']);
  if(k==='radial'){const n=low?28:20,o=rnd(TAU);for(let i=0;i<n;i++){const a=o+i/n*TAU;bullet(B.x,B.y,a,82,12)}
    if(low)later(.5,()=>{if(B.dead)return;for(let i=0;i<n;i++){const a=o+.1+i/n*TAU;bullet(B.x,B.y,a,66,12)}})}
  if(k==='aimed'){for(let w=0;w<3;w++)later(w*.28,()=>{if(B.dead)return;const a=Math.atan2(P.y-B.y,P.x-B.x);for(let i=-2;i<=2;i++)bullet(B.x,B.y,a+i*.16,124,10)})}
  if(k==='charge'){B.tele=.8;B.tx=P.x;B.ty=P.y}
  if(k==='summon'){for(let i=0;i<14;i++){const a=i/14*TAU;spawnEnemy('assassin',clamp(B.x+Math.cos(a)*40,30,W-30),clamp(B.y+Math.sin(a)*40,30,H-30),.7)}ring(B.x,B.y,50,'#ff6a6a')}
  if(typeof SFX!=='undefined')SFX.bossAttack(k);
}
function bullet(x,y,a,v,d){if(G.bullets.length<280)G.bullets.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:5,d})}

/* ---------- step ---------- */
function step(dt){
  const P=G.P;G.t+=dt;
  for(let i=G.later.length-1;i>=0;i--){const l=G.later[i];l.t-=dt;if(l.t<=0){G.later.splice(i,1);l.f()}}
  if(G.cores===0){G.coreT+=dt;if(G.coreT>=70){G.coreT=0;G.cores=1;updateCores()}}else G.coreT=0;
  G.grid.clear();
  for(const e of G.en){if(e.dead)continue;const k=gridOf(e);let a=G.grid.get(k);if(!a)G.grid.set(k,a=[]);a.push(e)}
  // player
  P.inv=Math.max(0,P.inv-dt);P.dashCd=Math.max(0,P.dashCd-dt);
  P.mana=Math.min(P.maxMana,P.mana+P.regen*dt);
  for(const s of G.spells)s.cd=Math.max(0,s.cd-dt*(P.buff&&P.buff.k==='haste'?2:1)*(G.over9?1.3:1));
  comboTick(dt);chestTick(dt);
  if(P.down>0){P.down-=dt;if(P.down<=0)revive()}
  else if(P.dash>0){
    P.dash-=dt;const sp=P.leap?600:560;P.x+=P.dx*sp*dt;P.y+=P.dy*sp*dt;collide(P,6);P.walk+=dt*20;
    if(P.dash<=0&&P.leap){const s=P.leap,st=stat(s);P.leap=null;aoe(P.x,P.y,46*(st.gi?1.3:1)*st.size,(34+s.lv*1.5)*st.m,s,s.els[0]?ELS[s.els[0]].col:SPELLS.leap.col,false,{});hitStop(.05)}
    P.ghostT-=dt;if(P.ghostT<=0){P.ghostT=.028;if(G.ghosts.length<14)G.ghosts.push({x:P.x,y:P.y,yaw:P.yaw,t:.32,T:.32})}
    near(P.x,P.y,26,e=>{if(e.type==='statue'||P.dashHit.has(e))return;if(hyp(e.x-P.x,e.y-P.y)<e.r+12){P.dashHit.add(e);hit(e,12*P.dmg,null,true,'#bff4ff',P.dx*150,P.dy*150)}});
  }else{
    const v=G.auto?autopilot():input();
    if(v.x||v.y){const l=hyp(v.x,v.y)||1,m=Math.min(1,l),s=92*P.spd*(P.buff&&P.buff.k==='spd'?1.35:1)*(G.over9?1.12:1)*m;P.x+=v.x/l*s*dt;P.y+=v.y/l*s*dt;P.walk+=dt*8;P.dx=v.x/l;P.dy=v.y/l;collide(P,6)}
    const main=G.spells[0];if(main&&main.cd<=0&&!autoFire(main))main.cd=.08;
    P.shield=Math.max(0,P.shield-dt);
    if(G.auto||AUTOCAST)autoCast();
    if(G.auto&&P.dashCd<=0&&Math.random()<.015)dash();
  }
  orbits(dt);
  for(const g of G.ghosts)g.t-=dt;G.ghosts=G.ghosts.filter(g=>g.t>0);
  spawnTick(dt);bossAI(dt);shrineTick(dt);rivalTick(dt);
  if(!G.mission){G.missionT-=dt;if(G.missionT<=0)startMission()}
  else{const m=G.mission;m.t-=dt;
    if(m.k==='mush'){for(let i=G.mush.length-1;i>=0;i--){const o=G.mush[i];if(hyp(o.x-P.x,o.y-P.y)<16){G.mush.splice(i,1);m.n--;spark(o.x,o.y,'#ff8a5a',8);if(typeof SFX!=='undefined')SFX.pick(1);checkMission();if(!G.mission)break}}}
    if(G.mission&&m.t<=0){G.mission=null;G.missionT=35;G.mush=[];G.en.forEach(e=>{if(e.type==='statue')e.dead=1});showBanner('密令失败','Mission failed',1)}
  }
  // enemies
  for(const e of G.en){
    if(e.dead)continue;
    e.flash=Math.max(0,(e.flash||0)-dt);e.orbT=(e.orbT||0)-dt;e.frz=Math.max(0,(e.frz||0)-dt);e.slow=Math.max(0,(e.slow||0)-dt);e.shred=Math.max(0,(e.shred||0)-dt);
    if(e.burn>0){e.burn-=dt;e.btk=(e.btk||0)-dt;if(e.btk<=0){e.btk=.5;hit(e,e.burnD*.5,e.burnS,true,'#ff8a3c');if(e.dead)continue}}
    if(e.kx||e.ky){e.x+=e.kx*dt;e.y+=e.ky*dt;const f=Math.exp(-8*dt);e.kx*=f;e.ky*=f;if(Math.abs(e.kx)<2&&Math.abs(e.ky)<2){e.kx=e.ky=0}collide(e,e.r)}
    if(e.type==='statue')continue;
    if(e.type==='boss'&&(e.tele>0||e.charge>0)){if(hyp(e.x-P.x,e.y-P.y)<e.r+6&&e.charge>0)dmgP(26,e.x,e.y);continue}
    if(e.frz>0)continue;
    const R=G.rival,useR=R&&R.down<=0&&hyp(R.x-e.x,R.y-e.y)<hyp(P.x-e.x,P.y-e.y)*.85,T=useR?R:P;
    let dx=T.x-e.x,dy=T.y-e.y,d=hyp(dx,dy)||1,sp=e.spd*(e.slow>0?.55:1);
    let ax=dx/d,ay=dy/d;
    if(e.shoot){ if(d<140){ax=-ax*.3;ay=-ay*.3}
      e.st-=dt;if(e.st<=0&&d<230){e.st=rnd(2.2,3.4);bullet(e.x,e.y,Math.atan2(dy,dx),84,8*(1+G.t/360));if(typeof SFX!=='undefined')SFX.arrow()}}
    let sx=0,sy=0,cnt=0;
    near(e.x,e.y,e.r+8,o=>{if(o===e||o.type==='statue')return;const ox=e.x-o.x,oy=e.y-o.y,dd=hyp(ox,oy)||.01,m=e.r+o.r;if(dd<m){sx+=ox/dd*(m-dd);sy+=oy/dd*(m-dd);if(++cnt>6)return false}});
    e.x+=(ax*sp+sx*7)*dt;e.y+=(ay*sp+sy*7)*dt;e.fr+=dt*(3+sp*.07);
    collide(e,e.r);
    if(useR){if(d<e.r+6)rivalHurt(e.dmg,e.x,e.y)}else if(P.down<=0&&d<e.r+6)dmgP(e.dmg,e.x,e.y);
    if(!useR&&R&&R.down<=0&&hyp(R.x-e.x,R.y-e.y)<e.r+6)rivalHurt(e.dmg*.5,e.x,e.y);
  }
  G.en=G.en.filter(e=>!e.dead);
  if(G.boss&&G.boss.dead)G.boss=null;
  // shots
  for(const b of G.shots){
    if(b.home){const t=nearest(b.x,b.y,140,true);if(t){const a=Math.atan2(b.vy,b.vx),ta=Math.atan2(t.y-b.y,t.x-b.x);let d=ta-a;d=Math.atan2(Math.sin(d),Math.cos(d));const na=a+clamp(d,-4.5*dt,4.5*dt),v=hyp(b.vx,b.vy);b.vx=Math.cos(na)*v;b.vy=Math.sin(na)*v}}
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;b.spin+=dt*12;
    if(b.x<20||b.y<20||b.x>W-20||b.y>H-20||blocked(b.x,b.y)){b.life=0;spark(b.x,b.y,b.col,3,40);continue}
    near(b.x,b.y,b.r+22,e=>{
      if(b.life<=0||b.hitSet.has(e))return;
      if(hyp(e.x-b.x,e.y-b.y)<e.r+b.r){
        b.hitSet.add(e);const vl=hyp(b.vx,b.vy)||1;hit(e,b.d,b.s,false,b.col,b.vx/vl*b.knock,b.vy/vl*b.knock);spark(b.x,b.y,b.col,3,60,{dir:Math.atan2(b.vy,b.vx)});
        if(b.boom){const bx=b.x,by=b.y,bs=b.s,bd=b.d,bc=b.col;later(0,()=>{near(bx,by,32,o=>{if(o!==e&&hyp(o.x-bx,o.y-by)<20+o.r)hit(o,bd*.6,bs,false,bc,(o.x-bx)*3,(o.y-by)*3)});ring(bx,by,22,bc)})}
        if(b.split){const a=Math.atan2(b.vy,b.vx);for(const off of [-.7,.7])shoot(b.x,b.y,a+off,b.s,b.d*.55,{v:200,life:.35,nosplit:true,small:1,hitSet:new Set([e])})}
        if(b.pierce>0)b.pierce--;else b.life=0;
        if(b.life<=0)return false;
      }
    });
  }
  G.shots=G.shots.filter(b=>b.life>0);
  for(const b of G.bombs){b.t+=dt;if(b.t>=b.T){b.dead=1;aoe(b.x,b.y,b.r,b.d,b.s,b.s.els[0]?ELS[b.s.els[0]].col:'#ffd75a',false,{thunder:1});
    if(b.split)for(let i=0;i<3;i++){const a=i/3*TAU+rnd(.5);lob(b.x,b.y,b.x+Math.cos(a)*40,b.y+Math.sin(a)*40,b.s,b.d*.45,b.r*.55,false)}}}
  G.bombs=G.bombs.filter(b=>!b.dead);
  for(const p of G.pools){p.t-=dt;p.tk-=dt;if(p.tk<=0){p.tk=.3;
      near(p.x,p.y,p.r+10,e=>{if(hyp(e.x-p.x,e.y-p.y)<p.r+e.r){hit(e,p.dps*.3,p.s,true,p.col);if(p.slow)e.slow=.8;if(p.zap&&Math.random()<.2)arc(e,p.dps,p.s,1)}});
    }
  }
  G.pools=G.pools.filter(p=>p.t>0);
  for(const b of G.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(P.down<=0&&hyp(b.x-P.x,b.y-P.y+4)<7){dmgP(b.d,b.x-b.vx,b.y-b.vy);b.life=0}
    if(G.rival&&G.rival.down<=0&&hyp(b.x-G.rival.x,b.y-G.rival.y+4)<7){rivalHurt(b.d);b.life=0}
    if(b.x<20||b.y<20||b.x>W-20||b.y>H-20||blocked(b.x,b.y))b.life=0;}
  G.bullets=G.bullets.filter(b=>b.life>0);
  const mag=52*P.mag;
  for(const g of G.gems){const d=hyp(g.x-P.x,g.y-P.y);
    if(g.pull||d<mag){g.pull=1;const s=180+(40-Math.min(d,40))*4;g.x+=(P.x-g.x)/(d||1)*s*dt;g.y+=(P.y-g.y)/(d||1)*s*dt;
      if(d<8){g.dead=1;gainXP(g.v*comboMult());if(typeof SFX!=='undefined'&&!G.auto)SFX.pick(0)}}}
  G.gems=G.gems.filter(g=>!g.dead);
  for(const f of G.fx){f.t-=dt;
    if(f.k==='p'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.95;f.vy*=.95;if(f.h!==undefined){f.h+=(f.vh||0)*dt;if(f.g)f.vh-=170*dt;if(f.h<.6){f.h=.6;f.vh=-(f.vh||0)*.3}}}
    if(f.k==='die'){f.x+=f.kx*dt;f.y+=f.ky*dt;f.kx*=.96;f.ky*=.96;f.h+=f.vh*dt;f.vh-=380*dt;f.rot+=f.rv*dt;if(f.h<0){f.h=0;f.vh=-f.vh*.25;f.rv*=.5}}
  }
  G.fx=G.fx.filter(f=>f.t>0);
  for(const f of G.floats){f.t-=dt;f.y-=16*dt}G.floats=G.floats.filter(f=>f.t>0);
  for(const a of G.arcs)a.t-=dt;G.arcs=G.arcs.filter(a=>a.t>0);
  for(const s of G.shocks)s.t+=dt;G.shocks=G.shocks.filter(s=>s.t<s.T);
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
function bossSlain(e){
  G.bossSlain++;G.bossN++;G.boss=null;G.rerolls+=2;G.goldRun+=100+G.bossN*50;
  G.chests.push({x:e.x,y:e.y,t:0});for(let i=0;i<12;i++){const a=i/12*TAU;G.gems.push({x:e.x+Math.cos(a)*26,y:e.y+Math.sin(a)*26,v:6,big:1})}
  G.slow=Math.max(G.slow,1.2);G.flash=1;trauma(1);shock(e.x,e.y,520,.08,1.2);G.bullets=[];
  if(!G.auto){$('#bossbar').hidden=true;showBanner(e.name+'伏诛',`${e.en} slain · next boss in 4:00`,2.4);if(typeof SFX!=='undefined')SFX.win();if(window.desktop&&G.bossSlain===1)window.desktop.achievement('FIRST_VICTORY')}
}
function win(){if(G.auto)return;closeCards();G.over='win';G.slow=1.6;G.flash=1;trauma(1);shock(G.boss?G.boss.x:G.P.x,G.boss?G.boss.y:G.P.y,520,.08,1.2);later(2.2,()=>showEnd(true));G.bullets=[];G.en.forEach(e=>{if(e.type!=='boss')e.frz=99});showBanner('血魔伏诛','The Patriarch falls',1.8);if(typeof SFX!=='undefined')SFX.win();if(window.desktop)window.desktop.achievement('FIRST_VICTORY')}
function lose(){if(G.auto){newGame(true);demoBoost();return}closeCards();G.over='lose';G.slow=1;later(1.2,()=>showEnd(false));if(typeof SFX!=='undefined')SFX.lose()}
function nextBossIn(){return Math.max(0,(G.bossN+1)*BOSS_AT-G.t)}
function demoBoost(){
  const g=G,C=CLASSES[g.cls],E=['lightning','fire','ice','acid'];g.spells=[C.main,...C.skills].map((id,i)=>({...mkSpell(id),lv:i?6:9,els:[E[i]]}));
  g.t=95;g.P.maxHp=g.P.hp=600;g.lv=16;g.P.regen=30;
  for(let i=0;i<60*12;i++)step(1/60);
}
