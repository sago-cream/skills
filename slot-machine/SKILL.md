---
name: slot-machine
description: Find and implement meaningful codebase improvements. Use when the user says "slot machine" or "slot-machine", even as the entire message, or asks for a broad hunt for worthwhile improvements.
---

# Slot Machine

Explore the requested codebase and implement beneficial improvements you discover. A bare "slot machine" targets the current project.

- Search broadly across behavior, reliability, performance, resource use, prompts, docs, and tests. These are starting points, not boundaries. Recent changes have no special priority.
- Trace real usage and surrounding code before selecting a candidate. Name its concrete benefit; discard nitpicks, preference-only churn, and changes justified only by hypothetical future needs.
- Match evidence to the claim: reproduce incorrect behavior, measure performance against a baseline, or establish that code, instructions, or tests are obsolete or redundant. Test count and diff size are not benefits by themselves.
- Implement qualifying improvements without asking the user to select routine fixes. Keep each change focused on its benefit and preserve unrelated behavior. Run the relevant checks; investigate failures and correct regressions before treating the change as finished. Add tests for meaningful behavior gaps, not to mirror the implementation.
- Commit in meaningful Conventional Commit batches. When publishing, give independently shippable fixes separate PRs; stack only dependencies. Use the available PR workflow for requested publication.
- Continue exploring until a complete pass finds no further meaningful candidate. Do not manufacture changes to meet a quota. If verification blocks progress, report what remains unverified rather than claiming completion.

Report each improvement's benefit and verification. Separate measured results from expected gains and identify any remaining verification gaps.
