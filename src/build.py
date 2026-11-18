import json, re, sys
from pathlib import Path
W=Path(__file__).resolve().parent; OUT=W.parent/'data.json'
sys.path.insert(0,str(W/'data')); from people import P as PEOPLE
idx={x['key']:x for x in json.load(open(W/'book/index.json'))}
def lab(n): return f'I·{n}' if n<=27 else f'II·{n-27}'
NB=r'(?![а-яёА-ЯЁ])'
FIX={'nicholas2':r'Никола[йяюе]м? II','alexandra':r'Александр[аыеуой] Ф[её]доровн[аыеуой]','fedor':r'Ф[её]дор[а-я]* Александрович[а-я]*',
     'dmitri':r'Дмитри[йяюе]м? Павлович[а-я]*|великого князя Дмитрия|великий князь Дмитрий','ella':r'Елизавет[аыеуой] Ф[её]доровн[аыеуой]|Элл[аыеуой]'+NB,
     'maria_f':r'Мари[ияюей] Ф[её]доровн[аыеуой]|вдовствующ[а-я]+ императриц[а-я]+','rasputin':r'Распутин[а-яё]*|[Сс]тарц[аеуы]м?'+NB+r'|[Сс]тарец'}
THEMES={'rod':'Род','wealth':'Богатство','faith':'Вера','romanovs':'Романовы','rasputin':'Распутин','revolution':'Революция','exile':'Изгнание',
 'self':'Феликс о себе','art':'Искусство','humor':'Юмор','irina':'Ирина','baby':'Дочь','books':'Книги','ivan':'Отметил Иван','claude':'Выбор Claude'}
SECS=[('rod','Род и дома','Предки, родня и их дворцы.'),('people','Люди эпохи','Кто окружал Феликса: справки и портреты.'),('places','Места','Дворцы, имения, города изгнания.'),
      ('time','Время','События, без которых мемуары не понять.'),('art','Искусство','Коллекции, театр, мода.'),('books','Книги','Что читать дальше: источники и споры.')]
D={'themes':THEMES,'parts':[{'n':1,'name':'Книга первая. До изгнания','years':'1887–1919','a':1,'b':27},{'n':2,'name':'Книга вторая. В изгнании','years':'1919–1953','a':28,'b':46}],
   'chapters':[],'quotes':[],'timeline':[],'world':[],'profiles':[],'diary':{},'front':{},'current':{'ch':46}}
OLD={}
if OUT.exists():
    for s_ in json.load(open(OUT)).get('world',[]):
        for it in s_['items']:
            im=it.get('img') or {}
            k=im.get('q') or im.get('url')
            if k and im.get('src'): OLD[k]={kk:im[kk] for kk in ('src','full','file') if kk in im}
world={s[0]:[] for s in SECS}; pev={}; ord_=0
for n in range(1,47):
    c=json.load(open(W/f'data/ch{n:02d}.json')); key=f'b1ch{n:02d}' if n<=27 else f'b2ch{n-27:02d}'
    t=re.sub(r'^ГЛАВА \d+\s*','',idx[key]['title']); t=re.sub(r'^\d{4}(?:\s*[-–]\s*\d{4})?\s*','',t)
    D['chapters'].append({'n':n,'label':lab(n),'title':c['short'],'topics':t.replace(' – ',' · '),'years':c.get('years',''),'summary':c['summary'],'context':c['context']})
    for q in c['quotes']:
        ord_+=1; q=dict(q); q['ch']=n; q['ord']=ord_; D['quotes'].append(q)
    for e in c['timeline']: e=dict(e); e['ch']=n; D['timeline'].append(e)
    for x in c['world']:
        x=dict(x); x['ch']=n; sec=x.pop('sec'); im=x.get('img')
        if im and im.get('file','').startswith('img/'): im['src']=im['full']=im.pop('file'); im['credit']='из издания «Мемуаров»'
        if im and (im.get('q') or im.get('url')) in OLD: im.update(OLD[im.get('q') or im.get('url')])
        world[sec].append(x)
    for pid,txt in c['people'].items(): pev.setdefault(pid,[]).append({'ch':n,'t':txt})
D['timeline'].sort(key=lambda e:(e['y'],e['ch']))
for sid,title,lead in SECS: D['world'].append({'id':sid,'title':title,'lead':lead,'items':world[sid]})
caps=[('i_002.jpg','Родители князя Феликса — князь Феликс Феликсович Юсупов-старший и княгиня Зинаида Николаевна Юсупова, 1898',3),
 ('i_003.jpg','Вверху: Феликс (второй слева) с братом Николаем и родителями, 1895. Внизу слева: отец с сыновьями, 1891; справа: верхом в Архангельском, 1892',3),
 ('i_004.jpg','Феликс, Николай, Зинаида Николаевна и Феликс Феликсович Юсуповы в родовом имении Архангельское под Москвой, 1901',6),
 ('i_005.jpg','Вверху справа: Феликс в русском костюме в Лондоне, 1912; слева: с невестой, великой княжной Ириной Александровной, 1913. Внизу: Феликс и Ирина с дочерью Ириной на Мойке, 1916',18),
 ('i_006.jpg','Вверху: Феликс с женой на благотворительном аукционе в Лондоне, 1919. Внизу: с дочерью на Корсике, 1925',29),
 ('i_007.jpg','Вверху: князь Феликс Юсупов, 1950; княгиня Ирина Александровна, 1925. Внизу: Ирина Феликсовна Юсупова на портрете 1928 года и на фотографии 1935 года',45),
 ('i_008.jpg','Княгиня Ирина Александровна Юсупова в своём доме в Париже на улице Пьер-Герен, 1969',46),
 ('i_009.jpg','Князь Феликс Феликсович Юсупов в своём доме в Париже на улице Пьер-Герен, 1957',44)]
D['photos']=[{'src':'img/book/'+f,'cap':c,'ch':ch} for f,c,ch in caps]
seen=set(pev)
for pid,v in PEOPLE.items():
    if not v: continue
    name,group,short,pat,bio=v; pat=FIX.get(pid,pat)
    if pat: pat=pat.replace(r'\b',NB)
    ev=pev.get(pid,[]); chs=', '.join(str(e['ch']) for e in ev)
    D['profiles'].append({'id':pid,'name':name,'group':group,'short':short,'pat':pat,'bio':bio,'chs':chs,'ev':ev})
miss=seen-{p['id'] for p in D['profiles']}; print('missing people',miss)
GORD=['Юсуповы и родня','Романовы','Заговор и Распутин','Россия до 1917','Эмиграция','Европа и Америка','Дом, слуги, друзья']
D['profiles'].sort(key=lambda p:(GORD.index(p['group']),-len(p['ev'])))
# diary
dj=json.load(open(W/'diary.json')); ents=[]
for e in dj:
    for s in e['segs']:
        s['p']=[p for p in s['p'] if p.strip()!='**Читательский дневник**']
    chs=[s.get('ch') for s in e['segs'] if s.get('ch')]
    ents.append({'n':e['n'],'segs':e['segs'],'ch':', '.join(chs)})
D['diary']={'title':'Бранч с князем Юсуповым','author':'Иван Шешокин','entries':ents}
def md(f):
    t=(W/'book'/f).read_text(encoding='utf8'); ps=[re.sub(r'\s*\n\s*',' ',b).strip() for b in re.split(r'\n\s*\n',t)]
    return [p for p in ps if p and not p.startswith('#')]
fr=json.load(open(W/'data/front.json'))
for k,v in fr.items(): D['front'][k]={'title':v['title'],'by':v['by'],'p':md(v['file'])}
D['rod']=json.load(open(W/'data/rod.json'))
OUT.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('chapters',len(D['chapters']),'quotes',len(D['quotes']),'tl',len(D['timeline']),'world',sum(len(s['items']) for s in D['world']),'profiles',len(D['profiles']),'size',OUT.stat().st_size//1024,'KB')
