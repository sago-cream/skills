# Screen catalog

```json
{
  "id": "my-product-flow-review",
  "title": "My product",
  "sourceRevision": "abc123",
  "initialState": "workspace-default",
  "viewports": {
    "desktop": {"width": 1280, "height": 900},
    "mobile": {"width": 390, "height": 844}
  },
  "groups": [{
    "id": "workspace",
    "title": "Workspace",
    "states": [
      {"id": "workspace-default", "name": "With subscriptions", "file": "screens/workspace.html"},
      {"id": "workspace-error", "name": "Connection error",
       "desktop": {"file": "screens/error-desktop.png", "alt": "Workspace showing a connection error"},
       "mobile": {"file": "screens/error-mobile.png", "alt": "Mobile workspace showing a connection error"}}
    ]
  }]
}
```

Board, section, and state IDs use letters, numbers, `_`, or `-`. State IDs are globally unique. Each state uses exactly one of:

- Shared responsive preview: `file: "screens/state.html"`.
- Paired previews: `desktop: {file: "screens/state-desktop.html"}` and `mobile: {file: "screens/state-mobile.html"}`. Screenshots use the same shape with PNG, JPEG, WebP, or GIF files. Add descriptive `alt`; it defaults to the state name.
- Inline HTML: replace any `file` field with `html: "<!doctype html>..."`.

Paths resolve relative to the manifest. HTML must be a complete standalone document with inline assets. Referenced CSS, scripts, fonts, and images are not automatically bundled. Screenshots become embedded image documents, fit to viewport width and scroll vertically. Configure viewport dimensions to match the captures; do not claim a desktop screenshot is a mobile capture. Pair a missing capture with explicit unavailable HTML rather than an invented screen.

Do not create separate states for device size alone. The viewer switches devices for the selected state. Desktop width is the minimum logical width; desktop height adapts to fill the pane. Mobile uses its configured width/height, scaled down as needed. Defaults are 1280×900 desktop and 390×844 mobile. Dimensions must be integer values from 240 to 4096.

Optional `settled: true` seeds explicitly known decisions on first opening; browser choices then take precedence. Unknown stored IDs are ignored, and new states start unsettled. Local storage is namespaced by board ID and contains settled IDs, expanded sections, sidebar collapse, device view, and selected state. URL hashes override saved selection. Retain IDs for a refreshed review; change the board ID for an independent review.

`title`, source revision, and capture-date metadata document the catalog without adding board chrome. Do not include credentials, private data, local filesystem paths in inline content, or private URLs in deliverables. Iframes are sandboxed, and their CSP blocks network and external assets.
