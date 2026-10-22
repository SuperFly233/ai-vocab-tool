import json
import hashlib
import copy
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from bridge.core import BridgeError,card_fields,Anki,MODEL,MODEL_V2,FIELDS_V2
from bridge.dictionary import clean_html, lookup, validate_snapshot
from bridge.fushi import Fushi


class DictionaryTests(unittest.TestCase):
    def test_snapshot_identity_integrity_and_shape(self):
        html='<p>notice</p>'
        payload={'dictionary':'OALDPE','textOnly':True,'senses':[{'id':hashlib.sha256(html.encode()).hexdigest(),'html':html}]}
        def snapshot_for(value):
            canonical=json.dumps(value)
            return {'id':'snapshot-id','payload':value,'canonical':canonical,'hash':hashlib.sha256(canonical.encode()).hexdigest()}
        snapshot=snapshot_for(payload)
        reference={'id':snapshot['id'],'hash':snapshot['hash']}
        self.assertEqual(validate_snapshot(snapshot,reference),payload)
        invalid=[]
        for key,value in [('id','other'),('canonical','{'),('payload',{}),('hash','0'*64)]:
            changed=copy.deepcopy(snapshot);changed[key]=value;invalid.append((changed,reference))
        for value in [[],{},dict(payload,senses=[]),dict(payload,textOnly=False),dict(payload,senses=[{'id':'bad','html':html}])]:
            changed=snapshot_for(value);invalid.append((changed,{'id':changed['id'],'hash':changed['hash']}))
        malformed={'id':'snapshot-id','canonical':'{','payload':{},'hash':hashlib.sha256(b'{').hexdigest()}
        invalid.append((malformed,{'id':'snapshot-id','hash':malformed['hash']}))
        invalid.extend([(None,reference),(snapshot,None)])
        for changed,ref in invalid:
            with self.subTest(snapshot=changed),self.assertRaises(BridgeError):
                validate_snapshot(changed,ref)

    def test_sanitization_and_separate_senses(self):
        html='<script>bad()</script><style>body{display:none}</style><div class="entry"><h1 onclick="bad()">clock</h1><a href="javascript:bad()">link</a><li class="sense evil"><span class="def">notice</span><span class="chn">注意到</span><img src="https://bad.test/x"></li><li class="sense">time</li></div>'
        adapter=Mock()
        adapter.call.side_effect=[{'dictionaries':[{'name':'OALDPE','enabled':True}]},{'entries':[{'dictionary':'OALDPE','word':'clock','meaning':html}]}]
        result=lookup(adapter,'clock','OALDPE');entry=result['entries'][0]
        self.assertEqual(len(entry['senses']),2)
        self.assertIn('注意到',entry['html'])
        for forbidden in ['script','onclick','javascript:','https:','<img','<style','evil']:
            self.assertNotIn(forbidden,entry['html'])
        self.assertEqual(len(entry['hash']),64)

    def test_disabled_dictionary_and_oversize(self):
        adapter=Mock();adapter.call.return_value={'dictionaries':[{'name':'OALDPE','enabled':False}]}
        with self.assertRaises(BridgeError):lookup(adapter,'clock','OALDPE')
        self.assertEqual(adapter.call.call_count,1)
        with self.assertRaises(BridgeError):clean_html('x'*500001)

    def test_dictionary_argv_never_becomes_an_option(self):
        executable=Mock();executable.is_file.return_value=True
        runner=Mock(return_value=SimpleNamespace(returncode=0,stdout=json.dumps({'entries':[]}).encode()))
        adapter=Fushi(runner=runner,executable=__file__)
        adapter.call('dictionary',query='--evil')
        self.assertEqual(runner.call_args.args[0][-2:],['--','--evil'])
        for query in ['', 'a\nb', 'x'*201]:
            with self.assertRaises(BridgeError):adapter.call('dictionary',query=query)

    def test_independent_v2_template_and_safe_fields(self):
        card={'key':'clock','title':'clock','origin':'clcok','quote':'I clocked it.','translation':'注意到','meaning':'AI meaning','note':'mine','sourceTitle':'test','sourceUrl':'','media':[],'exampleHighlights':['clocked'],'translationHighlights':['注意到']}
        old=card_fields(card,'owner','profile')
        card.update(_modelVersion=2,_dictionary={'dictionary':'OALDPE','senses':[{'html':'<p>Oxford meaning</p><script>bad()</script>'}]})
        new=card_fields(card,'owner','profile')
        self.assertEqual(new['Meaning'],old['Meaning'])
        self.assertEqual(new['Origin'],'clcok')
        self.assertIn('Oxford meaning',new['Dictionary'])
        self.assertNotIn('script',new['Dictionary'])
        self.assertNotEqual(new['LexiKey'],old['LexiKey'],'New model does not silently migrate v1 notes')
        anki=Anki();self.assertEqual(anki.model_definition()[0],MODEL)
        anki.model_version=2;self.assertEqual(anki.model_definition()[0],MODEL_V2);self.assertEqual(anki.model_definition()[1],FIELDS_V2);anki.http.close()


if __name__=='__main__':unittest.main()
