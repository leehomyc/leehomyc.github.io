const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const P = require('../progress.js');
const raw = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '../data/questions.json')));
const bank = P.prepareBank(raw);
const q = bank.questions[0];
const entry = (choice, updatedAt, firstAt = updatedAt, operationId = String(updatedAt)) => ({choice, firstChoice:choice, updatedAt, firstAt, operationId});
test('real bank: deduplicate exact content while retaining all old ID aliases', () => {
  assert.equal(bank.questions.length, 2907);
  assert.equal(bank.aliases.size, 2909);
  assert.equal(bank.rawIds.length, 2909);
  assert.equal(bank.aliases.get(raw[1445].id), raw[545].id);
  assert.equal(bank.aliases.get(raw[1762].id), raw[1423].id);
});
test('legacy index migrates through original ordering, including deduplicated positions', () => {
  for (const index of [0,123,1445,1762,2545,2775]) {
    const p = P.normalize({index}, bank);
    assert.equal(p.currentId, bank.rawIds[index]);
  }
});
test('invalid, negative, fractional and missing saved positions stay valid', () => {
  for (const index of [-5,0.5,NaN,'123',null]) assert.equal(P.normalize({index},bank).currentId,q.id);
  assert.equal(P.normalize({schemaVersion:2,currentId:'removed',index:123},bank).currentId,q.id);
});
test('untrusted saved answer data is normalized and no stored correct/ok is trusted', () => {
  const p=P.normalize({answers:{[q.id]:{choice:'A',ok:true},unknown:{choice:'B'},bad:null},correct:999999},bank);
  assert.equal(Object.keys(p.answers).length,1);
  assert.equal(p.answers[q.id].ok,false);
  assert.equal(P.stats(p.answers,bank).correct,0);
  for(const bad of [null,[],true,{},'x']) assert.deepEqual(Object.keys(P.normalize({answers:bad},bank).answers),[]);
});
test('integer-only navigation rejects corner inputs without clamping to another question', () => {
  for(const value of ['', ' ', '1.5', '-1', '0', '2775', '1e3', Infinity, NaN]) assert.equal(P.questionIndex(value,2774),null);
  assert.equal(P.questionIndex(' 1 ',2774),0);
  assert.equal(P.questionIndex('2774',2774),2773);
});
test('review improves mastery without inflating first-attempt score', () => {
  const first=entry('A',100), second={...entry('B',200),firstChoice:'A',firstAt:100};
  const merged=P.mergeRecord(first,second);
  const s=P.stats({[q.id]:merged},bank);
  assert.equal(s.done,1);assert.equal(s.correct,0);assert.deepEqual(s.wrong,[]);
});
test('concurrent responses merge deterministically and preserve earliest first answer', () => {
  const a=entry('A',100),b=entry('B',200);
  assert.deepEqual(P.mergeRecord(a,b),P.mergeRecord(b,a));
  assert.equal(P.mergeRecord(a,b).firstChoice,'A');
  assert.equal(P.mergeRecord(a,b).choice,'B');
  const x=entry('A',300,300,'aaa'),y=entry('B',300,300,'bbb');
  assert.deepEqual(P.mergeRecord(x,y),P.mergeRecord(y,x));
});
test('different-device questions are retained and counts are derived from combined answers', () => {
  const second=bank.questions[1];
  const a=P.normalize({answers:{[q.id]:entry(q.answer,100)}},bank);
  const b=P.normalize({answers:{[second.id]:entry(second.answer,200)}},bank);
  const merged=P.mergeAnswers(a.answers,b.answers);
  assert.equal(P.stats(merged,bank).done,2);assert.equal(P.stats(merged,bank).correct,2);
});
test('pending work created during a cloud read survives the resulting restore', () => {
  const remote=P.normalize({currentId:bank.questions[123].id,positionUpdatedAt:100,answers:{[q.id]:entry('B',100)}},bank);
  const local=P.normalize({currentId:bank.questions[4].id,positionUpdatedAt:200,positionDirty:true,pending:{[bank.questions[1].id]:entry('A',200)}},bank);
  const merged=P.mergeProgress(remote,local);
  assert.equal(merged.currentId,bank.questions[4].id);assert.equal(Object.keys(merged.answers).length,2);
});
test('cached clean answers do not silently overwrite newer authoritative cloud answers', () => {
  const remote=P.normalize({answers:{[q.id]:entry('B',200)}},bank);
  const local=P.normalize({answers:{[q.id]:entry('A',100)}},bank);
  assert.equal(P.mergeProgress(remote,local).answers[q.id].choice,'B');
});
test('malformed banks fail explicitly instead of partially starting practice', () => {
  for(const bad of [[],null,[raw[0],raw[0]],[{...raw[0],answer:'Z'}],[{...raw[0],image:'https://other.test/file'}]]) assert.throws(()=>P.prepareBank(bad));
});
