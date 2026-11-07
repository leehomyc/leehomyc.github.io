'use strict';
/* Keyboard, pointer and controller input share the same action and overlay guards. */
const keys=new Set(),pickKeyHeld=new Set();
const touch={on:false,id:null,sx:0,sy:0,x:0,y:0};
function editingControl(target=document.activeElement){return !!(target&&(target.isContentEditable||target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')))}
function inputOverlay(){return document.querySelector('#gearov:not([hidden]),#lb:not([hidden])')}
function combatInputsReady(){return !document.hidden&&document.hasFocus?.()!==false&&canAct()&&!editingControl()&&!inputOverlay()}
function clearGameInput(){keys.clear();pickKeyHeld.clear();touch.on=false;touch.id=null}
function handleGameKeydown(e){
  if(e.defaultPrevented||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||editingControl(e.target))return;
  const k=e.key.toLowerCase();
  if((['enter',' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))&&e.target?.closest?.('button,a,summary,[role="button"]'))return;
  if(e.repeat&&!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k))return;
  SFX.start();
  if(k==='m'){const m=SFX.toggleMute();syncSound();showBanner(m?'静音':'声音开启',m?'Muted':'Sound on',.8);return}
  if(inputOverlay())return;
  if(!G||G.auto){if(k==='enter'&&!e.repeat&&!$('#title').hidden&&!lobbyTab)activateMenuControl($('#hero').hidden?'#menubtns .mb.big':'#startbtn');return}
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  keys.add(k);
  if(pickKeyHeld.has(k))return;
  if(G.over||G.ended)return;
  if(k==='p'||k==='escape'){e.preventDefault();if(G.panel)togglePanel();else togglePause();return}
  if(G.paused)return;
  if(G.pick){
    const i=/^[1-9]$/.test(k)?+k-1:({j:0,k:1,l:2})[k];
    if(i!==undefined&&!e.repeat&&performance.now()-pickOpenedAt>=420&&G.pick[i]){pickKeyHeld.add(k);choose(i)}
    return;
  }
  if(k==='c'||k==='t'){togglePanel();return}
  if(!combatInputsReady())return;
  if(k==='1'||k==='j')castSkill(1);if(k==='2'||k==='k')castSkill(2);if(k==='3'||k==='l')castSkill(3);
  if(k===' '||k==='shift')dash();
}
addEventListener('keydown',handleGameKeydown);
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);pickKeyHeld.delete(k)});
addEventListener('blur',clearGameInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearGameInput()});
addEventListener('focusin',clearGameInput);
cv.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.isPrimary===false||!combatInputsReady())return;
  touch.on=true;touch.id=e.pointerId;touch.sx=touch.x=e.clientX;touch.sy=touch.y=e.clientY;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
});
cv.addEventListener('pointermove',e=>{if(touch.on&&touch.id===e.pointerId){touch.x=e.clientX;touch.y=e.clientY}});
['pointerup','pointercancel','lostpointercapture'].forEach(n=>cv.addEventListener(n,e=>{if(touch.id===e.pointerId){touch.on=false;touch.id=null}}));
cv.addEventListener('contextmenu',e=>e.preventDefault());
function input(){
  if(!combatInputsReady())return {x:0,y:0};
  let x=0,y=0;
  if(keys.has('a')||keys.has('arrowleft'))x--;if(keys.has('d')||keys.has('arrowright'))x++;
  if(keys.has('w')||keys.has('arrowup'))y--;if(keys.has('s')||keys.has('arrowdown'))y++;
  if(touch.on){const dx=touch.x-touch.sx,dy=touch.y-touch.sy,l=hyp(dx,dy);if(l>6){x=dx/Math.max(l,36);y=dy/Math.max(l,36)}}
  const gp=padState();if(gp&&(Math.abs(gp.x)>.2||Math.abs(gp.y)>.2)){x=gp.x;y=gp.y}
  return {x,y};
}
const PAD={prev:[],id:null,pick:null,sel:0};
function padState(){try{
  const g=Array.from(navigator.getGamepads?.()||[]).find(p=>p&&p.connected);if(!g)return null;
  let x=g.axes[0]||0,y=g.axes[1]||0;const d=Math.hypot(x,y);
  if(d<.2){x=0;y=0}else{const k=Math.min(1,(d-.2)/.8)/d;x*=k;y*=k}
  if(g.buttons[14]?.pressed)x=-1;if(g.buttons[15]?.pressed)x=1;if(g.buttons[12]?.pressed)y=-1;if(g.buttons[13]?.pressed)y=1;
  return {x,y,g};
}catch(_){return null}}
function activateMenuControl(fallback){
  const el=document.activeElement;
  const target=el?.matches?.('button,a,summary,[role="button"]')&&el.getClientRects().length?el:document.querySelector(fallback);
  if(target&&!target.disabled)target.click();
}
function padTick(){
  const s=padState();if(!s){PAD.id=null;PAD.prev=[];return}
  const id=s.g.index+':'+s.g.id,pressed=Array.from(s.g.buttons,b=>!!b.pressed),prev=PAD.prev;
  PAD.prev=pressed;
  if(PAD.id!==id){PAD.id=id;return}
  const edge=i=>pressed[i]&&!prev[i];
  if(!G||document.hidden||document.hasFocus?.()===false||editingControl())return;
  const overlay=inputOverlay();if(overlay){if(edge(1))overlay.querySelector('#gearclose,#lbclose')?.click();return}
  if(!$('#title').hidden){if(edge(1)){if(lobbyTab)showTab('');else if(!$('#hero').hidden)showScreen('menu');return}if(edge(0)||edge(9))activateMenuControl(lobbyTab?'#lobbyback':$('#hero').hidden?'#menubtns .mb.big':'#startbtn');return}
  if(!$('#end').hidden){if(edge(0))activateMenuControl('#againbtn');if(edge(1))toLobby();return}
  if(G.panel){if(edge(1)||edge(9))togglePanel();return}
  if(edge(9)){togglePause();return}
  if(G.paused){if(edge(0)||edge(1))togglePause();return}
  if(G.pick){
    const n=G.pick.length;if(!n)return;
    if(PAD.pick!==G.pick){PAD.pick=G.pick;PAD.sel=0}
    if(edge(14)||edge(4))PAD.sel=(PAD.sel+n-1)%n;if(edge(15)||edge(5))PAD.sel=(PAD.sel+1)%n;
    document.querySelectorAll('#cardrow .card').forEach((c,i)=>c.classList.toggle('padsel',i===PAD.sel));
    if(edge(0)&&performance.now()-pickOpenedAt>=420)choose(PAD.sel);
    if(edge(3)&&G.rerolls>0)$('#reroll').click();return;
  }
  if(!combatInputsReady())return;
  if(edge(0))dash();if(edge(2))castSkill(1);if(edge(3))castSkill(2);if(edge(1))castSkill(3);
}
addEventListener('gamepadconnected',()=>{PAD.id=null;showBanner(L('手柄已连接','Controller connected'),'',1.2)});
addEventListener('gamepaddisconnected',()=>{PAD.id=null;PAD.prev=[]});
