# v0.41.1 Home Scene Continuity and Maintenance

Status: released2026-10-25; preview and production acceptance passed.

## Requests and Actual Scope

| Request | Result |
| --- | --- |
| Home save appears to do nothing | Fixed: compact saved-scene thumbnail/title/link/edit context remains on Home, bound by groupId in account-scoped session state; save does not query. Refresh restores live references, missing/other-account targets are not used. |
| Home multiple words | Fixed: one shared newline parser for chips/count/admission; individual queue requests, normalized deduplication,20-item limit, existing entry links and actual scene binding. Ongoing single requests still allow new queued words; duplicate-click guard does not lock the whole generation. |
| Identical files create duplicates | Fixed forward: SHA256 file reuse already existed; new scene saves now also reuse a live record only when media and meaningful content match. Different filenames do not duplicate bytes/scenes. Source, notes, original, translation and highlights remain distinct. Existing private duplicate records are NOT automatically deleted/migrated. |
| Empty columns/redundancy | Fixed: pure-media scenes use a bounded left media column, not an empty text/media split. Home context has its own grid track, avoiding a stretched toolbar. |
| Destructive red everywhere | Shared action source and menus classify delete/remove semantics, including focus/hover; nested draft-discard confirmation is red. Existing confirmation/undo behavior remains. |
| Refresh/bookmark toggle on known words | Removed: explicit addition immediately associates an exact existing entry without inference; successful terms leave the basket and appear in linked results. Entry regeneration remains an explicit entry/version action. |
| Naming provenance and choices | Implemented: model-free original-summary/source-time/manual; opt-in AI-text mode with restrained tint and a clear no-image boundary. Default text mode is stored/synchronized through existing settings. Text-model failure retains the draft and offers a model-free save. |
| Legacy supplementation | First stage: Scene more menu opens read-only missing-field scan. Explicit selected batches (max20) request title/translation text suggestions, preview/edit/select fields, atomically apply and guarded undo. No notes/media/source/original overwrites. Storage failure/conflicts retain suggestions. This is NOT old-entry long-form expansion or vision-derived scene descriptions. |
| Primary action first and reset defaults | Implemented: add scene first in the header action group. History/favorites resets hide when actual query/filter/sort state is default; opening filters alone does not expose reset. Existing multiple-history facets and intentionally single source/sort/state selectors retain their semantics. |

## Design and Safety

Generated/inspected home-scene-v0411-reference.png and scene-maintenance-v0411-reference.png before their respective UI work. Adopted compact context and reviewed proposals; rejected invented navigation, automatic image understanding and fictional source data. Actual components use existing theme/icons/editor/queue/atomic storage. No new navigation, database migration, native software change, private-record cleanup or paid inference in acceptance.

AI supplementation receives only explicitly selected title/original/translation/source/section text, never image files, unrelated personal notes or the entire library. New provider purpose returns bounded title/translation JSON, parsed as data and rendered as text. The actual model is user-configured; tests mock responses and do not establish live-model output quality. Missing original text is not fabricated from media.

## Evidence

- npm check (data/storage/sync/settings/media/task/contracts), build:pages and git diff --check passed;140 static files,72 icons, capture excluded.
- check-home-scene-continuity.cjs:320/390/768/1024/1440, light/dark; actual PNG under changed filenames and twice in picker; reuse leaves original timestamps unchanged, distinct source stays separate, actual existing-entry association/queue identity/deduplication, single-while-running admission, refresh/account isolation, no inference on save and pure-media geometry.
- check-scene-maintenance.cjs: same ten viewport/theme combinations; destructive focus color, primary order, default resets, explicit mocked AI title, proposal-only generation, manual edit, failed-storage retention, atomic apply/undo and concurrent-edit rejection. Extra390dark dirty-close/draft undo and account mismatch passed.
- Existing quick-learning, expanded-editor, multilingual dictionary/corrupt-source recovery, nested-modal, control-motion and scene-authoring-polish matrices passed. Authoring test explicitly dismisses an earlier action toast before clicking another editor's header; it does not claim all notification placement is redesigned.
- Synthetic screenshots: [Home mobile](v0411/home-mobile.png), [media-only desktop](v0411/media-desktop.png), [supplement mobile](v0411/supplement-mobile.png), [supplement desktop](v0411/supplement-desktop.png). These contain no private content.

## Remaining Boundaries

Physical iPhone, real paid text-model outputs, real media playback and Anki/Fushi sync are not tested here. Vision, canonical source recognition/Teyvat indexing, old-entry full-body enrichment, original-media editing and safe migration of existing duplicate private scenes remain pending in the shared release ledger. Scene supplementation is deliberately limited to reviewed title/translation fields.

## Release

- Implementation af5cb5a; final runtime c020086d0847bfac0bc522682f1aac1465464ab6.
- Preview https://171c2fba.ai-vocab-tool.pages.dev:140 hashes/auth plus both new full five-width/two-theme suites passed. Final whole-row build https://c2441bff.ai-vocab-tool.pages.dev:140 hashes/auth and390dark Home/maintenance suites passed.
- Production https://7069a5e2.ai-vocab-tool.pages.dev / https://ai-vocab-tool.pages.dev:140 exact resource hashes/auth401,390dark and1440light Home/maintenance passed. Tests remain synthetic and model responses mocked; not live-model quality or physical-phone proof.
- Capture parity: mergeece5a4b/docsfe227c5 at https://813803e0.ai-vocab-tool.pages.dev;144 exact hashes/auth and deployed390dark Home/maintenance suites passed. Local capture five-width/two-theme/data/contracts and shared390dark suites passed. Main restored with140 files/72 icons and no capture-ui.js; unfinished capture remains excluded from production.
