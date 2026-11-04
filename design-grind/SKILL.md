---
name: design-grind
description: Use when the user says "design grind" or "design-grind", or asks to iteratively improve an interface through independent scored reviews.
---

# Design Grind

## Prepare

1. Establish the product scope, audience, and existing design system. Follow the available `design` skill. Address known issues and outstanding PR comments, then run relevant checks before reviewers see the implementation. Skip fixes to implementation the user wants replaced.
2. Inventory every meaningful screen and state in scope, using `userflow-review` when available. Include applicable loading, empty, error, success, disabled, expanded, dialog, and keyboard states, with relevant viewport and language variants. Reuse state IDs; do not duplicate states shared by several journeys.
3. Inspect the actual interface and capture every cataloged state before editing. Verify fixtures against the real app; label inaccessible states and fixture gaps. Preserve these baseline captures for before/after comparisons. Screenshots establish appearance; inspect interactions to verify behavior.

## Review and improve

4. Use the user's reviewer selection. Otherwise use three flagship models from different providers at high reasoning effort. Resolve available models with `orchestrator_capabilities` in T3 Code and start parallel reviews with `delegate_task`; elsewhere use the harness's supported subagents. Report unavailable reviewers instead of substituting.
5. Give each reviewer the same audience, task context, state catalog, and revision-pinned captures. Keep reviews independent and read-only, with no nested reviewers; do not edit while they run. Ask them to inspect every state against **Typography, Hierarchy, Spacing & density, Color & contrast, Iconography, Consistency & polish, Clarity, and Overall**. Request scores out of 10 for each category and overall, plus state-linked findings, user impact, and actionable suggestions. Keep the passing target and previous scores out of reviewer briefs.
6. Assess the findings yourself. Implement useful suggestions; challenge disagreements with evidence and resist scope creep. Track findings with stable IDs, marking them fixed, disputed, or declined with reasons. Preserve the existing design language and working behavior.
7. Verify changes and recapture affected states. Start fresh reviews on the updated revision with the complete current capture set and unresolved findings. Each full review pass counts as a round. Record every round's revision, reviewer, scores, findings, and decisions; write `no score` when one is missing, never invent it. An unavailable or uninspected state remains a coverage gap.
8. Continue until every reviewer is satisfied and meets the requested target; default to 9/10 overall from each. If the target remains unmet without actionable feedback, report the stall and disagreements. Do not lower the target or rotate reviewers to obtain a passing score.

## Human review and delivery

9. Build a board covering the state catalog, with matching before/after views and each change's reason. Give each change **Adopt / Keep original / Discuss** choices. Autosave decisions to a durable record the agent can retrieve, show save success or failure, and preserve choices by stable change ID when refreshing the board. Local browser storage alone must not be described as shared saving. Apply the user's selections and verify the selected combination.
10. If publishing a PR, edit its description to include a reviewer-by-round score table and links to the detailed record and before/after evidence; place the review section before any model/harness footer. Do not post a separate results comment. Without a PR, include the results in the final report. Identify coverage and verification gaps; do not present them as passes.
