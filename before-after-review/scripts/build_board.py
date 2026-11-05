"""Build an offline decision board from a change catalog and local screenshots."""
import argparse
import hashlib
import json
import re
from pathlib import Path

IMAGE_TYPES = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
               '.webp': 'image/webp', '.svg': 'image/svg+xml'}


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9_-]+', value):
        raise ValueError(f'Invalid stable ID: {value!r}')


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
        separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def pack_variants(variants, change_id, base_dir, assets):
    import base64
    if not isinstance(variants, dict) or set(variants) - {'desktop', 'mobile'}:
        raise ValueError('Variants must be desktop or mobile')
    for name, pair in variants.items():
        if set(pair) != {'before', 'after'}:
            raise ValueError(f'{change_id}/{name}: provide both before and after')
        for side, image in pair.items():
            path = base_dir / image.pop('file')
            mime = IMAGE_TYPES.get(path.suffix.lower())
            if not mime:
                raise ValueError(f'Unsupported screenshot type: {path.suffix}')
            raw = path.read_bytes()
            digest = hashlib.sha256(raw).hexdigest()
            assets[digest] = f'data:{mime};base64,' + base64.b64encode(raw).decode('ascii')
            image['asset'] = digest
            width, height = image.get('width'), image.get('height')
            if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and v > 0
                       for v in (width, height)):
                raise ValueError(f'{change_id}: capture dimensions must be positive')
            crop = image.get('crop', [0, 0, width, height])
            if (not isinstance(crop, list) or len(crop) != 4 or
                not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in crop) or
                min(crop) < 0 or min(crop[2:]) <= 0 or
                crop[0] + crop[2] > width or crop[1] + crop[3] > height):
                raise ValueError(f'{change_id}: crop must fit the capture')
            image['crop'] = crop
            for arrow in image.get('arrows', []):
                for field, limit in [('x', width), ('y', height), ('labelX', width), ('labelY', height)]:
                    value = arrow.get(field)
                    if not isinstance(value, (int, float)) or isinstance(value, bool) or not 0 <= value <= limit:
                        raise ValueError(f'{change_id}: arrow {field} must fit the capture')
                if not isinstance(arrow.get('label'), str) or not 1 <= len(arrow['label']) <= 60:
                    raise ValueError(f'{change_id}: arrow label must contain 1–60 characters')


def read_decisions(path, data):
    record = json.loads(Path(path).read_text(encoding='utf-8'))
    if (not isinstance(record, dict) or type(record.get('schemaVersion')) is not int or
            record['schemaVersion'] != 1 or record.get('boardId') != data['id']):
        raise ValueError('Decision record must match this board and schema version 1')
    baseline = (data.get('revision') or {}).get('base')
    if baseline is not None and (record.get('revision') or {}).get('base') != baseline:
        raise ValueError('Decision record must use the same original revision.base')
    decisions = record.get('decisions')
    if not isinstance(decisions, dict):
        raise ValueError('Decision record needs a decisions object')
    result = {}
    ids = {change['id'] for change in data['changes']}
    for change_id, decision in decisions.items():
        if not isinstance(decision, dict) or decision.get('choice') not in (None, 'accept', 'decline'):
            raise ValueError(f'{change_id}: invalid decision choice')
        for field in ('note', 'fingerprint', 'updatedAt'):
            if not isinstance(decision.get(field, ''), str):
                raise ValueError(f'{change_id}: decision {field} must be text')
        if decision.get('choice') and not decision.get('fingerprint'):
            raise ValueError(f'{change_id}: a choice needs its reviewed fingerprint')
        if change_id in ids:
            result[change_id] = {field: decision.get(field, None if field == 'choice' else '')
                                 for field in ('choice', 'note', 'fingerprint', 'updatedAt')}
    return result


def check_baseline(data, path):
    match = re.search(r'<script id="board-data" type="application/json">(.*?)</script>',
                      Path(path).read_text(encoding='utf-8'), re.S)
    if not match:
        raise ValueError('Baseline must be an original board HTML file')
    original = json.loads(match.group(1))
    if (original['id'] != data['id'] or
            (original.get('revision') or {}).get('base') != (data.get('revision') or {}).get('base')):
        raise ValueError('Baseline must match this board and original revision.base')
    originals = {change['id']: change for change in original['changes']}
    for change in data['changes']:
        before = originals.get(change['id'])
        if before is None:
            continue
        if change['beforeText'] != before['beforeText']:
            raise ValueError(f'{change["id"]}: keep the original Before description')
        captures = {}
        for stage in [before, *before.get('stages', [])]:
            for device, pair in stage.get('variants', {}).items():
                captures.setdefault(device, []).append(pair['before'])
        for stage in [change, *change.get('stages', [])]:
            for device, pair in stage.get('variants', {}).items():
                known = captures.get(device, [])
                if known and not any(all(pair['before'][key] == saved[key]
                                         for key in ('asset', 'width', 'height')) for saved in known):
                    raise ValueError(f'{change["id"]}/{device}: keep the original Before capture')


def build(manifest, output, decisions=None, baseline=None):
    manifest, output = Path(manifest), Path(output)
    if decisions is not None and baseline is None:
        raise ValueError('Rebuilding with decisions requires --baseline original.html')
    if baseline is not None and Path(baseline).resolve() == output.resolve():
        raise ValueError('Keep the original baseline separate from the rebuilt output')
    data = json.loads(manifest.read_text(encoding='utf-8'))
    identifier(data.get('id'))
    if not isinstance(data.get('title'), str) or not data['title'].strip():
        raise ValueError('A board title is required')
    if not isinstance(data.get('changes'), list) or not data['changes']:
        raise ValueError('A nonempty changes list is required')
    if data.get('initialFilter', 'pending') not in ('pending', 'all', 'accept', 'decline', 'notes'):
        raise ValueError('Unsupported initialFilter')
    assets, ids = {}, set()
    for change in data['changes']:
        identifier(change.get('id'))
        if change['id'] in ids:
            raise ValueError(f'Duplicate change ID: {change["id"]}')
        ids.add(change['id'])
        if change.get('kind') not in ('visual', 'behavior', 'evidence'):
            raise ValueError(f'{change["id"]}: kind must be visual, behavior, or evidence')
        for field in ('title', 'group', 'reason', 'beforeText', 'afterText'):
            if not isinstance(change.get(field), str) or not change[field].strip():
                raise ValueError(f'{change["id"]}: {field} must be nonempty')
        variants = change.get('variants', {})
        stages = change.get('stages', [])
        if not isinstance(stages, list):
            raise ValueError('stages must be a list')
        stage_ids = set()
        for stage in stages:
            identifier(stage.get('id'))
            if stage['id'] in stage_ids or not isinstance(stage.get('label'), str) or not stage['label'].strip():
                raise ValueError('Stages need unique IDs and labels')
            stage_ids.add(stage['id'])
            if not stage.get('variants'):
                raise ValueError('Stages need screenshot variants')
            pack_variants(stage['variants'], change['id'], manifest.parent, assets)
        if not variants and not stages and change.get('kind') != 'evidence':
            raise ValueError(f'{change["id"]}: provide captures or use kind evidence')
        pack_variants(variants, change['id'], manifest.parent, assets)
        content = {k: v for k, v in change.items() if k not in ('decision', 'fingerprint')}
        change['fingerprint'] = fingerprint(content)
    if data.get('initialChange') and data['initialChange'] not in ids:
        raise ValueError('initialChange must identify a change')
    if baseline is not None:
        check_baseline(data, baseline)
    if decisions is not None:
        data['decisions'] = read_decisions(decisions, data)
    data['assets'] = assets
    data.pop('version', None)
    data['version'] = fingerprint(data)
    root = Path(__file__).resolve().parent.parent
    template = (root / 'assets' / 'board.html').read_text(encoding='utf-8')
    data_json = json.dumps(data, sort_keys=True, ensure_ascii=False,
                           separators=(',', ':'), allow_nan=False).replace('<', '\\u003c')
    result = template.replace('/* BOARD_CSS */', (root / 'assets' / 'board.css').read_text())
    result = result.replace('/* BOARD_JS */', (root / 'assets' / 'board.js').read_text())
    result = result.replace('<!-- BOARD_DATA -->', '<script id="board-data" type="application/json">' + data_json + '</script>')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(result, encoding='utf-8', newline='\n')
    return {'output': str(output.resolve()), 'changes': len(ids), 'images': len(assets),
            'sha256': hashlib.sha256(result.encode()).hexdigest()}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--decisions', type=Path, help='Previous exported decision JSON for this board and original baseline')
    parser.add_argument('--baseline', type=Path, help='Original board HTML; required with --decisions')
    args = parser.parse_args()
    print(json.dumps(build(args.manifest, args.output, args.decisions, args.baseline)))
