const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8');
function setup(){
 const scripts=[],saved={};const c=vm.createContext({console,URLSearchParams,navigator:{languages:['en']},location:{search:''},
  localStorage:{getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v},
  document:{currentScript:null,documentElement:{},write(){},getElementById:()=>true,querySelector:()=>null,querySelectorAll:()=>[],
   createElement:()=>({remove(){this.removed=true}}),head:{appendChild:el=>scripts.push(el)}}});
 vm.runInContext(source('i18n'),c);return {c,scripts,saved,evaluate:s=>vm.runInContext(s,c)};
}
test('different language loads have independent callbacks and the last request wins',()=>{
 const {c,saved,evaluate}=setup();const ready=[];c.setLang('ja',()=>ready.push('ja'));c.setLang('ko',()=>ready.push('ko'));
 assert.equal(evaluate('LOC'),'en');c.I18N_LOAD('ja',{'Spell Legion':'魔呪軍団'});assert.deepEqual(ready,[]);assert.equal(evaluate('LOC'),'en');
 c.I18N_LOAD('ko',{'Spell Legion':'주문군단'});assert.deepEqual(ready,['ko']);assert.equal(evaluate('LOC'),'ko');assert.equal(saved.sl_lang,'ko');
});
test('a failed language load preserves the current language and allows a clean retry',()=>{
 const {c,scripts,evaluate}=setup();let ready=0;c.setLang('ja',()=>ready++);scripts[0].onerror();
 assert.equal(evaluate('LOC'),'en');assert.equal(ready,0);assert.equal(scripts[0].removed,true);
 c.setLang('ja',()=>ready++);assert.equal(scripts.length,2);c.I18N_LOAD('ja',{'Spell Legion':'魔呪軍団'});assert.equal(ready,1);assert.equal(evaluate('LOC'),'ja');
});
test('returning to an already available language cancels a slower pending selection',()=>{
 const {c,evaluate}=setup();const ready=[];c.setLang('ja',()=>ready.push('ja'));c.setLang('en',()=>ready.push('en'));c.I18N_LOAD('ja',{});
 assert.deepEqual(ready,['en']);assert.equal(evaluate('LOC'),'en');
});
test('switching regenerates an automatic name in the newly loaded language while keeping custom names',()=>{
 const {c,evaluate}=setup();let persisted=0;c.SAVE={name:'Old'};c.randomName=()=>evaluate('LOC')+'Name';c.persist=()=>persisted++;c.langRefresh=()=>{};
 const ui=source('ui');vm.runInContext(ui.slice(ui.indexOf('function switchLang('),ui.indexOf("document.querySelectorAll('.langbtn')",ui.indexOf('function switchLang('))),c);
 c.switchLang('ko',true);assert.equal(c.SAVE.name,'Old');c.I18N_LOAD('ko',{});assert.equal(c.SAVE.name,'koName');assert.equal(persisted,1);
 c.SAVE.name='Custom';c.SAVE.nameSet=true;c.switchLang('en',true);assert.equal(c.SAVE.name,'Custom');assert.equal(persisted,1);
});
test('a delayed IP guess cannot overwrite a newer manual language selection',async()=>{
 const {c,evaluate}=setup();let resolveFetch;const response=new Promise(r=>resolveFetch=r),auto=[];
 c.fetch=()=>response;c.setTimeout=()=>0;c.G={auto:true};c.$=()=>({hidden:true});c.switchLang=(...args)=>auto.push(args);
 const ui=source('ui'),start=ui.indexOf('(async function langAuto()'),end=ui.indexOf('\n\n/* Lobby pages',start);
 const pending=vm.runInContext(ui.slice(start,end),c);c.setLang('en');resolveFetch({ok:true,json:async()=>({country:'JP'})});await pending;
 assert.equal(evaluate('LOC'),'en');assert.deepEqual(auto,[]);
});
