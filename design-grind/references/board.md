# Decision board

Use the bundled viewer and builder. Supply a change catalog and screenshots; do not regenerate the interface per task. Keep product assets and decision records outside this skill.

```sh
python3 <skill-dir>/scripts/build_board.py manifest.json --output review.html
```

The output is one offline HTML file with embedded, deduplicated screenshots. Identical inputs produce identical bytes. No server or external assets are required.

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
- `variants` accepts `desktop` and `mobile`; each provided variant needs both sides. Missing variants are shown as unavailable, never substituted. PNG/JPEG/WebP/SVG paths resolve from the manifest directory. Dimensions describe the actual capture; optional crops use `[x, y, width, height]`. Full context shows the unchanged original image.
- An image may include `arrows: [{x, y, labelX, labelY, label}]`, in original capture coordinates. Keep labels within the crop. Arrows overlay the original and can be hidden for inspection.
- For captured stages of the same decision, supply `stages: [{id, label, variants}]`, such as Start/End scroll positions. Each stage uses the same variant schema. Switching stages preserves the decision and note; use separate changes for independent decisions.
- Optional `sourceUrl` links to source code. `initialChange` selects an existing ID; `initialFilter` is `pending` (default), `all`, `accept`, `decline`, or `notes`.
- The builder fingerprints each change's evidence and meaning. Changed comparisons reopen prior choices while preserving the old decision and note. Unchanged IDs and evidence keep their choices.

## Review flow

The grouped list locates changes; the purpose line explains the benefit; detail/context views support inspection. Accept/Decline records a decision without navigating away. Notes are independent. Next/previous and filters make it easy to review the remainder and revisit choices. There is no bulk acceptance.

Keys: `1` accept, `2` decline, `J/K` next/previous, hold `Space` to show before, `N` note, `M` device, `C` full context, `A` arrows, `S` next captured stage, `U` pending. Shortcuts do not run while typing or using native select controls; Tab remains native.

Decisions are cached locally when browser storage is available. **Export** downloads the agent-readable JSON record. Its red dot starts on each page load, clears after export, and returns when a decision or note changes. Switching views does not mark the record changed. The agent reads the exported record.

Decision JSON contains `schemaVersion: 1`, `boardId`, `revision`, and `decisions` keyed by change ID. Each decision has `choice` (`accept`, `decline`, or null), `note`, `fingerprint`, and `updatedAt`. A note is not a third decision state. Use the record to apply selections, revise proposals from notes, and rebuild with the same IDs; verify the selected combination. Do not overwrite the user's source record when making a demonstration board.
