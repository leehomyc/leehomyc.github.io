'use strict';
/* main.js — boot and the frame loop (hit-stop, slow motion, fixed-step simulation) */
let last=0,acc=0;
function endTick(){G.later.forEach(l=>l.t-=1/60);const due=G.later.filter(l=>l.t<=0);G.later=G.later.filter(l=>l.t>0);due.forEach(l=>l.f());for(const f of G.fx){f.t-=1/60;if(f.k==='p'){f.x+=f.vx/60;f.y+=f.vy/60}if(f.k==='die'){f.x+=f.kx/60;f.y+=f.ky/60;f.h=Math.max(0,f.h+f.vh/60);f.vh-=380/60;f.rot+=f.rv/60}}G.fx=G.fx.filter(f=>f.t>0);for(const f of G.floats){f.t-=1/60;f.y-=16/60}G.floats=G.floats.filter(f=>f.t>0);for(const s of G.shocks)s.t+=1/60;G.shocks=G.shocks.filter(s=>s.t<s.T);G.trauma*=.97}
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.1,(now-last)/1000||0);last=now;
  if(bannerT>0){bannerT-=dt;if(bannerT<=0)$('#banner').classList.remove('on')}
  if(typeof previewTick==='function')previewTick(dt);
  if(!G||!rn)return;
  if(typeof padTick==='function')padTick();
  const running=(G.shared||(!G.pick&&!G.paused&&!G.panel))&&!G.ended&&!document.hidden;
  if(running){
    if(G.hitStop>0&&!G.shared){G.hitStop-=dt;acc=0}
    else{G.hitStop=0;const ts=G.slow>0&&!G.shared?(SHAKE==='off'?.6:.28):1;G.slow=Math.max(0,G.slow-dt*(SHAKE==='off'?2:1));acc+=dt*ts;let n=0;while(acc>=1/60&&n++<8){acc-=1/60;if(G.over)endTick();else step(1/60)}}
    if(!G.auto)SFX.setState(G.over==='win'?'win':G.boss?'boss':'battle');
  }else{acc=0;if(G.hitStop>0)G.hitStop=0}
  render(dt);
  if(!G.auto)hud(dt);
}
function boot(){
  DPR=Math.min(devicePixelRatio||1,Q().dpr);
  const startLabel=$('#startbtn').innerHTML;$('#startbtn').disabled=true;$('#startbtn').textContent=L('载入中…','Loading…');
  SAVE.mode='solo'; // every launch starts in solo; PK/daily/rooms are chosen from the menu each time
  CLASS=SAVE.cls;if(typeof gearMigrateLegends==='function')gearMigrateLegends();renderTitle();if(typeof cloudInit==='function')cloudInit();if(typeof roomAutoJoin==='function')setTimeout(roomAutoJoin,600);
  setTimeout(()=>{
    try{initGfx();resize();newGame(true,SAVE.cls);demoBoost();requestAnimationFrame(frame);$('#startbtn').disabled=false;$('#startbtn').innerHTML=startLabel}
    catch(err){console.error(err);$('#loadnote').textContent=L('需要 WebGL:请在开启硬件加速的新版浏览器中打开。','This game needs WebGL. Open it in a recent browser with hardware acceleration turned on.');$('#startbtn').textContent=L('无法运行','Unavailable')}
  },40);
}
addEventListener('resize',()=>{if(rn)resize()});
boot();
