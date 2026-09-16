---
name: design
description: Build, polish, and review interfaces, styling, and motion using the project's design system. Use for UI implementation, CSS cleanup, interaction details, and motion review; route dedicated typography audits and Product Design workflows to their separate skills.
---

# Design

Follow the user's scope and the project's existing design system. Identify its styling approach before suggesting changes; use its tokens, components, and libraries rather than introducing another system.

## Load only what the task needs

- For CSS, Sass, Tailwind, CSS-in-JS, or component-style changes, read [styling rules](references/styling.md). Apply these alongside any relevant visual or motion guidance.
- For building or polishing UI, read [interface principles](references/polish.md), then only the relevant detail: [typography](references/typography.md), [surfaces](references/surfaces.md), or [icons](references/icons.md).
- For animation implementation or motion review, read [animations](references/animations.md). Use [motion techniques](references/techniques.md) for implementation recipes and [performance](references/performance.md) for rendering or responsiveness problems.

Project conventions take precedence over reference recipes. Reuse existing token values where they serve the same purpose; preserve intentional hairlines and optical adjustments. Keep changes focused instead of applying every principle to every component.

When reviewing, inspect the actual interface and relevant states. For motion, slow playback when useful. Cite the affected source or screen, explain the user impact, and provide an actionable correction. Never imply an uninspected surface was reviewed.

## Separate specialist workflows

- For a typography-system inventory or consolidation, load [$font-cut](https://github.com/sago-cream/skills/tree/main/font-cut).
- For product research, UX audits, visual exploration, URL cloning, screenshot implementation, prototype sharing, or design validation, load `product-design:index`. Product Design is separate from ordinary frontend implementation.

Load a specialist only when its workflow matches the request. If it is unavailable, name the missing skill briefly and continue with the applicable guidance here; do not install it automatically.
