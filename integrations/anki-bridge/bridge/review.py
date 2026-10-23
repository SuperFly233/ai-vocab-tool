from html.parser import HTMLParser
import json

REVIEW_FIELDS = ('Expression', 'Origin', 'Sentence', 'Translation', 'Meaning', 'Notes', 'Source', 'DictionarySource', 'Dictionary', 'CoreMeaning', 'AIContent', 'AIContentSource')


class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.hidden += 1
        elif tag in ('p', 'div', 'li', 'br', 'section') and not self.hidden:
            self.parts.append(' ')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden = max(0, self.hidden - 1)
        elif tag in ('p', 'div', 'li', 'section') and not self.hidden:
            self.parts.append(' ')

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def excerpt(value, limit=600):
    parser = Text()
    parser.feed(value)
    text = ' '.join(''.join(parser.parts).split())
    return text[:limit], len(text) > limit


class LearningSections(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sections, self.current, self.depth = {}, None, 0

    def handle_starttag(self, tag, attrs):
        if tag == 'section':
            if not self.depth:
                key = dict(attrs).get('data-content-section')
                self.current = Text() if key else None
                if key:
                    self.sections[key] = self.current
            self.depth += 1
        if self.current:
            self.current.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if self.current:
            self.current.handle_endtag(tag)
        if tag == 'section' and self.depth:
            self.depth -= 1
            if not self.depth:
                self.current = None

    def handle_data(self, data):
        if self.current:
            self.current.handle_data(data)


def learning_changes(old, new, limit):
    before, after = LearningSections(), LearningSections()
    before.feed(old)
    after.feed(new)
    if not before.sections and not after.sections:
        return excerpt(old, limit), excerpt(new, limit)
    names = {'summary': '总述', 'senses': '义项', 'examples': '例句与译文',
             'collocations': '固定搭配', 'register': '语体说明', 'confusions': '易混词辨析'}
    old_parts, new_parts = [], []
    for key, label in names.items():
        a = ' '.join(''.join(before.sections[key].parts).split()) if key in before.sections else ''
        b = ' '.join(''.join(after.sections[key].parts).split()) if key in after.sections else ''
        if a != b:
            old_parts.append(label + '：' + (a or '无'))
            new_parts.append(label + '：' + (b or '无'))
    if not old_parts:
        return ('正文文字未变，仅格式或高亮变化。', False), ('请核对完整卡面。', False)
    a, b = '\n\n'.join(old_parts), '\n\n'.join(new_parts)
    return (a[:limit], len(a) > limit), (b[:limit], len(b) > limit)


def review_row(row, limit=600):
    before = (row['before'] or {}).get('fields', {})
    changes = []
    if row['operation'] == 'update':
        for field in REVIEW_FIELDS:
            old, new = before.get(field, ''), row['fields'].get(field, '')
            if old == new:
                continue
            (old_text, old_cut), (new_text, new_cut) = learning_changes(old, new, limit) if field == 'AIContent' else (excerpt(old, limit), excerpt(new, limit))
            changes.append({'field': field, 'before': old_text, 'after': new_text,
                            'beforeTruncated': old_cut, 'afterTruncated': new_cut})
    return {'key': row['card']['key'], 'operation': row['operation'], 'previous': {}, 'changes': changes}


def review_rows(rows):
    limit = 600
    while True:
        result = [review_row(row, limit) for row in rows]
        if len(json.dumps(result, ensure_ascii=False).encode('utf-8')) <= 180000:
            return result
        limit //= 2
        if limit < 16:
            raise ValueError('Preview metadata exceeds the bounded review budget')
