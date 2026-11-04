---
name: design-grind
description: Use when the user says "design grind" or "design-grind"
---

1. Follow the `design` skill. Address known issues and outstanding PR comments, then run relevant checks before review; skip fixes to implementation being replaced.
2. Inventory and capture every meaningful state in scope, using `userflow-review`. Cover relevant viewport, language, and interaction variants. Verify fixtures against the actual app, label coverage gaps, and preserve baseline captures for before/after comparisons.
3. Use the requested reviewers; otherwise use three flagship models from different providers at high effort. Report unavailable reviewers instead of substituting. Keep reviews independent and read-only, without nested reviewers or concurrent edits.
4. Give reviewers the same audience, context, and complete capture set from one revision. Request scores out of 10 for Typography, Hierarchy, Spacing & density, Color & contrast, Iconography, Consistency & polish, Clarity, and Overall, with state-linked findings, user impact, and suggestions. Withhold the passing target and previous scores.
5. Implement useful suggestions, challenge disagreements with evidence, and record fixed, disputed, or declined findings with reasons. Preserve the design language and working behavior; resist scope creep.
6. Verify changes and interactions, recapture affected states, and request fresh reviews until everyone is satisfied and meets the requested target, defaulting to 9/10 overall each. Record every round's revision, reviewers, scores, and findings; missing scores stay missing. Report stalled reviews and coverage gaps rather than lowering the target or changing reviewers to obtain a pass.
7. Build a before/after board covering the states and each change's reason, with Adopt / Keep original / Discuss choices. Autosave to a durable, agent-readable record with visible save status; preserve decisions across refreshes using stable IDs. Apply the user's selections and verify the combination.
8. Put the reviewer-by-round score table and evidence links in the PR description, before any model/harness footer, rather than a separate comment. Without a PR, include them in the final report.
