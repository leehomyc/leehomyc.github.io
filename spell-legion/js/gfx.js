'use strict';
/* gfx.js — three.js scene: materials, world, characters, effect pools, post-processing */
const T3=THREE;
/* quality tiers: auto-detected, overridable from the title screen */
const QUAL={low:{shadow:1024,grass:7000,dpr:1,msaa:false,flies:90,trees:.55,tilt:0,ground:2048},med:{shadow:2048,grass:15000,dpr:1.25,msaa:false,flies:180,trees:.8,tilt:1,ground:3072},high:{shadow:4096,grass:30000,dpr:1.5,msaa:true,flies:320,trees:1,tilt:1,ground:4096}};
function applyQuality(level){
 if(!QUAL[level]||level===QLEVEL)return;
 QLEVEL=level;try{localStorage.setItem('sl_quality',level)}catch(_){}
 if(!rn)return;
 DPR=Math.min(devicePixelRatio||1,Q().dpr);
 sun.shadow.mapSize.set(Q().shadow,Q().shadow);sun.shadow.radius=level==='low'?2:3.5;
 if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}sun.shadow.needsUpdate=true;
 if(comp){
  for(const pass of comp.passes){if(pass.dispose)pass.dispose();for(const key of ['material','materialHighPassFilter','compositeMaterial','materialCopy','basic'])if(pass[key]?.dispose)pass[key].dispose();for(const mat of pass.separableBlurMaterials||[])mat.dispose()}
  comp.renderTarget1.dispose();comp.renderTarget2.dispose();comp.copyPass.material.dispose();
 }
 buildPost();resize();
}
function detectQuality(){if(PHONE)return 'low';const cores=navigator.hardwareConcurrency||4,mem=navigator.deviceMemory||8;if(cores<=4||mem<=4)return 'low';if(cores<=8)return 'med';return 'high'}
let QLEVEL=(()=>{try{const q=localStorage.getItem('sl_quality');if(q&&QUAL[q])return q}catch(_){}return detectQuality()})();
if(PHONE){QUAL.low={shadow:512,grass:2200,dpr:.9,msaa:false,flies:36,trees:.45,tilt:0,ground:1024};QUAL.med={shadow:1024,grass:5000,dpr:1,msaa:false,flies:80,trees:.6,tilt:0,ground:1536};QUAL.high={shadow:1024,grass:9000,dpr:1.2,msaa:false,flies:140,trees:.8,tilt:1,ground:2048}}
const Q=()=>QUAL[QLEVEL];
let SHAKE='off'; // screen shake, hit-stop freezes and screen ripples are removed for good: the view never jolts
let MAPID=(()=>{try{const m=localStorage.getItem('sl_map');if(m&&MAPS[m])return m}catch(_){}return 'valley'})();
const MAP=()=>MAPS[MAPID];
/* chunked instancing: split instances into spatial tiles so frustum culling works in the main and shadow passes */
function chunked(geo,m,list,shadow=true,receive=true,occl=false){
  const CX=5,CZ=4,x0=-320,z0=-320,cw=(W+640)/CX,ch=(H+640)/CZ,buckets=[];
  for(const p of list){const i=clamp(Math.floor((p[0]-x0)/cw),0,CX-1),j=clamp(Math.floor((p[2]-z0)/ch),0,CZ-1),k=i+j*CX;(buckets[k]=buckets[k]||[]).push(p)}
  const out=[];
  buckets.forEach((b,k)=>{if(!b||!b.length)return;const i=k%CX,j=(k/CX)|0;const gg=geo.clone();gg.computeBoundingSphere();const r0=gg.boundingSphere?gg.boundingSphere.radius:40;
    const cx=x0+(i+.5)*cw,cz=z0+(j+.5)*ch;gg.boundingSphere=new T3.Sphere(new T3.Vector3(cx,40,cz),hyp(cw/2,ch/2)+r0*2.2+40);
    const im=new T3.InstancedMesh(gg,m,b.length);b.forEach((p,n)=>{dummy.position.set(p[0],p[1]||0,p[2]);dummy.rotation.set(0,p[3]||0,0);const kk=p[4]||1;dummy.scale.set(kk,p[5]||kk,kk);dummy.updateMatrix();im.setMatrixAt(n,dummy.matrix);const lv=p[6]||1;im.setColorAt(n,new T3.Color(lv,lv,lv))});
    im.castShadow=shadow;im.receiveShadow=receive;im.frustumCulled=true;scene.add(im);out.push(im);
    if(occl)b.forEach((p,n)=>{const mtx=new T3.Matrix4();im.getMatrixAt(n,mtx);occluders.push({im,n,x:p[0],z:p[2],base:mtx,k:1})})});
  return out;
}
const lin=h=>new T3.Color(h).convertSRGBToLinear();
const U={uTime:{value:0}};
let rn,scene,cam,sun,orbL,hemiL,splats=[],splatI=0,occluders=[],comp,finalPass,bloomPass,glowPts,glowN=0,DPR=1,viewK=1,camX=W/2,camZ=H/2,VW=580,VH=400;
let ruins=null,grassMesh,gemMesh,bulletMesh,swordMesh,talisMesh,playerG,hatA,capeM,armG,crystal,feetSigil,bossG,tele,mRing,heartMesh;
const dangerPool=[],dangerFill=[],locator={g:null,parts:[]};
const blades=[],roofs=[],inst={},statues=[],mushes=[],ringPool=[],poolPool=[],scorch=[],flashL=[],rays=[],blueMush=[],flies=[],ghostM=[],shrineM=[];
let scorchI=0;
const dummy=new T3.Object3D();dummy.rotation.order='YXZ';
const tc=new T3.Color(),v3=new T3.Vector3();

/* ---------- geometry helpers ---------- */
function part(geo,hex,o={}){
  let g=geo.index?geo.toNonIndexed():geo.clone();
  const m=new T3.Matrix4().compose(new T3.Vector3(...(o.p||[0,0,0])),new T3.Quaternion().setFromEuler(new T3.Euler(...(o.r||[0,0,0]))),new T3.Vector3(...(o.s||[1,1,1])));
  g.applyMatrix4(m);
  const pos=g.attributes.position,nor=g.attributes.normal,n=pos.count,col=new Float32Array(n*3),em=new Float32Array(n*3),li=new Float32Array(n*2);
  const a=lin(hex),b=o.top?lin(o.top):a,e=o.emit?lin(o.emit):null,ei=o.ei||1;
  let y0=1e9,y1=-1e9;for(let i=0;i<n;i++){const y=pos.getY(i);if(y<y0)y0=y;if(y>y1)y1=y}
  const jit=o.jit||0;let j=1;
  for(let i=0;i<n;i++){
    if(i%3===0)j=1+(Math.random()-.5)*jit*2;
    let k=(pos.getY(i)-y0)/((y1-y0)||1);
    if(o.moss&&nor.getY(i)>o.moss){col[i*3]=b.r*j;col[i*3+1]=b.g*j;col[i*3+2]=b.b*j}
    else if(o.moss){col[i*3]=a.r*j;col[i*3+1]=a.g*j;col[i*3+2]=a.b*j}
    else{col[i*3]=(a.r+(b.r-a.r)*k)*j;col[i*3+1]=(a.g+(b.g-a.g)*k)*j;col[i*3+2]=(a.b+(b.b-a.b)*k)*j}
    if(e){em[i*3]=e.r*ei;em[i*3+1]=e.g*ei;em[i*3+2]=e.b*ei}
    if(o.limb){li[i*2]=o.limb;li[i*2+1]=o.hip||0}
  }
  g.setAttribute('color',new T3.BufferAttribute(col,3));
  g.setAttribute('aEmit',new T3.BufferAttribute(em,3));
  g.setAttribute('aLimb',new T3.BufferAttribute(li,2));
  return g;
}
function merge(parts){
  const out=new T3.BufferGeometry();
  for(const [name,sz] of [['position',3],['normal',3],['color',3],['aEmit',3],['aLimb',2]]){
    let tot=0;parts.forEach(p=>tot+=p.attributes[name].count*sz);
    const arr=new Float32Array(tot);let o=0;
    parts.forEach(p=>{arr.set(p.attributes[name].array,o);o+=p.attributes[name].count*sz});
    out.setAttribute(name,new T3.BufferAttribute(arr,sz));
  }
  return out;
}
const hash3=(x,y,z)=>{const s=Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453;return s-Math.floor(s)};
function lump(r,det,amp,sx=1,sy=1,sz=1){
  const g=new T3.IcosahedronGeometry(r,det),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),q=r*.55;const n=hash3(Math.round(x/q),Math.round(y/q),Math.round(z/q))-.5,k=1+n*amp;p.setXYZ(i,x*k*sx,y*k*sy,z*k*sz)}
  g.computeVertexNormals();return g;
}
function rock(w,h,d,amp=.14){
  const g=new T3.BoxGeometry(w,h,d,2,2,2).toNonIndexed(),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),q=7;p.setXYZ(i,x+(hash3(x/q|0,y/q|0,z/q|0)-.5)*w*amp,y+(hash3(y/q|0,z/q|0,x/q|0)-.5)*h*amp,z+(hash3(z/q|0,x/q|0,y/q|0)-.5)*d*amp)}
  g.computeVertexNormals();return g;
}
const SPH=(r,a=12,b=9)=>new T3.SphereGeometry(r,a,b),CYL=(a,b,h,s=10,o=false)=>new T3.CylinderGeometry(a,b,h,s,1,o),CONE=(r,h,s=10)=>new T3.ConeGeometry(r,h,s),BOX=(a,b,c)=>new T3.BoxGeometry(a,b,c);

/* ---------- materials ---------- */
function mat(kind,o={}){
  const M=o.lambert?new T3.MeshLambertMaterial({vertexColors:true,...o.m}):new T3.MeshStandardMaterial({vertexColors:true,roughness:o.rough??.62,metalness:o.metal??.04,...o.m});
  const rim=lin(o.rim||'#ffd9b0'),rimI=o.rimI??.3;
  M.customProgramCacheKey=()=>kind+(o.lambert?'L':'S')+rimI+(o.windY||'');
  M.onBeforeCompile=s=>{
    s.uniforms.uTime=U.uTime;s.uniforms.uRim={value:rim};
    s.vertexShader='attribute vec3 aEmit;attribute vec2 aLimb;varying vec3 vEmit;uniform float uTime;'+(kind==='anim'?'attribute float aPhase;':'')+'\n'+s.vertexShader
      .replace('#include <begin_vertex>',`#include <begin_vertex>
      vEmit=aEmit;
      ${kind==='anim'?`if(aLimb.x!=0.0&&position.y<aLimb.y+6.0){transformed.z+=aLimb.x*sin(aPhase*2.2)*(aLimb.y-position.y)*.62;transformed.y+=max(0.0,aLimb.x*cos(aPhase*2.2))*.9;}`:''}
      ${kind==='wind'?`#ifdef USE_INSTANCING
        float ph=instanceMatrix[3].x*.035+instanceMatrix[3].z*.05;
      #else
        float ph=0.0;
      #endif
      float wy=max(0.0,position.y)*${o.windY||'0.08'};transformed.x+=(sin(uTime*1.5+ph)+.5*sin(uTime*3.3+ph*2.3))*wy;transformed.z+=cos(uTime*1.2+ph*1.4)*wy*.7;`:''}`);
    if(!o.lambert){
      s.fragmentShader='varying vec3 vEmit;uniform vec3 uRim;\n'+s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      totalEmissiveRadiance+=vEmit;
      float rimF=pow(1.0-saturate(dot(normalize(vViewPosition),normal)),2.6);
      totalEmissiveRadiance+=uRim*rimF*${rimI.toFixed(2)};`);
    }else{
      s.fragmentShader='varying vec3 vEmit;\n'+s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vEmit;');
    }
  };
  return M;
}
function radial(stops,sz=256){
  const k=document.createElement('canvas');k.width=k.height=sz;const g=k.getContext('2d'),r=g.createRadialGradient(sz/2,sz/2,0,sz/2,sz/2,sz/2);
  stops.forEach(([p,c])=>r.addColorStop(p,c));g.fillStyle=r;g.fillRect(0,0,sz,sz);return new T3.CanvasTexture(k);
}

/* ---------- ground ---------- */
function paintGround(){
  const M=320,TW=Q().ground,TH=Math.round(TW*(H+2*M)/(W+2*M)),sx=TW/(W+2*M);
  const k=document.createElement('canvas');k.width=TW;k.height=TH;const g=k.getContext('2d');
  const X=x=>(x+M)*sx,Y=y=>(y+M)*sx;
  const TH_=MAP();g.fillStyle=TH_.base;g.fillRect(0,0,TW,TH);
  const blob=(x,y,r,col,a)=>{const G2=g.createRadialGradient(x,y,0,x,y,r);const c=new T3.Color(col),s=`${c.r*255|0},${c.g*255|0},${c.b*255|0}`;G2.addColorStop(0,`rgba(${s},${a})`);G2.addColorStop(.6,`rgba(${s},${a*.55})`);G2.addColorStop(1,`rgba(${s},0)`);g.fillStyle=G2;g.fillRect(x-r,y-r,r*2,r*2)};
  for(let i=0;i<3200;i++)blob(vrnd(TW),vrnd(TH),vrnd(30,220)*sx,vpick(TH_.blobs),.3);
  const trail=(pts,w)=>{for(const [lw,a,col] of [[w*1.6,.22,TH_.trail[0]],[w,.45,TH_.trail[1]],[w*.5,.5,TH_.trail[2]]]){g.lineWidth=lw*sx;g.strokeStyle=col;g.globalAlpha=a;g.lineCap='round';g.lineJoin='round';g.beginPath();pts.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1])));g.stroke()}g.globalAlpha=1};
  TRAILS.forEach(t=>trail(t.pts,t.w));
  for(const t of TRAILS)for(let i=0;i<t.pts.length*40;i++){const p=t.pts[Math.floor(vrnd(t.pts.length))];g.fillStyle=vpick(['#6f5f43','#4e5a3a','#a39070','#7c8040']);g.globalAlpha=.3;g.fillRect(X(p[0]+vrnd(-t.w,t.w))-1,Y(p[1]+vrnd(-t.w,t.w))-1,vrnd(1,4),vrnd(1,3))}g.globalAlpha=1;
  // plaza
  const cx=X(W/2),cy=Y(H/2);
  g.fillStyle=TH_.plaza;g.beginPath();g.arc(cx,cy,(PLAZA_R-6)*sx,0,TAU);g.fill();blob(cx,cy,(PLAZA_R+30)*sx,TH_.plaza,.55);
  for(let ringN=0;ringN<6;ringN++){const r=(20+ringN*22)*sx,n=8+ringN*7;
    for(let i=0;i<n;i++){const a0=i/n*TAU+ringN*.3,a1=a0+TAU/n*.965,th=10.3*sx;
      g.fillStyle=vpick(['#6e6d66','#5f615c','#77746a','#55574f','#686a60']);g.beginPath();g.arc(cx,cy,r+th+vrnd(-.6,.6),a0,a1);g.arc(cx,cy,r-th,a1,a0,true);g.closePath();g.fill();
      g.strokeStyle='#23251f';g.lineWidth=1.5;g.stroke();for(let q=0;q<9;q++){const a=vrnd(a0,a1),d=r+vrnd(-th*.8,th*.8);g.fillStyle=vpick(['#8b8a7d','#4a4c46','#6a8a4e','#3d3f39']);g.globalAlpha=.45;g.fillRect(cx+Math.cos(a)*d,cy+Math.sin(a)*d,vrnd(2,7),vrnd(1,4));g.globalAlpha=1}}}
  // pavilion platforms and shrine courts
  PAVS.forEach(p=>{g.fillStyle='#55574f';g.fillRect(X(p[0]-52),Y(p[1]-52),104*sx,104*sx);g.strokeStyle='#23251f';g.lineWidth=2;for(let i=-52;i<=52;i+=26){g.beginPath();g.moveTo(X(p[0]+i),Y(p[1]-52));g.lineTo(X(p[0]+i),Y(p[1]+52));g.stroke();g.beginPath();g.moveTo(X(p[0]-52),Y(p[1]+i));g.lineTo(X(p[0]+52),Y(p[1]+i));g.stroke()}});
  SHRINES.forEach(s=>{blob(X(s[0]),Y(s[1]),46*sx,'#4a4c46',.8);g.strokeStyle='#8b8a7d';g.lineWidth=2;g.globalAlpha=.5;g.beginPath();g.arc(X(s[0]),Y(s[1]),30*sx,0,TAU);g.stroke();g.globalAlpha=1});
  PONDS.forEach(p=>{blob(X(p[0]),Y(p[1]),p[2]*1.45*sx,'#27473c',.85);blob(X(p[0]),Y(p[1]),p[2]*1.2*sx,'#5b5a40',.4)});
  // bamboo litter and maple leaves
  rocks.filter(r=>r.bamboo).forEach(r=>{for(let i=0;i<260;i++){g.fillStyle=vpick(['#9aa85a','#c9c478','#6f7f3a']);g.globalAlpha=.5;const x=X(r.x+vrnd(-20,r.w+20)),y=Y(r.y+vrnd(-20,r.h+20));g.save();g.translate(x,y);g.rotate(vrnd(TAU));g.fillRect(-3,-.7,6,1.4);g.restore()}});
  maples.forEach(m=>{for(let i=0;i<90;i++){g.fillStyle=vpick(m[3]?['#e8713a','#f0a040','#c9552f']:['#b03a2a','#e85a3a','#8e2a22']);g.globalAlpha=vrnd(.4,.85);const a=vrnd(TAU),d=vrnd(0,40*m[2]);g.fillRect(X(m[0]+Math.cos(a)*d),Y(m[1]+Math.sin(a)*d*.8),2.4,2)}});
  g.globalAlpha=1;
  const n=TW>=4096?170000:TW>=3072?110000:60000;
  for(let i=0;i<n;i++){g.fillStyle=vpick(TH_.grain);g.globalAlpha=vrnd(.12,.42);const s=vrnd(.8,2.6);g.fillRect(vrnd(TW),vrnd(TH),s,s*vrnd(.6,2.4))}
  for(let i=0;i<(PHONE?1500:4200);i++){g.fillStyle=vpick(['#e9c95f','#e77a5a','#f0ead2','#c986e0','#ffb44a']);g.globalAlpha=.75;const x=vrnd(TW),y=vrnd(TH);g.fillRect(x,y,2,2);g.fillRect(x+vrnd(-5,5),y+vrnd(-5,5),1.6,1.6)}
  g.globalAlpha=1;
  const ed=(x0,y0,x1,y1,rx,ry,rw,rh)=>{const G2=g.createLinearGradient(X(x0),Y(y0),X(x1),Y(y1));G2.addColorStop(0,`rgba(${TH_.edge},.96)`);G2.addColorStop(1,`rgba(${TH_.edge},0)`);g.fillStyle=G2;g.fillRect(X(rx),Y(ry),rw*sx,rh*sx)};
  ed(-120,0,40,0,-M,-M,M+40,H+2*M);ed(W+120,0,W-40,0,W-40,-M,M+40,H+2*M);ed(0,-120,0,40,-M,-M,W+2*M,M+40);ed(0,H+120,0,H-40,-M,H-40,W+2*M,M+40);
  // normal map
  const NW=Math.min(2048,TW/2),NH=Math.round(NW*TH/TW),nk=document.createElement('canvas');nk.width=NW;nk.height=NH;const ng=nk.getContext('2d');ng.drawImage(k,0,0,NW,NH);
  const d=ng.getImageData(0,0,NW,NH),a=d.data,h=new Float32Array(NW*NH);
  for(let i=0;i<NW*NH;i++)h[i]=(a[i*4]*.3+a[i*4+1]*.5+a[i*4+2]*.2)/255+Math.random()*.03;
  const str=5;
  for(let y=0;y<NH;y++)for(let x=0;x<NW;x++){const l=h[y*NW+((x+NW-1)%NW)],r=h[y*NW+((x+1)%NW)],u=h[((y+NH-1)%NH)*NW+x],b=h[((y+1)%NH)*NW+x];
    const dx=(l-r)*str,dy=(u-b)*str,il=1/Math.sqrt(dx*dx+dy*dy+1),i=(y*NW+x)*4;a[i]=(dx*il*.5+.5)*255;a[i+1]=(-dy*il*.5+.5)*255;a[i+2]=(il*.5+.5)*255;a[i+3]=255}
  ng.putImageData(d,0,0);
  const map=new T3.CanvasTexture(k);map.encoding=T3.sRGBEncoding;map.anisotropy=rn.capabilities.getMaxAnisotropy();
  const nor=new T3.CanvasTexture(nk);nor.anisotropy=4;
  const plane=new T3.Mesh(new T3.PlaneGeometry(W+2*M,H+2*M),new T3.MeshStandardMaterial({map,normalMap:nor,normalScale:new T3.Vector2(1.1,1.1),roughness:.94,metalness:0}));
  plane.rotation.x=-Math.PI/2;plane.position.set(W/2,0,H/2);plane.receiveShadow=true;scene.add(plane);
  const under=new T3.Mesh(new T3.PlaneGeometry(12000,12000),new T3.MeshBasicMaterial({color:lin('rgb('+TH_.edge+')')}));under.rotation.x=-Math.PI/2;under.position.set(W/2,-1,H/2);scene.add(under);
}
function buildPonds(){
  const wc=MAP().water,m=new T3.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:U.uTime,uDeep:{value:new T3.Vector3(...wc[0])},uSky:{value:new T3.Vector3(...wc[1])}},
    vertexShader:'varying vec2 vU;varying vec3 vW;void main(){vU=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:`varying vec2 vU;varying vec3 vW;uniform float uTime;uniform vec3 uDeep,uSky;
    float wave(vec2 p){return sin(p.x*.26+uTime*1.1)*.5+sin(p.y*.33-uTime*1.4)*.35+sin((p.x+p.y)*.51+uTime*.9)*.25+sin((p.x-p.y)*.83-uTime*1.7)*.12;}
    void main(){float d=length(vU-.5)*2.;float a=smoothstep(1.,.86,d);
      vec2 p=vW.xz;float e=.9;float n=wave(p),nx=wave(p+vec2(e,0.))-n,ny=wave(p+vec2(0.,e))-n;
      vec3 N=normalize(vec3(-nx*.9,1.,-ny*.9));vec3 V=normalize(cameraPosition-vW),S=normalize(vec3(-.58,.62,.53));
      float F=.05+.95*pow(1.-max(dot(N,V),0.),4.);float spec=pow(max(dot(reflect(-S,N),V),0.),70.);
      vec3 deep=uDeep,sky=uSky;
      vec3 c=mix(deep,sky,F*1.1+.1)+vec3(1.6,1.25,.85)*spec*2.;
      c+=vec3(.5,.8,.7)*smoothstep(.97,.8,d)*smoothstep(.72,.9,d)*.14*(.6+.4*sin(uTime+p.x*.1));
      gl_FragColor=vec4(c,a*.93);}`});
  PONDS.forEach(p=>{const q=new T3.Mesh(new T3.PlaneGeometry(1,1),m);q.rotation.x=-Math.PI/2;q.scale.set(p[2]*2,p[3]*2,1);q.position.set(p[0],.4,p[1]);scene.add(q)});
}

/* ---------- vegetation and architecture ---------- */
function buildWorld(){
  const leaf=mat('wind',{rough:.85,rim:'#ffdca8',rimI:.22,windY:'0.035'}),wood=mat('plain',{rough:.9,rimI:.15}),stone=mat('plain',{rough:.92,rimI:.18,rim:'#ffe4c0'}),lacquer=mat('plain',{rough:.45,metal:.05,rimI:.3,rim:'#ffc9a0'});
  const inst2=(geo,m,list,shadow=true)=>chunked(geo,m,list,shadow,true);const tq=Q().trees;
  // pines and bamboo forest outside the walls
  const TM=MAP(),pc=TM.pine;const pine=merge([part(CYL(2.6,4.5,40,8),'#3a2a22',{p:[0,20,0]}),part(CONE(22,30,9),pc[0],{p:[0,44,0],top:pc[1]}),part(CONE(17,26,9),pc[0],{p:[0,62,0],top:pc[1]}),part(CONE(11,22,9),pc[0],{p:[0,78,0],top:pc[1]})]);
  const pines=[];for(let i=0;i<Math.round(230*tq);i++){const s=i%4;let x,z;if(s===0){x=vrnd(-300,W+300);z=vrnd(-290,-16)}else if(s===1){x=vrnd(-300,W+300);z=vrnd(H+40,H+300)}else if(s===2){x=vrnd(-290,-16);z=vrnd(-60,H+80)}else{x=vrnd(W+16,W+290);z=vrnd(-60,H+80)}const k=vrnd(.7,1.4);pines.push([x,0,z,vrnd(TAU),k,k*vrnd(.9,1.3),vrnd(.7,1.1)])}
  inst2(pine,leaf,pines);
  const bc=TM.bamboo;const stalk=(ox,oz,h,lean)=>{const p=[part(CYL(.9,1.25,h,6),bc[0],{p:[ox,h/2,oz],r:[lean,0,lean*.6],top:bc[1]})];for(let y=12;y<h;y+=13)p.push(part(CYL(1.35,1.35,.9,6),bc[0],{p:[ox+lean*y*.5,y,oz+lean*y*.3]}));for(let i=0;i<5;i++)p.push(part(BOX(.5,.12,8),bc[0],{p:[ox+lean*h*.5+vrnd(-5,5),h-vrnd(2,24),oz+lean*h*.3+vrnd(-5,5)],r:[vrnd(-.4,.4),vrnd(TAU),vrnd(-.5,.5)],top:bc[1]}));return p};
  const bam=merge([...stalk(0,0,72,.05),...stalk(5,3,60,-.04),...stalk(-4,4,82,.03),...stalk(2,-5,56,.06)]);
  const bl=[];
  rocks.filter(r=>r.bamboo).forEach(r=>{const n=Math.round(r.w*r.h/260);for(let i=0;i<n;i++)bl.push([r.x+vrnd(-6,r.w+6),0,r.y+vrnd(-6,r.h+6),vrnd(TAU),vrnd(.7,1.2),vrnd(.8,1.3),vrnd(.8,1.15)])});
  for(let i=0;i<Math.round(420*tq);i++){const s=i%4;let x,z;if(s===0){x=vrnd(-200,W+200);z=vrnd(-200,-10)}else if(s===1){x=vrnd(-200,W+200);z=vrnd(H+10,H+200)}else if(s===2){x=vrnd(-200,-10);z=vrnd(0,H)}else{x=vrnd(W+10,W+200);z=vrnd(0,H)}bl.push([x,0,z,vrnd(TAU),vrnd(.8,1.3),vrnd(.9,1.4),vrnd(.8,1.1)])}
  inst2(bam,mat('wind',{rough:.8,rimI:.2,windY:'0.05'}),bl);
  // maples
  const mapleG=(c1,c2)=>merge([part(CYL(2.4,4.2,30,8),'#3a2620',{p:[0,15,0],top:'#5a3b2c'}),part(CYL(1.5,2.4,16,6),'#3a2620',{p:[7,28,1],r:[0,0,-.9]}),part(CYL(1.4,2.2,14,6),'#3a2620',{p:[-6,31,-1],r:[0,0,.8]}),
    part(lump(20,2,.32,1.15,.8,1.15),c1,{p:[0,44,0],top:c2}),part(lump(14,2,.32),c1,{p:[14,36,4],top:c2}),part(lump(13,2,.32),c1,{p:[-13,39,-5],top:c2}),part(lump(10,2,.3),c1,{p:[2,58,1],top:c2})]);
  const m0=maples.filter(m=>!m[3]).map(m=>[m[0],0,m[1],vrnd(TAU),m[2],m[2]*vrnd(.9,1.2),vrnd(.9,1.15)]),m1=maples.filter(m=>m[3]).map(m=>[m[0],0,m[1],vrnd(TAU),m[2],m[2]*vrnd(.9,1.2),vrnd(.9,1.15)]);
  if(m0.length)chunked(mapleG(TM.maple[0][0],TM.maple[0][1]),leaf,m0,true,true,true);if(m1.length)chunked(mapleG(TM.maple[1][0],TM.maple[1][1]),leaf,m1,true,true,true);
  // low hedge on the camera-facing edge
  const bush=merge([part(lump(11,1,.4,1.2,.8,1),'#1f5140',{p:[0,8,0],top:'#6aa853'}),part(lump(8,1,.4),'#1f5140',{p:[10,6,3],top:'#6aa853'})]);
  const bl2=[];for(let i=0;i<Math.round(160*tq);i++)bl2.push([vrnd(-60,W+60),0,H-4+vrnd(0,70),vrnd(TAU),vrnd(.8,1.5),vrnd(.8,1.5),vrnd(.8,1.1)]);inst2(bush,leaf,bl2);
  // boundary wall with crenellations
  const wparts=[];
  const seg=(x,z,rot)=>{wparts.push(part(rock(40,18,14,.05),'#5f646a',{p:[x,9,z],r:[0,rot,0],moss:.6,top:'#5c8246',jit:.04}));for(const o of [-14,0,14])wparts.push(part(BOX(8,6,14),'#6a6f75',{p:[x+Math.cos(rot)*o,21,z-Math.sin(rot)*o],r:[0,rot,0],top:'#7d8188'}))};
  for(let x=20;x<W-20;x+=40){seg(x+20,8,0);seg(x+20,H-8,0)}for(let z=20;z<H-20;z+=40){seg(8,z+20,Math.PI/2);seg(W-8,z+20,Math.PI/2)}
  const wall=new T3.Mesh(merge(wparts),stone);wall.castShadow=true;wall.receiveShadow=true;scene.add(wall);
  // pavilions
  const pparts=[];
  PAVS.forEach(p=>{const [cx,cz]=p;
    pparts.push(part(BOX(104,5,104),'#6a6d72',{p:[cx,2.5,cz],top:'#8a8d92'}));
    for(const sx of [-34,34])for(const sz of [-34,34])pparts.push(part(CYL(4.5,5,46,10),'#8e1f1f',{p:[cx+sx,27,cz+sz],top:'#b8322b'}),part(CYL(5.5,5.5,2,10),'#d9a641',{p:[cx+sx,49,cz+sz],emit:'#6a4a10',ei:.5}));
    pparts.push(part(BOX(80,4,4),'#8e1f1f',{p:[cx,50,cz-34]}),part(BOX(80,4,4),'#8e1f1f',{p:[cx,50,cz+34]}),part(BOX(4,4,80),'#8e1f1f',{p:[cx-34,50,cz]}),part(BOX(4,4,80),'#8e1f1f',{p:[cx+34,50,cz]}));
    // the roof is its own mesh so it can fade out while the hero stands under it
    const roof=new T3.Mesh(merge([part(CONE(84,24,4),'#1f2a2a',{p:[cx,62,cz],r:[0,Math.PI/4,0],top:'#3a4a48'}),part(CONE(44,16,4),'#1f2a2a',{p:[cx,82,cz],r:[0,Math.PI/4,0],top:'#3a4a48'}),part(SPH(3.5,10,8),'#d9a641',{p:[cx,92,cz],emit:'#ffd27a',ei:2})]),mat('plain',{rough:.75,rimI:.25,m:{transparent:true}}));roof.castShadow=true;roof.userData={cx,cz,k:1};scene.add(roof);roofs.push(roof);
    for(let i=0;i<4;i++){const a=i/4*TAU+Math.PI/4;pparts.push(part(BOX(3,3,34),'#d9a641',{p:[cx+Math.cos(a)*62,54,cz+Math.sin(a)*62],r:[.35,-a+Math.PI/2,0],emit:'#6a4a10',ei:.4}))}
  });
  rocks.filter(r=>r.arch).forEach(r=>{pparts.push(part(CYL(3,3.4,36,8),'#8e1f1f',{p:[r.x+4,18,r.y+4],top:'#b8322b'}))});
  const seen=new Set();rocks.filter(r=>r.arch).forEach(r=>{const key=r.ax+','+r.ay;if(seen.has(key))return;seen.add(key);const ns=r.arch==='ns';
    pparts.push(part(BOX(ns?64:5,5,ns?5:64),'#8e1f1f',{p:[r.ax,34,r.ay]}),part(BOX(ns?76:10,3,ns?10:76),'#1f2a2a',{p:[r.ax,40,r.ay],top:'#3a4a48'}),part(BOX(ns?14:1.2,7,ns?1.2:14),'#d9a641',{p:[r.ax,30,r.ay],emit:'#ffd27a',ei:.8}))});
  const pav=new T3.Mesh(merge(pparts),lacquer);pav.castShadow=true;pav.receiveShadow=true;scene.add(pav);
  // shrines (stone lanterns)
  SHRINES.forEach(s=>{const g=merge([part(BOX(16,4,16),'#5f6268',{p:[0,2,0],moss:.6,top:'#5c8246'}),part(CYL(2.6,3.2,16,8),'#6f7278',{p:[0,12,0]}),part(BOX(10,9,10),'#55585e',{p:[0,25,0]}),
      ...[[0,0,4.9,0],[0,0,-4.9,0],[4.9,0,0,1.57],[-4.9,0,0,1.57]].map(([x,_,z,ry])=>part(BOX(5.5,4.5,.6),'#1a0a05',{p:[x,25,z],r:[0,ry,0],emit:'#ffb347',ei:3})),
      part(CONE(10,6.5,4),'#2f3a3a',{p:[0,33,0],r:[0,Math.PI/4,0],top:'#4a5a58'}),part(SPH(1.8,10,8),'#d9a641',{p:[0,38,0],emit:'#ffd27a',ei:3})]);
    const m=new T3.Mesh(g,stone);m.position.set(s[0],0,s[1]);m.castShadow=true;scene.add(m);shrineM.push(m)});
  // lantern posts
  const lant=merge([part(CYL(.8,1.1,30,6),'#3b2a1e',{p:[0,15,0]}),part(BOX(9,1,1),'#3b2a1e',{p:[3.5,29,0]}),part(CYL(2,2,.8,8),'#2a1a14',{p:[7,28.4,0]}),part(SPH(3.6,10,8),'#c8202a',{p:[7,24.5,0],s:[1,1.25,1],emit:'#ff5a2a',ei:1.4}),part(CYL(2,2,.8,8),'#2a1a14',{p:[7,20.4,0]}),part(BOX(.4,4,.4),'#d9a641',{p:[7,17.8,0]})]);
  inst2(lant,lacquer,lanterns.map(l=>[l[0],0,l[1],l[2]]));
  // pebbles and glowing fungi
  const clearSpot=()=>{for(let i=0;i<200;i++){const x=vrnd(40,W-40),z=vrnd(40,H-40);if(hyp(x-W/2,z-H/2)>PLAZA_R+14&&!onPond(x,z,1.2)&&!blocked(x,z))return [x,z]}return [40,40]};
  const peb=[];for(let i=0;i<220;i++){const sp=clearSpot();peb.push([sp[0],.6,sp[1],vrnd(TAU),vrnd(.5,2.2)])}inst2(merge([part(lump(3,1,.5,1,.6,1),'#7c7f7f',{top:'#a3a58f'})]),stone,peb);
  const fun=merge([part(CYL(.9,1.4,6,6),'#d9e6e0',{p:[0,3,0]}),part(SPH(3.6,10,6),'#2ba6c9',{p:[0,6.4,0],s:[1,.55,1],emit:'#32d4ff',ei:1.5}),part(CYL(.6,1,4,6),'#d9e6e0',{p:[4,2,2]}),part(SPH(2.2,10,6),'#2ba6c9',{p:[4,4.2,2],s:[1,.55,1],emit:'#32d4ff',ei:1.5})]);
  const fl=[];for(let i=0;i<110;i++){const sp=clearSpot(),k=vrnd(.8,1.7);fl.push([sp[0],0,sp[1],vrnd(TAU),k]);blueMush.push([sp[0],6*k,sp[1],k,vrnd(TAU)])}inst2(fun,stone,fl);
  for(let i=0;i<Q().flies;i++)flies.push({x:vrnd(30,W-30),z:vrnd(30,H-30),h:vrnd(4,46),p:vrnd(TAU),s:vrnd(.4,1.2),warm:Math.random()<.5,leaf:Math.random()<.3});
  // sun shafts
  const rt=(()=>{const k=document.createElement('canvas');k.width=64;k.height=256;const g=k.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.25,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,256);g.globalCompositeOperation='destination-in';const gx=g.createLinearGradient(0,0,64,0);gx.addColorStop(0,'rgba(0,0,0,0)');gx.addColorStop(.5,'#000');gx.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gx;g.fillRect(0,0,64,256);return new T3.CanvasTexture(k)})();
  for(let i=0;i<(QLEVEL==='low'?3:7);i++){const m=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({map:rt,color:lin('#ffdfae'),transparent:true,opacity:.05,blending:T3.AdditiveBlending,depthWrite:false,side:T3.DoubleSide,fog:false}));m.userData={ox:vrnd(-260,260),oz:vrnd(-180,180),w:vrnd(40,110),p:vrnd(TAU)};scene.add(m);rays.push(m)}
}
let grassChunks=[];
function buildGrass(){
  grassChunks.forEach(m=>{scene.remove(m);m.geometry.dispose()});grassChunks=[];
  const P=[],N=[],C=[],Eg=[],Lg=[];const root=lin(MAP().grassRoot),tips=MAP().grassTips.map(lin);
  for(let b=0;b<7;b++){const a=vrnd(TAU),ox=vrnd(-3.2,3.2),oz=vrnd(-3.2,3.2),h=vrnd(5,11),w=vrnd(.7,1.15),lean=vrnd(1,3.5),cx=Math.cos(a),cz=Math.sin(a),tip=vpick(tips);
    const v=[[ox-cx*w,0,oz-cz*w],[ox+cx*w,0,oz+cz*w],[ox+cz*lean*.5-cx*w*.5,h*.6,oz-cx*lean*.5-cz*w*.5],[ox+cz*lean*.5+cx*w*.5,h*.6,oz-cx*lean*.5+cz*w*.5],[ox+cz*lean,h,oz-cx*lean]];
    [[0,1,2],[1,3,2],[2,3,4]].forEach(tri=>tri.forEach(i=>{P.push(...v[i]);N.push(0,1,0);const k=v[i][1]/h;C.push(root.r+(tip.r-root.r)*k,root.g+(tip.g-root.g)*k,root.b+(tip.b-root.b)*k);Eg.push(0,0,0);Lg.push(0,0)}))}
  const g=new T3.BufferGeometry();g.setAttribute('position',new T3.Float32BufferAttribute(P,3));g.setAttribute('normal',new T3.Float32BufferAttribute(N,3));g.setAttribute('color',new T3.Float32BufferAttribute(C,3));g.setAttribute('aEmit',new T3.Float32BufferAttribute(Eg,3));g.setAttribute('aLimb',new T3.Float32BufferAttribute(Lg,2));
  const cnt=Q().grass,list=[];
  for(let i=0;i<cnt*3&&list.length<cnt;i++){const x=vrnd(22,W-22),z=vrnd(22,H-22);if(hyp(x-W/2,z-H/2)<PLAZA_R+6||onPond(x,z)||blocked(x,z)||onTrail(x,z,-4)||PAVS.some(p=>Math.abs(x-p[0])<54&&Math.abs(z-p[1])<54))continue;const k=vrnd(.6,1.2);list.push([x,0,z,vrnd(TAU),k,k*vrnd(.75,1.25),1])}
  grassChunks=chunked(g,mat('wind',{lambert:true,windY:'0.16',m:{side:T3.DoubleSide}}),list,false,true);
}
function buildRuins(){
  if(!rn)return;
  if(ruins){scene.remove(ruins);ruins.geometry.dispose()}
  const parts=[];
  for(const r of rocks){
    if(r.mono){const cx=r.x+r.w/2,cz=r.y+r.h/2;parts.push(part(rock(16,52,14,.1),'#6a6e78',{p:[cx,24,cz],moss:.72,top:'#5c8246',jit:.03}),part(BOX(5,20,1),'#111',{p:[cx,28,cz+7.6],emit:'#52c8ff',ei:3.2}),part(rock(22,8,20,.12),'#5e6168',{p:[cx,3,cz]}));continue}
    if(!r.ruin)continue;
    const nx=Math.max(1,Math.round(r.w/17)),nz=Math.max(1,Math.round(r.h/17)),cw=r.w/nx,cd=r.h/nz;
    for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
      const edge=i===0||j===0||i===nx-1||j===nz-1,hh=edge?vrnd(12,26):vrnd(18,34),x=r.x+(i+.5)*cw,z=r.y+(j+.5)*cd,c=vpick(['#7d8188','#8a8a88','#6f7480','#93908a']);
      parts.push(part(rock(cw+.8,hh,cd+.8,.09),c,{p:[x,hh/2,z],moss:.6,top:'#5c8246',jit:.05}));
      if(Math.random()<.45){const h2=vrnd(8,16);parts.push(part(rock(cw*.9,h2,cd*.85,.14),c,{p:[x+vrnd(-1,1),hh+h2/2-1,z+vrnd(-1,1)],moss:.55,top:'#6c9a55',jit:.05}))}
    }
    if(r.w>44&&r.h>38){const cx=r.x+r.w*vrnd(.25,.75),cz=r.y+r.h*vrnd(.25,.75),h=vrnd(24,42);parts.push(part(CYL(5,6,h,12),'#a09d94',{p:[cx,34+h/2,cz],top:'#c0bcae',jit:.02}),part(CYL(7.5,7.5,3,12),'#8b8981',{p:[cx,35,cz]}))}
  }
  ruins=new T3.Mesh(merge(parts),mat('plain',{rough:.92,rimI:.18,rim:'#ffe4c0'}));ruins.castShadow=true;ruins.receiveShadow=true;scene.add(ruins);
  buildGrass();
}

/* ---------- characters ---------- */
function swordGeo(c1,c2,emit){return merge([part(BOX(1.3,.28,15),c1,{p:[0,0,2.5],top:c2,emit,ei:.9}),part(BOX(.5,.42,13),'#ffffff',{p:[0,0,2.5],emit,ei:2.2}),part(BOX(3.6,.8,.9),'#d9a641',{p:[0,0,-5.3],emit:'#6a4a10',ei:.5}),part(CYL(.5,.5,3.8,6),'#2a1a14',{p:[0,0,-7.6],r:[1.5708,0,0]}),part(SPH(.9,8,6),'#d9a641',{p:[0,0,-9.7]})])}
function buildCreatures(){
  const E=(g,cap,k,mt)=>{g.setAttribute('aPhase',new T3.InstancedBufferAttribute(new Float32Array(cap),1).setUsage(T3.DynamicDrawUsage));
    const im=new T3.InstancedMesh(g,mt,cap);for(let i=0;i<cap;i++)im.setColorAt(i,new T3.Color(1,1,1));im.count=0;im.castShadow=true;im.receiveShadow=!PHONE;im.frustumCulled=false;scene.add(im);inst[k]=im};
  const mA=mat('anim',{rough:.5,metal:.06,rimI:.3,rim:'#ffc27a'});
  const eyes=(x,y,z,col,r=.75,ei=8)=>[part(SPH(r,8,6),'#fff',{p:[x,y,z],emit:col,ei}),part(SPH(r,8,6),'#fff',{p:[-x,y,z],emit:col,ei})];
  // assassin
  E(merge([part(CYL(2.2,4.2,8,10),'#17151e',{p:[0,4,0],top:'#2b2836'}),part(CYL(2.6,2.6,.9,10),'#9b1c2a',{p:[0,6.6,0]}),part(SPH(2.7,10,8),'#17151e',{p:[0,10,0]}),part(SPH(2.3,10,8),'#3a2a36',{p:[0,9.5,1.2],s:[1,.7,.9]}),...eyes(1,10.4,2.4,'#ff2d2d',.55),
    part(CYL(.7,.6,5.5,6),'#17151e',{p:[3,7.5,.8],r:[1.1,0,-.3],limb:1,hip:9}),part(BOX(.55,.5,5.5),'#d8dde6',{p:[3.3,6.4,3.4],r:[.5,0,0],emit:'#9fd0ff',ei:.6,limb:1,hip:9}),
    part(CYL(.7,.6,5.5,6),'#17151e',{p:[-3,7.5,.8],r:[1.1,0,.3],limb:-1,hip:9}),part(BOX(.55,.5,5.5),'#d8dde6',{p:[-3.3,6.4,3.4],r:[.5,0,0],emit:'#9fd0ff',ei:.6,limb:-1,hip:9}),
    part(CYL(.9,.8,5,6),'#1d1a26',{p:[1.5,2.5,0],limb:1,hip:5}),part(CYL(.9,.8,5,6),'#1d1a26',{p:[-1.5,2.5,0],limb:-1,hip:5})]),560,'assassin',mA);
  // bandit
  E(merge([part(CYL(3.6,4.2,8,10),'#c38a60',{p:[0,12,0],top:'#d9a476'}),part(CYL(4.3,4.6,7,10),'#4a3326',{p:[0,12.2,-.6],s:[1,1,.75]}),part(CYL(4.3,4.5,1.6,10),'#2a1a14',{p:[0,8.2,0]}),part(BOX(1.6,1.2,.6),'#d9a641',{p:[0,8.2,4.4],emit:'#6a4a10',ei:.6}),part(CYL(4.2,3.6,5,10),'#2f2b33',{p:[0,5.5,0]}),
    part(SPH(3.2,10,8),'#c38a60',{p:[0,19.5,0]}),part(SPH(3.35,12,8),'#b8322b',{p:[0,20.3,-.3],s:[1,.6,1]}),part(BOX(1,4.5,.4),'#b8322b',{p:[-2.2,18,-3],r:[.3,0,.4]}),...eyes(1.2,19.5,2.9,'#ffd14a',.6,5),part(BOX(.35,2.4,.2),'#7a3a3a',{p:[1.8,18.3,3.05]}),
    part(CYL(1.3,1.1,8,7),'#c38a60',{p:[5.2,14.5,1.5],r:[1.0,0,-.3],limb:1,hip:18}),part(BOX(1.5,.35,13),'#cfd6de',{p:[6,16.5,8],r:[.25,0,0],emit:'#9fc8ff',ei:.35,limb:1,hip:18}),part(CYL(.5,.5,4,6),'#3a2a1a',{p:[6,15.8,1.8],r:[1.57,0,0],limb:1,hip:18}),
    part(CYL(1.3,1.1,8,7),'#c38a60',{p:[-5.2,13.5,1],r:[.9,0,.3],limb:-1,hip:18}),
    part(CYL(1.7,1.5,6,7),'#2f2b33',{p:[2,3,0],limb:1,hip:6}),part(CYL(1.7,1.5,6,7),'#2f2b33',{p:[-2,3,0],limb:-1,hip:6}),part(BOX(3.2,1.6,4.6),'#1d1510',{p:[2,.8,.8],limb:1,hip:6}),part(BOX(3.2,1.6,4.6),'#1d1510',{p:[-2,.8,.8],limb:-1,hip:6})]),560,'bandit',mA);
  // archer
  const bow=new T3.TorusGeometry(6,.35,6,16,Math.PI);
  E(merge([part(CYL(2.8,4.6,12,10),'#4d5a3a',{p:[0,9,0],top:'#6e7d4e'}),part(CYL(3,3,1,10),'#2a1a14',{p:[0,8.5,0]}),part(SPH(3,10,8),'#d8a878',{p:[0,17,0]}),...eyes(1.1,17.2,2.7,'#9ff06a',.55,6),part(CONE(7.5,3.4,12),'#c8a86c',{p:[0,20.4,0],top:'#e3c98e'}),part(CYL(7.6,7.6,.4,12),'#8a6a3a',{p:[0,18.9,0]}),
    part(bow,'#5a3a22',{p:[-4.5,11,3],r:[0,1.5708,1.5708],limb:-1,hip:18}),part(BOX(.18,12,.18),'#e8e4d8',{p:[-4.5,11,3],limb:-1,hip:18}),part(CYL(1,.9,7,7),'#4d5a3a',{p:[-4,13,1],r:[1.1,0,.2],limb:-1,hip:18}),
    part(CYL(1,.9,7,7),'#4d5a3a',{p:[3.8,13,1.5],r:[1.2,0,-.3],limb:1,hip:18}),part(CYL(1.3,1.3,8,6),'#3a2a1a',{p:[2.6,13,-3.6],r:[.3,0,-.3]}),part(SPH(1.6,8,6),'#e8c45a',{p:[3.6,17.2,-4.4],emit:'#ffd27a',ei:.5}),
    part(CYL(1.3,1.1,5,6),'#2f2b33',{p:[1.6,2.5,0],limb:1,hip:5}),part(CYL(1.3,1.1,5,6),'#2f2b33',{p:[-1.6,2.5,0],limb:-1,hip:5})]),240,'archer',mA);
  // giant
  E(merge([part(lump(12.5,2,.1,1.15,1,.95),'#5a5f6a',{p:[0,27,0],top:'#7b808c'}),part(BOX(14,10,2),'#d9a641',{p:[0,29,10],emit:'#6a4a10',ei:.4}),part(SPH(6.5,12,8),'#4a4f5a',{p:[13,35,0],s:[1,.65,1],top:'#6a707c'}),part(SPH(6.5,12,8),'#4a4f5a',{p:[-13,35,0],s:[1,.65,1],top:'#6a707c'}),
    part(SPH(6,12,9),'#b07a5a',{p:[0,41,3]}),part(SPH(6.8,14,10),'#4a4f5a',{p:[0,42.8,2],s:[1,.8,1],top:'#6a707c'}),part(CONE(1.8,10,8),'#b8322b',{p:[0,51,0],r:[.35,0,0]}),...eyes(2.4,41.5,8.6,'#ffa22d',1,8),part(BOX(5,1,1),'#2a2730',{p:[0,39,8.4]}),
    part(CYL(1.1,1.1,28,8),'#3a2a1a',{p:[16,24,6],r:[.4,0,.2],limb:-1,hip:34}),part(SPH(6,10,8),'#55595f',{p:[19,38,12],top:'#7a7e86',limb:-1,hip:34}),...[0,1,2,3,4].map(i=>part(CONE(1.2,4,5),'#d8d0c0',{p:[19+Math.cos(i*1.26)*6,38+Math.sin(i*1.26)*6,12],r:[0,0,-i*1.26-1.57],limb:-1,hip:34})),
    part(CYL(4.4,3.4,20,9),'#b07a5a',{p:[-13,24,2],r:[.2,0,-.18],limb:1,hip:34}),part(lump(5.4,1,.2),'#8a5a40',{p:[-15,12.5,4.5],limb:1,hip:34}),
    part(CYL(5,4.2,16,9),'#3c3a44',{p:[5.4,8,0],limb:1,hip:16}),part(CYL(5,4.2,16,9),'#3c3a44',{p:[-5.4,8,0],limb:-1,hip:16}),part(BOX(8,2.6,11),'#2a2730',{p:[5.4,1.3,1.5],limb:1,hip:16}),part(BOX(8,2.6,11),'#2a2730',{p:[-5.4,1.3,1.5],limb:-1,hip:16})]),90,'giant',mA);
  // steles
  const stoneM=mat('plain',{rough:.5,metal:.2,rimI:.3,rim:'#ff9cf0'});
  const st=merge([part(rock(22,6,22,.1),'#4c4a5c',{p:[0,3,0]}),part(CYL(4,8,34,6),'#5e5a70',{p:[0,22,0],top:'#8a85a0',jit:.03}),part(BOX(2.5,20,1),'#222',{p:[0,22,6.1],emit:'#ff3df0',ei:4}),part(BOX(2.5,20,1),'#222',{p:[0,22,-6.1],emit:'#ff3df0',ei:4})]);
  const cry=new T3.OctahedronGeometry(5.5,0);
  for(let i=0;i<3;i++){const g=new T3.Group(),b=new T3.Mesh(st,stoneM);b.castShadow=true;const c=new T3.Mesh(cry,new T3.MeshStandardMaterial({color:lin('#ff4bea'),emissive:lin('#ff2ae6'),emissiveIntensity:3,roughness:.2}));c.position.y=48;c.scale.y=1.5;g.add(b,c);g.userData.c=c;g.visible=false;scene.add(g);statues.push(g)}
  // lingzhi
  const ms=merge([part(CYL(2.6,3.4,6,8),'#5a3a22',{p:[0,3,0],top:'#7a5232'}),part(SPH(6,12,8),'#7a2a12',{p:[0,7,0],s:[1,.45,1],top:'#d2762a',emit:'#ff6a2a',ei:.45}),part(SPH(3.6,10,7),'#8a3418',{p:[3,9,1.5],s:[1,.45,1],top:'#e0883a',emit:'#ff6a2a',ei:.45})]);
  for(let i=0;i<5;i++){const m=new T3.Mesh(ms,mat('plain',{rough:.35,rimI:.4}));m.castShadow=true;m.visible=false;scene.add(m);mushes.push(m)}
  // the Blood Demon Patriarch
  bossG=new T3.Group();bossG.visible=false;scene.add(bossG);
  const bm=mat('plain',{rough:.45,metal:.1,rimI:.3,rim:'#ff9a8a'});
  const body=merge([part(CYL(7,19,42,18),'#4b0a14',{p:[0,24,0],top:'#a81a2a',emit:'#3a0008',ei:.3}),part(SPH(7,12,8),'#2a0810',{p:[10,46,0],s:[1,.6,1],top:'#7a1020'}),part(SPH(7,12,8),'#2a0810',{p:[-10,46,0],s:[1,.6,1],top:'#7a1020'}),
    part(CONE(1.6,9,6),'#d8d0c0',{p:[13.5,52,0],r:[0,0,-.6]}),part(CONE(1.6,9,6),'#d8d0c0',{p:[-13.5,52,0],r:[0,0,.6]}),part(BOX(10,14,1.2),'#d9a641',{p:[0,40,8.6],emit:'#6a4a10',ei:.5}),
    part(SPH(5.8,14,10),'#f2ede4',{p:[0,56,2]}),...eyes(2.2,57,7.2,'#ff2a14',.9,8),part(BOX(.6,4,.3),'#b8101a',{p:[2.2,53.4,7.7],emit:'#ff2a14',ei:2}),part(BOX(.6,4,.3),'#b8101a',{p:[-2.2,53.4,7.7],emit:'#ff2a14',ei:2}),part(BOX(3,.5,.3),'#5a0a10',{p:[0,53.6,7.7]}),
    part(SPH(6.6,14,10),'#0d0a0f',{p:[0,57.5,-1.2],s:[1,1,.95]}),part(BOX(9,28,2),'#0d0a0f',{p:[0,42,-7.5],r:[.1,0,0]}),part(CONE(4,6,5),'#d9a641',{p:[0,64.5,0],emit:'#ffd27a',ei:.8}),
    part(CYL(3.5,7,18,10),'#4b0a14',{p:[14,38,4],r:[.4,0,-.9],top:'#a81a2a'}),part(CYL(3.5,7,18,10),'#4b0a14',{p:[-14,38,4],r:[.4,0,.9],top:'#a81a2a'}),part(SPH(2.2,8,6),'#e9d9c8',{p:[21,30,9]}),part(SPH(2.2,8,6),'#e9d9c8',{p:[-21,30,9]})]);
  const bb=new T3.Mesh(body,bm);bb.castShadow=true;bossG.add(bb);bossG.userData.body=bb;
  const bladeG=swordGeo('#3a0a10','#cfd3d8','#ff2040');
  for(let i=0;i<9;i++){const a=i/9*TAU,g=new T3.Group();const m=new T3.Mesh(bladeG,bm);m.scale.set(1.6,1.6,1.6);m.castShadow=true;g.add(m);bossG.add(g);blades.push({g,a,p:vrnd(TAU)})}
  const basic=()=>new T3.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  gemMesh=new T3.InstancedMesh(new T3.OctahedronGeometry(2.6,0),basic(),380);for(let i=0;i<380;i++)gemMesh.setColorAt(i,new T3.Color(1,1,1));gemMesh.count=0;gemMesh.frustumCulled=false;scene.add(gemMesh);
  bulletMesh=new T3.InstancedMesh(merge([part(BOX(.9,.35,8),'#3a0a10',{top:'#ff8a9a',emit:'#ff2040',ei:2.5}),part(CONE(.9,2.4,5),'#ffd0d8',{p:[0,0,5],r:[1.5708,0,0],emit:'#ff6070',ei:3})]),mat('plain',{rimI:0,m:{toneMapped:false}}),290);for(let i=0;i<290;i++)bulletMesh.setColorAt(i,new T3.Color(1,1,1));bulletMesh.count=0;bulletMesh.frustumCulled=false;scene.add(bulletMesh);
  swordMesh=new T3.InstancedMesh(swordGeo('#9fb4c4','#eef4ff','#9fe3f0'),mat('plain',{rough:.3,metal:.6,rimI:.6,rim:'#ffffff'}),280);for(let i=0;i<280;i++)swordMesh.setColorAt(i,new T3.Color(1,1,1));swordMesh.count=0;swordMesh.frustumCulled=false;swordMesh.castShadow=true;scene.add(swordMesh);
  talisMesh=new T3.InstancedMesh(merge([part(BOX(4.2,.3,6),'#e8c45a',{top:'#fff0b0',emit:'#ffd75a',ei:.9}),part(BOX(1,.5,4),'#b8322b',{p:[0,0,.2],emit:'#ff4030',ei:1.5})]),mat('plain',{rimI:0}),40);for(let i=0;i<40;i++)talisMesh.setColorAt(i,new T3.Color(1,1,1));talisMesh.count=0;talisMesh.frustumCulled=false;scene.add(talisMesh);
}
const HEROES={player:null,rival:null};
function buildHero(cls='swordsman',slot='player',weapon){
  weapon=weapon||CLASSES[cls].main;const old=HEROES[slot];
  if(old&&old.cls===cls&&old.weapon===weapon)return old;
  if(old){scene.remove(old.g);scene.remove(old.sigil);if(slot==='player'){ghostM.forEach(g=>scene.remove(g));ghostM.length=0}}
  const h=buildHeroModel(cls,slot,weapon);HEROES[slot]=h;
  if(slot==='player'){playerG=h.g;hatA=h.hat;armG=h.arm;crystal=h.crystal;capeM=h.cape;feetSigil=h.sigil}
  return h;
}
function buildHeroModel(cls,slot,weaponId){
  weaponId=weaponId||CLASSES[cls].main;
  const m=mat('plain',{rough:.7,metal:.02,rimI:.28,rim:'#bff4e6'});
  const V={swordsman:{robe:'#ece7d8',robeT:'#f8f5ee',skirt:'#e2dccb',collar:'#2c4f6b',sash:'#b8322b',sleeve:'#ece7d8',cape:'#24405a',capeT:'#3f6a86',hair:'#1a1420',gem:[3,9,11]},
           taoist:{robe:'#3a4e66',robeT:'#5b7a9a',skirt:'#2e3f55',collar:'#d9a641',sash:'#d9a641',sleeve:'#3a4e66',cape:'#2a3a52',capeT:'#4a6a8a',hair:'#24202a',gem:[11,7,2]},
           blademaster:{robe:'#5a2622',robeT:'#8a3a2c',skirt:'#3a1a16',collar:'#2a1a14',sash:'#1a1a1a',sleeve:'#6a2a24',cape:'#3a1a16',capeT:'#6a2a22',hair:'#15121a',gem:[11,4,1.5]},
           qin:{robe:'#2f6f78',robeT:'#5fb0b8',skirt:'#f1ece0',collar:'#f6f1e6',sash:'#e9a0b4',sleeve:'#8fd3d8',cape:'#f3c6d2',capeT:'#fde8ee',hair:'#1a1420',gem:[3,10,12]},
           monk:{robe:'#c9772f',robeT:'#e8a64a',skirt:'#a85f24',collar:'#f0e6c8',sash:'#8a2a22',sleeve:'#c9772f',cape:'#8a3a1a',capeT:'#c46a2a',hair:'#f3d2b0',gem:[11,8,2]},
           physician:{robe:'#eef2e4',robeT:'#ffffff',skirt:'#9fc98a',collar:'#3a6a3a',sash:'#5a8a4a',sleeve:'#eef2e4',cape:'#3a5a3a',capeT:'#6a9a5a',hair:'#2a2420',gem:[4,12,3]},
           oni:{robe:'#f2ede4',robeT:'#ffffff',skirt:'#a8202e',collar:'#a8202e',sash:'#1a1418',sleeve:'#f2ede4',cape:'#2a2440',capeT:'#5a3a6a',hair:'#14111a',gem:[12,3,5]},
           idol:{robe:'#5b3fd6',robeT:'#8b6bff',skirt:'#f4f0ff',collar:'#ffd75a',sash:'#ff5fae',sleeve:'#7a5af0',cape:'#ff8fd8',capeT:'#ffd0ef',hair:'#ff9fd6',gem:[12,4,10]},
           wizard:{robe:'#2b2f7a',robeT:'#4a52b8',skirt:'#232766',collar:'#d9a641',sash:'#d9a641',sleeve:'#2b2f7a',cape:'#3a1f5e',capeT:'#6a3fa0',hair:'#d8d8e8',gem:[7,4,12]}}[cls]||{robe:'#ece7d8',robeT:'#f8f5ee',skirt:'#e2dccb',collar:'#2c4f6b',sash:'#b8322b',sleeve:'#ece7d8',cape:'#24405a',capeT:'#3f6a86',hair:'#1a1420',gem:[3,9,11]};
  const female=cls==='qin'||cls==='idol',skin='#f3d2b0',SK=female?.86:1; // the qin master is slimmer and taller in the skirt
  const grp=new T3.Group();grp.userData.cls=cls;scene.add(grp);
  const body=[
    // boots and legs (mostly under the robe)
    part(BOX(3,2.2,4.2),'#2a1a14',{p:[-2.6,1.1,.6]}),part(BOX(3,2.2,4.2),'#2a1a14',{p:[2.6,1.1,.6]}),
    part(CYL(1.3,1.5,7,8),V.skirt,{p:[-2.6,5,0]}),part(CYL(1.3,1.5,7,8),V.skirt,{p:[2.6,5,0]}),
    // skirt (lower robe), flared
    part(CYL(5.6*SK,female?10.6:10,female?15:13,20),V.skirt,{p:[0,female?8.5:9.5,0],top:V.robe}),
    // torso and layered robe
    part(CYL(4.6*SK,6.2*SK,10,18),V.robe,{p:[0,19,0],top:V.robeT}),
    part(SPH(2.6*SK,10,8),V.robe,{p:[-5.4*SK,22.6,0]}),part(SPH(2.6*SK,10,8),V.robe,{p:[5.4*SK,22.6,0]}),
    // sash with a knot and hanging ends
    part(CYL(6.3*SK,6.5*SK,2.4,18),V.sash,{p:[0,14.6,0],emit:cls==='taoist'?'#6a4a10':female?'#5a2030':'#5a0d0a',ei:.25}),part(BOX(2.6,1.8,1.4),V.sash,{p:[0,14.6,6.2*SK]}),
    part(BOX(1.4,7,.5),V.sash,{p:[1.3,10.6,6.1*SK],r:[-.18,0,0]}),part(BOX(1.4,6,.5),V.sash,{p:[-1.3,11,6*SK],r:[-.18,0,0]}),
    // crossed collar
    part(BOX(1.4,7.2,.7),V.collar,{p:[1.9*SK,22.2,5*SK],r:[0,0,.52]}),part(BOX(1.4,7.2,.7),V.collar,{p:[-1.9*SK,22.2,5.05*SK],r:[0,0,-.52]}),
    // left sleeve and hand
    part(CYL(2.1,female?3.2:4.2,female?12:10,10),V.sleeve,{p:[-7.6*SK,16.5,1],r:[.35,0,.28],top:V.sleeve}),part(SPH(1.5,10,7),skin,{p:[-9.2*SK,11,3.6]}),
    // neck and head
    part(CYL(1.5,1.8,2.4,8),skin,{p:[0,25,0]}),
    part(SPH(4.6,18,14),skin,{p:[0,29.4,0],s:[1,1.06,.96]}),
    // hair cap and bangs
    ...(cls==='monk'?[]:[part(SPH(4.95,16,12),V.hair,{p:[0,30.3,-.7],s:[1,.92,.98]}),part(BOX(6.4,1.8,1.2),V.hair,{p:[0,32.4,3.6],r:[.25,0,0]})]),
    // eyes, highlights, brows, mouth
    part(SPH(female?.82:.72,8,6),'#15141a',{p:[1.75,29.5,4.15],s:[1,female?1.25:1.1,.6]}),part(SPH(female?.82:.72,8,6),'#15141a',{p:[-1.75,29.5,4.15],s:[1,female?1.25:1.1,.6]}),
    part(SPH(.26,6,4),'#ffffff',{p:[2.05,29.85,4.55],emit:'#ffffff',ei:.8}),part(SPH(.26,6,4),'#ffffff',{p:[-1.45,29.85,4.55],emit:'#ffffff',ei:.8}),
    part(BOX(2,cls==='blademaster'?.55:.38,.4),V.hair,{p:[1.75,31,4.3],r:[0,0,cls==='blademaster'?-.3:-.18]}),part(BOX(2,cls==='blademaster'?.55:.38,.4),V.hair,{p:[-1.75,31,4.3],r:[0,0,cls==='blademaster'?.3:.18]}),
    part(BOX(female?1.1:1.3,.4,.3),female?'#d8657a':'#b06a5a',{p:[0,27.6,4.45]}),
    ...(female?[part(BOX(2.2,.3,.3),V.hair,{p:[1.9,30.5,4.5],r:[0,0,-.1]}),part(BOX(2.2,.3,.3),V.hair,{p:[-1.9,30.5,4.5],r:[0,0,.1]}),part(SPH(.9,8,6),'#f0a0a8',{p:[2.9,28.4,3.4],s:[1,.6,.4]}),part(SPH(.9,8,6),'#f0a0a8',{p:[-2.9,28.4,3.4],s:[1,.6,.4]})]:[]),
    ...(cls==='blademaster'?[part(BOX(.5,2.2,.3),'#a03a30',{p:[-2.6,28.2,4.3],r:[0,0,.3]}),part(BOX(7.4,2.2,7.4),V.hair,{p:[0,22.5,-3.6],s:[1,.2,1]}),part(BOX(7,2.4,3),'#2a1a14',{p:[-6.2,23.6,0],top:'#5a3a2a'}),part(BOX(7,2.4,3),'#2a1a14',{p:[6.2,23.6,0],top:'#5a3a2a'})]:[]),
    ...(cls==='taoist'?[part(CONE(1,2.8,6),'#3a3240',{p:[0,26.3,3.6],r:[Math.PI,0,0]})]:[]),
    ...(cls==='monk'?[...[0,1,2].map(i=>part(SPH(.3,6,4),'#b07a5a',{p:[(i-1)*1.1,33.4-Math.abs(i-1)*.2,2.6]})),...Array.from({length:12},(_,i)=>{const a=i/12*TAU;return part(SPH(.9,8,6),'#5a3a2a',{p:[Math.cos(a)*5.2,21.5-Math.abs(Math.sin(a))*2.5,Math.sin(a)*4.2+1],emit:'#2a1a10',ei:.3})})]:[]),
    ...(cls==='oni'?[part(BOX(1.2,9,.5),'#a8202e',{p:[-2.4,9,6.4],r:[-.12,0,.05]}),part(BOX(1.2,9,.5),'#a8202e',{p:[2.4,9,6.4],r:[-.12,0,-.05]}),part(CYL(.7,.7,16,6),'#14111a',{p:[-6.2,15,-1],r:[.9,0,.5]}),part(BOX(1.6,1.2,1.6),'#d9a641',{p:[-4.4,17.6,1.4],r:[.9,0,.5]})]:[]),
    ...(cls==='idol'?[part(SPH(.55,8,6),'#ffd75a',{p:[0,23.4,5.2],emit:'#ffd75a',ei:1}),...[0,1,2,3,4].map(i=>part(SPH(.32,6,4),'#ffffff',{p:[(i-2)*.9,22.6-Math.abs(i-2)*.35,5.0],emit:'#ffffff',ei:.8})),part(CYL(.25,.25,4.4,5),'#2a2433',{p:[3.4,28,3.2],r:[0,.6,1.35]}),part(SPH(.6,6,4),'#2a2433',{p:[1.6,27.6,4.3]})]:[]),
    ...(cls==='wizard'?[part(CONE(3.4,9,10),V.hair,{p:[0,22.6,3.2],r:[Math.PI+.25,0,0]}),part(BOX(3.6,1,.4),V.hair,{p:[0,27.6,4.4]}),part(SPH(1.1,8,6),'#8fe3ff',{p:[0,15.5,6.4],emit:'#a98bff',ei:1.2})]:[]),
    ...(cls==='physician'?[part(SPH(1.4,8,6),'#d9a641',{p:[-5.2,13.2,4.4],emit:'#6a4a10',ei:.3}),part(SPH(1,8,6),'#d9a641',{p:[-5.2,15,4.4],emit:'#6a4a10',ei:.3}),part(CYL(.3,.3,1.4,6),'#8a2a22',{p:[-5.2,16.2,4.4]})]:[]),
  ];
  const robeGeo=merge(body);
  const rb=new T3.Mesh(robeGeo,m);rb.castShadow=true;grp.add(rb);
  // cape: a flowing cloak for the men, a long gauze ribbon for the qin master
  const cg=new T3.PlaneGeometry(female?4.5:13,female?13:16,6,8);cg.translate(0,female?-6.5:-8,0);
  const cape=new T3.Mesh(merge([part(cg,V.cape,{top:V.capeT})]),mat('plain',{rough:.8,rimI:.3,m:{side:T3.DoubleSide}}));cape.position.set(female?-3.5:0,female?16:22,-4.6*SK);cape.rotation.x=.12;cape.castShadow=true;grp.add(cape);
  // head-top group (hat, buns, hairpins) animated as the "hat"
  const hat=new T3.Group();hat.position.set(0,33.2,0);grp.add(hat);
  let hatGeo;
  if(cls==='swordsman')hatGeo=merge([part(SPH(1.7,10,8),V.hair,{p:[0,1.6,-.6]}),part(CYL(5.2,5.2,1.1,16),'#e9e4d6',{p:[0,-2.6,0]}),part(CONE(11.4,4.6,22),'#c8a86c',{p:[0,3.2,0],top:'#e6cf96'}),part(CYL(11.5,11.5,.5,22),'#8a6a3a',{p:[0,1,0]}),part(CONE(1.4,2.2,8),'#8a6a3a',{p:[0,6.4,0]})]);
  else if(cls==='qin')hatGeo=merge([part(SPH(2,12,9),V.hair,{p:[-3.6,-.2,-.6],s:[1,1.1,1]}),part(SPH(2,12,9),V.hair,{p:[3.6,-.2,-.6],s:[1,1.1,1]}),part(SPH(1.1,8,6),V.hair,{p:[0,.9,-1]}),
    part(CYL(2.4,1.3,13,10),V.hair,{p:[0,-7.5,-4.4]}),part(CYL(.22,.22,9,6),'#d9a641',{p:[0,.6,-.4],r:[0,0,1.5708],emit:'#6a4a10',ei:.5}),part(SPH(.8,8,6),'#f3c6d2',{p:[4.6,.6,-.4],emit:'#f3c6d2',ei:.6}),part(SPH(.5,8,6),'#8fe3ff',{p:[-4.6,.6,-.4],emit:'#8fe3ff',ei:2}),
    part(SPH(1,8,6),'#ff9fb6',{p:[3.9,1.6,.9],s:[1,.6,1],emit:'#ff9fb6',ei:.5}),part(SPH(.6,8,6),'#ff9fb6',{p:[4.9,1.1,.3],s:[1,.6,1],emit:'#ff9fb6',ei:.5}),part(SPH(.6,8,6),'#ff9fb6',{p:[3,1.2,1.8],s:[1,.6,1],emit:'#ff9fb6',ei:.5})]);
  else if(cls==='monk')hatGeo=merge([part(SPH(.1,4,3),V.hair,{p:[0,0,0]})]);
  else if(cls==='oni')hatGeo=merge([part(SPH(1.9,10,8),V.hair,{p:[0,1.6,-2.4]}),part(CYL(1.6,.5,14,8),V.hair,{p:[0,-5,-6],r:[.35,0,0]}),part(BOX(4.6,1.2,1.2),'#a8202e',{p:[0,1.6,-3.8],emit:'#5a0d0a',ei:.4}),part(BOX(1,4.4,.4),'#a8202e',{p:[-1.6,-.6,-4.4],r:[.2,0,.3]}),part(BOX(1,4.4,.4),'#a8202e',{p:[1.6,-.6,-4.4],r:[.2,0,-.3]}),
    part(SPH(2.6,10,8),'#f4f0e8',{p:[-4.6,-2.2,1.4],s:[.5,1,.9]}),part(CONE(.9,2,6),'#f4f0e8',{p:[-4.8,.6,.6]}),part(CONE(.9,2,6),'#f4f0e8',{p:[-4.8,.6,2.6]}),part(BOX(.3,.5,1.6),'#c8202e',{p:[-5.9,-2,1.4],emit:'#ff3a4a',ei:.8}),part(BOX(.3,1.6,.4),'#c8202e',{p:[-5.9,-3.4,.6]}),part(BOX(.3,1.6,.4),'#c8202e',{p:[-5.9,-3.4,2.2]})]);
  else if(cls==='idol')hatGeo=merge([part(SPH(2.2,12,9),V.hair,{p:[3.8,0,-1.2]}),part(CYL(2,1,11,10),V.hair,{p:[5.2,-6.4,-2.4],r:[.2,0,-.25]}),part(BOX(6.8,1.6,1.2),V.hair,{p:[0,-.8,4],r:[.3,0,0]}),
    part(CONE(.9,1.4,5),'#ffd75a',{p:[-3.4,.4,2.4],r:[0,0,.5],emit:'#ffd75a',ei:1.4}),part(CONE(.9,1.4,5),'#ffd75a',{p:[-3.4,.4,2.4],r:[0,0,-2.6],emit:'#ffd75a',ei:1.4}),part(BOX(9.6,.6,.6),'#2a2433',{p:[0,.9,-.6]}),part(CYL(1.3,1.3,1,10),'#2a2433',{p:[-4.9,-3,-.2],r:[0,0,1.5708]}),part(CYL(1.3,1.3,1,10),'#2a2433',{p:[4.9,-3,-.2],r:[0,0,1.5708]})]);
  else if(cls==='wizard')hatGeo=merge([part(CYL(10.4,10.4,.7,22),'#2b2f7a',{p:[0,-1.4,0],top:'#3a40a0'}),part(CONE(5.6,13,16),'#2b2f7a',{p:[0,5.4,-.6],top:'#4a52b8'}),part(CONE(2.2,6,10),'#2b2f7a',{p:[1.6,13.4,-1.8],r:[-.5,0,-.5]}),part(CYL(5.7,5.8,1.4,16),'#d9a641',{p:[0,-.2,-.4],emit:'#6a4a10',ei:.6}),
    part(SPH(.7,6,4),'#ffd75a',{p:[2.6,4.6,3.6],emit:'#ffd75a',ei:1.6}),part(SPH(.5,6,4),'#ffffff',{p:[-2.4,7.2,2.6],emit:'#ffffff',ei:1.4}),part(SPH(.5,6,4),'#8fe3ff',{p:[.6,9.6,1.6],emit:'#8fe3ff',ei:1.4})]);
  else if(cls==='physician')hatGeo=merge([part(BOX(8.4,3.2,7.6),'#2a3a4a',{p:[0,.4,-.6],top:'#3a4e66'}),part(BOX(8.8,.8,8),'#1a2430',{p:[0,-1.4,-.6]}),part(BOX(1.6,5,.4),'#2a3a4a',{p:[-3.2,-2,-4.6],r:[.3,0,.2]}),part(BOX(1.6,5,.4),'#2a3a4a',{p:[3.2,-2,-4.6],r:[.3,0,-.2]})]);
  else if(cls==='taoist')hatGeo=merge([part(SPH(1.8,10,8),V.hair,{p:[0,.8,-1.2]}),part(CYL(2.4,2,3,8),'#1a1a22',{p:[0,1.6,-1.2],top:'#2e2e3a'}),part(BOX(2.4,1.8,1),'#d9a641',{p:[0,2.2,.4],emit:'#6a4a10',ei:.6}),part(CYL(.3,.3,7,6),'#d9a641',{p:[0,1.6,-1.2],r:[0,0,1.5708]})]);
  else hatGeo=merge([part(SPH(2.1,10,8),V.hair,{p:[0,1.4,-1.2]}),part(CYL(.5,.5,6,6),'#d9a641',{p:[0,1.8,-1.2],r:[0,0,1.2]}),part(CYL(5.1,5.1,1.4,16,true),'#b8322b',{p:[0,-2.4,0]}),part(BOX(1.2,7,.4),'#b8322b',{p:[-3.6,-5.2,-3.4],r:[.4,0,.5]}),part(BOX(1.2,6,.4),'#b8322b',{p:[-4.6,-5.4,-3],r:[.5,0,.9]})]);
  const hatM=new T3.Mesh(hatGeo,mat('plain',{rough:.8,rimI:.25}));hatM.castShadow=true;hat.add(hatM);
  // right arm group: sleeve, hand and the weapon; cast animation rotates this group from the shoulder
  const arm=new T3.Group();arm.position.set(6.4*SK,22,1.2);grp.add(arm);
  let weapon;const WY=-8.2,WZ=-.6; // the legacy weapon parts were authored around a lower pivot
  if(weaponId==='great')weapon=[part(BOX(7,1.2,1.2),'#d9a641',{p:[1.2,.6,5.4],emit:'#6a4a10',ei:.5}),part(CYL(.8,.8,7,6),'#2a1a14',{p:[1.2,-3.4,5.4]}),part(SPH(1.3,8,6),'#d9a641',{p:[1.2,-7.2,5.4]}),part(BOX(3.4,26,.5),'#c9d6e8',{p:[1.2,13.5,5.4],top:'#ffffff',emit:'#9fc4ff',ei:.3}),part(BOX(.7,24,.6),'#ffffff',{p:[1.2,13,5.4],emit:'#dfeaff',ei:1.1}),part(BOX(3.6,2.4,.6),'#8a3a2c',{p:[1.2,2.6,5.4],emit:'#ff6a3c',ei:.6})];
  else if(weaponId==='whisk')weapon=[part(CYL(.45,.55,15,6),'#3a2418',{p:[1.2,5.5,5.4],top:'#6a4a2a'}),part(CYL(1,1,1.4,8),'#d9a641',{p:[1.2,13.4,5.4],emit:'#6a4a10',ei:.5}),...Array.from({length:14},(_,i)=>{const a=i/14*TAU,r=1.6+(i%3)*.5;return part(CYL(.12,.05,9,4),'#f4efe0',{p:[1.2+Math.cos(a)*r*.9,18.2,5.4+Math.sin(a)*r*.9],r:[Math.sin(a)*.5,0,-Math.cos(a)*.5],emit:'#ffffff',ei:.55})}),part(SPH(1.1,8,6),'#8fe3ff',{p:[1.2,14.6,5.4],emit:'#8fe3ff',ei:1.6})];
  else if(weaponId==='nodachi')weapon=[part(BOX(4.2,.9,1),'#d9a641',{p:[1.2,.6,5.4],emit:'#6a4a10',ei:.5}),part(CYL(.6,.6,10,6),'#1a1a22',{p:[1.2,-4.8,5.4]}),part(BOX(1.9,34,.4),'#e8edf2',{p:[1.6,17.5,5.4],top:'#ffffff',emit:'#ffb080',ei:.35}),part(BOX(.5,33,.45),'#ffffff',{p:[2.3,17.3,5.4],emit:'#ffd0a0',ei:1.3}),part(BOX(.5,5,.5),'#b8322b',{p:[1.2,-9.6,5.4]})];
  else if(weaponId==='drum')weapon=[part(CYL(5.2,5.2,3.4,16),'#8a2a22',{p:[-2,2,10],r:[1.5708,0,0],top:'#b8322b'}),part(CYL(4.6,4.6,.4,16),'#f1dfc0',{p:[-2,2,11.9],r:[1.5708,0,0],emit:'#ffd27a',ei:.5}),part(CYL(5.4,5.4,.5,16),'#d9a641',{p:[-2,2,8.1],r:[1.5708,0,0],emit:'#6a4a10',ei:.6}),part(CYL(.4,.4,13,6),'#3a2418',{p:[1.2,6.5,5.4],top:'#6a4a2a'}),part(SPH(1.3,8,6),'#ffd27a',{p:[1.2,13.5,5.4],emit:'#ffd27a',ei:1.4})];
  else if(weaponId==='staff')weapon=[part(CYL(.7,.8,44,8),'#3a2418',{p:[1.2,12,5.4],top:'#6a4a2a'}),part(CYL(1.2,1.2,2.2,8),'#d9a641',{p:[1.2,33,5.4],emit:'#6a4a10',ei:.6}),part(CYL(1.2,1.2,1.4,8),'#d9a641',{p:[1.2,-9,5.4],emit:'#6a4a10',ei:.6}),...[0,1,2].map(i=>part(T3.TorusGeometry?new T3.TorusGeometry(1.6,.3,6,12):SPH(1.2,6,4),'#f0e6c8',{p:[1.2+(i-1)*1.6,34.6,5.4],r:[0,1.5708,0],emit:'#ffd27a',ei:.6}))];
  else if(weaponId==='fist')weapon=[part(BOX(3.4,3,3.2),'#e9e4d6',{p:[1.2,-1,4.2]}),part(BOX(3.6,.6,3.4),'#b8322b',{p:[1.2,-.2,4.2]}),part(BOX(3.6,.6,3.4),'#b8322b',{p:[1.2,-1.8,4.2]})];
  else if(weaponId==='needle')weapon=[...[-.35,0,.35].map(a=>part(CYL(.14,.14,11,5),'#dfe6ee',{p:[1.2+Math.sin(a)*2,5,5.4+Math.cos(a)*.6],r:[0,0,a],emit:'#9ff06a',ei:.9})),part(SPH(.9,8,6),'#5a3a2a',{p:[1.2,-.6,5.4]})];
  else if(weaponId==='pouch')weapon=[part(SPH(2.6,10,8),'#8a5a32',{p:[1.2,-1.5,5.6],s:[1,1.15,1],top:'#b07a48'}),part(CYL(.9,1.3,1.6,8),'#5a3a2a',{p:[1.2,1.6,5.6]}),part(SPH(.6,6,4),'#9ff06a',{p:[2.4,-.4,7.8],emit:'#9ff06a',ei:1.2})];
  else if(typeof HERO_WEAPON_MESH==='function'&&HERO_WEAPON_MESH(weaponId))weapon=HERO_WEAPON_MESH(weaponId);
  else if(cls==='swordsman')weapon=[part(BOX(4.6,.8,.9),'#d9a641',{p:[1.2,.6,5.4],emit:'#6a4a10',ei:.5}),part(CYL(.6,.6,5,6),'#2a1a14',{p:[1.2,-2.4,5.4]}),part(SPH(.9,8,6),'#d9a641',{p:[1.2,-5.1,5.4]}),part(BOX(1.1,22,.32),'#dfe6ee',{p:[1.2,11.8,5.4],top:'#ffffff',emit:'#88c8ff',ei:.35}),part(BOX(.4,20,.45),'#ffffff',{p:[1.2,11.5,5.4],emit:'#9fe3f0',ei:1.2})];
  else if(cls==='taoist')weapon=[part(CYL(.5,.6,18,6),'#5a3a22',{p:[1.2,6,5.4],top:'#8a5a32'}),part(CYL(1,1,1.2,8),'#d9a641',{p:[1.2,15.2,5.4],emit:'#6a4a10',ei:.5}),part(CONE(2.4,11,10),'#f4efe0',{p:[1.2,20.4,5.4],top:'#ffffff',emit:'#ffd27a',ei:.25}),part(SPH(1.1,8,6),'#d9a641',{p:[1.2,-3.2,5.4]})];
  else if(cls==='qin')weapon=[part(BOX(17,1.3,5),'#3a2418',{p:[-5.5,0,8.6],r:[0,.12,.08],top:'#6a4a2a'}),part(BOX(16,.3,.16),'#e8e4d8',{p:[-5.5,.9,7.4],r:[0,.12,.08],emit:'#8fe3ff',ei:1}),part(BOX(16,.3,.16),'#e8e4d8',{p:[-5.5,.95,8.6],r:[0,.12,.08],emit:'#8fe3ff',ei:1}),part(BOX(16,.3,.16),'#e8e4d8',{p:[-5.5,1,9.8],r:[0,.12,.08],emit:'#8fe3ff',ei:1}),part(SPH(.8,8,6),'#d9a641',{p:[2.4,.9,8.6],emit:'#6a4a10',ei:.5})];
  else weapon=[part(BOX(5,1,1),'#d9a641',{p:[1.2,.6,5.4],emit:'#6a4a10',ei:.5}),part(CYL(.7,.7,7,6),'#2a1a14',{p:[1.2,-3.2,5.4]}),part(BOX(2.6,20,.4),'#d7dde6',{p:[1.6,11,5.4],top:'#ffffff',emit:'#ffb080',ei:.3}),part(BOX(.6,19,.5),'#ffffff',{p:[2.4,10.8,5.4],emit:'#ff9c5a',ei:1}),part(BOX(.5,4,.5),'#b8322b',{p:[1.2,-7.5,5.4]})];
  weapon.forEach(w=>w.translate(0,WY,WZ));
  const heldWeapon=new T3.Mesh(merge(weapon.map(w=>w.clone())),m);heldWeapon.name='weapon-'+weaponId;heldWeapon.castShadow=true;
  const forearm=cls==='blademaster'?[part(CYL(1.5,1.7,6,8),skin,{p:[1,-6,3.2],r:[.55,0,-.1]}),part(CYL(1.75,1.75,2.4,8),'#e9e4d6',{p:[1.1,-5,3.6],r:[.55,0,-.1]})]:[];
  const armM=new T3.Mesh(merge([part(CYL(2.1,female?3.2:4.2,female?11:9,10),V.sleeve,{p:[.2,-3.8,1.6],r:[.55,0,-.18],top:V.sleeve}),...forearm,part(SPH(1.6,10,7),skin,{p:[1.2,-9.2,4.2]}),...weapon]),m);armM.castShadow=true;arm.add(armM);
  const cry=new T3.Mesh(new T3.OctahedronGeometry(1.6,1),new T3.MeshBasicMaterial({color:new T3.Color(...V.gem)}));cry.position.set(1.2,WY+(typeof HERO_GEM_Y!=='undefined'&&HERO_GEM_Y[weaponId]!==undefined?HERO_GEM_Y[weaponId]:weaponId==='whisk'?21:weaponId==='drum'?14:weaponId==='nodachi'?35:weaponId==='great'?27:weaponId==='staff'?37:weaponId==='fist'?2:weaponId==='needle'?11:weaponId==='pouch'?3.5:cls==='taoist'?26:cls==='qin'?2:23.6),5.4+WZ);if(cls==='qin'&&weaponId==='wave')cry.position.set(-12,WY+1.5,8.2);arm.add(cry);
  const sigil=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({map:sigilTex(),transparent:true,opacity:.75,blending:T3.AdditiveBlending,depthWrite:false,color:new T3.Color(.55,1.6,1.8)}));sigil.rotation.x=-Math.PI/2;sigil.scale.set(slot==='player'?50:36,slot==='player'?50:36,1);scene.add(sigil);
  if(slot==='player')for(let i=0;i<14;i++){const gm=new T3.Mesh(robeGeo,new T3.MeshBasicMaterial({color:new T3.Color(.6,2.4,3),transparent:true,opacity:.5,blending:T3.AdditiveBlending,depthWrite:false}));gm.visible=false;gm.scale.set(.9,.9,.9);scene.add(gm);ghostM.push(gm)}
  return {g:grp,hat,arm,heldWeapon,crystal:cry,cape,sigil,cls,slot,gem:V.gem,weapon:weaponId};
}
function sigilTex(dash){
  const k=document.createElement('canvas');k.width=k.height=512;const g=k.getContext('2d');g.translate(256,256);g.strokeStyle='#fff';g.fillStyle='#fff';
  if(dash){g.lineWidth=7;for(let i=0;i<32;i++){const a=i/32*TAU;g.beginPath();g.arc(0,0,246,a,a+TAU/56);g.stroke()}g.lineWidth=2;g.globalAlpha=.5;g.beginPath();g.arc(0,0,226,0,TAU);g.stroke();return new T3.CanvasTexture(k)}
  g.lineWidth=5;g.beginPath();g.arc(0,0,240,0,TAU);g.stroke();g.lineWidth=2;g.beginPath();g.arc(0,0,214,0,TAU);g.stroke();g.beginPath();g.arc(0,0,120,0,TAU);g.stroke();
  // eight trigrams
  const tri=[[1,1,1],[0,1,1],[1,0,1],[0,0,1],[1,1,0],[0,1,0],[1,0,0],[0,0,0]];
  for(let i=0;i<8;i++){g.save();g.rotate(i/8*TAU);for(let j=0;j<3;j++){const y=-176+j*10;if(tri[i][j])g.fillRect(-16,y,32,5);else{g.fillRect(-16,y,13,5);g.fillRect(3,y,13,5)}}g.restore()}
  // taiji
  g.lineWidth=4;g.beginPath();g.arc(0,0,96,0,TAU);g.stroke();g.beginPath();g.arc(0,0,96,-Math.PI/2,Math.PI/2);g.arc(0,48,48,Math.PI/2,-Math.PI/2,true);g.arc(0,-48,48,Math.PI/2,-Math.PI/2);g.closePath();g.fill();
  g.globalCompositeOperation='destination-out';g.beginPath();g.arc(0,48,14,0,TAU);g.fill();g.globalCompositeOperation='source-over';g.beginPath();g.arc(0,-48,14,0,TAU);g.fill();
  return new T3.CanvasTexture(k);
}

/* ---------- glow sprites and effect pools ---------- */
const GMAX=PHONE?3000:7000,gPos=new Float32Array(GMAX*3),gCol=new Float32Array(GMAX*3),gSz=new Float32Array(GMAX),rgbC={};
function rgb(h){return rgbC[h]||(rgbC[h]=(c=>[c.r,c.g,c.b])(lin(h)))}
function glow(x,y,z,col,size,b=1){if(glowN>=GMAX)return;if(G&&G.P&&!G.auto){const dx=x-G.P.x,dz=z-G.P.y,d2=dx*dx+dz*dz;if(d2<2500)b*=.45+.55*d2/2500}const c=rgb(col),i=glowN++;gPos[i*3]=x;gPos[i*3+1]=y;gPos[i*3+2]=z;gCol[i*3]=c[0]*b;gCol[i*3+1]=c[1]*b;gCol[i*3+2]=c[2]*b;gSz[i]=size}
function buildGlow(){
  const g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(gPos,3).setUsage(T3.DynamicDrawUsage));g.setAttribute('aColor',new T3.BufferAttribute(gCol,3).setUsage(T3.DynamicDrawUsage));g.setAttribute('aSize',new T3.BufferAttribute(gSz,1).setUsage(T3.DynamicDrawUsage));
  const m=new T3.ShaderMaterial({transparent:true,depthWrite:false,blending:T3.AdditiveBlending,uniforms:{uScale:{value:800}},
    vertexShader:'attribute float aSize;attribute vec3 aColor;varying vec3 vC;uniform float uScale;void main(){vC=aColor;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=min(aSize*uScale/-mv.z,360.);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;float a=max(0.,1.-d);a=a*a*.42+pow(a,5.)*1.15;if(a<.004)discard;gl_FragColor=vec4(vC*a,1.);}'});
  glowPts=new T3.Points(g,m);glowPts.frustumCulled=false;glowPts.renderOrder=5;scene.add(glowPts);
}
function buildFxPools(){
  const rg=new T3.RingGeometry(.9,1,64);rg.rotateX(-Math.PI/2);
  /* enemy warnings: their own layer, normal blending, drawn over every effect and never hidden by scenery */
  const dg=new T3.RingGeometry(.88,1,64);dg.rotateX(-Math.PI/2);const df=new T3.CircleGeometry(1,48);df.rotateX(-Math.PI/2);
  for(let i=0;i<40;i++){const m=new T3.Mesh(dg,new T3.MeshBasicMaterial({transparent:true,depthWrite:false,depthTest:false,side:T3.DoubleSide}));m.visible=false;m.renderOrder=9;scene.add(m);dangerPool.push(m);
    const f=new T3.Mesh(df,new T3.MeshBasicMaterial({transparent:true,depthWrite:false,depthTest:false,side:T3.DoubleSide}));f.visible=false;f.renderOrder=8;scene.add(f);dangerFill.push(f)}
  /* "you are here": four short arcs at the hero's feet, a shape no skill uses, always on top */
  const lg=new T3.Group();for(let k=0;k<4;k++){const a=new T3.RingGeometry(.8,1,16,1,k*Math.PI/2+.25,Math.PI/2-.5);a.rotateX(-Math.PI/2);const m=new T3.Mesh(a,new T3.MeshBasicMaterial({color:0xeafcff,transparent:true,opacity:.95,depthWrite:false,depthTest:false,side:T3.DoubleSide}));m.renderOrder=10;lg.add(m);locator.parts.push(m)}
  const dot=new T3.Mesh(new T3.CircleGeometry(.16,20).rotateX(-Math.PI/2),new T3.MeshBasicMaterial({color:0x6fd3e8,transparent:true,opacity:.55,depthWrite:false,depthTest:false}));dot.renderOrder=10;lg.add(dot);
  lg.visible=false;scene.add(lg);locator.g=lg;
  for(let i=0;i<70;i++){const m=new T3.Mesh(rg,new T3.MeshBasicMaterial({transparent:true,blending:T3.AdditiveBlending,depthWrite:false,side:T3.DoubleSide}));m.visible=false;m.renderOrder=3;scene.add(m);ringPool.push(m)}
  const pt=radial([[0,'rgba(255,255,255,.95)'],[.55,'rgba(255,255,255,.55)'],[.82,'rgba(255,255,255,.75)'],[.93,'rgba(255,255,255,.25)'],[1,'rgba(255,255,255,0)']]),cg=new T3.PlaneGeometry(1,1);cg.rotateX(-Math.PI/2);
  for(let i=0;i<48;i++){const m=new T3.Mesh(cg,new T3.MeshBasicMaterial({map:pt,transparent:true,blending:T3.AdditiveBlending,depthWrite:false}));m.visible=false;m.renderOrder=2;scene.add(m);poolPool.push(m)}
  const sc=radial([[0,'rgba(8,4,3,.92)'],[.5,'rgba(14,8,5,.72)'],[1,'rgba(14,8,5,0)']]);
  for(let i=0;i<30;i++){const m=new T3.Mesh(cg,new T3.MeshBasicMaterial({map:sc,transparent:true,depthWrite:false}));m.visible=false;m.renderOrder=1;m.position.y=.32;scene.add(m);scorch.push({m,t:0})}
  const st=splatTex();for(let i=0;i<(PHONE?24:48);i++){const m=new T3.Mesh(cg,new T3.MeshBasicMaterial({map:st,transparent:true,depthWrite:false,color:new T3.Color(.55,.05,.08)}));m.visible=false;m.renderOrder=1;m.position.y=.3;scene.add(m);splats.push({m,t:0})}
  const tt=(()=>{const k=document.createElement('canvas');k.width=64;k.height=256;const g=k.getContext('2d'),gr=g.createLinearGradient(0,0,64,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,256);return new T3.CanvasTexture(k)})();
  const tg=new T3.PlaneGeometry(1,1);tg.rotateX(-Math.PI/2);tg.translate(0,0,.5);
  tele=new T3.Mesh(tg,new T3.MeshBasicMaterial({map:tt,color:new T3.Color(4,.6,.4),transparent:true,blending:T3.AdditiveBlending,depthWrite:false}));tele.visible=false;tele.position.y=.8;scene.add(tele);
  const rp=new T3.PlaneGeometry(1,1);rp.rotateX(-Math.PI/2);
  mRing=new T3.Mesh(rp,new T3.MeshBasicMaterial({map:sigilTex(true),color:new T3.Color(.6,2.2,.9),transparent:true,blending:T3.AdditiveBlending,depthWrite:false}));mRing.visible=false;mRing.position.y=.7;scene.add(mRing);
  heartMesh=new T3.Mesh(rp,new T3.MeshBasicMaterial({map:sigilTex(),color:new T3.Color(.22,.85,1.15),transparent:true,opacity:.8,blending:T3.AdditiveBlending,depthWrite:false}));heartMesh.position.set(W/2,.5,H/2);heartMesh.scale.set(230,1,230);heartMesh.renderOrder=1;scene.add(heartMesh);
  for(let i=0;i<(PHONE?1:4);i++){const l=new T3.PointLight(0xffffff,0,200,1.7);scene.add(l);flashL.push(l)}
}
/* ---------- post-processing ---------- */
function buildPost(){
  const pars={minFilter:T3.LinearFilter,magFilter:T3.LinearFilter,format:T3.RGBAFormat,type:T3.HalfFloatType};
  let target;
  if(rn.capabilities.isWebGL2&&T3.WebGLMultisampleRenderTarget&&Q().msaa){target=new T3.WebGLMultisampleRenderTarget(4,4,pars);target.samples=4}else target=new T3.WebGLRenderTarget(4,4,pars);
  comp=new T3.EffectComposer(rn,target);
  comp.addPass(new T3.RenderPass(scene,cam));
  if(!PHONE){bloomPass=new T3.UnrealBloomPass(new T3.Vector2(512,512),.62,.72,MAP().bright?1.12:1.02);comp.addPass(bloomPass)}else bloomPass=null;
  finalPass=new T3.ShaderPass({uniforms:{tDiffuse:{value:null},uTime:U.uTime,uHurt:{value:0},uLow:{value:0},uTilt:{value:Q().tilt},uFade:{value:1},uDark:{value:0},uFlash:{value:0},uAspect:{value:1.78},uS0:{value:new T3.Vector4(0,0,0,0)},uS1:{value:new T3.Vector4(0,0,0,0)},uS2:{value:new T3.Vector4(0,0,0,0)},uCA:{value:0}},
    vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`varying vec2 vU;uniform sampler2D tDiffuse;uniform float uTime,uHurt,uLow,uTilt,uFade,uDark,uFlash,uAspect,uCA;uniform vec4 uS0,uS1,uS2;
    vec3 aces(vec3 x){x*=.82;return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
    float rand(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    vec2 shockUV(vec2 uv,vec4 S,inout float w){if(S.w==0.)return uv;vec2 d=(uv-S.xy)*vec2(uAspect,1.);float L=length(d);float k=smoothstep(S.z-.09,S.z,L)*smoothstep(S.z+.09,S.z,L);w+=k;return uv-normalize(d+1e-5)*k*S.w/vec2(uAspect,1.);}
    void main(){vec2 uv=vU;float sw=0.;uv=shockUV(uv,uS0,sw);uv=shockUV(uv,uS1,sw);uv=shockUV(uv,uS2,sw);
      vec2 c=uv-.5;float e=dot(c,c);
      float blur=smoothstep(.3,.56,abs(uv.y-.47))*uTilt;vec3 col;
      if(blur>.002){vec3 s=vec3(0.);float r=blur*.0028;for(int i=0;i<8;i++){float a=float(i)*.7854;s+=texture2D(tDiffuse,uv+vec2(cos(a),sin(a)*1.7)*r).rgb;}col=(s+texture2D(tDiffuse,uv).rgb)/9.;}
      else{float ca=e*.0035+uCA*.006+sw*.009;col=vec3(texture2D(tDiffuse,uv+c*ca).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-c*ca).b);}
      col+=sw*.12;
      col=aces(col*1.02);
      float l=dot(col,vec3(.3,.59,.11));
      col=mix(col,col*vec3(.9,1.0,1.1),smoothstep(.45,0.,l)*.55);
      col=mix(col,col*vec3(1.09,1.02,.92),smoothstep(.35,.95,l)*.5);
      col=mix(vec3(l),col,1.14-uDark*.5);
      col=pow(max(col,0.),vec3(1./2.2));
      col=mix(col,col*col*(3.-2.*col),.32);
      float v=smoothstep(.72,.16,e*1.5);col*=mix(.42,1.,v);
      col+=vec3(.62,.05,.03)*(uHurt*.55+uLow*(.5+.5*sin(uTime*4.))*.2)*smoothstep(.1,.5,e*1.9);
      col=mix(col,vec3(1.),uFlash);
      col+=(rand(uv+fract(uTime))-.5)*.016;
      gl_FragColor=vec4(col*uFade,1.);}`});
  finalPass.renderToScreen=true;comp.addPass(finalPass);
}
function initGfx(){
  rn=new T3.WebGLRenderer({canvas:cv,antialias:false,powerPreference:'high-performance',stencil:false});
  rn.shadowMap.enabled=true;rn.shadowMap.type=PHONE?T3.PCFShadowMap:T3.PCFSoftShadowMap;rn.toneMapping=T3.NoToneMapping;rn.outputEncoding=T3.LinearEncoding;
  scene=new T3.Scene();const fogC=lin(MAP().fog);scene.background=fogC;scene.fog=new T3.Fog(fogC,560,1500);
  cam=new T3.PerspectiveCamera(32,1,20,3600);
  hemiL=new T3.HemisphereLight(lin(MAP().hemi[0]),lin(MAP().hemi[1]),.46);scene.add(hemiL);
  sun=new T3.DirectionalLight(lin(MAP().sun),1.85*(MAP().sunI||1));sun.castShadow=true;sun.shadow.mapSize.set(Q().shadow,Q().shadow);sun.shadow.bias=MAP().bright?-.0002:-.0004;sun.shadow.normalBias=MAP().bright?1.6:.8;sun.shadow.radius=QLEVEL==='low'?2:3.5;scene.add(sun,sun.target);
  orbL=new T3.PointLight(lin('#6fe3ff'),1.5,150,1.6);scene.add(orbL);
  buildArena();
  paintGround();buildPonds();buildWorld();buildCreatures();buildFxPools();buildGlow();buildPost();
}
function resize(){
  const r=$('#stage').getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);
  rn.setPixelRatio(1);rn.setSize(Math.round(w*DPR),Math.round(h*DPR),false);cv.style.width='100%';cv.style.height='100%';
  comp.setSize(Math.round(w*DPR),Math.round(h*DPR));
  const odpr=Math.min(devicePixelRatio||1,PHONE?1.5:2);ov.width=Math.round(w*odpr);ov.height=Math.round(h*odpr);
  cam.aspect=w/h;viewK=Math.max(1.5,280/(218*cam.aspect));
  const vh0=218*viewK;VW=vh0*cam.aspect;VH=vh0/.82;
  glowPts.material.uniforms.uScale.value=(h*DPR)/(2*Math.tan(cam.fov*Math.PI/360));
  finalPass.uniforms.uAspect.value=w/h;
  const sz=Math.max(260,VW*.7);const s=sun.shadow.camera;s.left=-sz;s.right=sz;s.top=sz;s.bottom=-sz;s.near=20;s.far=1400;s.updateProjectionMatrix();
  scene.fog.near=470*viewK;scene.fog.far=1500*viewK;
  cam.updateProjectionMatrix();
}

/* ink-splat decal texture: a few blobs and spatter drops, drawn once */
function splatTex(){const k=document.createElement('canvas');k.width=k.height=256;const c=k.getContext('2d');c.translate(128,128);c.fillStyle='#fff';
  for(let i=0;i<7;i++){const a=i/7*TAU+Math.random()*.6,d=Math.random()*34,r=18+Math.random()*26;c.globalAlpha=.75+Math.random()*.25;c.beginPath();c.arc(Math.cos(a)*d,Math.sin(a)*d,r,0,TAU);c.fill()}
  for(let i=0;i<26;i++){const a=Math.random()*TAU,d=50+Math.random()*60,r=2+Math.random()*6;c.globalAlpha=.5+Math.random()*.5;c.beginPath();c.arc(Math.cos(a)*d,Math.sin(a)*d,r,0,TAU);c.fill()}
  const t=new T3.CanvasTexture(k);t.encoding=T3.LinearEncoding;return t}
function addSplat(x,y,size,col){if(!splats.length)return;const S=splats[splatI++%splats.length];S.t=8;S.m.visible=true;S.m.position.x=x;S.m.position.z=y;S.m.rotation.y=Math.random()*TAU;const sc=size*(0.8+Math.random()*.5);S.m.scale.set(sc,1,sc);S.m.material.color.setRGB(...rgb(col||'#7a0d12'));S.m.material.opacity=.85}
/* day-night cycle: a full day every ten minutes, dawn → noon → dusk → night; bosses arrive into the evening */
const DAY=[{t:0,sun:'#ffb37a',si:1.35,hi:.5,fog:[1,.95,.85],dark:0,bloom:0},{t:.25,sun:null,si:1.85,hi:.46,fog:[1,1,1],dark:0,bloom:0},{t:.5,sun:'#ff8a5a',si:1.25,hi:.4,fog:[1,.8,.72],dark:.05,bloom:.08},{t:.72,sun:'#4a5a9a',si:.55,hi:.22,fog:[.32,.36,.5],dark:.22,bloom:.3},{t:.88,sun:'#5a6ab0',si:.6,hi:.24,fog:[.4,.42,.55],dark:.2,bloom:.26},{t:1,sun:'#ffb37a',si:1.35,hi:.5,fog:[1,.95,.85],dark:0,bloom:0}];
const _sunBase=new T3.Color(),_fogBase=new T3.Color(),_c1=new T3.Color(),_c2=new T3.Color();let _dayInit=false;
function dayNight(phase){
  if(!_dayInit){_sunBase.copy(sun.color);_fogBase.copy(scene.fog.color);_dayInit=true}
  let a=DAY[0],b=DAY[1];for(let i=0;i<DAY.length-1;i++){if(phase>=DAY[i].t&&phase<=DAY[i+1].t){a=DAY[i];b=DAY[i+1];break}}
  const k0=(phase-a.t)/(b.t-a.t||1),k=k0*k0*(3-2*k0);
  _c1.copy(a.sun?lin(a.sun):_sunBase);_c2.copy(b.sun?lin(b.sun):_sunBase);sun.color.copy(_c1).lerp(_c2,k);sun.intensity=(a.si+(b.si-a.si)*k)*(MAP().sunI||1);hemiL.intensity=a.hi+(b.hi-a.hi)*k;
  const f=[0,1,2].map(i=>a.fog[i]+(b.fog[i]-a.fog[i])*k);scene.fog.color.copy(_fogBase).multiply(_c1.setRGB(f[0],f[1],f[2]));scene.background.copy(scene.fog.color);
  const dark=a.dark+(b.dark-a.dark)*k,bl=a.bloom+(b.bloom-a.bloom)*k;if(bloomPass)bloomPass.strength=.62+bl*(MAP().bright?.5:1);orbL.intensity=1.5+dark*4;return dark;
}

/* trees between the camera and the hero shrink away so the fight stays visible */
const _occM=new T3.Matrix4(),_occS=new T3.Vector3();
function occludeTick(px,pz,dt){
  for(const r of roofs){const u=r.userData,near=Math.abs(u.cx-px)<78&&Math.abs(u.cz-pz)<78;const t=near?.14:1;if(Math.abs(u.k-t)<.002)continue;u.k+=(t-u.k)*Math.min(1,dt*7);r.material.opacity=u.k;r.castShadow=u.k>.5}
  for(const o of occluders){
    const dx=o.x-px,dz=o.z-pz;const near=Math.abs(dx)<70&&dz>-30&&dz<150; // in front of the hero (toward the camera) and close in x
    const target=near?.12:1,k=o.k+(target-o.k)*Math.min(1,dt*7);if(Math.abs(k-o.k)<.002&&Math.abs(k-target)<.002)continue;o.k=k;
    _occM.copy(o.base);_occS.set(1,k,1);_occM.scale(_occS);o.im.setMatrixAt(o.n,_occM);o.im.instanceMatrix.needsUpdate=true;
  }
}

/* ---- hero preview: a second small renderer for the hero-select screen (its own scene; the hero model is shared code) ---- */
let PV=null;
function previewInit(canvas){
  if(PV)return PV;
  const r=new T3.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});r.setPixelRatio(Math.min(devicePixelRatio||1,2));r.outputEncoding=T3.sRGBEncoding;r.toneMapping=T3.ACESFilmicToneMapping;r.toneMappingExposure=1.25;r.setClearColor(0x000000,0);
  const sc=new T3.Scene();const cm=new T3.PerspectiveCamera(28,1,1,600);cm.position.set(0,30,100);cm.lookAt(0,18.5,0);
  sc.add(new T3.HemisphereLight(lin('#dfeeff'),lin('#3a2418'),1));const d=new T3.DirectionalLight(lin('#fff1dc'),1.7);d.position.set(50,90,70);sc.add(d);const d2=new T3.DirectionalLight(lin('#6fd3e8'),.9);d2.position.set(-70,30,-50);sc.add(d2);
  const pl=new T3.PointLight(lin('#ffd27a'),1.4,200,1.5);pl.position.set(0,40,40);sc.add(pl);
  const disc=new T3.Mesh(new T3.CircleGeometry(30,40),new T3.MeshBasicMaterial({color:new T3.Color(.02,.01,.03),transparent:true,opacity:.55}));disc.rotation.x=-Math.PI/2;disc.position.y=-.5;sc.add(disc);
  PV={r,sc,cm,hero:null,t:0,cls:null,weapon:null,pl,drag:0,dv:0};
  let px=null;canvas.style.touchAction='pan-y';canvas.addEventListener('pointerdown',e=>{px=e.clientX;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(px===null)return;PV.dv=(e.clientX-px)*.02;PV.drag+=PV.dv;px=e.clientX});const up=()=>{px=null};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  return PV;
}
function previewSet(cls,weapon){
  if(!PV||!CLASSES[cls])return;weapon=weapon||CLASSES[cls].main;if(PV.hero&&PV.cls===cls&&PV.weapon===weapon)return;
  if(PV.hero){PV.sc.remove(PV.hero.g);PV.sc.remove(PV.hero.sigil)}
  const main=scene;scene=PV.sc;try{PV.hero=buildHeroModel(cls,'preview',weapon)}finally{scene=main}
  PV.cls=cls;PV.weapon=weapon;PV.hero.sigil.position.set(0,.4,0);PV.hero.sigil.scale.set(44,44,1);const gem=PV.hero.gem;PV.pl.color.setRGB(gem[0]/12,gem[1]/12,gem[2]/12);PV.pop=1;
}
function previewTick(dt){
  if(!PV||!PV.hero)return;const c=PV.r.domElement;if(!c.isConnected||c.offsetParent===null)return;
  const w=c.clientWidth||300,h=c.clientHeight||360,pr=PV.r.getPixelRatio();
  if(Math.abs(c.width-w*pr)>2||Math.abs(c.height-h*pr)>2){PV.r.setSize(w,h,false);PV.cm.aspect=w/h;PV.cm.updateProjectionMatrix()}
  PV.t+=dt;const H=PV.hero,tm=PV.t;PV.dv*=.9;if(Math.abs(PV.dv)<.001)PV.drag*=.98;else PV.drag+=PV.dv*.5;
  PV.pop=Math.max(0,PV.pop-dt*3);const sc=1+Math.sin(PV.pop*Math.PI)*.06;
  H.g.rotation.y=Math.sin(tm*.45)*.5+PV.drag;H.g.position.y=Math.sin(tm*2)*.6;H.g.scale.set(sc,sc,sc);
  H.hat.rotation.set(Math.sin(tm*1.7)*.02,0,Math.sin(tm*1.3)*.035);H.cape.rotation.x=.14+Math.sin(tm*1.8)*.05;H.arm.rotation.x=Math.sin(tm*1.2)*.1-.15;H.arm.rotation.z=Math.sin(tm*.9)*.05;
  H.crystal.rotation.y=tm*2;H.crystal.rotation.x=tm*1.3;H.sigil.rotation.z=tm*.4;H.sigil.material.opacity=.55+Math.sin(tm*3)*.15;
  PV.pl.position.set(Math.sin(tm)*30,40,40+Math.cos(tm)*10);
  PV.r.render(PV.sc,PV.cm);
}
