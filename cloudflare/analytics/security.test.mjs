import {webcrypto} from 'node:crypto';
import assert from 'node:assert/strict';
import worker,{authenticate,validatePacket} from './worker.mjs';

const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);jwk.kid='test-key';
globalThis.fetch=async()=>Response.json({keys:[jwk]});
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const claims={sub:'test-user',aud:'spell-legion',iss:'https://securetoken.google.com/spell-legion',iat:Date.now()/1000-1,exp:Date.now()/1000+300,firebase:{sign_in_provider:'anonymous'}};
async function req(p=claims){const text=enc({alg:'RS256',kid:jwk.kid})+'.'+enc(p);const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(text));return new Request('https://spell-legion.pages.dev/api/analytics/dashboard',{headers:{Authorization:'Bearer '+text+'.'+Buffer.from(sig).toString('base64url')}});}
assert.equal((await authenticate(await req())).sub,'test-user');
for(const patch of [{aud:'wrong-project'},{iss:'https://evil.example'},{exp:1},{iat:Date.now()/1000+300}])await assert.rejects(()=>req({...claims,...patch}).then(authenticate));
const r=await worker.fetch(await req(),{ANALYTICS_DB:{},ASSETS:{}});assert.equal(r.status,403);
await assert.rejects(()=>authenticate(new Request('https://spell-legion.pages.dev')));
const packet={id:'123456789012',session:'abcdefghijkl',visibleMs:30000,playMs:10000};validatePacket(packet);
assert.throws(()=>validatePacket({...packet,playMs:40000}));assert.throws(()=>validatePacket({...packet,id:'../../../x'}));assert.throws(()=>validatePacket({...packet,visibleMs:Infinity}));
console.log('Passed: signed identity, wrong project/issuer/expiry/future rejection, admin denial, missing credentials and invalid telemetry validation.');
