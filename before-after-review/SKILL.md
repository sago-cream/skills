---
name: before-after-review
description: Create a before/after decision board for UI changes with Accept / Decline and independent notes. Use to review proposed changes or apply exported review decisions.
---

# Before / After Review

1. Use the review's original starting state as Before throughout every round. For design-grind, this is the start of the grind. Preserve its code snapshot and captures; obtain missing evidence from that snapshot or disclose the gap.
2. Capture matching Before/After states and build the bundled [decision board](references/board.md). Keep product assets outside this skill and preserve the first board as `original.html`.
3. Keep board and change IDs stable. Rebuild against `original.html` with the latest exported decisions. Preserve unchanged entries and their evidence so accepted choices carry forward; revised entries retain notes and request a fresh decision. The builder checks known Before evidence against the original board.
4. Present the board and read the user's exported decisions. Apply accepted/declined choices, use notes to revise proposals, and verify the resulting combination. Leave pending items undecided. Keep the source export intact, then rebuild for further review as needed.
