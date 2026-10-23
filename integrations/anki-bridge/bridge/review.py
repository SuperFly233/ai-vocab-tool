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


def review_row(row, limit=600):
    before = (row['before'] or {}).get('fields', {})
    changes = []
    if row['operation'] == 'update':
        for field in REVIEW_FIELDS:
            old, new = before.get(field, ''), row['fields'].get(field, '')
            if old == new:
                continue
            old_text, old_cut = excerpt(old, limit)
            new_text, new_cut = excerpt(new, limit)
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
