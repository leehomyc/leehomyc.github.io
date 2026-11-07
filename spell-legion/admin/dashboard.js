'use strict';
firebase.initializeApp({apiKey:'AIzaSyDeI9V8qBVB2B1lqZP5BaedYhaToHfs6Z8',authDomain:'spell-legion.firebaseapp.com',projectId:'spell-legion'});
const $=s=>document.querySelector(s),auth=firebase.auth();let data;
const esc=x=>String(x??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=x=>Number(x||0).toLocaleString('zh-HK'),mins=x=>(Number(x||0)/60000).toLocaleString('zh-HK',{maximumFractionDigits:1}),pct=(x,total)=>total?(x/total*100).toFixed(1)+'%':'—';
const classes={swordsman:'剑客',taoist:'道士',blademaster:'刀客',qin:'琴师',monk:'武僧',physician:'医师'};
const modes={solo:'无尽',qpk:'快速对决',pk:'十分对决',room:'多人房',daily:'每日挑战',rush:'首领连战'};
function table(target,heads,rows){$(target).innerHTML='<table><thead><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+ (rows.length?rows.map(row=>'<tr>'+row.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+heads.length+'">暂无记录</td></tr>')+'</tbody></table>';}
function bars(target,rows,label,key){const max=Math.max(1,...rows.map(r=>+r[key]));$(target).innerHTML=rows.length?rows.map(r=>'<div class="bar"><span>'+esc(label(r))+'</span><i style="width:'+Math.max(2,r[key]/max*65)+'%"></i><b>'+n(r[key])+'</b></div>').join(''):'<p class="muted">暂无记录</p>';}
function render(d){const o=d.overview[0]||{},a=d.accounts[0]||{},online=d.online[0]||{},r=d.runs[0]||{},f=d.funnel[0]||{};
 $('#dashboard').hidden=false;$('#auth').hidden=true;$('#updated').textContent='更新于 '+new Date(d.generated).toLocaleString('zh-HK',{timeZone:'Asia/Hong_Kong'})+' · 每 60 秒刷新';
 $('#coverage').textContent='采集起点：'+(a.tracking_started?new Date(a.tracking_started).toLocaleString('zh-HK',{timeZone:'Asia/Hong_Kong'}):'等待第一条真实数据')+'。仅包含安装此采集代码且成功连接账号服务的版本；上线前的来源、时长与留存不可追溯。已注册账号数是已观察集合，尚未导入 Firebase 全量账号。浏览时长排除后台；战斗时长另排除暂停、选卡和演示。';
 const cards=[['活跃玩家',n(o.users),'按账号去重 · 香港自然日'],['当前在线',n(online.online),'90 秒内收到心跳'],['正在游戏',n(online.playing),'最近心跳为战斗状态'],['已观察注册账号',n(a.registered_accounts),'累计非匿名账号'],['游戏总时长',mins(o.play_ms)+' 分','前台有效战斗时间'],['人均游戏时长',o.users?mins(o.play_ms/o.users)+' 分':'—','所选期间'],['开局 / 结算',n(r.starts)+' / '+n(r.completions),'退出未结算单独保留'],['已注册占比',pct(f.registered_players,f.visitors),'所选期间访问用户中']];
 const snap=d.registrationSnapshot?.[0];$('#registration').textContent=snap?'Firebase 账号核对快照：正式注册 '+n(snap.registered_accounts)+'，游客账号 '+n(snap.anonymous_accounts)+'。核对时间 '+new Date(snap.captured).toLocaleString('zh-HK',{timeZone:'Asia/Hong_Kong'})+'；此快照与下方实时采集人数口径不同。':'Firebase 历史账号快照尚未核对；上方注册数仅为采集上线后观察到的非匿名账号。';
 $('#cards').innerHTML=cards.map(([label,value,hint])=>'<div class="card"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><small>'+esc(hint)+'</small></div>').join('');
 const max=Math.max(1,...d.daily.map(x=>x.users));$('#trend').innerHTML=d.daily.length?d.daily.map(x=>'<div class="day"><b>'+n(x.users)+'</b><i style="height:'+Math.max(2,x.users/max*120)+'px"></i>'+esc(x.day.slice(5))+'</div>').join(''):'<p>暂无数据</p>';
 bars('#funnel',[{label:'访问用户',v:f.visitors||0},{label:'实际开局',v:f.players||0},{label:'已注册',v:f.registered_players||0}],x=>x.label,'v');
 let country;try{country=new Intl.DisplayNames(['zh-Hans'],{type:'region'});}catch{}
 bars('#countries',d.countries,x=>x.country==='XX'?'未知':country?.of(x.country)||x.country,'users');bars('#sources',d.sources,x=>x.source==='direct'?'直接访问':x.source,'users');bars('#devices',d.devices,x=>({mobile:'手机',desktop:'电脑',tablet:'平板'}[x.device]||x.device),'users');
 table('#classes',['职业','开局','结算','结算平均模拟时长','总击杀'],d.classes.map(x=>[classes[x.cls]||x.cls,n(x.starts),n(x.completions),x.avg_sim_seconds==null?'—':Math.round(x.avg_sim_seconds)+' 秒',n(x.kills)]));
 table('#modes',['模式','开局','结算','游戏分钟'],d.modes.map(x=>[modes[x.mode]||x.mode,n(x.starts),n(x.completions),mins(x.play_ms)]));
 const today=new Date(d.generated+8*3600000).toISOString().slice(0,10);
 table('#retention',['首次观察日','人数','次日留存','七日留存'],d.retention.map(x=>{const age=Math.floor((Date.parse(today)-Date.parse(x.cohort))/86400000);return [x.cohort,n(x.users),age<1?'待观察':pct(x.d1,x.users),age<7?'待观察':pct(x.d7,x.users)];}));
 table('#recent',['开始时间','模式','职业','难度','模拟时长','击杀','首领','结果'],d.recent.map(x=>[new Date(x.started).toLocaleString('zh-HK',{timeZone:'Asia/Hong_Kong'}),modes[x.mode]||x.mode,classes[x.cls]||x.cls,x.difficulty,Math.round(x.sim_seconds)+' 秒',n(x.kills),n(x.bosses),x.ended?x.outcome:'未结算']));
}
async function load(){if(!auth.currentUser)return;$('#status').textContent='正在读取真实统计…';try{const token=await auth.currentUser.getIdToken();const r=await fetch('/api/analytics/dashboard?days='+$('#days').value,{headers:{Authorization:'Bearer '+token},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'读取失败');data=d;render(d);$('#status').textContent='';}catch(e){$('#status').textContent=e.message;}}
$('#signin').onclick=()=>auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>$('#status').textContent=e.message);$('#refresh').onclick=load;$('#days').onchange=load;
$('#export').onclick=()=>{if(!data)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='spell-legion-analytics.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
auth.onAuthStateChanged(u=>{if(u&&!u.isAnonymous)load();else{$('#dashboard').hidden=true;$('#auth').hidden=false;}});setInterval(()=>{if(!document.hidden)load();},60000);
