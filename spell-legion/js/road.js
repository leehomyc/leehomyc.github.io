'use strict';
/* road.js — level, training and duel ranks. Ascension remains the adventure challenge ladder. */
const TIER_COLS=['#c8864a','#cfd6dd','#ffd27a','#9fe3f0','#b9f2ff','#c7a4f0','#ff9c5a'];
function ladderIdx(tr){return Math.max(0,LADDER.indexOf(ladderOf(tr)))}
function ladderNext(tr){const i=ladderIdx(tr);return LADDER[i+1]||null}
function roadBits(){const a=accountLv(),t=titleFor(a.lv),tr=SAVE.trophies||0,lad=ladderOf(tr),nxt=ladderNext(tr),li=ladderIdx(tr);
  const A=SAVE.asura||{max:0,sel:0};return {a,t,tr,lad,nxt,li,lcol:TIER_COLS[li]||'#ffd27a',lpct:nxt?Math.round(100*(tr-lad[0])/Math.max(1,nxt[0]-lad[0])):100,tier:A.max||0,tierSel:Math.min(A.sel||0,A.max||0),tierMax:ASURA.length}}
function tierPips(max,sel,total){let s='';for(let i=1;i<=total;i++)s+=`<i class="${i<=max?'on':''}${i===sel?' sel':''}" title="${L(`修罗 ${i} 层`,`Tier ${i}`)}${i<=max?'':L(' · 未解锁',' · locked')}"></i>`;return s}
function closeAvatarPicker(){const pop=$('#avpop');if(pop)pop.remove();$('#avbtn')?.setAttribute('aria-expanded','false')}
function syncAvatarPicker(pop){
  pop.querySelectorAll('[data-i]').forEach(b=>{const selected=+(b.dataset.i)===(SAVE.avatar?.e||0);b.classList.toggle('on',selected);b.setAttribute('aria-pressed',String(selected))});
  pop.querySelectorAll('.av').forEach(a=>a.style.setProperty('--h',SAVE.avatar?.h??30));
}
document.addEventListener('click',e=>{const pop=$('#avpop');if(pop&&!pop.contains(e.target)&&!e.target.closest?.('#avbtn'))closeAvatarPicker()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#avpop')){closeAvatarPicker();$('#avbtn')?.focus()}});
/* compact strip on the menu */
function renderProg(){const el=$('#prog');if(!el)return;const popup=el.querySelector('#avpop');const b=roadBits();const xpPct=Math.round(100*(b.a.x||0)/Math.max(1,b.a.need||1));const name=(typeof LB!=='undefined'&&LB.name())||SAVE.name||'';
  const markup=`<div class="pr id"><button type="button" class="avb" id="avbtn" aria-controls="avpop" aria-expanded="${!!popup}" title="${L('换头像','Change avatar')}">${avatarHTML(SAVE.avatar)}</button><button type="button" class="nm" id="namebtn" title="${L('改名','Rename')}"><b>${esc(name)}</b><i class="pen">✎</i></button></div>
    <button type="button" class="pr lv" data-t="road" title="${L('冒险等级','Renown')}">${ICON.misc('crown','#ffe9a0')}<div><b>Lv ${b.a.lv}</b><span class="bar"><i style="width:${xpPct}%"></i></span></div></button>
    <button type="button" class="pr gold" data-t="road" title="${L('金币','Gold')}">${ICON.misc('gold','#ffd27a')}<b>${SAVE.gold}</b></button>`;
  if(popup){for(const node of [...el.childNodes])if(node!==popup)node.remove();el.insertAdjacentHTML('afterbegin',markup);syncAvatarPicker(popup)}else el.innerHTML=markup;
  el.querySelectorAll('.pr[data-t]').forEach(x=>x.onclick=()=>{showTab('road');SFX.pick(1);const p=$('#road');if(p&&p.scrollIntoView)try{p.scrollIntoView({block:'start',behavior:'smooth'})}catch(_){}});
  const ab=$('#avbtn');if(ab)ab.onclick=e=>{e.stopPropagation();let pop=$('#avpop');if(pop){closeAvatarPicker();return}pop=document.createElement('div');pop.id='avpop';pop.setAttribute('role','group');pop.setAttribute('aria-label',L('换头像','Change avatar'));pop.onclick=ev=>ev.stopPropagation();ab.setAttribute('aria-expanded','true');
    pop.innerHTML=`<div class="avg">${AVATARS.map((x,i)=>`<button type="button" data-i="${i}" class="${(SAVE.avatar||{}).e===i?'on':''}">${avatarHTML({e:i,h:SAVE.avatar?.h??30})}</button>`).join('')}</div><div class="avr"><button type="button" class="go alt sm" id="avhue">🎨 ${L('换颜色','Colour')}</button><button type="button" class="go alt sm" id="avname">🎲 ${L('随机名字','Random name')}</button></div>`;
    el.appendChild(pop);syncAvatarPicker(pop);const save=()=>{persist();if(typeof cloudSchedulePush==='function')cloudSchedulePush();renderProg()};
    pop.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{SAVE.avatar={...(SAVE.avatar||{}),e:+b.dataset.i};SFX.pick(1);save()});
    $('#avhue').onclick=()=>{const old=SAVE.avatar?.h??30;SAVE.avatar={...(SAVE.avatar||{e:0}),h:(old+60+Math.floor(Math.random()*241))%360};SFX.pick(1);save()};
    $('#avname').onclick=()=>{SAVE.name=randomName();SAVE.nameSet=false;try{localStorage.setItem('sl_name',SAVE.name)}catch(_){}SFX.pick(1);save()};
  };
  const nb=$('#namebtn');if(nb)nb.onclick=()=>{const cur=LB.name();const inp=document.createElement('input');inp.className='nmedit';inp.maxLength=12;inp.value=cur;inp.setAttribute('aria-label',L('侠名','Hero name'));nb.replaceWith(inp);inp.focus();inp.select();
    let done=false;const fin=ok=>{if(done)return;done=true;const v=inp.value.trim().slice(0,12);if(ok&&v&&v!==cur){LB.setName(v);SFX.complete();if(typeof cloudSchedulePush==='function')cloudSchedulePush()}renderProg()};
    inp.onkeydown=e=>{if(e.key==='Enter')fin(true);else if(e.key==='Escape')fin(false)};inp.onblur=()=>fin(true)}}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
/* the full 江湖 tab */
function renderRoad(){const el=$('#road');if(!el)return;const recEl=$('#record'),b=roadBits(),xpPct=Math.round(100*b.a.x/Math.max(1,b.a.need));
  const rewards=LADDER.filter(r=>RANK_REWARDS[r[0]]).map(([need,zh,en])=>`<span class="rr ${SAVE.rankRewards?.[need]?'on':''}"><b>${L(zh,en)}</b><small>${need} 🏆 · ${RANK_REWARDS[need].gold} ${L('金','gold')}</small></span>`).join('');
  el.innerHTML=`
  <section class="rsec lv"><div class="rh">${ICON.misc('crown','#ffe9a0')}<div><b>${L('冒险等级','Renown')} <em>Lv ${b.a.lv}</em> · ${L(b.t[1],b.t[2])}</b><small>${L(`${b.a.x} / ${b.a.need} · 升级 +${100+(b.a.lv+1)*20} 金 · 冒险伤害 +${Math.round(accountBonus()*100)}%`,`${b.a.x} / ${b.a.need} · next level +${100+(b.a.lv+1)*20} gold · adventure damage +${Math.round(accountBonus()*100)}%`)}</small><span class="bar"><i style="width:${xpPct}%"></i></span></div></div></section>
  <section class="rsec lad"><div class="rh">${ICON.misc('trophy',b.lcol)}<div><b>${L('天梯','Ladder')} <em>${L(b.lad[1],b.lad[2])} · ${b.tr} 🏆</em></b><small>${b.nxt?L(`再 ${b.nxt[0]-b.tr} 🏆 升段`,`${b.nxt[0]-b.tr} 🏆 to rank up`):L('已是最高段位','Top rank reached')}</small><span class="bar lad"><i style="width:${b.lpct}%;background:${b.lcol}"></i></span></div></div><div class="roadrow">${rewards}</div></section>
  <section class="rsec"><div class="rh">${ICON.misc('boss','#ff5a45')}<div><b>${L('修罗','Ascension')} <em>${b.tier} / ${b.tierMax}</em></b><small>${L('金币 +15% / 层','+15% gold / tier')}</small></div></div></section>`;
  if(recEl){recEl.hidden=false;el.appendChild(recEl)}renderProg();
}
