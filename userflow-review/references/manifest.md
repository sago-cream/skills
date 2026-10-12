# Catalog contract

Start from [the bundled manifest](../assets/starter/manifest.json). Its `groups` are UI sections; each contains `states`. Do not create separate states for device size alone.

| Field | Contract |
| --- | --- |
| Board `id`, `title`, `groups` | Required. Use a stable board ID. |
| Group `id`, `title`, `states` | Required; group IDs are unique. |
| State `id`, `name` | Required; state IDs are globally unique. |
| `initialState` | Optional existing state ID. |
| `viewports` | Optional desktop/mobile `{width, height}`; integers 240–4096. Defaults: desktop 1280×900, mobile 390×844. |
| `sourceRevision` or `captureDate` | Optional source provenance; metadata is not displayed in the chrome. |
| State `settled: true` | Seeds explicitly recorded decisions on first opening; saved browser choices take precedence. |

IDs use letters, numbers, `_`, or `-`. Each state uses exactly one preview arrangement:

- Responsive shared file: `file: "screens/workspace.html"`.
- Paired files: `desktop: {file: "screens/desktop.html"}` and `mobile: {file: "screens/mobile.html"}`. PNG, JPEG, WebP, and GIF also work; add descriptive `alt` to image previews (defaults to the state name).
- Inline content: replace any `file` field with `html: "<!doctype html>..."`.

Paths resolve relative to the manifest and are replaced with embedded content. HTML must be a complete standalone document with inline scripts/styles and data-URL images. The builder does not crawl asset dependencies; sandboxed previews block network and external assets.

Screenshots fit viewport width and scroll vertically. Match configured dimensions to actual captures. Do not substitute a scaled desktop capture for mobile; use explicit unavailable HTML when a capture is missing. Desktop width is the minimum logical width and its height fills the pane; mobile retains its dimensions and scales down to fit.

Retain IDs when refreshing a review to preserve browser settlement, expanded sections, sidebar collapse, device mode, and selection. New states start unsettled; obsolete stored IDs are ignored. Hash deep links override saved selection. Use a new board ID for an independent review.
