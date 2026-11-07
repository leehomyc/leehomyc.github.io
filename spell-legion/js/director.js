'use strict';
/* director.js — the AI director: watches how the run is actually going and shapes what comes next.
   It never touches the deterministic modes (daily, PK, rooms). In solo endless and boss rush it:
   - measures tension (HP dips, damage rate, kill rate, output) every 2 s
   - breathes: BUILD (calm) → PRESSURE (push until the player actually dips) → RELIEF (loot) → …
   - sends enemies that counter the current build during pressure, never only more of the same
   - puts a named champion (悬赏) on the field when the build is cruising, and issues optional bounties aimed at what the player is not doing
   - remembers the player across runs (SAVE.skill) so a veteran's first minutes are not a tutorial
   Everything it does is bounded, and anything it does upward is announced by a rule the player can see. */
const DIR_SURNAMES=['黑风寨','断魂崖','血衣楼','铁掌帮','幽冥教','白骨门','飞鹰堡','赤焰谷','青竹帮','玄冰宫'];
const DIR_SURNAMES_EN=['Black Wind Fort','Soulbreak Cliff','Bloodrobe Hall','Iron Palm Gang','Netherworld Sect','Bone Gate','Falcon Keep','Red Flame Gorge','Green Bamboo Gang','Dark Ice Palace'];
const DIR_TITLES=[['独眼刀疤','One-Eyed Scar'],['笑面阎罗','Smiling Reaper'],['千斤锤','Hammerhand'],['夜游神','Night Walker'],['催命符','Death Warrant'],['铁面','Iron Mask'],['无影','Shadowless'],['赤目','Red Eye'],['鬼手','Ghost Hand'],['断江','River Breaker']];
const DIR_AFFIX_ZH={swift:'疾',explode:'爆',armor:'甲'};
const BOUNTIES=[
  {id:'noHit',zh:'无伤 25 秒',en:'No damage for 25 s',t:25,pick:S=>S.dmgRate<.01?0:1,start(){this.base=G.dmgTaken},prog(){return G.dmgTaken-this.base>0?-1:1},done(){return G.dmgTaken-this.base<=0},rw:{kind:'card',q:'epic'},rzh:'史诗卡',ren:'an epic card'},
  {id:'parry',zh:'30 秒内破招 2 次',en:'Parry twice in 30 s',t:30,pick:S=>S.parries<2?2:0,start(){this.base=G.dodges||0},prog(){return Math.min(1,((G.dodges||0)-this.base)/2)},done(){return (G.dodges||0)-this.base>=2},rw:{kind:'reroll',n:2},rzh:'2 次重抽',ren:'2 rerolls'},
  {id:'skillKills',zh:'30 秒内用武学击杀 40 个',en:'40 skill kills in 30 s',t:30,pick:S=>S.actShare<.25?2:0,start(){this.base=G.skillKills||0},prog(){return Math.min(1,((G.skillKills||0)-this.base)/40)},done(){return (G.skillKills||0)-this.base>=40},rw:{kind:'card',q:'rare'},rzh:'稀有卡',ren:'a rare card'},
  {id:'kill',zh:'20 秒内击杀 90 个',en:'90 kills in 20 s',t:20,pick:S=>S.kpm<800?1:0,start(){this.base=G.kills},prog(){return Math.min(1,(G.kills-this.base)/90)},done(){return G.kills-this.base>=90},rw:{kind:'gold',n:60},rzh:'60 金',ren:'60 gold'},
  {id:'elite',zh:'30 秒内击杀 3 个精英',en:'3 elites in 30 s',t:30,pick:S=>S.elitesAlive>=3?2:0,start(){this.base=G.eliteKills||0},prog(){return Math.min(1,((G.eliteKills||0)-this.base)/3)},done(){return (G.eliteKills||0)-this.base>=3},rw:{kind:'relic'},rzh:'一件法宝',ren:'a relic'},
  {id:'streak',zh:'连斩不断 30 秒',en:'Keep the streak alive 30 s',t:30,pick:S=>S.comboNow>=20?1:0,start(){this.c0=G.combo},prog(){return G.combo>0?1:-1},done(){return G.combo>0},rw:{kind:'card',q:'epic'},rzh:'史诗卡',ren:'an epic card'},
];
function dirOn(){if(typeof window!=='undefined'&&window.__nodir)return false;return !!G&&!G.auto&&!G.over&&!RIVAL_ON&&!G.room&&!(typeof DAILY!=='undefined'&&DAILY)}
function dirInit(){const skill=(typeof SAVE!=='undefined'&&SAVE.skill)||0,solo=SAVE.mode==='solo',base=(solo?1.15:.9)+skill*.45;G.dir={spawn:1,hp:1,dmg:1,elite:1,heal:1,counter:null,counterP:0,mood:'build',moodT:35,I:base,base,base0:base,lowHp:1,lastLow:0,peaks:0,champs:0,bounties:0,bountiesTried:0,hist:[]};G.dirStat={dmgRate:0,kpm:0,actShare:0,parries:0,elitesAlive:0,comboNow:0};G.dirT=0}
function dirMeasure(){const P=G.P,D=G.dir,S=G.dirStat,t=G.t;
  const r=P.hp/P.maxHp,casts=G.spells.filter(s=>!SPELLS[s.id]?.auto).reduce((n,s)=>n+(s.casts||0),0);D.hist.push({t,r,taken:G.dmgTaken,kills:G.kills,dodges:G.dodges||0,casts});while(D.hist.length&&D.hist[0].t<t-60)D.hist.shift();
  const h0=D.hist[0],h30=D.hist.find(h=>h.t>=t-30)||h0;D.lowHp=Math.min(...D.hist.map(h=>h.r));
  S.dmgRate=(G.dmgTaken-h30.taken)/Math.max(1,t-h30.t)/P.maxHp;S.kpm=(G.kills-h0.kills)/Math.max(1,t-h0.t)*60;S.parries=(G.dodges||0)-h0.dodges;S.casts30=casts-(h30.casts||0);
  const tot=G.spells.reduce((a,s)=>a+s.dmg,0)||1;S.actShare=G.spells.filter(s=>!SPELLS[s.id].auto).reduce((a,s)=>a+s.dmg,0)/tot;S.elitesAlive=G.en.filter(e=>!e.dead&&e.elite).length;S.comboNow=G.combo;
  if(r<.55)D.lastLow=t;
  D.posHist=(D.posHist||[]).concat([{t,x:P.x,y:P.y}]).filter(h=>h.t>=t-8);const p0=D.posHist[0];S.still=p0?hyp(P.x-p0.x,P.y-p0.y)<40&&(t-p0.t)>=6:false;
}
/* which monster the current build handles worst: the type whose resistance matches the category carrying the damage */
function dirCounter(){const tot=G.spells.reduce((a,s)=>a+s.dmg,0)||1;const by={};for(const s of G.spells){const c=SKILL_CAT[s.id]||'passive';by[c]=(by[c]||0)+s.dmg/tot}const main=Object.keys(by).sort((a,b)=>by[b]-by[a])[0];
  const cands=Object.keys(AFFINITY).filter(k=>{const A=AFFINITY[k]||{};return A.resist&&(A.resist.cat===main||(A.resist.auto&&main==='melee'&&G.spells[0].dmg/tot>.5))&&ETYPES[k]});if(!cands.length)return null;const t=G.t;return pick(cands.filter(k=>k!=='giant'||t>150))||null}
function dirChampion(){const D=G.dir,P=G.P;if(G.en.some(e=>e.champion&&!e.dead)||G.boss||G.t-(D.lastChamp||-999)<90)return;D.lastChamp=G.t;const i=Math.floor(rnd(DIR_SURNAMES.length)),j=Math.floor(rnd(DIR_TITLES.length)),ty=D.counter||pick(['giant','brute','bandit','archer']);const o=edgePoint();
  spawnEnemy(ty,o.x,o.y,3+G.t/240,true);const e=G.en[G.en.length-1];e.champion=1;e.sc=(e.sc||1)*1.25;e.r*=1.15;e.spd*=1.12;e.affix=pick(['swift','explode','armor']);e.affix2=pick(['swift','explode','armor'].filter(a=>a!==e.affix));if(e.affix==='armor'||e.affix2==='armor'){e.hp*=1.5;e.maxHp=e.hp}if(e.affix==='swift'||e.affix2==='swift')e.spd*=1.3;
  e.hp=e.maxHp=Math.max(e.hp,powerHp(6));e.name=`${DIR_SURNAMES[i]}·${DIR_TITLES[j][0]}`;e.en=`${DIR_TITLES[j][1]} of ${DIR_SURNAMES_EN[i]}`;e.bounty=Math.round(40+G.t/20);D.champs++;
  showBanner(`悬赏 · ${e.name}`,`Bounty: ${e.en} · ${DIR_AFFIX_ZH[e.affix]}${DIR_AFFIX_ZH[e.affix2]}`,2.2);if(typeof SFX!=='undefined')SFX.roar()}
function dirChampionSlain(e){const D=G.dir||{};G.goldRun+=e.bounty||40;G.rerolls++;dropRelic(e.x,e.y);G.champSlain=(G.champSlain||0)+1;if(typeof showSide==='function')showSide(`悬赏达成 · ${e.name} · +${e.bounty} 金 · 法宝落地`,`Bounty claimed: ${e.en} · +${e.bounty} gold · relic dropped`,'#ffd27a','trophy');if(typeof SFX!=='undefined')SFX.complete();
  if(typeof SAVE!=='undefined'){SAVE.bountyNames=SAVE.bountyNames||[];if(!SAVE.bountyNames.includes(e.name))SAVE.bountyNames.push(e.name)}}
function dirBounty(){const D=G.dir,S=G.dirStat;if(G.bounty||G.mission||G.boss||G.trib)return;const fails=G.bountyFails||{};const scored=BOUNTIES.map(b=>({b,w:b.pick(S)+rnd(.6)-(fails[b.id]||0)*.7})).filter(x=>x.w>0).sort((a,b)=>b.w-a.w);if(!scored.length)return;const b=scored[0].b;
  G.bounty={id:b.id,def:b,t:b.t,T:b.t};b.start();D.bountiesTried++;showBanner(`挑战 · ${b.zh} → ${b.rzh}`,`Challenge: ${b.en} → ${b.ren}`,2);if(typeof SFX!=='undefined')SFX.pick(1)}
function dirBountyTick(dt){const B=G.bounty;if(!B)return;B.t-=dt;const d=B.def;const ok=d.done(),fail=d.prog()<0;
  if(fail||(B.t<=0&&!ok)){G.bounty=null;G.bountyFails=G.bountyFails||{};G.bountyFails[B.id]=(G.bountyFails[B.id]||0)+1;showBanner('挑战失败 · 下次再来','Challenge missed · next time',1.1);return}
  if(ok&&(B.t<=0||['parry','skillKills','kill','elite'].includes(B.id))){G.bounty=null;G.dir.bounties++;G.bountyDone=(G.bountyDone||0)+1;const rw=d.rw;
    if(rw.kind==='card'){G.picks.push({kind:'level',forceQ:rw.q});G.pickHold=1}else if(rw.kind==='reroll')G.rerolls+=rw.n;else if(rw.kind==='gold')G.goldRun+=rw.n;else if(rw.kind==='relic')dropRelic(G.P.x+30,G.P.y);
    showBanner(`挑战达成 · ${d.rzh}`,`Challenge done · ${d.ren}`,1.6);G.flash=Math.max(G.flash,.4);if(typeof SFX!=='undefined')SFX.complete()}}
function bountyText(){const B=G.bounty;if(!B)return '';const p=B.def.prog();return L(`挑战 · ${B.def.zh} · ${Math.ceil(B.t)}s${p>=0&&p<1&&!['noHit','streak'].includes(B.id)?` · ${Math.round(p*100)}%`:''}`,`Challenge · ${B.def.en} · ${Math.ceil(B.t)}s${p>=0&&p<1&&!['noHit','streak'].includes(B.id)?` · ${Math.round(p*100)}%`:''}`)}
function directorTick(dt){if(!dirOn())return;if(!G.dir)dirInit();const D=G.dir,t=G.t;dirBountyTick(dt);
  G.dirT=(G.dirT||0)+dt;if(G.dirT<2)return;G.dirT-=2;dirMeasure();const S=G.dirStat,P=G.P;
  D.moodT-=2;const inBoss=!!G.boss;
  if(D.mood==='build'){ // calm: ease toward the baseline, let the build breathe
    D.I+=(D.base-D.I)*.25;D.counterP=0;if(D.moodT<=0&&t>(SAVE.mode==='solo'?100:150)&&!inBoss){D.mood='pressure';D.moodT=40;D.counter=dirCounter();D.counterP=.35;D.pushed=0}}
  else if(D.mood==='pressure'){ // push until the player actually dips, then let go
    D.pushed+=2;if(D.lowHp>.6&&S.dmgRate<.02)D.I=Math.min(D.base*2.6,D.I*1.09);
    const dipped=(t-D.lastLow)<4;if(dipped||D.moodT<=0||inBoss){D.mood='relief';D.moodT=dipped?16:10;if(dipped){D.peaks++;D.base=Math.max(D.base0*.8,D.base*.97)}else if(!inBoss)D.base=Math.min(D.base0*1.8,D.base*1.07)} // a push that never lands raises the baseline for the next one; a real dip relaxes it a little
    if(D.pushed>=18&&D.lowHp>.75&&S.dmgRate<.01&&t>120&&!G.en.some(e=>e.champion&&!e.dead))dirChampion();
    if(D.pushed===10&&!G.bounty&&rnd()<.7)dirBounty();}
  else { // relief: a breather with something to pick up, then rebuild
    D.I=Math.max(D.base*.8,D.I*.9);D.counterP=0;if(D.moodT<=0){D.mood='build';D.moodT=30+rnd(25)}}
  const solo=SAVE.mode==='solo',idle=solo&&S.still&&t>30,noSkills=solo&&t>60&&S.casts30===0;
  if(D.lowHp<.2&&!(idle||noSkills))D.I=Math.min(D.I,D.base*.85); // active players still get a short near-death breather
  const early=clamp((t-120)/360,0,1);D.I=clamp(D.I,D.base*.75,D.base*(1+1.6*early)); // the first minutes belong to the build: the director only starts leaning in after 2 min and reaches full reach at 8
  if(t<120)D.I=Math.min(D.I,SAVE.mode==='solo'?1.2:1);
  if(idle||S.still&&t>150){D.counter=t>210&&rnd()<.4?'bomber':'archer';D.counterP=Math.max(D.counterP,idle?.65:.5)} // ranged pressure makes movement and dash matter
  D.spawn=D.mood==='pressure'?Math.min(1.6,D.I):D.mood==='relief'?.7:Math.min(1.15,D.I);D.hp=clamp(Math.pow(D.I,.4),.8,1.35);D.dmg=clamp(Math.pow(D.I,.45),.8+(SAVE.mode==='solo'?.12:0),1+.5*early+(SAVE.mode==='solo'?.12:0));D.elite=clamp(D.I,.8,1+1.2*early+(SAVE.mode==='solo'?.15:0));D.heal=D.mood==='pressure'?1.6:1;
  if(idle)D.spawn*=1.2;
  if(noSkills){D.spawn*=1.12;D.dmg*=1.08}
}
/* across runs: a veteran's director starts hotter; a player who keeps dying gets a gentler start */
function dirRunEnd(){if(!G||!G.dir||typeof SAVE==='undefined'||RIVAL_ON||G.room)return;const mins=G.t/60,died=!!G.killer;let s=SAVE.skill||0;const target=clamp((mins-6)/24+(G.bossSlain*.04)-(died&&mins<8?.15:0),0,1);s+=(target-s)*.35;SAVE.skill=clamp(s,0,1);SAVE.dirPeaks=(SAVE.dirPeaks||0)+(G.dir.peaks||0)}
