# Scene Workbench and Interaction Consistency

## Required Outcome

- [x] iPhone-class menu layout stays compact in WebKit, including scrolling and viewport changes.
- [x] Scene memory leads entry reading; desktop pairs context with media on the right.
- [x] Scene and media order are editable and persisted in scene metadata; multiple hero media supported.
- [x] Image/GIF/video enlargement and clear associated examples are available.
- [x] Tooltips use the browser top layer, wrap and remain inside viewport edges.
- [x] API chooser has aligned icon controls, useful viewport sizing and sane scroll behavior.
- [x] Drag interactions share direct item movement, with no offset capsule and consistent mouse/touch activation.
- [x] Editing cannot close from pointer exit or a gesture released outside its dialog.
- [x] Regression and viewport checks cover each requirement.
- [x] Commit/push/deploy and verify the actual production runtime assets.

## Approach

Retain stable scene/media IDs and private media transport. Use native popovers for
nonmodal menus and hints, with explicit intrinsic sizes and viewport limits. Move
popovers outside transformed/grid ancestors. Keep editor dismissal explicit. Use
the same reorder mechanics across existing lists and new scene/media ordering,
without a detached pointer label. Prioritize context and memory imagery rather
than adding more settings or nested bordered cards.

## Verification

Desktop and mobile viewport screenshots, scroll and constrained viewport checks;
menu dimensions, hint edge containment and top-layer assertions; direct pointer
and touch drag persistence; edited draft retention; scene roundtrip/hero media,
viewer and linked examples. Physical iPhone verification must not be claimed from
Chromium emulation; add WebKit coverage when the runtime is available.

## Verification Evidence

- Implementation commit `b1b1512` pushed to main and deployed to
  https://d08fd398.ai-vocab-tool.pages.dev. Production HTML revision
  `0.24.0-20261019.5` and scene-data, scene-ui, ui-overlays, app, styles and icons
  matched the built output. Fresh unauthenticated production WebKit at 390x844
  rendered the plus menu at x=49, y=153, width=220, height=96.28125. Screenshot:
  `tmp/scene-qa/production-menu-webkit-390.png` (ignored QA artifact).
- `check:scenes-ui`: 390/1440, light/dark; main media selection, media order,
  context/media placement, native modal viewer, notification top-layer behavior,
  local refresh/edit/delete/restore and portable binary roundtrip. Real encoded
  WebM playback and private media transport tests retained.
- `check:workbench-ui`: Chromium mouse and actual dispatched touch input; WebKit
  rendering and mouse input at 390/1440. Native plus menu remains body-hosted and
  intrinsic-sized at full and 420px window heights; API menu is scroll-dismissed,
  centered icons and long wrapped tooltips are measured inside viewport.
- Workbench tests exercise scene, API, visual, queue and folder reorder. Expanded
  1000px visual rows retain their content, continuously autoscroll while held at
  the edge, cross screens and complete the actual reorder. Pointer leaves and
  backdrop clicks do not dismiss editing.
- Pure scene tests verify deterministic ordering/merge, explicit featured=false
  and invalid main-media references. Existing storage/auth/merge contracts pass.
- Reading rhythm checks retain equal 28.75px single-line advances, 30px speech
  targets and no overlap across home/detail, 320/390/1440 and both themes.
- Responsive checks retain no horizontal overflow at 320/390/768/1440 and compact
  sticky bars. Version-manager regression covers mobile touch roll movement.
- WebKit 26.5 was installed and run on Windows. This is not a physical iPhone
  test, nor proof of every device-specific media codec. No existing cloud user
  records were changed for this release's browser tests.

## Release Accounting

New capabilities (3): featured scenes/multiple main media; scene/media ordering;
native media enlargement.

Optimizations (4): scene-first paired reading; linked examples inline; direct
item movement with shared activation; compact icon editing commands.

Bug groups (6): oversized mobile plus menu; tooltip clipping/stacking; API close
icon alignment; API menu size/scroll anchoring; accidental editor dismissal;
large-row collapse and stalled edge dragging.
