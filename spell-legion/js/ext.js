'use strict';
/* ext.js — hook registry for the systems layered on top of the core sim (gear, build, world, social).
   sim.js / render.js / ui.js call onHitX / onKillX / onHurtX / extTick / extRender / cardDecor once each;
   every extension registers handlers here instead of editing the core files. */
const XH={hit:[],damage:[],kill:[],hurt:[],tick:[],render:[],start:[],end:[],card:[],fire:[],cast:[]};
const xOn=(k,f)=>XH[k].push(f);
/* player-side damage multiplier and side effects on every hit the player deals */
function onHitX(e,m,s,crit,noEl){for(const f of XH.hit){const r=f(e,m,s,crit,noEl);if(typeof r==='number')m=r}return m}
function onDamageX(e,n,s){for(const f of XH.damage)f(e,n,s)}
function onKillX(e,s){if(s&&s.owner==='rival')return;for(const f of XH.kill)f(e,s)}
function onHurtX(n,src,fx,fy){for(const f of XH.hurt){const r=f(n,src,fx,fy);if(typeof r==='number')n=r;if(n<=0)return 0}return n}
function extTick(dt){if(!G||G.auto)return;if(!G.xStarted){G.xStarted=1;for(const f of XH.start)try{f()}catch(err){console.error(err)}}for(const f of XH.tick)f(dt)}
function extRender(tm,ur){if(!G)return;for(const f of XH.render)f(tm,ur)}
function cardDecor(b,cd,i,q){for(const f of XH.card)f(b,cd,i,q)}
/* solo endless (and boss rush): the mode where the long-term systems (gear, training, variants unlock pacing) live */
function soloRun(){return !!G&&!G.auto&&!RIVAL_ON&&!G.room&&!(typeof DAILY!=='undefined'&&DAILY)&&!G.shared}
/* every normal-attack shot and every skill cast passes through here, so variants / legendaries can react to "it fired" */
(()=>{const af=autoFire;autoFire=function(s){const r=af(s);if(r&&G&&!G.auto&&s&&s.owner!=='rival'&&!G._xfire&&!G._free){G._xfire=1;try{for(const f of XH.fire)f(s)}finally{G._xfire=0}}return r};
  const cs=castSkill;castSkill=function(i){const r=cs(i);if(r&&G&&!G.auto&&!G._xcast&&!G._free){G._xcast=1;try{for(const f of XH.cast)f(G.spells[i],i)}finally{G._xcast=0}}return r}})();
/* fire a skill again for free (echoes, bond procs): no qi, no cooldown change, scaled damage */
function freeFire(s,mult){if(!s||!G||G.over)return;const i=G.spells.indexOf(s);if(i<0)return;const P=G.P,cd=s.cd,mana=P.mana,vm=s.vm,casts=s.casts;s.vm=(vm||1)*mult;s.cd=0;G._free=1;
  try{if(SPELLS[s.id].auto)autoFire(s);else{P.mana=1e9;castSkill(i)}}finally{s.vm=vm;s.cd=cd;P.mana=mana;s.casts=casts;G._free=0}}
/* a little CSS injected once, so the extensions don't need their own stylesheet request */
function xCss(css){const st=document.createElement('style');st.textContent=css;document.head.appendChild(st)}
const xEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* results screen: extensions append to it after the core has drawn it */
(()=>{const se=showEnd;showEnd=function(ok){if(!G||G.ended)return;se(ok);const box=$('#endb');if(box&&G&&!G.auto)for(const f of XH.end)try{f(box,ok)}catch(err){console.error(err)}}})();
