# UI evidence

Reuse supplied media when it meets the revision and matching requirements in `SKILL.md`; otherwise capture it.

- On follow-ups, reuse or recapture `Before` from the exact PR base commit. Never substitute an earlier feature-branch revision or a prior `After`.
- Match viewport, state, data, and action sequence; verify each capture runs the intended revision's build.
- Use video for interaction, motion, or multiple steps; images otherwise. Keep recordings focused and paced for a reviewer, and inspect exported media before publication.
- Frame screenshots with enough surrounding UI to show the changed element's location and purpose, including a page or section landmark and relevant adjacent controls. Prefer viewport- or section-level framing; use tight element crops only when context is unnecessary.
- Keep media untracked through `.git/info/exclude`.

Upload with the bundled `bash scripts/pr-media-upload OWNER/REPO FILE`; if it fails, use the GitHub editor. Use each returned reference exactly as emitted.

Put `Before:` and `After:` media under the best repository template heading. Without a template, add `## Comparison` only when visual evidence benefits from its own section.
