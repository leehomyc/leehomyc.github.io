// English-looking literals in the game code that have no Japanese line yet
import * as acorn from 'acorn'; import * as walk from 'acorn-walk'; import fs from 'fs'; import path from 'path';
const dir = process.argv[2];
const t = fs.readFileSync(path.join(dir, 'i18n/ja.js'), 'utf8'); const s0 = t.slice(t.indexOf('I18N_LOAD('));
const D = JSON.parse(s0.slice(s0.indexOf('{'), s0.lastIndexOf('}') + 1));
const out = new Set();
for (const f of fs.readdirSync(path.join(dir, 'js'))) {
  if (f === 'i18n.js') continue;
  const src = fs.readFileSync(path.join(dir, 'js', f), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest' });
  walk.full(ast, n => {
    let v = null;
    if (n.type === 'Literal' && typeof n.value === 'string') v = n.value;
    if (n.type === 'TemplateLiteral') v = n.quasis.map((q, i) => q.value.cooked + (i < n.expressions.length ? `{${i}}` : '')).join('');
    if (!v || D[v] !== undefined) return;
    const words = v.replace(/<[^>]+>|\{\d+\}/g, ' ').match(/[A-Za-z]{2,}/g) || [];
    if (words.length < 2 || !/ /.test(v) || /^[#.\w-]+$|[{};=]|\bfunction\b|px|rgba|\.(png|js)/.test(v)) return;
    if (/^[a-z -]+$/.test(v) && words.length < 3) return;
    out.add(f + ' | ' + v.slice(0, 160).replace(/\n/g, ' '));
  });
}
console.log([...out].join('\n'));
