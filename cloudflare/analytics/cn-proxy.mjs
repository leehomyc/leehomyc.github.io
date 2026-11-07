// Fixed upstreams only: the mainland route forwards Firebase traffic over the
// existing Pages origin, without changing the standard client or its database.
const ORIGINS=new Set(['https://spelllegion.com','https://spell-legion.pages.dev']);
const API_KEY='AIzaSyDeI9V8qBVB2B1lqZP5BaedYhaToHfs6Z8';
const allowedOrigin=request=>{
 const url=new URL(request.url),origin=request.headers.get('Origin');
 return ORIGINS.has(origin)||(url.hostname==='127.0.0.1'&&origin===url.origin);
};
const ROUTES={
 sdk:{host:'www.gstatic.com',prefix:'/firebasejs/10.14.1/',methods:['GET']},
 auth:{host:'identitytoolkit.googleapis.com',prefix:'/v1/',methods:['POST']},
 token:{host:'securetoken.googleapis.com',prefix:'/v1/',methods:['POST']},
 firestore:{host:'firestore.googleapis.com',prefix:'/',methods:['GET','POST']},
 helper:{host:'spell-legion.firebaseapp.com',prefix:'/__/auth/',methods:['GET']},
 'legacy-auth':{host:'www.googleapis.com',prefix:'/identitytoolkit/',methods:['GET','POST']}
};
const deny=(status,message)=>new Response(message,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function proxyFirebase(request){
 const url=new URL(request.url),match=url.pathname.match(/^\/api\/cn-proxy\/([^/]+)(\/.*)$/);
 if(!match)return deny(404,'Not found');
 const route=ROUTES[match[1]];
 if(!route||!route.methods.includes(request.method)||!match[2].startsWith(route.prefix))return deny(403,'Forbidden');
 if(request.method==='POST'&&!allowedOrigin(request))return deny(403,'Origin denied');
 if(Number(request.headers.get('Content-Length')||0)>1500000)return deny(413,'Request too large');
 const upstream=new URL(`https://${route.host}${match[2]}${url.search}`);
 if(upstream.hostname!==route.host)return deny(403,'Forbidden');
 if(['auth','token','legacy-auth'].includes(match[1])&&upstream.searchParams.get('key')!==API_KEY)return deny(403,'Project denied');
 if(match[1]==='firestore'){
  const rest=upstream.pathname.startsWith('/v1/projects/spell-legion/databases/(default)/documents');
  const channel=/^\/google\.firestore\.v1\.Firestore\/(Listen|Write)\/channel$/.test(upstream.pathname)&&upstream.searchParams.get('database')==='projects/spell-legion/databases/(default)';
  if(!rest&&!channel)return deny(403,'Project denied');
 }
 const headers=new Headers(request.headers);
 for(const name of ['cookie','host','referer','content-length','cf-connecting-ip','x-forwarded-for'])headers.delete(name);
 const body=request.method==='POST'?await request.arrayBuffer():undefined;
 if(body&&body.byteLength>1500000)return deny(413,'Request too large');
 const response=await fetch(upstream,{method:request.method,headers,body,redirect:'manual'});
 const outputHeaders=new Headers(response.headers);
 for(const name of ['set-cookie','content-security-policy','content-encoding','content-length'])outputHeaders.delete(name);
 outputHeaders.set('Cache-Control',match[1]==='sdk'?'public, max-age=86400, immutable':'no-store');
 outputHeaders.set('X-Content-Type-Options','nosniff');
 const origin=request.headers.get('Origin');
 if(allowedOrigin(request)){outputHeaders.set('Access-Control-Allow-Origin',origin);outputHeaders.set('Vary','Origin')}
 return new Response(response.body,{status:response.status,headers:outputHeaders});
}
