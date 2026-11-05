'use strict';
/* render.js — per-frame rendering, camera feel, overlay (damage numbers, minimap) */
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let fT=performance.now(),fS=0,fN=0,camRoll=0;
const flashes=[];
function addFlash(x,y,col,power,dur){if(flashes.length>=flashL.length)flashes.shift();flashes.push({x,y,col,p:power,t:dur,T:dur})}
function setEnemy(e){
  const k=e.mesh||e.type,im=inst[k];if(!im||im.count>=im.instanceMatrix.count)return;
  const i=im.count++;
  const P=G.P,dx=P.x-e.x,dz=P.y-e.y,yaw=e.yawOverride!==undefined?e.yawOverride:Math.atan2(dx,dz);
  e.tn=e.tn||vrnd(.82,1.18);
  const age=Math.min(1,(G.t-(e.t0??-9))/.34);
  const ph=e.fr||0;
  let y=e.hy||0,tilt=0,roll=0,sx=1,sy=1;
  if(k==='bandit'){y+=Math.abs(Math.sin(ph*1.1))*1.1;roll=Math.sin(ph*1.1)*.13;tilt=.1}
  else if(k==='assassin'){roll=Math.sin(ph*2.4)*.08;y+=Math.abs(Math.sin(ph*2.2))*.6;tilt=.32}
  else if(k==='archer'){const b=Math.sin(ph*1.5);sy=1+b*.04;sx=1-b*.03;y+=Math.abs(b)*.7}
  else if(k==='giant'){y+=Math.abs(Math.sin(ph*1.1))*1.6;roll=Math.sin(ph*1.1)*.07;tilt=.08}
  if(e.frz>0){roll=0;tilt=0}
  if(e.tumble!==undefined){tilt=e.tumble;roll=e.tumble*.5}
  const pop=e.flash>0?1+e.flash*1.6:1,sq=e.sq>0?e.sq:0;
  dummy.position.set(e.x+(e.sqx||0)*sq*6,y+(age-1)*16,e.y+(e.sqy||0)*sq*6);dummy.rotation.set(tilt+(e.sqy||0)*sq*.9,yaw,roll-(e.sqx||0)*sq*.9);const s=(.2+.8*age)*(e.sc||1);dummy.scale.set(s*sx*pop*(1+sq*.35),s*sy*pop*(1-sq*.4),s*sx*pop*(1+sq*.35));dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);
  let r=e.tn,g=e.tn,b=e.tn;
  if(e.elite){r*=1.25;g*=1.1;b*=.75}
  if(e.role==='charger'){r*=1.3;g*=.8;b*=.6}else if(e.role==='shaman'){r*=.7;g*=1.3;b*=.8}
  if(e.tintv){r*=e.tintv[0];g*=e.tintv[1];b*=e.tintv[2]}
  if(e.illusion){r=2.2;g=.6;b=2.4}else if(e.affix==='swift'){r*=.8;g*=1.25;b*=1.4}else if(e.affix==='explode'){r*=1.5;g*=.7;b*=.6}else if(e.affix==='armor'){r*=.85;g*=.85;b*=1}
  if(e.flash>0){r=g=b=7}else if(e.frz>0){r=.5;g=1.1;b=2.1}else if(e.slow>0){r*=.72;g*=1;b*=1.5}else if(e.burn>0){r*=1.3;g*=.85;b*=.72}else if(e.shred>0){r*=.9;g*=1.22;b*=.72}
  tc.setRGB(r,g,b);im.setColorAt(i,tc);
  im.geometry.attributes.aPhase.array[i]=e.frz>0||e.tumble!==undefined?0:ph;
}
function animHero(h,P,isP,tm,rdt){
  if(!h)return;
  const dmv=hyp(P.x-(P.lx??P.x),P.y-(P.ly??P.y));
  if(dmv>.01&&!(P.dash>0))P.yaw0=Math.atan2(P.x-P.lx,P.y-P.ly);P.lx=P.x;P.ly=P.y;
  const speedK=clamp(dmv/1.3,0,1);P.vK=(P.vK||0)+(speedK-(P.vK||0))*.15;
  let dy=((P.yaw0||0)-(P.yaw||0));dy=Math.atan2(Math.sin(dy),Math.cos(dy));P.yaw=(P.yaw||0)+dy*(P.dash>0?.6:.18);
  P.anim=(P.anim||0)+rdt*(4+P.vK*7);P.cast=Math.max(0,(P.cast||0)-rdt*5);
  const spells=isP?G.spells:P.spells,whirl=spells.find(s=>s.id==='whirl'&&s.active>0);
  const blink=P.inv>0&&(P.shield||0)<=0&&(tm*22|0)%2===0&&P.down<=0&&!(P.dash>0);
  h.g.visible=P.down<=0&&!blink;
  const lean=P.dash>0?.55:P.vK*.2;
  h.g.position.set(P.x,Math.abs(Math.sin(P.anim))*1.3*P.vK+(P.dash>0?3:0),P.y);
  h.g.rotation.set(lean,whirl?tm*22:P.yaw,Math.sin(P.anim)*.05*P.vK,'YXZ');
  const br=1+Math.sin(tm*2.3)*.012;h.g.scale.set(.9/br,.9*br,.9/br);
  h.hat.rotation.set(-P.vK*.18+Math.sin(tm*1.7)*.018,0,Math.sin(tm*1.3)*.035);
  h.cape.rotation.x=.12+(P.dash>0?1.1:P.vK*.62)+Math.sin(P.anim*.8)*.06*P.vK+Math.sin(tm*1.8)*.025;
  h.arm.rotation.x=-P.cast*.9;h.arm.rotation.z=P.cast*.3;
  const mainEl=spells[0]?.els[0],cls=CLASSES[h.cls],orbHex=mainEl?ELS[mainEl].col:cls.col,oc=rgb(orbHex);
  h.crystal.material.color.setRGB(oc[0]*7+1,oc[1]*7+1,oc[2]*7+1);h.crystal.rotation.y=tm*1.6;
  v3.copy(h.crystal.position);h.g.updateMatrixWorld(true);h.arm.localToWorld(v3);
  if(isP){orbL.position.copy(v3);orbL.position.y+=4;orbL.color.setRGB(oc[0]*1.2,oc[1]*1.2,oc[2]*1.2);orbL.intensity=(P.down>0?0:1.4)+P.cast*2.6+Math.sin(tm*5)*.08}
  if(P.down<=0&&!blink){glow(v3.x,v3.y,v3.z,orbHex,17+P.cast*26,1.8+P.cast*2);glow(v3.x,v3.y,v3.z,'#ffffff',5,1.6)}
  const sig=(P.shield||0)>0?rgb('#7dffb0'):isP?oc:rgb('#ff9c5a');
  h.sigil.position.set(P.x,.55,P.y);h.sigil.rotation.z=tm*.35;h.sigil.visible=P.down<=0;h.sigil.material.opacity=(isP?.42:.3)+P.cast*.5+Math.sin(tm*2.6)*.06;h.sigil.material.color.setRGB(sig[0]*1.4+.05,sig[1]*1.4+.05,sig[2]*1.4+.05);
  if((P.shield||0)>0){for(let i=0;i<10;i++){const a=tm*1.8+i*.628;glow(P.x+Math.cos(a)*16,14+Math.sin(tm*3+i)*5,P.y+Math.sin(a)*16,'#7dffb0',6,1.6)}glow(P.x,14,P.y,'#7dffb0',46,.5)}
  if(isP&&P.frenzy>0){for(let i=0;i<6;i++){const a=tm*9+i*1.047;glow(P.x+Math.cos(a)*10,6+((tm*30+i*9)%28),P.y+Math.sin(a)*10,'#ff4a4a',5,2)}glow(P.x,14,P.y,'#ff2a2a',40,.6)}
  const gl=spells.find(s=>s.id==='guangling'&&s.active>0);if(gl){const R=120;for(let i=0;i<20;i++){const a=i/20*TAU+tm*.8,rr=R*(.5+.5*((tm*.6+i*.05)%1));glow(P.x+Math.cos(a)*rr,10+Math.sin(tm*3+i)*4,P.y+Math.sin(a)*rr,i%2?'#ffd27a':'#8fe3ff',8,1.2)}for(let i=0;i<32;i++){const a=i/32*TAU-tm*.5;glow(P.x+Math.cos(a)*R,3,P.y+Math.sin(a)*R,'#ffd27a',7,1.1)}}
  if(whirl){for(let i=0;i<8;i++){const a=tm*22+i*.785,R=48;glow(P.x+Math.cos(a)*R,10,P.y+Math.sin(a)*R,SPELLS.whirl.col,16,1.4);glow(P.x+Math.cos(a)*R*.6,12,P.y+Math.sin(a)*R*.6,'#ffffff',6,1.2)}}
  if(P.down>0){const k=P.down/(isP?1.6:4);for(let i=0;i<24;i++){const a=i/24*TAU+tm*2;glow(P.x+Math.cos(a)*k*44,4+(1-k)*i,P.y+Math.sin(a)*k*44,'#6fd3e8',5,3)}glow(P.x,16,P.y,'#6fd3e8',46*(1-k)+8,1.6)}
}
function render(rdt){
  U.uTime.value+=rdt;const tm=U.uTime.value,P=G.P;
  const nightDark=typeof dayNight==='function'?dayNight(((G.auto?240:G.t)/600+.12)%1):0;
  if(typeof occludeTick==='function'&&!G.auto)occludeTick(P.x,P.y,rdt);
  if(!window.__noAdapt){fS+=rdt;fN++;if(fN>=70){const av=fS/fN;fS=0;fN=0;if(av>.0265&&DPR>.65){DPR=Math.max(.65,DPR-.2);resize()}else if(av<.0125&&DPR<Math.min(devicePixelRatio||1,1.6)&&tm>6){DPR=Math.min(Math.min(devicePixelRatio||1,1.6),DPR+.1);resize()}}}
  glowN=0;
  /* camera with trauma shake */
  G.trauma=Math.max(0,G.trauma-rdt*2.2);G.shX*=Math.pow(.001,rdt);G.shY*=Math.pow(.001,rdt);
  const hw=Math.min(W/2,VW*.36),hd=Math.min(H/2,VH*.34);
  const tx=clamp(P.x,hw,W-hw),tz=clamp(P.y,hd,H-hd),sm=1-Math.pow(.003,rdt);
  camX+=(tx-camX)*sm;camZ+=(tz-camZ)*sm;
  /* shake is deliberately small and never rotates the view: the camera stays level and the map keeps its orientation (large shakes read as the world jumping and make people queasy) */
  const SH=reduced?0:SHAKE==='off'?0:SHAKE==='high'?1:.45,tr=G.trauma*G.trauma,amp=tr*9*SH;
  const nx=(Math.sin(tm*47)+Math.sin(tm*31.7)*.5)*amp+G.shX*.3*SH,nz=(Math.cos(tm*41)+Math.sin(tm*27.3)*.5)*amp+G.shY*.3*SH,ny=Math.sin(tm*53)*amp*.6;
  camRoll=0;
  const drift=0;
  const punch=G.hitStop>0?2*SH:0;
  cam.position.set(camX+drift+nx,262*viewK+ny-punch,camZ+178*viewK+nz-punch*.6);
  cam.lookAt(camX+drift*.4+nx*.4,7,camZ-2+nz*.4);cam.rotateZ(camRoll);
  sun.target.position.set(Math.round(camX/3)*3,0,Math.round(camZ/3)*3);sun.position.set(sun.target.position.x-470,430,sun.target.position.z+360);
  /* heroes */
  animHero(HEROES.player,P,true,tm,rdt);
  if(G.rival)animHero(HEROES.rival,G.rival,false,tm,rdt);
  for(let i=0;i<ghostM.length;i++){const gh=G.ghosts[i],gm=ghostM[i];gm.visible=!!gh;if(gh){gm.position.set(gh.x,0,gh.y);gm.rotation.set(.55,gh.yaw,0,'YXZ');const q=gh.t/gh.T;gm.material.opacity=q*.55;const c=rgb(CLASSES[G.cls].col);gm.material.color.setRGB(c[0]*2.5*q+.2,c[1]*2.5*q+.2,c[2]*2.5*q+.2)}}
  /* enemies */
  for(const k in inst)inst[k].count=0;
  let sI=0;
  for(const e of G.en){
    if(e.dead)continue;
    if(e.type==='statue'){if(sI<3){const g=statues[sI++];g.visible=true;g.position.set(e.x,0,e.y);g.rotation.y=tm*.2;const c=g.userData.c;c.position.y=48+Math.sin(tm*2+e.x)*2;c.rotation.y=tm*1.3;c.material.emissiveIntensity=e.flash>0?10:3;glow(e.x,48,e.y,'#ff3df0',22,1.5);for(let i=0;i<3;i++){const a=tm*.9+i*2.09;glow(e.x+Math.cos(a)*9,16+((tm*14+i*13)%34),e.y+Math.sin(a)*9,'#ff7af4',3.4,2)}}continue}
    if(e.type==='boss')continue;
    setEnemy(e);
    if(e.affix==='explode')glow(e.x,e.r*1.5,e.y,'#ff4a2a',e.r*3,.6+Math.sin(tm*12)*.4);
    if(e.elite){glow(e.x,e.r*1.2,e.y,'#ffd27a',e.r*4,.5);if(Math.random()<.3)glow(e.x+vrnd(-8,8),vrnd(2,e.r*3),e.y+vrnd(-8,8),'#ffd27a',3,2)}
    if(e.burn>0&&glowN<GMAX*.7){const f=.7+Math.sin(tm*24+e.x)*.3;glow(e.x,e.r*1.7,e.y,'#ff7a2c',12*f+e.r,1.15);if(Math.random()<.22)G.fx.push({k:'p',x:e.x+vrnd(-3,3),y:e.y+vrnd(-3,3),h:e.r*1.4,vx:vrnd(-4,4),vy:vrnd(-4,4),vh:vrnd(18,42),t:.45,T:.45,c:'#ffb14a',sz:3})}
    if(e.frz>0&&glowN<GMAX*.7)glow(e.x,e.r,e.y,'#8fe4ff',e.r*3.3,.32);
    if(e.shred>0&&Math.random()<.04)G.fx.push({k:'p',x:e.x,y:e.y,h:e.r*1.8,vx:vrnd(-5,5),vy:vrnd(-5,5),vh:vrnd(8,24),t:.5,T:.5,c:'#b4ff5c',sz:2.6});
  }
  for(let i=sI;i<3;i++)statues[i].visible=false;
  for(const f of G.fx)if(f.k==='die'){const q=f.t/f.T;setEnemy({type:f.type,x:f.x,y:f.y,tn:1,flash:q>.75?1:0,fr:f.fr,sc:f.sc*Math.min(1,q*2.2),t0:-9,hy:f.h,tumble:f.rot,yawOverride:f.rot*.4,frz:0,slow:0,burn:0,shred:0})}
  for(const k in inst){const im=inst[k];im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.geometry.attributes.aPhase.needsUpdate=true}
  /* boss */
  const B=G.en.find(e=>e.type==='boss');
  bossG.visible=!!B&&!B.dead&&!(B.hide>0);
  if(bossG.visible){
    const age=Math.min(1,(G.t-(B.t0??-9))/1.2);B.yaw=B.yaw??0;let d=Math.atan2(P.x-B.x,P.y-B.y)-B.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));if(!(B.charge>0))B.yaw+=d*.04;
    const p=1+Math.sin(tm*2)*.018,w=B.flash>0?1.06:1,hover=8+Math.sin(tm*1.6)*4;
    bossG.position.set(B.x,hover+(age-1)*90,B.y);bossG.rotation.set(B.charge>0?.5:Math.sin(tm*1.2)*.04,B.yaw,0,'YXZ');bossG.scale.set(p*w,(2-p)*w,p*w);
    blades.forEach((bl,i)=>{const sp=B.charge>0?1:B.tele>0?2.5:.9,a=bl.a+tm*sp,R=B.charge>0?26:38+Math.sin(tm*2+bl.p)*6;bl.g.position.set(Math.cos(a)*R,20+Math.sin(tm*3+bl.p)*8,Math.sin(a)*R);bl.g.rotation.set(B.charge>0?-.3:Math.sin(tm*2+bl.p)*.4,B.charge>0?Math.PI:-a+Math.PI,0,'YXZ');
      const wx=B.x+Math.cos(a+B.yaw)*R;glow(B.x+Math.cos(a-B.yaw+Math.PI/2)*R,hover+20,B.y+Math.sin(a-B.yaw+Math.PI/2)*R,'#ff3040',8,1.2)});
    if(B.tele>0)glow(B.x,30,B.y,'#ff3020',110,.9);
    glow(B.x,hover+40,B.y,'#ff2a3a',70,.2);glow(B.x,hover+57,B.y+6,'#ff4a4a',18,.9);
    for(let i=0;i<6;i++){const a=tm*.55+i;glow(B.x+Math.cos(a)*(36+i*2),((tm*16+i*19)%80),B.y+Math.sin(a)*(34+i),'#ff6a6a',3.6,1.6)}
    const bm=bossG.userData.body.material;bm.emissive=bm.emissive||new T3.Color();bm.emissive.setScalar(B.flash>0?.5:0);if(B.tint){const c=rgb(B.tint);bm.color.setRGB(c[0]*1.6,c[1]*1.6,c[2]*1.6)}else bm.color.setRGB(1,1,1);
  }
  tele.visible=!!(B&&B.tele>0);
  if(tele.visible){const dx=B.tx-B.x,dz=B.ty-B.y,len=Math.max(120,hyp(dx,dz))*1.6;tele.position.set(B.x,.8,B.y);tele.rotation.y=Math.atan2(dx,dz);tele.scale.set(46,1,len);tele.material.opacity=.45+.5*(1-B.tele/.8)}
  /* pickups */
  let gi=0;const gemCap=gemMesh.instanceMatrix.count;
  for(const g of G.gems){if(gi>=gemCap)break;const y=4.8+Math.sin(tm*3+g.x)*1.1;dummy.position.set(g.x,y,g.y);dummy.rotation.set(0,tm*2+g.y,0);const s=g.big?1.25:.82;dummy.scale.set(s,s*1.35,s);dummy.updateMatrix();gemMesh.setMatrixAt(gi,dummy.matrix);if(g.big)tc.setRGB(5,3.2,.7);else tc.setRGB(.8,3.6,5);gemMesh.setColorAt(gi,tc);gi++;glow(g.x,y,g.y,g.big?'#ffc94a':'#54dcff',g.big?15:9,g.big?1:.72)}
  gemMesh.count=gi;gemMesh.instanceMatrix.needsUpdate=true;if(gemMesh.instanceColor)gemMesh.instanceColor.needsUpdate=true;
  /* enemy blades */
  let bi=0;const bc=bulletMesh.instanceMatrix.count;
  for(const b of G.bullets){if(bi>=bc)break;dummy.position.set(b.x,10,b.y);dummy.rotation.set(0,Math.atan2(b.vx,b.vy),tm*18);dummy.scale.set(1,1,1);dummy.updateMatrix();bulletMesh.setMatrixAt(bi,dummy.matrix);bi++;glow(b.x,10,b.y,b.bone?'#f4efe0':'#ff2a50',b.bone?22:15,1.1);glow(b.x-b.vx*.03,10,b.y-b.vy*.03,'#ff2a50',9,.6)}
  bulletMesh.count=bi;bulletMesh.instanceMatrix.needsUpdate=true;
  /* player projectiles */
  let si=0,ti=0;const sCap=swordMesh.instanceMatrix.count,tCap=talisMesh.instanceMatrix.count;
  const putSword=(x,y,z,yaw,pitch,roll,sc,col)=>{if(si>=sCap)return;dummy.position.set(x,y,z);dummy.rotation.set(pitch,yaw,roll);dummy.scale.set(sc,sc,sc);dummy.updateMatrix();swordMesh.setMatrixAt(si,dummy.matrix);const c=rgb(col);tc.setRGB(.6+c[0]*1.4,.6+c[1]*1.4,.6+c[2]*1.4);swordMesh.setColorAt(si,tc);si++};
  const putTalis=(x,y,z,yaw,pitch,roll,sc)=>{if(ti>=tCap)return;dummy.position.set(x,y,z);dummy.rotation.set(pitch,yaw,roll);dummy.scale.set(sc,sc,sc);dummy.updateMatrix();talisMesh.setMatrixAt(ti,dummy.matrix);ti++};
  for(const b of G.shots){const r=b.r*(b.small?.72:1),vl=hyp(b.vx,b.vy)||1,ux=b.vx/vl,uz=b.vy/vl,yaw=Math.atan2(b.vx,b.vy);
    if(b.kind==='sword'){putSword(b.x,9.5,b.y,yaw,0,b.spin,b.small?.7:(b.r>4?1.4:1),b.col);for(let i=1;i<=4;i++){const d=i*r*2.4,k=1-i/5;glow(b.x-ux*d,9.5,b.y-uz*d,(i%2&&b.col2)?b.col2:b.col,r*3.2*(.4+.6*k),1.1*k)}}
    else if(b.kind==='charm'){putTalis(b.x,9.5,b.y,yaw,0,b.spin,b.small?.5:.8);for(let i=1;i<=3;i++){const d=i*r*2;glow(b.x-ux*d,9.5,b.y-uz*d,b.col,r*3,.8*(1-i/4))}glow(b.x,9.5,b.y,'#ffffff',r*1.6,1.4)}
    else{ // palm / slash crescents
      const px=-uz,pz=ux,n=b.kind==='slash'?3:4;for(let i=-n;i<=n;i++){const k=1-Math.abs(i)/(n+1);glow(b.x+px*i*r*.9-ux*Math.abs(i)*r*.5,9.5,b.y+pz*i*r*.9-uz*Math.abs(i)*r*.5,i%2?(b.col2||b.col):b.col,r*3.2*k+2,1.6*k)}
      glow(b.x,9.5,b.y,'#ffffff',r*2.2,1.8);}
    if(Math.random()<.12)G.fx.push({k:'p',x:b.x,y:b.y,h:9.5,vx:vrnd(-12,12),vy:vrnd(-12,12),vh:vrnd(-6,14),t:.35,T:.35,c:b.col,sz:2.2})}
  for(const s of [...G.spells,...(G.rival?G.rival.spells:[])]){if(!s.pos)continue;const col=s.els[0]?ELS[s.els[0]].col:SPELLS[s.id].col,col2=s.els[1]?ELS[s.els[1]].col:col,gi2=s.augs.includes('giant')?1.4:1;
    for(const [x,z,a] of s.pos){const yy=12+Math.sin(tm*4+x*.1)*1.4;if(s.id==='array')putSword(x,yy,z,-a+Math.PI,0,Math.sin(tm*6+a)*.3,gi2,col);else putTalis(x,yy,z,-a,0,tm*4,gi2);glow(x,yy,z,col,16*gi2,1.1);glow(x,yy*.1+.6,z,col2,10*gi2,.4)}}
  for(const b of G.bombs){const k=b.t/b.T,x=b.x0+(b.x-b.x0)*k,z=b.y0+(b.y-b.y0)*k,y=12+Math.sin(k*Math.PI)*52-(k*12);const col=b.s.els[0]?ELS[b.s.els[0]].col:'#ffd75a';
    putTalis(x,y,z,tm*5,k*6,Math.sin(tm*9)*.5,1.1);glow(x,y,z,col,18,1.5);glow(x-(b.x-b.x0)*.04,y-3,z-(b.y-b.y0)*.04,col,12,.7)}
  swordMesh.count=si;swordMesh.instanceMatrix.needsUpdate=true;if(swordMesh.instanceColor)swordMesh.instanceColor.needsUpdate=true;
  talisMesh.count=ti;talisMesh.instanceMatrix.needsUpdate=true;
  /* rings, pools, scorch, waves */
  let ring=0,poolI=0;
  const useRing=(x,y,z,r,hex,op)=>{if(ring>=ringPool.length)return;const m=ringPool[ring++];m.visible=true;m.position.set(x,y,z);m.scale.set(r,1,r);m.material.color.setRGB(...rgb(hex).map(v=>v*2.8));m.material.opacity=op};
  for(const b of G.bombs){const k=b.t/b.T,col=b.s.els[0]?ELS[b.s.els[0]].col:'#ffd75a';useRing(b.x,.8,b.y,b.r,col,.45+k*.45);useRing(b.x,.8,b.y,b.r*(1-k),col,.7)}
  for(const f of G.fx){
    if(f.k==='crit'){const k=1-f.t/f.T;for(let i=0;i<6;i++){const a=i/6*TAU+k*2;glow(f.x+Math.cos(a)*(8+k*34),10+k*8,f.y+Math.sin(a)*(8+k*34),'#ffd75a',12*(1-k)+4,2*(1-k))}glow(f.x,12,f.y,'#ffffff',30*(1-k)+6,2.5*(1-k))}
    if(f.k==='ring'){const k=1-f.t/f.T;useRing(f.x,1.1,f.y,f.r*(.3+.7*Math.pow(k,.55)),f.c,(1-k)*.95);useRing(f.x,1.1,f.y,f.r*(.15+.6*k),f.c,(1-k)*.42);if(k<.45)glow(f.x,10,f.y,f.c,f.r*2.6*(1-k),1.5*(1-k/.45));
      if(f.thunder&&k<.5){for(let i=0;i<14;i++){const yy=i*9,jx=Math.sin(i*7.3+tm*40)*4,jz=Math.cos(i*5.1+tm*33)*4;glow(f.x+jx,yy+4,f.y+jz,i%3?'#ffe9a0':'#ffffff',8*(1-k*2)+3,2.2)}glow(f.x,60,f.y,'#ffd75a',120*(1-k*2),.9)}
      if(!f.boom&&f.r>16){f.boom=1;addFlash(f.x,f.y,f.c,clamp(f.r/16,1,5),.28);const S=scorch[scorchI++%scorch.length];S.t=7;S.m.visible=true;S.m.position.x=f.x;S.m.position.z=f.y;S.m.scale.set(f.r*1.7,1,f.r*1.7);if(G.fx.length<640){for(let i=0;i<Math.min(30,f.r*.8);i++){const a=vrnd(TAU),v=vrnd(16,f.r*2.6+20);G.fx.push({k:'p',x:f.x,y:f.y,h:vrnd(2,8),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:vrnd(14,95),t:vrnd(.35,.8),T:.8,c:i%3?f.c:'#fff1d0',sz:vrnd(2,4.6),g:1})}}}}
    if(f.k==='wave'){const k=1-f.t/f.T,R=18+k*(f.full?90:62)*(f.w||1);const n=f.full?28:11;for(let i=0;i<n;i++){const a=f.full?i/n*TAU:f.a+(i-(n-1)/2)*.11;glow(f.x+Math.cos(a)*R,8+k*4,f.y+Math.sin(a)*R,i%2?f.c:'#ffffff',(f.full?14:11)*(1-k)+3,(1-k)*1.8)}}
  }
  for(let i=ring;i<ringPool.length;i++)ringPool[i].visible=false;
  for(const S of scorch){if(S.t>0){S.t-=rdt;S.m.material.opacity=clamp(S.t/3,0,1)*.75;if(S.t<=0)S.m.visible=false}}
  for(const S of splats){if(S.t>0){S.t-=rdt;S.m.material.opacity=clamp(S.t/4,0,1)*.85;if(S.t<=0)S.m.visible=false}}
  for(const p of G.pools){if(poolI>=poolPool.length)break;const m=poolPool[poolI++],fade=clamp(p.t/.6,0,1)*clamp((p.T-p.t)/.2,0,1);m.visible=true;m.position.set(p.x,.5+poolI*.01,p.y);m.scale.set(p.r*2.15,1,p.r*2.15);const c=rgb(p.col),br2=p.steam?.34:.82;m.material.color.setRGB(c[0]*br2,c[1]*br2,c[2]*br2);m.material.opacity=fade*(.5+Math.sin(tm*5+p.x)*.07);
    if(Math.random()<(p.steam?.4:.16)&&G.fx.length<640){const a=vrnd(TAU),d=vrnd(p.r);G.fx.push({k:'p',x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,h:1,vx:vrnd(-3,3),vy:vrnd(-3,3),vh:p.steam?vrnd(10,30):vrnd(10,26),t:.7,T:.7,c:p.col,sz:p.steam?8:vrnd(2,4),soft:p.steam?.34:0})}
    if(p.zap&&Math.random()<.1)glow(p.x+vrnd(-p.r,p.r),3,p.y+vrnd(-p.r,p.r),'#ffe066',8,2.2)}
  for(let i=poolI;i<poolPool.length;i++)poolPool[i].visible=false;
  for(const a of G.arcs){a.j=a.j||[vrnd(-9,9),vrnd(-9,9),vrnd(-9,9),vrnd(-9,9)];const hop=[[a.x,a.y],[a.x+(a.x2-a.x)*.35+a.j[0],a.y+(a.y2-a.y)*.35+a.j[1]],[a.x+(a.x2-a.x)*.7+a.j[2],a.y+(a.y2-a.y)*.7+a.j[3]],[a.x2,a.y2]];
    for(let s=0;s<3;s++){const A=hop[s],C=hop[s+1],L=hyp(C[0]-A[0],C[1]-A[1]),n=Math.max(2,L/3.6|0);for(let i=0;i<n;i++){const q=i/n;glow(A[0]+(C[0]-A[0])*q,8+Math.sin(q*6+s)*1.4,A[1]+(C[1]-A[1])*q,a.c,5.2,2.3);if(i%3===0)glow(A[0]+(C[0]-A[0])*q,8,A[1]+(C[1]-A[1])*q,'#ffffff',2.6,2.4)}}}
  /* mission, shrines, ambience */
  const m=G.mission;mRing.visible=!!m;
  const mt=m?missionTarget():null;
  if(mt){const pulse=1+Math.sin(tm*5)*.08,col=m.k==='mush'?'#ff8a52':'#ff5fe8';useRing(mt.x,1.2,mt.y,26*pulse,col,.95);useRing(mt.x,1.2,mt.y,34*pulse,'#ffffff',.5);
    for(let i=0;i<16;i++){const y=i*18+((tm*60)%18);glow(mt.x,y+6,mt.y,i%2?col:'#ffffff',22-(y*.05),(1-y/300)*1.3)}glow(mt.x,8,mt.y,col,90,.8);
    if(m.k==='statue')for(const e of G.en){if(e.type==='statue'&&!e.dead&&e!==mt)useRing(e.x,1.1,e.y,22,'#ff5fe8',.45)}else for(const o of G.mush){if(o!==mt)useRing(o.x,1.1,o.y,14,'#ff8a52',.45)}}
  if(m){mRing.position.x=m.x;mRing.position.z=m.y;mRing.scale.set(240,1,196);mRing.rotation.y=tm*.25;
    for(let i=0;i<22;i++){const y=i*16+((tm*40)%16);glow(m.x+Math.sin(tm*2+i)*3,y+4,m.y+Math.cos(tm*1.7+i)*3,i%2?'#7dff9c':'#d8ffe4',26-(y*.05),(1-y/360)*1.2)}
    glow(m.x,6,m.y,'#7dff9c',120,.7+Math.sin(tm*4)*.2);
    for(let i=0;i<8;i++){const a=tm*1.2+i*.785,R=112+Math.sin(tm*3+i)*6;glow(m.x+Math.cos(a)*R,8,m.y+Math.sin(a)*R*.82,'#7dff9c',10,1.4)}}
  for(const f of G.fx){if(f.k!=='relic')continue;const R=RELICS[f.id],bob=8+Math.sin(tm*3+f.x)*3;glow(f.x,bob,f.y,R.col,26,1.3+Math.sin(tm*7)*.3);glow(f.x,bob,f.y,'#ffffff',8,2);for(let i=0;i<5;i++){const a=tm*2+i*1.256;glow(f.x+Math.cos(a)*12,4+((tm*18+i*8)%20),f.y+Math.sin(a)*12,R.col,3.5,1.5)}useRing(f.x,.9,f.y,16+Math.sin(tm*5)*2,R.col,.7)}
  for(const w of G.pwaves){useRing(w.x,1.2,w.y,w.r,w.col,.9*(1-w.r/w.R)+.2);useRing(w.x,1.2,w.y,Math.max(2,w.r-7),'#ffffff',.4*(1-w.r/w.R));for(let i=0;i<16;i++){const a=i/16*TAU+tm*2;glow(w.x+Math.cos(a)*w.r,7,w.y+Math.sin(a)*w.r,w.col,10,1.3*(1-w.r/w.R)+.3)}}
  for(const sp of G.spells)if(sp.beam){const b=sp.beam,col=sp.els[0]?ELS[sp.els[0]].col:'#f4efe0';for(let k=0;k<b.pts.length-1;k++){const [x1,y1]=b.pts[k],[x2,y2]=b.pts[k+1],n=8;for(let i=0;i<=n;i++){const q=i/n,wob=Math.sin(tm*40+i*1.7+k)*2.5*(1-b.hold*.5);glow(x1+(x2-x1)*q+wob,10+Math.sin(tm*30+i)*2,y1+(y2-y1)*q-wob,i%2?col:'#ffffff',8+b.hold*8,1.2+b.hold)}}}
  if(G.mission&&G.mission.k==='seal'){const m=G.mission,inside=hyp(P.x-m.x,P.y-m.y)<m.r;useRing(m.x,1.2,m.y,m.r,inside?'#ff5fe8':'#c060d0',.8);useRing(m.x,1.2,m.y,m.r*(1-m.n/m.N),'#ffffff',.5);for(let i=0;i<12;i++){const a=i/12*TAU+tm*1.5;glow(m.x+Math.cos(a)*m.r,8+Math.sin(tm*6+i)*4,m.y+Math.sin(a)*m.r,'#ff5fe8',12,inside?1.8:1)}}
  if(G.mission&&G.mission.k==='hunt'&&G.mission.target&&!G.mission.target.dead){const e=G.mission.target;useRing(e.x,1.2,e.y,e.r+10+Math.sin(tm*8)*3,'#ff5fe8',.9)}
  for(const h of G.hazards){ // boss ground hazards: pulsing telegraph ring, then a burning disc
    if(h.tele>0){const q=1-h.tele/h.T;useRing(h.x,1.15,h.y,h.r,h.col,.35+q*.5);useRing(h.x,1.15,h.y,h.r*q,h.col,.8);glow(h.x,4,h.y,h.col,h.r*1.6*q,.6)}
    else{useRing(h.x,1.15,h.y,h.r,h.col,.7);glow(h.x,5,h.y,h.col,h.r*2.4,1.2+Math.sin(tm*9)*.3);for(let i=0;i<4;i++){const a=tm*3+i/4*TAU;glow(h.x+Math.cos(a)*h.r*.6,8+Math.sin(tm*7+i)*4,h.y+Math.sin(a)*h.r*.6,h.col,10,1.2)}}}
  if(G.boss&&!G.boss.dead&&G.boss.exposed>0){const B=G.boss,k=G.boss.exposed;useRing(B.x,1.2,B.y,34+Math.sin(tm*14)*4,'#ffd27a',.9);for(let i=0;i<10;i++){const a=i/10*TAU+tm*4;glow(B.x+Math.cos(a)*30,16+Math.sin(tm*9+i)*5,B.y+Math.sin(a)*30,'#ffd27a',12,1.6)}}
  if(G.boss&&!G.boss.dead&&G.boss.drain>0){const B=G.boss;useRing(B.x,1.2,B.y,230,'#ff2a3a',.5+Math.sin(tm*10)*.3);useRing(B.x,1.2,B.y,222,'#ffffff',.25);for(let i=0;i<10;i++){const q=i/10;glow(B.x+(P.x-B.x)*q,8+Math.sin(tm*12+i)*3,B.y+(P.y-B.y)*q,'#ff2a3a',14,1.2)}}
  for(const nv of G.novas){const nc=nv.col||'#ff2a3a';useRing(nv.x,1.2,nv.y,nv.r,nc,.9);useRing(nv.x,1.2,nv.y,nv.r-6,'#ffffff',.5);for(let i=0;i<24;i++){const a=i/24*TAU+tm;glow(nv.x+Math.cos(a)*nv.r,8,nv.y+Math.sin(a)*nv.r,nc,12,1.4)}}
  for(const e of G.en){if(e.dead)continue;if(e.role==='charger'&&e.cw>0){const dx=e.tx-e.x,dz=e.ty-e.y,l=hyp(dx,dz)||1;for(let i=0;i<10;i++){const q=i/10;glow(e.x+dx/l*q*150,3,e.y+dz/l*q*150,'#ff5a3a',6,1.6*(1-e.cw/.6))}glow(e.x,e.r*2,e.y,'#ff5a3a',20,1.2)}
    if(e.role==='shaman'){glow(e.x,e.r*2.6,e.y,'#7fc98a',14+Math.sin(tm*4)*3,1.2);for(let i=0;i<3;i++){const a=tm*1.5+i*2.09;glow(e.x+Math.cos(a)*14,6+((tm*12+i*7)%22),e.y+Math.sin(a)*14,'#b6ffc2',3,1.6)}}
    if(e.healed>0){e.healed-=rdt;glow(e.x,e.r*2.2,e.y,'#7fc98a',10,1.5)}}
  for(const ch of G.chests){const bob=Math.sin(tm*3+ch.x)*2,cc=ch.kind==='gold'?'#ffe9a0':ch.kind==='trap'?'#ff6a6a':'#ffd27a';glow(ch.x,10+bob,ch.y,cc,ch.kind==='gold'?44:30,1.4+Math.sin(tm*6)*.3);glow(ch.x,10+bob,ch.y,'#ffffff',9,2);for(let i=0;i<6;i++){const a=tm*1.5+i*1.047;glow(ch.x+Math.cos(a)*16,6+((tm*20+i*9)%26),ch.y+Math.sin(a)*16,'#ffe9a0',4,1.6)}useRing(ch.x,.9,ch.y,24+Math.sin(tm*4)*3,'#ffd27a',.6)}
  for(let i=0;i<mushes.length;i++){const o=G.mush[i],M=mushes[i];M.visible=!!o;if(o){M.position.set(o.x,0,o.y);const s=1+Math.sin(tm*3+i)*.05;M.scale.set(s,s,s);M.rotation.y=tm*.5;glow(o.x,12,o.y,'#ff6a52',26,.62)}}
  for(const s of G.shrines){if(Math.abs(s.x-camX)>VW*.8||Math.abs(s.y-camZ)>VH*.9)continue;const ready=s.cd<=0;glow(s.x,38,s.y,ready?'#ffd27a':'#6a6a6a',ready?26+Math.sin(tm*3)*5:10,ready?1.6:.4);glow(s.x,25,s.y,'#ffb347',18,ready?.9:.35);
    if(ready){for(let i=0;i<6;i++){const y=((tm*26+i*30)%150);glow(s.x+Math.sin(tm+i)*6,40+y,s.y+Math.cos(tm*1.3+i)*6,'#ffe9b0',14-(y*.07),(1-y/150)*.7)}}}
  for(const l of lanterns){if(Math.abs(l[0]-camX)>VW*.8||Math.abs(l[1]-camZ)>VH*.9)continue;const lx=l[0]+Math.cos(l[2]+Math.PI/2)*0+Math.sin(l[2])*7,lz=l[1]+Math.cos(l[2])*7;glow(lx,24.5,lz,MAP().lantern,22+Math.sin(tm*5+l[0])*2,.75);glow(lx,24.5,lz,'#ffd0a0',7,1.2)}
  heartMesh.material.opacity=.55+Math.sin(tm*1.4)*.2;heartMesh.rotation.z=tm*.05;
  for(const q of blueMush){if(Math.abs(q[0]-camX)>VW*.7||Math.abs(q[2]-camZ)>VH*.8)continue;glow(q[0],q[1],q[2],'#32d4ff',15*q[3],.44+Math.sin(tm*1.8+q[4])*.14)}
  for(const f of flies){if(Math.abs(f.x-camX)>VW*.7||Math.abs(f.z-camZ)>VH*.8)continue;const x=f.x+Math.sin(tm*f.s*.55+f.p)*22,z=f.z+Math.cos(tm*f.s*.43+f.p*1.7)*18,y=f.leaf?f.h+Math.sin(tm*f.s*.7+f.p)*14:f.h+Math.sin(tm*f.s+f.p*2)*6,b=f.leaf?.5:.4+Math.pow(Math.max(0,Math.sin(tm*f.s*1.4+f.p*3)),3)*2;glow(x,y,z,f.leaf?'#ff6a3a':f.warm?'#ffd98a':'#b3ffcc',f.leaf?3.6:3.2,b)}
  for(const r of rays){const u=r.userData,a=.5+.5*Math.sin(tm*.3+u.p);r.position.set(camX+u.ox,145,camZ+u.oz);r.lookAt(cam.position);r.rotateZ(.62);r.scale.set(u.w,520,1);r.material.opacity=.018+a*.035}
  for(const f of G.fx){if(f.k!=='p')continue;const q=clamp(f.t/(f.T||.4),0,1);if(f.soft)glow(f.x,f.h??6,f.y,f.c,f.sz*(2-q),q*f.soft);else glow(f.x,f.h??6,f.y,f.c,(f.sz||3.2)*(.6+q*.8),q*2.1)}
  for(let i=flashes.length-1;i>=0;i--){const f=flashes[i];f.t-=rdt;if(f.t<=0)flashes.splice(i,1)}
  flashL.forEach((l,i)=>{const f=flashes[i];if(f){const c=rgb(f.c);l.position.set(f.x,26,f.y);l.color.setRGB(c[0],c[1],c[2]);l.intensity=f.p*2.4*(f.t/f.T)}else l.intensity=0});
  const ga=glowPts.geometry.attributes;ga.position.needsUpdate=true;ga.aColor.needsUpdate=true;ga.aSize.needsUpdate=true;glowPts.geometry.setDrawRange(0,glowN);
  /* post uniforms */
  const h=G.fx.find(f=>f.k==='hurt');const fu=finalPass.uniforms;fu.uHurt.value=reduced?0:(h?h.t/h.T:0);fu.uLow.value=(!G.auto&&P.hp<P.maxHp*.3&&P.down<=0)?1:0;fu.uDark.value=nightDark+((G.over==='lose'||P.down>0)?1:0);
  G.flash=Math.max(0,G.flash-rdt*2.2);fu.uFlash.value=reduced?0:G.flash;fu.uCA.value=reduced?0:Math.min(1,G.hitStop*8+tr*.4);
  [fu.uS0,fu.uS1,fu.uS2].forEach((u,i)=>{const s=G.shocks[i];if(!s||reduced){u.value.set(0,0,0,0);return}const [sx,sy]=toScreen(s.x,4,s.y),k=s.t/s.T;u.value.set(sx/ov.width,1-sy/ov.height,k*s.R/VH*.5,s.str*(1-k))});
  comp.render();
  drawOverlay();
}
const pv=new T3.Vector3();
function toScreen(x,y,z){pv.set(x,y,z).project(cam);return [(pv.x+1)/2*ov.width,(1-pv.y)/2*ov.height,pv.z]}
function drawOverlay(){
  const ow=ov.width,oh=ov.height,S=ow/Math.max(1,$('#stage').getBoundingClientRect().width);
  c.clearRect(0,0,ow,oh);
  c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
  for(const f of G.floats){const [x,y]=toScreen(f.x,14+(.6-f.t)*22,f.y);const sz=(f.crit?22:13.5)*S*(1+Math.max(0,f.t-.46)*3);c.font=`800 ${sz}px "Alegreya Sans",system-ui,sans-serif`;c.globalAlpha=clamp(f.t/.22,0,1);c.lineWidth=3.5*S;c.strokeStyle='#160b12';c.strokeText(f.v,x,y);c.fillStyle=f.c;c.fillText(f.v,x,y);if(f.crit&&f.t>.4){c.font=`700 ${10*S}px "Alegreya Sans",system-ui`;c.fillStyle='#ffd75a';c.strokeText('暴击',x,y-sz*.75);c.fillText('暴击',x,y-sz*.75)}}
  c.globalAlpha=1;
  for(const e of G.en){if(e.dead||(e.type!=='giant'&&e.type!=='statue'&&!e.elite)||(e.hp>=e.maxHp&&e.type!=='statue'))continue;
    const [x,y]=toScreen(e.x,e.type==='statue'?60:e.type==='giant'?54:e.r*4+10,e.y),w=(e.type==='statue'?44:32)*S,hh=4*S;c.fillStyle='#160b12cc';c.fillRect(x-w/2-1,y-1,w+2,hh+2);c.fillStyle=e.type==='statue'?'#ff5fe8':e.elite?'#ffd27a':'#ff5a45';c.fillRect(x-w/2,y,w*e.hp/e.maxHp,hh)}
  const label=(x,y,txt,col,big)=>{c.font=`800 ${(big?15:13)*S}px "Alegreya Sans","PingFang SC","Microsoft YaHei",system-ui,sans-serif`;const w=c.measureText(txt).width+18*S,h=22*S;c.fillStyle='#0a0710d9';c.strokeStyle=col;c.lineWidth=1.2*S;c.beginPath();c.roundRect(x-w/2,y-h/2,w,h,5*S);c.fill();c.stroke();c.fillStyle=col;c.fillText(txt,x,y+1)};
  const arrow=(wx,wz,col,txt)=>{const [x,y]=toScreen(wx,0,wz),cx=ow/2,cy=oh/2,mx=46*S,my=112*S,dist=Math.round(hyp(wx-G.P.x,wz-G.P.y)/10);
    if(x>mx&&x<ow-mx&&y>my&&y<oh-my){if(txt){const [lx,ly]=toScreen(wx,120,wz);label(lx,Math.max(ly-(Math.sin(U.uTime.value*3)*4+6)*S,118*S),txt,col,true)}return}
    const dx=x-cx,dy=y-cy,k=Math.min((ow/2-mx)/Math.abs(dx||1),(oh/2-my)/Math.abs(dy||1)),ax=cx+dx*k,ay=cy+dy*k,a=Math.atan2(dy,dx);
    c.save();c.translate(ax,ay);c.rotate(a);c.shadowColor=col;c.shadowBlur=14*S;c.fillStyle=col;c.beginPath();c.moveTo(16*S,0);c.lineTo(-10*S,-11*S);c.lineTo(-5*S,0);c.lineTo(-10*S,11*S);c.closePath();c.fill();c.restore();
    if(txt){const t2=txt+' · '+dist+'m';c.font=`800 ${13*S}px "Alegreya Sans","PingFang SC","Microsoft YaHei",system-ui,sans-serif`;const hw=c.measureText(t2).width/2+12*S,off=28*S,lx=clamp(ax-Math.cos(a)*off,hw+4*S,ow-hw-4*S),ly=clamp(ay-Math.sin(a)*off,24*S,oh-24*S);label(lx,ly,t2,col,false)}};
  if(!G.auto&&G.P.down<=0){const [hx,hy]=toScreen(G.P.x,0,G.P.y);c.save();c.globalAlpha=.55;c.lineWidth=2*S;c.strokeStyle=CLASSES[G.cls].col;c.beginPath();c.ellipse(hx,hy,16*S,9*S,0,0,TAU);c.stroke();c.restore()}
  if(G.rival&&G.rival.down<=0){const R=G.rival,[x,y]=toScreen(R.x,36,R.y);if(x>-40&&x<ow+40&&y>-20&&y<oh+20){label(x,y,`${L(R.name[0],R.name[1])} · Lv ${R.lv} · ${R.score} ${L('分','pts')}`,'#ff9c5a',false);c.fillStyle='#160b12cc';c.fillRect(x-20*S,y+13*S,40*S,4*S);c.fillStyle='#ff9c5a';c.fillRect(x-20*S,y+13*S,40*S*R.hp/R.maxHp,4*S)}}
  if(!G.auto){for(const f of G.fx){if(f.k==='relic')arrow(f.x,f.y,RELICS[f.id].cursed?'#ff3a3a':RELICS[f.id].col,(RELICS[f.id].cursed?L('诅咒法宝 ','Cursed relic: '):L('法宝 ','Relic: '))+LL(RELICS[f.id]))}for(const ch of G.chests){if(G.mission)c.globalAlpha=.45;arrow(ch.x,ch.y,ch.kind==='gold'?'#ffe9a0':ch.kind==='trap'?'#ff6a6a':'#ffd27a',ch.kind==='gold'?L('金宝箱','Gold chest'):ch.kind==='trap'?L('机关箱','Trapped chest'):L('宝箱','Chest'));c.globalAlpha=1}if(G.rival)arrow(G.rival.x,G.rival.y,'#ff9c5a',G.rival.down>0?G.rival.name[0]+' (倒地)':undefined);
    if(G.mission){const mt=missionTarget(),m=G.mission;if(mt)arrow(mt.x,mt.y,m.k==='mush'?'#ff8a52':'#ff5fe8',`${m.k==='mush'?L('采集灵芝','Gather lingzhi'):m.k==='statue'?L('摧毁邪碑','Destroy steles'):m.k==='seal'?L('封印邪阵','Seal the rift'):L('猎杀逃犯','Hunt the fugitive')} ${m.k==='seal'?Math.ceil(m.N-m.n)+'/'+m.N+'s':m.k==='hunt'?'':(m.N-m.n)+'/'+m.N} · ${Math.ceil(m.t)}s`)}if(G.boss&&!G.boss.dead)arrow(G.boss.x,G.boss.y,'#ff5a45',L(G.boss.name,G.boss.en));
    // minimap
    const mw=(PHONE?92:130)*S,mh=mw*H/W,mx=ow-mw-14*S,my=(PHONE?104:70)*S,k=mw/W;
    c.save();c.globalAlpha=.85;c.fillStyle='#0a0710cc';c.strokeStyle='#d6a54a99';c.lineWidth=1*S;c.beginPath();c.rect(mx,my,mw,mh);c.fill();c.stroke();
    c.fillStyle='#2f5a42';c.fillRect(mx+1,my+1,mw-2,mh-2);
    c.fillStyle='#4a4c46';c.beginPath();c.arc(mx+W/2*k,my+H/2*k,PLAZA_R*k,0,TAU);c.fill();
    c.fillStyle='#2a5a7a';PONDS.forEach(p=>{c.beginPath();c.ellipse(mx+p[0]*k,my+p[1]*k,p[2]*k,p[3]*k,0,0,TAU);c.fill()});
    c.fillStyle='#5a4a3a';TRAILS.forEach(t=>{c.strokeStyle='#6a5a40';c.lineWidth=1.2*S;c.beginPath();t.pts.forEach((p,i)=>i?c.lineTo(mx+p[0]*k,my+p[1]*k):c.moveTo(mx+p[0]*k,my+p[1]*k));c.stroke()});
    for(const s of G.shrines){c.fillStyle=s.cd<=0?'#ffd27a':'#6a6a6a';c.save();c.translate(mx+s.x*k,my+s.y*k);c.rotate(Math.PI/4);c.fillRect(-2.2*S,-2.2*S,4.4*S,4.4*S);c.restore()}
    c.fillStyle='#ff5a45';for(let i=0;i<G.en.length;i+=3){const e=G.en[i];if(e.type==='statue'||e.type==='boss')continue;c.fillRect(mx+e.x*k-.7*S,my+e.y*k-.7*S,1.4*S,1.4*S)}
    if(G.mission){const m=G.mission,mt=missionTarget(),col=m.k==='mush'?'#ff8a52':'#ff5fe8';c.strokeStyle='#7dff9c';c.lineWidth=1*S;c.beginPath();c.ellipse(mx+m.x*k,my+m.y*k,110*k,84*k,0,0,TAU);c.stroke();
      const draw=(o,big)=>{c.fillStyle=col;if(m.k==='mush'){c.beginPath();c.arc(mx+o.x*k,my+o.y*k,(big?3.6:2)*S,0,TAU);c.fill()}else{const w=(big?3.2:1.8)*S;c.fillRect(mx+o.x*k-w/2,my+o.y*k-w*1.4,w,w*2.8)}if(big){c.strokeStyle='#fff';c.lineWidth=1*S;c.beginPath();c.arc(mx+o.x*k,my+o.y*k,(5+Math.sin(U.uTime.value*5)*1.5)*S,0,TAU);c.stroke()}};
      if(m.k==='mush')G.mush.forEach(o=>draw(o,o===mt));else G.en.forEach(e=>{if(e.type==='statue'&&!e.dead)draw(e,e===mt)})}
    c.fillStyle='#ffd27a';for(const ch of G.chests){c.fillRect(mx+ch.x*k-2*S,my+ch.y*k-2*S,4*S,4*S)}
    if(G.boss){c.fillStyle='#ff2a3a';c.beginPath();c.arc(mx+G.boss.x*k,my+G.boss.y*k,3.4*S,0,TAU);c.fill()}
    if(G.rival){c.fillStyle='#ff9c5a';c.beginPath();c.arc(mx+G.rival.x*k,my+G.rival.y*k,2.4*S,0,TAU);c.fill()}
    c.fillStyle='#fff';c.beginPath();c.arc(mx+G.P.x*k,my+G.P.y*k,2.4*S,0,TAU);c.fill();
    c.strokeStyle='#ffffff55';c.strokeRect(mx+(camX-VW/2)*k,my+(camZ-VH/2)*k,VW*k,VH*k);c.restore()}
  if(!G.auto&&G.combo>=3){const k=G.comboT/2.4,big=Math.min(1,(2.4-G.comboT)*6),sz=(18+Math.min(G.combo,100)*.22)*S*(1+(1-big)*.6);c.save();c.textAlign='right';c.font=`800 ${sz}px "Alegreya Sans","PingFang SC",system-ui,sans-serif`;const x=ow-18*S,y=oh*.42;c.globalAlpha=.55+.45*k;c.lineWidth=5*S;c.strokeStyle='#160b12';const col=G.over9?'#ffd27a':G.combo>=25?'#ff9c5a':'#efe4cd';c.strokeText('×'+G.combo,x,y);c.fillStyle=col;c.fillText('×'+G.combo,x,y);c.font=`700 ${12*S}px "Alegreya Sans",system-ui`;c.strokeText(G.over9?'狂暴 OVERDRIVE':L('连斩','STREAK'),x,y+sz*.75);c.fillText(G.over9?'狂暴 OVERDRIVE':L('连斩','STREAK'),x,y+sz*.75);c.fillStyle='#0a0710aa';c.fillRect(x-90*S,y+sz*.95,90*S,4*S);c.fillStyle=col;c.fillRect(x-90*S*k,y+sz*.95,90*S*k,4*S);c.restore()}
  if(touch.on&&!G.auto){const r=$('#stage').getBoundingClientRect(),x=(touch.sx-r.left)*S,y=(touch.sy-r.top)*S,dx=touch.x-touch.sx,dy=touch.y-touch.sy,l=Math.min(1,hyp(dx,dy)/36)/(hyp(dx,dy)||1)*34*S;c.strokeStyle='rgba(239,228,205,.6)';c.lineWidth=2*S;c.beginPath();c.arc(x,y,34*S,0,TAU);c.stroke();c.fillStyle='rgba(239,228,205,.75)';c.beginPath();c.arc(x+dx*l,y+dy*l,11*S,0,TAU);c.fill()}
}
