# v0.43.5: scene editor and peer help destinations

## Design and Implementation

- Generated and inspected [populated desktop/mobile reference](../design/scene-editor0435-reference.png); [layout decisions](../plans/2026-10-26-scene-editor-redesign.md). Retain real logo/navigation, no generated playback commands, invented versions or model states.
- Media and bilingual text are one independent upper comparison region. Learning targets occupy full width below it, not a fixed right column. Empty media uses a compact upload row and full-width prose. Long collections no longer create a blank left column.
- Rename public section to 学习重点, phrase to 目标片段, explanation to 语境释义 across editor, Check, supplementation and read views; internal fields unchanged. Desktop has aligned grip/selection, phrase/meaning, entry selector, remove; narrow layouts use the same order vertically.
- Left-rule content editors shared across scene prose/highlights/notes, targets, Check, supplementation and visual-entry prose. Metadata/search/select/save remain explicit. Visible focus and touch affordances; no scale animation. Title and generation mode share a compact row, no large AI-colored wrapper.
- About/tutorials/connection/FAQ are peer tabs; question mark defaults About. Parameterized existing About renderer supplies both dialog and original route, including current version and working release expansion. FAQ no longer hides About at its bottom. Explicit tutorial/connection links remain direct.

## Acceptance

- `check-scene-editor-redesign`:320/390/768/1024/1440 light/dark, populated four-target synthetic media, empty media, long content, genuine mouse/touch reorder, full-width/baseline assertions, editable rules, visible existing-entry selectors, same-level help keyboard navigation, no model calls and dirty-editor preservation. Additional1/20-target layout fixtures at390light/1440dark.
- Existing task matrix across five widths/themes and task safety suite passed: cross-tab dedupe, save/background ownership, guarded adoption, failure rescue, cancellation, existing-entry reuse and complete lookup.
- Scene-AI and scene-AI safety390dark passed. Help/tutorial flow390dark and help safety passed. Entry supplementation390dark passed. Full npm check, eight shared control/motion cases and six original version-editor width/theme cases passed (naming/default/delete/cancel/undo/stale-sync/integration/import/draft/order/scroll/quota).
- Screenshot review caught a caption rule clipping the enhanced-selector wrapper; corrected to exclude `.lexi-select`, with actual geometry/visibility assertions.

## Screenshots

- [Editor1440dark](../screenshots/editor0435/editor-1440-dark.png), [targets1440dark](../screenshots/editor0435/targets-1440-dark.png), [targets390light](../screenshots/editor0435/targets-390-light.png).
- [About1440dark](../screenshots/editor0435/about-1440-dark.png), [About390dark](../screenshots/editor0435/about-390-dark.png), [20-target narrow list](../screenshots/editor0435/targets-20-390-light.png).

## Release and Limits

Runtime commit `8ae0954` pushed to main. Independent preview https://b44ce473.ai-vocab-tool.pages.dev:390light/1440dark deployed redesign fixtures passed. Production https://143587fa.ai-vocab-tool.pages.dev / https://ai-vocab-tool.pages.dev:155 hashes matched, sync/Anki auth401 passed, official390light populated editor/1/20-target/About flow passed. Supersedes initial identical-assets0f3cb9ed deployment.

No API, schema or helper update; no private records, paid provider requests or real Anki/Fushi changes in this release. Physical iPhone, actual media playback and Anki sync not retested. Canonical sources/Teyvat/FSRS, consolidation/storage/media backlog remains incomplete and separate; source WIP checkpoint untouched.
