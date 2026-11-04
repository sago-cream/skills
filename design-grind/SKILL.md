---
name: design-grind
description: Use when the user says "design grind" or "design-grind"
---

1. Read `~/.config/design-grind/reviewers.json`, storing a `reviewers` list of `{provider, model, effort}`. If missing or unconfigured, resolve available choices, ask the user for reviewer model/effort pairs, and save them before review. Reuse later; when asked to change reviewers, update this local file instead of the skill. Never commit it or silently substitute unavailable settings.
2. Capture every meaningful state like loading, empty, error, success, disabled, expanded, dialog, and keyboard states, plus relevant viewport and language variants. Preserve them for before/after comparisons.
3. Delegate read-only reviews in parallel using the saved reviewer settings.
4. Request scores out of 10 for Typography, Hierarchy, Spacing & density, Color & contrast, Iconography, Consistency & polish, Clarity, and Overall, with findings and suggestions. Withhold the passing target and previous scores.
5. Implement useful suggestions.
6. Verify changes and interactions, recapture affected states, and request fresh reviews with updated captures and unresolved findings until everyone is satisfied and meets the requested target, defaulting to 9/10 overall each. Count full review passes as rounds; record each round's revision, reviewers, scores, and findings. Missing scores stay missing; uninspected states and unverified behavior remain gaps, never passes.
7. Build a before/after board covering the states and each change's reason, with Adopt / Keep original / Discuss choices. Autosave to a durable, agent-readable record with visible save status; preserve decisions across refreshes using stable IDs. Apply the user's selections and verify the combination.
8. Put the reviewer-by-round score table and evidence links in the PR description, before any model/harness footer, rather than a separate comment. Without a PR, include them in the final report.
