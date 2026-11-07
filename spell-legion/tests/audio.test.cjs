const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/audio.js'),'utf8');
function setup(saved={},auto=false){
  const stats={oscillators:0,samples:0,gains:[],timers:[]};let store=JSON.stringify(saved),clock=10000;
  const param=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v}});
  const node=()=>({connect(){},disconnect(){},start(){},stop(){},gain:param(),frequency:param(),Q:param()});
  class AudioContext{
    constructor(){stats.context=this;this.currentTime=0;this.state='running';this.sampleRate=100;this.destination=node()}
    createGain(){const n=node();stats.gains.push(n);return n}
    createDynamicsCompressor(){return {...node(),threshold:param(),ratio:param()}}
    createBuffer(ch,n){const channels=Array.from({length:ch},()=>new Float32Array(n));return {getChannelData:i=>channels[i]}}
    createConvolver(){return node()}
    createOscillator(){stats.oscillators++;return node()}
    createBiquadFilter(){return node()}
    createBufferSource(){stats.samples++;return node()}
    resume(){return Promise.resolve()}
  }
  const c=vm.createContext({window:{AudioContext},G:{auto},clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),vrnd:n=>n*.5,localStorage:{getItem:()=>store,setItem:(k,v)=>store=v},performance:{now:()=>clock+=200},setInterval:f=>stats.timers.push(f),Math,Float32Array});
  vm.runInContext(source+'\nglobalThis.audio=SFX;',c);
  return {audio:c.audio,stats,game:c.G,read:()=>JSON.parse(store),advance(seconds){const end=stats.context.currentTime+seconds;while(stats.context.currentTime<end){stats.context.currentTime+=.05;for(const f of stats.timers)f()}}};
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
