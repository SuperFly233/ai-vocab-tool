# v0.33.0 Settings Refinement

## Design

Image model called before implementation. Reference: ../design/settings-v033-reference.png.
Use its consistent sidebar density, content hierarchy and aligned row tracks, not invented settings, replacement branding, gradients or mobile navigation. Keep existing capsule switches and segmented choices.

One category metadata list supplies seven concise labels, icons, headings, descriptions and search aliases. Preserve existing section IDs and all controls; no storage migration, new main navigation or Anki gate changes.

## Delivery Ledger: 3 Fixes / 4 Optimizations / 2 Additions

1. FIX: dynamically created reading/media rows now wrap label/description in the copy track; controls occupy their proper column. Browser alignment and preference interaction checks.
2. FIX: collapse accessible names follow both category renaming and expanded state, including search expansion. Browser assertions.
3. FIX: settings scrolling masks underlying content above the floating application header. Discovered in scrolled screenshots; fixed settings-only header mask.
4. OPTIMIZE: one ordered four-character category vocabulary for navigation and content. All seven headings and stable IDs verified.
5. OPTIMIZE: reading assistance, external integration and dangerous operations separated; dangerous operations last. Existing actions preserved.
6. OPTIMIZE: compact header/search, consistent nav geometry, desktop right-aligned controls, mobile stacked rows, unwrapped segment text and full-width descriptions. Prompt metadata uses a wrapping information strip rather than three vertically stacked bordered cards.
7. OPTIMIZE: purposeful icons (book for reading, images for media, bell for notifications) and concise factual media descriptions; retain existing Lucide style rather than bundling another family for equivalent glyphs.
8. NEW: category-level search aliases include API/Prompt, navigation, backup, sound and Toast/Snackbar. No input DOM replacement; composition/focus checks.
9. NEW: explicit empty-search state, result count and one-click clear restoring focus and complete categories.

## Verification

- npm run check: passed, including contracts, history/settings merge, storage, queue, sync and media API.
- npm run build:pages: passed.
- check-settings-refinement.cjs: 320/390/768/1024/1440, both themes; labels, search aliases, empty recovery, IME/focus, folding, geometry, media preference persistence and keyboard switches.
- check-scene-workspace.cjs: all ten viewport/theme cases passed, including settings directory follow, shared search and overflow.
- check-control-motion.cjs: all eight cases passed; no hover/focus geometry growth.
- Screenshots: tmp/dialog-qa/settings/settings-{top,reading}-{width}-{theme}.png. Desktop dark and mobile dark scrolled images visually inspected; no nested content cards, controls aligned and mobile text readable.
- Residual: check-scene-reading-settings.cjs fails at its first 320px home-result overflow assertion. A separate probe serving original HEAD files reproduces coreFirst=true/mediaHeight=180/overflow=true. This pre-existing reading-surface issue is not a settings regression and is not counted fixed. No test assertion weakened.
- Physical iPhone not tested; no claim of device acceptance. Production browser acceptance uses an isolated offline profile, not user records.

## Release

- Implementation: 258b6fa, pushed to origin/main.
- Cloudflare deployment: https://44fce65b.ai-vocab-tool.pages.dev ; production: https://ai-vocab-tool.pages.dev/settings .
- check-settings-production.cjs passed against production: index.html/app.js/experience-ui.js/styles.css/icons.js/site.webmanifest match dist after line-ending normalization; 390/1440px isolated offline browser profiles report v0.33.0, seven categories, working search/navigation and no page overflow.
- Production screenshots: tmp/dialog-qa/settings/production-{390,1440}-dark.png; mobile scrolled screenshot inspected after deployment. No real account session or user records used.
- Anki cloud migration/real-deck acceptance remain blocked independently; production gate stays closed.
