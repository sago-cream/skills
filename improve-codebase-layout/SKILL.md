---
name: improve-codebase-layout
description: Review or rearrange a repository's directory layout for easier navigation without changing code behavior or architecture.
---

# Improve Codebase Layout

Design for a newcomer tracing representative tasks from the README and entry points. Group mixed concerns, collapse folders that add no choice, and leave coherent areas flat. Judge names by their full destination path; let folders provide context and rename only names that become wrong or ambiguous.

Only move or rename existing modules. Update references made stale by moves, but do not change behavior or responsibilities, add compatibility layers, or mix in unrelated cleanup.

Present the relevant before-and-after trees, important moves, and real trade-offs.
