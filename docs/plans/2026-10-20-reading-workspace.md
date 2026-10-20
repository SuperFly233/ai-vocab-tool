# Reading Workspace Implementation Plan

Goal: deliver the requested reading navigation, shared scene workflow, practical settings/account controls and observable generation stages without breaking saved data or real streaming.

Architecture: retain history/scene metadata and existing private media transport. Add a reading experience module for navigation/preferences/media presentation, and a request status module for observed timing and network status. Source versions remain immutable when automatically integrated.

- [x] Scene splitter: pointer/keyboard resize, session ratio, double-click reset, portrait/landscape default; pause inline video on enlargement and transfer playback position.
- [x] Reading navigation: top/left preference, mobile top layout, scroll highlighting, keyboard navigation and hover/focus content summaries.
- [x] Shared scenes: explicit group identity, query another phrase from a scene, existing-entry association, scene hub search/source/media filters; shared-content edits retain per-entry ordering and associations.
- [x] Settings: group appearance, reading/media, notifications, data and maintenance; shared disclosure/switch patterns; opaque measured mobile sticky offsets and unclipped hover controls.
- [x] Generation: actual prepare/request/headers/first-content/validation/completion stages and elapsed time; no invented server queue durations or fake percentage.
- [x] Versions: one-click non-destructive automatic union, readable shared renderer, compact contextual actions; retain name/default/delete/import and source-change checks.
- [x] Account/network: useful direct shortcuts and honest same-origin reachability indicator, no assumption that navigator.onLine proves Internet access.
- [x] Deletion: scene confirmation plus undo; audit other persisted delete actions for confirmation/undo and preserve concurrent edits on restore.
- [x] Stream layout: no-index confusions must not enter the 28px index column; constrain partial confusions/examples while receiving long strings.
- [x] Verify data, UI/mobile/desktop/streaming/media, report exact delivered counts and known limits, commit/push/deploy and verify production files.

No private production records are needed for this release. WebKit layout fixtures are distinct from real IndexedDB acceptance. Autoplay is opt-in and muted; viewer close does not unexpectedly resume audio.

## v0.27.0 Acceptance Ledger (23 Items)

### Bugs (8)
- [x] B1 Partial confusion layout: single full-width track, tested long in-progress strings (`check:streaming-ui`).
- [x] B2 Mobile overflow: core, scene, history controls and bounded notices (`check:responsive`, `check:mobile-notices-ui`).
- [x] B3 Sticky occlusion: opaque settings bar, modal reading nav covers scroller padding; measured responsive and inspected screenshots.
- [x] B4 Video exclusivity: real encoded WebM transfers position and pauses original (`check:scenes-ui`).
- [x] B5 Control clipping/alignment: unclipped tabs, intrinsic segments, true SVG controls and central rotation (`check:workbench-ui`, `check:scene-reading-settings-ui`).
- [x] B6 Overlay regression: deliberate dismissal, safe drag release, arrow tooltip and notice layering (`check:overlays-ui`, `check:mobile-notices-ui`).
- [x] B7 Delete safety: scene/record/folder/version/followup/profile confirm + undo; draft removal protected (`check:delete-undo-ui`, `check:versions-ui`, `check:workspace-ui`).
- [x] B8 Existing regressions: first-entry history filters, implicit all, provenance, fragment favorites and API reorder (`check:history-controls-ui`, `check:streaming-ui`, `check:favorites-ui`, `check:workbench-ui`).

### Improvements (8)
- [x] O1 Core-first detail order, bounded supporting media.
- [x] O2 Pointer/keyboard splitter, double-click reset, aspect-based initial ratio, mobile stack.
- [x] O3 Automatic loading/sync retained; failure-only retry (`check:scene-reading-settings-ui`).
- [x] O4 Media tools below picture; visibility and video controls configurable.
- [x] O5 Settings regrouped into appearance/reading/media/notifications/data; shared capsule/disclosures.
- [x] O6 Automatic exact-union integration preserves originals; shared readable renderer; compact menu.
- [x] O7 Account direct sync, data-section, scene-hub and account/security shortcuts.
- [x] O8 Inline metadata and register pairs; existing even row rhythm retained.

### Features (7)
- [x] N1 Reading navigation top/left/off with scrollspy, tooltip summaries and keyboard focus.
- [x] N2 Scene hub groups associations, searches and filters source/media.
- [x] N3 Standalone scene import via picker/paste/drop, source/note editing; no fake vocabulary entry.
- [x] N4 Up to 20 confirmed phrases enter persistent queue; dedupe; failed-only retry; existing entries attach without API call.
- [x] N5 Shared group identity, atomic history/library updates, independent highlights/target/order, association-only deletion.
- [x] N6 Real request/headers/first-content/validation/completion timings; genuine SSE remains incremental.
- [x] N7 Visible connection indicator, honest same-origin HEAD probe and separate sync warning, manual retry.

## Compatibility and Limits
- Independent metadata lives in `settings.sceneLibrary` / `sceneLibraryTombstones`, merged by per-scene clock; old scenes default groupId to their own id. Binary remains content-addressed in existing IndexedDB/private media transport.
- Persistent queue retains sceneGroupId; same phrase from different scenes does not overwrite pending attachments. Task outcome summaries are session-local; queue recovery and saved results persist.
- Split ratios are session-local. Media autoplay defaults off and, when enabled, is muted and limited by browser policy.
- Integration is deterministic exact-item union, not AI semantic deduplication. OCR, transcription and Anki automatic integration are deferred as agreed.
- Factory reset/log clearing are explicit maintenance operations, not recoverable record deletion. Undo cannot overwrite newly modified replacement profiles/folders, and drafts must still be open to restore draft removals.
- Real Chromium tests use IndexedDB and encoded WebM. Windows WebKit layout/transport fixture uses QA_MEMORY_MEDIA=1, not actual Blob persistence. Physical iPhone and a real multi-device account sync have not been validated in this release; no private production records were modified.
- Tests and final deployment evidence are recorded below before release completion.

## Verification Results
- Passed `npm run check`: module syntax, icon subset, route/handler/version contracts, history/settings/library convergence, storage rollback, task recovery, sync/media API authorization and integrity.
- Passed `check:workspace-ui`: 390/768/1440px light/dark, standalone persistence, duplicate phrase collapse, actual SSE results, existing-entry association without API call, failed-only retry, shared editing, confirm/cancel/undo, directory/preferences and hub filters.
- Passed `check:scene-reading-settings-ui`: 390/768/1440px light/dark Chromium; WebKit 390/1440px light/dark layout fixture. Pointer/keyboard splitter and double-click reset included.
- Passed `check:versions-ui`: 320/390/1440px light/dark, rename/default/context menu, delete/cancel/undo, source isolation, automatic exact union, import, draft, stale-source and quota guards.
- Passed `check:responsive`, `check:history-controls-ui`, `check:favorites-ui`: mobile widths through 2138px where supported, long strings, internal table scroll, filter initialization, search scope behavior, fragment favorites and membership drafts.
- Passed `check:scenes-ui`: picker/paste/drop, real IndexedDB, automatic loading, private transport, hash validation, portable media backup, real encoded WebM, enlargement time transfer and original pause.
- Passed `check:streaming-ui` and `check:streaming-e2e`: incomplete JSON/Unicode, full-width no-index confusions, provenance, buffered fallback, real upstream gated until text is visibly received for lookup and followup.
- Passed `check:overlays-ui`, `check:mobile-notices-ui`, `check:workbench-ui`, `check:scene-authoring-ui`, `check:delete-undo-ui`: deliberate backdrop intent, arrow tips, bounded notices (45px simple / 81.5px detail for normal messages), SVG alignment, API/scene drag, manual highlights/source reuse, deletion restoration and visible network dot.
- Screenshots inspected from ignored `tmp/scene-qa/`: mobile/desktop detail reading, settings and scene hub. Screenshot fixtures contain no personal data.
- Completed `npm run build:pages`; release commit `367844a` pushed to `origin/main`.
- Cloudflare deployment: https://f3d409f7.ai-vocab-tool.pages.dev ; production: https://ai-vocab-tool.pages.dev ; scene hub: https://ai-vocab-tool.pages.dev/scenes .
- Production returned HTTP 200 and byte-equivalent (LF-normalized) content for index.html, app.js, styles.css, scene-data.js, scene-ui.js, experience-ui.js, request-ui.js and lookup-tasks.js. `/scenes` returned the v0.27.0 / 20261020.4 HTML.
- Final tally: 23 accepted items = 8 bug fixes/regressions + 8 improvements + 7 features. No planned item remains unimplemented; physical-device and real-account cross-device testing remain explicit validation limits, not claimed as passed.
- Stop after this release as requested; no automatic next iteration.
