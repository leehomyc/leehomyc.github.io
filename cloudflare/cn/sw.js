'use strict';
// Registered only for mainland visitors; all players use the same page and Firebase project.
const HOSTS={
  'www.gstatic.com':'sdk',
  'identitytoolkit.googleapis.com':'auth',
  'securetoken.googleapis.com':'token',
  'firestore.googleapis.com':'firestore',
  'spell-legion.firebaseapp.com':'helper',
  'www.googleapis.com':'legacy-auth'
};
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),route=HOSTS[url.hostname];
  if(!route||!['GET','POST'].includes(event.request.method))return;
  const proxy=new URL(`/api/cn-proxy/${route}${url.pathname}${url.search}`,self.location.origin);
  event.respondWith((async()=>{
    const headers=new Headers(event.request.headers);
    headers.delete('cookie');headers.delete('referer');
    const init={method:event.request.method,headers,credentials:'omit',cache:'no-store'};
    if(event.request.method==='POST')init.body=await event.request.clone().arrayBuffer();
    const response=await fetch(proxy,init);
    return new Response(response.body,{status:response.status,headers:response.headers});
  })());
});
