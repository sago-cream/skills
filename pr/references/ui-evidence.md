# UI evidence

- Capture `Before:` from the exact PR base commit and `After:` from the reviewed head. Reuse supplied or previous media only when it matches those revisions.
- Match viewport, state, data, and actions. Use video for behavior or motion; images otherwise.
- Include enough surrounding UI to locate and understand the change, and inspect the exported media.
- Upload both sides with `bash scripts/pr-media-upload OWNER/REPO FILE` (GitHub editor fallback), preserving returned references exactly. Place them under the best PR template heading; never publish with either side missing. Keep local media untracked.
