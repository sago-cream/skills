---
name: before-after-review
description: Create a before/after decision board for UI changes with Accept / Decline and independent notes. Use to review proposed changes or apply exported review decisions.
---

# Before / After Review

1. Keep Before at the review's starting state, or the start of design-grind. Reference the existing commit that represents it: HEAD, a previous commit, or main as appropriate. Resolve moving branches once; retain a pre-existing local diff only if needed to reproduce that starting state. Keep the original captures and disclose missing evidence.
2. Capture matching Before/After states, including relevant loading, empty, error, success, disabled, expanded, dialog, and keyboard states, plus viewport and language variants. Build the bundled [decision board](references/board.md), keeping product assets outside this skill and the first board as `original.html`.
3. Keep board and change IDs stable. Rebuild against `original.html` with the latest exported decisions. Preserve unchanged entries and their evidence so accepted choices carry forward; revised entries retain notes and request a fresh decision. The builder checks known Before evidence against the original board.
4. Present the board and read the user's exported decisions. Apply accepted/declined choices, use notes to revise proposals, and verify the resulting combination. Leave pending items undecided. Keep the source export intact, then rebuild for further review as needed.
