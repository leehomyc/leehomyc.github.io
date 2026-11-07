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
