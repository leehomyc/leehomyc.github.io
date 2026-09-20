/* Browser-only Firebase contract double. All reads/writes and mail stay in memory. */
window.__mock = Object.assign({user:null, documents:{}, reads:0, writes:[], listeners:[], readFail:false, writeFail:false, writePending:false, verifyFail:false}, window.__fixtureConfig || {});
(() => {
  const m=window.__mock;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const snap=uid=>({exists:!!m.documents[uid],data:()=>clone(m.documents[uid]||{}),metadata:{fromCache:false,hasPendingWrites:false}});
  const merge=(target,patch)=>{for(const [k,v] of Object.entries(patch)){if(v&&typeof v==='object'&&!Array.isArray(v)){if(!Object.keys(v).length)target[k]={};else{if(!target[k]||typeof target[k]!=='object')target[k]={};merge(target[k],v);}}else target[k]=v;}return target;};
  const emit=()=>m.listeners.forEach(l=>l.callback(snap(l.uid)));
  m.emit=emit;
  function user(email='audit@example.invalid',verified=true,uid='audit-user'){
    return {uid,email,emailVerified:verified,async sendEmailVerification(){m.mailAttempts=(m.mailAttempts||0)+1;if(m.verifyFail)throw {code:'auth/network-request-failed'};},async reload(){if(m.verifyNow)this.emailVerified=true;},async getIdToken(){return 'fixture-token';}};
  }
  if(m.user)m.user=user(m.user.email,m.user.emailVerified,m.user.uid);
  const auth={
    get currentUser(){return m.user;},
    onAuthStateChanged(cb){m.authCallback=cb;setTimeout(()=>cb(m.user),0);return ()=>{};},
    async signInWithEmailAndPassword(email){m.user=user(email,m.loginVerified!==false,m.loginUid||'audit-user');m.authCallback(m.user);return {user:m.user};},
    async createUserWithEmailAndPassword(email){m.user=user(email,false);m.authCallback(m.user);return {user:m.user};},
    async signOut(){m.user=null;m.authCallback(null);},
    async sendPasswordResetEmail(){m.resetAttempts=(m.resetAttempts||0)+1;}
  };
  const firestore=function(){return {
    collection(){return {doc(uid){return {uid,
      async get(){m.reads++;if(m.readDelayMs)await new Promise(r=>setTimeout(r,m.readDelayMs));if(m.readFail)throw Error('injected read failure');return snap(uid);},
      onSnapshot(options,callback,error){const listener={uid,callback,error};m.listeners.push(listener);setTimeout(()=>{if(m.listeners.includes(listener))callback(snap(uid));},0);return ()=>{m.listeners=m.listeners.filter(l=>l!==listener);};}
    };}};},
    async runTransaction(callback){
      if(m.writePending)await new Promise(resolve=>{m.resolveWrite=resolve;});
      if(m.writeFail)throw Error('injected write failure');
      const writes=[];
      const result=await callback({async get(ref){m.reads++;return snap(ref.uid);},set(ref,data,options){writes.push({uid:ref.uid,data:clone(data),options});}});
      for(const w of writes){m.writes.push(w);m.documents[w.uid]=merge(m.documents[w.uid]||{},w.data);}
      emit();return result;
    }
  };};
  firestore.FieldValue={serverTimestamp:()=> 'fixture-server-time'};
  window.firebase={apps:[],initializeApp(){this.apps.push({});},auth:()=>auth,firestore};
})();
