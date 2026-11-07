'use strict';
// Mainland visitors use the same page and Firebase project. Rewrite only the
// Firebase network destinations; no service worker activation is required.
window.SPELL_CN_PROXY=false;
window.SPELL_CONNECTION_READY=(async()=>{
  const localTest=location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).get('testCountry')==='CN';
  let cn=false;
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
    try{
      const response=await fetch('/api/connection-region'+(localTest?'?country=CN':''),{cache:'no-store',signal:controller.signal});
      cn=response.ok&&(await response.json()).cn===true;
    }finally{clearTimeout(timer)}
  }catch(_){/* Keep the existing direct path if the region lookup is unavailable. */}
  navigator.serviceWorker?.getRegistration('/').then(registration=>{
    if(registration?.active?.scriptURL.endsWith('/cn-connection-sw.js'))return registration.unregister().then(()=>{
      if(!cn&&navigator.serviceWorker.controller)location.reload();
    });
  }).catch(()=>{});
  if(!cn)return;
  const hosts={
    'identitytoolkit.googleapis.com':'auth',
    'securetoken.googleapis.com':'token',
    'firestore.googleapis.com':'firestore',
    'spell-legion.firebaseapp.com':'helper',
    'www.googleapis.com':'legacy-auth'
  };
  const rewrite=input=>{
    const url=new URL(input,location.href),route=hosts[url.hostname];
    return route?`/api/cn-proxy/${route}${url.pathname}${url.search}`:input;
  };
  const nativeFetch=window.fetch;
  window.fetch=function(input,init){
    const url=typeof input==='string'||input instanceof URL?String(input):input?.url;
    const rewritten=url&&rewrite(url);
    if(!rewritten||rewritten===url)return nativeFetch.call(this,input,init);
    return nativeFetch.call(this,input instanceof Request?new Request(rewritten,input):rewritten,init);
  };
  const nativeOpen=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(method,url,...rest){return nativeOpen.call(this,method,rewrite(String(url)),...rest)};
  window.SPELL_CN_PROXY=true;
})();
