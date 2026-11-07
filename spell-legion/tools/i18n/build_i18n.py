# Merge translation chunks into i18n/ja.js and i18n/ko.js (maps keyed by the English text).
# usage: python3 build_i18n.py <game dir> [extra.json ...]
#   src.json   : [{i, en, ...}]          (from collect.mjs + html pairs)
#   tr/c*.json : [[i, ja, ko], ...]      (index into src.json)
#   extra json : [[en, ja, ko], ...]     (strings found at runtime)
import sys, json, glob, re, os
G = sys.argv[1]
src = {x['i']: x['en'] for x in json.load(open('src.json'))}
rows = []
for f in sorted(glob.glob('tr/c*.json')):
    for i, ja, ko in json.load(open(f)): rows.append((src[i], ja, ko))
for f in sys.argv[2:]:
    for en, ja, ko in json.load(open(f)): rows.append((en, ja, ko))
# existing files keep entries not in the chunks (so hand fixes survive)
out = {'ja': {}, 'ko': {}}
for loc in out:
    p = f'{G}/i18n/{loc}.js'
    if os.path.exists(p):
        t = open(p, encoding='utf8').read()
        t = t[t.index('I18N_LOAD('):]; out[loc] = json.loads(t[t.index('{'):t.rindex('}') + 1])
warn = 0
# skill-tree lines also appear without their ' / rank' suffix (sim.js strips it)
for en, ja, ko in list(rows):
    if en.endswith(' / rank'):
        rows.append((en[:-7], ja.replace(' / 段', ''), ko.replace(' / 단계', '')))
for en, ja, ko in rows:
    # named tokens ({n}, {c}, {ce}) are filled in before L() sees the text → make them numbered too
    named = [t for t in dict.fromkeys(re.findall(r'\{([a-z]+)\}', en))]
    base = 1 + max([int(x) for x in re.findall(r'\{(\d+)\}', en)] or [-1])
    for loc, v in (('ja', ja), ('ko', ko)):
        out[loc][en] = v
        if named:
            k2, v2 = en, v
            for j, t in enumerate(named):
                k2 = k2.replace('{%s}' % t, '{%d}' % (base + j)); v2 = v2.replace('{%s}' % t, '{%d}' % (base + j))
            out[loc][k2] = v2
        ke = set(re.findall(r'\{\w+\}', en)); kv = set(re.findall(r'\{\w+\}', v))
        if not kv <= ke or (ke - kv and not re.search(r'\{\d+\}(s|es|ies)?\b', en)):
            if kv - ke or len(ke - kv) > 0:
                warn += 1; print('placeholders', loc, repr(en[:70]), '→', repr(v[:70]), file=sys.stderr)
import terms
for loc in out:
    for k in out[loc]: out[loc][k] = terms.apply(loc, out[loc][k])
os.makedirs(f'{G}/i18n', exist_ok=True)
names = {'ja': '日本語', 'ko': '한국어'}
for loc, m in out.items():
    open(f'{G}/i18n/{loc}.js', 'w', encoding='utf8').write(
        f"/* {names[loc]}: keyed by the English text of L(zh,en) / LL(); {{0}} {{1}} … are template slots. Edit freely; tools/i18n keeps your lines. */\n"
        f"I18N_LOAD('{loc}',\n" + json.dumps(m, ensure_ascii=False, indent=0, sort_keys=True) + "\n);\n")
print({k: len(v) for k, v in out.items()}, 'warnings', warn, file=sys.stderr)
