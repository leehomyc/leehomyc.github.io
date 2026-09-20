/* Shared, deterministic progress validation and merging. No network or DOM access. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Ke1Progress = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const dict = () => Object.create(null);
  function prepareBank(raw) {
    if (!Array.isArray(raw) || !raw.length) throw new Error('题库为空');
    const questions = [], byId = new Map(), aliases = new Map(), signatures = new Map();
    const rawIds = [], seen = new Set();
    for (const q of raw) {
      if (!object(q) || typeof q.id !== 'string' || !q.id || seen.has(q.id) ||
          typeof q.question_zh !== 'string' || !Array.isArray(q.options) || q.options.length < 2 ||
          !q.options.every(o => object(o) && /^[A-D]$/.test(o.label) && typeof o.text_zh === 'string') ||
          new Set(q.options.map(o => o.label)).size !== q.options.length ||
          !q.options.some(o => o.label === q.answer) ||
          (q.image && !/^images\/[a-zA-Z0-9_.-]+$/.test(q.image))) throw new Error('题库格式不正确');
      seen.add(q.id);
      const signature = JSON.stringify([q.question_zh, q.options, q.image || '', q.answer]);
      const id = signatures.get(signature) || q.id;
      rawIds.push(id);
      aliases.set(q.id, id);
      if (id !== q.id) continue;
      signatures.set(signature, id);
      byId.set(id, q);
      questions.push(q);
    }
    return { questions, byId, aliases, rawIds };
  }
  function time(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= Date.now() + 300000 ? value : 0;
  }
  function record(value, question) {
    if (!object(value) || !question.options.some(o => o.label === value.choice)) return null;
    const firstChoice = question.options.some(o => o.label === value.firstChoice) ? value.firstChoice : value.choice;
    return { choice: value.choice, firstChoice, ok: value.choice === question.answer,
      updatedAt: time(value.updatedAt), firstAt: time(value.firstAt),
      operationId: typeof value.operationId === 'string' ? value.operationId.slice(0, 100) : '' };
  }
  function compare(a, b) {
    return a.updatedAt - b.updatedAt || a.operationId.localeCompare(b.operationId);
  }
  function mergeRecord(a, b) {
    if (!a) return b;
    if (!b) return a;
    const latest = compare(a, b) > 0 ? a : b;
    const first = a.firstAt < b.firstAt ? a : b.firstAt < a.firstAt ? b : (compare(a, b) <= 0 ? a : b);
    return { ...latest, firstChoice: first.firstChoice, firstAt: first.firstAt };
  }
  function answers(value, bank) {
    const result = dict();
    if (!object(value)) return result;
    for (const [oldId, entry] of Object.entries(value)) {
      const id = bank.aliases.get(oldId);
      if (!id) continue;
      const valid = record(entry, bank.byId.get(id));
      if (valid) result[id] = mergeRecord(result[id], valid);
    }
    return result;
  }
  function mergeAnswers(a, b) {
    const result = Object.assign(dict(), a);
    for (const [id, value] of Object.entries(b)) result[id] = mergeRecord(result[id], value);
    return result;
  }
  function normalize(value, bank) {
    const raw = object(value) ? value : {};
    let currentId = bank.aliases.get(raw.currentId);
    if (!currentId && raw.schemaVersion !== 2 && Number.isInteger(raw.index) && raw.index >= 0) {
      currentId = bank.rawIds[Math.min(raw.index, bank.rawIds.length - 1)];
    }
    return { schemaVersion: 2, currentId: currentId || bank.questions[0].id,
      positionUpdatedAt: time(raw.positionUpdatedAt), answers: answers(raw.answers, bank),
      pending: answers(raw.pending, bank), positionDirty: raw.positionDirty === true };
  }
  function mergeProgress(remote, local) {
    const position = local.positionDirty && local.positionUpdatedAt >= remote.positionUpdatedAt ? local : remote;
    return { ...local, currentId: position.currentId, positionUpdatedAt: position.positionUpdatedAt,
      answers: mergeAnswers(remote.answers, local.pending) };
  }
  function stats(entries, bank) {
    let done = 0, correct = 0;
    const wrong = [];
    for (const q of bank.questions) {
      const answer = entries[q.id];
      if (!answer) continue;
      done++;
      if (answer.firstChoice === q.answer) correct++;
      if (answer.choice !== q.answer) wrong.push(q.id);
    }
    return { done, correct, wrong };
  }
  function questionIndex(input, size) {
    if (typeof input === 'string' && !/^\d+$/.test(input.trim())) return null;
    const n = Number(input);
    return Number.isSafeInteger(n) && n >= 1 && n <= size ? n - 1 : null;
  }
  return { prepareBank, normalize, mergeRecord, mergeAnswers, mergeProgress, stats, questionIndex, dict };
});
