const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8');
function node(){return {innerHTML:'',children:[],classList:{add(){}},appendChild(x){this.children.push(x)},querySelector(){return null},remove(){this.removed=true},setAttribute(){}}}
function setup(extra={}){
  const nodes={};const c=vm.createContext({console:{warn(){}},Date,Math,Map,Set,JSON,Number,String,URLSearchParams,AbortController,setTimeout,clearTimeout,
    window:{},location:{hostname:'spelllegion.com',origin:'https://spelllegion.com'},
    localStorage:{getItem(){return null},setItem(){}},crypto:require('node:crypto').webcrypto,
    document:{createElement:node,querySelectorAll:()=>[]},$:s=>nodes[s]||(nodes[s]=node()),
    SAVE:{name:'Hero',mode:'solo',avatar:{e:1,h:50}},G:{t:123,day:20261107,cls:'swordsman',score:50,kills:200,bossSlain:1,lv:12,comboMax:20,relics:[]},
    MAPID:'valley',DIFFID:'normal',RIVAL_ON:false,ASURA_T:0,L:(zh,en)=>en,dayKey:()=>20261107,persist(){},SFX:{pick(){}},
    firebase:{firestore:{FieldValue:{serverTimestamp:()=> 'server-time'}}},...extra});
  vm.runInContext(source('cloud'),c);vm.runInContext(source('leaderboard'),c);
  const ev=s=>vm.runInContext(s,c);
  return {c,ev,nodes,clb:ev('CLB'),lb:ev('LB'),cloud:ev('CLOUD')};
}
const plain=o=>JSON.parse(JSON.stringify(o));
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
test('public leaderboard and profiles load before login or SDK initialization',async()=>{
  const requests=[];
  const result=[{document:{name:'projects/x/databases/(default)/documents/profiles/u1',fields:{
    time:{integerValue:'123'},score:{integerValue:'900'},uid:{stringValue:'u1'},av:{mapValue:{fields:{e:{integerValue:'2'},h:{integerValue:'60'}}}}
  }}}];
  const {ev,lb}=setup({fetch:async(url,options)=>{
    requests.push({url,body:JSON.parse(options.body)});
    return {ok:true,json:async()=>result};
  }});
  assert.equal(ev('CLOUD.on()'),false);assert.equal(lb.enabled(),true);
  const data=await lb.fetch('all');assert.equal(data.rows[0].time,123);assert.equal(data.rows[0].av.e,2);
  const profiles=await lb.profiles([{uid:'u1'}]);assert.ok(profiles.u1);
  assert.equal(requests.length,2);assert.ok(requests[0].url.endsWith('/documents:runQuery'));
  assert.equal(requests[1].body.structuredQuery.where.fieldFilter.op,'IN');
});
test('leaderboard falls back to the shared proxy when direct Firestore is unreachable',async()=>{
  const urls=[],result=[{document:{name:'projects/x/databases/(default)/documents/runs/u1',fields:{uid:{stringValue:'u1'},score:{integerValue:'900'},mode:{stringValue:'solo'}}}}];
  const {clb}=setup({location:{hostname:'hyang.org',origin:'https://hyang.org'},fetch:async url=>{
    urls.push(url);if(urls.length===1)throw new TypeError('network blocked');return {ok:true,json:async()=>result};
  }});
  const board=await clb.fetch('endless');
  assert.equal(board.rows[0].score,900);
  assert.ok(urls[0].startsWith('https://firestore.googleapis.com/'));
  assert.ok(urls[1].startsWith('https://spelllegion.com/api/cn-proxy/firestore/'));
});
test('an unauthenticated viewer is never mistaken for another player with the same name',()=>{
  const {lb}=setup();assert.equal(lb.isMe({uid:'someone-else',name:'Hero'}),false);
});
test('ladder and level boards hide empty profiles and collapse guest and account copies of one name',async()=>{
  const {clb,cloud}=setup();cloud.ready=true;cloud.user={uid:'account'};
  clb.query=async()=>[
    {_id:'guest',name:'Hero',guest:true,trophies:20,lv:4,axp:100},
    {_id:'account',name:'Hero',guest:false,trophies:20,lv:4,axp:100},
    {_id:'empty',name:'New player',guest:true,trophies:0,lv:1,axp:0}
  ];
  for(const board of ['ladder','level']){
    const data=await clb.fetch(board);assert.equal(data.rows.length,1);assert.equal(data.rows[0].uid,'account');
  }
});
test('same-user tied times keep the better boss/kill result and sort consistently',async()=>{
  const {clb}=setup();clb.raw=async()=>[{uid:'a',score:500,time:100,bosses:1,kills:50},{uid:'a',score:500,time:100,bosses:2,kills:20},{uid:'b',score:500,time:100,bosses:2,kills:30},{uid:'c',score:9000,time:1000,mode:'room'}];
  const data=await clb.fetch('all');assert.deepEqual(Array.from(data.rows,r=>r.uid),['b','a']);assert.equal(data.rows[1].bosses,2);
});
test('endless board keeps one best score when a guest and account share a name',async()=>{
  const {clb}=setup();clb.raw=async()=>[
    {uid:'guest',name:'Hero',mode:'solo',score:500,time:100,bosses:0,kills:50},
    {uid:'account',name:'Hero',mode:'solo',score:600,time:90,bosses:0,kills:40}
  ];
  const data=await clb.fetch('endless');assert.equal(data.rows.length,1);assert.equal(data.rows[0].uid,'account');
});
test('today cache follows the day and concurrent reads share one request',async()=>{
  let day=20261107,calls=0;const {clb}=setup({dayKey:()=>day});clb.query=async()=>{calls++;return [{time:calls}]};
  await Promise.all([clb.raw('today'),clb.raw('today')]);assert.equal(calls,1);
  day++;const rows=await clb.raw('today');assert.equal(calls,2);assert.equal(rows[0].time,2);
});
function writer(fail){let commits=0,applied=[];return {db:{collection(name){return {doc(id){return {name,id,collection(sub){return {doc(){return {name:name+'/'+id+'/'+sub}}}}}}}},batch(){const pending=[];return {set(ref,data){pending.push({ref,data})},async commit(){commits++;if(fail)throw {code:'unavailable'};applied.push(...pending)}}}},get commits(){return commits},get applied(){return applied}}}
test('all-time and daily writes commit atomically',async()=>{
  const {clb,cloud}=setup();const w=writer(true);cloud.ready=true;cloud.user={uid:'u'};cloud.db=w.db;
  const run={uid:'u',name:'Hero',cls:'swordsman',map:'valley',diff:'normal',time:100,kills:10,bosses:0,level:2,combo:2,relics:0,score:10,day:20261107};
  assert.equal((await clb.submit(run)).ok,false);assert.equal(w.commits,1);assert.equal(w.applied.length,0);
  const good=writer();cloud.db=good.db;assert.equal((await clb.submit(run)).ok,true);assert.equal(good.commits,1);assert.equal(good.applied.length,2);
  cloud.user={uid:'other'};assert.equal((await clb.submit(run)).error,'account-changed');assert.equal(good.commits,1);
});
test('a read begun before a successful write cannot repopulate stale cache',async()=>{
  const {clb,cloud}=setup(),pending=deferred();clb.query=()=>pending.promise;
  const reading=clb.raw('all');cloud.ready=true;cloud.user={uid:'u'};cloud.db=writer().db;
  await clb.submit({uid:'u',name:'Hero',cls:'swordsman',map:'valley',diff:'normal',time:100,kills:10,bosses:0,level:2,combo:2,relics:0,score:10,day:20261107});
  pending.resolve([{time:1}]);await reading;assert.equal(clb.cache.all,undefined);
});
test('slow results submission and retries always use the finished run snapshot',async()=>{
  const {c,ev,lb,cloud}=setup(),pending=deferred(),posts=[];cloud.ready=true;cloud.user={uid:'u'};
  lb.fetch=()=>pending.promise;lb.profiles=async()=>({});lb.submit=async r=>{posts.push(plain(r));return {ok:posts.length>1}};
  const container=node(),first=ev('submitRun')(container);
  c.G={t:1,cls:'wizard',kills:0,bossSlain:0,lv:1,comboMax:0,relics:[]};c.MAPID='pagoda';c.SAVE.mode='room';c.SAVE.avatar.e=9;
  pending.resolve({ok:true,rows:[]});await first;
  assert.equal(posts[0].time,123);assert.equal(posts[0].cls,'swordsman');assert.equal(posts[0].map,'valley');assert.equal(posts[0].kills,200);assert.equal(posts[0].mode,'solo');assert.equal(posts[0].av.e,1);
  container.children[0].onclick();await new Promise(r=>setImmediate(r));
  assert.equal(posts.length,2);assert.deepEqual(posts[1],posts[0]);
});
test('result rank uses kills as the same tie-breaker as the board',async()=>{
  const {ev,lb,cloud,c}=setup();cloud.ready=true;cloud.user={uid:'u'};c.G.t=100;c.G.bossSlain=1;c.G.kills=10;
  lb.fetch=async()=>({ok:true,rows:[{uid:'other',score:50,time:100,bosses:1,kills:20}]});lb.submit=async()=>({ok:true});
  const container=node();await ev('submitRun')(container);assert.match(container.children[0].innerHTML,/#2/);
});

test('score outranks survival time on both boards',async()=>{
  const {clb}=setup();clb.raw=async()=>[{uid:'long',score:100,time:1200,kills:100},{uid:'high',score:9000,time:100,kills:10}];
  for(const board of ['all','today'])assert.deepEqual(Array.from((await clb.fetch(board)).rows,r=>r.uid),['high','long']);
});
test('a shorter run with a better score posts, and a longer lower-score run does not',async()=>{
  const {c,ev,lb,cloud}=setup();cloud.ready=true;cloud.user={uid:'u'};c.G.score=900;const posts=[];
  lb.fetch=async()=>({ok:true,rows:[{uid:'u',score:100,time:1200,bosses:1,kills:100}]});lb.submit=async r=>{posts.push(r);return {ok:true}};
  await ev('submitRun')(node());assert.equal(posts.length,1);assert.equal(posts[0].time,123);assert.equal(posts[0].score,900);
  c.G.score=50;c.G.t=2000;await ev('submitRun')(node());assert.equal(posts.length,1);
});

test('cloud merge preserves the best score across devices and keeps the correct daily best',()=>{
  const {ev}=setup();const merge=ev('mergeSave');
  const result=merge({ts:2,lb:{rankBy:'score',bestRun:{score:900,time:100},day:20261107,dayBestRun:{score:900}}},{ts:1,lb:{rankBy:'score',bestRun:{score:100,time:1000},day:20261108,dayBestRun:{score:50}}});
  assert.equal(result.lb.bestRun.score,900);assert.equal(result.lb.day,20261108);assert.equal(result.lb.dayBestRun.score,50);
});
test('an offline endless best stays saved and uploads after reconnection',async()=>{
  const {c,ev,lb,cloud}=setup();let posts=0;
  c.SAVE.mode='solo';c.G.score=900;
  lb.fetch=async()=>{throw new TypeError('offline')};
  lb.submit=async()=>{posts++;return {ok:posts>1}};
  await ev('submitRun')(node());
  assert.equal(c.SAVE.lb.bestRun.score,900);
  assert.equal(c.SAVE.lb.pendingRun.score,900);
  cloud.ready=true;cloud.user={uid:'u'};
  await ev('lbFlushPending()');
  assert.equal(posts,2);
  assert.equal(c.SAVE.lb.pendingRun,undefined);
});
test('an endless best is saved before the board responds, including a voluntary exit',async()=>{
  const {c,ev,lb}=setup(),pending=deferred();
  c.G.abandoned=true;c.G.score=1200;
  lb.fetch=()=>pending.promise;lb.submit=async()=>({ok:false});
  const container=node(),work=ev('submitRun')(container);
  assert.equal(c.SAVE.lb.bestRun.score,1200);
  assert.equal(c.SAVE.lb.pendingRun.score,1200);
  assert.match(container.children[1].textContent,/1,200/);
  pending.resolve({ok:true,rows:[]});await work;
});
