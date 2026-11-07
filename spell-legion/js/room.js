'use strict';
/* room.js — multiplayer room UI: create / join by code, lobby with ready states, live scoreboard in the HUD, ranked results. */
function roomHasAI(){return roomPlayerList().some(p=>p.ai)}
function roomModeText(d){return d.mode==='last'?L('无尽','Endless'):L('限时 3′','Timed 3′')}
function roomEquipmentText(p){
  const items=p.uid===roomUid()?roomEquipment():Array.isArray(p.equipment)?p.equipment:[];
  const names=items.filter(it=>it&&typeof it==='object').slice(0,4).map(it=>L(String(it.zh||it.en||'').slice(0,80),String(it.en||it.zh||'').slice(0,80))).filter(Boolean);
  return L('装备：','Gear: ')+(names.length?names.join(L('、',', ')):L('无','None'));
}
function roomJoinRow(){return `<div class="rmjoin"><input id="rmcode" maxlength="4" placeholder="${L('好友房间码','Friend code')}" autocapitalize="characters" spellcheck="false"><button type="button" class="go alt sm" id="rmjoin">${L('加入','Join')}</button></div>`}
function renderRoom(){
  const box=$('#roompanel');if(!box)return;const on=SAVE.mode==='room';box.hidden=!on;const sr=$('#hero .startrow');if(sr)sr.style.display=on?'none':'';const ss=$('#stickystart');if(ss)ss.classList.toggle('room',on);const hf=$('#hero .hfoot');if(hf)hf.classList.toggle('room',on);{const hp=$('#hero');if(hp)hp.classList.toggle('inroom',on)}
  {const hh=$('#hero .hhead');if(on&&hh&&box.previousElementSibling!==hh)hh.insertAdjacentElement('afterend',box);else if(!on&&hf&&box.parentElement!==hf)hf.appendChild(box)} // in a duel the room is the first thing on the screen, not the last
  if(!on)return;
  const bindJoin=()=>{const jb=$('#rmjoin');if(!jb)return;const join=async()=>{const code=$('#rmcode').value;ROOM.status='';try{await roomJoin(code)}catch(e){ROOM.joinError=true;ROOM.status=roomErr(e);renderRoom()}SFX.pick(1)};jb.onclick=join;$('#rmcode').onkeydown=e=>{if(e.key==='Enter')join()};$('#rmcode').oninput=e=>{e.target.value=e.target.value.toUpperCase()}};
  if(!ROOM.code&&ROOM.joinError){box.innerHTML=`<div class="rmhd"><b>${L('加入对决','Join duel')}</b>${roomJoinRow()}</div><p class="note err">${esc(ROOM.status)}</p><button type="button" class="go alt sm" id="rmnew">${L('创建新房间','Create new room')}</button>`;bindJoin();$('#rmnew').onclick=()=>{ROOM.joinError=false;ROOM.status='';renderRoom()};return}
  if(!ROOM.code){
    if(!ROOM.creating){ROOM.creating=true;ROOM.status='';roomCreate({mode:'time',len:180,max:4}).catch(e=>{ROOM.status=roomErr(e)}).finally(()=>{ROOM.creating=false;renderRoom()})}
    box.innerHTML=`<div class="rmhd"><b>${L('对决','Duel')}</b><span class="dim">${L('开房中…','Opening…')}</span>${roomJoinRow()}</div>${ROOM.status?`<p class="note err">${ROOM.status}</p>`:''}`;
    bindJoin();return;
  }
  const d=ROOM.data||{},ps=roomPlayerList(),me=roomUid(),mine=ROOM.players[me]||{},hasAI=ps.some(p=>p.ai),diff=d.diff||'normal';
  const rows=ps.map(p=>{const C=CLASSES[p.cls]||CLASSES.swordsman,w=SPELLS[p.weapon]||SPELLS[C.main],isHost=p.uid===d.host,equipment=roomEquipmentText(p);
    const right=p.ai&&ROOM.host?`<button type="button" class="rmx" data-rm="${p.uid}" title="${L('移除','Remove')}">×</button>`:(isHost||p.ai)?'':`<span class="rd">${p.ready?L('已就绪','Ready'):L('未就绪','Not ready')}${(p.uid!==me&&typeof linkOpenTo==='function'&&(ROOM.host?linkOpenTo(p.uid):isHost&&linkOpenTo(p.uid)))?` <i class="lk" title="${L('已连上,同场对决','Linked: same arena')}">🔗</i>`:''}</span>`;
    return `<div class="rp ${p.uid===me?'me':''} ${p.ready&&!isHost&&!p.ai?'ready':''}"><span class="ic-w">${p.av&&typeof avatarHTML==='function'?avatarHTML(p.av):ICON.cls(p.cls)}</span><b>${esc(p.name||'?')}${p.ai?` <em class="aitag">AI</em>`:''}${isHost?' <em>👑</em>':''}</b><small>${LL(C)} · ${LL(w)}${p.lvA?` · Lv ${p.lvA}`:''}</small><small class="room-gear" title="${esc(equipment)}">${esc(equipment)}</small>${right}</div>`}).join('');
  const empty=Math.max(0,(d.max||4)-ps.length),canAI=ROOM.host&&empty>0,offline=!netOnline();
  const seat=empty>0&&(canAI||!offline)?`<div class="rp seat">${canAI?`<button type="button" class="seatb" id="rmai"><span>＋</span>${L('AI 对手','AI')}</button>`:''}${offline?'':`<button type="button" class="seatb" id="rmcopy"><span>✉</span>${L('邀请好友','Invite')}</button>`}</div>`:'';
  const opts=ROOM.host
    ?`<div class="seg" id="rmmode2"><button type="button" data-v="time" class="${d.mode!=='last'?'on':''}">${L('限时 3′','Timed 3′')}</button><button type="button" data-v="last" class="${d.mode==='last'?'on':''}">${L('无尽','Endless')}</button></div>${hasAI?`<span class="grp"><span class="lbl">${L('AI 难度','AI level')}</span><div class="seg" id="rmdiff2">${['easy','normal','hard'].map(k=>`<button type="button" data-v="${k}" class="${diff===k?'on':''}">${LL(DIFF[k])}</button>`).join('')}</div></span>`:''}`
    :`<span class="chip">${roomModeText(d)}</span>${hasAI?`<span class="chip">AI · ${LL(DIFF[diff])}</span>`:''}`;
  const lone=ps.length<2;
  box.innerHTML=`<div class="rmhd"><b>${L('对决','Duel')}</b><button type="button" class="code" id="rmcodeb" title="${L('复制房间码','Copy room code')}">${ROOM.code}</button><span class="cnt">${ps.length}/${d.max||4}</span>${d.map&&MAPS[d.map]?`<span class="chip map">${LL(MAPS[d.map])}</span>`:''}<div class="opts">${opts}</div></div>
    <p class="room-rule">${d.mode==='last'?L('每人 3 条生命 · 任一玩家耗尽生命，整局结束','3 lives each · the round ends when anyone runs out'):L('限时 3 分钟 · 无限复活 · 每次死亡分数减半','3 minutes · unlimited revives · each death halves your score')}</p>
    <div class="rplist">${rows}${seat}</div>
    <div class="rmact">${ROOM.host?`<button type="button" class="go" id="rmstart" ${roomCanStart()?'':'disabled'}>${typeof roomLinkWait==='function'&&roomLinkWait()>0&&ps.every(p=>p.ready||p.ai)?L('连接中…','Linking…'):L('开始对决','Start')}</button>`:`<button type="button" class="go${mine.ready?' alt':''}" id="rmready">${mine.ready?L('取消就绪','Unready'):L('就绪','Ready')}</button>`}<button type="button" class="go alt sm" id="rmleave">${L('离开','Leave')}</button>${ps.some(p=>!p.ai&&p.uid!==me)?(ROOM.host?'':`<span class="dim">${L('等房主开始…','Waiting for host…')}</span>`):roomJoinRow()}</div>
    ${ROOM.status?`<p class="note err" id="rmstatus">${ROOM.status}</p>`:''}`;
  bindJoin();
  const copy=async el=>{const code=ROOM.code;if(!code)return;try{await navigator.clipboard.writeText(code);toastCopied(el)}catch(_){prompt(L('房间码','Room code'),code)}};
  {const cp=$('#rmcopy');if(cp)cp.onclick=()=>copy(cp)}{const cb=$('#rmcodeb');if(cb)cb.onclick=()=>copy(cb)}
  {const ai=$('#rmai');if(ai)ai.onclick=()=>{roomAddAI();SFX.pick(1)}}box.querySelectorAll('.rmx').forEach(b=>b.onclick=()=>{roomRemoveAI(b.dataset.rm);SFX.pick(1)});
  {const rb=$('#rmready');if(rb)rb.onclick=()=>{roomSetReady(!mine.ready);SFX.pick(1)}}
  $('#rmleave').onclick=()=>{roomLeave();SFX.pick(1)};
  if(ROOM.host){$('#rmstart').onclick=()=>{roomStart();SFX.complete()};
    box.querySelectorAll('#rmmode2 button').forEach(b=>b.onclick=()=>{roomHostSet(b.dataset.v==='time'?{mode:'time',len:180}:{mode:'last'});SFX.pick(1)});
    box.querySelectorAll('#rmdiff2 button').forEach(b=>b.onclick=()=>{roomHostSet({diff:b.dataset.v});SFX.pick(1)})}
}
function toastCopied(el){if(!el)return;el.classList.add('copied');el.dataset.tip=L('已复制房间码','Room code copied');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('copied'),1600)}
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
  const left=d.mode==='time'?duelRemaining():null;
  el.innerHTML=`<div class="rbh">${d.mode==='time'?`<b>${fmt(left)}</b> ${L('剩余','left')}`:`<b>${L('无尽','Endless')}</b> ${L('每人 3 条生命 · 有人耗尽即结束','3 lives each · round ends when anyone runs out')}`}</div>`+ps.map((p,i)=>{const C=CLASSES[p.cls]||CLASSES.swordsman,score=p.uid===me?G.score:(p.score||0),hp=p.uid===me?Math.max(0,G.P.hp/G.P.maxHp):(p.hp??1),dead=p.uid===me?!!G.over&&G.over!=='pk':p.alive===false;
    const av=p.uid===me?SAVE.avatar:p.av;return `<div class="rb ${p.uid===me?'me':''} ${dead?'dead':''}"><i>${i+1}</i>${av?avatarHTML(av):`<span class="g" style="color:${C.col}">${C.g}</span>`}<b>${esc(p.name||'?')}</b><span class="sc">${score}</span><em><s style="width:${Math.round(hp*100)}%;background:${C.col}"></s></em></div>`}).join('');
}
function renderRoomResults(){
  const el=$('#roomres');if(!el)return;const me=roomUid(),ranked=roomRank(),done=!!ROOM.results,myRank=ranked.findIndex(p=>p.uid===me)+1,d=ROOM.data||{},aborted=!!(ROOM.aborted||G.abandoned||G.duelAborted);
  if(aborted){const title=$('#endb h2');if(title)title.textContent=L('对决中止','Duel interrupted')}
  el.innerHTML=`<h3>${aborted?L('提前放弃，本局不计天梯','Interrupted: no ladder points awarded'):done?(myRank===1?L('🏆 第一名!','🏆 First place!'):L(`第 ${myRank} 名`,`Rank ${myRank}`)):L('等待其他玩家完成…','Waiting for the others…')}</h3>
    <div class="roomstandings"><h4>${L('全部名次','Standings')}</h4>${ranked.map((p,i)=>{const C=CLASSES[p.cls]||CLASSES.swordsman,av=p.uid===me?SAVE.avatar:p.av,win=done&&!aborted&&i===0;return `<div class="rr ${p.uid===me?'me':''} ${win?'win':''}"><i>${win?'👑':i+1}</i>${av?avatarHTML(av):`<span class="g" style="color:${C.col}">${C.g}</span>`}<b>${esc(p.name||'?')}${win?` <em>${L('胜者','Winner')}</em>`:''}</b><small>${p.alive===false?L('已淘汰','Eliminated'):p.done?L('完成','done'):L('战斗中','fighting')} · Lv ${p.lv||1} · ${p.kills||0} ${L('击杀','kills')}</small><span class="sc">${p.uid===me?G.score:(p.score||0)}</span></div>`}).join('')}</div>
    ${done&&!aborted&&!ROOM.rewarded?(()=>{ROOM.rewarded=true;const win=myRank===1,rankReward=awardDuel(win?20:-5),dT=rankReward.dT,gold=win?200:60;SAVE.gold+=gold;SAVE.rooms=SAVE.rooms||{w:0,p:0};SAVE.rooms.p++;if(win)SAVE.rooms.w++;persist();ROOM.rewardHTML=`<div class="rewards"><span class="rw gold">${ICON.misc('gold','#ffd27a','sm')}+${gold+rankReward.gold+(G.runRewardGold||0)}<small>${L('金币','gold')}</small></span>${G.metaReward?.xp?`<span class="rw xp">+${G.metaReward.xp}<small>${L('冒险经验','renown')}</small></span>`:''}</div><p class="result-rank">${L('天梯：','Ladder: ')}${L(ladderOf(SAVE.trophies||0)[1],ladderOf(SAVE.trophies||0)[2])} · ${SAVE.trophies||0} 🏆 (${dT>0?'+':''}${dT})</p>`;return ROOM.rewardHTML})():(ROOM.rewarded&&done&&!aborted?(ROOM.rewardHTML||''):'')}
    <div class="btns">${ROOM.host?`<button type="button" class="go" id="rmagain" ${done?'':'disabled'}>${L('回到房间再来一局','Back to room')}</button>`:`<span class="note room-wait" role="status">${L('等待房主重开房间','Waiting for the host to restart')}</span>`}<button type="button" class="go alt" id="rmquit">${L('离开房间','Leave room')}</button></div>`;
  const a=$('#rmagain');if(a)a.onclick=()=>{if(!ROOM.results)return;roomBackToLobby();toLobby();showScreen('hero')};
  $('#rmquit').onclick=()=>{roomLeave(true);SAVE.mode='solo';persist();toLobby()};
}
