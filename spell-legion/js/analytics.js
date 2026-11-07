'use strict';
/* Operational telemetry: no email, player name, IP, URL query or gameplay payload is sent.
   Runs use wall-clock foreground battle time; simulation time is reported separately. */
const METRICS={session:crypto.randomUUID(),uid:null,visible:0,play:0,run:null,queue:[],sending:false,last:performance.now()};
function metricsUser(){
 const user=typeof CLOUD==='undefined'?null:CLOUD.user,uid=user?.uid||null;
 if(uid!==METRICS.uid){
  METRICS.session=crypto.randomUUID();METRICS.queue=[];METRICS.visible=METRICS.play=0;
  METRICS.run=null;METRICS.uid=uid;METRICS.last=performance.now();
 }
 return user;
}
function metricsStart(){
 if(!metricsUser()||typeof G==='undefined'||!G||G.auto)return;
 metricsEnd('abandoned');
 METRICS.run={id:crypto.randomUUID(),mode:SAVE.mode,cls:CLASS,difficulty:DIFFID,playMs:0,simSeconds:0,kills:0,bosses:0,level:1,ended:false,outcome:'in_progress'};
 metricsFlush();
}
function metricsSample(){
 const user=metricsUser(),n=performance.now(),dt=Math.min(1500,Math.max(0,n-METRICS.last));METRICS.last=n;
 if(!user||document.hidden)return;METRICS.visible+=dt;
 const active=typeof G!=='undefined'&&G&&!G.auto&&!G.ended&&!G.over&&(G.shared||(!G.pick&&!G.paused&&!G.panel));
 if(active){METRICS.play+=dt;if(METRICS.run)METRICS.run.playMs+=dt;}
 if(METRICS.run&&typeof G!=='undefined'&&G&&!G.auto)Object.assign(METRICS.run,{simSeconds:G.t||0,kills:G.kills||0,bosses:G.bossSlain||0,level:G.lv||1});
}
function metricsEnd(outcome){
 metricsSample();if(!METRICS.run)return;
 METRICS.run.ended=true;METRICS.run.outcome=outcome||((typeof G!=='undefined'&&G?.abandoned)?'abandoned':typeof G!=='undefined'&&G?.over==='lose'?'lose':'finished');
 metricsFlush();METRICS.run=null;
}
async function metricsFlush(){
 const user=metricsUser();if(!user)return;
 let source='';try{const ref=new URL(document.referrer);if(ref.origin!==location.origin)source=ref.origin;}catch{}
 const b={id:crypto.randomUUID(),session:METRICS.session,visibleMs:Math.min(120000,Math.round(METRICS.visible)),playMs:Math.min(120000,Math.round(METRICS.play)),playing:!!METRICS.run&&!METRICS.run.ended&&!document.hidden,source,device:/Mobi|Android|iPhone/i.test(navigator.userAgent)?'mobile':'desktop',run:METRICS.run?{...METRICS.run,playMs:Math.min(120000,Math.round(METRICS.run.playMs))}:null};
 METRICS.visible=METRICS.play=0;if(METRICS.run)METRICS.run.playMs=0;
 METRICS.queue.push(b);if(METRICS.queue.length>20)METRICS.queue.shift();if(METRICS.sending)return;METRICS.sending=true;
 // Keep the queue and identity paired across async token refreshes and sign-out.
 const queue=METRICS.queue;
 try{
  while(queue.length&&typeof CLOUD!=='undefined'&&CLOUD.user?.uid===user.uid){
   const packet=queue[0],token=await user.getIdToken();
   if(CLOUD.user?.uid!==user.uid)break;
   const r=await fetch('/api/analytics/ingest',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(packet),keepalive:true});
   if(!r.ok){if([400,403,404,405,409,413].includes(r.status)){const i=queue.indexOf(packet);if(i>=0)queue.splice(i,1);continue;}break;}
   const i=queue.indexOf(packet);if(i>=0)queue.splice(i,1);
  }
 }catch(_){}finally{METRICS.sending=false;}
}
setInterval(metricsSample,1000);setInterval(()=>{metricsSample();metricsFlush();},30000);
addEventListener('visibilitychange',()=>{metricsSample();metricsFlush();});addEventListener('pagehide',()=>{metricsSample();metricsFlush();});
