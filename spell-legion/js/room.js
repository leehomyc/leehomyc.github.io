'use strict';
/* room.js — multiplayer room UI: create / join by code, lobby with ready states, live scoreboard in the HUD, ranked results. */
function roomModeText(d){const m=d.mode==='last'?L('无尽 · 有人倒下即结束','Endless · ends when anyone falls'):L(`限时 ${d.len/60} 分钟 · 高分获胜`,`${d.len/60} min · highest score wins`);return m}
function renderRoom(){
  const box=$('#roompanel');if(!box)return;const on=SAVE.mode==='room';box.hidden=!on;const sr=$('#hero .startrow');if(sr)sr.style.display=on?'none':'';const ss=$('#stickystart');if(ss)ss.classList.toggle('room',on);const hf=$('#hero .hfoot');if(hf)hf.classList.toggle('room',on);
  {const hh=$('#hero .hhead');if(on&&hh&&box.previousElementSibling!==hh)hh.insertAdjacentElement('afterend',box);else if(!on&&hf&&box.parentElement!==hf)hf.appendChild(box)} // in a duel the room is the first thing on the screen, not the last
  if(!on)return;
  const online=netIsLocal()?L('本机测试模式(同一浏览器的多个标签页可互相加入)','Local test mode: tabs of this browser can join each other'):'';
  if(!ROOM.code){
    if(!ROOM.creating){ROOM.creating=true;ROOM.status='';roomCreate({mode:'time',len:180,max:4}).catch(e=>{ROOM.status=roomErr(e)}).finally(()=>{ROOM.creating=false;renderRoom()})}
    box.innerHTML=`<div class="rmhd"><b>${L('对决','Duel')}</b><small>${L('正在开房…','Opening a room…')}</small></div>
      <div class="rmrow"><span class="lbl">${L('有朋友的房间码?','Got a code from a friend?')}</span><input id="rmcode" maxlength="4" placeholder="${L('房间码','CODE')}" autocapitalize="characters" spellcheck="false"><button type="button" class="go alt sm" id="rmjoin">${L('加入','Join')}</button></div>
      <p class="note" id="rmstatus">${ROOM.status||''}</p>`;
    const join=async()=>{ROOM.status='';try{await roomJoin($('#rmcode').value)}catch(e){ROOM.status=roomErr(e);renderRoom()}SFX.pick(1)};
    $('#rmjoin').onclick=join;$('#rmcode').onkeydown=e=>{if(e.key==='Enter')join()};$('#rmcode').oninput=e=>{e.target.value=e.target.value.toUpperCase()};
    return;
  }
  const d=ROOM.data||{},ps=roomPlayerList(),me=roomUid(),mine=ROOM.players[me]||{};
  const rows=ps.map(p=>{const C=CLASSES[p.cls]||CLASSES.swordsman,w=SPELLS[p.weapon]||SPELLS[C.main];return `<div class="rp ${p.uid===me?'me':''} ${p.ready?'ready':''}"><span class="ic-w">${p.av&&typeof avatarHTML==='function'?avatarHTML(p.av):ICON.cls(p.cls)}</span><b>${p.name||'?'}${p.ai?` <em class="aitag">AI</em>`:''}${p.uid===d.host?' <em>👑</em>':''}</b><small>${LL(C)} · ${LL(w)}${p.lvA?` · Lv ${p.lvA}`:''}</small>${p.ai&&ROOM.host?`<button type="button" class="rmx" data-rm="${p.uid}" title="${L('移除','Remove')}">×</button>`:`<span class="rd">${p.ready?L('已就绪','Ready'):L('未就绪','Not ready')}${(!p.ai&&p.uid!==me&&typeof linkOpenTo==='function'&&(ROOM.host?linkOpenTo(p.uid):p.uid===d.host&&linkOpenTo(p.uid)))?` <i class="lk" title="${L('已连上,同场对决','Linked: same arena')}">🔗</i>`:''}</span>`}</div>`}).join('');
  const empty=Math.max(0,(d.max||4)-ps.length),canAI=ROOM.host&&empty>0,offline=!netOnline();
  box.innerHTML=`<div class="rmhd"><b>${L('对决','Duel')} <span class="code" title="${L('房间码','Room code')}">${ROOM.code}</span></b><small>${roomModeText(d)} · ${ps.length}/${d.max||4}</small></div>
    <div class="rplist">${rows}${empty>0?`<div class="rp seat">${canAI?`<button type="button" class="go alt sm" id="rmai">${L('+ AI 对手','+ AI opponent')}</button>`:''}${offline?`<small class="note">${L('联机暂不可用,先和 AI 打','Online rooms unavailable right now — play the AI')}</small>`:`<button type="button" class="go alt sm" id="rmcopy">${L('邀请好友','Invite a friend')}</button><small class="note">${L(`房间码 ${ROOM.code}`,`code ${ROOM.code}`)}</small>`}</div>`:''}</div>
    ${ROOM.host?`<div class="rmrow"><span class="lbl">${L('玩法','Mode')}</span><div class="seg" id="rmmode2"><button type="button" data-v="time" class="${d.mode==='time'?'on':''}">${L('限时','Timed')}</button><button type="button" data-v="last" class="${d.mode==='last'?'on':''}">${L('无尽','Endless')}</button></div><span class="lbl">${L('时长','Length')}</span><div class="seg" id="rmlen2">${ROOM_LENS.map(s=>`<button type="button" data-v="${s}" class="${d.len===s?'on':''}">${s/60}′</button>`).join('')}</div><span class="lbl">${L('难度','Difficulty')}</span><div class="seg" id="rmdiff2">${['easy','normal','hard'].map(k=>`<button type="button" data-v="${k}" class="${(d.diff||'normal')===k?'on':''}">${LL(DIFF[k])}</button>`).join('')}</div></div>`:''}
    <div class="rmrow">${ROOM.host?'':`<button type="button" class="go${mine.ready?' alt':''}" id="rmready">${mine.ready?L('取消就绪','Unready'):L('就绪','Ready')}</button>`}${ROOM.host?`<button type="button" class="go" id="rmstart" ${roomCanStart()?'':'disabled'}>${typeof roomLinkWait==='function'&&roomLinkWait()>0&&roomPlayerList().every(p=>p.ready||p.ai)?L('连接中…','Linking…'):L('开始对决','Start match')}</button>`:`<span class="note">${L('等待房主开始…','Waiting for the host to start…')}</span>`}<button type="button" class="go alt" id="rmleave">${L('离开','Leave')}</button></div>
    <p class="note">${L('同一片场地,一起抢怪、抢首领:谁补最后一刀算谁的。','One arena for everyone: race for every kill — the last hit takes it.')}${ps.length<2?' '+L('加一个 AI 对手或邀请朋友就能开始。','Add an AI opponent or invite a friend to start.'):''}</p>
    ${ps.some(p=>!p.ai&&p.uid!==me)?'':`<div class="rmrow join"><span class="lbl">${L('有朋友的房间码?','Got a code from a friend?')}</span><input id="rmcode" maxlength="4" placeholder="${L('房间码','CODE')}" autocapitalize="characters" spellcheck="false"><button type="button" class="go alt sm" id="rmjoin">${L('加入','Join')}</button></div>`}
    ${ROOM.status?`<p class="note err" id="rmstatus">${ROOM.status}</p>`:''}`;
  {const jb=$('#rmjoin');if(jb){const join=async()=>{const code=$('#rmcode').value;ROOM.status='';try{await roomJoin(code)}catch(e){ROOM.status=roomErr(e);renderRoom()}SFX.pick(1)};jb.onclick=join;$('#rmcode').onkeydown=e=>{if(e.key==='Enter')join()};$('#rmcode').oninput=e=>{e.target.value=e.target.value.toUpperCase()}}}
  {const cp=$('#rmcopy');if(cp)cp.onclick=async()=>{const link=roomLink(ROOM.code);try{await navigator.clipboard.writeText(link);cp.textContent=L('已复制链接','Link copied')}catch(_){prompt(L('邀请链接','Invite link'),link)}}}
  {const ai=$('#rmai');if(ai)ai.onclick=()=>{roomAddAI();SFX.pick(1)}}box.querySelectorAll('.rmx').forEach(b=>b.onclick=()=>{roomRemoveAI(b.dataset.rm);SFX.pick(1)});
  {const rb=$('#rmready');if(rb)rb.onclick=()=>{roomSetReady(!mine.ready);SFX.pick(1)}}
  $('#rmleave').onclick=()=>{roomLeave();SFX.pick(1)};
  if(ROOM.host){$('#rmstart').onclick=()=>{roomStart();SFX.complete()};
    const seg=(id,key,conv)=>box.querySelectorAll(`#${id} button`).forEach(b=>b.onclick=()=>roomHostSet({[key]:conv?conv(b.dataset.v):b.dataset.v}));seg('rmmode2','mode');seg('rmlen2','len',Number);seg('rmdiff2','diff')}
}
function drawBoard(){
  const el=$('#roomboard');if(!el)return;if(!G||G.auto||$('#hud').hidden){el.hidden=true;return}
  if(ROOM.code&&ROOM.playing&&G.room)return drawRoomBoard();
  const rows=[{me:1,av:SAVE.avatar,name:LB.name()||L('我','Me'),score:G.score,hp:Math.max(0,G.P.hp/G.P.maxHp),col:'#8fe3ff'}];
  if(G.rival){const R=G.rival;rows.push({av:R.av,name:L(R.name[0],R.name[1]),score:R.score,hp:Math.max(0,R.hp/R.maxHp),col:'#ff9c5a'})}
  rows.sort((a,b)=>b.score-a.score);el.hidden=false;el.classList.toggle('solo',rows.length<2);
  el.innerHTML=rows.map((p,i)=>`<div class="rb ${p.me?'me':''}">${rows.length>1?`<i>${i+1}</i>`:''}${avatarHTML(p.av)}<b>${esc(p.name)}</b><span class="sc">${p.score}</span>${rows.length>1?`<em><s style="width:${Math.round(p.hp*100)}%;background:${p.col}"></s></em>`:''}</div>`).join('')}
function drawRoomBoard(){
  const el=$('#roomboard');if(!el||!ROOM.code||!ROOM.playing){if(el)el.hidden=true;return}el.hidden=false;el.classList.remove('solo');
  const me=roomUid(),ps=roomRank(),d=ROOM.data||{};
  const left=d.mode==='time'?Math.max(0,d.len-Math.max(G.t,d.startedAt?(Date.now()-(d.startedAt+(d.delay||0)))/1000:0)):null;
  el.innerHTML=`<div class="rbh">${d.mode==='time'?`<b>${fmt(left)}</b> ${L('剩余','left')}`:`<b>${L('无尽','Endless')}</b> ${L('有人倒下即结束','ends on first death')}`}</div>`+ps.map((p,i)=>{const C=CLASSES[p.cls]||CLASSES.swordsman,score=p.uid===me?G.score:(p.score||0),hp=p.uid===me?Math.max(0,G.P.hp/G.P.maxHp):(p.hp??1),dead=p.uid===me?!!G.over&&G.over!=='pk':p.alive===false;
    const av=p.uid===me?SAVE.avatar:p.av;return `<div class="rb ${p.uid===me?'me':''} ${dead?'dead':''}"><i>${i+1}</i>${av?avatarHTML(av):`<span class="g" style="color:${C.col}">${C.g}</span>`}<b>${esc(p.name||'?')}</b><span class="sc">${score}</span><em><s style="width:${Math.round(hp*100)}%;background:${C.col}"></s></em></div>`}).join('');
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
