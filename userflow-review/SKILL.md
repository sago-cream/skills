---
name: userflow-review
description: Generate interactive user-flow review boards from apps, local code, or captured screens, with a section/state sidebar, per-state settlement, section settle-all, and switchable desktop/mobile previews. Use for review boards and screen-state inventories, rather than flowcharts or prose-only UX audits.
---

# User Flow Review

Use the bundled static viewer; supply only a screen catalog and preview content. The standard-library Python builder produces one offline HTML file with identical bytes for identical inputs. Change the viewer only when the user requests it.

## Prepare

Read the referenced app, chat, repo, or captures. Group distinct UI surfaces into sections and meaningful states within each. Avoid duplicating a state just because several journeys reach it. Prefer actual product components/styles with synthetic, deterministic fixtures.

Read [the catalog contract](references/manifest.md). Copy [the starter](assets/starter/manifest.json) with its `screens/` folder into the task workspace, then replace its catalog and previews. Keep product-specific files outside the skill. Generating a board does not authorize changing the product or publishing it.

## Build

```sh
python3 <skill-dir>/scripts/build_board.py review/manifest.json --output <deliverable-dir>/userflow-review.html
```

Only for compiled apps needing shared embedded assets or fixture callbacks, read [the adapter contract](references/renderer.md).

## Verify and deliver

For new content or adapters, inspect every state in both device modes for readiness and fixture errors. Check representative dialogs/errors and a narrow viewport. For viewer changes, additionally verify selection, device sizing, settlement/reopening, persistence, deep links, keyboard access, and draft preservation across sidebar/device toggles.

Save a representative screenshot, open the result, and provide the board link. Identify static or unavailable previews. A requested skill test must generate and inspect a board through the builder.
