"""«Круг Юсупова» и «Круг дневника»: кто с кем встречается в одном абзаце мемуаров / в одной записи Ивана.
Пишет src/data/krug.json. Нужен текст книги по главам (book/b1chNN.md, b2chNN.md) — путь в аргументе."""
import json, re, sys
from collections import Counter, defaultdict
from pathlib import Path
import networkx as nx
from networkx.algorithms.community import louvain_communities

W = Path(__file__).resolve().parent
BOOK = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/work/book')
sys.path.insert(0, str(W / 'data')); from people import P
L = r'(?<![а-яёА-ЯЁA-Za-z])'; NB = r'(?![а-яёА-ЯЁ])'
EXTRA = {  # имена, которые в мемуарах звучат иначе, чем в справке
 'father': r'[Оо]т[еэ]ц|[Оо]тц[аеуо]м?' + NB, 'mother': r'[Мм]атушк[аиеуой]|[Мм]атер[иью]' + NB,
 'nicholas2': r'[Гг]осудар[ьяюе]м?' + NB + r'|Никола[йяюе]м? II|[Цц]ар[ьяюе]м?' + NB + r'(?! царей)',
 'alexandra': r'[Гг]осудын[яиеюой]|[Гг]осударын[яиеюой]|Александр[аыеуой] Ф[её]доровн[аыеуой]',
 'fedor': r'Ф[её]дор[аеуом]*' + NB, 'dmitri': r'Дмитри[йяюе]м?' + NB + r'(?! Александрович)', 'irina': r'Ирин[аыеуой]' + NB,
}
def pat(pid, v):
    p = EXTRA.get(pid) or v[3]
    return re.compile(L + '(?:' + p.replace(r'\b', NB) + ')') if p else None

def ch_paras():
    for n in range(1, 47):
        f = BOOK / (f'b1ch{n:02d}.md' if n <= 27 else f'b2ch{n-27:02d}.md')
        for p in re.split(r'\n\s*\n', f.read_text(encoding='utf8')):
            p = re.sub(r'\s*\n\s*', ' ', p).strip()
            if p and not p.startswith('#'): yield n, p

def sentence(p, m):
    a = max(p.rfind('. ', 0, m.start()), p.rfind('! ', 0, m.start()), p.rfind('? ', 0, m.start())) + 2
    b = min([x for x in (p.find('. ', m.end()), p.find('! ', m.end()), p.find('? ', m.end())) if x >= 0] or [len(p) - 1]) + 1
    s = p[max(a, 0):b].strip()
    return s if len(s) <= 260 else s[:257].rsplit(' ', 1)[0] + '…'

def build(units, names, top, minw=1):
    """units: [(period, ref, text)]; names: {id: (name, regex)} → узлы, связи, круги."""
    hit = defaultdict(list); co = Counter(); ctx = defaultdict(list)
    for per, ref, t in units:
        found = []
        for i, (nm, rx) in names.items():
            m = rx.search(t) if rx else None
            if m:
                found.append(i); hit[i].append((per, ref))
                if len(ctx[i]) < 40: ctx[i].append((ref, sentence(t, m)))
        for a in range(len(found)):
            for b in range(a + 1, len(found)):
                co[tuple(sorted((found[a], found[b])))] += 1
    ids = [i for i, _ in sorted(((i, len({r for _, r in hit[i]})) for i in hit), key=lambda x: -x[1])][:top]
    ix = {i: k for k, i in enumerate(ids)}
    G = nx.Graph(); G.add_nodes_from(range(len(ids)))
    E = [[ix[a], ix[b], w] for (a, b), w in co.items() if a in ix and b in ix and w >= minw]
    for a, b, w in E: G.add_edge(a, b, weight=w)
    comms = sorted(louvain_communities(G, weight='weight', seed=7), key=len, reverse=True)
    cl = {}; C = []
    for k, c in enumerate(comms):
        if len(c) < 3:
            for v in c: cl[v] = -1
            continue
        k2 = len(C); mem = sorted(c, key=lambda v: -G.degree(v, weight='weight'))
        for v in c: cl[v] = k2
        C.append({'n': len(c), 'names': [names[ids[v]][0] for v in mem[:3]]})
    nodes = []
    for k, i in enumerate(ids):
        refs = hit[i]; nb = sorted(((b if a == k else a, w) for a, b, w in E if k in (a, b)), key=lambda x: -x[1])[:8]
        step = max(1, len(ctx[i]) // 4); cx = ctx[i][::step][:4]
        nodes.append({'id': i, 'name': names[i][0], 'n': len({r for _, r in refs}), 'np': len(refs), 'cl': cl.get(k, -1),
                      'per': [sum(1 for p, _ in refs if p == q) for q in (0, 1)], 'nb': nb, 'ctx': [{'r': r, 's': s} for r, s in cx],
                      'refs': sorted({r for _, r in refs})})
    return {'nodes': nodes, 'edges': E, 'clusters': C}

# Круг Юсупова: абзацы мемуаров
names = {pid: (v[0], pat(pid, v)) for pid, v in P.items() if v and pid != 'felix'}
names = {k: v for k, v in names.items() if v[1]}
units = [(0 if n <= 27 else 1, n, t) for n, t in ch_paras()]
felix = build(units, names, top=60, minw=1)

# Круг дневника: записи Ивана (сегменты), люди из мемуаров и его собственного мира
IV = {
 'rasputin': ('Распутин', r'Распутин|[Сс]тарц|[Сс]тарец'),
 'irina': ('Ирина', r'Ирин'), 'dmitri': ('Дмитрий Павлович', r'Дмитри'), 'iv_nik2': ('Николай II', r'Николая с Эдуардом|Николая II|Трагическая судьба'),
 'ella': ('Елизавета Фёдоровна', r'Елизавет'), 'iv_peter': ('Пётр I', r'Петра I'), 'iv_ekat': ('Екатерина II', r'Екатерин[аыеуой] II'),
 'iv_seraphim': ('Серафим Саровский', r'Серафим'), 'iv_borges': ('Борхес', r'Борхес'), 'iv_hem': ('Хемингуэй', r'Хэмингуэ|старик Хэм|американского писателя'),
 'iv_wooster': ('Берти Вустер', r'Вустер'), 'iv_musk': ('Илон Маск', r'Илон'), 'boni': ('Бони де Кастеллан', r'Boni|Бони'),
 'iv_gordon': ('Сетон Гордон', r'Сетон'), 'radziwill': ('Княгиня Радзивилл', r'Радзивилл'), 'iv_cartier': ('Пьер Картье', r'Картье'),
 'rachmaninoff': ('Рахманинов', r'Рахманинов'), 'sikorsky': ('Сикорский', r'Сикорский'), 'valerie': ('Валери', r'Валери'), 'hubi': ('Мадам Хуби', r'Хуби'),
 'teffi': ('Тэффи', r'Тэффи'), 'iv_napoleon': ('Наполеон', r'Наполеон'), 'iv_masson': ('Фредерик Массон', r'Массон'), 'iv_constant': ('Констан Вери', r'Констан'),
 'iv_suk': ('Алексей Суковкин', r'Суковкин'), 'iv_seyer': ('Тира Сейер', r'Сейер'), 'iv_gand': ('Тони Гандарильяс', r'Гандарильяс'),
 'iv_doyle': ('Конан Дойль', r'Конан Дойл'), 'iv_maup': ('Мопассан', r'Мопассан'), 'alexander_m': ('Великий князь Александр Михайлович', r'Великого князя|тест|в\.кн\. Александр'),
 'iv_gorky': ('Горький', r'Горький'), 'iv_paleo': ('Морис Палеолог', r'Палеолог'), 'iv_korovin': ('Коровин', r'Коровин'), 'iv_aksakova': ('Аксакова-Сиверс', r'Аксакова'),
 'iv_rozanov': ('Розанов', r'Розанов'), 'iv_gilliard': ('Пьер Жильяр', r'Жильяр'), 'iv_eulalia': ('Эулалия', r'Эулали'), 'iv_sylva': ('Кармен Сильва', r'Кармен Сильв'),
 'iv_suvorov': ('Суворов и Кутузов', r'Суворов'), 'iv_tretyakov': ('Третьяков', r'Третьяков'), 'mother': ('Матушка Феликса', r'[Мм]атушк'), 'maria_f': ('Вдовствующая императрица', r'вдовствующ'),
 'iv_dogs': ('Пёсели: Мальна и Чоки', r'Мальна|Чоки|пёсел'), 'iv_bh': ('Бром и Хина', r'Бром|Хина'), 'iv_neighbor': ('Соседи Ивана', r'[Сс]осед(?! мадам)|кузнец'),
 'iv_mikulas': ('Святой Микулаш', r'Микулаш'), 'iv_ai': ('Искусственный интеллект', r'искусственного интеллекта'), 'iv_journalist': ('Один журналист', r'один журналист|Как говорит один'),
}
inames = {k: (v[0], re.compile(v[1])) for k, v in IV.items()}
dj = json.load(open(W / 'diary.json', encoding='utf8')); iunits = []
for e in dj:
    if e['n'] >= 30: continue  # постскриптумы 2–3: полный список книг, иначе все авторы склеятся в один круг
    for s in e['segs']:
        chs = [int(x) for x in re.findall(r'\d+', s.get('ch') or '')]
        per = 0 if chs and chs[0] <= 27 else 1
        iunits.append((per, e['n'], ' '.join(p for p in s['p'] if p.strip() != '**Читательский дневник**')))
ivan = build(iunits, inames, top=60)
for n in ivan['nodes']:
    n['pid'] = n['id'] if not n['id'].startswith('iv_') else None
for n in felix['nodes']: n['pid'] = n['id']
json.dump({'felix': felix, 'ivan': ivan}, open(W / 'data' / 'krug.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
for k, d in (('felix', felix), ('ivan', ivan)):
    print(k, len(d['nodes']), 'nodes', len(d['edges']), 'edges', [c['names'] for c in d['clusters']])
    print('  top', [(n['name'], n['n']) for n in d['nodes'][:12]])
