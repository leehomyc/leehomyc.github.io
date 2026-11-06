'use strict';
/* link.js — real-time links between the players of a room: WebRTC data channels, host in the middle.
   Signalling rides on the room's own event feed (Firestore online, localStorage between tabs), so there is no extra server.
   A guest holds one link to the host; the host answers whoever dials. Links are made in the lobby, before a match starts. */
const LINK={peers:{},hostUid:null,onmsg:null,
  ice:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]};
function linkOpenTo(uid){const p=LINK.peers[uid];return !!(p&&p.ch&&p.ch.readyState==='open')}
function linkOpenUids(){return Object.keys(LINK.peers).filter(linkOpenTo)}
function linkSend(uid,msg){const p=LINK.peers[uid];if(!p||!p.ch||p.ch.readyState!=='open')return false;try{p.ch.send(typeof msg==='string'?msg:JSON.stringify(msg));return true}catch(_){return false}}
function linkClose(uid){const p=LINK.peers[uid];if(!p)return;delete LINK.peers[uid];try{p.pc.close()}catch(_){}}
function linkCloseAll(){for(const u in LINK.peers)linkClose(u);LINK.hostUid=null}
function linkGather(pc,ms=2000){return new Promise(res=>{if(pc.iceGatheringState==='complete')return res();const t=setTimeout(res,ms);pc.addEventListener('icegatheringstatechange',()=>{if(pc.iceGatheringState==='complete'){clearTimeout(t);res()}})})}
function linkWire(uid,p,ch){p.ch=ch;
  ch.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}if(LINK.onmsg)LINK.onmsg(uid,m)};
  ch.onopen=()=>{if(typeof renderRoom==='function')renderRoom()};ch.onclose=()=>{if(LINK.peers[uid]===p)linkClose(uid);if(typeof renderRoom==='function')renderRoom()}}
function linkPeer(uid){linkClose(uid);const pc=new RTCPeerConnection({iceServers:LINK.ice});const p={pc,ch:null,t:Date.now()};LINK.peers[uid]=p;
  pc.ondatachannel=e=>linkWire(uid,p,e.channel);
  pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState)&&LINK.peers[uid]===p){delete LINK.peers[uid];if(typeof renderRoom==='function')renderRoom()}};
  return p}
function linkSignal(to,body){if(!ROOM.code)return;netT().addEvent(ROOM.code,{from:roomUid(),k:'rtc',to,...body})}
/* a guest dials the host: one ordered, reliable channel carries everything */
async function linkDial(uid){
  if(typeof RTCPeerConnection==='undefined')return;const p=linkPeer(uid);
  try{linkWire(uid,p,p.pc.createDataChannel('g',{ordered:true}));
    await p.pc.setLocalDescription(await p.pc.createOffer());await linkGather(p.pc);
    if(LINK.peers[uid]!==p)return;p.oid=Math.random().toString(36).slice(2,8);linkSignal(uid,{sdp:p.pc.localDescription.toJSON(),oid:p.oid})}catch(e){console.warn('rtc dial',e)}}
async function linkOnSignal(ev){
  if(ev.to!==roomUid()||!ev.sdp)return;const uid=ev.from;
  try{
    if(ev.sdp.type==='offer'){if(!ROOM.host)return;const p=linkPeer(uid);await p.pc.setRemoteDescription(ev.sdp);await p.pc.setLocalDescription(await p.pc.createAnswer());await linkGather(p.pc);
      if(LINK.peers[uid]!==p)return;linkSignal(uid,{sdp:p.pc.localDescription.toJSON(),oid:ev.oid})}
    else if(ev.sdp.type==='answer'){const p=LINK.peers[uid];if(p&&p.oid&&p.oid===ev.oid&&p.pc.signalingState==='have-local-offer'){await p.pc.setRemoteDescription(ev.sdp);p.ans=Date.now()}}
  }catch(e){console.warn('rtc signal',e)}}
/* keep links in step with the room; a dial with no answer for 15 s, or an answer that never connects, is redialled */
function linkSync(){
  if(typeof ROOM==='undefined'||!ROOM.code){if(Object.keys(LINK.peers).length)linkCloseAll();return}
  const host=ROOM.data&&ROOM.data.host,me=roomUid();
  if(ROOM.host){if(LINK.hostUid!==me){linkCloseAll();LINK.hostUid=me}for(const u in LINK.peers)if(!ROOM.players[u])linkClose(u);const w=typeof roomLinkWait==='function'&&roomLinkWait()>0;if(LINK._w!==w){LINK._w=w;if(typeof renderRoom==='function')renderRoom()}return}
  if(LINK.hostUid!==host){linkCloseAll();LINK.hostUid=host}
  if(!host||!ROOM.players[host])return;
  const p=LINK.peers[host],now=Date.now();if(!p||(!linkOpenTo(host)&&(p.ans?now-p.ans>15000:now-p.t>15000)))linkDial(host)}
setInterval(linkSync,1500);
