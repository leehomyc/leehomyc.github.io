'use strict';
/* gfx.js — three.js scene: materials, world, characters, effect pools, post-processing */
const T3=THREE;
const lin=h=>new T3.Color(h).convertSRGBToLinear();
const U={uTime:{value:0}};
let rn,scene,cam,sun,orbL,comp,finalPass,bloomPass,glowPts,glowN=0,DPR=1,viewK=1,camX=W/2,camZ=H/2,VW=580,VH=400;
let ruins=null,grassMesh,gemMesh,bulletMesh,swordMesh,talisMesh,playerG,hatA,capeM,armG,crystal,feetSigil,bossG,tele,mRing,heartMesh;
const blades=[],inst={},statues=[],mushes=[],ringPool=[],poolPool=[],scorch=[],flashL=[],rays=[],blueMush=[],flies=[],ghostM=[],shrineM=[];
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
  const M=320,TW=PHONE?2048:4096,TH=Math.round(TW*(H+2*M)/(W+2*M)),sx=TW/(W+2*M);
  const k=document.createElement('canvas');k.width=TW;k.height=TH;const g=k.getContext('2d');
  const X=x=>(x+M)*sx,Y=y=>(y+M)*sx;
  g.fillStyle='#355c42';g.fillRect(0,0,TW,TH);
  const blob=(x,y,r,col,a)=>{const G2=g.createRadialGradient(x,y,0,x,y,r);const c=new T3.Color(col),s=`${c.r*255|0},${c.g*255|0},${c.b*255|0}`;G2.addColorStop(0,`rgba(${s},${a})`);G2.addColorStop(.6,`rgba(${s},${a*.55})`);G2.addColorStop(1,`rgba(${s},0)`);g.fillStyle=G2;g.fillRect(x-r,y-r,r*2,r*2)};
  for(let i=0;i<3200;i++)blob(rnd(TW),rnd(TH),rnd(30,220)*sx,pick(['#467a3e','#274d3b','#5a8a44','#2e6047','#73904a','#214a3e','#6b6a40','#3f6b5a']),.3);
  const trail=(pts,w)=>{for(const [lw,a,col] of [[w*1.6,.22,'#5f5a3a'],[w,.45,'#8f7a52'],[w*.5,.5,'#ab9468']]){g.lineWidth=lw*sx;g.strokeStyle=col;g.globalAlpha=a;g.lineCap='round';g.lineJoin='round';g.beginPath();pts.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1])));g.stroke()}g.globalAlpha=1};
  TRAILS.forEach(t=>trail(t.pts,t.w));
  for(const t of TRAILS)for(let i=0;i<t.pts.length*40;i++){const p=t.pts[Math.floor(rnd(t.pts.length))];g.fillStyle=pick(['#6f5f43','#4e5a3a','#a39070','#7c8040']);g.globalAlpha=.3;g.fillRect(X(p[0]+rnd(-t.w,t.w))-1,Y(p[1]+rnd(-t.w,t.w))-1,rnd(1,4),rnd(1,3))}g.globalAlpha=1;
  // plaza
  const cx=X(W/2),cy=Y(H/2);
  g.fillStyle='#2a2c27';g.beginPath();g.arc(cx,cy,(PLAZA_R-6)*sx,0,TAU);g.fill();blob(cx,cy,(PLAZA_R+30)*sx,'#2a2c27',.55);
  for(let ringN=0;ringN<6;ringN++){const r=(20+ringN*22)*sx,n=8+ringN*7;
    for(let i=0;i<n;i++){const a0=i/n*TAU+ringN*.3,a1=a0+TAU/n*.965,th=10.3*sx;
      g.fillStyle=pick(['#6e6d66','#5f615c','#77746a','#55574f','#686a60']);g.beginPath();g.arc(cx,cy,r+th+rnd(-.6,.6),a0,a1);g.arc(cx,cy,r-th,a1,a0,true);g.closePath();g.fill();
      g.strokeStyle='#23251f';g.lineWidth=1.5;g.stroke();for(let q=0;q<9;q++){const a=rnd(a0,a1),d=r+rnd(-th*.8,th*.8);g.fillStyle=pick(['#8b8a7d','#4a4c46','#6a8a4e','#3d3f39']);g.globalAlpha=.45;g.fillRect(cx+Math.cos(a)*d,cy+Math.sin(a)*d,rnd(2,7),rnd(1,4));g.globalAlpha=1}}}
  // pavilion platforms and shrine courts
  PAVS.forEach(p=>{g.fillStyle='#55574f';g.fillRect(X(p[0]-52),Y(p[1]-52),104*sx,104*sx);g.strokeStyle='#23251f';g.lineWidth=2;for(let i=-52;i<=52;i+=26){g.beginPath();g.moveTo(X(p[0]+i),Y(p[1]-52));g.lineTo(X(p[0]+i),Y(p[1]+52));g.stroke();g.beginPath();g.moveTo(X(p[0]-52),Y(p[1]+i));g.lineTo(X(p[0]+52),Y(p[1]+i));g.stroke()}});
  SHRINES.forEach(s=>{blob(X(s[0]),Y(s[1]),46*sx,'#4a4c46',.8);g.strokeStyle='#8b8a7d';g.lineWidth=2;g.globalAlpha=.5;g.beginPath();g.arc(X(s[0]),Y(s[1]),30*sx,0,TAU);g.stroke();g.globalAlpha=1});
  PONDS.forEach(p=>{blob(X(p[0]),Y(p[1]),p[2]*1.45*sx,'#27473c',.85);blob(X(p[0]),Y(p[1]),p[2]*1.2*sx,'#5b5a40',.4)});
  // bamboo litter and maple leaves
  rocks.filter(r=>r.bamboo).forEach(r=>{for(let i=0;i<260;i++){g.fillStyle=pick(['#9aa85a','#c9c478','#6f7f3a']);g.globalAlpha=.5;const x=X(r.x+rnd(-20,r.w+20)),y=Y(r.y+rnd(-20,r.h+20));g.save();g.translate(x,y);g.rotate(rnd(TAU));g.fillRect(-3,-.7,6,1.4);g.restore()}});
  maples.forEach(m=>{for(let i=0;i<90;i++){g.fillStyle=pick(m[3]?['#e8713a','#f0a040','#c9552f']:['#b03a2a','#e85a3a','#8e2a22']);g.globalAlpha=rnd(.4,.85);const a=rnd(TAU),d=rnd(0,40*m[2]);g.fillRect(X(m[0]+Math.cos(a)*d),Y(m[1]+Math.sin(a)*d*.8),2.4,2)}});
  g.globalAlpha=1;
  const n=PHONE?90000:300000;
  for(let i=0;i<n;i++){g.fillStyle=pick(['#1d3c2e','#527a3e','#6f8a48','#25503c','#3f6b40','#6a5d3a']);g.globalAlpha=rnd(.12,.42);const s=rnd(.8,2.6);g.fillRect(rnd(TW),rnd(TH),s,s*rnd(.6,2.4))}
  for(let i=0;i<(PHONE?1500:4200);i++){g.fillStyle=pick(['#e9c95f','#e77a5a','#f0ead2','#c986e0','#ffb44a']);g.globalAlpha=.75;const x=rnd(TW),y=rnd(TH);g.fillRect(x,y,2,2);g.fillRect(x+rnd(-5,5),y+rnd(-5,5),1.6,1.6)}
  g.globalAlpha=1;
  const ed=(x0,y0,x1,y1,rx,ry,rw,rh)=>{const G2=g.createLinearGradient(X(x0),Y(y0),X(x1),Y(y1));G2.addColorStop(0,'rgba(18,30,34,.96)');G2.addColorStop(1,'rgba(18,30,34,0)');g.fillStyle=G2;g.fillRect(X(rx),Y(ry),rw*sx,rh*sx)};
  ed(-120,0,40,0,-M,-M,M+40,H+2*M);ed(W+120,0,W-40,0,W-40,-M,M+40,H+2*M);ed(0,-120,0,40,-M,-M,W+2*M,M+40);ed(0,H+120,0,H-40,-M,H-40,W+2*M,M+40);
  // normal map
  const NW=PHONE?1024:2048,NH=Math.round(NW*TH/TW),nk=document.createElement('canvas');nk.width=NW;nk.height=NH;const ng=nk.getContext('2d');ng.drawImage(k,0,0,NW,NH);
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
  const under=new T3.Mesh(new T3.PlaneGeometry(12000,12000),new T3.MeshBasicMaterial({color:lin('#122026')}));under.rotation.x=-Math.PI/2;under.position.set(W/2,-1,H/2);scene.add(under);
}
function buildPonds(){
  const m=new T3.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:U.uTime},
    vertexShader:'varying vec2 vU;varying vec3 vW;void main(){vU=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:`varying vec2 vU;varying vec3 vW;uniform float uTime;
    float wave(vec2 p){return sin(p.x*.26+uTime*1.1)*.5+sin(p.y*.33-uTime*1.4)*.35+sin((p.x+p.y)*.51+uTime*.9)*.25+sin((p.x-p.y)*.83-uTime*1.7)*.12;}
    void main(){float d=length(vU-.5)*2.;float a=smoothstep(1.,.86,d);
      vec2 p=vW.xz;float e=.9;float n=wave(p),nx=wave(p+vec2(e,0.))-n,ny=wave(p+vec2(0.,e))-n;
      vec3 N=normalize(vec3(-nx*.9,1.,-ny*.9));vec3 V=normalize(cameraPosition-vW),S=normalize(vec3(-.58,.62,.53));
      float F=.05+.95*pow(1.-max(dot(N,V),0.),4.);float spec=pow(max(dot(reflect(-S,N),V),0.),70.);
      vec3 deep=vec3(.012,.08,.10),sky=vec3(.42,.6,.72);
      vec3 c=mix(deep,sky,F*1.1+.1)+vec3(1.6,1.25,.85)*spec*2.;
      c+=vec3(.5,.8,.7)*smoothstep(.97,.8,d)*smoothstep(.72,.9,d)*.14*(.6+.4*sin(uTime+p.x*.1));
      gl_FragColor=vec4(c,a*.93);}`});
  PONDS.forEach(p=>{const q=new T3.Mesh(new T3.PlaneGeometry(1,1),m);q.rotation.x=-Math.PI/2;q.scale.set(p[2]*2,p[3]*2,1);q.position.set(p[0],.4,p[1]);scene.add(q)});
}

/* ---------- vegetation and architecture ---------- */
function buildWorld(){
  const leaf=mat('wind',{rough:.85,rim:'#ffdca8',rimI:.22,windY:'0.035'}),wood=mat('plain',{rough:.9,rimI:.15}),stone=mat('plain',{rough:.92,rimI:.18,rim:'#ffe4c0'}),lacquer=mat('plain',{rough:.45,metal:.05,rimI:.3,rim:'#ffc9a0'});
  const inst2=(geo,m,list,shadow=true)=>{const im=new T3.InstancedMesh(geo,m,list.length);list.forEach((p,i)=>{dummy.position.set(p[0],p[1]||0,p[2]);dummy.rotation.set(0,p[3]||0,0);const k=p[4]||1;dummy.scale.set(k,p[5]||k,k);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);const lv=p[6]||1;im.setColorAt(i,new T3.Color(lv,lv,lv))});im.castShadow=shadow;im.receiveShadow=true;im.frustumCulled=false;scene.add(im);return im};
  // pines and bamboo forest outside the walls
  const pine=merge([part(CYL(2.6,4.5,40,8),'#3a2a22',{p:[0,20,0]}),part(CONE(22,30,9),'#17382c',{p:[0,44,0],top:'#2f6a48'}),part(CONE(17,26,9),'#1a3f30',{p:[0,62,0],top:'#3a7a52'}),part(CONE(11,22,9),'#1e4634',{p:[0,78,0],top:'#4a8a5c'})]);
  const pines=[];for(let i=0;i<230;i++){const s=i%4;let x,z;if(s===0){x=rnd(-300,W+300);z=rnd(-290,-16)}else if(s===1){x=rnd(-300,W+300);z=rnd(H+40,H+300)}else if(s===2){x=rnd(-290,-16);z=rnd(-60,H+80)}else{x=rnd(W+16,W+290);z=rnd(-60,H+80)}const k=rnd(.7,1.4);pines.push([x,0,z,rnd(TAU),k,k*rnd(.9,1.3),rnd(.7,1.1)])}
  inst2(pine,leaf,pines);
  const stalk=(ox,oz,h,lean)=>{const p=[part(CYL(.9,1.25,h,6),'#6f9a3f',{p:[ox,h/2,oz],r:[lean,0,lean*.6],top:'#aacb5e'})];for(let y=12;y<h;y+=13)p.push(part(CYL(1.35,1.35,.9,6),'#4a7426',{p:[ox+lean*y*.5,y,oz+lean*y*.3]}));for(let i=0;i<5;i++)p.push(part(BOX(.5,.12,8),'#5b9636',{p:[ox+lean*h*.5+rnd(-5,5),h-rnd(2,24),oz+lean*h*.3+rnd(-5,5)],r:[rnd(-.4,.4),rnd(TAU),rnd(-.5,.5)],top:'#9fd04c'}));return p};
  const bam=merge([...stalk(0,0,72,.05),...stalk(5,3,60,-.04),...stalk(-4,4,82,.03),...stalk(2,-5,56,.06)]);
  const bl=[];
  rocks.filter(r=>r.bamboo).forEach(r=>{const n=Math.round(r.w*r.h/260);for(let i=0;i<n;i++)bl.push([r.x+rnd(-6,r.w+6),0,r.y+rnd(-6,r.h+6),rnd(TAU),rnd(.7,1.2),rnd(.8,1.3),rnd(.8,1.15)])});
  for(let i=0;i<420;i++){const s=i%4;let x,z;if(s===0){x=rnd(-200,W+200);z=rnd(-200,-10)}else if(s===1){x=rnd(-200,W+200);z=rnd(H+10,H+200)}else if(s===2){x=rnd(-200,-10);z=rnd(0,H)}else{x=rnd(W+10,W+200);z=rnd(0,H)}bl.push([x,0,z,rnd(TAU),rnd(.8,1.3),rnd(.9,1.4),rnd(.8,1.1)])}
  inst2(bam,mat('wind',{rough:.8,rimI:.2,windY:'0.05'}),bl);
  // maples
  const mapleG=(c1,c2)=>merge([part(CYL(2.4,4.2,30,8),'#3a2620',{p:[0,15,0],top:'#5a3b2c'}),part(CYL(1.5,2.4,16,6),'#3a2620',{p:[7,28,1],r:[0,0,-.9]}),part(CYL(1.4,2.2,14,6),'#3a2620',{p:[-6,31,-1],r:[0,0,.8]}),
    part(lump(20,2,.32,1.15,.8,1.15),c1,{p:[0,44,0],top:c2}),part(lump(14,2,.32),c1,{p:[14,36,4],top:c2}),part(lump(13,2,.32),c1,{p:[-13,39,-5],top:c2}),part(lump(10,2,.3),c1,{p:[2,58,1],top:c2})]);
  const m0=maples.filter(m=>!m[3]).map(m=>[m[0],0,m[1],rnd(TAU),m[2],m[2]*rnd(.9,1.2),rnd(.9,1.15)]),m1=maples.filter(m=>m[3]).map(m=>[m[0],0,m[1],rnd(TAU),m[2],m[2]*rnd(.9,1.2),rnd(.9,1.15)]);
  if(m0.length)inst2(mapleG('#8e2a22','#e8713a'),leaf,m0);if(m1.length)inst2(mapleG('#a84a22','#f0a040'),leaf,m1);
  // low hedge on the camera-facing edge
  const bush=merge([part(lump(11,1,.4,1.2,.8,1),'#1f5140',{p:[0,8,0],top:'#6aa853'}),part(lump(8,1,.4),'#1f5140',{p:[10,6,3],top:'#6aa853'})]);
  const bl2=[];for(let i=0;i<160;i++)bl2.push([rnd(-60,W+60),0,H-4+rnd(0,70),rnd(TAU),rnd(.8,1.5),rnd(.8,1.5),rnd(.8,1.1)]);inst2(bush,leaf,bl2);
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
    pparts.push(part(CONE(84,24,4),'#1f2a2a',{p:[cx,62,cz],r:[0,Math.PI/4,0],top:'#3a4a48'}),part(CONE(44,16,4),'#1f2a2a',{p:[cx,82,cz],r:[0,Math.PI/4,0],top:'#3a4a48'}),part(SPH(3.5,10,8),'#d9a641',{p:[cx,92,cz],emit:'#ffd27a',ei:2}));
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
  const clearSpot=()=>{for(let i=0;i<200;i++){const x=rnd(40,W-40),z=rnd(40,H-40);if(hyp(x-W/2,z-H/2)>PLAZA_R+14&&!onPond(x,z,1.2)&&!blocked(x,z))return [x,z]}return [40,40]};
  const peb=[];for(let i=0;i<220;i++){const sp=clearSpot();peb.push([sp[0],.6,sp[1],rnd(TAU),rnd(.5,2.2)])}inst2(merge([part(lump(3,1,.5,1,.6,1),'#7c7f7f',{top:'#a3a58f'})]),stone,peb);
  const fun=merge([part(CYL(.9,1.4,6,6),'#d9e6e0',{p:[0,3,0]}),part(SPH(3.6,10,6),'#2ba6c9',{p:[0,6.4,0],s:[1,.55,1],emit:'#32d4ff',ei:1.5}),part(CYL(.6,1,4,6),'#d9e6e0',{p:[4,2,2]}),part(SPH(2.2,10,6),'#2ba6c9',{p:[4,4.2,2],s:[1,.55,1],emit:'#32d4ff',ei:1.5})]);
  const fl=[];for(let i=0;i<110;i++){const sp=clearSpot(),k=rnd(.8,1.7);fl.push([sp[0],0,sp[1],rnd(TAU),k]);blueMush.push([sp[0],6*k,sp[1],k,rnd(TAU)])}inst2(fun,stone,fl);
  for(let i=0;i<(PHONE?120:320);i++)flies.push({x:rnd(30,W-30),z:rnd(30,H-30),h:rnd(4,46),p:rnd(TAU),s:rnd(.4,1.2),warm:Math.random()<.5,leaf:Math.random()<.3});
  // sun shafts
  const rt=(()=>{const k=document.createElement('canvas');k.width=64;k.height=256;const g=k.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.25,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,256);g.globalCompositeOperation='destination-in';const gx=g.createLinearGradient(0,0,64,0);gx.addColorStop(0,'rgba(0,0,0,0)');gx.addColorStop(.5,'#000');gx.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gx;g.fillRect(0,0,64,256);return new T3.CanvasTexture(k)})();
  for(let i=0;i<(PHONE?3:7);i++){const m=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({map:rt,color:lin('#ffdfae'),transparent:true,opacity:.05,blending:T3.AdditiveBlending,depthWrite:false,side:T3.DoubleSide,fog:false}));m.userData={ox:rnd(-260,260),oz:rnd(-180,180),w:rnd(40,110),p:rnd(TAU)};scene.add(m);rays.push(m)}
}
function buildGrass(){
  if(grassMesh){scene.remove(grassMesh);grassMesh.geometry.dispose()}
  const P=[],N=[],C=[],Eg=[],Lg=[];const root=lin('#173a2c'),tips=[lin('#7ea04c'),lin('#5d9150'),lin('#a5a556')];
  for(let b=0;b<7;b++){const a=rnd(TAU),ox=rnd(-3.2,3.2),oz=rnd(-3.2,3.2),h=rnd(5,11),w=rnd(.7,1.15),lean=rnd(1,3.5),cx=Math.cos(a),cz=Math.sin(a),tip=pick(tips);
    const v=[[ox-cx*w,0,oz-cz*w],[ox+cx*w,0,oz+cz*w],[ox+cz*lean*.5-cx*w*.5,h*.6,oz-cx*lean*.5-cz*w*.5],[ox+cz*lean*.5+cx*w*.5,h*.6,oz-cx*lean*.5+cz*w*.5],[ox+cz*lean,h,oz-cx*lean]];
    [[0,1,2],[1,3,2],[2,3,4]].forEach(tri=>tri.forEach(i=>{P.push(...v[i]);N.push(0,1,0);const k=v[i][1]/h;C.push(root.r+(tip.r-root.r)*k,root.g+(tip.g-root.g)*k,root.b+(tip.b-root.b)*k);Eg.push(0,0,0);Lg.push(0,0)}))}
  const g=new T3.BufferGeometry();g.setAttribute('position',new T3.Float32BufferAttribute(P,3));g.setAttribute('normal',new T3.Float32BufferAttribute(N,3));g.setAttribute('color',new T3.Float32BufferAttribute(C,3));g.setAttribute('aEmit',new T3.Float32BufferAttribute(Eg,3));g.setAttribute('aLimb',new T3.Float32BufferAttribute(Lg,2));
  const cnt=PHONE?7000:30000,M=new T3.InstancedMesh(g,mat('wind',{lambert:true,windY:'0.16',m:{side:T3.DoubleSide}}),cnt);
  let n=0;for(let i=0;i<cnt*3&&n<cnt;i++){const x=rnd(22,W-22),z=rnd(22,H-22);if(hyp(x-W/2,z-H/2)<PLAZA_R+6||onPond(x,z)||blocked(x,z)||onTrail(x,z,-4)||PAVS.some(p=>Math.abs(x-p[0])<54&&Math.abs(z-p[1])<54))continue;
    const k=rnd(.6,1.2);dummy.position.set(x,0,z);dummy.rotation.set(0,rnd(TAU),0);dummy.scale.set(k,k*rnd(.75,1.25),k);dummy.updateMatrix();M.setMatrixAt(n++,dummy.matrix)}
  M.count=n;M.receiveShadow=true;M.frustumCulled=false;grassMesh=M;scene.add(M);
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
      const edge=i===0||j===0||i===nx-1||j===nz-1,hh=edge?rnd(12,26):rnd(18,34),x=r.x+(i+.5)*cw,z=r.y+(j+.5)*cd,c=pick(['#7d8188','#8a8a88','#6f7480','#93908a']);
      parts.push(part(rock(cw+.8,hh,cd+.8,.09),c,{p:[x,hh/2,z],moss:.6,top:'#5c8246',jit:.05}));
      if(Math.random()<.45){const h2=rnd(8,16);parts.push(part(rock(cw*.9,h2,cd*.85,.14),c,{p:[x+rnd(-1,1),hh+h2/2-1,z+rnd(-1,1)],moss:.55,top:'#6c9a55',jit:.05}))}
    }
    if(r.w>44&&r.h>38){const cx=r.x+r.w*rnd(.25,.75),cz=r.y+r.h*rnd(.25,.75),h=rnd(24,42);parts.push(part(CYL(5,6,h,12),'#a09d94',{p:[cx,34+h/2,cz],top:'#c0bcae',jit:.02}),part(CYL(7.5,7.5,3,12),'#8b8981',{p:[cx,35,cz]}))}
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
    part(CYL(.9,.8,5,6),'#1d1a26',{p:[1.5,2.5,0],limb:1,hip:5}),part(CYL(.9,.8,5,6),'#1d1a26',{p:[-1.5,2.5,0],limb:-1,hip:5})]),440,'assassin',mA);
  // bandit
  E(merge([part(CYL(3.6,4.2,8,10),'#c38a60',{p:[0,12,0],top:'#d9a476'}),part(CYL(4.3,4.6,7,10),'#4a3326',{p:[0,12.2,-.6],s:[1,1,.75]}),part(CYL(4.3,4.5,1.6,10),'#2a1a14',{p:[0,8.2,0]}),part(BOX(1.6,1.2,.6),'#d9a641',{p:[0,8.2,4.4],emit:'#6a4a10',ei:.6}),part(CYL(4.2,3.6,5,10),'#2f2b33',{p:[0,5.5,0]}),
    part(SPH(3.2,10,8),'#c38a60',{p:[0,19.5,0]}),part(SPH(3.35,12,8),'#b8322b',{p:[0,20.3,-.3],s:[1,.6,1]}),part(BOX(1,4.5,.4),'#b8322b',{p:[-2.2,18,-3],r:[.3,0,.4]}),...eyes(1.2,19.5,2.9,'#ffd14a',.6,5),part(BOX(.35,2.4,.2),'#7a3a3a',{p:[1.8,18.3,3.05]}),
    part(CYL(1.3,1.1,8,7),'#c38a60',{p:[5.2,14.5,1.5],r:[1.0,0,-.3],limb:1,hip:18}),part(BOX(1.5,.35,13),'#cfd6de',{p:[6,16.5,8],r:[.25,0,0],emit:'#9fc8ff',ei:.35,limb:1,hip:18}),part(CYL(.5,.5,4,6),'#3a2a1a',{p:[6,15.8,1.8],r:[1.57,0,0],limb:1,hip:18}),
    part(CYL(1.3,1.1,8,7),'#c38a60',{p:[-5.2,13.5,1],r:[.9,0,.3],limb:-1,hip:18}),
    part(CYL(1.7,1.5,6,7),'#2f2b33',{p:[2,3,0],limb:1,hip:6}),part(CYL(1.7,1.5,6,7),'#2f2b33',{p:[-2,3,0],limb:-1,hip:6}),part(BOX(3.2,1.6,4.6),'#1d1510',{p:[2,.8,.8],limb:1,hip:6}),part(BOX(3.2,1.6,4.6),'#1d1510',{p:[-2,.8,.8],limb:-1,hip:6})]),440,'bandit',mA);
  // archer
  const bow=new T3.TorusGeometry(6,.35,6,16,Math.PI);
  E(merge([part(CYL(2.8,4.6,12,10),'#4d5a3a',{p:[0,9,0],top:'#6e7d4e'}),part(CYL(3,3,1,10),'#2a1a14',{p:[0,8.5,0]}),part(SPH(3,10,8),'#d8a878',{p:[0,17,0]}),...eyes(1.1,17.2,2.7,'#9ff06a',.55,6),part(CONE(7.5,3.4,12),'#c8a86c',{p:[0,20.4,0],top:'#e3c98e'}),part(CYL(7.6,7.6,.4,12),'#8a6a3a',{p:[0,18.9,0]}),
    part(bow,'#5a3a22',{p:[-4.5,11,3],r:[0,1.5708,1.5708],limb:-1,hip:18}),part(BOX(.18,12,.18),'#e8e4d8',{p:[-4.5,11,3],limb:-1,hip:18}),part(CYL(1,.9,7,7),'#4d5a3a',{p:[-4,13,1],r:[1.1,0,.2],limb:-1,hip:18}),
    part(CYL(1,.9,7,7),'#4d5a3a',{p:[3.8,13,1.5],r:[1.2,0,-.3],limb:1,hip:18}),part(CYL(1.3,1.3,8,6),'#3a2a1a',{p:[2.6,13,-3.6],r:[.3,0,-.3]}),part(SPH(1.6,8,6),'#e8c45a',{p:[3.6,17.2,-4.4],emit:'#ffd27a',ei:.5}),
    part(CYL(1.3,1.1,5,6),'#2f2b33',{p:[1.6,2.5,0],limb:1,hip:5}),part(CYL(1.3,1.1,5,6),'#2f2b33',{p:[-1.6,2.5,0],limb:-1,hip:5})]),180,'archer',mA);
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
  const bb=new T3.Mesh(body,bm);bb.castShadow=true;bossG.add(bb);
  const bladeG=swordGeo('#3a0a10','#cfd3d8','#ff2040');
  for(let i=0;i<9;i++){const a=i/9*TAU,g=new T3.Group();const m=new T3.Mesh(bladeG,bm);m.scale.set(1.6,1.6,1.6);m.castShadow=true;g.add(m);bossG.add(g);blades.push({g,a,p:rnd(TAU)})}
  const basic=()=>new T3.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  gemMesh=new T3.InstancedMesh(new T3.OctahedronGeometry(2.6,0),basic(),380);for(let i=0;i<380;i++)gemMesh.setColorAt(i,new T3.Color(1,1,1));gemMesh.count=0;gemMesh.frustumCulled=false;scene.add(gemMesh);
  bulletMesh=new T3.InstancedMesh(merge([part(BOX(.9,.35,8),'#3a0a10',{top:'#ff8a9a',emit:'#ff2040',ei:2.5}),part(CONE(.9,2.4,5),'#ffd0d8',{p:[0,0,5],r:[1.5708,0,0],emit:'#ff6070',ei:3})]),mat('plain',{rimI:0,m:{toneMapped:false}}),290);for(let i=0;i<290;i++)bulletMesh.setColorAt(i,new T3.Color(1,1,1));bulletMesh.count=0;bulletMesh.frustumCulled=false;scene.add(bulletMesh);
  swordMesh=new T3.InstancedMesh(swordGeo('#9fb4c4','#eef4ff','#9fe3f0'),mat('plain',{rough:.3,metal:.6,rimI:.6,rim:'#ffffff'}),280);for(let i=0;i<280;i++)swordMesh.setColorAt(i,new T3.Color(1,1,1));swordMesh.count=0;swordMesh.frustumCulled=false;swordMesh.castShadow=true;scene.add(swordMesh);
  talisMesh=new T3.InstancedMesh(merge([part(BOX(4.2,.3,6),'#e8c45a',{top:'#fff0b0',emit:'#ffd75a',ei:.9}),part(BOX(1,.5,4),'#b8322b',{p:[0,0,.2],emit:'#ff4030',ei:1.5})]),mat('plain',{rimI:0}),40);for(let i=0;i<40;i++)talisMesh.setColorAt(i,new T3.Color(1,1,1));talisMesh.count=0;talisMesh.frustumCulled=false;scene.add(talisMesh);
}
const HEROES={player:null,rival:null};
function buildHero(cls='swordsman',slot='player'){
  const old=HEROES[slot];
  if(old&&old.cls===cls)return old;
  if(old){scene.remove(old.g);scene.remove(old.sigil);if(slot==='player'){ghostM.forEach(g=>scene.remove(g));ghostM.length=0}}
  const h=buildHeroModel(cls,slot);HEROES[slot]=h;
  if(slot==='player'){playerG=h.g;hatA=h.hat;armG=h.arm;crystal=h.crystal;capeM=h.cape;feetSigil=h.sigil}
  return h;
}
function buildHeroModel(cls,slot){
  const m=mat('plain',{rough:.7,metal:.02,rimI:.28,rim:'#bff4e6'});
  const V={swordsman:{robe:'#ece7d8',robeT:'#f8f5ee',collar:'#2c4f6b',sash:'#b8322b',sleeve:'#ece7d8',cape:'#24405a',capeT:'#3f6a86',gem:[3,9,11]},
           taoist:{robe:'#3a4e66',robeT:'#5b7a9a',collar:'#d9a641',sash:'#d9a641',sleeve:'#3a4e66',cape:'#2a3a52',capeT:'#4a6a8a',gem:[11,7,2]},
           blademaster:{robe:'#4a2420',robeT:'#8a3a2c',collar:'#2a1a14',sash:'#1a1a1a',sleeve:'#c38a60',cape:'#3a1a16',capeT:'#6a2a22',gem:[11,4,1.5]}}[cls];
  const grp=new T3.Group();grp.userData.cls=cls;scene.add(grp);
  const robeGeo=merge([part(CYL(3.6,10.6,18,18),V.robe,{p:[0,9,0],top:V.robeT}),part(CYL(3.8,3.9,2.2,18),V.collar,{p:[0,16.9,0]}),part(CYL(6.2,6.6,2.4,18),V.sash,{p:[0,10.8,0],emit:cls==='taoist'?'#6a4a10':'#5a0d0a',ei:.3}),part(BOX(1.6,9,.5),V.sash,{p:[1.5,5.5,6.4],r:[-.28,0,0]}),part(BOX(1.6,8,.5),V.sash,{p:[-1.5,6,6.3],r:[-.28,0,0]}),
    part(SPH(5,16,12),'#f1cfa8',{p:[0,21.5,0]}),part(SPH(5.35,14,10),'#16121a',{p:[0,22.4,-1.5],s:[1,.95,.9]}),part(SPH(2.1,10,8),'#16121a',{p:[0,27.6,-1.8]}),part(CYL(.35,.35,9,6),'#d9a641',{p:[0,27.8,-1.8],r:[0,0,1.5708],emit:'#6a4a10',ei:.5}),
    part(SPH(.75,8,6),'#15141a',{p:[1.8,22,4.6]}),part(SPH(.75,8,6),'#15141a',{p:[-1.8,22,4.6]}),part(BOX(2,.45,.5),'#15141a',{p:[1.8,23.6,4.4],r:[0,0,-.22]}),part(BOX(2,.45,.5),'#15141a',{p:[-1.8,23.6,4.4],r:[0,0,.22]}),
    ...(cls==='blademaster'?[part(BOX(2.6,1.4,.6),'#3a2a22',{p:[0,19.6,4.4]})]:[]),
    part(CYL(2,3.6,8,10),V.sleeve,{p:[-7.4,14,1],r:[.6,0,.3],top:V.sleeve}),part(SPH(1.7,10,7),'#f1cfa8',{p:[-8.6,10.6,3.6]})]);
  const rb=new T3.Mesh(robeGeo,m);rb.castShadow=true;grp.add(rb);
  const cg=new T3.PlaneGeometry(13,17,8,8);cg.translate(0,-8.5,0);
  const cape=new T3.Mesh(merge([part(cg,V.cape,{top:V.capeT})]),mat('plain',{rough:.8,rimI:.3,m:{side:T3.DoubleSide}}));cape.position.set(0,18,-4.6);cape.rotation.x=.12;cape.castShadow=true;grp.add(cape);
  const hat=new T3.Group();hat.position.set(0,25.4,0);grp.add(hat);
  let hatGeo;
  if(cls==='swordsman')hatGeo=merge([part(CONE(12.6,5.4,20),'#c8a86c',{p:[0,2.7,0],top:'#e6cf96'}),part(CYL(12.7,12.7,.5,20),'#8a6a3a',{p:[0,.1,0]}),part(CONE(1.6,2.4,8),'#8a6a3a',{p:[0,6.4,0]})]);
  else if(cls==='taoist')hatGeo=merge([part(CYL(2.6,2.2,3,8),'#1a1a22',{p:[0,2.8,-1.8],top:'#2e2e3a'}),part(BOX(2.2,1.6,1.2),'#d9a641',{p:[0,3.4,.4],emit:'#6a4a10',ei:.6}),part(CYL(.3,.3,7,6),'#d9a641',{p:[0,3.2,-1.8],r:[0,0,1.5708]})]);
  else hatGeo=merge([part(SPH(5.5,14,10),'#b8322b',{p:[0,-2.2,-.6],s:[1,.5,1]}),part(BOX(1.2,6,.5),'#b8322b',{p:[-3.5,-4.5,-4],r:[.4,0,.5]}),part(BOX(1.2,5,.5),'#b8322b',{p:[-4.4,-4.8,-3.6],r:[.5,0,.9]})]);
  const hatM=new T3.Mesh(hatGeo,mat('plain',{rough:.8,rimI:.25}));hatM.castShadow=true;hat.add(hatM);
  const arm=new T3.Group();arm.position.set(7.2,15,1.5);grp.add(arm);
  let weapon;
  if(cls==='swordsman')weapon=[part(BOX(4.6,.8,.9),'#d9a641',{p:[1.2,.6,5.4],emit:'#6a4a10',ei:.5}),part(CYL(.6,.6,5,6),'#2a1a14',{p:[1.2,-2.4,5.4]}),part(SPH(.9,8,6),'#d9a641',{p:[1.2,-5.1,5.4]}),part(BOX(1.1,22,.32),'#dfe6ee',{p:[1.2,11.8,5.4],top:'#ffffff',emit:'#88c8ff',ei:.35}),part(BOX(.4,20,.45),'#ffffff',{p:[1.2,11.5,5.4],emit:'#9fe3f0',ei:1.2})];
  else if(cls==='taoist')weapon=[part(CYL(.5,.6,18,6),'#5a3a22',{p:[1.2,6,5.4],top:'#8a5a32'}),part(CYL(1,1,1.2,8),'#d9a641',{p:[1.2,15.2,5.4],emit:'#6a4a10',ei:.5}),part(CONE(2.4,11,10),'#f4efe0',{p:[1.2,20.4,5.4],top:'#ffffff',emit:'#ffd27a',ei:.25}),part(SPH(1.1,8,6),'#d9a641',{p:[1.2,-3.2,5.4]})];
  else weapon=[part(BOX(5,1,1),'#d9a641',{p:[1.2,.6,5.4],emit:'#6a4a10',ei:.5}),part(CYL(.7,.7,7,6),'#2a1a14',{p:[1.2,-3.2,5.4]}),part(BOX(2.6,20,.4),'#d7dde6',{p:[1.6,11,5.4],top:'#ffffff',emit:'#ffb080',ei:.3}),part(BOX(.6,19,.5),'#ffffff',{p:[2.4,10.8,5.4],emit:'#ff9c5a',ei:1}),part(BOX(.5,4,.5),'#b8322b',{p:[1.2,-7.5,5.4]})];
  const armM=new T3.Mesh(merge([part(CYL(2,3.8,8,10),V.sleeve,{p:[-.6,-1,1.5],r:[.8,0,-.25],top:V.sleeve}),part(SPH(1.8,10,7),'#f1cfa8',{p:[1.2,-1,4.2]}),...weapon]),m);armM.castShadow=true;arm.add(armM);
  const cry=new T3.Mesh(new T3.OctahedronGeometry(1.6,1),new T3.MeshBasicMaterial({color:new T3.Color(...V.gem)}));cry.position.set(1.2,cls==='taoist'?26:23.6,5.4);arm.add(cry);
  const sigil=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({map:sigilTex(),transparent:true,opacity:.75,blending:T3.AdditiveBlending,depthWrite:false,color:new T3.Color(.55,1.6,1.8)}));sigil.rotation.x=-Math.PI/2;sigil.scale.set(slot==='player'?50:36,slot==='player'?50:36,1);scene.add(sigil);
  if(slot==='player')for(let i=0;i<14;i++){const gm=new T3.Mesh(robeGeo,new T3.MeshBasicMaterial({color:new T3.Color(.6,2.4,3),transparent:true,opacity:.5,blending:T3.AdditiveBlending,depthWrite:false}));gm.visible=false;gm.scale.set(.9,.9,.9);scene.add(gm);ghostM.push(gm)}
  return {g:grp,hat,arm,crystal:cry,cape,sigil,cls,slot,gem:V.gem};
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
function glow(x,y,z,col,size,b=1){if(glowN>=GMAX)return;const c=rgb(col),i=glowN++;gPos[i*3]=x;gPos[i*3+1]=y;gPos[i*3+2]=z;gCol[i*3]=c[0]*b;gCol[i*3+1]=c[1]*b;gCol[i*3+2]=c[2]*b;gSz[i]=size}
function buildGlow(){
  const g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(gPos,3).setUsage(T3.DynamicDrawUsage));g.setAttribute('aColor',new T3.BufferAttribute(gCol,3).setUsage(T3.DynamicDrawUsage));g.setAttribute('aSize',new T3.BufferAttribute(gSz,1).setUsage(T3.DynamicDrawUsage));
  const m=new T3.ShaderMaterial({transparent:true,depthWrite:false,blending:T3.AdditiveBlending,uniforms:{uScale:{value:800}},
    vertexShader:'attribute float aSize;attribute vec3 aColor;varying vec3 vC;uniform float uScale;void main(){vC=aColor;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=min(aSize*uScale/-mv.z,360.);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;float a=max(0.,1.-d);a=a*a*.42+pow(a,5.)*1.15;if(a<.004)discard;gl_FragColor=vec4(vC*a,1.);}'});
  glowPts=new T3.Points(g,m);glowPts.frustumCulled=false;glowPts.renderOrder=5;scene.add(glowPts);
}
function buildFxPools(){
  const rg=new T3.RingGeometry(.9,1,64);rg.rotateX(-Math.PI/2);
  for(let i=0;i<70;i++){const m=new T3.Mesh(rg,new T3.MeshBasicMaterial({transparent:true,blending:T3.AdditiveBlending,depthWrite:false,side:T3.DoubleSide}));m.visible=false;m.renderOrder=3;scene.add(m);ringPool.push(m)}
  const pt=radial([[0,'rgba(255,255,255,.95)'],[.55,'rgba(255,255,255,.55)'],[.82,'rgba(255,255,255,.75)'],[.93,'rgba(255,255,255,.25)'],[1,'rgba(255,255,255,0)']]),cg=new T3.PlaneGeometry(1,1);cg.rotateX(-Math.PI/2);
  for(let i=0;i<48;i++){const m=new T3.Mesh(cg,new T3.MeshBasicMaterial({map:pt,transparent:true,blending:T3.AdditiveBlending,depthWrite:false}));m.visible=false;m.renderOrder=2;scene.add(m);poolPool.push(m)}
  const sc=radial([[0,'rgba(8,4,3,.92)'],[.5,'rgba(14,8,5,.72)'],[1,'rgba(14,8,5,0)']]);
  for(let i=0;i<30;i++){const m=new T3.Mesh(cg,new T3.MeshBasicMaterial({map:sc,transparent:true,depthWrite:false}));m.visible=false;m.renderOrder=1;m.position.y=.32;scene.add(m);scorch.push({m,t:0})}
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
  if(rn.capabilities.isWebGL2&&T3.WebGLMultisampleRenderTarget&&!PHONE){target=new T3.WebGLMultisampleRenderTarget(4,4,pars);target.samples=4}else target=new T3.WebGLRenderTarget(4,4,pars);
  comp=new T3.EffectComposer(rn,target);
  comp.addPass(new T3.RenderPass(scene,cam));
  bloomPass=new T3.UnrealBloomPass(new T3.Vector2(512,512),PHONE?.5:.62,.72,1.02);comp.addPass(bloomPass);
  finalPass=new T3.ShaderPass({uniforms:{tDiffuse:{value:null},uTime:U.uTime,uHurt:{value:0},uLow:{value:0},uTilt:{value:PHONE?0:1},uFade:{value:1},uDark:{value:0},uFlash:{value:0},uAspect:{value:1.78},uS0:{value:new T3.Vector4(0,0,0,0)},uS1:{value:new T3.Vector4(0,0,0,0)},uS2:{value:new T3.Vector4(0,0,0,0)},uCA:{value:0}},
    vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`varying vec2 vU;uniform sampler2D tDiffuse;uniform float uTime,uHurt,uLow,uTilt,uFade,uDark,uFlash,uAspect,uCA;uniform vec4 uS0,uS1,uS2;
    vec3 aces(vec3 x){x*=.82;return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
    float rand(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    vec2 shockUV(vec2 uv,vec4 S,inout float w){if(S.w==0.)return uv;vec2 d=(uv-S.xy)*vec2(uAspect,1.);float L=length(d);float k=smoothstep(S.z-.09,S.z,L)*smoothstep(S.z+.09,S.z,L);w+=k;return uv-normalize(d+1e-5)*k*S.w/vec2(uAspect,1.);}
    void main(){vec2 uv=vU;float sw=0.;uv=shockUV(uv,uS0,sw);uv=shockUV(uv,uS1,sw);uv=shockUV(uv,uS2,sw);
      vec2 c=uv-.5;float e=dot(c,c);
      float blur=smoothstep(.3,.56,abs(uv.y-.47))*uTilt;vec3 col;
      if(blur>.002){vec3 s=vec3(0.);float r=blur*.0028;for(int i=0;i<8;i++){float a=float(i)*.7854;s+=texture2D(tDiffuse,uv+vec2(cos(a),sin(a)*1.7)*r).rgb;}col=(s+texture2D(tDiffuse,uv).rgb)/9.;}
      else{float ca=e*.0035+uCA*.012+sw*.012;col=vec3(texture2D(tDiffuse,uv+c*ca).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-c*ca).b);}
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
  rn.shadowMap.enabled=true;rn.shadowMap.type=T3.PCFSoftShadowMap;rn.toneMapping=T3.NoToneMapping;rn.outputEncoding=T3.LinearEncoding;
  scene=new T3.Scene();const fogC=lin('#7d9a98');scene.background=fogC;scene.fog=new T3.Fog(fogC,560,1500);
  cam=new T3.PerspectiveCamera(32,1,20,3600);
  scene.add(new T3.HemisphereLight(lin('#a9c8ff'),lin('#3d5436'),.46));
  sun=new T3.DirectionalLight(lin('#ffc58a'),1.85);sun.castShadow=true;sun.shadow.mapSize.set(PHONE?1024:4096,PHONE?1024:4096);sun.shadow.bias=-.0004;sun.shadow.normalBias=.8;sun.shadow.radius=PHONE?2:3.5;scene.add(sun,sun.target);
  orbL=new T3.PointLight(lin('#6fe3ff'),1.5,150,1.6);scene.add(orbL);
  buildArena();
  paintGround();buildPonds();buildWorld();buildCreatures();buildFxPools();buildGlow();buildPost();
}
function resize(){
  const r=$('#stage').getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);
  rn.setPixelRatio(1);rn.setSize(Math.round(w*DPR),Math.round(h*DPR),false);cv.style.width='100%';cv.style.height='100%';
  comp.setSize(Math.round(w*DPR),Math.round(h*DPR));
  ov.width=Math.round(w*Math.min(devicePixelRatio||1,2));ov.height=Math.round(h*Math.min(devicePixelRatio||1,2));
  cam.aspect=w/h;viewK=Math.max(1.5,280/(218*cam.aspect));
  const vh0=218*viewK;VW=vh0*cam.aspect;VH=vh0/.82;
  glowPts.material.uniforms.uScale.value=(h*DPR)/(2*Math.tan(cam.fov*Math.PI/360));
  finalPass.uniforms.uAspect.value=w/h;
  const sz=Math.max(280,VW*.8);const s=sun.shadow.camera;s.left=-sz;s.right=sz;s.top=sz;s.bottom=-sz;s.near=20;s.far=1400;s.updateProjectionMatrix();
  scene.fog.near=470*viewK;scene.fog.far=1500*viewK;
  cam.updateProjectionMatrix();
}
