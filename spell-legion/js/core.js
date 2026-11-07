'use strict';
/* core.js — constants, helpers and the fixed world layout */
const $=s=>document.querySelector(s);
const W=2600,H=2000,TAU=Math.PI*2;
/* simulation RNG: seedable so a daily challenge is the same for everyone; rendering/audio keep Math.random */
/* language: 'zh' or 'en'; L(zh,en) picks one string */
/* language, first match wins:
   1. the link itself — /spell-legion/en/ or ?lang=en (the folder pages forward here with ?lang=)
   2. the player's own pick in Settings (sl_lang)
   3. the country of their IP, looked up once and cached (sl_lang_ip; see langAuto in ui.js)
   4. the browser's language */
const LANGS=['zh','en'];
const LANG_BY_COUNTRY={CN:'zh',HK:'zh',MO:'zh',TW:'zh'}; // everyone else gets English until more languages ship
let LANG_FROM_URL=false;
let LANG=(()=>{try{const q=new URLSearchParams(location.search).get('lang');if(LANGS.includes(q)){localStorage.setItem('sl_lang',q);LANG_FROM_URL=true;return q}
  const l=localStorage.getItem('sl_lang');if(LANGS.includes(l))return l;const ip=localStorage.getItem('sl_lang_ip');if(LANGS.includes(ip))return ip}catch(_){}
  return (navigator.language||'').toLowerCase().startsWith('zh')?'zh':'en'})();
document.documentElement.lang=LANG;
const L=(zh,en)=>LANG==='zh'?zh:(en!==undefined?en:zh);
const LL=o=>o?(LANG==='zh'?(o.zh!==undefined?o.zh:o.d):(o.en!==undefined?o.en:o.de)):'';
function setLang(l){LANG=l;try{localStorage.setItem('sl_lang',l)}catch(_){}document.documentElement.lang=l;document.title=L('魔咒军团','Spell Legion')}
let SIMR=Math.random;
function seedSim(seed){if(seed===null||seed===undefined){SIMR=Math.random;return}let a=seed|0;SIMR=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
const rnd=(a=1,b)=>b===undefined?SIMR()*a:a+SIMR()*(b-a);
const pick=a=>a[Math.floor(SIMR()*a.length)];
/* visual-only randomness (never affects the simulation) */
const vrnd=(a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const vpick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const hyp=Math.hypot;
const PHONE=matchMedia('(pointer:coarse)').matches;
const IS_DESKTOP=!!(window.desktop&&window.desktop.isDesktop);
const cv=$('#cv'),ov=$('#ov'),c=ov.getContext('2d');

/* points of interest */
const PONDS=[[640,560,118,84],[1960,1440,128,90],[1990,540,82,58],[610,1470,92,64]];
const SHRINES=[[520,430],[2080,430],[520,1570],[2080,1570]];
const PAVS=[[W/2,330],[W/2,H-330]];
const PLAZA_R=150;
const BOSS_AT=240;

/* trails: polylines the ground painter, lanterns and grass all use */
const TRAILS=[];
(function(){
  const cx=W/2,cy=H/2;
  const bend=(a,b,k)=>{const p=[];for(let i=0;i<=24;i++){const d=i/24,x=a[0]+(b[0]-a[0])*d,y=a[1]+(b[1]-a[1])*d,nx=-(b[1]-a[1]),ny=(b[0]-a[0]),l=hyp(nx,ny)||1;p.push([x+nx/l*Math.sin(d*Math.PI)*k,y+ny/l*Math.sin(d*Math.PI)*k])}return p};
  SHRINES.forEach((s,i)=>TRAILS.push({w:26,pts:bend([cx,cy],s,i%2?70:-70)}));
  PAVS.forEach(p=>TRAILS.push({w:30,pts:bend([cx,cy],p,0)}));
  const ring=[];for(let i=0;i<=96;i++){const a=i/96*TAU;ring.push([cx+Math.cos(a)*(560+Math.sin(a*5)*26),cy+Math.sin(a)*(420+Math.cos(a*4)*22)])}TRAILS.push({w:24,pts:ring});
  TRAILS.push({w:20,pts:bend(SHRINES[0],PONDS[0].slice(0,2),40)});TRAILS.push({w:20,pts:bend(SHRINES[3],PONDS[1].slice(0,2),-40)});
  TRAILS.push({w:20,pts:bend(SHRINES[1],PONDS[2].slice(0,2),30)});TRAILS.push({w:20,pts:bend(SHRINES[2],PONDS[3].slice(0,2),-30)});
})();
function onTrail(x,y,pad=0){
  for(const t of TRAILS){const p=t.pts;for(let i=1;i<p.length;i++){const ax=p[i-1][0],ay=p[i-1][1],bx=p[i][0],by=p[i][1],dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy||1,k=clamp(((x-ax)*dx+(y-ay)*dy)/l2,0,1);if(hyp(x-(ax+dx*k),y-(ay+dy*k))<t.w*.5+pad)return true}}
  return false;
}
const onPond=(x,y,pad=1.15)=>PONDS.some(p=>hyp((x-p[0])/p[2],(y-p[1])/p[3])<pad);

/* colliders */
let rocks=[],maples=[],lanterns=[];
function buildArena(){
  rocks=[];maples=[];lanterns=[];rockGrid=null;
  const taken=[[W/2,H/2,250],...PONDS.map(p=>[p[0],p[1],p[2]+60]),...SHRINES.map(s=>[s[0],s[1],70]),...PAVS.map(p=>[p[0],p[1],110])];
  const free=(x,y,r)=>!taken.some(t=>hyp(t[0]-x,t[1]-y)<t[2]+r)&&!onTrail(x,y,r);
  // pavilion columns and the four archways on the plaza
  PAVS.forEach(p=>{for(const sx of [-34,34])for(const sz of [-34,34])rocks.push({x:p[0]+sx-5,y:p[1]+sz-5,w:10,h:10,col:1,pav:p})});
  const cx=W/2,cy=H/2;
  for(const [ox,oy,dir] of [[0,-210,'ns'],[0,210,'ns'],[-235,0,'ew'],[235,0,'ew']]){const ax=cx+ox,ay=cy+oy;
    for(const s of [-26,26]){if(dir==='ns')rocks.push({x:ax+s-4,y:ay-4,w:8,h:8,arch:dir,ax,ay});else rocks.push({x:ax-4,y:ay+s-4,w:8,h:8,arch:dir,ax,ay})}}
  for(let i=0;i<6;i++){const a=i/6*TAU+.52;rocks.push({x:cx+Math.cos(a)*190-8,y:cy+Math.sin(a)*150-7,w:16,h:14,mono:1})}
  SHRINES.forEach(s=>rocks.push({x:s[0]-7,y:s[1]-7,w:14,h:14,shrine:1}));
  for(let i=0;i<260&&rocks.filter(r=>r.ruin).length<18;i++){const w=rnd(34,96),h=rnd(30,76),x=rnd(90,W-90-w),y=rnd(90,H-90-h);if(!free(x+w/2,y+h/2,Math.max(w,h)/2+40))continue;rocks.push({x,y,w,h,ruin:1});taken.push([x+w/2,y+h/2,Math.max(w,h)/2+20])}
  for(let i=0;i<300&&rocks.filter(r=>r.bamboo).length<12;i++){const w=rnd(60,130),h=rnd(50,110),x=rnd(80,W-80-w),y=rnd(80,H-80-h);if(!free(x+w/2,y+h/2,Math.max(w,h)/2+30))continue;rocks.push({x,y,w,h,bamboo:1});taken.push([x+w/2,y+h/2,Math.max(w,h)/2+20])}
  for(let i=0;i<500&&maples.length<58;i++){const x=rnd(70,W-70),y=rnd(70,H-70);if(!free(x,y,34))continue;const k=rnd(.8,1.5);maples.push([x,y,k,Math.random()<.5?0:1]);rocks.push({x:x-3,y:y-3,w:6,h:6,tree:1});taken.push([x,y,30])}
  for(const t of TRAILS){const p=t.pts;let acc=0;for(let i=1;i<p.length;i++){const l=hyp(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);acc+=l;if(acc>230){acc=0;const nx=-(p[i][1]-p[i-1][1])/l,ny=(p[i][0]-p[i-1][0])/l,side=lanterns.length%2?1:-1,x=p[i][0]+nx*side*(t.w*.5+10),y=p[i][1]+ny*side*(t.w*.5+10);if(x>40&&x<W-40&&y>40&&y<H-40&&!onPond(x,y,1.3)&&hyp(x-W/2,y-H/2)>170)lanterns.push([x,y,Math.atan2(nx*side,ny*side)])}}}
}
/* static spatial grid over the obstacles (64 px cells) so collisions check a handful of rocks instead of all ~130 */
const RG=64,RGW=Math.ceil(W/RG)+1;let rockGrid=null;
function buildRockGrid(){rockGrid=new Array(RGW*(Math.ceil(H/RG)+1));for(const b of rocks){const x0=Math.max(0,(b.x-24)/RG|0),x1=Math.min(RGW-1,(b.x+b.w+24)/RG|0),y0=Math.max(0,(b.y-24)/RG|0),y1=Math.min(Math.ceil(H/RG),(b.y+b.h+24)/RG|0);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const k=y*RGW+x;(rockGrid[k]||(rockGrid[k]=[])).push(b)}}}
function rocksNear(x,y){if(!rockGrid)buildRockGrid();const k=(y/RG|0)*RGW+(x/RG|0);return rockGrid[k]||[]}
function collide(o,r){
  o.x=clamp(o.x,20+r,W-20-r);o.y=clamp(o.y,20+r,H-20-r);
  for(const b of rocksNear(o.x,o.y)){
    const nx=clamp(o.x,b.x,b.x+b.w),ny=clamp(o.y,b.y,b.y+b.h),dx=o.x-nx,dy=o.y-ny,d2=dx*dx+dy*dy;
    if(d2<r*r){
      if(d2>0.0001){const d=Math.sqrt(d2);o.x=nx+dx/d*r;o.y=ny+dy/d*r}
      else{const l=o.x-b.x,rr=b.x+b.w-o.x,t=o.y-b.y,bo=b.y+b.h-o.y,m=Math.min(l,rr,t,bo);
        if(m===l)o.x=b.x-r;else if(m===rr)o.x=b.x+b.w+r;else if(m===t)o.y=b.y-r;else o.y=b.y+b.h+r}
    }
  }
}
const blocked=(x,y)=>{for(const r of rocksNear(x,y))if(!r.tree&&x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h)return true;return false};
