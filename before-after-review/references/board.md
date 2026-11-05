# Decision board

Use the bundled viewer and builder. Supply a change catalog and screenshots; do not regenerate the interface per task. Keep product assets and decision records outside this skill.

```sh
python3 <skill-dir>/scripts/build_board.py manifest.json --output review.html
```

The output is one offline HTML file with embedded, deduplicated screenshots. Identical inputs produce identical bytes. No server or external assets are required.

For later rounds, embed the latest exported decisions in the rebuilt board:

```sh
python3 <skill-dir>/scripts/build_board.py manifest.json --decisions decisions.json --output review.html
```

Keep the source export unchanged. The builder checks its board ID and original `revision.base`; an earlier `revision.head` is expected when revising proposals. Choices and notes are embedded in the HTML, so they survive opening a new file, origin, browser, or embed without local storage. Newer local edits take precedence over embedded decisions by `updatedAt`; older cached choices do not replace a newer export. The embedded record is the starting export baseline, so carrying decisions forward does not by itself mark Export as changed.

## Original baseline

Pin the starting code snapshot, including pre-existing local edits, before changing the product. Keep original captures in a separate directory and reuse them without overwriting them. `revision.base` stays fixed for the whole review; in design-grind it is the start of the grind. `revision.head` advances as proposals change.

Every Before description and capture, including staged comparisons and later-added changes, must describe that original state. Capture newly needed evidence from the pinned original snapshot. An intermediate proposal, the last reviewed head, or an accepted iteration must never become Before. If the original state cannot be captured, disclose that evidence gap instead of substituting a later screenshot. Iteration comparisons may be supplementary context, clearly labeled with their revisions.

Keep the catalog cumulative and reuse the same board and change IDs across rounds. Preserve unchanged reviewed entries, including their screenshot files, crops, and descriptions; recapture and update only revised proposals. Previously accepted items stay accepted when their fingerprints match. Changed proposals retain the old choice and note as outdated evidence and need a fresh user choice. New items start pending. Do not automatically accept a revision just because its predecessor was accepted.

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
- The builder fingerprints each change's evidence and meaning. Changed comparisons reopen prior choices while preserving the old decision and note. Unchanged IDs and evidence keep their choices when supplied with `--decisions` or available in the browser cache. Do not rely on the cache alone when delivering a rebuilt board.

## Review flow

The grouped list locates changes; the purpose line explains the benefit; detail/context views support inspection. Accept/Decline toggles a decision without navigating away; repeating the current choice clears it. Repeating a choice on changed evidence reconfirms it. Notes are independent. Next/previous follows the item order shown in the grouped list within the active filter. There is no bulk acceptance.

Keys: `1` toggle accept, `2` toggle decline, `J/K` or left/right arrows previous/next item, hold `Space` to show before, `N` note, `M` device, `C` full context, `A` arrows, `S` next captured stage, `U` pending. Shortcuts do not run while typing or using native select controls; Tab remains native.

Decisions are cached locally when browser storage is available. **Export** downloads the agent-readable JSON record. Its red dot indicates decisions or notes that differ from the starting or last-exported record. Reverting edits clears it; timestamps and empty note-only entries do not count as changes. The comparison survives reloads when browser storage is available. Switching views does not mark the record changed. The agent reads the exported record.

Decision JSON contains `schemaVersion: 1`, `boardId`, `revision`, and `decisions` keyed by change ID. Each decision has `choice` (`accept`, `decline`, or null), `note`, `fingerprint`, and `updatedAt`. A note is not a third decision state. Use the record to apply selections, revise proposals from notes, and rebuild with the same IDs; verify the selected combination. Do not overwrite the user's source record when making a demonstration board.
