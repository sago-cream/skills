---
name: before-after-review
description: Create a before/after decision board for UI changes with Accept / Decline and independent notes. Use to review proposed changes or apply exported review decisions.
---

# Before / After Review

Review existing UI changes independently of how they were proposed. No scored reviews or design-grind session is required.

1. Establish the changes and baseline from the user's screenshots, revisions, or current work. Reuse an existing change catalog and captures when supplied. If capturing during implementation, save the before states before editing; otherwise capture the baseline and proposed revisions separately while preserving current work.
2. Capture matching before/after states at the same viewport, language, and relevant application state. Cover affected loading, empty, error, success, disabled, expanded, dialog, and keyboard states where meaningful. Use genuine captures; describe missing evidence instead of inventing it.
3. Catalog each independent accept/decline decision with a stable ID, brief reason, and before/after descriptions. Disclose coupled changes or screenshot limitations in `context`; use captured stages for multiple views of the same decision.
4. Build the bundled [decision board](references/board.md) from the catalog and screenshots. Keep the viewer unchanged across tasks, and keep product assets and decision records outside this skill. The builder produces one offline HTML file with embedded screenshots.
5. Present the board for review. Accept / Decline and notes are independent. If no exported decisions were supplied, leave the board and catalog available for the user to review and export; do not invent selections.
6. Read the exported JSON and match its board ID, revision, change IDs, and fingerprints to the reviewed catalog. Rebuild and request a fresh choice for changed evidence. When applying the user's selections, retain accepted changes, undo only the proposed changes that were declined, and leave pending changes undecided. Use notes to revise proposals without treating a note as acceptance. Verify the selected combination, and reuse stable IDs when rebuilding.
