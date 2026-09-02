---
name: sago-share
description: Publish a local HTML file or static prototype to share.hsichen.dev through the sago-cream/share-prototypes repository.
---

# Sago Share

Interpret `$sago-share` as “publish this.” Use a supplied path; otherwise infer the current prototype. Ask only if the source or slug is genuinely ambiguous.

- Target `https://github.com/sago-cream/share-prototypes.git`. Find its local checkout by matching a Git remote rather than assuming a folder path; if none exists, clone it into a temporary directory. Publish into `<checkout>/<slug>/`.
- For one self-contained HTML file, copy it as `index.html`. For a static directory, copy only deployable files. Build with Bun first when needed; do not publish `.env`, `.git`, dependencies, or server-only output.
- Preserve unrelated work and refuse to overwrite an existing slug unless the user clearly intends an update.
- Add or update the prototype link in the repository root `index.html`.
- Check the result locally, then commit with `feat: share <slug> prototype` and push `main` to `sago-cream/share-prototypes`.
- Verify `https://share.hsichen.dev/<slug>` returns successfully before reporting it as shared. Do not silently substitute another domain.

Return the URL and mention any unresolved deployment or DNS issue.
