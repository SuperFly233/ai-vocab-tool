"""Installed dictionary text only; scripts and resource URLs never leave the helper."""
import hashlib
import json
import re
from html.parser import HTMLParser

import nh3

from .core import BridgeError

TAGS = {'article','section','div','span','p','h1','h2','h3','h4','ol','ul','li','b','strong','i','em','small','sup','sub','br','blockquote'}
CLASSES = {'entry','headword','pos','phon','sense','sensetop','shcut','def','chn','x','xs','examples','gram','label','labels','cf','idm','idmg','phrasal_verb','pv','bold','translation'}
CLEANER = nh3.Cleaner(tags=TAGS, clean_content_tags={'script','style','iframe','object','svg','math','form','button','audio','video'},
                      attributes={}, allowed_classes={tag:CLASSES for tag in TAGS}, url_relative='deny')


def clean_html(value):
    if not isinstance(value, str) or len(value.encode()) > 500000:
        raise BridgeError('词典条目过大或格式不兼容。')
    return CLEANER.clean(value)


def validate_snapshot(snapshot, reference):
    message = '词典快照校验失败，未准备卡片。'
    if not isinstance(snapshot, dict) or not isinstance(reference, dict):
        raise BridgeError(message)
    canonical = snapshot.get('canonical')
    expected = reference.get('hash')
    if (not isinstance(canonical, str) or len(canonical.encode()) > 262144
            or not isinstance(expected, str) or not re.fullmatch('[a-f0-9]{64}', expected)
            or snapshot.get('hash') != expected
            or snapshot.get('id') != reference.get('id')
            or hashlib.sha256(canonical.encode()).hexdigest() != expected):
        raise BridgeError(message)
    try:
        payload = json.loads(canonical)
    except (ValueError, RecursionError):
        raise BridgeError(message) from None
    if (not isinstance(payload, dict) or payload != snapshot.get('payload')
            or not isinstance(payload.get('dictionary'), str)
            or not 1 <= len(payload['dictionary']) <= 200
            or payload.get('textOnly') is not True
            or not isinstance(payload.get('senses'), list)
            or not 1 <= len(payload['senses']) <= 100):
        raise BridgeError(message)
    for sense in payload['senses']:
        if (not isinstance(sense, dict) or not isinstance(sense.get('html'), str)
                or sense.get('id') != hashlib.sha256(sense['html'].encode()).hexdigest()):
            raise BridgeError(message)
    return payload


class SenseParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth=0
        self.start_depth=None
        self.parts=[]
        self.senses=[]

    def handle_starttag(self, tag, attrs):
        if tag=='br':
            if self.start_depth is not None:self.parts.append('<br>')
            return
        self.depth+=1
        if self.start_depth is None and 'sense' in dict(attrs).get('class','').split():
            self.start_depth=self.depth
            self.parts=[]
        if self.start_depth is not None:self.parts.append(self.get_starttag_text())

    def handle_endtag(self, tag):
        if tag=='br':return
        if self.start_depth is not None:
            self.parts.append('</'+tag+'>')
            if self.depth==self.start_depth:
                self.senses.append(''.join(self.parts))
                self.start_depth=None
        self.depth=max(0,self.depth-1)

    def handle_data(self, text):
        if self.start_depth is not None:
            import html
            self.parts.append(html.escape(text))


def lookup(adapter, query, dictionary):
    installed=adapter.call('dictionaries').get('dictionaries')
    if not isinstance(installed,list):raise BridgeError('词典列表格式不兼容。')
    if not isinstance(dictionary,str) or not 1<=len(dictionary)<=200 or not any(row.get('name')==dictionary and row.get('enabled') is True for row in installed if isinstance(row,dict)):
        raise BridgeError('所选词典未安装或未启用。')
    response=adapter.call('dictionary',query=query)
    if not isinstance(response.get('entries'),list):raise BridgeError('词典返回格式不兼容。')
    entries=[]
    for row in response['entries']:
        if not isinstance(row,dict) or row.get('dictionary')!=dictionary:continue
        cleaned=clean_html(row.get('meaning'))
        parser=SenseParser();parser.feed(cleaned)
        senses=[{'id':hashlib.sha256(value.encode()).hexdigest(),'html':value} for value in parser.senses]
        if not senses:senses=[{'id':hashlib.sha256(cleaned.encode()).hexdigest(),'html':cleaned}]
        entries.append({'headword':str(row.get('word',''))[:400],'reading':str(row.get('reading',''))[:400],
                        'html':cleaned,'hash':hashlib.sha256(cleaned.encode()).hexdigest(),'senses':senses})
    result={'dictionary':dictionary,'query':query,'entries':entries,'textOnly':True}
    import json
    if len(json.dumps(result,ensure_ascii=False).encode())>220000:raise BridgeError('该词典条目过长，请查询更具体的词组；未截断或保存不完整释义。')
    return result
