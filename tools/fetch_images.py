"""Скачивает картинки для data.json → world[].items[].img в img/w/ (GitHub Actions, .github/workflows/images.yml).
img.q — поиск по Wikimedia Commons (первый растровый файл), img.file — имя файла на Commons, img.url — прямая ссылка.
Пишет img.src (ч/б превью ≤800px), img.full (цвет ≤1600px), img.file (найденный файл для ссылки на источник)."""
import hashlib, io, json, sys, time, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data.json'
OUT = ROOT / 'img' / 'w'
UA = 'yusupov-reading-companion/1.0 (https://github.com/samvelkoch/yusupov)'
API = 'https://commons.wikimedia.org/w/api.php?'
RASTER = ('image/jpeg', 'image/png', 'image/tiff', 'image/webp', 'image/gif')

def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def search(q: str):
    """Первый растровый файл Commons по запросу: (имя файла, url превью 1600px)."""
    p = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrnamespace': 6, 'gsrlimit': 12, 'gsrsearch': q,
         'prop': 'imageinfo', 'iiprop': 'url|mime|size', 'iiurlwidth': 1600}
    pages = json.loads(get(API + urllib.parse.urlencode(p))).get('query', {}).get('pages', {})
    for pg in sorted(pages.values(), key=lambda x: x.get('index', 99)):
        ii = (pg.get('imageinfo') or [{}])[0]
        if ii.get('mime') in RASTER and ii.get('width', 0) >= 200:
            return pg['title'].removeprefix('File:'), ii.get('thumburl') or ii['url']
    return None, None

def wiki(q: str, lang: str):
    """Главная картинка статьи Википедии по запросу: (имя файла, url)."""
    p = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrlimit': 3, 'gsrsearch': q,
         'prop': 'pageimages', 'piprop': 'thumbnail|name', 'pithumbsize': 1600}
    pages = json.loads(get(f'https://{lang}.wikipedia.org/w/api.php?' + urllib.parse.urlencode(p))).get('query', {}).get('pages', {})
    for pg in sorted(pages.values(), key=lambda x: x.get('index', 99)):
        if pg.get('thumbnail') and not pg.get('pageimage', '').lower().endswith('.svg'):
            return pg['pageimage'], pg['thumbnail']['source']
    return None, None

def article(spec: str):
    """img.wiki = 'ru:Название статьи' → главная картинка этой статьи."""
    lang, title = spec.split(':', 1)
    p = {'action': 'query', 'format': 'json', 'titles': title, 'redirects': 1, 'prop': 'pageimages', 'piprop': 'thumbnail|name', 'pithumbsize': 1600}
    for pg in json.loads(get(f'https://{lang}.wikipedia.org/w/api.php?' + urllib.parse.urlencode(p))).get('query', {}).get('pages', {}).values():
        if pg.get('thumbnail'):
            return pg['pageimage'], pg['thumbnail']['source']
    return None, None

def find(q: str):
    """Commons по полному запросу → английская/русская Википедия → Commons по укороченному запросу."""
    name, url = search(q)
    if url: return name, url
    for lang in ('en', 'ru'):
        name, url = wiki(q, lang)
        if url: return name, url
    w = q.split()
    for k in range(len(w) - 1, 1, -1):
        name, url = search(' '.join(w[:k]))
        if url: return name, url
        name, url = wiki(' '.join(w[:k]), 'en')
        if url: return name, url
    return None, None

def items(d):
    for s in d.get('world', []):
        for it in s['items']:
            if it.get('img'):
                yield it['img']

def main() -> int:
    d = json.loads(DATA.read_text(encoding='utf-8'))
    OUT.mkdir(parents=True, exist_ok=True); (OUT / 'full').mkdir(exist_ok=True)
    changed, failed, n = False, [], 0
    for im in items(d):
        if im.get('src', '').startswith('img/book/'):
            continue
        key = im.get('wiki') or im.get('q') or im.get('file') or im.get('url')
        if not key:
            continue
        slug = hashlib.sha1(key.encode()).hexdigest()[:12] + '.jpg'
        dst, big = OUT / slug, OUT / 'full' / slug
        if not (dst.exists() and big.exists()):
            try:
                if im.get('url'):
                    url = im['url']
                elif im.get('wiki'):
                    name, url = article(im['wiki'])
                    if url:
                        lang, title = im['wiki'].split(':', 1)
                        im['page'] = f'https://{lang}.wikipedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_')); im['credit'] = 'Википедия'
                    if not url and im.get('q'):
                        name, url = find(im['q'])
                    if not url:
                        failed.append(key); print('NONE', key); continue
                    im['file'] = name; changed = True
                elif im.get('file') and not im.get('q'):
                    url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(im['file'].replace(' ', '_')) + '?width=1600'
                    try:
                        get(url[:-11] + '?width=64')
                    except Exception:  # noqa: BLE001 — файла нет: ищем по имени
                        name, url = find(im['file'].rsplit('.', 1)[0])
                        if not url:
                            failed.append(key); print('NONE', key); continue
                        im['file'] = name; changed = True
                else:
                    name, url = find(im['q'])
                    if not url:
                        failed.append(key); print('NONE', key); continue
                    im['file'] = name; changed = True
                pic = ImageOps.exif_transpose(Image.open(io.BytesIO(get(url))))
                g = pic.convert('L'); g.thumbnail((800, 800)); g.save(dst, 'JPEG', quality=74, optimize=True, progressive=True)
                c = pic.convert('RGB'); c.thumbnail((1600, 1600)); c.save(big, 'JPEG', quality=80, optimize=True, progressive=True)
                n += 1; print('ok  ', key, '→', im.get('file', url)[:80], c.size)
                time.sleep(0.5)
            except Exception as e:  # noqa: BLE001 — логируем и идём дальше
                failed.append(key); print('FAIL', key, repr(e)); continue
        for k, v in (('src', 'img/w/' + slug), ('full', 'img/w/full/' + slug)):
            if im.get(k) != v:
                im[k] = v; changed = True
    if changed:
        DATA.write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'downloaded {n}, failed {len(failed)}:', failed)
    return 0

if __name__ == '__main__':
    sys.exit(main())
