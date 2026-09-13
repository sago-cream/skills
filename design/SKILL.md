---
name: design
description: Route interface design, product design, typography, CSS polish, and motion work to the smallest useful set of installed skills. Use when a design request may span several specialties or the user should not need to remember which design skill to invoke.
---

# Design router

Choose routes from the request before loading any dependency. Load only the installed skills that have concrete work to do.

| Request | Route |
| --- | --- |
| Product research, UX audit, visual exploration, URL cloning, screenshot implementation, prototype sharing, or design validation | `product-design:index` |
| Name a described motion or animation effect | `$animation-vocabulary` |
| Audit or reduce a typography system | `$font-cut` |
| Review existing animation or motion code | `$review-animations` |
| Refine UI motion, interaction behavior, and visual details | `$ui-polish` |
| Change CSS or CSS-like styling code | `$unslop-css` in addition to any relevant route above |

For broad interface work, combine only the routes that match a concrete part of the task. Do not load the whole group by default. Product Design is for research, exploration, cloning, audits, and validation, not ordinary frontend implementation.

When routes overlap:

1. Follow the user's instructions and the project's established design system.
2. Prefer the narrow specialist for its job: `$font-cut` for typography-system reduction, `$review-animations` for motion review, and `$animation-vocabulary` for naming.
3. Use `$ui-polish` for motion decisions, interaction behavior, and static interface detail.
4. Apply `$unslop-css` whenever the implementation changes styling code.

Treat a selected route as an instruction to load and follow that installed skill's current `SKILL.md`. Do not copy or reconstruct its rules here.

## Optional dependencies

- [`product-design:index`](https://learn.chatgpt.com/docs/plugins)
- [`animation-vocabulary`](https://github.com/emilkowalski/skills/tree/main/skills/animation-vocabulary)
- [`font-cut`](https://github.com/sago-cream/skills/tree/main/font-cut)
- [`review-animations`](https://github.com/emilkowalski/skills/tree/main/skills/review-animations)
- [`ui-polish`](https://github.com/sago-cream/skills/tree/main/ui-polish)
- [`unslop-css`](https://github.com/sago-cream/skills)

If a selected dependency is missing, skip it and give one short sentence naming the missing skill and its source link. Do not install anything unless the user asks.
