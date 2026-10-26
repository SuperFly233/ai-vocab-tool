# v0.43.7 Content Editor Underline

## Scope And Decision

The user's reference means a horizontal line beneath an editable field, not a left-side quotation rule. This precise correction supersedes the left-rule treatment in the v0.43.5 reference and report; no new layout or generated reference is needed.

Shared content editors use a fixed 1px bottom border, no top/side borders, no rounded box and no resting fill. Hover strengthens the line color; keyboard focus adds an inset accent line without resizing the field. Search, selectors, metadata controls, save buttons and read-only quotations retain their existing semantics.

## Acceptance

- Populated scene editor: original, translation, both highlight fields, notes, target phrases and contextual meanings; 320/390/768/1024/1440px in light/dark themes.
- Assertions cover all four border widths, 16px input text, no focus outline and unchanged width/height across resting, hover and focus.
- Existing save, drag ordering, 1/4/20 targets, long text, title alignment and About/tutorial behavior remain in the same regression suite.
- All ten local viewport/theme cases passed; desktop dark and mobile light screenshots were inspected and saved under `docs/screenshots/underline0437/`.
- Eight motion-contract cases, mobile dark entry supplementation (IndexedDB recovery, failed atomic save, version preservation and Undo), `npm run check` and Pages build passed.
- Independent preview: https://c9030c68.ai-vocab-tool.pages.dev ; deployed mobile dark populated editor, drag, long content, save and help checks passed.
- No AI calls, data migration, Bridge or native Anki/Fushi operations are introduced. Entity iPhone, real media playback and Anki sync are not tested for this styling correction.

## Release Evidence

- Runtime commit: `23b85b5`; pushed to main after the independent preview passed.
- Production: https://ai-vocab-tool.pages.dev ; immutable deployment https://7440803d.ai-vocab-tool.pages.dev . Official domain returned v0.43.7 with all 155 resource hashes matching and unauthenticated sync/Anki endpoints returning 401. Deployed 1440px dark populated-editor regression passed.
- Preview also passed all 155 hashes and both authentication checks.
- Capture common-fix merge: `c32e676`, https://fb1e2002.ai-vocab-tool.pages.dev ; all 159 hashes/authentication checks passed. Capture data, synthetic vision lifecycle and 390px light populated-editor regression passed. Capture-only modules remain off main.
- Screenshots: [desktop dark](../screenshots/underline0437/top-1440-dark.png), [mobile light](../screenshots/underline0437/targets-390-light.png). These use synthetic content, not private records.
- Sources/Teyvat, FSRS and other previously listed unfinished work are unchanged and not counted as delivered here.
