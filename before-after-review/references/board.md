# Decision board

Use the bundled viewer unchanged. Outputs are deterministic offline HTML with embedded, deduplicated screenshots.

First build:

```sh
python3 <skill-dir>/scripts/build_board.py manifest.json --output original.html
```

Rebuild after review:

```sh
python3 <skill-dir>/scripts/build_board.py manifest.json --baseline original.html --decisions decisions.json --output review.html
```

`--baseline` checks the board ID, fixed `revision.base`, and known Before descriptions and captures against the first board, including stages. Crops and annotations may change while retaining the original image. New changes or previously uncaptured states need genuine captures from the starting snapshot. Only `revision.head` advances between rounds.

`--decisions` embeds the exported choices and notes. Unchanged fingerprints keep their choices; revised evidence requires a fresh decision. Local storage resumes edits only for the exact board version; rebuilding with different evidence or exported decisions starts from the supplied record.

## Catalog

```json
{
  "id": "product-design-review",
  "title": "Product review",
  "revision": {"base": "BASE_SHA", "head": "HEAD_SHA"},
  "changes": [{
    "id": "login-spacing",
    "group": "Login",
    "title": "Title spacing",
    "reason": "Bring the title and form closer.",
    "beforeText": "Large gap above the form.",
    "afterText": "Smaller gap above the form.",
    "kind": "visual",
    "context": "These captures also include other PR changes.",
    "variants": {
      "desktop": {
        "before": {"file": "before.png", "width": 1280, "height": 960, "crop": [455, 90, 360, 180]},
        "after": {"file": "after.png", "width": 1280, "height": 960, "crop": [455, 90, 360, 180]}
      }
    }
  }]
}
```

- Board and change IDs remain stable across updates. IDs contain letters, digits, hyphens, or underscores; change IDs are unique across groups.
- Each change is one accept/decline decision. Keep the title and reason brief; use `context` for evidence limitations and coupling to other changes. Notes belong to the user and are available regardless of the decision.
- `kind` is `visual`, `behavior`, or `evidence`. Supporting evidence may omit screenshots; the viewer shows its before/after text. A screenshot does not prove behavior.
- `variants` accepts `desktop` and `mobile`; each provided variant needs both sides. Boards with only one device use that device and hide the device switch; `M` does nothing. On mixed-device boards, missing variants are shown as unavailable, never substituted. PNG/JPEG/WebP/SVG paths resolve from the manifest directory. Dimensions describe the actual capture; optional crops use `[x, y, width, height]`. Full context shows the unchanged original image.
- An image may include `arrows: [{x, y, labelX, labelY, label}]`, in original capture coordinates. Keep labels within the crop. Arrows overlay the original and can be hidden for inspection.
- For captured stages of the same decision, supply `stages: [{id, label, variants}]`, such as Start/End scroll positions. Each stage uses the same variant schema. Switching stages preserves the decision and note; use separate changes for independent decisions.
- Optional `sourceUrl` links to source code. `initialChange` selects an existing ID; `initialFilter` is `pending` (default), `all`, `accept`, `decline`, or `notes`.
- The builder fingerprints each change's evidence and meaning. Changed comparisons reopen prior choices while preserving the old decision and note. Use `--decisions` to carry choices into a rebuilt board.

## Review flow

The grouped list locates changes; the purpose line explains the benefit; detail/context views support inspection. Accept/Decline toggles a decision without navigating away; repeating the current choice clears it. Repeating a choice on changed evidence reconfirms it. Notes are independent. Next/previous follows the item order shown in the grouped list within the active filter. There is no bulk acceptance.

Keys: `1` toggle accept, `2` toggle decline, `J/K` or left/right arrows previous/next item, hold `Space` to show before, `N` note, `M` device, `C` full context, `A` arrows, `S` next captured stage, `U` pending. Shortcuts do not run while typing or using native select controls; Tab remains native.

Decisions are cached locally when browser storage is available. **Export** downloads the agent-readable JSON record. Its red dot indicates decisions or notes that differ from the starting or last-exported record. Reverting edits clears it; timestamps and empty note-only entries do not count as changes. The comparison survives reloads when browser storage is available. Switching views does not mark the record changed. The agent reads the exported record.

Decision JSON contains `schemaVersion: 1`, `boardId`, `revision`, and `decisions` keyed by change ID. Each decision has `choice` (`accept`, `decline`, or null), `note`, `fingerprint`, and `updatedAt`. A note is not a third decision state.
