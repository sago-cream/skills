# Optional app adapter

Use this only when a compiled app needs shared embedded resources or fixture callbacks. Ordinary HTML/image file catalogs need no adapter.

```sh
python3 <skill-dir>/scripts/build_board.py manifest.json --renderer renderer.js --resources resources.json --output board.html
```

With `--renderer`, states may carry arbitrary fixture configuration instead of preview fields. The JavaScript file defines:

```js
function renderPreview(state, variant, instance) {
  // BOARD.resources is JSON passed through --resources.
  // variant: {id: 'desktop'|'mobile', width, height}
  // state: manifest state, including product-specific config
  // Return a full HTML document with inline assets and fixtures.
}
```

Embed compiled assets once in resources. The renderer is trusted authoring code, not extracted page instructions. Escape literal closing script tags in the renderer source. Set `"readyMessages": true` in the manifest when fixture seeding must finish before readiness; otherwise iframe load marks readiness. With ready messages, post:

```js
parent.postMessage({review: true, screen: state.id, instance,
  type: 'ready'}, '*');
```

Types: `ready`, `error` (`text`), `confirmation` (`text`), `reset`, `navigate` (`state` or `action`), and `language` (`value`). Language lets existing product controls update both previews without a board selector. State `action` values map existing fixture navigation. Messages require the matching iframe source, current screen ID, and render instance, rejecting stale callbacks.

Iframes use `sandbox="allow-scripts allow-forms"` without same-origin permission. The viewer injects a CSP blocking network and external assets. Embed scripts/styles inline and images as data URLs. Fixtures stub all APIs locally. Keep adapters and product-specific resources in the task workspace, outside the reusable skill.
