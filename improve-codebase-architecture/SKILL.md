---
name: improve-codebase-architecture
description: Find and explain module-deepening opportunities, compare interfaces, and carry out requested architecture refactors.
license: MIT
---

# Improve codebase architecture

Reduce the knowledge callers need and concentrate related behavior where it can change together. Favor concrete friction in the requested area over speculative architecture improvements.

## Design vocabulary

- **Module:** behavior behind an interface, at any useful scale.
- **Interface:** everything callers must know, including types, ordering, invariants, errors, configuration, and performance expectations.
- **Depth:** useful behavior available through a small conceptual interface; not a ratio of code lines.
- **Seam:** a place where an implementation can vary. An **adapter** is a concrete implementation at that seam.
- **Locality:** related knowledge, changes, and failures concentrate in one place. **Leverage:** callers gain substantial behavior without learning the internals.

Use these distinctions when helpful, while retaining the repository's domain names and ordinary terms such as service or API where they are accurate.

## Find opportunities

Start with the user's named area. For an open-ended audit, use recent changes to locate recurring friction. Consult relevant existing domain notes and decisions when they affect the candidate; do not create a glossary or ADR collection as a prerequisite. Reopen an existing architectural decision only when concrete friction justifies its cost; state that reason and the original rationale being reconsidered. Do not pad a report with alternatives an applicable decision already ruled out.

Look for callers that coordinate too many internals, pass-through layers, knowledge duplicated across files, or behavior whose tests require reaching through several abstractions. Trace actual callers and dependencies before proposing a change.

Apply the deletion test: if removing a wrapper makes complexity disappear, it may be unnecessary. If removing a module spreads its knowledge across callers, it is earning its place. A smaller file count alone is not evidence of improvement.

## Shape the change

Hide cohesive implementation details behind an interface that makes common use simple. Keep invariants and failure behavior explicit. Avoid introducing a port solely for a hypothetical future implementation; a concrete production/test substitution or another real variant can justify one. Internal test seams need not become public API.

Choose the dependency treatment from the actual ownership and substitution needs:

| Dependency | Interface and ownership | Test strategy |
| --- | --- | --- |
| Pure, in-process | Keep cohesive computation inside the module; no adapter needed merely for isolation. | Exercise behavior through its interface directly. |
| Local-substitutable | Keep storage or I/O details internal when callers need not select the implementation. | Use a faithful local stand-in; check fidelity gaps against the real dependency where relevant. |
| Owned remote service | Keep policy in the module; use a port with an injected transport adapter when transport substitution is useful. | In-memory adapter for policy tests; integration or contract checks for transport, errors, and service behavior. |
| Third-party service | Isolate the external contract behind an adapter when it keeps vendor details out of callers. | Controlled fake/mock for logic; targeted contract or sandbox checks when available and authorized. A mock alone does not validate the vendor contract. |

Test observable behavior through the resulting interface. Retain tests for meaningful contracts and failure cases; remove obsolete implementation-coupled tests only after preserving their useful coverage. Dependency injection and pure computation help when appropriate, but are not universal requirements.

When alternatives materially affect the decision, compare designs that optimize for different goals: the smallest conceptual interface, the simplest common caller, and justified flexibility for real variants. These should expose different tradeoffs, not rename the same design. Show a caller example, hidden responsibilities, dependency strategy, and costs for each; recommend the strongest design or a useful combination. Independent exploration can reduce anchoring when it adds value, without a fixed agent count.

## Deliver and continue

For an architecture audit, produce a focused HTML report with before/after diagrams, affected files, evidence of friction, proposed changes, tradeoffs, test implications, and a ranked recommendation. Read [HTML-REPORT.md](HTML-REPORT.md) when producing that report. For a narrow interface question, answer directly unless a report was requested. It is valid to find no worthwhile refactor.

For implementation already requested, carry the selected or clearly scoped change through implementation and affected checks. Ask only when an unresolved choice materially changes scope or behavior. An audit alone does not authorize a refactor. Record decisions only where the project already maintains them or the user asks; no interview or documentation side effects are required.

Adapted from Matt Pocock's architecture and deep-module skills. See [UPSTREAM.md](UPSTREAM.md) and [LICENSE](LICENSE).
