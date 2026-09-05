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

Start with the user's named area. For an open-ended audit, use recent changes to locate recurring friction. Consult relevant existing domain notes and decisions when they affect the candidate; do not create a glossary or ADR collection as a prerequisite.

Look for callers that coordinate too many internals, pass-through layers, knowledge duplicated across files, or behavior whose tests require reaching through several abstractions. Trace actual callers and dependencies before proposing a change.

Apply the deletion test: if removing a wrapper makes complexity disappear, it may be unnecessary. If removing a module spreads its knowledge across callers, it is earning its place. A smaller file count alone is not evidence of improvement.

## Shape the change

Hide cohesive implementation details behind an interface that makes common use simple. Keep invariants and failure behavior explicit. Avoid introducing a port solely for a hypothetical future implementation; a concrete production/test substitution or another real variant can justify one. Internal test seams need not become public API.

Account for dependencies:

- Pure, in-process behavior can often be consolidated and exercised directly.
- A faithful local stand-in can support integration tests; check differences that matter to the behavior.
- Owned remote services still have transport, failure, and deployment constraints. A port can separate policy from transport when that variation is useful.
- Third-party dependencies may need an injected adapter or mock; mocks do not establish the external contract by themselves.

Test observable behavior through the resulting interface. Retain tests for meaningful contracts and failure cases; remove obsolete implementation-coupled tests only after preserving their useful coverage. Dependency injection and pure computation help when appropriate, but are not universal requirements.

When alternatives materially affect the decision, compare contrasting interfaces with a caller example, hidden responsibilities, dependency strategy, and tradeoffs. Use parallel exploration only when it adds value; there is no fixed agent count.

## Deliver and continue

For an architecture audit, produce a focused HTML report with before/after diagrams, affected files, evidence of friction, proposed changes, tradeoffs, test implications, and a ranked recommendation. Read [HTML-REPORT.md](HTML-REPORT.md) when producing that report. For a narrow interface question, answer directly unless a report was requested. It is valid to find no worthwhile refactor.

For implementation already requested, carry the selected or clearly scoped change through implementation and affected checks. Ask only when an unresolved choice materially changes scope or behavior. An audit alone does not authorize a refactor. Record decisions only where the project already maintains them or the user asks; no interview or documentation side effects are required.

Adapted from Matt Pocock's architecture and deep-module skills. See [UPSTREAM.md](UPSTREAM.md) and [LICENSE](LICENSE).
