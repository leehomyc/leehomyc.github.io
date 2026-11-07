import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const game = new URL('../../', import.meta.url);
function setup() {
  const element = {dataset:{l10n:'静音 / 开启|Mute / unmute',l10nAttr:'title aria-label'}, attrs:{}, setAttribute(k,v){this.attrs[k]=v}};
  const context = vm.createContext({console, URLSearchParams,
    navigator:{languages:['en']}, location:{search:''}, localStorage:{getItem(){return null},setItem(){}},
    document:{currentScript:null,documentElement:{},write(){},getElementById(){return true},querySelector(){return null},
      querySelectorAll(s){return s==='[data-l10n]'?[element]:[]},head:{appendChild(){}}}});
  vm.runInContext(fs.readFileSync(new URL('js/i18n.js',game),'utf8'),context);
  for (const loc of ['zt','ja','ko']) vm.runInContext(fs.readFileSync(new URL(`i18n/${loc}.js`,game),'utf8'),context);
  return {element, evaluate:s=>vm.runInContext(s,context)};
}
test('combat and late-game labels stay in the selected language across switches',()=>{
  const {evaluate}=setup();
  for (const [loc,crit,over,down,transcend] of [
    ['en','CRIT','OVERDRIVE','(down)','Transcend'],
    ['ja','会心','暴走','(ダウン)','超越'],
    ['ko','치명타','폭주','(쓰러짐)','초월'],
    ['zt','暴擊','狂暴','(倒地)','真傳'],
    ['zh','暴击','狂暴','(倒地)','真传'],
    ['en','CRIT','OVERDRIVE','(down)','Transcend']]) {
    evaluate(`setLang('${loc}')`);
    assert.equal(evaluate("L('暴击','CRIT')"),crit);
    assert.equal(evaluate("L('狂暴','OVERDRIVE')"),over);
    assert.equal(evaluate("L('(倒地)','(down)')"),down);
    assert.ok(evaluate("L(' · 真传 12',' · Transcend 12')").includes(transcend));
    assert.ok(evaluate("L(' · 真传 12',' · Transcend 12')").includes('12'));
  }
});
test('nested dynamic translations preserve the target names and numeric values',()=>{
  const {evaluate}=setup();
  for(const loc of ['ja','ko']) {
    evaluate(`setLang('${loc}');I18N.miss.clear()`);
    for(const input of ['Killed by Archer','0 casts (fires when HP <50%)',' · Transcend 123']) {
      const output=evaluate(`tr(${JSON.stringify(input)})`);
      assert.notEqual(output,input);
      assert.doesNotMatch(output,/Killed by|Archer|casts|fires when|Transcend/);
      assert.doesNotMatch(output,/\{\d+\}/);
    }
    assert.equal(evaluate('I18N.miss.size'),0);
  }
});
test('tooltips and accessible names are both refreshed when the locale changes',()=>{
  const {element,evaluate}=setup();
  for(const loc of ['zh','zt','en','ja','ko']) {
    evaluate(`setLang('${loc}')`);
    assert.equal(element.attrs.title,element.attrs['aria-label']);
    assert.ok(element.attrs.title);
    if(loc==='ja'||loc==='ko')assert.notEqual(element.attrs.title,'Mute / unmute');
  }
});

test('joined trait names win over broad awakening suffix templates',()=>{
  const {evaluate}=setup();
  for(const loc of ['ja','ko']) {
    evaluate(`setLang('${loc}');I18N.miss.clear()`);
    const expected=evaluate("tr('Flying Sword')+' · '+tr('Rude Awakening')");
    assert.equal(evaluate("tr('Flying Sword · Rude Awakening')"),expected);
    assert.equal(evaluate('I18N.miss.size'),0);
  }
});

test('collection and recent results labels are translated without English fallback',()=>{
  const {evaluate}=setup();
  for(const [loc,label] of [['zh','图鉴'],['zt','圖鑑'],['en','Collection'],['ja','図鑑'],['ko','도감']]) {
    evaluate(`setLang('${loc}');I18N.miss.clear();I18N.cache.clear()`);
    assert.equal(evaluate("L('图鉴','Collection')"),label);
    if(loc==='ja'||loc==='ko') {
      for(const input of ['Cash out','Ascension 12 unlocked','Overtaken by 123','Rival +123','Undiscovered','Killed by Archer']) {
        const output=evaluate(`tr(${JSON.stringify(input)})`);
        assert.doesNotMatch(output,/Cash out|unlocked|Overtaken|Rival|Undiscovered|Killed by|Archer/);
        assert.doesNotMatch(output,/\{\d+\}/);
      }
      assert.equal(evaluate('I18N.miss.size'),0);
    }
  }
});

test('death messages translate the whole sentence with the target language word order',()=>{
  const {evaluate}=setup();
  for(const [loc,expected] of [['en','Killed by Archer'],['ja','アーチャーに倒された'],['ko','궁수에게 쓰러짐']]) {
    evaluate(`setLang('${loc}')`);
    assert.equal(evaluate("L('死于 弓手','Killed by Archer')"),expected);
  }
});

test('initial page title uses the selected language',()=>{
  const {evaluate}=setup();
  for(const [loc,title] of [['en','Spell Legion'],['zh','魔咒军团'],['zt','魔咒軍團'],['ja','魔呪軍団'],['ko','주문군단']]) {
    evaluate(`LOC='${loc}';LANG='${loc==='zh'||loc==='zt'?'zh':'en'}';I18N.cache.clear();i18nStatic()`);
    assert.equal(evaluate('document.title'),title);
  }
});

test('visible collection count follows discoveries rather than staying at zero of zero',()=>{
  const {evaluate}=setup();
  evaluate(`const elements={'#codex':{},'#codexcount':{},'#codexcount2':{}};const $=id=>elements[id];
    const SAVE={codex:{en:{},boss:{},relic:{},weapon:{}}};
    const CODEX_ENEMIES=[{id:'archer',zh:'弓手',en:'Archer',d:'',de:''}],AFFINITY={};
    const BOSSES=[['首领','Boss']],BOSS_HINT=[];
    const RELICS={ring:{zh:'戒指',en:'Ring',d:'',de:''}},WEAPONS={swordsman:['sword']};
    const SPELLS={sword:{zh:'飞剑',en:'Flying Sword',d:'',de:''}},CLASSES={swordsman:{zh:'剑客',en:'Swordsman'}};`);
  const meta=fs.readFileSync(new URL('js/meta.js',game),'utf8');
  evaluate(meta.slice(meta.indexOf('function renderCodex()')));
  evaluate('renderCodex()');
  assert.equal(evaluate("elements['#codexcount2'].textContent"),'0/4');
  evaluate("SAVE.codex.en.archer=1;SAVE.codex.weapon.sword=1;renderCodex()");
  assert.equal(evaluate("elements['#codexcount2'].textContent"),'2/4');
  assert.equal(evaluate("elements['#codexcount'].textContent"),'2/4');
});

test('training labels describe their actual attributes in Japanese and Korean',()=>{
  const {evaluate}=setup();
  for(const [loc,hp,attack,haste] of [['ja','体力','攻撃力','速攻'],['ko','활력','공격력','가속']]){
    evaluate(`setLang('${loc}')`);
    assert.equal(evaluate("tr('Vigor')"),hp);
    assert.equal(evaluate("tr('Edge')"),attack);
    assert.equal(evaluate("tr('Haste')"),haste);
    assert.doesNotMatch(evaluate("tr('Heals, shields and knocks back nearby enemies.')"),/Heals|shields|four seconds/);
  }
});
