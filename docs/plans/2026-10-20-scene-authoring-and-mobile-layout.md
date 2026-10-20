# v0.25.0 Acceptance

## Scope: 8 Items

Bug fixes (4):
- Core meaning wraps within home and history-detail containers, including continuous Latin text.
- Notification stack uses auto-height flex layout instead of intrinsic-height grid sizing; native popover offsets are reset.
- Notification exit has a 320ms cleanup fallback if animation events do not fire. Old callbacks cannot remove a replacement notification's registry entry.
- Tooltip text no longer inherits rounded clipping that cuts the first glyph.

Existing behavior improvements (2):
- Restore original tooltip entry motion from Git history: 140ms / 4px, with above/below direction and the arrow moving together; 100ms exit, no hover delay, reduced-motion support.
- Source information defaults to expanded in scene reading and editing.

Features (2):
- Optional quote/translation highlight fields reuse existing JSON names and safe rendering helpers. Explicit quote choices override automatic headword matching; translations highlight explicit terms only.
- Recent saved sources populate editable title, chapter, time and URL fields. Up to eight deduplicated snapshots are derived from existing saved scenes; no extra persistence or cloud schema.

## Verification

- Pure data, storage, sync, contracts, version and media API checks: `npm run check`.
- Manual highlights survive save/reload/history detail; source reuse remains editable: `check:scene-authoring-ui`, Chromium and WebKit, 390/1440px.
- Deliberate backdrop dismissal, accidental outside release protection, tooltip arrows, immediate animation, rehover and reduced motion: `check:overlays-ui`, Chromium and WebKit.
- Core wrapping, compact notification geometry, light/dark, top/bottom, detailed/simple, native dialog, viewport resizing and animation-disabled cleanup: `check:mobile-notices-ui`.
- Responsive widths 320/390/768/1440 and reading-row rhythm regressions retained.
- Screenshots under ignored `tmp/scene-qa/`; no private user records used or changed.

## Limits

Physical iPhone/Safari acceptance is not available. Core overflow reproduced in WebKit before the fix. The exact giant-toast screenshot was not reproduced in the installed WebKit; notification layout no longer depends on the suspect intrinsic sizing, and automated geometry checks guard against excessive height. No claim of physical-device verification.
