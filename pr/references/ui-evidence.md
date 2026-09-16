# UI evidence

- Capture `Before:` from the exact PR base commit and `After:` from the reviewed head. Reuse supplied or previous media only when it matches those revisions. On follow-ups, never substitute an earlier feature-branch revision or a prior `After` as `Before`.
- Match viewport, state, data, and action sequence; verify each capture runs the intended revision's build.
- Use video for interaction, motion, or multiple steps; images otherwise. Keep recordings focused and paced so a reviewer can comfortably follow the actions and read on-screen text. Inspect exported media before publication.
- Frame screenshots with enough surrounding UI to show the changed element's location and purpose, including a page or section landmark and relevant adjacent controls. Prefer viewport- or section-level framing; use tight element crops only when context is unnecessary.
- Keep local media untracked through `.git/info/exclude`.
- Upload both sides with `bash scripts/pr-media-upload OWNER/REPO FILE` (GitHub editor fallback), preserving returned references exactly. Never publish with either side missing.
- Put `Before:` and `After:` media under the best repository template heading. Without a template, add `## Comparison` only when visual evidence benefits from its own section.
