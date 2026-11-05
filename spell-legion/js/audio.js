'use strict';
/* audio.js — procedural wuxia soundtrack and sound effects (Web Audio, no files) */
const SFX=(()=>{
  let ac=null,master,musicG,sfxG,muted=false,state='title',nextBeat=0,beat=0,bar=0,drone=null,lastHit=0,lastTick=0,started=false,musicVol=.6,sfxVol=.8;
  const save=()=>{try{localStorage.setItem('sl_audio',JSON.stringify({muted,musicVol,sfxVol}))}catch(_){}};
  try{const o=JSON.parse(localStorage.getItem('sl_audio')||'null');if(o){muted=!!o.muted;if(o.musicVol!==undefined)musicVol=o.musicVol;if(o.sfxVol!==undefined)sfxVol=o.sfxVol}}catch(_){}
  function ensure(){
    if(ac)return true;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    ac=new AC();master=ac.createGain();master.gain.value=muted?0:.8;
    const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;
    master.connect(comp);comp.connect(ac.destination);
    musicG=ac.createGain();musicG.gain.value=musicVol;musicG.connect(master);
    sfxG=ac.createGain();sfxG.gain.value=sfxVol;sfxG.connect(master);
    // reverb from a synthetic impulse
    const len=ac.sampleRate*2.2,buf=ac.createBuffer(2,len,ac.sampleRate);
    for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)*.5}
    const rv=ac.createConvolver();rv.buffer=buf;const rg=ac.createGain();rg.gain.value=.32;rv.connect(rg);rg.connect(master);ac.rv=rv;
    return true;
  }
  const now=()=>ac.currentTime;
  function osc(type,f,t0,dur,g,dest,o={}){
    const v=ac.createOscillator(),e=ac.createGain();v.type=type;v.frequency.setValueAtTime(f,t0);
    if(o.slide)v.frequency.exponentialRampToValueAtTime(Math.max(20,o.slide),t0+dur*(o.slideT||1));
    e.gain.setValueAtTime(0,t0);e.gain.linearRampToValueAtTime(g,t0+(o.a||.005));e.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    v.connect(e);let out=e;
    if(o.lp){const f2=ac.createBiquadFilter();f2.type='lowpass';f2.frequency.value=o.lp;f2.Q.value=o.q||.7;e.connect(f2);out=f2}
    out.connect(dest||sfxG);if(o.rv)out.connect(ac.rv);
    v.start(t0);v.stop(t0+dur+.05);return v;
  }
  function noise(t0,dur,g,dest,o={}){
    const n=ac.sampleRate*dur|0,b=ac.createBuffer(1,Math.max(1,n),ac.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    const s=ac.createBufferSource();s.buffer=b;const e=ac.createGain();e.gain.setValueAtTime(g,t0);e.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    const f=ac.createBiquadFilter();f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f||1800,t0);if(o.slide)f.frequency.exponentialRampToValueAtTime(o.slide,t0+dur);f.Q.value=o.q||.8;
    s.connect(f);f.connect(e);e.connect(dest||sfxG);if(o.rv)e.connect(ac.rv);s.start(t0);s.stop(t0+dur+.02);
  }
  /* instruments */
  function guqin(f,t0,g=.5,dur=1.6){ // plucked silk string
    osc('triangle',f,t0,dur,g*.7,musicG,{lp:f*3.5,q:1.2,rv:1});osc('sine',f*2.01,t0,dur*.5,g*.22,musicG,{rv:1});osc('sine',f*.5,t0,dur*.9,g*.18,musicG);
    noise(t0,.05,g*.35,musicG,{f:f*4,q:2});
  }
  function dizi(f,t0,dur,g=.3){ // bamboo flute with breath
    const v=ac.createOscillator(),e=ac.createGain(),lfo=ac.createOscillator(),lg=ac.createGain();
    v.type='sine';v.frequency.value=f;lfo.frequency.value=5.2;lg.gain.value=f*.012;lfo.connect(lg);lg.connect(v.frequency);
    e.gain.setValueAtTime(0,t0);e.gain.linearRampToValueAtTime(g,t0+.18);e.gain.setValueAtTime(g,t0+dur-.25);e.gain.linearRampToValueAtTime(0,t0+dur);
    v.connect(e);e.connect(musicG);e.connect(ac.rv);v.start(t0);lfo.start(t0);v.stop(t0+dur+.05);lfo.stop(t0+dur+.05);
    osc('sine',f*2,t0,dur,g*.12,musicG,{a:.2});noise(t0,dur,g*.08,musicG,{f:f*2,q:3});
  }
  function taiko(t0,g=.8,low=70){osc('sine',low*2.2,t0,.42,g,musicG,{slide:low,slideT:.3});noise(t0,.12,g*.35,musicG,{f:900,type:'lowpass'})}
  function bell(f,t0,g=.3){osc('sine',f,t0,2.2,g,musicG,{rv:1});osc('sine',f*2.76,t0,1.1,g*.35,musicG,{rv:1});osc('sine',f*5.4,t0,.5,g*.12,musicG)}
  function woodblock(t0,g=.25){osc('square',1700,t0,.05,g*.4,musicG,{lp:2500});noise(t0,.03,g*.5,musicG,{f:3000,q:2})}
  /* music: 宫调 pentatonic in D */
  const SC=[146.83,164.81,185.00,220.00,246.94,293.66,329.63,369.99,440.00,493.88,587.33];
  const PHRASES=[[5,7,8,7,5,3,5,-1],[8,10,8,7,5,-1,3,5],[3,5,7,5,3,2,0,-1],[7,8,10,8,7,5,7,-1],[5,-1,7,-1,8,7,5,3]];
  let phrase=0,pi=0,fluteT=0;
  function schedule(){
    if(!ac||state==='off')return;
    const t=now();
    while(nextBeat<t+.4){
      const bpm=state==='boss'?138:state==='battle'?104:72,bl=60/bpm;
      const b16=beat%16,b4=beat%4;
      if(state==='title'){
        if(b4===0&&Math.random()<.85){const n=PHRASES[phrase][pi];pi=(pi+1)%8;if(pi===0)phrase=(phrase+1)%PHRASES.length;if(n>=0)guqin(SC[n],nextBeat,.5,2.4);if(Math.random()<.3)guqin(SC[n>=0?n:5]/2,nextBeat+bl*.5,.3,2)}
        if(b16===0&&Math.random()<.5)bell(SC[8],nextBeat,.16);
        if(b16===8&&Math.random()<.6)dizi(SC[vpick([5,7,8,10])],nextBeat,bl*5,.22);
      }else if(state==='battle'){
        if(b4===0||b4===2){const n=PHRASES[phrase][pi];pi=(pi+1)%8;if(pi===0)phrase=(phrase+1)%PHRASES.length;if(n>=0)guqin(SC[n],nextBeat,.45,1.4);}
        if(b16===0||b16===10)taiko(nextBeat,.7);if(b16===4||b16===12)taiko(nextBeat,.45,100);
        if(b4===1||b4===3)woodblock(nextBeat,.22);
        if(b16===0&&bar%2===0)dizi(SC[vpick([7,8,10])],nextBeat+bl,bl*6,.2);
        if(b16===0)guqin(SC[0],nextBeat,.5,3);
      }else if(state==='boss'){
        if(b4===0||b4===2||b4===3){const n=PHRASES[(phrase+2)%PHRASES.length][pi];pi=(pi+1)%8;if(n>=0)guqin(SC[n]*(b4===3?.5:1),nextBeat,.5,.9)}
        if(b4===0)taiko(nextBeat,.9,60);if(b16%4===2)taiko(nextBeat,.5,110);if(b16===14)taiko(nextBeat+bl*.5,.6,80);
        woodblock(nextBeat,b4===1?.3:.14);
        if(b16===0){guqin(SC[0]/2,nextBeat,.6,3);bell(SC[3],nextBeat,.2)}
        if(b16===8)dizi(SC[vpick([8,10])],nextBeat,bl*4,.25);
      }else if(state==='win'){
        if(b4===0){bell(SC[[5,7,8,10][bar%4]],nextBeat,.3);guqin(SC[[5,7,8,10][bar%4]],nextBeat,.5,2.5)}
        if(b4===2)guqin(SC[[8,10,5,7][bar%4]]/2,nextBeat,.35,2);
      }
      beat++;if(beat%16===0)bar++;nextBeat+=bl;
    }
  }
  function setState(s){if(s===state)return;state=s;beat=0;if(ac)nextBeat=Math.max(nextBeat,now()+.1)}
  function start(){
    if(started)return;if(!ensure())return;started=true;
    if(ac.state==='suspended')ac.resume();
    nextBeat=now()+.1;setInterval(schedule,120);
    // ambience: wind and insects
    const wind=ac.createGain();wind.gain.value=.05;wind.connect(master);
    (function loopWind(){if(!ac)return;const t=now();noise(t,6,.5,wind,{type:'lowpass',f:280,q:.5,slide:vrnd(160,420)});setTimeout(loopWind,5200)})();
  }
  const rl=(ms)=>{const t=performance.now();if(t-lastHit<ms)return false;lastHit=t;return true};
  const fx={
    start,setState,
    toggleMute(){muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.8,now(),.05);save();return muted},
    setMute(m){muted=!!m;if(master)master.gain.setTargetAtTime(muted?0:.8,now(),.05);save()},
    setMusic(v){musicVol=clamp(v,0,1);if(musicG)musicG.gain.setTargetAtTime(musicVol,now(),.05);save()},
    setSfx(v){sfxVol=clamp(v,0,1);if(sfxG)sfxG.gain.setTargetAtTime(sfxVol,now(),.05);save()},
    get muted(){return muted},get musicVol(){return musicVol},get sfxVol(){return sfxVol},
    hit(big,crit){if(!ac||!rl(big?60:crit?20:38))return;const t=now();if(big){osc('sine',160,t,.25,.5,sfxG,{slide:50});noise(t,.14,.45,sfxG,{f:900,type:'lowpass'})}else{noise(t,crit?.11:.06,crit?.6:.38,sfxG,{f:crit?3600:2300,q:1.4,slide:crit?300:600});osc('triangle',crit?980:560,t,.07,.22,sfxG,{slide:180})}if(crit){osc('sine',1500,t,.16,.26,sfxG,{slide:2800});osc('sine',70,t,.18,.6,sfxG,{slide:40})}},
    boom(sz,thunder){if(!ac)return;const t=now();osc('sine',90+sz*50,t,.55+sz*.4,.9,sfxG,{slide:28});noise(t,.35+sz*.4,.9,sfxG,{f:thunder?2600:700,type:'lowpass',slide:120,rv:1});if(thunder){noise(t,.06,1,sfxG,{f:5000,q:.5});osc('sawtooth',2200,t,.12,.3,sfxG,{slide:300,lp:4000})}},
    wave(){if(!ac)return;const t=now();taiko(t,.7,60);bell(SC[5],t+.05,.25)},
    die(type,combo=0){if(!ac||!rl(45))return;const t=now();const pk=Math.pow(1.03,Math.min(combo,40));if(combo>=5)osc('sine',520*pk,t,.12,.12,sfxG,{slide:1040*pk});if(type==='boss'){for(let i=0;i<5;i++)osc('sine',60+i*17,t+i*.12,1.2,.6,sfxG,{slide:25,rv:1});noise(t,1.6,.8,sfxG,{f:500,type:'lowpass',rv:1});return}noise(t,.16,.3,sfxG,{f:type==='giant'?400:1200,type:'lowpass',slide:120});osc('sine',(type==='giant'?120:260)*Math.pow(1.02,Math.min(combo,40)),t,.2,.3,sfxG,{slide:60})},
    hurt(){if(!ac)return;const t=now();osc('sawtooth',220,t,.22,.4,sfxG,{slide:70,lp:1200});noise(t,.18,.4,sfxG,{f:600,type:'lowpass'})},
    block(){if(!ac)return;const t=now();osc('sine',900,t,.14,.3,sfxG,{slide:1500});osc('triangle',1800,t,.1,.15,sfxG)},
    revive(){if(!ac)return;const t=now();[0,.1,.2,.32].forEach((d,i)=>osc('sine',440*Math.pow(1.26,i),t+d,.7,.3,sfxG,{rv:1}));noise(t,.6,.4,sfxG,{f:3000,slide:300,rv:1})},
    sword(){if(!ac||!rl(60))return;const t=now();noise(t,.16,.32,sfxG,{f:1200,slide:4200,q:1.4});osc('sine',2400,t,.12,.12,sfxG,{slide:4800})},
    charm(){if(!ac||!rl(60))return;const t=now();osc('sine',1200,t,.14,.18,sfxG,{slide:2200});noise(t,.1,.18,sfxG,{f:3000,q:2})},
    slash(){if(!ac||!rl(60))return;const t=now();noise(t,.2,.5,sfxG,{f:700,slide:3600,q:1});osc('sawtooth',300,t,.1,.14,sfxG,{slide:90,lp:900})},
    palm(){if(!ac)return;const t=now();noise(t,.3,.7,sfxG,{f:300,slide:2400,type:'bandpass',q:.6});osc('sine',110,t,.35,.6,sfxG,{slide:40})},
    array(){if(!ac)return;const t=now();for(let i=0;i<6;i++){noise(t+i*.07,.14,.25,sfxG,{f:1800+i*300,slide:5000,q:1.5});osc('sine',600+i*140,t+i*.07,.3,.14,sfxG,{rv:1})}},
    throw(){if(!ac)return;const t=now();noise(t,.25,.3,sfxG,{f:900,slide:2200,q:2});osc('sine',500,t,.2,.12,sfxG,{slide:900})},
    ward(){if(!ac)return;const t=now();[0,.08,.16].forEach((d,i)=>osc('sine',520*Math.pow(1.5,i),t+d,.8,.28,sfxG,{rv:1}));noise(t,.5,.3,sfxG,{f:2500,slide:600,rv:1})},
    whirl(){if(!ac)return;const t=now();noise(t,1.5,.5,sfxG,{f:500,slide:2600,q:.8,rv:1})},
    whirlTick(){if(!ac||!rl(80))return;const t=now();noise(t,.08,.25,sfxG,{f:2200,q:1.5,slide:900})},
    roar(){if(!ac)return;const t=now();osc('sawtooth',90,t,.9,.8,sfxG,{slide:45,lp:700,rv:1});osc('square',180,t,.7,.3,sfxG,{slide:60,lp:500});noise(t,.7,.7,sfxG,{f:400,type:'lowpass',slide:120,rv:1})},
    combo(tier){if(!ac)return;const t=now();for(let i=0;i<=tier+1;i++){osc('sine',660*Math.pow(1.19,i),t+i*.06,.5,.28,sfxG,{rv:1});osc('square',660*Math.pow(1.19,i),t+i*.06,.08,.06,sfxG,{lp:2000})}taiko(t,.8,70);noise(t,.4,.4,sfxG,{f:3500,slide:600,rv:1})},
    overdrive(){if(!ac)return;const t=now();osc('sawtooth',110,t,1.2,.5,sfxG,{slide:440,lp:1800,rv:1});for(let i=0;i<4;i++)taiko(t+i*.12,.7,60+i*20)},
    chest(){if(!ac)return;const t=now();[0,.07,.14,.21,.3,.42].forEach((d,i)=>osc('sine',[784,988,1175,1568,1975,2349][i],t+d,.6,.26,sfxG,{rv:1}));noise(t,.6,.5,sfxG,{f:4000,slide:900,rv:1})},
    deny(){if(!ac||!rl(120))return;const t=now();osc('square',220,t,.09,.12,sfxG,{lp:800});osc('square',180,t+.09,.1,.12,sfxG,{lp:800})},
    dash(){if(!ac)return;const t=now();noise(t,.26,.55,sfxG,{f:400,slide:3000,q:.7});osc('sine',300,t,.2,.2,sfxG,{slide:1200})},
    pick(kind){if(!ac||!rl(kind?10:35))return;const t=now();osc('sine',kind?880:1320+vrnd(300),t,.12,kind?.25:.1,sfxG,{slide:kind?1760:2200})},
    mission(){if(!ac)return;const t=now();[0,.14,.28].forEach((d,i)=>osc('triangle',[523,659,784][i],t+d,.5,.3,sfxG,{rv:1}))},
    complete(){if(!ac)return;const t=now();[0,.1,.2,.3,.5].forEach((d,i)=>osc('triangle',[523,659,784,1046,1318][i],t+d,.7,.3,sfxG,{rv:1}));noise(t,.5,.3,sfxG,{f:4000,slide:800,rv:1})},
    levelup(){if(!ac)return;const t=now();[0,.09,.18,.3].forEach((d,i)=>{osc('sine',[659,880,1046,1318][i],t+d,.9,.3,sfxG,{rv:1});osc('sine',[659,880,1046,1318][i]*2,t+d,.4,.1,sfxG)})},
    shrine(){if(!ac)return;const t=now();bell(SC[8],t,.5);bell(SC[10],t+.25,.4);noise(t,1.2,.3,sfxG,{f:3500,slide:500,rv:1})},
    swarm(){if(!ac)return;const t=now();taiko(t,1,55);taiko(t+.18,.8,70);noise(t,.6,.4,sfxG,{f:800,slide:200,type:'lowpass'})},
    bossIn(){if(!ac)return;const t=now();for(let i=0;i<4;i++)taiko(t+i*.25,1,50);osc('sawtooth',55,t,2.5,.5,sfxG,{lp:300,rv:1});bell(SC[0]/2,t+1,.5)},
    bossCharge(){if(!ac)return;const t=now();noise(t,.5,.8,sfxG,{f:300,slide:2500,q:.6});osc('sawtooth',120,t,.4,.4,sfxG,{slide:400,lp:1500})},
    bossAttack(k){if(!ac)return;const t=now();if(k==='radial'){for(let i=0;i<6;i++)noise(t+i*.03,.12,.3,sfxG,{f:1500+i*200,slide:4000,q:1.5})}else if(k==='aimed')noise(t,.3,.5,sfxG,{f:1200,slide:3500,q:1});else if(k==='summon'){osc('sawtooth',70,t,.8,.5,sfxG,{lp:500,rv:1})}else{osc('sine',200,t,.6,.3,sfxG,{slide:80})}},
    arrow(){if(!ac||!rl(50))return;const t=now();noise(t,.12,.22,sfxG,{f:2600,slide:900,q:1.2})},
    win(){setState('win');if(!ac)return;const t=now();for(let i=0;i<6;i++){bell(SC[[5,7,8,10,8,5][i]]*2,t+.5+i*.3,.4)}},
    lose(){setState('title');if(!ac)return;const t=now();osc('sawtooth',110,t,2.5,.5,sfxG,{slide:40,lp:600,rv:1});taiko(t+.3,.9,45)},
  };
  return fx;
})();
