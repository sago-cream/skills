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


def build(manifest, output):
    manifest, output = Path(manifest), Path(output)
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
        change['fingerprint'] = hashlib.sha256(json.dumps(content, sort_keys=True,
            ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode()).hexdigest()
    if data.get('initialChange') and data['initialChange'] not in ids:
        raise ValueError('initialChange must identify a change')
    data['assets'] = assets
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
    args = parser.parse_args()
    print(json.dumps(build(args.manifest, args.output)))
