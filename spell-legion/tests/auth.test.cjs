const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/cloud.js'),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
function setup(){
 const writes=[],messages=[],email={value:'player@example.com',validity:{}},password={value:'correct-password'},form={querySelector:s=>s==='.em'?email:password};
 const user={uid:'guest',isAnonymous:true,providerData:[]};
 const auth={currentUser:user,languageCode:'en'};
 const db={collection:collection=>({doc:uid=>({get:async()=>({exists:false}),set:async data=>{writes.push({collection,uid,data:JSON.parse(JSON.stringify(data))})}})})};
 const fbAuth=()=>auth;fbAuth.GoogleAuthProvider=function(){};fbAuth.FacebookAuthProvider=function(){};fbAuth.EmailAuthProvider={credential:(email,password)=>({email,password})};
 const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>123};
 const c=vm.createContext({console:{warn(){}},Promise,Set,Map,Date,JSON,localStorage:{getItem(){return null}},location:{hostname:'hyang.org'},document:{querySelectorAll:()=>[],querySelector:()=>({hidden:true})},$:(s)=>s==='#emailform'?form:s==='#emailform .em'?email:null,L:(zh,en)=>en,LOC:'en',SAVE:{gold:0,ts:1,runs:0},LB:{name:()=> 'Player'},firebase:{auth:fbAuth,firestore},setTimeout,clearTimeout,persist(){},addEventListener(){}});
 vm.runInContext(source,c);const cloud=vm.runInContext('CLOUD',c);Object.assign(cloud,{ready:true,initializing:false,user,auth,db,syncedUid:user.uid});
 c.renderAccount=()=>{};c.showMsg=m=>messages.push(m);
 return {c,cloud,auth,user,db,writes,messages,email,password};
}
test('email login never restores an old local snapshot over an already loaded cloud save',async()=>{
 const h=setup(),u={uid:'account',isAnonymous:false};h.auth.signInWithEmailAndPassword=async()=>{h.auth.currentUser=u;await h.c.cloudAuthChanged(u);h.c.SAVE.gold=900;h.c.SAVE.runs=20;return {user:u}};
 await h.c.cloudEmail('signin');await tick();assert.equal(h.c.SAVE.gold,900);assert.equal(h.c.SAVE.runs,20);assert.equal(h.cloud.emailOpen,false);
});
test('Google credential collision signs in to the existing account without restoring stale progress',async()=>{
 const h=setup(),u={uid:'google-account',isAnonymous:false};h.user.linkWithPopup=async()=>{throw {code:'auth/credential-already-in-use',credential:{id:'google'}}};
 h.auth.signInWithCredential=async()=>{h.auth.currentUser=u;await h.c.cloudAuthChanged(u);h.c.SAVE.gold=700;return {user:u}};
 await h.c.cloudProvider('google');await tick();assert.equal(h.cloud.user.uid,u.uid);assert.equal(h.c.SAVE.gold,700);assert.equal(h.cloud.authBusy,false);
});
test('a delayed read for the previous account cannot merge or write into the next account',async()=>{
 const h=setup(),slow=deferred();h.db.collection=collection=>({doc:uid=>({get:()=>uid==='a'?slow.promise:Promise.resolve({exists:true,data:()=>({save:{gold:22,ts:22,runs:2}})}),set:async data=>h.writes.push({collection,uid,data})})});
 const a={uid:'a'},b={uid:'b'};h.auth.currentUser=a;const pending=h.c.cloudAuthChanged(a);await tick();h.auth.currentUser=b;await h.c.cloudAuthChanged(b);
 slow.resolve({exists:true,data:()=>({save:{gold:99999,ts:99999,runs:100}})});await pending;
 assert.equal(h.c.SAVE.gold,22);assert.equal(h.cloud.syncedUid,'b');assert.ok(h.writes.every(w=>w.uid==='b'));
});
test('uploads wait for the server save; failed or cached reads cannot overwrite it',async()=>{
 for(const mode of ['pending','failed','cached']){
  const h=setup(),slow=deferred();h.cloud.syncedUid=null;h.db.collection=()=>({doc:()=>({get:()=>slow.promise,set:async()=>h.writes.push('write')})});
  const read=h.c.cloudPull();await tick();await h.c.cloudPush(true);assert.equal(h.writes.length,0);
  if(mode==='failed')slow.reject(Error('offline'));else slow.resolve({exists:false,metadata:{fromCache:mode==='cached'}});
  await read;
  if(mode!=='pending'){await h.c.cloudPush(true);assert.equal(h.writes.length,0);assert.ok(h.cloud.syncErr)}
  else assert.equal(h.writes.length,2);
 }
});
test('save writes are serialized and a queued write uses the latest local progress',async()=>{
 const h=setup(),slow=deferred();let first=true;
 h.db.collection=collection=>({doc:uid=>({set:async data=>{h.writes.push({collection,uid,data:JSON.parse(JSON.stringify(data))});if(collection==='saves'&&first){first=false;await slow.promise}}})});
 h.c.SAVE.gold=10;const one=h.c.cloudPush(true);await tick();h.c.SAVE.gold=20;const two=h.c.cloudPush(true);await tick();assert.equal(h.writes.length,1);slow.resolve();await Promise.all([one,two]);
 assert.deepEqual(h.writes.filter(w=>w.collection==='saves').map(w=>w.data.save.gold),[10,20]);
});
test('signing out during a save never redirects the profile write to the next account',async()=>{
 const h=setup(),slow=deferred();h.db.collection=collection=>({doc:uid=>({set:async data=>{h.writes.push({collection,uid});await slow.promise}})});
 const write=h.c.cloudPush(true);await tick();h.auth.currentUser={uid:'next'};h.cloud.user=h.auth.currentUser;h.cloud.epoch++;slow.resolve();await write;assert.deepEqual(h.writes,[{collection:'saves',uid:'guest'}]);
});
test('email registration links the guest UID and sends verification even while cloud storage is slow',async()=>{
 const h=setup(),slow=deferred();let verified=0;h.cloud.syncedUid=null;h.db.collection=()=>({doc:()=>({get:()=>slow.promise,set:async()=>{}})});
 h.user.linkWithCredential=async()=>{h.user.isAnonymous=false;return {user:h.user}};h.user.sendEmailVerification=async()=>verified++;
 await h.c.cloudEmail('signup');assert.equal(h.cloud.user.uid,'guest');assert.equal(verified,1);assert.equal(h.cloud.authBusy,false);slow.resolve({exists:false});await tick();
});
test('double clicking login sends just one request, and a rejected password unlocks the form',async()=>{
 const h=setup(),slow=deferred();let calls=0;h.auth.signInWithEmailAndPassword=()=>{calls++;return slow.promise};
 const a=h.c.cloudEmail('signin');await h.c.cloudEmail('signin');assert.equal(calls,1);slow.reject({code:'auth/invalid-credential'});await a;assert.equal(h.cloud.authBusy,false);assert.equal(h.messages.at(-1),'Wrong email or password');
});
test('password reset does not require a password; short signup passwords are rejected locally',async()=>{
 const h=setup();let resets=0;h.password.value='';h.auth.sendPasswordResetEmail=async em=>{assert.equal(em,h.email.value);resets++};await h.c.cloudEmail('reset');assert.equal(resets,1);
 h.password.value='123';await h.c.cloudEmail('signup');assert.equal(h.messages.at(-1),'Password needs 7+ characters');
});
test('blocked Google popups on hyang.org do not enter an unreliable cross-origin redirect',async()=>{
 const h=setup();let redirects=0;h.user.linkWithPopup=async()=>{throw {code:'auth/popup-blocked'}};h.user.linkWithRedirect=async()=>redirects++;
 await h.c.cloudProvider('google');assert.equal(redirects,0);assert.equal(h.messages.at(-1),'Allow popups and try again');assert.equal(h.cloud.authBusy,false);
});
test('verification refresh tolerates sign-out while reload is pending',async()=>{
 const h=setup(),slow=deferred();h.user.reload=()=>slow.promise;const check=h.c.cloudCheckVerify();h.auth.currentUser=null;slow.resolve();await check;assert.equal(h.cloud.authBusy,false);assert.equal(h.messages.length,0);
});
test('successful email verification refreshes the token used by other services',async()=>{
 const h=setup();let forced=false;h.user.reload=async()=>h.user.emailVerified=true;h.user.getIdToken=async force=>forced=force;await h.c.cloudCheckVerify();assert.equal(forced,true);assert.equal(h.messages.at(-1),'Email verified ✓');
});
test('account markup escapes HTML supplied by a name or email draft',()=>{
 const h=setup();assert.equal(h.c.accountEscape('\"><img src=x onerror=alert(1)>'),'&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
});
test('a failed sign-out never claims success',async()=>{
 const h=setup();h.auth.signOut=async()=>{throw {code:'auth/network-request-failed'}};assert.equal(await h.c.cloudSignOut(),false);assert.equal(h.messages.at(-1),'Network error');
});
test('an old redirect result cannot replace a newer authenticated identity',async()=>{
 const h=setup();h.auth.currentUser={uid:'current'};h.cloud.user=h.auth.currentUser;await h.c.cloudAuthChanged({uid:'old'});assert.equal(h.cloud.user.uid,'current');assert.equal(h.writes.length,0);
});
test('first anonymous sign-in completes initialization and synchronizes the guest',async()=>{
 const h=setup();h.auth.currentUser=null;h.cloud.user=null;h.cloud.syncedUid=null;h.cloud.initializing=true;
 h.auth.signInAnonymously=async()=>{h.auth.currentUser=h.user;return {user:h.user}};
 await h.c.cloudAuthChanged(null);assert.equal(h.cloud.user.uid,'guest');assert.equal(h.cloud.initializing,false);assert.equal(h.cloud.syncedUid,'guest');
});

test('registration only requires seven characters and accepts digits, letters, symbols or Unicode alone',async()=>{
 for(const password of ['1234567','abcdefg','!!!!!!!','中文字密码测试啊']){
  const h=setup();h.password.value=password;let linked;h.user.linkWithCredential=async credential=>{linked=credential.password;return {user:h.user}};h.user.sendEmailVerification=async()=>{};await h.c.cloudEmail('signup');await tick();assert.equal(linked,password);
 }
 for(const password of ['123456','abcdef','!!!!!!','😀😀😀😀😀😀']){
  const h=setup();h.password.value=password;let called=false;h.user.linkWithCredential=async()=>{called=true};await h.c.cloudEmail('signup');assert.equal(called,false);assert.equal(h.messages.at(-1),'Password needs 7+ characters');
 }
});
test('existing six-character passwords remain valid for signing in',async()=>{
 const h=setup();h.password.value='123456';let passed;h.auth.signInWithEmailAndPassword=async(email,password)=>{passed=password;return {user:h.user}};await h.c.cloudEmail('signin');await tick();assert.equal(passed,'123456');
});
