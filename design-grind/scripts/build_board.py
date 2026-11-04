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


def build(manifest, output):
    import base64
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
        if set(variants) - {'desktop', 'mobile'}:
            raise ValueError('Variants must be desktop or mobile')
        if not variants and change.get('kind') != 'evidence':
            raise ValueError(f'{change["id"]}: provide captures or use kind evidence')
        for name, pair in variants.items():
            if set(pair) != {'before', 'after'}:
                raise ValueError(f'{change["id"]}/{name}: provide both before and after')
            for side, image in pair.items():
                path = manifest.parent / image.pop('file')
                mime = IMAGE_TYPES.get(path.suffix.lower())
                if not mime:
                    raise ValueError(f'Unsupported screenshot type: {path.suffix}')
                raw = path.read_bytes()
                # SVG previews are nested images, never executable inline markup.
                digest = hashlib.sha256(raw).hexdigest()
                assets[digest] = f'data:{mime};base64,' + base64.b64encode(raw).decode('ascii')
                image['asset'] = digest
                width, height = image.get('width'), image.get('height')
                if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and v > 0
                           for v in (width, height)):
                    raise ValueError(f'{change["id"]}: capture dimensions must be positive')
                crop = image.get('crop', [0, 0, width, height])
                if (not isinstance(crop, list) or len(crop) != 4 or
                    not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in crop) or
                    min(crop) < 0 or min(crop[2:]) <= 0 or
                    crop[0] + crop[2] > width or crop[1] + crop[3] > height):
                    raise ValueError(f'{change["id"]}: crop must fit the capture')
                image['crop'] = crop
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
