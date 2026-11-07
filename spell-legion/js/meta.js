'use strict';
/* meta.js — progression that outlives a run: account level, daily tasks and duel rank rewards.
   Everything reads/writes SAVE; a cloud account (Firebase) can sync SAVE underneath without touching this file. */

/* ---------- account level ---------- */
const TITLES=[[1,'新手上路','Newcomer'],[3,'小有名气','Known Name'],[6,'一方豪侠','Local Hero'],[10,'名声大噪','Renowned'],[15,'绝世高手','Grandmaster'],[20,'武林盟主','Alliance Chief'],[30,'天下无双','Peerless'],[40,'传说','Legend']];
function axpNeed(lv){return Math.round(120+lv*60+lv*lv*14)}
function accountLv(){let lv=1,x=SAVE.axp||0;while(x>=axpNeed(lv)&&lv<99){x-=axpNeed(lv);lv++}return {lv,x,need:axpNeed(lv)}}
function titleFor(lv){let t=TITLES[0];for(const r of TITLES)if(lv>=r[0])t=r;return t}
/* A run needs a kill, 30 seconds of survival or an earned event before it pays out. */
function earnedRunRewards(){return G.kills>0||G.t>=30||G.bossSlain>0||(G.warlordSlain||0)>0||(G.goldRun||0)>0}
function runAxp(){return earnedRunRewards()?Math.round(G.t*.6+G.kills*.08+G.bossSlain*60+(RIVAL_ON?G.score*.05:0)+G.lv*2):0}

/* ---------- daily tasks ---------- */
/* each template: id, text, goal, how progress is measured (cumulative across runs today, or best single run) */
const TASKS=[
  {id:'kills',zh:'击杀 {n} 名敌人',en:'Kill {n} enemies',goals:[600,1000,1500],cum:1,get:()=>G.kills},
  {id:'boss',zh:'斩杀 {n} 位首领',en:'Slay {n} bosses',goals:[1,2,3],cum:1,get:()=>G.bossSlain},
  {id:'time',zh:'单局存活 {n} 分钟',en:'Survive {n} min',goals:[6,8,12],best:1,get:()=>Math.floor(G.t/60)},
  {id:'combo',zh:'单局连斩 ×{n}',en:'×{n} streak',goals:[50,100,150],best:1,get:()=>G.comboMax},
  {id:'chest',zh:'打开 {n} 个宝箱',en:'Open {n} chests',goals:[4,8,12],cum:1,get:()=>G.chestsOpened||0},
  {id:'relic',zh:'单局集齐 {n} 件法宝',en:'{n} relics in a run',goals:[4,6,8],best:1,get:()=>G.relics.length},
  {id:'level',zh:'单局达到 {n} 级',en:'Reach Lv {n}',goals:[15,20,25],best:1,get:()=>G.lv},
  {id:'pk',zh:'赢下 {n} 场对决',en:'Win {n} duels',goals:[1,1,2],cum:1,get:()=>(G.over==='pk'&&G.rival&&G.score>G.rival.score)?1:0},
  {id:'daily',zh:'每日挑战存活 {n} 分钟',en:'Daily: survive {n} min',goals:[5,8,10],best:1,get:()=>(typeof DAILY!=='undefined'&&DAILY)?Math.floor(G.t/60):0},
  {id:'tier',zh:'在修罗层斩杀 {n} 位首领',en:'{n} bosses on Ascension',goals:[1,2,3],cum:1,get:()=>ASURA_T>=1?G.bossSlain:0},
  {id:'cls',zh:'用 {c} 斩杀一位首领',en:'Slay a boss as the {ce}',goals:[1,1,1],cum:1,cls:1,get:(t)=>G.cls===t.c&&G.bossSlain>0?1:0},
];
const TASK_GOLD=[150,220,320];
function taskSeedRng(seed){let a=seed|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function todayTasks(){
  const dk=dayKey();
  const stale=SAVE.tasks&&SAVE.tasks.list&&SAVE.tasks.list.some(t=>!TASKS.find(x=>x.id===t.id));
  if(!SAVE.tasks||SAVE.tasks.day!==dk||stale){
    const r=taskSeedRng(dk*131+7),pool=TASKS.slice(),out=[];
    const classes=Object.keys(CLASSES);
    for(let i=0;i<3&&pool.length;i++){const easy=['kills','time','level','combo'];let idx=Math.floor(r()*pool.length);if(i===0){const cand=pool.map((t,j)=>easy.includes(t.id)?j:-1).filter(j=>j>=0);idx=cand[Math.floor(r()*cand.length)]} // the first task is always a plain one anyone can finish
      const t=pool.splice(idx,1)[0],tier=i;const task={id:t.id,tier,goal:t.goals[tier],p:0,done:0};if(t.cls){task.c=classes[Math.floor(r()*classes.length)]}out.push(task)}
    SAVE.tasks={day:dk,list:out};persist();
  }
  return SAVE.tasks.list;
}
function taskText(task){const t=TASKS.find(x=>x.id===task.id)||{zh:'—',en:'—'},C=task.c?CLASSES[task.c]:null;return {zh:t.zh.replace('{n}',task.goal).replace('{c}',C?C.zh:''),en:t.en.replace('{n}',task.goal).replace('{ce}',C?C.en:'')}}
/* called once at the end of every run: fold the run into today's tasks, pay out completed ones, grow the account */
function metaAfterRun(){
  if(G.metaReward)return G.metaReward;
  const list=todayTasks(),done=[];let gold=0;
  for(const task of list){if(task.done)continue;const t=TASKS.find(x=>x.id===task.id);let v=0;try{v=t.get(task)||0}catch(_){}
    if(t.cum)task.p=Math.min(task.goal,(task.p||0)+v);else task.p=Math.max(task.p||0,Math.min(task.goal,v));
    if(task.p>=task.goal){task.done=1;const g=TASK_GOLD[task.tier];gold+=g;done.push([task,g])}}
  const before=accountLv(),xp=runAxp();SAVE.axp=(SAVE.axp||0)+xp;const after=accountLv();let lvGold=0;for(let l=before.lv+1;l<=after.lv;l++)lvGold+=100+l*20;gold+=lvGold;
  const duel=runTrophies();const rank=duel?awardDuel(duel):{dT:0,gold:0,ranks:[]};
  SAVE.gold+=gold;persist();
  return G.metaReward={done,gold:gold+rank.gold,xp,before,after,levelUp:after.lv>before.lv,lvGold,dT:rank.dT,trophies:SAVE.trophies||0,ranks:rank.ranks};
}
function renderMeta(){
  const el=$('#meta');if(!el)return;const list=todayTasks();
  el.innerHTML=`<h2><span>${L('每日任务','Daily tasks')}</span><b>${list.filter(x=>x.done).length}/3</b></h2><div class="tasks">${list.map(task=>{const tx=taskText(task),g=TASK_GOLD[task.tier];return `<div class="task${task.done?' done':''}"><span class="ck">${ICON.misc(task.done?'trophy':'scroll',task.done?'#7dffb0':'#efe4cd','sm')}</span><div><b>${L(tx.zh,tx.en)}</b><i><em style="width:${Math.min(100,(task.p||0)/task.goal*100)}%"></em></i></div><span class="rw">${task.done?L('已领 ','claimed ')+g:(task.p||0)+'/'+task.goal+' · +'+g+' '+L('金','gold')}</span></div>`}).join('')}</div>`;
}

/* Duel trophies have exactly one settlement owner per mode. Solo never pays trophies. */
const LADDER=[[0,'青铜','Bronze'],[150,'白银','Silver'],[350,'黄金','Gold'],[600,'铂金','Platinum'],[900,'钻石','Diamond'],[1300,'宗师','Master'],[1800,'传说','Legend']];
const RANK_REWARDS={150:{gold:450},350:{gold:500,rerolls:1},600:{gold:1300},900:{gold:1200},1300:{gold:2000,cores:1},1800:{gold:3500}};
function ladderOf(tr){let l=LADDER[0];for(const r of LADDER)if(tr>=r[0])l=r;return l}
function runTrophies(){
  if(G.abandoned||G.room||!RIVAL_ON||!G.rival)return 0;
  return G.score>G.rival.score?25:G.score===G.rival.score?0:-9;
}
function awardDuel(delta){
  const before=SAVE.trophies||0;SAVE.trophies=Math.max(0,before+delta);SAVE.ladderTs=Date.now();
  SAVE.rankRewards=SAVE.rankRewards||{};SAVE.perks=SAVE.perks||{};let gold=0;const ranks=[];
  for(const [need,zh,en] of LADDER){const rw=RANK_REWARDS[need];if(!rw||SAVE.trophies<need||SAVE.rankRewards[need])continue;
    SAVE.rankRewards[need]=1;gold+=rw.gold;SAVE.perks.rerolls=Math.max(SAVE.perks.rerolls||0,rw.rerolls||0);SAVE.perks.cores=Math.max(SAVE.perks.cores||0,rw.cores||0);ranks.push([need,zh,en]);
  }
  SAVE.gold+=gold;persist();return {dT:SAVE.trophies-before,gold,ranks};
}
function accountBonus(){return Math.min(.3,(accountLv().lv-1)*.01)}
/* Old investments keep their effect; only training has new purchases. Safe to run after every cloud merge. */
function migrateProgression(s=SAVE){
  s.training=s.training||{};for(const [k,v] of Object.entries(s.mer||{}))s.training[k]=Math.max(s.training[k]||0,v||0);
  if(s.mastery){let best=1;for(const v of Object.values(s.mastery)){let x=v,lv=1;while(x>=150+lv*90&&lv<11){x-=150+lv*90;lv++}best=Math.max(best,lv)}let floor=0;for(let lv=1;lv<best;lv++)floor+=axpNeed(lv);s.axp=Math.max(s.axp||0,floor)}
  s.perks=s.perks||{};if(s.road?.[300])s.perks.rerolls=Math.max(s.perks.rerolls||0,1);if(s.road?.[1000])s.perks.cores=Math.max(s.perks.cores||0,1);
  if(!s.rankRewards){s.rankRewards={};for(const [need] of LADDER)if(need&&need<=(s.trophies||0))s.rankRewards[need]=1}
  if(s.weaponTokens){s.gold=(s.gold||0)+s.weaponTokens*500;delete s.weaponTokens}
  for(const k of ['mer','mastery','road','login','first','streak','season'])delete s[k];s.progressionVersion=2;
  return s;
}

/* ---------- codex ---------- */
function codexSee(kind,id){SAVE.codex=SAVE.codex||{en:{},boss:{},relic:{},weapon:{}};const k=SAVE.codex[kind]=SAVE.codex[kind]||{};if(!k[id]){k[id]=1;persist()}}
function renderCodex(){
  const el=$('#codex');if(!el)return;const cx=SAVE.codex||{en:{},boss:{},relic:{},weapon:{}};
  const sec=(title,items)=>{const seen=items.filter(i=>i.seen).length;return `<h2><span>${title}</span><b>${seen}/${items.length}</b></h2><div class="cdx">${items.map(i=>`<div class="ce${i.seen?'':' un'}" style="--c:${i.col||'#efe4cd'}"><span class="g">${i.seen?i.g:'?'}</span><div><b>${i.seen?L(i.zh,i.en):L('未发现','Undiscovered')}</b><small>${i.seen?L(i.d,i.de):(i.hint?L(i.hint[0],i.hint[1]):'')}</small></div></div>`).join('')}</div>`};
  const en=CODEX_ENEMIES.map(e=>{const A=AFFINITY[e.id];return {...e,d:e.d+(A?' 克制:'+A.tip[0]:''),de:e.de+(A?' Counter: '+A.tip[1]:''),seen:!!cx.en[e.id],col:'#ff8e5a'}});
  const bosses=BOSSES.map((b,i)=>({g:'首',zh:b[0],en:b[1],d:BOSS_HINT[i]?BOSS_HINT[i][0]:'',de:BOSS_HINT[i]?BOSS_HINT[i][1]:'',seen:!!cx.boss[i],col:b[2]||'#ff5a5a',hint:[`第 ${i+1} 位首领 · ${(i+1)*4}:00 现身`,`Boss ${i+1} · arrives at ${(i+1)*4}:00`]}));
  const relics=Object.keys(RELICS).map(k=>{const r=RELICS[k];return {g:r.g,zh:r.zh,en:r.en,d:r.d,de:r.de,seen:!!cx.relic[k],col:r.cursed?'#ff3a3a':r.col,hint:r.cursed?['诅咒法宝','Cursed relic']:['精英、统领、宝箱掉落','Drops from elites, the Warlord and chests']}});
  const weapons=[];for(const cls in WEAPONS)for(const w of WEAPONS[cls]){const m=SPELLS[w];weapons.push({g:m.g,zh:m.zh,en:m.en,d:m.d,de:m.de,seen:!!cx.weapon[w],col:m.col,hint:[CLASSES[cls].zh+' 的武器',CLASSES[cls].en+' weapon']})}
  el.innerHTML=sec(L('敌人','Enemies'),en)+sec(L('首领','Bosses'),bosses)+sec(L('法宝','Relics'),relics)+sec(L('武器','Weapons'),weapons);
  const tot=en.length+bosses.length+relics.length+weapons.length,seen=[...en,...bosses,...relics,...weapons].filter(i=>i.seen).length;for(const id of ['#codexcount','#codexcount2']){const cb=$(id);if(cb)cb.textContent=`${seen}/${tot}`}
}
