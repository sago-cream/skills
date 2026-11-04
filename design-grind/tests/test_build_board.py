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

    def build(self, name='out.html'):
        source, output = self.root / 'manifest.json', self.root / name
        source.write_text(json.dumps(self.data))
        module.build(source, output)
        html = output.read_text()
        data = json.loads(re.search(r'<script id="board-data" type="application/json">(.*?)</script>', html, re.S).group(1))
        return html, data

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
