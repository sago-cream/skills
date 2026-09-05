---
name: ui-polish
description: Refine UI visual details and motion when building or polishing components, or reviewing why an interaction feels off.
license: MIT
---

# UI polish

Apply the details relevant to the requested component. Follow the product's existing visual language, tokens, styling system, and motion libraries. Treat the guidance below as design judgment, not a checklist that requires changes everywhere.

## Motion and feedback

- Motion should explain a state change, preserve spatial context, or acknowledge input. Frequent interactions need less motion; keyboard navigation and repeated controls should feel immediate. Use staged or staggered entrances only when the sequence adds meaning, without delaying interaction.
- Match timing to travel and frequency. Rough starting points are 100–160ms for press feedback, 125–250ms for small overlays, and longer for large drawers. Prefer a responsive ease-out for entrances, smooth acceleration/deceleration for repositioning, and shorter, quieter exits when spatial meaning is preserved. Reuse project curves; otherwise start with the easing examples in the optional reference and tune by watching the result.
- Interactive transitions should reverse from their current state when intent changes. CSS transitions suit simple state changes; springs suit gestures and momentum; keyframes suit staged sequences. Avoid replaying default-state entrances on every mount.
- Anchor popover transforms to the trigger; centered dialogs can stay centered. Small movement or a near-full starting scale usually feels calmer than growing a panel from nothing. Preserve the direction of travel when dismissing a drawer.
- For ordinary pointer-pressed buttons, prefer a subtle scale around 0.97 with 100–160ms feedback; use color or shadow when scaling would distract or distort content. Keep icon swaps in a stable footprint and prefer a short crossfade with restrained scale. Use blur only to smooth a visibly awkward transition, and avoid bounce in routine controls.
- Delay the first tooltip to avoid accidental activation, then let neighboring tooltips appear promptly. For dragging, preserve pointer capture, handle cancellation, ignore extra pointers, and consider both distance and release velocity. Dampen movement past a boundary when that communicates resistance.
- Honor reduced motion and retain a static cue for state changes. Gate decorative hover effects to devices that support hover; essential controls must remain available to touch and keyboard users.

## Visual detail

- Closely nested rounded surfaces should look concentric: outer radius is approximately inner radius plus the gap. Widely separated surfaces can use independent radii. Adjust asymmetric icons and icon/text spacing optically when geometric centering looks wrong.
- Use subtle layered shadows for elevation; retain borders that communicate structure, selection, or focus. Add an inset image outline only where separation from the background helps, using the established palette and theme.
- Keep the type system. Consider balanced headings and better paragraph wrapping where awkward line breaks are visible. Tabular numerals stabilize changing digits; reserve enough width when digit count changes. Judge font smoothing at actual size rather than applying it as a universal fix.
- Match icon weight and size to neighboring text and the existing icon family. Use currentColor for monochrome state styling; preserve deliberate multicolor artwork. Mirror direction-dependent icons for RTL, not logos or media controls. Inspect icons at their smallest rendered size and favor the icon set's native grid or simpler glyphs over shrinking detailed artwork. Label icon-only controls and hide decorative glyphs from assistive technology.
- Make small controls easy to target without overlapping adjacent hit areas. Around 44px is a useful touch target starting point; account for density and platform conventions. Preserve visible focus and disabled states.

## Implementation and review

Transition only intended properties. Prefer transform and opacity when they express the effect; measure expensive layout, blur, or clipping when relevant. Do not assume a library or property is always GPU accelerated. Add will-change only for a demonstrated rendering issue.

Inspect changed states at normal speed; slow playback when diagnosing motion. Check interruption, reduced motion, and input modes affected by the change. In a review, tie each finding to a concrete location and user-visible consequence, distinguish taste from defects, and say what was unverified. Keep the response proportional to the request.

For implementation or diagnosis of these details, read only the relevant section of [techniques.md](techniques.md): easing, press feedback, icon swaps, overlay geometry, or rendering stutter.
