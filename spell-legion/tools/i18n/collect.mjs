// Collect every English display string (the key for Japanese/Korean lookup) with its Chinese twin when known.
// usage: node collect.mjs <game dir> > en.json   → [{en, zh, kind, f}]
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import fs from 'fs';
import path from 'path';

const dir = process.argv[2];
const files = fs.readdirSync(path.join(dir, 'js')).filter(f => f.endsWith('.js'));
const han = s => /[㐀-鿿]/.test(s);
const latin = s => /[A-Za-z]{2,}/.test(s);
const out = new Map();
// a template becomes "text {0} text {1}"; returns null for non-strings
function tpl(src, n) {
  if (!n) return null;
  if (n.type === 'Literal' && typeof n.value === 'string') return { t: n.value, exprs: [] };
  if (n.type === 'TemplateLiteral') {
    let t = '', exprs = [];
    n.quasis.forEach((q, i) => { t += q.value.cooked.replace(/[{}]/g, c => c + c); if (i < n.expressions.length) { t += `{${i}}`; exprs.push(src.slice(n.expressions[i].start, n.expressions[i].end)); } });
    return { t, exprs };
  }
  if (n.type === 'BinaryExpression' && n.operator === '+') {
    // 'Awakening at Lv '+AWAKE_LV  → "Awakening at Lv {0}"
    const parts = []; (function flat(x) { if (x.type === 'BinaryExpression' && x.operator === '+') { flat(x.left); flat(x.right) } else parts.push(x) })(n);
    if (!parts.some(p => p.type === 'Literal' && typeof p.value === 'string')) return null;
    let t = '', exprs = [];
    for (const p of parts) { if (p.type === 'Literal' && typeof p.value === 'string') t += p.value.replace(/[{}]/g, c => c + c); else { t += `{${exprs.length}}`; exprs.push(src.slice(p.start, p.end)); } }
    return { t, exprs };
  }
  return null;
}
function add(en, zh, kind, f) {
  if (!en || !latin(en.t)) return;
  const k = en.t;
  if (!out.has(k)) out.set(k, { en: k, zh: zh ? zh.t : null, kind, f, exprs: en.exprs });
  else if (zh && !out.get(k).zh) out.get(k).zh = zh.t;
}
// all string-ish leaves inside a node (for literals nested inside template expressions)
function leaves(src, node, cb) {
  walk.full(node, x => { if (x.type === 'Literal' && typeof x.value === 'string' || x.type === 'TemplateLiteral') cb(x) });
}
// two parallel expressions (ternaries, a||'x' fallbacks): pair their string leaves in order
function pairLeaves(src, a, b, f) {
  const la = [], lb = [];
  const col = (n, L) => walk.full(n, x => { if (x.type === 'Literal' && typeof x.value === 'string' || x.type === 'TemplateLiteral') L.push(x) });
  if (!a || !b || a.type === 'Literal' && b.type === 'Literal') return;
  if (!['ConditionalExpression', 'LogicalExpression', 'BinaryExpression'].includes(a.type) && !['ConditionalExpression', 'LogicalExpression', 'BinaryExpression'].includes(b.type)) return;
  col(a, la); col(b, lb);
  const A = la.filter(x => han(tpl(src, x).t)), B = lb.filter(x => latin(tpl(src, x).t));
  if (!A.length || !B.length) return;
  B.forEach((x, i) => add(tpl(src, x), A.length === B.length ? tpl(src, A[i]) : null, 'pair', f));
  const whole = tpl(src, b); if (whole && b.type === 'BinaryExpression') add(whole, null, 'pair', f);
}
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, 'js', f), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  walk.full(ast, node => {
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'L' && node.arguments.length >= 2) {
      const [a, b] = node.arguments;
      add(tpl(src, b), tpl(src, a), 'L', f);
      // nested literals inside the English arg (ternaries, inner templates)
      if (b.type !== 'Literal') leaves(src, b, x => { if (x !== b) add(tpl(src, x), null, 'Lnested', f) });
      if (b.type === 'ConditionalExpression' || b.type === 'LogicalExpression') leaves(src, b, x => add(tpl(src, x), null, 'Lnested', f));
    }
    if (node.type === 'ObjectExpression') {
      const P = {};
      for (const p of node.properties) if (p.type === 'Property' && !p.computed) P[p.key.name || p.key.value] = p.value;
      for (const [zk, ek] of [['zh', 'en'], ['d', 'de'], ['zh', 'de'], ['tip', 'tipe'], ['szh', 'sen']]) {
        if (P[ek]) {
          const e = P[ek];
          if (e.type === 'ArrowFunctionExpression' || e.type === 'FunctionExpression') leaves(src, e, x => add(tpl(src, x), null, 'objfn', f));
          else if (e.type === 'ArrayExpression') e.elements.forEach(x => add(tpl(src, x), null, 'objarr', f));
          else add(tpl(src, e), tpl(src, P[zk]), 'obj', f);
        }
      }
    }
    if (node.type === 'CallExpression' && node.callee.name !== 'L') {
      const el = node.arguments;
      for (let i = 0; i + 1 < el.length; i++) {
        const a = tpl(src, el[i]), b = tpl(src, el[i + 1]);
        if (a && b && han(a.t) && !han(b.t) && latin(b.t)) add(b, a, 'call', f);
        else pairLeaves(src, el[i], el[i + 1], f);
      }
    }
    if (node.type === 'ObjectExpression') {
      const P = {};
      for (const p of node.properties) if (p.type === 'Property' && !p.computed) P[p.key.name || p.key.value] = p.value;
      for (const [zk, ek] of [['zh', 'en'], ['d', 'de'], ['rzh', 'ren']]) if (P[zk] && P[ek]) pairLeaves(src, P[zk], P[ek], f);
    }
    if (node.type === 'VariableDeclarator' && /_EN$/.test(node.id.name || '') && node.init && node.init.type === 'ArrayExpression')
      node.init.elements.forEach(x => add(tpl(src, x), null, 'arrEN', f));
    if (node.type === 'ObjectExpression') {
      for (const p of node.properties) if (p.type === 'Property' && p.key.type === 'Literal' && typeof p.key.value === 'string' && han(p.key.value)) {
        const b = tpl(src, p.value); if (b && !han(b.t)) add(b, { t: p.key.value }, 'map', f);
      }
    }
    if (node.type === 'ArrayExpression') {
      // ['中文','English', '描述','description'] pairs
      const el = node.elements;
      for (let i = 0; i + 1 < el.length; i++) {
        const a = tpl(src, el[i]), b = tpl(src, el[i + 1]);
        if (a && b && han(a.t) && !han(b.t) && latin(b.t)) add(b, a, 'arr', f);
      }
    }
  });
}
console.log(JSON.stringify([...out.values()], null, 1));
