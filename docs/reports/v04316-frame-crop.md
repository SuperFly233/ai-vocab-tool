# v0.43.16: Complete Viewport Crop

The requested crop is the whole game/video viewport, not a small character bounding box. Keep scenery, dialogue and in-game HUD; remove external browser/window chrome, black borders and surrounding streaming panels only. A rectangular crop cannot remove an overlay embedded within the viewport without losing real content.

This is a scoped purpose/prompt/schema change in the existing media editor, not a new layout. Existing generated media-editor reference and shared controls are retained; no new decorative design or parallel editor is introduced.

## Changes

- Added `frame` suggestion kind throughout the validated schema, model request and shared crop UI; default purpose is now 完整画面.
- Kept subtitle and subject modes and legacy two-kind responses. Requested purpose ranks first, without relabeling a small subject box.
- Prompt explicitly preserves the complete viewport, subtitle lines and HUD, rejects treating dark scenery as black borders, does not impose an aspect ratio, and permits full-image coordinates when there is no surrounding chrome.
- Uncertain viewport boundaries produce no frame suggestion. The UI explains when only other kinds are available. No new area-size heuristic that would reject a legitimately small game window.
- Manual adjustment, explicit upload consent, single-frame transfer, original preservation, protected late results and confirmed derivatives are unchanged.

## Validation

`scripts/check-media-crop-ai.cjs` uses a synthetic640x360 image with browser chrome and outer bars, a mocked vision response and the actual deterministic editor. It checks all three kinds, full-image validity, default purpose, prompt contract, purpose ordering, retained legacy suggestions, pixel conversion40/32/560/300, consent, no automatic crop/adoption, manual preview, late manual edits, cancellation, configuration changes, denied requests and original-preserving derivative generation. This does not prove actual model geometry or quality on the user's private screenshot.

Screenshots: `docs/reports/v04316/`, desktop/mobile, light/dark; inspect actual controls and scrolled state. Release evidence is appended after independent preview and production resource/auth checks. Source and memory cloud flags remain OFF; Bridge/Anki unchanged.
