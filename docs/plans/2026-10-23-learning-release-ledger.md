# v0.37-v0.38 delivery ledger

Approved scope: full-content cards and screenshot learning, 6 reliability / 6 refinements / 6 additions. Status below is evidence, not a completion claim.

## Current checkpoint,2026-10-25

Production0.43.0 / Bridge0.4.1: onboarding/install released at runtime3ad2df9, preview4288e978 and production59372862;149 hashes/auth401 and deployed tutorial matrix pass. See ../reports/v0430-onboarding.md. Actual portable synthetic-deck acceptance and matching remote ZIP digest remain from0.42.2; no native binary change this stage. This changes no screenshot/Teyvat/media completion claim. Current approved order: verified screenshot recognition -> Teyvat attribution and evidence-qualified automatic learning -> reviewed duplicate consolidation -> history/settings IndexedDB -> non-destructive media editing -> confirmed AI crop. User selected saved Claude Sonnet5 for the real synthetic vision test. Older version/order statements below are historical checkpoints, not current production truth.

| Pending unit | Dependency | Acceptance | Next step / evidence |
| --- | --- | --- | --- |
| Production screenshots | Selected actual vision profile | Real image probe, review/save/query/card-preview lifecycle | Existing isolated preview and synthetic tests; actual channel still required |
| Teyvat index / canonical sources | Incremental bilingual corpus and source version | Coverage visible, exact unique evidence vs ambiguity | Existing API investigation, not connected |
| Automatic save/query | Structural checks plus independent source evidence | Explicit bounded opt-in, ambiguous items held | No automatic Anki approval; not delivered |
| Reviewed consolidation | Shared identity and conflict preview | Atomic versions/folders/links/tombstones, guarded undo | Previously approved phase B still pending |
| Large history/settings storage | Account-aware transactions/readback | Fail-safe migration, reload/multi-tab/backup/sync | Logs migrated only; learning/settings migration pending |
| Image/GIF/video editing | Recoverable derivatives and bounded resources | Decodable outputs, animation/duration/audio preserved | Not delivered; current media display is not editing |
| AI crop | Media editor and verified vision | Preview/adjust/confirm, deterministic copy, restore original | Not delivered |

## Reconciled status, 2026-10-24

The older per-item entries below are historical checkpoints, not the latest screenshot implementation status. Source of truth for independent preview is `feat/capture-intake-preview:docs/reports/v038-intake-preview.md` (latest common-fix mergeba90634, docs67cc809), URL https://capture-v038-preview.ai-vocab-tool.pages.dev . Production is now v0.39.3; screenshot intake remains separate. Original full48-resource verification is recorded; latest roll-forward passed seven changed hashes/deployed390dark selection and local five-width/two-theme capture. Real vision acceptance remains unverified.

| Workstream | Verified status | Remaining delivery |
| --- | --- | --- |
| Full AI cards / Bridge0.4 | Released; dedicated-deck/portable acceptance recorded | Physical iPhone, native tray popup appearance, actual Anki cloud sync unverified |
| Selected screenshots | Preview with original-byte storage, review, guarded drafts and manual save/query; synthetic UI/vision tests | Real provider image acceptance and production release |
| Vision configuration | Preview validates an explicitly selected profile using an image challenge | Synced default/manual mode settings |
| Sources | Existing exact names can be reused | Canonical IDs/aliases, ambiguity review, no silent fuzzy merge |
| Teyvat quotations | Read-only source/interface investigation; rechecked local0.10.2/9145b2a on2026-10-24 | Incremental bilingual index, coverage, exact/ambiguous evidence and source links; not connected |
| Automatic learning | Structured manual review available in preview | Evidence-qualified automatic save/query; never automatic Anki approval |
| Media editing | Not delivered | Image crop/resize, animated GIF crop/trim, video crop/trim/resize with audio, bounded processing/fallback |
| AI crop assistance | Not delivered | Suggested boxes, user confirmation and deterministic recoverable derivatives |
| Storage | Diagnostic logs migrated losslessly | History/settings IndexedDB migration; physical phone acceptance |
| Current scene/entry iteration | Stage A v0.37.2, organization/quick-learning v0.39.0, consistency v0.39.1, timestamps v0.39.2 and selection v0.39.3 released;44 hashes and live acceptance | Previous O3 more-menu consolidation implemented; latest two-level selection, paged all/partial/clear and selected-only export tested. Common fixes merged/retested separately; report ../reports/v0393-selection.md |
| Lookup identity | Code mismatch found: main origin-only lookup vs scene unique-title matching; two displayed inflict records reported by user | Verify original inputs/languages and implement safe shared matching; do not silently merge private IDs, associations or records merely because titles match |

Do not silently drop any row when delivering a newer UI iteration. No scheduled promise or automatic next release is implied; unfinished work must remain visible.

## Release order

1. v0.37.0 + Bridge 0.4: complete cards, unchanged old protocols, production migration, actual portable acceptance and dedicated-deck acceptance.
2. v0.38.0: selected-file intake, configured/manual vision, mobile/desktop non-destructive lightweight editing, source review.
3. v0.38.1: incremental Teyvat quotation index, evidence-based canonical source matches and reliable auto-save/lookup.

## Reliability

1. Code integration: checkpoint c3b34a3 preserves all original v0.37 work; merge 37c13a8 incorporates released direct transport and diagnostics migration. Released in07a1516,36 production resource hashes verified.
2. Storage/sync: v0.36.3 logs migration released. Physical iPhone confirmation and history/settings IndexedDB migration pending.
3. Vision capability: preview implements random image-digit challenge bound to endpoint/model/key hash, one-hour in-memory validity. Simulated success/failure/changed-Key tests pass; real service channel and metadata negotiation remain unverified. Model name is not proof of image support.
4. Task lifecycle: existing queue checks plus v0.37 account/object/close guards implemented; targeted concurrency regression pending.
5. Media/privacy: preview intake retains selected PNG/JPEG/WebP originals in IndexedDB; 8MB/item,40MB/batch,20items and24MP guard. No background monitoring. Original/duplicate/refresh tests pass; derivative/GIF/video editing remains pending.
6. Card safety: 51 Python tests, SQL/API isolation and renderer parity pass. Actual final-byte0.4 portable ZIP passed two synthetic cards, full/core-only fields, web confirmation, unchanged skips, update/Undo, receipt and restart on the dedicated deck. Published at GitHub v0.37.0; remote digest verified. Production authenticated v4 health passed.

## Refinements

1. Design first: v0.37 reference exists; v0.38 reference generated and inspected, docs/design/screenshot-learning-v038-reference.png.
2. Complete cards: published7-section defaults, direct entries, optional scene and independent model. Five widths x two themes and actual extracted portable/deck acceptance passed; production resources/health verified.
3. Reading/workspace consistency: existing SOP retained; new intake views not implemented.
4. Recognition review: preview actual desktop list/detail and mobile drill-in implemented; five widths/two themes captured. Original/translation/highlights/terms are editable, guessed source never auto-confirmed. Real model acceptance pending.
5. Canonical sources: pending identity/alias matching; never silently merge fuzzy titles.
6. Connector productization: final0.4 build/self-test, actual extracted EXE/single-instance/exit and native icon/pause smoke pass; popup visual screenshot unverified. Full scope remains pending screenshot/media/source work.

## Additions

1. Batch selected screenshot intake: preview file/paste/drop implementation, hash dedupe, account-scoped drafts, save/queue reuse and guarded discard Undo. Five-width synthetic browser acceptance passes. Not production v0.38 release.
2. Evidence-qualified automatic extraction/save/lookup: pending; Anki still separately approved.
3. Vision modes: preview explicit saved-profile picker, session draft remembers choice, capability rechecked after refresh. Account-synced default/per-run preference in settings and all-provider relay support pending; initial path requires browser CORS.
4. Teyvat: local v0.9.0 source located at C:/Users/tomori/Documents/小项目/teyvat-scriptorium; catalog plus per-chapter bodies, not an existing global quote index. Pending index and representative matches.
5. Image/GIF/video lightweight editing: pending; GIF must stay animated, video audio retained, bounded browser resources and helper fallback.
6. AI crop suggestions: pending; explicit confirmation required before deterministic derivative creation.

## Design decisions

2026-10-25 v0.42.0: legacy entry long-form supplementation is now implemented/released as reviewed new versions with local recoverable drafts; this supersedes only earlier wording that it is entirely unimplemented. Actual provider output quality remains untested; no paid invocation in acceptance. Stage B duplicate consolidation and C production screenshot release remain pending.18-unit checkpoint report: ../reports/v0420-entry-maintenance.md. Teyvat/media/large-data migration are not part of this completion count.

2026-10-25 maintenance follow-up: scene title/translation reviewed supplementation is implemented as a scoped first step in v0.41.1; it does NOT complete legacy entry long-form expansion, image-derived scene descriptions/originals, canonical source matching, or existing private duplicate-record migration. Those remain explicit pending tasks. Model-free naming is the default; AI text naming is opt-in. See docs/plans/2026-10-25-home-scene-continuity.md.

Use generated reference for batch list/detail hierarchy, visible footer and mobile detail navigation. Reject its invented canonical source, mandatory per-item copy controls, and optional-original checkbox: originals are ALWAYS retained. Keep actual existing icons/themes, show real match evidence and source coverage; do not display synthetic reference content as verified results. Do not bundle generated reference as application background.

## Mac direct report

Follow-up2026-10-23: user confirms Mac Edge now works. Device recovery confirmed by user; root cause remains unknown. No storage clear or browser security bypass used.

2026-10-23: user's Mac reports generic browser-direct failure. A proxy-disabled Python OPTIONS check got Cloudflare403/no CORS, whereas an actual isolated Edge request from the production page returned readable JSON401 using a deliberately invalid Key. Neither test reproduces the Mac. Do not call this a universal CORS outage or a verified Mac fix; browser + same-browser provider reachability requested, no Key requested. Refresh does not override device routing, blockers or provider policy. No automatic cloud fallback.
