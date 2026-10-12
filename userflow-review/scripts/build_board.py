"""Pack a screen catalog and local previews into a portable review board."""
import argparse
import base64
import html
import json
import re
from pathlib import Path


IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
               ".webp": "image/webp", ".gif": "image/gif"}


def has_preview(source):
    if not isinstance(source, dict):
        raise ValueError("A device preview must be an object")
    supplied = [key for key in ("html", "file") if key in source]
    if len(supplied) > 1:
        raise ValueError("A preview must use either file or html, not both")
    if supplied and (not isinstance(source[supplied[0]], str) or not source[supplied[0]].strip()):
        raise ValueError("Preview file/html must be a nonempty string")
    return bool(supplied)


def pack_preview(source, base_dir, name):
    if "file" not in source:
        return
    path = base_dir / source["file"]
    suffix = path.suffix.lower()
    if suffix in (".html", ".htm"):
        preview = path.read_text(encoding="utf-8")
        if not preview.strip():
            raise ValueError(f"Empty preview: {path}")
    elif suffix in IMAGE_TYPES:
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        alt = html.escape(source.get("alt", name), quote=True)
        preview = ('<!doctype html><html><head><meta name="viewport" '
                   'content="width=device-width,initial-scale=1"><style>'
                   'html,body{margin:0;background:#000}img{display:block;width:100%;height:auto}'
                   '</style></head><body><img alt="' + alt + '" src="data:'
                   + IMAGE_TYPES[suffix] + ';base64,' + encoded + '"></body></html>')
    else:
        raise ValueError(f"Unsupported preview file type: {path.suffix}")
    source["html"] = preview
    del source["file"]  # Local authoring paths do not belong in the portable artifact.


def validate(data, custom_renderer):
    def identifier(value):
        if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", value):
            raise ValueError(f"Invalid stable ID: {value!r}")

    identifier(data.get("id"))
    if not data.get("title") or not data.get("groups"):
        raise ValueError("Board title and nonempty groups are required")
    groups, states = set(), set()
    for group in data["groups"]:
        identifier(group.get("id"))
        if group["id"] in groups or not group.get("title") or not group.get("states"):
            raise ValueError("Sections need unique IDs, titles, and states")
        groups.add(group["id"])
        for state in group["states"]:
            identifier(state.get("id"))
            if state["id"] in states or not state.get("name"):
                raise ValueError("States need globally unique IDs and names")
            states.add(state["id"])
            if not custom_renderer:
                shared = has_preview(state)
                paired = [has_preview(state.get(v, {})) for v in ("desktop", "mobile")]
                if not shared and not all(paired):
                    raise ValueError(f"State {state['id']} needs a shared preview or both device previews")
                if shared and any(paired):
                    raise ValueError(f"State {state['id']} must use shared or paired previews, not both")
    if data.get("initialState") and data["initialState"] not in states:
        raise ValueError("initialState must exist in the catalog")
    if set(data.get("viewports", {})) - {"desktop", "mobile"}:
        raise ValueError("Only desktop and mobile viewports are supported")
    for viewport in data.get("viewports", {}).values():
        if not all(isinstance(viewport.get(k), int) and 240 <= viewport[k] <= 4096
                   for k in ("width", "height")):
            raise ValueError("Viewport dimensions must be integers from 240 to 4096")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--renderer", type=Path)
    parser.add_argument("--resources", type=Path)
    args = parser.parse_args()
    data = json.loads(args.manifest.read_text(encoding="utf-8"))
    validate(data, bool(args.renderer))
    if not args.renderer:
        for group in data["groups"]:
            for state in group["states"]:
                pack_preview(state, args.manifest.parent, state["name"])
                for variant in ("desktop", "mobile"):
                    if variant in state:
                        pack_preview(state[variant], args.manifest.parent, state["name"])
    data["resources"] = json.loads(args.resources.read_text(encoding="utf-8")) if args.resources else {}
    renderer = args.renderer.read_text(encoding="utf-8") if args.renderer else (
        "function renderPreview(state, variant) { return state[variant.id]?.html || state.html; }"
    )
    if "</script" in renderer.lower():
        raise ValueError("Renderer source must escape closing script tags")
    template = (Path(__file__).resolve().parent.parent / "assets" / "board.html").read_text(encoding="utf-8")
    encoded = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")
    result = template.replace("/* RENDERER */", renderer).replace("<!-- BOARD_DATA -->",
        '<script id="board-data" type="application/json">' + encoded + '</script>')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result, encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(args.output.resolve()), "sections": len(data["groups"]),
        "states": sum(len(g["states"]) for g in data["groups"]), "bytes": args.output.stat().st_size}))


if __name__ == "__main__":
    main()
