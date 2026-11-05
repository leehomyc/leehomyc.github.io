'use strict';
/* room.js — multiplayer room UI: create / join by code, lobby with ready states, live scoreboard in the HUD, ranked results. */
function roomModeText(d){const m=d.mode==='last'?L('无尽 · 有人倒下即结束','Endless · ends when anyone falls'):L(`限时 ${d.len/60} 分钟 · 高分获胜`,`${d.len/60} min · highest score wins`);return m}
function renderRoom(){
  const box=$('#roompanel');if(!box)return;const on=SAVE.mode==='room';box.hidden=!on;const sr=$('#hero .startrow');if(sr)sr.style.display=on?'none':'';const ss=$('#stickystart');if(ss)ss.classList.toggle('room',on);
  if(!on)return;
  const online=netIsLocal()?L('本机测试模式(同一浏览器的多个标签页可互相加入)','Local test mode: tabs of this browser can join each other'):'';
  if(!ROOM.code){
    box.innerHTML=`<div class="rmhd"><b>${L('多人对决','Multiplayer PK')}</b><small>${L('创建房间,把 4 位房间码发给朋友;2–8 人同场竞技。','Create a room and send friends the 4-letter code; 2–8 players.')}${online?' · '+online:''}</small></div>
      <div class="rmrow"><label>${L('昵称','Name')} <input id="rmname" maxlength="16" value="${roomName().replace(/"/g,'&quot;')}"></label></div>
      <div class="rmrow"><span class="lbl">${L('玩法','Mode')}</span><div class="seg" id="rmmode"><button type="button" data-v="time" class="on">${L('限时','Timed')}</button><button type="button" data-v="last">${L('无尽','Endless')}</button></div>
        <span class="lbl">${L('时长','Length')}</span><div class="seg" id="rmlen">${ROOM_LENS.map((s,i)=>`<button type="button" data-v="${s}" class="${i===0?'on':''}">${s/60}′</button>`).join('')}</div>
        <span class="lbl">${L('人数','Players')}</span><div class="seg" id="rmmax">${[2,4,8].map((n,i)=>`<button type="button" data-v="${n}" class="${i===1?'on':''}">${n}</button>`).join('')}</div></div>
      <div class="rmrow"><button type="button" class="go" id="rmcreate">${L('创建房间','Create room')}</button><span class="or">${L('或','or')}</span><input id="rmcode" maxlength="4" placeholder="${L('房间码','CODE')}" autocapitalize="characters" spellcheck="false"><button type="button" class="go alt" id="rmjoin">${L('加入','Join')}</button></div>
      <p class="note" id="rmstatus">${ROOM.status||''}</p>`;
    const seg=id=>{box.querySelectorAll(`#${id} button`).forEach(b=>b.onclick=()=>{box.querySelectorAll(`#${id} button`).forEach(x=>x.classList.toggle('on',x===b));if(id==='rmmode')$('#rmlen').style.opacity=b.dataset.v==='last'?.4:1})};['rmmode','rmlen','rmmax'].forEach(seg);
    const val=id=>box.querySelector(`#${id} button.on`).dataset.v;
    $('#rmname').onchange=e=>LB.setName(e.target.value.trim().slice(0,16));
    $('#rmcreate').onclick=async()=>{LB.setName($('#rmname').value.trim().slice(0,16));$('#rmcreate').disabled=true;ROOM.status='';try{await roomCreate({mode:val('rmmode'),len:+val('rmlen'),max:+val('rmmax')})}catch(e){ROOM.status=roomErr(e);renderRoom()}SFX.pick(1)};
    const join=async()=>{LB.setName($('#rmname').value.trim().slice(0,16));ROOM.status='';try{await roomJoin($('#rmcode').value)}catch(e){ROOM.status=roomErr(e);renderRoom()}SFX.pick(1)};
    $('#rmjoin').onclick=join;$('#rmcode').onkeydown=e=>{if(e.key==='Enter')join()};$('#rmcode').oninput=e=>{e.target.value=e.target.value.toUpperCase()};
    return;
  }
  const d=ROOM.data||{},ps=roomPlayerList(),me=roomUid(),mine=ROOM.players[me]||{};
  const rows=ps.map(p=>{const C=CLASSES[p.cls]||CLASSES.swordsman,w=SPELLS[p.weapon]||SPELLS[C.main];return `<div class="rp ${p.uid===me?'me':''} ${p.ready?'ready':''}"><span class="ic-w">${ICON.cls(p.cls)}</span><b>${p.name||'?'}${p.uid===d.host?' <em>👑</em>':''}</b><small>${LL(C)} · ${LL(w)}${p.lvA?` · Lv ${p.lvA}`:''}</small><span class="rd">${p.ready?L('已就绪','Ready'):L('未就绪','Not ready')}</span></div>`}).join('');
  const empty=Math.max(0,(d.max||4)-ps.length);
  box.innerHTML=`<div class="rmhd"><b>${L('房间','Room')} <span class="code">${ROOM.code}</span></b><button type="button" class="sm" id="rmcopy">${L('复制邀请链接','Copy invite link')}</button><small>${roomModeText(d)} · ${ps.length}/${d.max||4} ${L('人','players')}${online?' · '+online:''}</small></div>
    <div class="rplist">${rows}${Array.from({length:Math.min(empty,3)},()=>`<div class="rp empty"><span class="ic-w"></span><b>${L('等待玩家…','Waiting…')}</b><small>${L('把房间码发给朋友','Share the code')}</small></div>`).join('')}</div>
    ${ROOM.host?`<div class="rmrow"><span class="lbl">${L('玩法','Mode')}</span><div class="seg" id="rmmode2"><button type="button" data-v="time" class="${d.mode==='time'?'on':''}">${L('限时','Timed')}</button><button type="button" data-v="last" class="${d.mode==='last'?'on':''}">${L('无尽','Endless')}</button></div><span class="lbl">${L('时长','Length')}</span><div class="seg" id="rmlen2">${ROOM_LENS.map(s=>`<button type="button" data-v="${s}" class="${d.len===s?'on':''}">${s/60}′</button>`).join('')}</div><span class="lbl">${L('难度','Difficulty')}</span><div class="seg" id="rmdiff2">${['easy','normal','hard'].map(k=>`<button type="button" data-v="${k}" class="${(d.diff||'normal')===k?'on':''}">${LL(DIFF[k])}</button>`).join('')}</div></div>`:''}
    <div class="rmrow"><button type="button" class="go${mine.ready?' alt':''}" id="rmready">${mine.ready?L('取消就绪','Unready'):L('就绪','Ready')}</button>${ROOM.host?`<button type="button" class="go" id="rmstart" ${roomCanStart()?'':'disabled'}>${L('开始对决','Start match')}</button>`:`<span class="note">${L('等待房主开始…','Waiting for the host to start…')}</span>`}<button type="button" class="go alt" id="rmleave">${L('离开','Leave')}</button></div>
    <p class="note">${L('所有人面对同一张图、同一波怪;击杀首领、统领或连斩里程碑会给对手送去伏兵。','Everyone faces the same map and waves; boss kills, warlord kills and streak milestones send ambushers to your rivals.')}${ps.length<2?' '+L('至少需要 2 人。','At least 2 players needed.'):''}</p>`;
  $('#rmcopy').onclick=async()=>{const link=roomLink(ROOM.code);try{await navigator.clipboard.writeText(link);$('#rmcopy').textContent=L('已复制','Copied')}catch(_){prompt(L('邀请链接','Invite link'),link)}};
  $('#rmready').onclick=()=>{roomSetReady(!mine.ready);SFX.pick(1)};
  $('#rmleave').onclick=()=>{roomLeave();SFX.pick(1)};
  if(ROOM.host){$('#rmstart').onclick=()=>{roomStart();SFX.complete()};
    const seg=(id,key,conv)=>box.querySelectorAll(`#${id} button`).forEach(b=>b.onclick=()=>roomHostSet({[key]:conv?conv(b.dataset.v):b.dataset.v}));seg('rmmode2','mode');seg('rmlen2','len',Number);seg('rmdiff2','diff')}
}
function drawRoomBoard(){
  const el=$('#roomboard');if(!el||!ROOM.code||!ROOM.playing){if(el)el.hidden=true;return}el.hidden=false;
  const me=roomUid(),ps=roomRank(),d=ROOM.data||{};
  const left=d.mode==='time'?Math.max(0,d.len-G.t):null;
  el.innerHTML=`<div class="rbh">${d.mode==='time'?`<b>${fmt(left)}</b> ${L('剩余','left')}`:`<b>${L('无尽','Endless')}</b> ${L('有人倒下即结束','ends on first death')}`}</div>`+ps.map((p,i)=>{const C=CLASSES[p.cls]||CLASSES.swordsman,score=p.uid===me?G.score:(p.score||0),hp=p.uid===me?Math.max(0,G.P.hp/G.P.maxHp):(p.hp??1),dead=p.uid===me?!!G.over&&G.over!=='pk':p.alive===false;
    return `<div class="rb ${p.uid===me?'me':''} ${dead?'dead':''}"><i>${i+1}</i><span class="g" style="color:${C.col}">${C.g}</span><b>${p.name||'?'}</b><em><s style="width:${Math.round(hp*100)}%"></s></em><span class="sc">${score}</span></div>`}).join('');
}
function renderRoomResults(){
  const el=$('#roomres');if(!el)return;const me=roomUid(),ranked=roomRank(),done=!!ROOM.results,myRank=ranked.findIndex(p=>p.uid===me)+1,d=ROOM.data||{};
  el.innerHTML=`<h3>${done?(myRank===1?L('🏆 第一名!','🏆 First place!'):L(`第 ${myRank} 名`,`Rank ${myRank}`)):L('等待其他玩家完成…','Waiting for the others…')}</h3>
    ${ranked.map((p,i)=>{const C=CLASSES[p.cls]||CLASSES.swordsman;return `<div class="rr ${p.uid===me?'me':''}"><i>${i+1}</i><span class="g" style="color:${C.col}">${C.g}</span><b>${p.name||'?'}</b><small>${p.alive===false?L('倒下','fell'):p.done?L('完成','done'):L('战斗中','fighting')} · Lv ${p.lv||1} · ${p.kills||0} ${L('击杀','kills')}</small><span class="sc">${p.uid===me?G.score:(p.score||0)}</span></div>`}).join('')}
    ${done&&!ROOM.rewarded?(()=>{ROOM.rewarded=true;const win=myRank===1,dT=win?20:-5,gold=win?200:60;SAVE.trophies=Math.max(0,(SAVE.trophies||0)+dT);SAVE.gold+=gold;SAVE.rooms=SAVE.rooms||{w:0,p:0};SAVE.rooms.p++;if(win)SAVE.rooms.w++;persist();return `<p class="rrw">🏆 ${dT>0?'+':''}${dT} · +${gold} ${L('金','gold')}</p>`})():(ROOM.rewarded&&done?`<p class="rrw">${L('奖励已发放','Rewards granted')}</p>`:'')}
    <div class="btns">${ROOM.host?`<button type="button" class="go" id="rmagain">${L('回到房间再来一局','Back to room')}</button>`:`<span class="note">${L('房主可以开启下一局','The host can start another round')}</span>`}<button type="button" class="go alt" id="rmquit">${L('离开房间','Leave room')}</button></div>`;
  const a=$('#rmagain');if(a)a.onclick=()=>{roomBackToLobby();toLobby();showScreen('hero')};
  $('#rmquit').onclick=()=>{roomLeave(true);SAVE.mode='solo';persist();toLobby()};
}
