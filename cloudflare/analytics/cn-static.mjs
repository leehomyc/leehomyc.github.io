// Serve the GitHub Pages mirror on the existing game origin for mainland visitors.
// Keep API, admin and deployment metadata on Pages; a failed mirror request falls back locally.
const MIRROR='https://hyang.org/spell-legion';
export async function serveGameAsset(request,env){
 const url=new URL(request.url);
 if(url.hostname!=='spelllegion.com'||request.cf?.country!=='CN'||!['GET','HEAD'].includes(request.method)||
    url.pathname.startsWith('/api/')||url.pathname.startsWith('/admin/')||
    ['/version.json','/favicon.ico','/robots.txt'].includes(url.pathname))return env.ASSETS.fetch(request);
 const upstream=new URL(MIRROR+(url.pathname==='/'?'/':url.pathname));
 upstream.search=url.search;
 try{
  const response=await fetch(upstream,{method:request.method,redirect:'manual',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return env.ASSETS.fetch(request);
  const headers=new Headers(response.headers);
  headers.delete('set-cookie');headers.delete('content-length');headers.delete('content-encoding');
  headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  if(url.pathname==='/'||url.pathname==='/index.html')headers.set('Cache-Control','no-cache');
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
 }catch{return env.ASSETS.fetch(request)}
}
