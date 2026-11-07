const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/audio.js'),'utf8');
function setup(saved={},auto=false,options={}){
  const stats={oscillators:0,samples:0,gains:[],timers:[],resumes:0,events:{}};let store=JSON.stringify(saved),clock=10000;
  const param=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v}});
  const node=()=>({connect(){},disconnect(){},start(){},stop(){},gain:param(),frequency:param(),Q:param()});
  class AudioContext{
    constructor(){stats.context=this;this.currentTime=0;this.state=options.initialState||'running';this.sampleRate=100;this.destination=node()}
    createGain(){const n=node();stats.gains.push(n);return n}
    createDynamicsCompressor(){return {...node(),threshold:param(),ratio:param()}}
    createBuffer(ch,n){const channels=Array.from({length:ch},()=>new Float32Array(n));return {getChannelData:i=>channels[i]}}
    createConvolver(){return node()}
    createOscillator(){stats.oscillators++;return node()}
    createBiquadFilter(){return node()}
    createBufferSource(){stats.samples++;return node()}
    resume(){stats.resumes++;if(options.resume) return options.resume(this,stats);this.state='running';return Promise.resolve()}
  }
  const listeners=(name,f)=>(stats.events[name]||=[]).push(f);
  const doc={hidden:false,addEventListener:listeners};const nav={audioSession:{type:'auto'}};
  const randomMath=Object.create(Math);if(options.random)randomMath.random=options.random;
  const c=vm.createContext({window:{AudioContext,addEventListener:listeners},document:doc,navigator:nav,G:{auto},clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),vrnd:n=>n*.5,localStorage:{getItem:()=>store,setItem:(k,v)=>store=v},performance:{now:()=>clock+=200},setInterval:f=>stats.timers.push(f),Math:randomMath,Float32Array});
  vm.runInContext(source+'\nglobalThis.audio=SFX;',c);
  return {audio:c.audio,document:doc,navigator:nav,stats,game:c.G,read:()=>JSON.parse(store),advance(seconds){const end=stats.context.currentTime+seconds;while(stats.context.currentTime<end){stats.context.currentTime+=.05;for(const f of stats.timers)f()}}};
}
test('menu demo produces no effect sources while the music scheduler keeps playing',()=>{
  const {audio,stats}=setup({},true);audio.start();const before=stats.oscillators+stats.samples;
  audio.sword();audio.hit(true,true);audio.bossIn();audio.pick(1);audio.die('boss');
  assert.equal(stats.oscillators+stats.samples,before);assert.equal(stats.gains[2].gain.value,0);
  stats.timers[0]();assert.ok(stats.oscillators+stats.samples>before);assert.equal(stats.gains[1].gain.value,.6);
});
test('effects resume during play and their gain is cut immediately on returning to the menu',()=>{
  const {audio,stats,game}=setup({},true);audio.start();game.auto=false;audio.setState('battle');const before=stats.oscillators;audio.sword();assert.ok(stats.oscillators>before);assert.equal(stats.gains[2].gain.value,.8);
  game.auto=true;audio.setState('title');assert.equal(stats.gains[2].gain.value,0);assert.equal(stats.gains[1].gain.value,.6);
});
test('each mute switch leaves the other channel and both volume choices unchanged',()=>{
  const {audio,stats}=setup();audio.start();audio.setMusic(.37);audio.setSfx(.64);
  assert.equal(audio.toggleMusicMute(),true);assert.equal(stats.gains[1].gain.value,0);assert.equal(stats.gains[2].gain.value,.64);assert.equal(audio.musicVol,.37);
  assert.equal(audio.toggleMusicMute(),false);assert.equal(stats.gains[1].gain.value,.37);
  audio.toggleSfxMute();assert.equal(stats.gains[2].gain.value,0);assert.equal(stats.gains[1].gain.value,.37);assert.equal(audio.sfxVol,.64);
  audio.toggleSfxMute();assert.equal(stats.gains[2].gain.value,.64);
});
test('channel mute choices and volume restoration survive a reload',()=>{
  const first=setup();first.audio.setMusic(.41);first.audio.setSfx(.72);first.audio.toggleMusicMute();
  const next=setup(first.read());next.audio.start();assert.equal(next.audio.musicMuted,true);assert.equal(next.audio.sfxMuted,false);assert.equal(next.stats.gains[1].gain.value,0);assert.equal(next.stats.gains[2].gain.value,.72);
  next.audio.toggleMusicMute();assert.equal(next.audio.musicVol,.41);assert.equal(next.stats.gains[1].gain.value,.41);
});
test('old global mute saves migrate to both channel switches and M still toggles both',()=>{
  const {audio,stats}=setup({muted:true,musicVol:.3,sfxVol:.7});audio.start();assert.equal(audio.musicMuted,true);assert.equal(audio.sfxMuted,true);assert.equal(audio.muted,true);
  audio.toggleMute();assert.equal(audio.muted,false);assert.equal(stats.gains[1].gain.value,.3);assert.equal(stats.gains[2].gain.value,.7);
  audio.toggleMute();assert.equal(audio.musicMuted,true);assert.equal(audio.sfxMuted,true);
  audio.toggleMusicMute();assert.equal(audio.musicMuted,false);assert.equal(audio.sfxMuted,true);
});
test('moving one slider unmutes only that channel and zero can be restored with one click',()=>{
  const {audio}=setup();audio.setMute(true);audio.setMusic(.25);assert.equal(audio.musicMuted,false);assert.equal(audio.sfxMuted,true);
  audio.setMusic(0);assert.equal(audio.musicMuted,true);audio.toggleMusicMute();assert.equal(audio.musicVol,.25);assert.equal(audio.musicMuted,false);assert.equal(audio.sfxMuted,true);
});
test('muted effects allocate no oscillators or noise while battle music remains active',()=>{
  const {audio,stats}=setup();audio.start();audio.toggleSfxMute();const before=stats.oscillators+stats.samples;audio.hit(true,true);audio.bossAttack('radial');audio.chest();assert.equal(stats.oscillators+stats.samples,before);stats.timers[0]();assert.ok(stats.oscillators+stats.samples>before);
});

test('four instrumental styles shuffle without repeats until all four have played',()=>{
  const h=setup({},true);h.audio.start();const seen=[h.audio.musicTrack.id];
  for(let i=0;i<11;i++){const before=h.audio.musicTrack.id;let steps=0;while(h.audio.musicTrack.id===before&&steps++<4000)h.advance(.1);assert.ok(steps<4000);seen.push(h.audio.musicTrack.id)}
  for(let i=0;i<seen.length;i+=4)assert.equal(new Set(seen.slice(i,i+4)).size,4);
  for(let i=1;i<seen.length;i++)assert.notEqual(seen[i],seen[i-1]);
  assert.deepEqual(Array.from(h.audio.musicTracks,t=>t.locale).sort(),['en','ja','ko','zh']);
  assert.equal(new Set(Array.from(h.audio.musicTracks,t=>t.bpm)).size,4);
  assert.ok(h.audio.musicTracks.every(t=>t.duration>=50&&t.duration<=70));
});
test('the opening track is shuffled on a new session',()=>{
  const first=setup({},true,{random:()=>0});first.audio.start();
  const second=setup({},true,{random:()=>.999});second.audio.start();
  assert.notEqual(first.audio.musicTrack.id,second.audio.musicTrack.id);
});
test('gameplay, pause and boss changes preserve the current song and musical phrase',()=>{
  const h=setup();h.audio.start();h.advance(12);const before=h.audio.musicTrack;assert.ok(before.bar>0);
  for(const state of ['battle','boss','win','title','battle'])h.audio.setState(state);
  assert.equal(h.audio.musicTrack.id,before.id);assert.equal(h.audio.musicTrack.bar,before.bar);
});
test('a suspended or backgrounded context never replays a backlog of music notes',()=>{
  const h=setup();h.audio.start();h.advance(1);h.stats.context.state='suspended';const before=h.stats.oscillators;h.advance(100);assert.equal(h.stats.oscillators,before);
  h.stats.context.state='running';h.stats.context.currentTime+=600;h.stats.timers[0]();assert.ok(h.stats.oscillators-before<40);
});
test('music muted for a whole track allocates no new sources and preserves the effects setting',()=>{
  const h=setup({},true);h.audio.start();h.audio.setMusicMute(true);const before=h.stats.oscillators+h.stats.samples;h.advance(150);assert.equal(h.stats.oscillators+h.stats.samples,before);assert.equal(h.audio.sfxMuted,false);
});

test('iPhone audio mixes with other music and resumes an interrupted context',async()=>{
  const h=setup({},true,{initialState:'interrupted'});h.audio.start();await Promise.resolve();
  assert.equal(h.navigator.audioSession.type,'ambient');assert.equal(h.stats.resumes,1);assert.equal(h.stats.context.state,'running');
  assert.ok(h.stats.oscillators+h.stats.samples>0);assert.equal(h.stats.timers.length,1);
});
test('a rejected touch-down resume is retried on touch-end and native click',async()=>{
  const h=setup({},true,{initialState:'suspended',resume(ctx,stats){if(stats.resumes===1)return Promise.reject(Error('gesture not accepted'));ctx.state='running';return Promise.resolve()}});
  h.stats.events.pointerdown[0]();await Promise.resolve();await Promise.resolve();assert.equal(h.stats.context.state,'suspended');
  h.stats.events.touchend[0]();await Promise.resolve();h.stats.events.click[0]();
  assert.equal(h.stats.context.state,'running');assert.equal(h.stats.resumes,2);assert.equal(h.stats.timers.length,1);
  assert.ok(h.stats.oscillators+h.stats.samples>0);
});
test('returning to the foreground recovers interruption without unmuting saved settings',async()=>{
  const h=setup({musicMuted:true,sfxMuted:false});h.audio.start();h.stats.context.state='interrupted';h.document.hidden=true;
  h.stats.events.visibilitychange[0]();assert.equal(h.stats.resumes,0);
  h.document.hidden=false;h.stats.events.visibilitychange[0]();await Promise.resolve();
  assert.equal(h.stats.context.state,'running');assert.equal(h.stats.resumes,1);assert.equal(h.audio.musicMuted,true);assert.equal(h.audio.sfxMuted,false);
  h.stats.context.state='interrupted';h.stats.events.pageshow[0]();await Promise.resolve();assert.equal(h.stats.resumes,2);assert.equal(h.stats.timers.length,1);
});
test('page-show never initializes audio before the first user interaction',()=>{
  const h=setup();h.stats.events.pageshow[0]();h.stats.events.visibilitychange[0]();assert.equal(h.stats.context,undefined);assert.equal(h.stats.timers.length,0);
});
