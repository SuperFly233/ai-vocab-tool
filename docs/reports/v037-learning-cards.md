# v0.37.0 / Bridge 0.4: full learning cards

Date: 2026-10-23. Candidate acceptance report; production URL/commit and final ZIP verification are appended only after publication. Screenshot recognition/editor work remains a later stage, not delivered by this report.

## Implementation and evidence

Local v0.37 work preserved as c3b34a3 before integrating released direct-provider and diagnostic-storage commits in 37c13a8. No history, scene, media or Fushi record was removed. Production content-snapshot migration was applied using Supabase migration tracking. Post-checks: snapshot RLS enabled; authenticated direct table access false; anon content RPC false; internal old-wrapper execution revoked; authenticated public RPC allowed. Local PostgreSQL tests reject cross-account snapshot access, mutation and old-worker v4 claims.

51 Python tests, exact JavaScript/Python section-rendering parity, SQL/API validation, normal data/settings/media/sync/queue suites pass. Five widths (320/390/768/1024/1440), both themes pass full-card selection/review, draft Undo, device-selection Undo, stale-entry rejection and closing preparation without submitting. Legacy website/helper and dictionary fixtures remain separately tested; fixture initialization now awaits appReady rather than racing the diagnostics migration. Real HTTP lookup/follow-up streaming and diagnostic-capacity/multi-tab/failure-preservation regressions pass.

Actual extracted Windows EXE in a fresh Unicode/space directory with Python environment variables removed passed: isolated self-test; single instance; existing dictionary lookup and immutable snapshot; web preview and dedicated-deck confirmation; two synthetic cards (complete body plus core-only); duplicate submission reuse; reordered batch skips both; update/receipt and guarded Undo; original two test notes undone; restart preserves device/receipts. Existing Lapis/Fushi model templates compared unchanged. No private Fushi favorite or original media imported. These are not Anki cloud-sync or actual playback tests.

Native Windows tray smoke test verifies notification-icon registration, real version/menu labels, pause and resume, then stops. The native popup's appearance has not been screenshot-verified: the available computer-use window inventory does not expose the taskbar. Do not present browser screenshots as native-tray screenshots.

## Original v0.37 plan: 18 units

| Category | Unit | Status | Evidence / limitation |
|---|---|---|---|
| Reliability 1 | Version/identity | Complete | Public info, web label, Windows metadata and icon use 0.4.0; README/executable naming corrected. |
| Reliability 2 | Lifecycle | Complete | Actual EXE single-instance exit3, clean shutdown/restart; native pause/resume; no default browser opening in startup path. |
| Reliability 3 | Full content | Complete | Seven default sections, independent examples, bilingual highlights, full/core-only actual notes; explicit bounds, no truncation. |
| Reliability 4 | Protocol isolation | Complete | v1/v2/v3 compatibility; v4 snapshot/capability checks, old-worker exclusion, authenticated migration permissions. |
| Reliability 5 | Updates/Undo | Regression passed | Actual update and Undo, unchanged skips; later-edit/studied-card safeguards covered by existing unit tests, not a claim of live study testing. |
| Reliability 6 | Cross-device/render safety | Complete | Five widths/two themes, escaped payloads, source isolation, dictionary/media pre-approval checks. Physical iPhone untested. |
| Refinement 1 | Design first | Complete | learning-cards-v037-reference.png; screenshot-learning-v038-reference.png generated/inspected for following scope. Real components, no mockup background. |
| Refinement 2 | Reading/card toolbar | Complete | Home current result and history/favorites details share direct-card action; no mandatory scene. |
| Refinement 3 | Section selection | Complete | Default all, only-core/reset, section counts; configurations survive draft Undo. |
| Refinement 4 | Lapis-like hierarchy | Complete | Independent Lexi Learning v3, bounded media and sectioned body; no Lapis/Fushi template alteration. |
| Refinement 5 | Faithful preview/diffs | Complete | Same escaped section rendering web/Anki; full flip preview; bounded changed-section summaries avoid unchanged long introductions. |
| Refinement 6 | Connector UI | Complete | Connection-only UI, saved port, real identity/status, safe diagnosis export; not another learning editor. |
| Addition 1 | Direct entry cards | Complete | Home/history/favorites; unsaved current result must persist first; v4 entry source needs no fabricated scene. |
| Addition 2 | Full snapshot | Complete | Account-isolated immutable reference/hash, <=220000 bytes; later edits do not change approved content. |
| Addition 3 | Independent model | Complete | Actual Lexi Learning v3 fields verified; old template hashes unchanged. |
| Addition 4 | Optional scene | Complete | Zero/one/multiple choices use current entry associations and existing media references. |
| Addition 5 | Tray control | Partial | Native icon/menu/pause smoke and actual service lifecycle pass; popup visual screenshot not available. |
| Addition 6 | Compatibility/diagnostics | Complete | Device v4 gating; explicit cloud full-content capability in connection status, official download and diagnostic export; no in-place updater. |

Summary: 16 complete / 1 regression passed / 1 partial. Five concrete fixes demonstrated or covered by new regression cases: stale version label, device selection missing discard protection, preparation after closure, changed-entry snapshot submission, and examples disappearing when definition sections are deselected. Other reliability checks are not claimed as newly discovered bugs.

## Mac direct request

2026-10-23 follow-up: user confirms Mac Edge now works. Mark user-device recovery, not a proven diagnosis or a server-side fix.

The user reports generic browser-direct failure on a Mac. A proxy-disabled command-line preflight received403/no CORS; actual isolated Edge from the production website received readable JSON401 using an invalid synthetic Key. This does not establish the Mac's cause or a universal CORS outage. New errors distinguish reported offline from unavailable readable response, preserve aborts, HTTP401/403 and no-cloud-fallback rules. Browser/vendor reachability requested from the user; no Key requested, no browser security bypass or storage clear advised.

## Remaining scope and release limits

The broader v0.37-v0.38 ledger remains authoritative: screenshot intake, vision modes, canonical-source index, automatic extraction/save/lookup, mobile/desktop GIF/video edits and AI crop confirmation are NOT implemented by v0.37. Entire history/settings IndexedDB migration is also pending; only diagnostic logs have migrated. Physical iPhone, actual media playback, native-tray popup appearance and Anki's own cloud sync remain explicitly unverified.

Candidate preview: https://094c4128.ai-vocab-tool.pages.dev ; branch alias https://learning-v037-acceptance.ai-vocab-tool.pages.dev . Synthetic UI screenshots under tmp/dialog-qa/learning-v037; actual portable acceptance evidence is local and does not expose private dictionary bodies.

Published: code `07a1516ff689dfeeb75985ef1487eef08f2c6cc6`, production https://94a97c8b.ai-vocab-tool.pages.dev (all36 hashes and authenticated v4 health verified). Release/download: https://github.com/SuperFly233/ai-vocab-tool/releases/tag/v0.37.0 . Remote ZIP digest matches the final-byte acceptance hash below.

Final candidate ZIP: tmp/anki-bridge-build/LexiAnkiBridge-0.4.0-Windows-portable.zip, SHA256 `0257c69323d08cd0c0f35aa027567fae599fec07fbd7a4ac5447a7d7c1d6ebee`. Final-byte ZIP was freshly extracted and real-deck tested, not inferred from an earlier build. Final build16.92s and self-test1.33s are within180/45s limits. Full GPL/LGPL notices and unmodified pystray source/rebuild guidance included; no credentials or dictionary corpus bundled.

Preview resource gate: all36 local-dist SHA256 values match deployed bytes; unauthenticated Anki endpoint401; isolated390/1440 history/favorites/scenes/settings, scroll masking, return-top and persisted preferences pass. No personal cloud rows used for those UI fixtures.

Supabase advisor audit retains intentional authenticated ownership-checking SECURITY DEFINER RPCs and denied-direct-access/RLS tables. Existing unrelated warnings remain for `set_updated_at` search_path and disabled leaked-password protection; not silently changed. See [function path advisory](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). New content RPC has explicit fixed search_path/auth.uid checks and no anonymous execution; isolated cross-account tests pass.
