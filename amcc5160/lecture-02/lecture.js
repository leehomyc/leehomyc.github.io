(async()=>{
'use strict';
const byId=id=>document.getElementById(id),error=byId('load-error');
let slides;
try {const r=await fetch('./slides.json?v=20260907-format');if(!r.ok)throw Error();slides=await r.json();if(slides.length!==123)throw Error();}
catch {error.hidden=false;error.textContent='The slide viewer could not load. Please open the slide PDF or full transcript above.';return;}
let current=0;
const hashNumber=()=>{const match=location.hash.match(/^#slide-(\d+)$/);return match?Math.max(1,Math.min(slides.length,Number(match[1]))):1;};
function render(n,updateHash=true){
 current=Math.max(1,Math.min(slides.length,Math.trunc(n)||1));const s=slides[current-1];
 byId('discussion-cue').hidden=!s.discussion;
 byId('slide-image').src=s.image+'?v=20260907-format';byId('slide-image').alt=`Slide ${current}: ${s.title}`;byId('slide-number').value=current;
 byId('script-title').textContent=s.title;byId('script-section').textContent=s.section;
 byId('script-time').textContent=`Pacing estimate ${s.time} · approximately ${s.duration_seconds} seconds`;
 byId('script-source').textContent=s.source||'Original teaching framework or exercise.';
 byId('script-body').replaceChildren(...s.spoken.split(/\n\n/).map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));
 byId('prev').disabled=current===1;byId('next').disabled=current===slides.length;
 byId('now-slide').textContent=`SLIDE ${String(current).padStart(3,'0')} OF ${slides.length}`;
 byId('now-title').textContent=s.title;byId('deck-progress-label').textContent=`${current} / ${slides.length}`;byId('transcript-number').textContent=`SLIDE ${String(current).padStart(3,'0')}`;byId('progress').style.width=(current/slides.length*100)+'%';
 const sectionStart=current>=120?120:current>=111?111:current>=73?73:current>=47?47:current>=7?7:1;document.querySelectorAll('[data-section]').forEach(b=>{const active=Number(b.dataset.section)===sectionStart;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'true':'false');});
 byId('chapter').value=current>=120?'120':current>=111?'111':current>=73?'73':current>=47?'47':current>=7?'7':'1';
 if(updateHash)history.replaceState(null,'',`#slide-${current}`);
 if(current<slides.length){const next=new Image();next.src=slides[current].image;}
}
document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>render(Number(b.dataset.section)));
byId('transcript-toggle').onclick=()=>{const panel=byId('transcript-panel');panel.hidden=!panel.hidden;byId('transcript-toggle').textContent=panel.hidden?'Show transcript':'Hide transcript';byId('transcript-toggle').setAttribute('aria-expanded',String(!panel.hidden));};
byId('prev').onclick=()=>render(current-1);byId('next').onclick=()=>render(current+1);
byId('slide-number').onchange=e=>render(Number(e.target.value));byId('chapter').onchange=e=>render(Number(e.target.value));
byId('fullscreen').onclick=async()=>{try{await byId('slide-stage').requestFullscreen();}catch{error.hidden=false;error.textContent='Full screen is unavailable in this browser. Use the slide PDF for projection.';}};
byId('slide-image').onerror=()=>{error.hidden=false;error.textContent='This slide image could not load. Please try again or open the slide PDF.';};
byId('slide-image').onload=()=>{error.hidden=true;};
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowRight'){e.preventDefault();render(current+1);}if(e.key==='ArrowLeft'){e.preventDefault();render(current-1);}});
window.addEventListener('hashchange',()=>{if(/^#slide-\d+$/.test(location.hash))render(hashNumber(),false);});
render(hashNumber(),false);
})();
