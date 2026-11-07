import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const script=await readFile(new URL('../../spell-legion/js/cn-connection-boot.js',import.meta.url),'utf8');
async function boot(cn,hostname='spelllegion.com'){
  const calls=[];
  class XHR{open(method,url){calls.push(url)}}
  const context={
    navigator:{},
    location:{hostname,origin:`https://${hostname}`,href:`https://${hostname}/`,search:''},
    URL,URLSearchParams,AbortController,Request,XMLHttpRequest:XHR,setTimeout,clearTimeout,console,
    fetch:async url=>{calls.push(String(url));return String(url).includes('/api/connection-region')?{ok:true,json:async()=>({cn})}:{ok:true}}
  };
  context.window=context;
  vm.runInNewContext(script,context);
  await context.SPELL_CONNECTION_READY;
  return {context,calls};
}
const mainland=await boot(true);
assert.equal(mainland.context.SPELL_CN_PROXY,true);
await mainland.context.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=x');
assert.equal(mainland.calls.at(-1),'https://spelllegion.com/api/cn-proxy/auth/v1/accounts:lookup?key=x');
new mainland.context.XMLHttpRequest().open('POST','https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel');
assert.equal(mainland.calls.at(-1),'https://spelllegion.com/api/cn-proxy/firestore/google.firestore.v1.Firestore/Listen/channel');
const legacy=await boot(true,'hyang.org');
assert.equal(legacy.context.SPELL_CN_PROXY_BASE,'https://spelllegion.com/api/cn-proxy');
const elsewhere=await boot(false);
assert.equal(elsewhere.context.SPELL_CN_PROXY,false);
await elsewhere.context.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=x');
assert.equal(elsewhere.calls.at(-1),'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=x');
console.log('Passed: mainland boot works without service workers; other regions stay direct.');
