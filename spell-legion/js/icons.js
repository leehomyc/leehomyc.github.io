'use strict';
/* icons.js — procedural emblem icons (inline SVG, no image files).
   Every skill, element, augment, perk, tree node, relic and class gets a drawn emblem in its own colour,
   used on the hero-select screen, upgrade cards, HUD seals and the codex. The brush glyph stays as a small corner mark. */
const ICON=(()=>{
  const P=(d,o={})=>`<path d="${d}" fill="${o.f||'none'}" stroke="${o.s===undefined?'#fff':o.s}" stroke-width="${o.w??3}" stroke-linecap="round" stroke-linejoin="round"${o.o!==undefined?` opacity="${o.o}"`:''}/>`;
  const C=(x,y,r,o={})=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${o.f||'none'}" stroke="${o.s===undefined?'#fff':o.s}" stroke-width="${o.w??3}"${o.o!==undefined?` opacity="${o.o}"`:''}/>`;
  const L=(x1,y1,x2,y2,o={})=>P(`M${x1} ${y1}L${x2} ${y2}`,o);
  const ring=(r,o={})=>C(32,32,r,o);
  const rays=(n,r1,r2,o={},off=0)=>{let s='';for(let i=0;i<n;i++){const a=off+i/n*Math.PI*2;s+=L(32+Math.cos(a)*r1,32+Math.sin(a)*r1,32+Math.cos(a)*r2,32+Math.sin(a)*r2,o)}return s};
  const blade=(c,len=34,w=5,ang=-45)=>`<g transform="rotate(${ang} 32 32)">${P(`M32 ${32-len/2}L${32+w/2} ${32+len/2-10}L32 ${32+len/2-4}L${32-w/2} ${32+len/2-10}Z`,{f:'#fff',s:'#fff',w:1})}${L(32,32-len/2+4,32,32+len/2-8,{s:c,w:1.6,o:.9})}${L(32-7,32+len/2-5,32+7,32+len/2-5,{s:c,w:3.5})}${L(32,32+len/2-4,32,32+len/2+6,{s:'#c9a24a',w:3})}</g>`;
  const flame=(c,x=32,y=36,k=1)=>P(`M${x} ${y-22*k}C${x+9*k} ${y-10*k} ${x+14*k} ${y-2*k} ${x+9*k} ${y+8*k}C${x+5*k} ${y+14*k} ${x-5*k} ${y+14*k} ${x-9*k} ${y+8*k}C${x-14*k} ${y-2*k} ${x-7*k} ${y-8*k} ${x-3*k} ${y-12*k}C${x-1*k} ${y-6*k} ${x+3*k} ${y-6*k} ${x} ${y-22*k}Z`,{f:c,s:'#fff',w:2})+P(`M${x} ${y-9*k}C${x+4*k} ${y-3*k} ${x+5*k} ${y+2*k} ${x} ${y+7*k}C${x-5*k} ${y+2*k} ${x-4*k} ${y-3*k} ${x} ${y-9*k}Z`,{f:'#fff',s:'none',o:.85});
  const bolt=(c,x=32,y=32,k=1)=>P(`M${x+4*k} ${y-20*k}L${x-8*k} ${y+2*k}L${x+1*k} ${y+2*k}L${x-4*k} ${y+20*k}L${x+9*k} ${y-4*k}L${x} ${y-4*k}Z`,{f:c,s:'#fff',w:2});
  const drop=(c,x=32,y=34,k=1)=>P(`M${x} ${y-18*k}C${x+8*k} ${y-6*k} ${x+12*k} ${y} ${x+12*k} ${y+6*k}A${12*k} ${12*k} 0 1 1 ${x-12*k} ${y+6*k}C${x-12*k} ${y} ${x-8*k} ${y-6*k} ${x} ${y-18*k}Z`,{f:c,s:'#fff',w:2});
  const heart=(c)=>P('M32 50C20 40 12 33 12 24C12 17 17 13 22 13C26 13 30 15 32 19C34 15 38 13 42 13C47 13 52 17 52 24C52 33 44 40 32 50Z',{f:c,s:'#fff',w:2});
  const shield=(c)=>P('M32 10L50 17V31C50 42 42 50 32 55C22 50 14 42 14 31V17Z',{f:c,s:'#fff',w:2.5});
  const S={
    // ---- normal attacks / weapons ----
    sword:c=>blade(c,40,6,-45)+rays(3,22,27,{s:c,w:2,o:.8},-.5),
    great:c=>blade(c,44,11,0)+L(18,46,46,46,{s:c,w:4,o:.6}),
    slash:c=>P('M12 44C18 22 40 12 54 16C38 20 26 30 20 50Z',{f:'#fff',s:'#fff',w:1})+P('M14 50C22 30 40 20 56 22',{s:c,w:3,o:.9})+L(44,40,52,48,{s:c,w:3,o:.7}),
    nodachi:c=>blade(c,50,5,-60)+L(10,50,22,50,{s:c,w:3,o:.7})+L(8,44,16,44,{s:c,w:2,o:.5}),
    charm:c=>P('M24 10H40V46L32 54L24 46Z',{f:c,s:'#fff',w:2.5})+L(32,18,32,42,{s:'#fff',w:3,o:.85})+P('M12 40C16 28 18 26 14 16',{s:'#fff',w:2,o:.6})+P('M52 42C48 30 46 28 50 18',{s:'#fff',w:2,o:.6}),
    whisk:c=>L(18,52,30,24,{s:'#c9a24a',w:4})+P('M30 24C34 14 44 10 54 12',{s:'#fff',w:2.5})+P('M30 24C36 16 46 14 55 18',{s:'#fff',w:2.5,o:.8})+P('M30 24C38 20 48 20 56 26',{s:'#fff',w:2.5,o:.6})+C(30,24,3.5,{f:c,s:'#fff',w:1.5}),
    wave:c=>P('M20 14C34 24 34 40 20 50',{s:'#fff',w:3})+P('M30 10C48 22 48 42 30 54',{s:c,w:3,o:.9})+P('M40 8C62 22 62 42 40 56',{s:c,w:2.5,o:.6}),
    drum:c=>ring(10,{f:c,s:'#fff',w:2.5})+ring(17,{s:'#fff',w:2,o:.8})+ring(24,{s:c,w:2,o:.6})+ring(29,{s:c,w:1.5,o:.35}),
    // ---- swordsman ----
    palm:c=>P('M32 54C22 54 16 46 16 36V22C16 19 20 19 20 22V32M26 30V16C26 13 30 13 30 16V30M36 30V14C36 11 40 11 40 14V30M46 32V20C46 17 50 17 50 20V36C50 46 42 54 32 54',{s:'#fff',w:3})+P('M8 40C12 30 10 22 6 16',{s:c,w:2.5,o:.8})+P('M58 44C56 34 58 26 62 20',{s:c,w:2.5,o:.8}),
    array:c=>ring(20,{s:c,w:2,o:.7})+[0,90,180,270].map(a=>`<g transform="rotate(${a} 32 32)">${P('M32 8L35 16L32 24L29 16Z',{f:'#fff',s:'#fff',w:1})}</g>`).join('')+C(32,32,5,{f:c,s:'#fff',w:2}),
    talis:c=>P('M22 8H42V48L32 56L22 48Z',{f:'#e8d9b8',s:'#fff',w:2})+bolt(c,32,30,.75),
    sunder:c=>[-14,0,14].map((x,i)=>`<g transform="translate(${x} ${i===1?-4:4})">${P('M32 10L35 20L32 48L29 20Z',{f:'#fff',s:'#fff',w:1})}${L(32,46,32,54,{s:c,w:3})}</g>`).join('')+P('M12 58C22 50 42 50 52 58',{s:c,w:2.5,o:.7}),
    // ---- taoist ----
    bagua:c=>P('M32 6L50 14L58 32L50 50L32 58L14 50L6 32L14 14Z',{f:c,s:'#fff',w:2.5,o:.9})+ring(13,{s:'#fff',w:2.5})+P('M32 19A13 13 0 0 1 32 45A6.5 6.5 0 0 1 32 32A6.5 6.5 0 0 0 32 19Z',{f:'#fff',s:'none'})+C(32,25.5,2,{f:'#120a14',s:'none'})+C(32,38.5,2,{f:'#fff',s:'none'}),
    ward:c=>shield(c)+P('M32 22V42M22 32H42',{s:'#fff',w:3.5})+ring(27,{s:c,w:1.5,o:.5}),
    exorcise:c=>rays(8,14,26,{s:'#fff',w:3})+rays(8,18,24,{s:c,w:3,o:.8},Math.PI/8)+C(32,32,9,{f:c,s:'#fff',w:2.5}),
    // ---- blademaster ----
    whirl:c=>P('M32 32C32 22 42 18 48 24C54 30 50 42 40 44C30 46 22 38 24 28C26 18 38 10 48 14',{s:'#fff',w:3})+P('M32 32C32 40 22 46 16 40C10 34 14 22 24 20',{s:c,w:3,o:.8})+C(32,32,3,{f:'#fff',s:'none'}),
    leap:c=>P('M32 10L44 24H37V38H27V24H20Z',{f:'#fff',s:'#fff',w:1.5})+P('M10 48L20 46L26 52L32 46L38 52L44 46L54 48',{s:c,w:3.5})+L(14,56,50,56,{s:c,w:2,o:.5}),
    roar:c=>C(20,32,5,{f:'#fff',s:'none'})+P('M28 20A14 14 0 0 1 28 44',{s:'#fff',w:3})+P('M36 12A24 24 0 0 1 36 52',{s:c,w:3,o:.9})+P('M44 6A32 32 0 0 1 44 58',{s:c,w:2.5,o:.5}),
    frenzy:c=>drop('#ff4a4a',32,34,.9)+flame('#ffb04a',32,16,.5)+L(24,58,40,58,{s:c,w:3,o:.6}),
    // ---- qin ----
    flow:c=>P('M8 22C16 14 24 30 32 22C40 14 48 30 56 22',{s:'#fff',w:3})+P('M8 34C16 26 24 42 32 34C40 26 48 42 56 34',{s:c,w:3,o:.85})+P('M8 46C16 38 24 54 32 46C40 38 48 54 56 46',{s:c,w:3,o:.6}),
    ambush:c=>rays(10,10,27,{s:'#fff',w:2.5})+rays(10,8,16,{s:c,w:3,o:.9},Math.PI/10)+C(32,32,5,{f:c,s:'#fff',w:2}),
    guangling:c=>P('M38 10V40',{s:'#fff',w:3.5})+P('M38 10C46 14 48 20 44 26',{s:'#fff',w:3.5})+C(31,42,7,{f:'#fff',s:'none'})+ring(26,{s:c,w:2,o:.7})+ring(20,{s:c,w:1.5,o:.4}),
    // ---- monk ----
    staff:c=>L(14,50,50,14,{s:'#c9a24a',w:5})+C(50,14,4,{s:c,w:2.5})+C(14,50,3,{f:c,s:'none'})+rays(3,20,26,{s:c,w:2,o:.6},.6),
    fist:c=>P('M20 30V46C20 52 26 56 32 56H40C46 56 50 52 50 46V34H44V26C44 22 38 22 38 26V32H34V22C34 18 28 18 28 22V32H24V26C24 22 20 22 20 26Z',{f:c,s:'#fff',w:2.5})+P('M20 40H50',{s:'#fff',w:2,o:.6}),
    vajra:c=>P('M32 14V50',{s:'#fff',w:4})+P('M22 14C28 18 36 18 42 14M22 50C28 46 36 46 42 50M22 14V22C26 24 38 24 42 22V14M22 50V42C26 40 38 40 42 42V50',{s:c,w:3})+C(32,32,5,{f:c,s:'#fff',w:2}),
    tiger:c=>P('M16 14C20 26 20 38 16 50M28 10C32 24 32 40 28 54M40 10C44 24 44 40 40 54M52 14C48 26 48 38 52 50',{s:c,w:4})+P('M12 32H52',{s:'#fff',w:2,o:.4}),
    zen:c=>P('M32 48C20 48 12 40 12 32C20 34 26 40 32 48C38 40 44 34 52 32C52 40 44 48 32 48Z',{f:c,s:'#fff',w:2})+P('M32 48C26 38 26 26 32 16C38 26 38 38 32 48Z',{f:'#fff',s:'#fff',w:1,o:.9})+ring(26,{s:c,w:1.5,o:.5}),
    sarira:c=>C(32,32,9,{f:c,s:'#fff',w:2.5})+rays(8,14,22,{s:'#fff',w:2.5})+P('M32 8A24 24 0 0 1 56 32',{s:c,w:3,o:.8})+P('M32 56A24 24 0 0 1 8 32',{s:c,w:3,o:.8}),
    // ---- physician ----
    needle:c=>P('M12 52L48 16M18 54L52 20M8 44L42 10',{s:'#fff',w:2.5})+C(48,16,3,{f:c,s:'none'})+C(52,20,3,{f:c,s:'none'})+C(42,10,3,{f:c,s:'none'})+drop(c,18,38,.4),
    pouch:c=>P('M24 18C16 26 12 34 14 44C16 52 48 52 50 44C52 34 48 26 40 18Z',{f:'#8a5a32',s:'#fff',w:2.5})+P('M24 18C28 12 36 12 40 18',{s:'#fff',w:3})+P('M22 20H42',{s:c,w:3})+C(32,38,5,{f:c,s:'none',o:.8}),
    plague:c=>drop(c,32,30,1)+C(27,30,2.5,{f:'#120a14',s:'none'})+C(37,30,2.5,{f:'#120a14',s:'none'})+P('M28 40H36',{s:'#120a14',w:2.5})+rays(6,24,30,{s:c,w:2,o:.6}),
    gu:c=>P('M32 20C40 20 46 28 46 36C46 44 40 52 32 52C24 52 18 44 18 36C18 28 24 20 32 20Z',{f:c,s:'#fff',w:2.5})+P('M32 20V52M18 36H46',{s:'#120a14',w:1.5,o:.6})+P('M26 16L22 10M38 16L42 10M18 30L10 26M46 30L54 26M18 42L10 46M46 42L54 46',{s:'#fff',w:2.5}),
    rejuv:c=>P('M32 52C32 36 20 28 10 26C14 40 22 50 32 52ZM32 52C32 36 44 28 54 26C50 40 42 50 32 52Z',{f:c,s:'#fff',w:2})+P('M32 52V18',{s:'#fff',w:3})+heart('#ff9fb6').replace('<path','<path transform="translate(16 2) scale(.5)"'),
    numb:c=>P('M14 22H30L14 38H30',{s:'#fff',w:4})+P('M34 12H46L34 24H46',{s:c,w:3.5})+P('M40 36H52L40 48H52',{s:c,w:3,o:.7})+P('M12 52C20 46 44 46 52 52',{s:c,w:2,o:.5}),
    // ---- elements ----
    fire:c=>flame(c,32,36,1),
    ice:c=>rays(6,0,22,{s:'#fff',w:3})+[0,60,120].map(a=>`<g transform="rotate(${a} 32 32)">${P('M32 14L27 20M32 14L37 20M32 50L27 44M32 50L37 44',{s:c,w:2.5})}</g>`).join('')+C(32,32,4,{f:c,s:'#fff',w:2}),
    lightning:c=>bolt(c,32,32,1),
    acid:c=>drop(c,32,34,1)+C(27,36,2.5,{f:'#fff',s:'none',o:.9})+C(35,42,1.8,{f:'#fff',s:'none',o:.7}),
    dark:c=>P('M40 8A24 24 0 1 0 40 56A19 19 0 1 1 40 8Z',{f:c,s:'#fff',w:2})+rays(3,36,44,{s:c,w:1.5,o:.5},-.4),
    // ---- augments ----
    burst:c=>P('M14 20L28 32L14 44',{s:'#fff',w:4})+P('M30 20L44 32L30 44',{s:c,w:4})+P('M46 20L58 32L46 44',{s:c,w:3,o:.5}),
    split:c=>P('M32 54V32M32 32L14 14M32 32L50 14',{s:'#fff',w:4})+P('M14 14L20 14M14 14L14 20M50 14L44 14M50 14L50 20',{s:c,w:3}),
    giant:c=>ring(10,{s:c,w:3,o:.7})+ring(20,{s:'#fff',w:3})+rays(4,24,30,{s:c,w:3},Math.PI/4),
    extra:c=>ring(18,{s:c,w:2.5,o:.8})+[0,90,180,270,45,135,225,315].map((a,i)=>`<g transform="rotate(${a} 32 32)">${C(32,14,i<4?4:3,{f:i<4?'#fff':c,s:'none'})}</g>`).join(''),
    // ---- perks (by glyph) ----
    '锋':c=>blade(c,40,6,-30)+P('M14 14L20 20',{s:'#fff',w:3})+P('M50 14L44 20',{s:'#fff',w:3}),
    '罩':c=>P('M16 36C16 20 48 20 48 36V42H16Z',{f:c,s:'#fff',w:2.5})+L(32,12,32,20,{s:'#fff',w:4})+L(12,48,52,48,{s:'#fff',w:3}),
    '轻':c=>P('M18 50C22 30 40 14 54 10C50 26 40 42 24 48',{f:c,s:'#fff',w:2.5})+P('M18 50C28 38 40 28 50 16',{s:'#fff',w:2,o:.8}),
    '息':c=>P('M32 32C32 22 42 22 42 30C42 38 24 38 24 28C24 16 46 16 48 32C50 48 20 50 16 32',{s:'#fff',w:3})+ring(27,{s:c,w:2,o:.6}),
    '命':c=>heart(c),
    '摄':c=>P('M18 10V30A14 14 0 0 0 46 30V10',{s:c,w:7})+P('M18 10V20M46 10V20',{s:'#fff',w:7})+rays(3,34,42,{s:'#fff',w:2,o:.6},Math.PI*.3),
    '疾':c=>P('M8 22H40C48 22 48 12 40 12',{s:'#fff',w:3.5})+P('M12 34H50C58 34 58 44 50 44',{s:c,w:3.5})+P('M8 46H30',{s:'#fff',w:3,o:.7}),
    '杀':c=>ring(16,{s:'#fff',w:3})+ring(6,{f:c,s:'none'})+rays(4,10,26,{s:c,w:3}),
    // ---- tree nodes (by effect) ----
    dmg:c=>blade(c,34,6,-45)+P('M44 14L52 14L52 22',{s:'#fff',w:3.5}),
    cd:c=>ring(20,{s:'#fff',w:3})+P('M32 18V32L42 38',{s:c,w:3.5})+P('M20 8L14 14M44 8L50 14',{s:c,w:3}),
    count:c=>C(20,32,6,{f:'#fff',s:'none'})+C(36,32,6,{f:'#fff',s:'none',o:.8})+P('M50 24V40M42 32H58',{s:c,w:4}),
    pierce:c=>P('M6 32H52',{s:'#fff',w:4})+P('M44 22L56 32L44 42',{s:'#fff',w:4})+ring(10,{s:c,w:3,o:.7})+C(32,32,14,{s:c,w:2,o:.4}),
    size:c=>ring(10,{s:'#fff',w:3})+P('M14 14L22 22M50 14L42 22M14 50L22 42M50 50L42 42',{s:c,w:3.5})+P('M8 8H18M8 8V18M56 8H46M56 8V18M8 56H18M8 56V46M56 56H46M56 56V46',{s:c,w:2.5,o:.7}),
    cost:c=>drop(c,32,34,.9)+P('M26 40L38 28',{s:'#fff',w:3}),
    dur:c=>P('M20 10H44L32 32L44 54H20L32 32Z',{s:'#fff',w:3})+P('M26 50H38L32 40Z',{f:c,s:'none'}),
    knock:c=>C(22,32,8,{f:'#fff',s:'none'})+P('M34 22L50 14M34 32H54M34 42L50 50',{s:c,w:4}),
    crit:c=>ring(18,{s:'#fff',w:3})+ring(8,{s:c,w:3})+P('M32 6V16M32 48V58M6 32H16M48 32H58',{s:c,w:3.5}),
    life:c=>heart(c)+P('M26 30H38M32 24V36',{s:'#fff',w:3}),
    chain:c=>bolt(c,22,30,.6)+bolt(c,42,36,.6)+P('M26 44L38 24',{s:'#fff',w:2.5,o:.7}),
    // ---- misc ----
    contract:c=>P('M20 12H44V52H20Z',{f:'#e8d9b8',s:'#fff',w:2})+P('M26 22H38M26 30H38M26 38H34',{s:'#5a2a2a',w:2.5})+C(40,46,5,{f:'#b8322b',s:'none'}),
    jackpot:c=>C(24,36,12,{f:c,s:'#fff',w:2})+C(40,30,12,{f:c,s:'#fff',w:2})+C(32,24,12,{f:c,s:'#fff',w:2})+P('M32 18V30M28 24H36',{s:'#fff',w:2.5}),
    awake:c=>rays(12,22,30,{s:c,w:2.5,o:.8})+P('M8 32C16 20 48 20 56 32C48 44 16 44 8 32Z',{f:'#120a14',s:'#fff',w:2.5})+C(32,32,8,{f:c,s:'#fff',w:2})+C(32,32,3,{f:'#fff',s:'none'}),
    dash:c=>P('M34 10C20 20 20 44 34 54',{s:'#fff',w:3.5})+P('M44 16C34 24 34 40 44 48',{s:c,w:3,o:.8})+P('M10 24H24M6 32H22M10 40H24',{s:c,w:3}),
    auto:c=>ring(10,{s:'#fff',w:4})+rays(8,16,24,{s:c,w:5})+ring(18,{s:c,w:2,o:.4}),
    manual:c=>S.palm(c),
    relic:c=>P('M32 8L52 28L32 56L12 28Z',{f:c,s:'#fff',w:2.5})+P('M12 28H52M32 8L22 28L32 56M32 8L42 28L32 56',{s:'#fff',w:1.5,o:.7}),
    chest:c=>P('M12 24H52V52H12Z',{f:'#6a3a1a',s:'#fff',w:2.5})+P('M12 24C12 14 52 14 52 24',{f:'#8a4a22',s:'#fff',w:2.5})+P('M12 34H52',{s:c,w:3})+C(32,36,4,{f:c,s:'#fff',w:1.5}),
    boss:c=>P('M32 8C18 8 12 18 12 30C12 38 16 42 20 46V54H44V46C48 42 52 38 52 30C52 18 46 8 32 8Z',{f:'#e8d9b8',s:'#fff',w:2})+C(24,30,5,{f:'#120a14',s:'none'})+C(40,30,5,{f:'#120a14',s:'none'})+P('M28 44V52M36 44V52',{s:'#120a14',w:3})+flame(c,32,-2,.5),
    gold:c=>C(32,32,18,{f:c,s:'#fff',w:2.5})+P('M26 24H38M26 32H38M32 20V44',{s:'#7a4a10',w:3}),
    trophy:c=>P('M20 10H44V26C44 36 36 40 32 40C28 40 20 36 20 26Z',{f:c,s:'#fff',w:2.5})+P('M20 14H12V22C12 28 18 30 20 30M44 14H52V22C52 28 46 30 44 30',{s:'#fff',w:2.5})+P('M32 40V50M22 54H42',{s:'#fff',w:3.5}),
  };
  const CLS={swordsman:'sword',taoist:'talis',blademaster:'slash',qin:'wave',monk:'staff',physician:'needle'};
  const NODE_GLYPH={};
  function svg(shape,c,cls=''){const f=S[shape]||S.relic;return `<svg class="ic ${cls}" viewBox="0 0 64 64" style="--c:${c}" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#120a14" stroke="${c}" stroke-width="2.5"/><circle cx="32" cy="32" r="27" fill="${c}" opacity=".14"/><circle cx="32" cy="32" r="27.5" fill="none" stroke="#000" stroke-width="1.2" opacity=".55"/><g>${f(c)}</g></svg>`}
  return {
    S,svg,
    spell:(id,cls)=>{const m=SPELLS[id];return m?svg(S[id]?id:'relic',m.col,cls):''},
    cls:(id,cls)=>{const C=CLASSES[id];return C?svg(CLS[id]||'relic',C.col,cls):''},
    el:(id,cls)=>{const e=ELS[id];return e?svg(id,e.col,cls):''},
    aug:(id,c,cls)=>svg(id,c||'#d6a54a',cls),
    perk:(g,cls)=>svg(S[g]?g:'relic','#efe4cd',cls),
    node:(fx,c,cls)=>svg(S[fx]?fx:'dmg',c||'#ffd27a',cls),
    misc:(k,c,cls)=>svg(k,c||'#ffd27a',cls),
    /* the emblem for an upgrade card: the skill (or perk) being changed, plus what changes it as a small badge */
    card:cd=>{
      let main='',badge='';
      if(cd.kind==='contract')main=svg('contract','#ff6a6a');
      else if(cd.kind==='jackpot')main=svg('jackpot','#ffd27a');
      else if(cd.skill&&SPELLS[cd.skill])main=svg(S[cd.skill]?cd.skill:'relic',cd.c||SPELLS[cd.skill].col);
      else if(cd.kind==='passive')main=svg(S[cd.g]?cd.g:'relic',cd.c||'#efe4cd');
      else main=svg('relic',cd.c||'#ffd27a');
      if(cd.badge){const el=Object.keys(ELS).find(k=>ELS[k].g===cd.badge),au=Object.keys(AUGS).find(k=>AUGS[k].g===cd.badge);
        if(cd.kind==='awake')badge=svg('awake','#ffd27a','bd');
        else if(el)badge=svg(el,ELS[el].col,'bd');
        else if(au)badge=svg(au,'#d6a54a','bd');
        else if(cd.nodeFx)badge=svg(S[cd.nodeFx]?cd.nodeFx:'dmg','#ffd27a','bd');
        else if(cd.kind==='new')badge='';
        else badge=`<span class="bd t">${cd.badge}</span>`}
      else if(cd.isNew||cd.kind==='new')badge=`<span class="bd t new">${LANG==='zh'?'新':'NEW'}</span>`;
      return main+badge;
    }
  };
})();
