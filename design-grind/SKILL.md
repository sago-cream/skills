---
name: design-grind
description: Use when the user says "design grind" or "design-grind"
---

1. Record the starting revision and capture every meaningful state before editing, such as loading, empty, error, success, disabled, expanded, dialog, and keyboard states, plus relevant viewport and language variants. Keep the original captures for the final comparison.
2. Delegate read-only reviews using the saved reviewer settings in `~/.config/design-grind/reviewers.json`, it stores a `reviewers` list of `{model, effort}`. If missing or unconfigured, ask the user for reviewer model/effort pairs, and save them. When asked to change, update this local file instead of the skill.
3. Supply screenshots, request scores out of 10 for Typography, Hierarchy, Spacing & density, Color & contrast, Iconography, Consistency & polish, Clarity, and Overall, with findings and suggestions. Withhold the passing target and previous scores.
4. Implement useful suggestions, verify changes, recapture affected states, and request fresh reviews until meeting the requested target, defaulting to 9/10 overall each.
5. Invoke `$before-after-review` ([skill instructions](../before-after-review/SKILL.md)) with the original captures and current result. It owns the decision board and subsequent user selections.
