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
        key = im.get('q') or im.get('file') or im.get('url')
        if not key:
            continue
        slug = hashlib.sha1(key.encode()).hexdigest()[:12] + '.jpg'
        dst, big = OUT / slug, OUT / 'full' / slug
        if not (dst.exists() and big.exists()):
            try:
                if im.get('url'):
                    url = im['url']
                elif im.get('file'):
                    url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(im['file'].replace(' ', '_')) + '?width=1600'
                else:
                    name, url = search(im['q'])
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
