import hashlib
import html
import json
import re
from pathlib import Path

from .core import BridgeError

SECTIONS = {'core':'核心义','summary':'总述','senses':'义项','examples':'例句与译文','collocations':'固定搭配','register':'语体说明','confusions':'易混词辨析'}
MODEL = 'Lexi Learning v3'
FRONT = '<main class="lexi-learning"><h2>{{Expression}}</h2>{{#Sentence}}<div class="sentence">{{Sentence}}</div>{{/Sentence}}{{#Media}}<div class="media">{{Media}}</div>{{/Media}}</main>'
BACK = '{{FrontSide}}<main class="lexi-learning"><div class="learning-translation">{{Translation}}</div>{{#CoreMeaning}}<div class="learning-core">{{CoreMeaning}}</div>{{/CoreMeaning}}{{AIContent}}{{#Dictionary}}<section class="lexi-dictionary"><h3>{{DictionarySource}}</h3>{{Dictionary}}</section>{{/Dictionary}}{{#Notes}}<section class="learning-section"><h3>我的笔记</h3>{{Notes}}</section>{{/Notes}}<footer class="learning-source">{{Source}}{{#AIContentSource}}<p>{{AIContentSource}}</p>{{/AIContentSource}}{{#Origin}}<p>Origin: {{Origin}}</p>{{/Origin}}</footer></main>'


def css():
    path = Path(__file__).parent.parent / 'web/learning-card.css'
    if not path.is_file():
        path = Path(__file__).resolve().parents[3] / 'learning-card.css'
    return '.card{margin:0;padding:0;background:#fff}.nightMode.card{background:#20241f}' + path.read_text('utf-8')


def validate(snapshot, ref):
    canonical = snapshot.get('canonical', '')
    if not isinstance(canonical, str) or len(canonical.encode()) > 220000 or hashlib.sha256(canonical.encode()).hexdigest() != ref.get('hash') or snapshot.get('hash') != ref.get('hash'):
        raise BridgeError('完整释义快照校验失败，请重新提交。')
    try:
        value = json.loads(canonical)
    except ValueError:
        raise BridgeError('完整释义快照无效。') from None
    if value != snapshot.get('payload') or value.get('version') != 1 or not isinstance(value.get('result'), dict):
        raise BridgeError('完整释义快照内容不一致。')
    selected = value.get('selected')
    if not isinstance(selected, list) or not selected or any(k not in SECTIONS for k in selected) or len(set(selected)) != len(selected):
        raise BridgeError('完整释义分区无效。')
    result = value['result']
    if not isinstance(result.get('headword'), dict) or not result['headword'].get('title'):
        raise BridgeError('完整释义缺少标题。')
    for key in ('senses', 'collocations', 'confusions'):
        if not isinstance(result.get(key), list) or len(result[key]) > 1000 or any(not isinstance(row, dict) for row in result[key]):
            raise BridgeError('完整释义列表无效。')
    def check(node):
        if isinstance(node, dict):
            for key, item in node.items():
                if not isinstance(key, str):
                    raise BridgeError('完整释义字段无效。')
                check(item)
        elif isinstance(node, list):
            for item in node:
                check(item)
        elif not isinstance(node, (str, int)) or isinstance(node, bool):
            raise BridgeError('完整释义字段无效。')
    check(value)
    return value


def highlight(value, terms):
    value = str(value or '')
    terms = sorted(set(t for t in (terms or []) if t), key=lambda t: (-len(t), t))
    if not terms:
        return html.escape(value, quote=True).replace('&#x27;', '&#39;')
    def esc(s):
        return html.escape(s, quote=True).replace('&#x27;', '&#39;')
    parts, start = [], 0
    for match in re.finditer('|'.join(re.escape(t) for t in terms if t), value, re.IGNORECASE):
        parts.extend([esc(value[start:match.start()]), '<mark>' + esc(match.group()) + '</mark>'])
        start = match.end()
    return ''.join(parts) + esc(value[start:])


def render(value):
    r, selected = value['result'], value['selected']
    def esc(s):
        return html.escape(str(s or ''), quote=True).replace('&#x27;', '&#39;')
    def section(key, body):
        return '<section class="learning-section" data-content-section="' + key + '"><h3>' + SECTIONS[key] + '</h3>' + body + '</section>' if key in selected and body else ''
    def items(rows, label):
        output = []
        for i, row in enumerate(rows):
            value = '<article class="learning-item"><h4><span>' + str(i+1) + '</span>' + esc(row.get(label)) + '</h4>'
            if row.get('partOfSpeech'): value += '<small>' + esc(row['partOfSpeech']) + '</small>'
            if row.get('meaning'): value += '<p>' + esc(row['meaning']) + '</p>'
            if row.get('example'): value += '<p class="learning-example">' + highlight(row['example'], row.get('exampleHighlights')) + '</p>'
            if row.get('translation'): value += '<p class="learning-translation">' + highlight(row['translation'], row.get('translationHighlights')) + '</p>'
            if row.get('note'): value += '<small>' + esc(row['note']) + '</small>'
            output.append(value + '</article>')
        return ''.join(output)
    extra = ([] if 'senses' in selected else r['senses']) + ([] if 'collocations' in selected else r['collocations'])
    examples = ''.join('<article class="learning-item">'
                       + ('<p class="learning-example">'+highlight(row['example'], row.get('exampleHighlights'))+'</p>' if row.get('example') else '')
                       + ('<p class="learning-translation">'+highlight(row['translation'], row.get('translationHighlights'))+'</p>' if row.get('translation') else '')
                       + '</article>' for row in extra if row.get('example') or row.get('translation'))
    return (section('summary', '<p>'+esc(r['headword'].get('summary'))+'</p>' if r['headword'].get('summary') else '')
            +section('senses', items(r['senses'], 'shortestLabel'))+section('collocations', items(r['collocations'], 'phrase'))
            +section('examples', examples)
            +section('register', ''.join('<p><b>'+{'style':'语体','tone':'语气','environment':'环境'}[k]+'</b> '+esc(v)+'</p>' for k,v in r.get('register', {}).items() if v and k in ('style','tone','environment')))
            +section('confusions', ''.join('<article class="learning-item"><h4>'+esc(row.get('term'))+'</h4><p>'+esc(row.get('difference'))+'</p><p class="learning-translation">'+esc(row.get('usage'))+'</p></article>' for row in r['confusions'])))
