import assert from 'node:assert/strict';
import {test} from 'node:test';
import {serveGameAsset} from './cn-static.mjs';

function visitor(path,country='CN',host='spelllegion.com',method='GET'){
 const request=new Request(`https://${host}${path}`,{method});
 Object.defineProperty(request,'cf',{value:{country}});
 return request;
}
function setup(upstream){
 const calls=[];
 globalThis.fetch=async(request,options)=>{calls.push({url:String(request),options});return upstream(request,options)};
 const env={ASSETS:{fetch:async()=>new Response('pages',{headers:{'Content-Type':'text/plain'}})}};
 return {env,calls};
}
test('mainland game assets use the mirror without changing the browser origin',async()=>{
 const {env,calls}=setup(async()=>new Response('github',{headers:{'Content-Type':'application/javascript','Set-Cookie':'secret=1'}}));
 const response=await serveGameAsset(visitor('/js/audio.js?v=1'),env);
 assert.equal(calls[0].url,'https://hyang.org/spell-legion/js/audio.js?v=1');
 assert.equal(await response.text(),'github');assert.equal(response.headers.get('Set-Cookie'),null);
});
test('other regions and backend routes keep Pages',async()=>{
 const {env,calls}=setup(async()=>new Response('github'));
 for(const req of [visitor('/','HK'),visitor('/api/cn-proxy/auth/x'),visitor('/admin/'),visitor('/version.json'),visitor('/','CN','spell-legion.pages.dev')])
  assert.equal(await (await serveGameAsset(req,env)).text(),'pages');
 assert.equal(calls.length,0);
});
test('mirror outage or missing file falls back to Pages',async()=>{
 let {env}=setup(async()=>new Response('missing',{status:404}));
 assert.equal(await (await serveGameAsset(visitor('/'),env)).text(),'pages');
 ({env}=setup(async()=>{throw Error('network unavailable')}));
 assert.equal(await (await serveGameAsset(visitor('/css/style.css'),env)).text(),'pages');
});
