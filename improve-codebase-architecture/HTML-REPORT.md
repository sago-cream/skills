# Architecture report

Use a standalone HTML file in the task's artifact directory, outside repository source unless requested there. Inline CSS and SVG make the report portable; choose another diagram renderer only when it improves clarity. Show or link the completed artifact using the host's supported preview.

For each worthwhile candidate, include:

- A concrete responsibility and the affected source paths.
- Current friction, grounded in callers, dependencies, change history, or tests.
- Before/after diagrams showing what callers know and what the proposed interface hides. Keep corresponding elements recognizable between diagrams.
- The proposed change, behavioral constraints, tradeoffs, and testing implications.
- Recommendation strength and any conflict with an existing architectural decision.

Rank candidates and explain the strongest recommendation. When none justify their cost, say so. Avoid speculative filler.

Keep diagrams legible at ordinary screen widths, with labels and a legend where needed. A call graph, request sequence, or simple nested boxes can each work; choose what explains the candidate. Use the vocabulary in SKILL.md without replacing accurate domain terms. Verify labels fit and diagrams match the code evidence. State limitations when a relevant runtime path or behavior could not be checked.
