'use strict';
/* meta.js — progression that outlives a run: account level + titles, daily tasks, streak chest.
   Everything reads/writes SAVE; a cloud account (Firebase) can sync SAVE underneath without touching this file. */

/* ---------- account level ---------- */
const TITLES=[[1,'初入江湖','Newcomer'],[3,'小有名气','Known Name'],[6,'一方豪侠','Local Hero'],[10,'名震江湖','Renowned'],[15,'绝世高手','Grandmaster'],[20,'武林盟主','Alliance Chief'],[30,'天下无双','Peerless'],[40,'传说','Legend']];
function axpNeed(lv){return Math.round(120+lv*60+lv*lv*14)}
function accountLv(){let lv=1,x=SAVE.axp||0;while(x>=axpNeed(lv)&&lv<99){x-=axpNeed(lv);lv++}return {lv,x,need:axpNeed(lv)}}
function titleFor(lv){let t=TITLES[0];for(const r of TITLES)if(lv>=r[0])t=r;return t}
/* XP for a run: time, kills, bosses, score; every run pays something, so a lost run still moves the account forward */
function runAxp(){return Math.round(G.t*.6+G.kills*.08+G.bossSlain*60+(RIVAL_ON?G.score*.05:0)+G.lv*2)}

/* ---------- daily tasks ---------- */
/* each template: id, text, goal, how progress is measured (cumulative across runs today, or best single run) */
const TASKS=[
  {id:'kills',zh:'击杀 {n} 名敌人',en:'Kill {n} enemies',goals:[600,1000,1500],cum:1,get:()=>G.kills},
  {id:'boss',zh:'斩杀 {n} 位首领',en:'Slay {n} bosses',goals:[1,2,3],cum:1,get:()=>G.bossSlain},
  {id:'time',zh:'单局存活 {n} 分钟',en:'Survive {n} minutes in one run',goals:[6,8,12],best:1,get:()=>Math.floor(G.t/60)},
  {id:'combo',zh:'单局连斩 ×{n}',en:'Reach a ×{n} streak',goals:[50,100,150],best:1,get:()=>G.comboMax},
  {id:'chest',zh:'打开 {n} 个宝箱',en:'Open {n} chests',goals:[4,8,12],cum:1,get:()=>G.chestsOpened||0},
  {id:'relic',zh:'单局集齐 {n} 件法宝',en:'Hold {n} relics in one run',goals:[4,6,8],best:1,get:()=>G.relics.length},
  {id:'level',zh:'单局达到 {n} 级',en:'Reach level {n} in one run',goals:[15,20,25],best:1,get:()=>G.lv},
  {id:'pk',zh:'赢下 {n} 场对决',en:'Win {n} PK matches',goals:[1,1,2],cum:1,get:()=>(G.over==='pk'&&G.rival&&G.score>G.rival.score)?1:0},
  {id:'daily',zh:'每日挑战存活 {n} 分钟',en:'Survive {n} minutes in the daily challenge',goals:[5,8,10],best:1,get:()=>(typeof DAILY!=='undefined'&&DAILY)?Math.floor(G.t/60):0},
  {id:'tier',zh:'在修罗层斩杀 {n} 位首领',en:'Slay {n} bosses on an Ascension tier',goals:[1,2,3],cum:1,get:()=>ASURA_T>=1?G.bossSlain:0},
  {id:'rush',zh:'首领连战中斩杀 {n} 位首领',en:'Slay {n} bosses in Boss rush',goals:[2,3,4],best:1,get:()=>BOSSRUSH?G.bossSlain:0},
  {id:'cls',zh:'用 {c} 斩杀一位首领',en:'Slay a boss as the {ce}',goals:[1,1,1],cum:1,cls:1,get:(t)=>G.cls===t.c&&G.bossSlain>0?1:0},
];
const TASK_GOLD=[150,220,320];
function taskSeedRng(seed){let a=seed|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function todayTasks(){
  const dk=dayKey();
  if(!SAVE.tasks||SAVE.tasks.day!==dk){
    const r=taskSeedRng(dk*131+7),pool=TASKS.slice(),out=[];
    const classes=Object.keys(CLASSES);
    for(let i=0;i<3&&pool.length;i++){const easy=['kills','time','level','combo'];let idx=Math.floor(r()*pool.length);if(i===0){const cand=pool.map((t,j)=>easy.includes(t.id)?j:-1).filter(j=>j>=0);idx=cand[Math.floor(r()*cand.length)]} // the first task is always a plain one anyone can finish
      const t=pool.splice(idx,1)[0],tier=i;const task={id:t.id,tier,goal:t.goals[tier],p:0,done:0};if(t.cls){task.c=classes[Math.floor(r()*classes.length)]}out.push(task)}
    SAVE.tasks={day:dk,list:out};persist();
  }
  return SAVE.tasks.list;
}
function taskText(task){const t=TASKS.find(x=>x.id===task.id),C=task.c?CLASSES[task.c]:null;return {zh:t.zh.replace('{n}',task.goal).replace('{c}',C?C.zh:''),en:t.en.replace('{n}',task.goal).replace('{ce}',C?C.en:'')}}
/* called once at the end of every run: fold the run into today's tasks, pay out completed ones, grow the account */
function metaAfterRun(){
  const list=todayTasks(),done=[];let gold=0;
  for(const task of list){if(task.done)continue;const t=TASKS.find(x=>x.id===task.id);let v=0;try{v=t.get(task)||0}catch(_){}
    if(t.cum)task.p=Math.min(task.goal,(task.p||0)+v);else task.p=Math.max(task.p||0,Math.min(task.goal,v));
    if(task.p>=task.goal){task.done=1;const g=TASK_GOLD[task.tier];gold+=g;done.push([task,g])}}
  // streak: a day counts once any task is completed
  if(done.length){const dk=dayKey();SAVE.streak=SAVE.streak||{last:0,n:0};if(SAVE.streak.last!==dk){SAVE.streak.n=SAVE.streak.last===yesterdayKey()?SAVE.streak.n+1:1;SAVE.streak.last=dk;if(SAVE.streak.n%7===0){gold+=800;done.push([{id:'streak',goal:7},800])}}}
  const before=accountLv(),xp=runAxp();SAVE.axp=(SAVE.axp||0)+xp;const after=accountLv();let lvGold=0;for(let l=before.lv+1;l<=after.lv;l++)lvGold+=100+l*20;gold+=lvGold;
  // first win / first run of the day pays double gold
  const dk=dayKey();SAVE.first=SAVE.first||{};let firstBonus=null;
  if(!G.abandoned){if(RIVAL_ON&&G.rival&&G.score>G.rival.score&&SAVE.first.pk!==dk){SAVE.first.pk=dk;firstBonus='pk'}else if(!RIVAL_ON&&SAVE.first.run!==dk&&G.t>=120){SAVE.first.run=dk;firstBonus='run'}}
  // trophies and the road
  const tr0=SAVE.trophies||0,dT=runTrophies();SAVE.trophies=Math.max(0,tr0+dT);SAVE.season=SAVE.season||{id:seasonKey(),peak:0};SAVE.season.peak=Math.max(SAVE.season.peak||0,SAVE.trophies);
  const road=[];SAVE.road=SAVE.road||{};for(const [need,rw,zh,en] of TROPHY_ROAD){if(SAVE.trophies>=need&&!SAVE.road[need]){SAVE.road[need]=1;if(rw.gold)gold+=rw.gold;if(rw.title)SAVE.titles=[...(SAVE.titles||[]),rw.title];if(rw.weaponToken)SAVE.weaponTokens=(SAVE.weaponTokens||0)+1;road.push([need,zh,en])}}
  // hero mastery
  SAVE.mastery=SAVE.mastery||{};const m0=mastery(G.cls);SAVE.mastery[G.cls]=(SAVE.mastery[G.cls]||0)+Math.round(xp*.8);const m1=mastery(G.cls);
  SAVE.gold+=gold;persist();
  return {done,gold,xp,before,after,levelUp:after.lv>before.lv,lvGold,dT,trophies:SAVE.trophies,road,firstBonus,mastery:m1,masteryUp:m1.lv>m0.lv};
}
/* lobby rendering */
function renderMeta(){
  const el=$('#meta');if(!el)return;const a=accountLv(),t=titleFor(a.lv),list=todayTasks(),st=SAVE.streak&&(SAVE.streak.last===dayKey()||SAVE.streak.last===yesterdayKey())?SAVE.streak.n:0;
  const tasks=list.map(task=>{const tx=taskText(task),g=TASK_GOLD[task.tier];return `<div class="task${task.done?' done':''}"><span class="ck">${task.done?ICON.misc('trophy','#7dffb0','sm'):ICON.misc('scroll','#efe4cd','sm')}</span><div><b>${L(tx.zh,tx.en)}</b><i><em style="width:${Math.min(100,(task.p||0)/task.goal*100)}%"></em></i></div><span class="rw">${task.done?L('已领 ','claimed ')+g:(task.p||0)+'/'+task.goal+' · +'+g+' '+L('金','gold')}</span></div>`}).join('');
  el.innerHTML=`<div class="acc"><div class="lvl"><b>${a.lv}</b><small>${L('江湖等级','Rank')}</small></div><div class="ti"><b>${L(t[1],t[2])}</b><i><em style="width:${a.x/a.need*100}%"></em></i><small>${a.x} / ${a.need} ${L('江湖经验 · 每局必得','renown · earned every run')}</small></div><div class="stk"><b>${st}</b><small>${L('连续天数','day streak')}</small><small>${L(`再 ${7-(st%7)} 天宝箱 +800 金`,`chest +800 gold in ${7-(st%7)} days`)}</small></div></div>
  <h2><span>${L('每日任务','Daily tasks')}</span><b>${list.filter(x=>x.done).length}/3</b></h2><div class="tasks">${tasks}</div>
  ${(()=>{const tr=SAVE.trophies||0,lad=ladderOf(tr),next=TROPHY_ROAD.find(r=>!(SAVE.road||{})[r[0]]),prev=TROPHY_ROAD.filter(r=>(SAVE.road||{})[r[0]]).slice(-1)[0],lo=prev?prev[0]:0,hi=next?next[0]:lo||1;
    const ev=todayEvent(),lg=SAVE.login||{n:0},ms=Object.keys(CLASSES).map(k=>{const mm=mastery(k);return `<span class="ms" style="--c:${CLASSES[k].col}"><b>${CLASSES[k].g}</b> ${mm.lv}</span>`}).join('');
    return `<h2 style="margin-top:10px"><span>🏆 ${L('奖杯之路','Trophy road')}</span><b>${tr}</b></h2>
    <div class="road"><div class="lad"><b>${L(lad[1],lad[2])}</b><small>${L('段位','League')} · ${L(`赛季还剩 ${seasonDaysLeft()} 天`,`${seasonDaysLeft()} days left in the season`)}</small></div><div class="bar"><i><em style="width:${Math.min(100,(tr-lo)/Math.max(1,hi-lo)*100)}%"></em></i><small>${next?L(`下一奖励 ${next[0]} 🏆:${next[2]}`,`next at ${next[0]} 🏆: ${next[3]}`):L('奖杯之路已走完','Trophy road complete')}</small></div></div>
    <div class="dailyrow"><div class="ev"><b>${L('今日活动','Today\'s event')}</b><span>${L(ev.zh,ev.en)}</span><small>${L('单人模式自动生效 · 金币 +50%','Applies to Solo · +50% gold')}</small></div><div class="ev"><b>${L('登录签到','Login calendar')}</b><span>${LOGIN_GOLD.map((g,i)=>`<i class="${i<(lg.n-1)%7+1?'got':''}">${g}</i>`).join('')}</span><small>${L(`连续 ${lg.n||0} 天 · 每日首胜金币翻倍`,`${lg.n||0} days in a row · first win of the day pays double`)}</small></div></div>
    <div class="masteryrow"><b>${L('英雄熟练度','Hero mastery')}</b>${ms}<small>${L('每级 +1% 伤害(至 10 级)','+1% damage per level, up to 10')}</small></div>`})()}`;
}

/* ---------- trophies (奖杯) and the trophy road ---------- */
const TROPHY_ROAD=[
  [50,{gold:150},'金 150','150 gold'],[120,{title:'初露锋芒'},'称号:初露锋芒','Title: First Edge'],[200,{gold:300},'金 300','300 gold'],[300,{rerolls:1},'每局 +1 重抽','+1 reroll every run'],
  [420,{gold:500},'金 500','500 gold'],[550,{weaponToken:1},'任意一把武器免费解锁','Unlock any weapon for free'],[700,{gold:800},'金 800','800 gold'],[850,{title:'江湖名宿'},'称号:江湖名宿','Title: Veteran'],
  [1000,{core:1},'每局 +1 复生核心','+1 Revive Core every run'],[1200,{gold:1200},'金 1200','1200 gold'],[1500,{title:'一代宗师'},'称号:一代宗师','Title: Grandmaster of an Age'],[2000,{gold:2500},'金 2500','2500 gold'],
];
function seasonKey(){const d=tzDate();return d.getUTCFullYear()*100+(d.getUTCMonth()+1)}
function seasonDaysLeft(){const d=tzDate();const end=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1);return Math.max(1,Math.ceil((end-(d.getTime()))/86400000))}
/* a new month: trophies above 600 are halved back toward 600 (soft reset), the peak pays season gold */
function seasonTick(){const sk=seasonKey();SAVE.season=SAVE.season||{id:sk,peak:0};if(SAVE.season.id!==sk){const tr=SAVE.trophies||0,peak=Math.max(SAVE.season.peak||0,tr),reward=Math.round(peak*.8);SAVE.gold+=reward;SAVE.trophies=tr>600?600+Math.round((tr-600)/2):tr;SAVE.season={id:sk,peak:0,last:{peak,reward}};persist();return {peak,reward}}return null}
function runTrophies(){
  if(G.abandoned)return 0;const mins=G.t/60;
  if(RIVAL_ON&&G.rival){const win=G.score>G.rival.score,tie=G.score===G.rival.score;const base=G.quick?25:35;return win?base+Math.min(15,Math.floor((G.score-G.rival.score)/400)):tie?5:-Math.min(12,Math.max(4,Math.round(base*.35)))}
  if(BOSSRUSH)return Math.round(G.bossSlain*18+mins*2);
  return Math.round(mins*3+G.bossSlain*20+ASURA_T*8+(typeof DAILY!=='undefined'&&DAILY?10:0));
}
/* ---------- hero mastery: per-hero XP, +1% damage per level (to 10), a title at 10 ---------- */
function masteryNeed(lv){return 150+lv*90}
function mastery(cls){let x=(SAVE.mastery||{})[cls]||0,lv=1;while(x>=masteryNeed(lv)&&lv<20){x-=masteryNeed(lv);lv++}return {lv,x,need:masteryNeed(lv)}}
function masteryBonus(cls){return Math.min(10,mastery(cls).lv-1)*.01}
/* ---------- login calendar: 7 escalating days, resets if a day is missed ---------- */
const LOGIN_GOLD=[60,80,100,140,180,240,400];
function loginTick(){const dk=dayKey();SAVE.login=SAVE.login||{last:0,n:0};if(SAVE.login.last===dk)return null;SAVE.login.n=SAVE.login.last===yesterdayKey()?SAVE.login.n+1:1;SAVE.login.last=dk;const g=LOGIN_GOLD[(SAVE.login.n-1)%7];SAVE.gold+=g;persist();return {day:SAVE.login.n,gold:g}}
/* ---------- today's event: one rotating modifier for Solo, +50% gold ---------- */
const EVENTS=[
  {id:'elites',zh:'精英之日:精英翻倍,法宝掉落 +50%',en:'Elite Day: twice the elites, +50% relic drops',apply(){G.ev={elite:2,relic:1.5}}},
  {id:'haste',zh:'疾风之日:冷却减半,敌人移速 +15%',en:'Haste Day: cooldowns halved, enemies +15% speed',apply(){G.P.haste*=2;G.curse.spd=1.15}},
  {id:'glass',zh:'琉璃之日:伤害 +50%,生命上限 -30%',en:'Glass Day: +50% damage, −30% max HP',apply(){G.P.dmgBonus+=.5;G.P.maxHp=Math.round(G.P.maxHp*.7);G.P.hp=G.P.maxHp}},
  {id:'rich',zh:'财运之日:宝箱翻倍,金币 +50%',en:'Fortune Day: twice the chests, +50% gold',apply(){G.ev={chest:2}}},
  {id:'swarm',zh:'群魔之日:怪潮 +40%,经验 +40%',en:'Swarm Day: +40% spawns, +40% XP',apply(){G.curse.spawn=1.4;G.ev={xp:1.4}}},
  {id:'boss',zh:'首领之日:首领每三分钟一位,首领金币翻倍',en:'Boss Day: a boss every three minutes, boss gold doubled',apply(){G.ev={bossEvery:180,bossGold:2}}},
  {id:'crit',zh:'要害之日:暴击 +30%,受到伤害 +15%',en:'Vital Day: +30% crit, +15% damage taken',apply(){G.P.crit+=.3;G.P.def*=1.15}},
];
function todayEvent(){return EVENTS[dayKey()%EVENTS.length]}
/* ---------- quick PK ladder: the AI rival scales with your trophies ---------- */
const LADDER=[[0,'青铜','Bronze'],[150,'白银','Silver'],[350,'黄金','Gold'],[600,'铂金','Platinum'],[900,'钻石','Diamond'],[1300,'宗师','Master'],[1800,'传说','Legend']];
function ladderOf(tr){let l=LADDER[0];for(const r of LADDER)if(tr>=r[0])l=r;return l}

/* ---------- codex ---------- */
function codexSee(kind,id){SAVE.codex=SAVE.codex||{en:{},boss:{},relic:{},weapon:{}};const k=SAVE.codex[kind]=SAVE.codex[kind]||{};if(!k[id]){k[id]=1;persist()}}
function renderCodex(){
  const el=$('#codex');if(!el)return;const cx=SAVE.codex||{en:{},boss:{},relic:{},weapon:{}};
  const sec=(title,items)=>{const seen=items.filter(i=>i.seen).length;return `<h2><span>${title}</span><b>${seen}/${items.length}</b></h2><div class="cdx">${items.map(i=>`<div class="ce${i.seen?'':' un'}" style="--c:${i.col||'#efe4cd'}"><span class="g">${i.seen?i.g:'?'}</span><div><b>${i.seen?L(i.zh,i.en):L('未遇见','Not yet met')}</b><small>${i.seen?L(i.d,i.de):(i.hint?L(i.hint[0],i.hint[1]):'')}</small></div></div>`).join('')}</div>`};
  const en=CODEX_ENEMIES.map(e=>{const A=AFFINITY[e.id];return {...e,d:e.d+(A?' 克制:'+A.tip[0]:''),de:e.de+(A?' Counter: '+A.tip[1]:''),seen:!!cx.en[e.id],col:'#ff8e5a'}});
  const bosses=BOSSES.map((b,i)=>({g:'首',zh:b[0],en:b[1],d:BOSS_HINT[i]?BOSS_HINT[i][0]:'',de:BOSS_HINT[i]?BOSS_HINT[i][1]:'',seen:!!cx.boss[i],col:b[2]||'#ff5a5a',hint:[`第 ${i+1} 位首领 · ${(i+1)*4}:00 现身`,`Boss ${i+1} · arrives at ${(i+1)*4}:00`]}));
  const relics=Object.keys(RELICS).map(k=>{const r=RELICS[k];return {g:r.g,zh:r.zh,en:r.en,d:r.d,de:r.de,seen:!!cx.relic[k],col:r.cursed?'#ff3a3a':r.col,hint:r.cursed?['诅咒法宝','Cursed relic']:['精英、统领、宝箱掉落','Drops from elites, the Warlord and chests']}});
  const weapons=[];for(const cls in WEAPONS)for(const w of WEAPONS[cls]){const m=SPELLS[w];weapons.push({g:m.g,zh:m.zh,en:m.en,d:m.d,de:m.de,seen:!!cx.weapon[w],col:m.col,hint:[CLASSES[cls].zh+' 的武器',CLASSES[cls].en+' weapon']})}
  el.innerHTML=sec(L('敌人','Enemies'),en)+sec(L('首领','Bosses'),bosses)+sec(L('法宝','Relics'),relics)+sec(L('武器','Weapons'),weapons);
  const tot=en.length+bosses.length+relics.length+weapons.length,seen=[...en,...bosses,...relics,...weapons].filter(i=>i.seen).length;const cb=$('#codexcount');if(cb)cb.textContent=`${seen}/${tot}`;
}
