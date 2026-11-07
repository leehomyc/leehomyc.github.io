'use strict';
/* audio.js — four original regional instrumentals, shuffled playback and sound effects (Web Audio, no files) */
const SFX=(()=>{
  let ac=null,master,musicG,sfxG,musicBus=null,musicMuted=false,sfxMuted=false,state='title',nextBeat=0,beat=0,bar=0,lastHit=0,started=false,musicVol=.6,sfxVol=.8,lastMusicVol=.6,lastSfxVol=.8,musicGainValue=null,sfxGainValue=null;
  const save=()=>{try{localStorage.setItem('sl_audio',JSON.stringify({muted:musicMuted&&sfxMuted,musicMuted,sfxMuted,musicVol,sfxVol,lastMusicVol,lastSfxVol}))}catch(_){}};
  try{const o=JSON.parse(localStorage.getItem('sl_audio')||'null');if(o){if(o.musicVol!==undefined)musicVol=clamp(o.musicVol,0,1);if(o.sfxVol!==undefined)sfxVol=clamp(o.sfxVol,0,1);lastMusicVol=o.lastMusicVol>0?clamp(o.lastMusicVol,0,1):(musicVol||.6);lastSfxVol=o.lastSfxVol>0?clamp(o.lastSfxVol,0,1):(sfxVol||.8);musicMuted=!!(o.musicMuted===undefined?o.muted:o.musicMuted)||musicVol===0;sfxMuted=!!(o.sfxMuted===undefined?o.muted:o.sfxMuted)||sfxVol===0}}catch(_){}
  function ensure(){
    if(ac)return true;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    // Game audio should mix with music or podcasts already playing on the phone.
    try{if(typeof navigator!=='undefined'&&navigator.audioSession)navigator.audioSession.type='ambient'}catch(_){}
    ac=new AC();master=ac.createGain();master.gain.value=.8;
    const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;
    master.connect(comp);comp.connect(ac.destination);
    musicG=ac.createGain();musicG.gain.value=0;musicG.connect(master);
    sfxG=ac.createGain();sfxG.gain.value=0;sfxG.connect(master);
    syncMix();
    // reverb from a synthetic impulse
    const len=ac.sampleRate*2.2,buf=ac.createBuffer(2,len,ac.sampleRate);
    for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)*.5}
    for(const [key,dest] of [['rv',sfxG],['musicRv',musicG]]){
      const rv=ac.createConvolver();rv.buffer=buf;const rg=ac.createGain();rg.gain.value=.22;
      rv.connect(rg);rg.connect(dest);ac[key]=rv;
    }
    return true;
  }
  const now=()=>ac.currentTime;
  function effectsActive(){return typeof G!=='undefined'&&G&&!G.auto}
  function syncMix(){
    if(!ac)return;
    const music=musicMuted?0:musicVol,effects=sfxMuted||!effectsActive()?0:sfxVol;
    if(music!==musicGainValue){musicG.gain.setTargetAtTime(music,now(),.01);musicGainValue=music}
    if(effects!==sfxGainValue){sfxG.gain.setTargetAtTime(effects,now(),.01);sfxGainValue=effects}
  }
  function setMusicMute(value){musicMuted=!!value;if(!musicMuted&&musicVol===0)musicVol=lastMusicVol;syncMix();save();return musicMuted}
  function setSfxMute(value){sfxMuted=!!value;if(!sfxMuted&&sfxVol===0)sfxVol=lastSfxVol;syncMix();save();return sfxMuted}
  function setMute(value){musicMuted=sfxMuted=!!value;if(!value){if(musicVol===0)musicVol=lastMusicVol;if(sfxVol===0)sfxVol=lastSfxVol}syncMix();save();return musicMuted&&sfxMuted}

  function osc(type,f,t0,dur,g,dest,o={}){
    const musical=dest===musicG||dest===musicBus;
    if(musical?musicMuted:(sfxMuted||!effectsActive()))return;
    const v=ac.createOscillator(),e=ac.createGain();v.type=type;v.frequency.setValueAtTime(f,t0);
    if(o.slide)v.frequency.exponentialRampToValueAtTime(Math.max(20,o.slide),t0+dur*(o.slideT||1));
    e.gain.setValueAtTime(0,t0);e.gain.linearRampToValueAtTime(g,t0+(o.a||.005));e.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    v.connect(e);let out=e;
    if(o.lp){const f2=ac.createBiquadFilter();f2.type='lowpass';f2.frequency.value=o.lp;f2.Q.value=o.q||.7;e.connect(f2);out=f2}
    out.connect(dest||sfxG);if(o.rv)out.connect(musical?ac.musicRv:ac.rv);
    v.start(t0);v.stop(t0+dur+.05);return v;
  }
  function noise(t0,dur,g,dest,o={}){
    const musical=dest===musicG||dest===musicBus;
    if(musical?musicMuted:(sfxMuted||!effectsActive()))return;
    const n=ac.sampleRate*dur|0,b=ac.createBuffer(1,Math.max(1,n),ac.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    const s=ac.createBufferSource();s.buffer=b;const e=ac.createGain();e.gain.setValueAtTime(g,t0);e.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    const f=ac.createBiquadFilter();f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f||1800,t0);if(o.slide)f.frequency.exponentialRampToValueAtTime(o.slide,t0+dur);f.Q.value=o.q||.8;
    s.connect(f);f.connect(e);e.connect(dest||sfxG);if(o.rv)e.connect(musical?ac.musicRv:ac.rv);s.start(t0);s.stop(t0+dur+.02);
  }
  /* instruments */
  const hz=n=>440*Math.pow(2,(n-69)/12);
  function zheng(n,t,g){const f=hz(n);osc('triangle',f,t,.95,g*.7,musicBus,{lp:3400,rv:1});osc('sine',f*2,t,.42,g*.24,musicBus);osc('sine',f*3,t,.2,g*.08,musicBus)}
  function dizi(n,t,dur,g){const f=hz(n);osc('sine',f,t,dur,g*.68,musicBus,{a:.055,rv:1});osc('triangle',f*2,t,dur*.75,g*.14,musicBus,{a:.08,lp:3600})}
  function shamisen(n,t,g){const f=hz(n);osc('sawtooth',f,t,.28,g*.43,musicBus,{lp:2800,rv:1});osc('triangle',f,t,.38,g*.65,musicBus,{lp:4400});osc('sine',f*2,t,.14,g*.13,musicBus)}
  function fue(n,t,dur,g){osc('sine',hz(n),t,dur,g,musicBus,{a:.04,rv:1});osc('triangle',hz(n)*2,t,dur*.5,g*.12,musicBus)}
  function danceLead(n,t,dur,g){const f=hz(n);osc('square',f,t,dur,g*.34,musicBus,{lp:Math.min(3800,f*5)});osc('sine',f*2,t,dur*.55,g*.23,musicBus);osc('triangle',f,t,dur,g*.5,musicBus,{rv:1})}
  function strings(n,t,dur,g){const f=hz(n);osc('sawtooth',f*.997,t,dur,g*.32,musicBus,{a:.12,lp:1300,rv:1});osc('sawtooth',f*1.003,t,dur,g*.32,musicBus,{a:.14,lp:1300})}
  function horn(n,t,dur,g){const f=hz(n);osc('sawtooth',f,t,dur,g*.3,musicBus,{a:.04,lp:1800,rv:1});osc('sine',f,t,dur,g*.6,musicBus,{a:.035})}
  function bass(n,t,dur,g){osc('triangle',hz(n),t,dur,g*.7,musicBus,{lp:650});osc('sine',hz(n-12),t,dur,g*.38,musicBus)}
  function kick(t,g=.42){osc('sine',145,t,.26,g,musicBus,{slide:45,slideT:.45});noise(t,.025,g*.12,musicBus,{f:3600,type:'highpass'})}
  function clap(t,g=.14){noise(t,.12,g,musicBus,{f:1700,q:.6});noise(t+.018,.075,g*.5,musicBus,{f:3200,q:.5})}
  function hat(t,open=false,g=.035){noise(t,open?.12:.035,g,musicBus,{f:7200,type:'highpass',q:.5})}
  function drum(t,g=.25){osc('sine',125,t,.36,g,musicBus,{slide:56,slideT:.5});noise(t,.06,g*.16,musicBus,{f:680,type:'lowpass'})}
  function rim(t,g=.07){noise(t,.04,g,musicBus,{f:1550,q:1.2})}
  function taiko(t0,g=.8,low=70){osc('sine',low*2.2,t0,.42,g,sfxG,{slide:low,slideT:.3});noise(t0,.12,g*.35,sfxG,{f:900,type:'lowpass'})}
  function bell(f,t0,g=.3,dest=sfxG){osc('sine',f,t0,2.2,g,dest,{rv:1});osc('sine',f*2.76,t0,1.1,g*.35,dest,{rv:1});osc('sine',f*5.4,t0,.5,g*.12,dest)}
  const SC=[146.83,164.81,185,220,246.94,293.66,329.63,369.99,440,493.88,587.33]; // effect pitches
  /* Original instrumental themes. Each has its own meter, scale, rhythm and instruments.
     32 bars: intro 4 / theme 8 / lift 8 / quiet 4 / finale 8. */
  const TRACKS=[
    {id:'bamboo-rain',locale:'zh',title:'竹影听雨',style:'古风 · 筝与笛',bpm:112,steps:16,
      chords:[[50,57,62,69],[47,54,59,66],[43,50,55,62],[45,52,57,64]],
      hook:[
        [74,-1,-1,76,-1,-1,78,-1,81,-1,-1,78,76,-1,-1,-1],
        [74,-1,71,-1,-1,74,-1,76,78,-1,-1,76,74,-1,-1,-1],
        [71,-1,-1,74,-1,-1,76,-1,78,-1,81,-1,78,-1,-1,-1],
        [76,-1,-1,74,-1,71,-1,69,71,-1,-1,74,69,-1,-1,-1],
        [78,-1,81,-1,-1,83,-1,81,78,-1,76,-1,74,-1,-1,-1],
        [76,-1,-1,78,-1,-1,81,-1,83,-1,81,-1,78,-1,-1,-1],
        [81,-1,-1,83,-1,86,-1,83,81,-1,78,-1,76,-1,-1,-1],
        [78,-1,76,-1,-1,74,-1,71,74,-1,-1,69,74,-1,-1,-1]
      ]},
    {id:'matsuri-lanterns',locale:'ja',title:'祭の灯',style:'和风 · 三味线与太鼓',bpm:144,steps:16,
      chords:[[50,57,62,69],[51,58,63,67],[48,55,60,67],[45,52,57,64]],
      hook:[
        [74,-1,75,79,-1,81,-1,79,75,-1,74,-1,69,-1,-1,-1],
        [72,-1,75,-1,79,81,-1,79,75,-1,72,69,72,-1,-1,-1],
        [74,75,79,-1,81,-1,84,81,79,-1,75,-1,74,-1,-1,-1],
        [72,-1,69,72,75,-1,79,-1,75,72,69,-1,67,-1,-1,-1],
        [79,-1,81,84,-1,81,79,-1,75,-1,79,81,84,-1,-1,-1],
        [81,-1,84,-1,86,84,81,-1,79,75,79,-1,81,-1,-1,-1],
        [84,81,79,-1,75,79,81,-1,84,-1,86,84,81,-1,-1,-1],
        [79,-1,75,72,75,-1,79,-1,74,72,69,-1,74,-1,-1,-1]
      ]},
    {id:'seoul-after-dark',locale:'ko',title:'서울 애프터다크',style:'K-pop · dance instrumental',bpm:120,steps:16,
      chords:[[45,52,57,60],[41,53,57,60],[48,55,60,64],[43,55,59,62]],
      hook:[
        [-1,69,-1,72,76,-1,-1,72,-1,69,-1,67,69,-1,-1,-1],
        [-1,69,-1,72,77,-1,-1,72,-1,69,72,-1,77,-1,-1,-1],
        [-1,72,-1,76,79,-1,-1,76,-1,72,-1,69,72,-1,-1,-1],
        [-1,71,-1,74,79,-1,-1,74,-1,71,74,-1,79,-1,-1,-1],
        [-1,76,76,-1,81,-1,79,76,-1,72,-1,76,81,-1,-1,-1],
        [-1,77,77,-1,81,-1,84,81,-1,77,-1,72,77,-1,-1,-1],
        [-1,79,79,-1,84,-1,81,79,-1,76,-1,72,79,-1,-1,-1],
        [-1,79,76,-1,74,-1,71,74,-1,69,-1,67,69,-1,-1,-1]
      ]},
    {id:'lantern-road',locale:'en',title:'The Lantern Road',style:'Western orchestral waltz',bpm:104,steps:12,
      chords:[[43,55,58,62],[39,51,55,58],[41,53,57,60],[38,50,54,57]],
      hook:[
        [74,-1,-1,-1,77,-1,-1,-1,79,-1,-1,-1],
        [75,-1,-1,-1,74,-1,-1,-1,70,-1,-1,-1],
        [72,-1,-1,-1,76,-1,-1,-1,77,-1,-1,-1],
        [74,-1,-1,-1,69,-1,-1,-1,66,-1,-1,-1],
        [79,-1,-1,77,74,-1,-1,-1,82,-1,-1,-1],
        [80,-1,-1,79,75,-1,-1,-1,77,-1,-1,-1],
        [77,-1,-1,76,72,-1,-1,-1,81,-1,-1,-1],
        [78,-1,-1,74,69,-1,-1,-1,74,-1,-1,-1]
      ]}
  ];
  const SONG_BARS=32,retiredBuses=[];
  let track=null,bag=[],previousTrack=-1;
  function beginTrack(t){
    if(!bag.length){
      bag=TRACKS.map((_,i)=>i);
      for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
      if(bag[0]===previousTrack)[bag[0],bag[1]]=[bag[1],bag[0]];
    }
    previousTrack=bag.shift();track=TRACKS[previousTrack];beat=bar=0;
    if(musicBus){musicBus.gain.cancelScheduledValues(t);musicBus.gain.setValueAtTime(1,t);musicBus.gain.linearRampToValueAtTime(0,t+.45);retiredBuses.push({node:musicBus,until:t+4})}
    musicBus=ac.createGain();musicBus.gain.setValueAtTime(0,t);musicBus.gain.linearRampToValueAtTime(1,t+.45);musicBus.connect(musicG);
  }
  function musicStep(t){
    const step=60/track.bpm/4,pos=beat%track.steps,chord=track.chords[bar%track.chords.length];
    const lift=(bar>=12&&bar<20)||bar>=24,quiet=bar>=20&&bar<24,soft=state==='title';
    const tail=bar===SONG_BARS-1&&pos>=track.steps/2?Math.max(.25,1-(pos-track.steps/2)/track.steps):1;
    const g=(soft?.76:1)*(quiet?.68:1)*tail,n=track.hook[bar%track.hook.length][pos];
    if(track.locale==='zh'){
      // Pentatonic dizi phrases float above a plucked zheng; the percussion only marks the phrase.
      if(pos===0){bass(chord[0],t,step*11,g*.075);if(bar%4===0)drum(t,g*.13)}
      if([0,3,6,10,12].includes(pos))zheng(chord[1+(pos===10?2:pos===6?1:0)]+12,t,g*(lift?.075:.055));
      if(pos===8&&lift)rim(t,g*.035);
      if(n>=0&&(!quiet||pos%4===0))dizi(n,t,step*(pos===0||pos===8?3.4:2.2),g*(lift?.16:.13));
    }else if(track.locale==='ja'){
      // Matsuri call-and-response: short shamisen attacks, taiko downbeats and a fue answer.
      if(pos===0||pos===8)drum(t,g*(pos===0?.29:.21));
      if(pos===6||pos===14)rim(t,g*.08);
      if(pos===4||pos===12)bass(chord[0]+12,t,step*1.3,g*.08);
      if([0,4,8,12].includes(pos))shamisen(chord[1+(pos/4)%3]+12,t,g*.055);
      if(n>=0&&(!quiet||pos%4===0))shamisen(n,t,g*(lift?.16:.12));
      if((pos===12||pos===14)&&bar%2===1)fue(n>=0?n+12:chord[3]+12,t,step*2,g*.055);
    }else if(track.locale==='ko'){
      // Four-on-the-floor, offbeat hats, syncopated sub-bass and bright chord stabs.
      if([0,4,8,12].includes(pos)&&(!quiet||pos===0))kick(t,g*.38);
      if((pos===4||pos===12)&&!quiet)clap(t,g*.13);
      if(pos%2===0&&!quiet)hat(t,pos===14&&lift,g*.028);
      if([0,3,7,8,11,14].includes(pos))bass(chord[0]+(pos===14?12:0),t,step*1.4,g*.18);
      if(lift&&[2,6,10,14].includes(pos))for(const m of chord.slice(1))danceLead(m+12,t,step*1.1,g*.036);
      if(n>=0&&(!quiet||pos%4===0))danceLead(n,t,step*1.5,g*(lift?.15:.12));
    }else{
      // Western 3/4 waltz: cello on beat one, string chords on two and three, horn over the top.
      if(pos===0){bass(chord[0],t,step*5,g*.14);if(lift)drum(t,g*.16)}
      if(pos===4||pos===8)for(const m of chord.slice(1))strings(m,t,step*4,g*.048);
      if(pos===0&&bar%2===0)strings(chord[1],t,step*10,g*.055);
      if(n>=0&&(!quiet||pos===0))horn(n,t,step*(pos===0?4.5:3.5),g*(lift?.14:.11));
    }
    if(state==='win'&&pos===0)bell(hz(chord[3]+12),t,.08,musicBus);
    beat++;if(beat%track.steps===0)bar++;return step;
  }
  function schedule(){
    if(!ac||ac.state!=='running'||state==='off')return;
    const t=now();
    for(let i=retiredBuses.length-1;i>=0;i--)if(retiredBuses[i].until<t){retiredBuses[i].node.disconnect();retiredBuses.splice(i,1)}
    // Keep the musical phrase when resuming; never burst through missed steps.
    if(nextBeat<t-.15)nextBeat=t+.025;
    while(nextBeat<t+.12){if(bar>=SONG_BARS)beginTrack(nextBeat);nextBeat+=musicStep(nextBeat)}
  }
  function setState(s){syncMix();if(s===state)return;const resume=state==='off';state=s;if(ac&&resume)nextBeat=now()+.04}
  function start(){
    if(!ensure())return;
    if(ac.state==='suspended'||ac.state==='interrupted'){
      try{ac.resume().then(()=>schedule()).catch(()=>{})}catch(_){}
    }
    if(started)return;started=true;nextBeat=now()+.05;beginTrack(nextBeat);setInterval(schedule,50);
  }
  const trackInfo=t=>({id:t.id,locale:t.locale,title:t.title,style:t.style,bpm:t.bpm,duration:SONG_BARS*t.steps*60/t.bpm/4});
  const rl=(ms)=>{const t=performance.now();if(t-lastHit<ms)return false;lastHit=t;return true};
  const fx={
    start,setState,
    get musicTrack(){return track?{...trackInfo(track),bar}:null},get musicTracks(){return TRACKS.map(trackInfo)},
    toggleMute(){return setMute(!(musicMuted&&sfxMuted))},setMute,
    toggleMusicMute(){return setMusicMute(!musicMuted)},toggleSfxMute(){return setSfxMute(!sfxMuted)},setMusicMute,setSfxMute,
    setMusic(v){musicVol=clamp(v,0,1);if(musicVol>0)lastMusicVol=musicVol;musicMuted=musicVol===0;syncMix();save()},
    setSfx(v){sfxVol=clamp(v,0,1);if(sfxVol>0)lastSfxVol=sfxVol;sfxMuted=sfxVol===0;syncMix();save()},
    get muted(){return musicMuted&&sfxMuted},get musicMuted(){return musicMuted},get sfxMuted(){return sfxMuted},get musicVol(){return musicVol},get sfxVol(){return sfxVol},
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
    /* new heroes and legendary weapons */
    katana(){if(!ac||!rl(70))return;const t=now();noise(t,.12,.3,sfxG,{f:2600,slide:7000,q:2});osc('sine',3300,t,.18,.08,sfxG,{slide:5200,rv:1})},
    chain(){if(!ac||!rl(90))return;const t=now();for(let i=0;i<4;i++)noise(t+i*.025,.05,.2,sfxG,{f:4200+i*600,q:6});osc('square',220,t+.12,.12,.12,sfxG,{slide:110,lp:1400})},
    chime(){if(!ac||!rl(70))return;const t=now();osc('sine',1568,t,.25,.14,sfxG,{rv:1});osc('sine',2093,t+.04,.22,.1,sfxG,{rv:1});osc('triangle',3136,t+.08,.12,.05,sfxG)},
    zap(){if(!ac||!rl(80))return;const t=now();osc('square',900,t,.09,.07,sfxG,{slide:2600,lp:3500});noise(t,.07,.12,sfxG,{f:5000,q:3})},
    gong(){if(!ac)return;const t=now();osc('sine',98,t,2.2,.55,sfxG,{rv:1});osc('sine',147,t,1.6,.3,sfxG,{rv:1});osc('sine',262,t,1.1,.16,sfxG,{rv:1});osc('triangle',523,t,.5,.08,sfxG,{rv:1});noise(t,.18,.35,sfxG,{f:900,type:'lowpass'})},
    pop(){if(!ac||!rl(90))return;const t=now();noise(t,.18,.55,sfxG,{f:700,type:'lowpass',slide:200});for(let i=0;i<5;i++)osc('sine',1800+Math.random()*1800,t+.08+i*.04,.12,.05,sfxG,{rv:1})},
    whoosh(){if(!ac||!rl(90))return;const t=now();noise(t,.35,.3,sfxG,{f:500,slide:2400,q:.7})},
    sparkle(){if(!ac||!rl(90))return;const t=now();[0,.05,.1,.15].forEach((d,i)=>osc('sine',[1318,1568,2093,2637][i],t+d,.3,.09,sfxG,{rv:1}))},
    beat(){if(!ac||!rl(120))return;const t=now();taiko(t,.55,90);noise(t,.05,.2,sfxG,{f:7000,q:1})},
    void(){if(!ac)return;const t=now();osc('sawtooth',80,t,2.4,.35,sfxG,{slide:30,lp:400,rv:1});osc('sine',40,t,2.6,.4,sfxG);noise(t,2,.25,sfxG,{f:300,slide:60,type:'lowpass',rv:1})},
    blink(){if(!ac)return;const t=now();osc('sine',600,t,.18,.18,sfxG,{slide:2400});osc('sine',2400,t+.12,.2,.12,sfxG,{slide:900,rv:1})},
  };
  if(typeof window.addEventListener==='function'){
    for(const event of ['pointerdown','pointerup','touchend','click','keydown'])window.addEventListener(event,start,{capture:true,passive:true});
    const restore=()=>{if(ac&&(typeof document==='undefined'||!document.hidden))start()};
    window.addEventListener('pageshow',restore);
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',restore);
  }
  return fx;
})();
