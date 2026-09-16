# UI evidence

- Use Before/After evidence for changes to existing UI. When no meaningful Before state exists, show the new UI alone; no Before label, placeholder, or explanation is needed unless the repository template asks for it.
- When providing a comparison, capture Before from the exact PR base commit and After from the reviewed head; match viewport, state, data, and action sequence. Verify each capture runs the intended revision's build, including reused media.
- Use video for interaction, motion, or multiple steps; images otherwise. Keep recordings focused and paced so a reviewer can comfortably follow the actions and read on-screen text. Inspect exported media before publication.
- Frame screenshots with enough surrounding UI to show the changed element's location and purpose, including a page or section landmark and relevant adjacent controls. Prefer viewport- or section-level framing; use tight element crops only when context is unnecessary.
- Keep local media untracked through `.git/info/exclude`.
- Upload media with `bash scripts/pr-media-upload OWNER/REPO FILE` (GitHub editor fallback), preserving returned references exactly.
