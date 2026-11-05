import importlib.util
import json
import re
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_board', ROOT / 'scripts' / 'build_board.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BoardBuildTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'image.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>')
        self.data = {'id': 'review', 'title': 'Review', 'changes': [
            {'id': 'one', 'group': 'Login', 'title': 'Spacing', 'reason': 'Group related controls.',
             'beforeText': 'Wide gap', 'afterText': 'Narrow gap', 'kind': 'visual',
             'variants': {'desktop': {side: {'file': 'image.svg', 'width': 8, 'height': 8}
                                      for side in ('before', 'after')}}}]}

    def build(self, name='out.html', decisions=None):
        source, output = self.root / 'manifest.json', self.root / name
        source.write_text(json.dumps(self.data))
        module.build(source, output, decisions)
        html = output.read_text()
        data = json.loads(re.search(r'<script id="board-data" type="application/json">(.*?)</script>', html, re.S).group(1))
        return html, data

    def export(self, data):
        record = {'schemaVersion': 1, 'boardId': data['id'], 'revision': data.get('revision'),
                  'decisions': {change['id']: {'choice': 'accept', 'note': 'Keep this.',
                      'fingerprint': change['fingerprint'], 'updatedAt': '2026-01-01T00:00:00Z'}
                      for change in data['changes']}}
        source = self.root / 'decisions.json'
        source.write_text(json.dumps(record))
        return source

    def test_reproducible_portable_and_deduplicated(self):
        first, data = self.build()
        self.assertEqual(first, self.build('second.html')[0])
        self.assertEqual(len(data['assets']), 1)
        self.assertNotIn(str(self.root), first)
        self.assertNotIn('file', data['changes'][0]['variants']['desktop']['before'])

    def test_changed_evidence_reopens_only_affected_change(self):
        self.data['changes'].append({**self.data['changes'][0], 'id': 'two'})
        # Serialize and parse so the two items have independent nested inputs.
        self.data = json.loads(json.dumps(self.data))
        _, before = self.build()
        self.data['changes'][0]['reason'] = 'Different purpose'
        _, after = self.build()
        self.assertNotEqual(before['changes'][0]['fingerprint'], after['changes'][0]['fingerprint'])
        self.assertEqual(before['changes'][1]['fingerprint'], after['changes'][1]['fingerprint'])

    def test_rebuild_embeds_export_with_fixed_baseline_and_new_head(self):
        self.data['revision'] = {'base': 'original', 'head': 'first-proposal'}
        _, before = self.build()
        source = self.export(before)
        original_export = source.read_bytes()
        self.data['revision']['head'] = 'second-proposal'
        html, after = self.build(decisions=source)
        self.assertEqual(source.read_bytes(), original_export)
        self.assertEqual(after['revision'], {'base': 'original', 'head': 'second-proposal'})
        self.assertEqual(after['decisions']['one']['choice'], 'accept')
        self.assertEqual(after['decisions']['one']['note'], 'Keep this.')
        self.assertEqual(after['decisions']['one']['fingerprint'], after['changes'][0]['fingerprint'])
        self.assertEqual(before['changes'], after['changes'])
        self.assertEqual(html, self.build('repeat.html', decisions=source)[0])

    def test_revised_after_retains_original_before_and_previous_decisions(self):
        self.data['changes'].append(json.loads(json.dumps({**self.data['changes'][0], 'id': 'two'})))
        _, before = self.build()
        source = self.export(before)
        (self.root / 'updated.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><circle r="4"/></svg>')
        self.data['changes'][0]['variants']['desktop']['after']['file'] = 'updated.svg'
        _, after = self.build(decisions=source)
        self.assertEqual(before['changes'][0]['variants']['desktop']['before'],
                         after['changes'][0]['variants']['desktop']['before'])
        self.assertNotEqual(after['decisions']['one']['fingerprint'], after['changes'][0]['fingerprint'])
        self.assertEqual(after['decisions']['one']['choice'], 'accept')
        self.assertEqual(after['decisions']['one']['note'], 'Keep this.')
        self.assertEqual(after['decisions']['two']['fingerprint'], after['changes'][1]['fingerprint'])

    def test_decision_record_rejects_other_boards_baselines_and_invalid_choices(self):
        self.data['revision'] = {'base': 'original', 'head': 'proposal'}
        _, data = self.build()
        source = self.export(data)
        original = source.read_text()
        for field, value, message in [('boardId', 'other-board', 'match this board'),
                                       ('revision', {'base': 'iteration'}, 'original revision.base'),
                                       ('schemaVersion', 2, 'schema version')]:
            with self.subTest(field=field):
                record = json.loads(original)
                record[field] = value
                source.write_text(json.dumps(record))
                with self.assertRaisesRegex(ValueError, message):
                    self.build(decisions=source)
        for field, value in [('choice', 'maybe'), ('note', 5), ('fingerprint', '')]:
            with self.subTest(field=field):
                record = json.loads(original)
                record['decisions']['one'][field] = value
                source.write_text(json.dumps(record))
                with self.assertRaises(ValueError):
                    self.build(decisions=source)

    def test_metadata_cannot_close_the_data_script(self):
        self.data['changes'][0]['reason'] = '</script><script>window.injected=true</script>'
        html, data = self.build()
        self.assertNotIn('</script><script>window.injected', html)
        self.assertEqual(data['changes'][0]['reason'], self.data['changes'][0]['reason'])

    def test_duplicate_ids_are_rejected(self):
        self.data['changes'].append(self.data['changes'][0])
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            self.build()

    def test_stages_pack_assets_and_validate_annotations(self):
        pair = self.data['changes'][0]['variants']
        pair['desktop']['after']['arrows'] = [{'x':4,'y':4,'labelX':0,'labelY':0,'label':'Gap'}]
        self.data['changes'][0]['stages'] = [{'id':'start','label':'Start','variants':pair}]
        _, data = self.build()
        self.assertEqual(len(data['assets']),1)
        image = data['changes'][0]['stages'][0]['variants']['desktop']['after']
        self.assertIn('asset',image)
        self.assertEqual(image['arrows'][0]['label'],'Gap')
        pair['desktop']['after']['arrows'][0]['x'] = 9
        with self.assertRaisesRegex(ValueError,'arrow'):
            self.build()

    def test_unpaired_or_out_of_bounds_capture_is_rejected(self):
        del self.data['changes'][0]['variants']['desktop']['after']
        with self.assertRaisesRegex(ValueError, 'both'):
            self.build()
        self.data['changes'][0]['variants']['desktop']['after'] = {'file':'image.svg','width':8,'height':8,'crop':[0,0,9,8]}
        with self.assertRaisesRegex(ValueError, 'crop'):
            self.build()


if __name__ == '__main__':
    unittest.main()
