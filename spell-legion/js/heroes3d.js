'use strict';
/* heroes3d.js — rigged, animated heroes replacing the primitive-built ones.
   Models and animations: KayKit Adventurers by Kay Lousberg (CC0, kaylousberg.com), compressed and split into
   one shared animation file plus one small mesh file per character (assets/chars).
   The old hero group is kept as the anchor (position, facing, sigil, qi orb glow); its primitive body is hidden and the
   skinned model rides inside it. Animation is layered: legs follow movement while the upper body attacks and casts. */
const K3={ready:false,models:{},clipsUp:{},clipsLow:{},clipsFull:{},loading:null};
const K3_PROPS=['1H_Sword_Offhand','Badge_Shield','Rectangle_Shield','Round_Shield','Spike_Shield','1H_Sword','2H_Sword','Spellbook','Spellbook_open','1H_Wand','2H_Staff','1H_Axe_Offhand','Barbarian_Round_Shield','1H_Axe','2H_Axe','Mug','Knife_Offhand','1H_Crossbow','2H_Crossbow','Knife','Throwable'];
const K3_CLASS={
  swordsman:{m:'Knight',w:{sword:['1H_Sword','Round_Shield'],great:['2H_Sword']}},
  taoist:{m:'Mage',w:{charm:['Spellbook_open','1H_Wand'],whisk:['2H_Staff']}},
  blademaster:{m:'Barbarian',w:{slash:['1H_Axe','1H_Axe_Offhand'],nodachi:['2H_Axe']}},
  qin:{m:'Rogue_Hooded',w:{wave:['1H_Crossbow'],drum:['2H_Crossbow']}},
  monk:{m:'Barbarian',w:{staff:[],fist:[]},hide:['Barbarian_Hat']},
  physician:{m:'Rogue',w:{needle:['Knife','Throwable'],pouch:['Throwable']}},
};
/* how each normal attack looks */
const K3_ATK={sword:'1H_Melee_Attack_Slice_Horizontal',great:'2H_Melee_Attack_Slice',charm:'Spellcast_Shoot',whisk:'1H_Melee_Attack_Slice_Diagonal',slash:'Dualwield_Melee_Attack_Slice',nodachi:'2H_Melee_Attack_Chop',wave:'1H_Ranged_Shoot',drum:'2H_Ranged_Shoot',staff:'Unarmed_Melee_Attack_Punch_B',fist:'Unarmed_Melee_Attack_Punch_A',needle:'Throw',pouch:'Throw'};
const K3_CASTER={taoist:1,qin:1,physician:1};
const K3_UPPER=new Set(['spine','chest','head','upperarm.l','lowerarm.l','wrist.l','hand.l','handslot.l','upperarm.r','lowerarm.r','wrist.r','hand.r','handslot.r','elbowIK.l','handIK.l','elbowIK.r','handIK.r']);
function k3Split(clip){const up=[],low=[];for(const t of clip.tracks){const bone=t.name.slice(0,t.name.lastIndexOf('.'));(K3_UPPER.has(bone)?up:low).push(t)}
  return [new THREE.AnimationClip(clip.name+'_up',clip.duration,up),new THREE.AnimationClip(clip.name+'_low',clip.duration,low)]}
function k3Load(){if(K3.loading)return K3.loading;if(typeof THREE.GLTFLoader==='undefined')return Promise.resolve(false);
  const ld=new THREE.GLTFLoader(),get=u=>new Promise((res,rej)=>ld.load(u,res,undefined,rej));
  const need=new Set(['anims']);for(const k in K3_CLASS)need.add(K3_CLASS[k].m);
  K3.loading=Promise.all([...need].map(n=>get(`assets/chars/${n}.glb`).then(g=>[n,g]))).then(list=>{
    for(const [n,g] of list){if(n==='anims'){for(const c of g.animations){K3.clipsFull[c.name]=c;const [u,l]=k3Split(c);K3.clipsUp[c.name]=u;K3.clipsLow[c.name]=l}}else K3.models[n]=g}
    K3.ready=true;k3Upgrade();return true}).catch(err=>{console.warn('hero models unavailable',err);return false});
  return K3.loading}
/* a soft rim light and a little lift, so the models read against the ground like the rest of the scene */
function k3Mat(src,tint){const m=src.clone();m.metalness=0;m.roughness=.78;if(tint)m.color.setRGB(tint[0],tint[1],tint[2]);
  m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <tonemapping_fragment>','{float rimF=1.0-max(dot(normalize(vViewPosition),normal),0.0);gl_FragColor.rgb+=vec3(1.0,.93,.82)*pow(rimF,3.0)*.3;}\n#include <tonemapping_fragment>')};
  m.customProgramCacheKey=()=>'k3rim'+(tint?tint.join(','):'');return m}
/* inverted-hull outline that follows the skin */
function k3Outline(mesh){const m=new THREE.MeshBasicMaterial({color:0x140a0c,side:THREE.BackSide,skinning:!!mesh.isSkinnedMesh});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normalize(normal)*0.022;')};m.customProgramCacheKey=()=>'k3line';
  let o;if(mesh.isSkinnedMesh){o=new THREE.SkinnedMesh(mesh.geometry,m);o.bind(mesh.skeleton,mesh.bindMatrix)}else o=new THREE.Mesh(mesh.geometry,m);
  o.position.copy(mesh.position);o.quaternion.copy(mesh.quaternion);o.scale.copy(mesh.scale);o.castShadow=false;o.frustumCulled=false;o.renderOrder=-1;return o}
function k3Attach(h){if(!K3.ready||!h||h.k3||!K3_CLASS[h.cls])return;const C=K3_CLASS[h.cls],src=K3.models[C.m];if(!src)return;
  const g=h.g,keep={p:g.position.clone(),r:g.rotation.clone(),s:g.scale.clone()};g.position.set(0,0,0);g.rotation.set(0,0,0);g.scale.set(1,1,1);g.updateMatrixWorld(true);
  g.position.copy(keep.p);g.rotation.copy(keep.r);g.scale.copy(keep.s);
  for(const c of g.children)c.visible=false;
  const obj=THREE.SkeletonUtils.clone(src.scene);const S=(h.slot==='preview'?34:44)/2.35;obj.scale.set(S,S,S);
  const show=new Set([...(C.w[h.weapon]||Object.values(C.w)[0]),...(C.show||[])]),hide=new Set([...K3_PROPS,...(C.hide||[])]);
  const lines=[];obj.traverse(o=>{if(hide.has(o.name)&&!show.has(o.name))o.visible=false;
    if(o.isMesh){o.material=k3Mat(o.material,C.tint);o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;if(o.parent&&o.visible)lines.push(o)}});
  for(const o of lines){let v=true;for(let p=o;p;p=p.parent)if(!p.visible){v=false;break}if(v)o.parent.add(k3Outline(o))}
  g.add(obj);const mixer=new THREE.AnimationMixer(obj);
  const act=(layer,name)=>{const clip=(layer==='up'?K3.clipsUp:layer==='low'?K3.clipsLow:K3.clipsFull)[name];return clip?mixer.clipAction(clip):null};
  h.k3={obj,mixer,act,cur:{up:null,low:null},atk:K3_ATK[h.weapon]||'1H_Melee_Attack_Chop',atkT:0,hitT:0,lastCast:0,downed:false};
  k3Play(h.k3,'low','Idle',0);k3Play(h.k3,'up','Idle',0)}
function k3Play(k,layer,name,fade=.18,once=false,dur=0){const a=k.act(layer,name);if(!a)return;const cur=k.cur[layer];
  if(cur===a&&!once)return;a.enabled=true;a.setEffectiveWeight(1);
  if(once){a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.timeScale=dur?a.getClip().duration/dur:1}else{a.setLoop(THREE.LoopRepeat,Infinity);a.timeScale=1;if(cur!==a)a.reset()}
  a.play();if(cur&&cur!==a)cur.crossFadeTo(a,fade,false);else if(!cur)a.fadeIn(fade);k.cur[layer]=a}
function k3Upgrade(){for(const s in HEROES)if(HEROES[s])k3Attach(HEROES[s]);if(typeof ROOMH!=='undefined')for(const k in ROOMH)if(ROOMH[k]&&ROOMH[k].h)k3Attach(ROOMH[k].h);
  if(typeof PV!=='undefined'&&PV&&PV.hero){const main=scene;try{k3Attach(PV.hero)}finally{scene=main}}}
(()=>{const bm=buildHeroModel;buildHeroModel=function(cls,slot,w){const h=bm(cls,slot,w);try{k3Attach(h)}catch(err){console.warn(err)}return h}})();
(()=>{const ah=animHero;animHero=function(h,P,isP,tm,rdt){ah(h,P,isP,tm,rdt);const k=h&&h.k3;if(!k)return;
  const over=G&&G.over;let base=P.vK>.45?'Running_A':P.vK>.08?'Walking_A':'Idle';
  if(P.down>0){if(!k.downed){k.downed=true;k3Play(k,'low','Death_A',.1,true);k3Play(k,'up','Death_A',.1,true)}k.mixer.update(rdt);return}
  if(k.downed){k.downed=false;k.cur.up=k.cur.low=null;k.mixer.stopAllAction()}
  if(isP&&over==='win'){k3Play(k,'low','Cheer',.3);k3Play(k,'up','Cheer',.3);k.mixer.update(rdt);return}
  if(P.dash>0){if(!k.dashing){k.dashing=true;k3Play(k,'low','Dodge_Forward',.06,true,.3);k3Play(k,'up','Dodge_Forward',.06,true,.3)}k.mixer.update(rdt);return}
  if(k.dashing){k.dashing=false;k.cur.up=k.cur.low=null}
  const spells=isP?G.spells:P.spells,whirl=spells&&spells.find(s=>s.id==='whirl'&&s.active>0);
  // a cast pulse (P.cast jumps back up) starts an upper-body attack
  const c=P.cast||0;if(c>k.lastCast+.25){const skill=k.skillPulse;k.skillPulse=0;const name=skill?(K3_CASTER[h.cls]?'Spellcast_Raise':h.cls==='monk'?'Unarmed_Melee_Attack_Punch_A':'2H_Melee_Attack_Chop'):k.atk;
    const iv=isP&&G.spells[0]?Math.max(.22,Math.min(.6,(SPELLS[G.spells[0].id].cd||.5)*.9)):.45;k3Play(k,'up',name,.06,true,skill?.5:iv);k.atkT=skill?.5:iv}
  k.lastCast=c;k.atkT=Math.max(0,k.atkT-rdt);k.hitT=Math.max(0,k.hitT-rdt);
  if(whirl){k3Play(k,'low','2H_Melee_Attack_Spinning',.1);k3Play(k,'up','2H_Melee_Attack_Spinning',.1)}
  else{k3Play(k,'low',base,.2);if(k.atkT<=0&&k.hitT<=0)k3Play(k,'up',base,.2)}
  k.obj.rotation.y=whirl?-(tm*22-(P.yaw||0)):0;
  k.mixer.update(rdt)}})();
/* react to skill casts and getting hit */
if(typeof xOn==='function'){xOn('cast',()=>{const h=HEROES.player;if(h&&h.k3)h.k3.skillPulse=1});
  xOn('hurt',n=>{const h=HEROES.player;if(h&&h.k3&&n>2&&h.k3.atkT<=0&&h.k3.hitT<=0){h.k3.hitT=.3;k3Play(h.k3,'up','Hit_A',.05,true,.3)}return n})}
/* hero screen preview: idle with an occasional flourish */
(()=>{if(typeof previewTick!=='function')return;const pt=previewTick;previewTick=function(dt){pt(dt);const H=PV&&PV.hero,k=H&&H.k3;if(!k)return;
  k.pt=(k.pt||0)+dt;if(!k.cur.low){k3Play(k,'low','Idle',0);k3Play(k,'up','Idle',0)}
  if(PV.pop>.9&&!k.popd){k.popd=1;k3Play(k,'low','Cheer',.15,true,1.4);k3Play(k,'up','Cheer',.15,true,1.4);k.back=1.4}else if(PV.pop<.5)k.popd=0;
  if(k.back>0){k.back-=dt;if(k.back<=0){k3Play(k,'low','Idle',.3);k3Play(k,'up','Idle',.3)}}
  else if(k.pt>5){k.pt=0;k3Play(k,'up',k.atk,.1,true,.7);k.back=.75}
  H.g.position.y=0;k.mixer.update(dt);PV.r.render(PV.sc,PV.cm)}})();
setTimeout(()=>k3Load(),300);
