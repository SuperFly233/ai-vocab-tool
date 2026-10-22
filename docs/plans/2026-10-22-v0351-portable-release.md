# v0.35.1 and Bridge 0.3 delivery

User-approved scope: portable ZIP first; the original Lexi website is the only learning and card-preview workbench. No new primary navigation or local editor.

## Design

Generated with built-in imagegen and inspected: `docs/design/anki-review-v0351-reference.png`. Prompt: desktop/mobile Anki preview, target and operation counts, front/back, readable field differences, and compact integration status rows. Adopt the hierarchy, not the generated nested frames, selectable senses during final approval, invented Fushi API copy or unrelated navigation.

## Release gates

- Directory build <=180 seconds; external self-test <=45 seconds. Do not loop on access violations. Preserve the bundled Python SSL policy certificate instead of disabling TLS verification.
- Full runtime manifest, licenses and checksum ZIP. Reject missing, changed or added runtime files, failed self-tests and symlink/junction releases. Receipt establishes local test integrity, not a code-signing identity.
- New extracted directory with Chinese/spaces, clean child PATH and no Python environment; actual executable worker and single-instance guard, dedicated synthetic deck, website preview/confirmation, receipts and safe undo.
- Additive validated preview-change rows, no private Anki fields or full dictionary bodies in reviews. Old clients remain supported. Media and dictionary failures block approval.
- Five widths, both themes, long changes, old-client fallback, missing assets, modal/IME/scroll regression. Actual iPhone, playback and Anki cloud sync are separate evidence, never inferred.

## Deployment

Run isolated SQL and web tests, deploy acceptance preview with production closed, verify package through the preview, then open production and verify resources plus authenticated diagnostics. If a gate fails, keep integration closed and report exactly what remains. No private Fushi database/token access; official text sources and manual media attachment remain the supported boundary.
