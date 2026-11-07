'use strict';
window.SPELL_CONNECTION_READY=(async()=>{
  const localTest=location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).get('testCountry')==='CN';
  let cn=false;
  try{
    const response=await fetch('/api/connection-region'+(localTest?'?country=CN':''),{cache:'no-store'});
    cn=response.ok&&(await response.json()).cn===true;
  }catch(_){/* Keep the existing direct path when region lookup is unavailable. */}
  if(!cn){
    const registration=await navigator.serviceWorker?.getRegistration('/');
    if(registration?.active?.scriptURL.endsWith('/cn-connection-sw.js')){
      await registration.unregister();
      if(navigator.serviceWorker.controller)location.reload();
    }
    return;
  }
  if(!('serviceWorker' in navigator))throw new Error('Mainland connection is unavailable in this browser');
  await navigator.serviceWorker.register('/cn-connection-sw.js',{scope:'/'});
  await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller)await Promise.race([
    new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true})),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('Mainland connection timed out')),10000))
  ]);
})();
