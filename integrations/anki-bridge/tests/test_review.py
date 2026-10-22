import unittest
from bridge.review import REVIEW_FIELDS, review_row, review_rows, excerpt
import json


class PreviewChangesTests(unittest.TestCase):
    def test_only_changed_owned_fields_are_published_as_text(self):
        value = review_row({'card': {'key': 'one'}, 'operation': 'update',
                            'before': {'fields': {'Origin': 'clcok', 'Meaning': 'same', 'Dictionary': '<b>old</b>', 'Private': 'secret'}},
                            'fields': {'Origin': 'clock', 'Meaning': 'same', 'Dictionary': '<p>new</p>'}})
        self.assertEqual([item['field'] for item in value['changes']], ['Origin', 'Dictionary'])
        self.assertEqual(value['changes'][1]['before'], 'old')
        self.assertEqual(value['changes'][1]['after'], 'new')
        self.assertNotIn('secret', str(value))
        self.assertEqual(value['previous'], {})

    def test_excerpts_are_bounded_and_truncation_is_explicit(self):
        text, cut = excerpt('<script>secret()</script><p>' + 'a' * 700 + '</p>')
        self.assertEqual(text, 'a' * 600)
        self.assertTrue(cut)
        self.assertEqual(excerpt('one &amp; two'), ('one & two', False))

    def test_twenty_multibyte_dictionary_updates_fit_review_budget(self):
        rows = [{'card': {'key': str(index)}, 'operation': 'update',
                 'before': {'fields': {field: '\U0001f600' * 1000 for field in REVIEW_FIELDS}},
                 'fields': {field: '\U0001f601' * 1000 for field in REVIEW_FIELDS}} for index in range(20)]
        result = review_rows(rows)
        self.assertLessEqual(len(json.dumps(result, ensure_ascii=False).encode()), 180000)
        self.assertTrue(all(change['beforeTruncated'] for row in result for change in row['changes']))
