"""Build bounded, attributed dictionary shards from explicitly downloaded public sources."""
import csv
import gzip
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'tmp/dictionary-sources'
DEST = ROOT / 'vendor/basic-dictionaries'
DEST.mkdir(parents=True, exist_ok=True)
SOURCES = {
    'en': {'name': 'ECDICT', 'license': 'MIT', 'url': 'https://github.com/skywind3000/ECDICT', 'revision': 'ab22ad36302cafc6349a050e2b60894855208055', 'file': 'ecdict.csv', 'pair': '英汉'},
    'ja': {'name': 'JMdict 常用词', 'license': 'CC-BY-SA-4.0', 'url': 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project', 'revision': 'jmdict-simplified3.6.2+20261019180022', 'file': 'jmdict.zip', 'pair': '日英'},
    'zh': {'name': 'CC-CEDICT', 'license': 'CC-BY-SA-4.0', 'url': 'https://www.mdbg.net/chinese/dictionary?page=cc-cedict', 'revision': 'download2026-10-25', 'file': 'cedict.txt.gz', 'pair': '中英'},
}

def norm(value):
    return unicodedata.normalize('NFKC', value).strip().lower()

def bucket(value):
    return f'{ord(norm(value)[0]) % 32:02d}'

def record(value, reading, meaning, rank=0):
    text = meaning.replace('\\n', '\n').strip()
    return {'value': value, 'reading': reading, 'meaning': text[:2000], 'abridged': len(text) > 2000, 'rank': rank}

def english():
    rows = []
    with (SOURCE / 'ecdict.csv').open(encoding='utf-8-sig', newline='') as file:
        for row in csv.DictReader(file):
            word = row['word'].strip()
            ranks = [int(row.get(key) or 0) for key in ('bnc', 'frq')]
            positive = [rank for rank in ranks if rank > 0]
            rank = min(positive) if positive else 999999
            if not re.fullmatch(r"[a-zA-Z][a-zA-Z '-]{0,59}", word) or not row.get('translation'):
                continue
            if rank > 30000 and not row.get('tag') and not int(row.get('collins') or 0):
                continue
            rows.append(record(word, row.get('phonetic', ''), row['translation'], rank))
    if len(rows) < 10000:
        raise ValueError('English source incomplete')
    return [(row, [row['value']]) for row in rows]

def japanese():
    raw = (SOURCE / 'jmdict.zip').read_bytes()
    if hashlib.sha256(raw).hexdigest() != 'd9a43b326561f9d88d7b1acc4cab5ea2b834d3634f119548c427ab2f772d7841':
        raise ValueError('JMdict published SHA256 mismatch')
    with zipfile.ZipFile(SOURCE / 'jmdict.zip') as archive:
        names = [name for name in archive.namelist() if name.endswith('.json')]
        if len(names) != 1 or archive.getinfo(names[0]).file_size > 40000000:
            raise ValueError('Unexpected JMdict archive')
        data = json.loads(archive.read(names[0]))
    rows = []
    for word in data['words']:
        forms = [value['text'] for value in word['kanji'] + word['kana']]
        if not forms:
            continue
        glosses = list(dict.fromkeys(gloss['text'] for sense in word['sense'] for gloss in sense['gloss'] if gloss['lang'] == 'eng'))
        rows.append((record(forms[0], ' / '.join(value['text'] for value in word['kana']), '; '.join(glosses)), forms))
    return rows

def chinese():
    text = gzip.decompress((SOURCE / 'cedict.txt.gz').read_bytes()).decode('utf-8-sig')
    if '4.0' not in text[:10000]:
        raise ValueError('Review actual CC-CEDICT license header before publishing')
    rows = []
    for line in text.splitlines():
        if not line or line.startswith('#'):
            continue
        match = re.fullmatch(r'(\S+) (\S+) \[([^\]]+)\] /(.+)/', line)
        if not match:
            raise ValueError('Unrecognized CC-CEDICT entry')
        traditional, simplified, reading, meaning = match.groups()
        rows.append((record(simplified, reading, meaning.replace('/', '; ')), [simplified, traditional]))
    return rows

manifest = {'version': 1, 'sources': SOURCES}
for language, build in [('en', english), ('ja', japanese), ('zh', chinese)]:
    rows = build()
    shards = {}
    for row, aliases in rows:
        for alias in dict.fromkeys(aliases):
            if not alias or len(alias) > 80:
                continue
            shard = shards.setdefault(bucket(alias), [])
            shard.append({**row, 'match': norm(alias)})
    output = {}
    for key, entries in sorted(shards.items()):
        entries.sort(key=lambda row: (row['match'], row['rank'], row['value']))
        raw = json.dumps(entries, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        if len(raw) > 2500000:
            raise ValueError('Shard too large')
        name = f'{language}-{key}.json'
        (DEST / name).write_bytes(raw)
        output[key] = {'file': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    source = SOURCES[language]
    source['inputSha256'] = hashlib.sha256((SOURCE / source['file']).read_bytes()).hexdigest()
    source['entries'] = len(rows)
    source['shards'] = output
    print(language, len(rows), sum(row['bytes'] for row in output.values()))
(DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
