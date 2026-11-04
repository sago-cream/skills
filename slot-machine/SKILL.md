---
name: slot-machine
description: Use when the user says "slot machine"
---

1. Hunt wins across aspects such as UI, architecture, behavior, reliability, performance, resource use, docs, and tests. These are examples, not boundaries. Name their concrete benefits and skip nitpicks or changes justified only by hypothetical future needs.
2. Match evidence to the claim: reproduce incorrect behavior, measure performance against a baseline, or establish that code, instructions, or tests are obsolete or redundant.
3. Implement and verify the intended change and affected behavior. Build tools to close verification gaps where possible; report any gaps that remain.
4. Give independently shippable fixes separate PRs.
5. Treat pending PRs as landed when looking for further improvements. Return to step 1 until a complete pass finds no further meaningful candidate.
6. Report each improvement's benefit and verification.
