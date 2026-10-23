import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

from bridge.app import State,create_app
from bridge.core import Anki,BridgeError,card_fields,MODEL as OLD_MODEL
from bridge.learning import MODEL,validate,render
from test_bridge import FakeCloud,card


class LearningTests(unittest.TestCase):
    def content(self):
        return {'version':1,'origin':'clcok','selected':['core','summary','senses','examples','collocations','register','confusions'],'result':{'headword':{'title':'clock','coreMeaning':'notice','summary':'<script>unsafe()</script>'},'meta':{'model':'fixture'},'senses':[{'shortestLabel':'notice','meaning':'notice a detail','example':'I clocked it.','translation':'注意到了','exampleHighlights':['clocked'],'translationHighlights':['注意到']}],'collocations':[{'phrase':'clock in','meaning':'登记'}],'register':{'style':'spoken'},'confusions':[{'term':'notice','difference':'different','usage':'general'}]}}

    def test_complete_snapshot_integrity_and_safe_render(self):
        value=self.content();canonical=json.dumps(value,ensure_ascii=False);hash_value=hashlib.sha256(canonical.encode()).hexdigest();snapshot={'payload':value,'canonical':canonical,'hash':hash_value}
        self.assertEqual(validate(snapshot,{'hash':hash_value}),value)
        output=render(value);self.assertIn('&lt;script&gt;',output);self.assertIn('<mark>clocked</mark>',output);self.assertIn('clock in',output);self.assertIn('confusions',output)
        with self.assertRaises(BridgeError):validate(snapshot,{'hash':'0'*64})

    def test_independent_template_and_owned_fields(self):
        anki=Anki();self.assertEqual(anki.model_definition()[0],OLD_MODEL);anki.model_version=3;definition=anki.model_definition();self.assertEqual(definition[0],MODEL);self.assertIn('AIContent',definition[1]);anki.http.close()
        fields=card_fields({**card(),'_modelVersion':3,'_content':self.content()},'fixture','profile')
        self.assertIn('clock in',fields['AIContent']);self.assertEqual(fields['CoreMeaning'],'notice');self.assertNotIn('<script>',fields['AIContent']);self.assertIn('Origin',fields)

    def test_pause_and_public_identity_are_bounded(self):
        with tempfile.TemporaryDirectory() as temp:
            state=State(Path(temp),cloud=FakeCloud());client=TestClient(create_app(state,3000,'fixture'),base_url='http://127.0.0.1:3000');headers={'Origin':'http://127.0.0.1:3000','X-Bridge-Token':'fixture'}
            value=client.get('/api/info').json();self.assertEqual(value['version'],'0.4.0');self.assertNotIn('owner',value)
            self.assertEqual(client.post('/api/pause',headers=headers,json={'paused':True}).json(),{'paused':True});self.assertTrue(state.paused.is_set())
            self.assertEqual(client.post('/api/pause',json={'paused':False}).status_code,403)
            export=client.post('/api/diagnostics-export',headers=headers,json={}).json();self.assertNotIn('owner',export);self.assertNotIn('config',export)
            state.journal.db.close();client.close()
