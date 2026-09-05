# Selected UI techniques

Use these as starting points when the product has no established equivalent. Preserve its styling system and installed libraries; do not add a dependency for one effect. Read the section relevant to the component.

## Easing and exits

Start with a responsive ease-out for controls entering or responding to input, and ease-in-out for a visible element changing position:

```css
--ease-out-ui: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out-ui: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Project curves take precedence over these starting points. Small overlays often need about 125–250ms. Prefer a shorter, quieter exit when the user's attention has moved on. A toast may need only a small fixed offset; a drawer should retain its full spatial direction. No universal easing or duration fits every entrance and exit. Frequent keyboard interactions can be immediate.

## Press feedback

A scale near 0.97 is a useful default for ordinary buttons, not a requirement for every pressable surface:

```css
.button {
  transition: transform 140ms var(--ease-out-ui);
}
.button:active:not(:disabled) {
  transform: scale(0.97);
}
@media (prefers-reduced-motion: reduce) {
  .button { transition: none; }
  .button:active:not(:disabled) { transform: none; }
}
```

Retain the product's static pressed, focus, and disabled cues. Prefer color or shadow for controls where scale would blur text, distort a large surface, or distract during frequent use. Test release mid-press rather than just the completed animation.

## Stable icon swaps

Reserve the icon footprint; overlap outgoing and incoming glyphs so labels do not move. For a simple crossfade, CSS is enough:

```css
.icon-slot { display: inline-grid; inline-size: 1.25em; block-size: 1.25em; }
.icon-slot > svg {
  grid-area: 1 / 1;
  inline-size: 100%; block-size: 100%;
  transition: opacity 150ms var(--ease-out-ui), transform 150ms var(--ease-out-ui);
}
.icon-slot > [data-active="false"] { opacity: 0; transform: scale(0.9); }
.icon-slot > [data-active="true"] { opacity: 1; transform: scale(1); }
@media (prefers-reduced-motion: reduce) {
  .icon-slot > svg { transition: none; transform: none; }
}
```

Try a slight blur only if an overlapping transition remains visually awkward. Avoid bounce for routine state changes. Update the control's semantic state separately; decorative glyphs should not duplicate accessible labels. Check icons at the smallest rendered size, matching stroke weight to neighboring text and using native grid sizes when practical.

## Overlay geometry and tooltip groups

Scale anchored popovers from their trigger or attachment point, using the component library's documented transform-origin variable where available. Centered dialogs can retain a centered origin. Near-full starting scale plus opacity is a calmer default than growing a panel from zero.

Delay the first tooltip to prevent accidental activation, then skip the repeated delay and unnecessary entrance motion when moving among neighboring tooltips. Preserve keyboard focus behavior. Check rapid open/close and pointer travel between the trigger and overlay, including any gap where hover could be lost.

## Diagnosing rendering stutter

Compare normal playback with slowed playback to separate a timing problem from dropped frames. Inspect style recalculation, layout, and paint on the affected interaction. During dragging, investigate inherited CSS custom-property updates on a large ancestor: they can broaden style invalidation. Compare a transform update localized to the moving element, or a suitably scoped property, before changing the implementation.

Prefer transform and opacity when they express the effect, but do not assume all uses are composited or all library shorthand is slow. Blur and clipping can be expensive depending on size, browser, and implementation. Add a narrowly scoped will-change hint only after a demonstrated benefit; unnecessary layers cost memory. For gestures, check the actual touch device when available and state when it was not tested.
