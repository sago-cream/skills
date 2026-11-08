---
name: before-after-review
description: Build a before/after decision board from UI change evidence and return Accept / Decline choices and independent notes. Use to prepare a review or interpret exported decisions for any calling workflow.
---

# Before / After Review

This skill prepares review artifacts and returns decisions. The calling workflow owns implementation changes and verification.

1. Accept the caller's original baseline, proposed changes, and available evidence. Reuse supplied captures and catalogs; capture screens or resolve a source revision only when needed to fill evidence gaps. Keep the supplied baseline fixed across rounds and disclose missing evidence.
2. Build the bundled [decision board](references/board.md), keeping product assets outside this skill and the first board as `original.html`. When capturing evidence, match Before/After states and cover relevant loading, empty, error, success, disabled, expanded, dialog, and keyboard states, plus viewport and language variants.
3. Keep board and change IDs stable. Rebuild against `original.html` with the latest exported decisions. Preserve unchanged entries and their evidence so accepted choices carry forward; revised entries retain notes and request a fresh decision. The builder checks known Before evidence against the original board.
4. Always serve each initial or revised board over HTTP on localhost, open its full URL in the user's browser, and include a clickable localhost link in the final response. Bind the server to `127.0.0.1`, serve the artifact directory, and verify the URL loads. Keep the server running while review is pending; reuse the same URL across revisions when possible.
5. Match the user's exported JSON to that board, then return choices and notes by change ID to the caller, distinguishing pending or outdated choices by their fingerprints. Keep the source export intact. Rebuild when the caller supplies revised proposals or evidence.
