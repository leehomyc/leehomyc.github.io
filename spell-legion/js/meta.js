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
  if(done.length){const dk=dayKey();SAVE.streak=SAVE.streak||{last:0,n:0};if(SAVE.streak.last!==dk){const y=new Date();y.setDate(y.getDate()-1);const yk=y.getFullYear()*10000+(y.getMonth()+1)*100+y.getDate();SAVE.streak.n=SAVE.streak.last===yk?SAVE.streak.n+1:1;SAVE.streak.last=dk;if(SAVE.streak.n%7===0){gold+=800;done.push([{id:'streak',goal:7},800])}}}
  const before=accountLv(),xp=runAxp();SAVE.axp=(SAVE.axp||0)+xp;const after=accountLv();
  SAVE.gold+=gold;persist();
  return {done,gold,xp,before,after,levelUp:after.lv>before.lv};
}
/* lobby rendering */
function renderMeta(){
  const el=$('#meta');if(!el)return;const a=accountLv(),t=titleFor(a.lv),list=todayTasks(),st=SAVE.streak&&SAVE.streak.last>=dayKey()-1?SAVE.streak.n:0;
  const tasks=list.map(task=>{const tx=taskText(task),g=TASK_GOLD[task.tier];return `<div class="task${task.done?' done':''}"><span class="ck">${task.done?'✓':'○'}</span><div><b>${tx.zh}</b><small>${tx.en}</small><i><em style="width:${Math.min(100,(task.p||0)/task.goal*100)}%"></em></i></div><span class="rw">${task.done?'已领 '+g:(task.p||0)+'/'+task.goal+' · +'+g+' 金'}</span></div>`}).join('');
  el.innerHTML=`<div class="acc"><div class="lvl"><b>${a.lv}</b><small>江湖等级</small></div><div class="ti"><b>${t[1]} <small>${t[2]}</small></b><i><em style="width:${a.x/a.need*100}%"></em></i><small>${a.x} / ${a.need} 江湖经验 · 每局必得 · XP every run</small></div><div class="stk"><b>${st}</b><small>连续天数 streak</small><small>再 ${7-(st%7)} 天宝箱 +800 金</small></div></div>
  <h2><span>每日任务 Daily tasks</span><b>${list.filter(x=>x.done).length}/3</b></h2><div class="tasks">${tasks}</div>`;
}
