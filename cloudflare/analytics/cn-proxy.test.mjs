import assert from 'node:assert/strict';
import {proxyFirebase} from './cn-proxy.mjs';

const originalFetch=globalThis.fetch;
const seen=[];
globalThis.fetch=async(url,init)=>{seen.push({url:String(url),init});return new Response('ok',{headers:{'Content-Type':'application/json','Set-Cookie':'private=1'}})};
try{
  const base='https://spelllegion.com/api/cn-proxy/';
  let r=await proxyFirebase(new Request(base+'sdk/firebasejs/10.14.1/firebase-auth-compat.js'));
  assert.equal(r.status,200);
  assert.equal(seen.at(-1).url,'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js');
  assert.equal(r.headers.get('Set-Cookie'),null);
  assert.equal((await proxyFirebase(new Request(base+'sdk/other/script.js'))).status,403);
  assert.equal((await proxyFirebase(new Request(base+'unknown/v1/x'))).status,403);
  assert.equal((await proxyFirebase(new Request(base+'auth/v1/accounts:signInWithPassword',{method:'POST',body:'{}',headers:{Origin:'https://evil.example'}}))).status,403);
  assert.equal((await proxyFirebase(new Request(base+'auth/v1/accounts:signInWithPassword?key=wrong',{method:'POST',body:'{}',headers:{Origin:'https://spelllegion.com'}}))).status,403);
  assert.equal((await proxyFirebase(new Request(base+'firestore/v1/projects/another/databases/(default)/documents/profiles'))).status,403);
  r=await proxyFirebase(new Request(base+'firestore/v1/projects/spell-legion/databases/(default)/documents:runQuery',{method:'OPTIONS',headers:{Origin:'https://hyang.org','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}}));
  assert.equal(r.status,204);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://hyang.org');
  r=await proxyFirebase(new Request(base+'auth/v1/accounts:signUp?key=AIzaSyDeI9V8qBVB2B1lqZP5BaedYhaToHfs6Z8',{method:'OPTIONS',headers:{Origin:'https://hyang.org','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-goog-api-client'}}));
  assert.equal(r.status,204);
  assert.equal(r.headers.get('Access-Control-Allow-Headers'),'content-type,x-goog-api-client');
  assert.equal((await proxyFirebase(new Request(base+'firestore/google.firestore.v1.Firestore/Listen/channel?database=projects%2Fanother%2Fdatabases%2F(default)'))).status,403);
  assert.equal((await proxyFirebase(new Request(base+'firestore/google.firestore.v1.Firestore/Listen/channel?database=projects%2Fspell-legion%2Fdatabases%2F(default)'))).status,200);
  r=await proxyFirebase(new Request(base+'auth/v1/accounts:signInWithPassword?key=AIzaSyDeI9V8qBVB2B1lqZP5BaedYhaToHfs6Z8',{method:'POST',body:'{"email":"test@example.com"}',headers:{Origin:'https://spelllegion.com',Cookie:'x=1','Content-Type':'application/json'}}));
  assert.equal(r.status,200);
  assert.equal(seen.at(-1).url,'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDeI9V8qBVB2B1lqZP5BaedYhaToHfs6Z8');
  assert.equal(seen.at(-1).init.headers.get('cookie'),null);
  assert.equal(new TextDecoder().decode(seen.at(-1).init.body),'{"email":"test@example.com"}');
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://spelllegion.com');
  assert.equal((await proxyFirebase(new Request(base+'auth/v1/x?key=AIzaSyDeI9V8qBVB2B1lqZP5BaedYhaToHfs6Z8',{method:'POST',body:'x'.repeat(1500001),headers:{Origin:'https://spelllegion.com'}}))).status,413);
  console.log('Passed: fixed Firebase hosts, path/method/origin limits, body limit and credential header stripping.');
}finally{globalThis.fetch=originalFetch}
