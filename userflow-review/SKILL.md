---
name: userflow-review
description: Generate interactive user-flow review boards from apps, local code, or captured screens, with a section/state sidebar, per-state settlement, section settle-all, and switchable desktop/mobile previews. Use for review boards and screen-state inventories, rather than flowcharts or prose-only UX audits.
---

# User Flow Review

Use the bundled static viewer. Agents supply screen content and a catalog; they do not recreate the board UI, navigation, styling, or settlement logic. The Python standard-library builder packs everything into one offline HTML file. Identical inputs produce identical output bytes.

## Author the content

Read the referenced chat, repo, existing board, or captures. Group distinct UI surfaces into sections, then list meaningful states within each: default, empty, loading, validation, errors, dialogs, and recovery as applicable. Avoid duplicating states reached through several journeys. Use stable board, section, and state IDs when refreshing an existing review; preserve explicitly recorded settlement decisions.

Keep product-specific content in the task workspace:

```text
review/
  manifest.json
  screens/
    workspace.html
    error-desktop.png
    error-mobile.png
```

Read [the catalog contract](references/manifest.md). Copy [the starter](assets/starter/manifest.json) with its `screens/` folder for a small working example, or write the catalog directly. Use `file` for a responsive standalone HTML screen, or separate desktop/mobile `file` entries for paired HTML or screenshots. The builder resolves paths relative to the catalog and embeds their contents; no file references remain in the output.

Prefer the product's actual components/styles with synthetic, deterministic fixtures. HTML previews must inline their scripts/styles and use data URLs for images; the builder does not crawl dependencies. Do not substitute scaled desktop captures for mobile captures. If a capture is missing, supply an explicit unavailable screen. Record source revision or capture date in the manifest. A board request does not authorize changing the product or publishing the board.

## Pack

```sh
python3 <skill-dir>/scripts/build_board.py review/manifest.json --output <deliverable-dir>/userflow-review.html
```

The fixed shell owns the white-on-black chrome, compact FlowView sidebar header, section/state navigation, row settlement, settle-all, breadcrumb, and destination-device icon. Desktop fills the pane; mobile is centered without a device label. It preserves review choices and running previews across sidebar/device toggles. Keep all review controls in this shell; do not add board controls to screen files. Change the bundled shell only when the user requests a viewer change.

For an interactive compiled app that needs shared assets or fixture callbacks, read [the optional app adapter contract](references/renderer.md) and add `--renderer renderer.js --resources resources.json`. Keep adapters and fixtures outside the skill. This is an advanced path; ordinary file-based catalogs need no renderer.

## Verify and deliver

Use available browser tools to inspect representative default, modal, error/recovery states and a narrow viewport. For new fixtures or adapters, walk all catalog states in both device modes and verify readiness without errors. Verify selection, device switching, desktop fill, mobile centering, settlement/reopening, reload persistence, deep links, and keyboard access. If changing the shell, additionally inspect header/row hover, focus exclusion for inactive previews, and draft preservation across toggles.

Use synthetic data and sandboxed previews; block real API traffic and keep fixtures in memory. Identify static or unavailable previews in the delivery message. Save a representative screenshot, open the result in the app, and report the skill name and board link. For a requested skill test, generate a board through the builder and record observed results, not just frontmatter validation.
