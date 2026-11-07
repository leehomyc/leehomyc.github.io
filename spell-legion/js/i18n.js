'use strict';
/* i18n.js — five languages on top of the original two-slot code.
   The game code is written as L(简体, English) and LL(obj) (obj.zh/obj.en, obj.d/obj.de).
   LOC is the player's language: zh 简体 · zt 繁體 · en English · ja 日本語 · ko 한국어.
   LANG is the slot the code reads: 'zh' for zh/zt, 'en' for en/ja/ko.
   tr() then turns the slot text into the final language:
     zt → simplified-to-traditional conversion (i18n/zt.js: character map + phrase fixes)
     ja / ko → lookup in i18n/ja.js / i18n/ko.js keyed by the English text.
       Keys with {0},{1}… are templates; the captured pieces are translated again (skill names inside sentences).
   New text: keep writing L('简体','English'); then run tools/i18n (see I18N.md) to add the Japanese/Korean lines.
   Missing Japanese/Korean lines fall back to English and are listed in I18N.miss for the check script. */
const LOCS=['zh','zt','en','ja','ko'];
const LOC_NAME={zh:'简体中文',zt:'繁體中文',en:'English',ja:'日本語',ko:'한국어'};
const LOC_HTML={zh:'zh',zt:'zh-Hant',en:'en',ja:'ja',ko:'ko'};
/* first match wins:
   1. the link itself — /spell-legion/ja/ or ?lang=ja (the folder pages forward here with ?lang=)
   2. the player's own pick in Settings or the menu chip (sl_lang)
   3. the country of their IP, looked up once and cached (sl_lang_ip; see langAuto in ui.js)
   4. the browser's language */
const LANGS=LOCS;
const LANG_BY_COUNTRY={CN:'zh',SG:'zh',HK:'zt',MO:'zt',TW:'zt',JP:'ja',KR:'ko'};
let LANG_FROM_URL=false;
function browserLoc(){
  const ls=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en']).map(x=>String(x).toLowerCase());
  for(const l of ls){
    if(/^zh-(tw|hk|mo)|^zh-hant/.test(l))return 'zt';
    if(l.startsWith('zh'))return 'zh';
    if(l.startsWith('ja'))return 'ja';
    if(l.startsWith('ko'))return 'ko';
    if(l.startsWith('en'))return 'en';
  }
  return 'en';
}
function detectLoc(){
  try{const q=new URLSearchParams(location.search).get('lang');if(LOCS.includes(q)){localStorage.setItem('sl_lang',q);LANG_FROM_URL=true;return q}
    const l=localStorage.getItem('sl_lang');if(LOCS.includes(l))return l;
    const ip=localStorage.getItem('sl_lang_ip');if(LOCS.includes(ip))return ip}catch(_){}
  return browserLoc();
}
let LOC=detectLoc();
let LANG=(LOC==='zh'||LOC==='zt')?'zh':'en';
const I18N={D:{},P:{},cache:new Map(),miss:new Set(),loading:{},ready:[],
  ver:(document.currentScript&&(document.currentScript.src.split('?v=')[1]||''))||''};
/* data files call this */
function I18N_LOAD(loc,data){I18N.D[loc]=data;I18N.P[loc]=null;I18N.cache.clear();
  const cbs=I18N.ready;I18N.ready=[];cbs.forEach(f=>{try{f()}catch(e){console.error(e)}})}
function i18nFile(loc){return loc==='zt'?'zt':loc==='ja'||loc==='ko'?loc:null}
/* load the active language's data before the rest of the game parses (synchronous on first load) */
(function(){const f=i18nFile(LOC);if(f)document.write(`<script src="i18n/${f}.js?v=${I18N.ver}"><\/script>`)})();
function i18nEnsure(loc,cb){
  const f=i18nFile(loc);if(!f||I18N.D[loc]){cb&&cb();return}
  if(cb)I18N.ready.push(cb);
  if(I18N.loading[f])return;I18N.loading[f]=1;
  const s=document.createElement('script');s.src=`i18n/${f}.js?v=${I18N.ver}`;s.onerror=()=>{I18N.loading[f]=0};document.head.appendChild(s);
}
/* templates → regexes, most specific first */
function i18nPatterns(loc){
  if(I18N.P[loc])return I18N.P[loc];
  const D=I18N.D[loc]||{},P=[];
  for(const k in D){
    if(!/\{\d+\}/.test(k))continue;
    const parts=k.split(/(\{\d+\})/);let re='^',lit='',anchor='',idx=[];
    for(const p of parts){const m=/^\{(\d+)\}$/.exec(p);
      if(m){re+='([\\s\\S]*?)';idx.push(+m[1])}
      else{re+=p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');lit+=p;if(p.length>anchor.length)anchor=p}}
    if(lit.replace(/\s/g,'').length<2)continue;
    P.push({re:new RegExp(re+'$'),idx,out:D[k],anchor,n:lit.length});
  }
  P.sort((a,b)=>b.n-a.n);
  return I18N.P[loc]=P;
}
function trDict(s,loc,depth){
  const D=I18N.D[loc];if(!D)return s;
  const hit=D[s];if(hit!==undefined)return hit;
  if(!/[A-Za-z]{2}/.test(s))return s;
  /* tolerate surrounding spaces / trailing punctuation the code adds */
  const m0=/^(\s*)([\s\S]*?)(\s*[:·,]?\s*)$/.exec(s);
  if(m0&&(m0[1]||m0[3])&&D[m0[2]]!==undefined)return m0[1]+D[m0[2]]+m0[3];
  /* Resolve joined content names before broad suffix templates such as "{0} Awakening".
     Otherwise "Needles · Rude Awakening" treats a trait name as a weapon awakening. */
  if(s.includes(' · ')){const names=s.split(' · ');if(names.every(x=>D[x]!==undefined))return names.map(x=>D[x]).join(' · ')}
  if(depth<4)for(const p of i18nPatterns(loc)){
    if(p.anchor&&s.indexOf(p.anchor)<0)continue;
    const m=p.re.exec(s);if(!m)continue;
    const vals=[];p.idx.forEach((k,j)=>vals[k]=m[j+1]);
    return p.out.replace(/\{(\d+)\}/g,(_,k)=>vals[k]===undefined?'':trDict(vals[k],loc,depth+1));
  }
  /* composed text: "Damage +12% · cooldown -5%", "A/B/C", "Sword Array + Ice", "Damage +52%" */
  if(depth<6){
    const split=(sep)=>{if(s.indexOf(sep)<0)return null;const parts=s.split(sep);let ch=0;const o=parts.map(x=>{const y=x?trDict(x,loc,depth+1):x;if(y!==x)ch++;return y});return ch?o.join(sep):null};
    let r=split(' · ');if(r!==null)return r;
    const mn=/^([\s\S]*?\S)( ?[+\-−×]\s?\d[\d.,]*\s?(?:%|s|秒)?)$/.exec(s);
    if(mn&&D[mn[1]]!==undefined)return D[mn[1]]+mn[2];
    if(s.indexOf('/')>0&&s.indexOf(' / ')<0){const ps=s.split('/');if(ps.every(x=>D[x]!==undefined))return ps.map(x=>D[x]).join('/')}
    r=split(' + ');if(r!==null)return r;
    r=split(', ');if(r!==null)return r;
  }
  if(I18N.miss.size<3000&&/[A-Za-z]{3}/.test(s)&&s!=='NaN'&&s!=='undefined')I18N.miss.add(s);
  return s;
}
/* simplified → traditional: phrase fixes first, then character map */
function toTrad(s){
  const Z=I18N.D.zt;if(!Z)return s;
  let o='';
  for(let i=0;i<s.length;){
    const ch=s[i],ph=Z.p[ch];
    if(ph){let done=0;for(const [a,b] of ph)if(s.startsWith(a,i)){o+=b;i+=a.length;done=1;break}if(done)continue}
    o+=Z.c[ch]||ch;i++;
  }
  return o;
}
function tr(s){
  if(LOC==='zh'||LOC==='en'||typeof s!=='string'||!s)return s;
  let r=I18N.cache.get(s);if(r!==undefined)return r;
  r=LOC==='zt'?(/[㐀-鿿]/.test(s)?toTrad(s):s):trDict(s,LOC,0);
  if(I18N.cache.size>6000)I18N.cache.clear();
  I18N.cache.set(s,r);return r;
}
const L=(zh,en)=>tr(LANG==='zh'?zh:(en!==undefined?en:zh));
const LL=o=>o?tr(LANG==='zh'?(o.zh!==undefined?o.zh:o.d):(o.en!==undefined?o.en:o.de)):'';
/* static page text: <span class="zh">…</span><span class="en">…</span> pairs and a few attributes */
function i18nStatic(){
  document.querySelectorAll('.zh,.en').forEach(el=>{
    if(el.dataset.src===undefined)el.dataset.src=el.innerHTML;
    const src=el.dataset.src,isZh=el.classList.contains('zh');
    el.innerHTML=(isZh&&LOC==='zt')||(!isZh&&(LOC==='ja'||LOC==='ko'))?tr(src):src;
  });
  /* the brush logo stays in Chinese characters: traditional for 繁體/한국어 (hanja), Japanese forms for 日本語 */
  const v=document.querySelector('#menu .vname'),vt={zh:'魔咒军团',zt:'魔咒軍團',en:'魔咒军团',ja:'魔呪軍団',ko:'魔咒軍團'}[LOC];
  if(v){if(v.dataset.ink)[...v.children].forEach((sp,i)=>{sp.textContent=vt[i]||''});else v.textContent=vt;v.setAttribute('aria-label',vt)}
  document.querySelectorAll('[data-l10n]').forEach(el=>{const [zh,en]=el.dataset.l10n.split('|');const v=L(zh,en);if(el.dataset.l10nAttr)el.dataset.l10nAttr.split(/\s+/).filter(Boolean).forEach(a=>el.setAttribute(a,v));else el.textContent=v});
}
/* per-language fonts: brush titles and UI text need kana / hangul / traditional glyphs */
const LOC_FONT={zt:'LXGW+WenKai+TC:wght@400;700',ja:'Yuji+Syuku&family=Zen+Kaku+Gothic+New:wght@500;700',ko:'Song+Myung&family=Gowun+Dodum'};
function i18nFont(){
  const f=LOC_FONT[LOC];if(!f||document.getElementById('font-'+LOC))return;
  const l=document.createElement('link');l.id='font-'+LOC;l.rel='stylesheet';l.href=`https://fonts.googleapis.com/css2?family=${f}&display=swap`;document.head.appendChild(l);
}
/* fonts for canvas text (render.js) */
function locFont(kind){
  const ui={zh:'"PingFang SC","Microsoft YaHei"',zt:'"PingFang TC","Microsoft JhengHei","Noto Sans TC"',ja:'"Zen Kaku Gothic New","Hiragino Sans","Yu Gothic","Meiryo","Noto Sans JP"',ko:'"Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR"',en:'"PingFang SC","Microsoft YaHei"'}[LOC];
  const brush={zh:'"Ma Shan Zheng","Noto Serif SC"',zt:'"LXGW WenKai TC","Kaiti TC","DFKai-SB","Noto Serif TC"',ja:'"Yuji Syuku","Hiragino Mincho ProN","Yu Mincho","Noto Serif JP"',ko:'"Song Myung","AppleMyungjo","Batang","Noto Serif KR"',en:'"Ma Shan Zheng","Noto Serif SC"'}[LOC];
  return kind==='brush'?`${brush},serif`:`"Alegreya Sans",${ui},system-ui,sans-serif`;
}
/* setLang(l, onReady, save=true): save=false is for automatic switches (IP guess) that must not count as the player's pick */
function setLang(l,onReady,save){
  if(!LOCS.includes(l))l='en';
  LOC=l;LANG=(l==='zh'||l==='zt')?'zh':'en';I18N.cache.clear();
  if(save!==false)try{localStorage.setItem('sl_lang',l)}catch(_){}
  document.documentElement.lang=LOC_HTML[l];
  i18nFont();
  const done=()=>{I18N.cache.clear();document.title=L('魔咒军团','Spell Legion');i18nStatic();onReady&&onReady()};
  if(i18nFile(l)&&!I18N.D[l]){done();i18nEnsure(l,done)}else done();
}
document.documentElement.lang=LOC_HTML[LOC];
i18nFont();
