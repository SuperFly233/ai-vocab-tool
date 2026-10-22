# v0.35 Dictionary Learning Workbench

## Decisions

Lexi remains the single learning UI. Fushi supplies installed dictionary data through its official CLI; Lexi previews and writes its own Anki template directly. Existing Lapis configuration, Fushi queues and review scheduling stay unchanged. Dictionary reading and Anki inclusion are both required. No full dictionary redistribution or automatic model calls.

Design reference: docs/design/learning-dictionary-v035-reference.png. This is a reference, not a background or evidence of working audio. Preserve actual brand assets, real counts and existing main navigation.

## Acceptance Ledger

| ID | Unit | State |
| --- | --- | --- |
| R1 | Mobile overflow, keyboard and bounded hints | Five-width browser checks passed; physical iPhone pending |
| R2 | Nested dismissals, dirty confirmation and guarded Undo | Dictionary selection/discard/Undo passed; full modal-family regression pending |
| R3 | IME, duplicate submit and scene-specific queue recovery | Lookup data, IME/source and six reading-workspace regressions passed |
| R4 | Independent highlights, dictionary snapshots and sync isolation | Highlight/browser and immutable snapshot tests passed; regression breadth pending |
| R5 | Owner/device/lease authorization and official-command whitelist | Migrations applied; isolated security tests and real owned-device acceptance passed |
| R6 | Lost receipts, duplicates, partial results and safe Anki Undo | 40 mock tests plus real dictionary duplicate/receipt/Undo passed; packaged path pending |
| O1 | Scene workflow and low-frequency action menus | Existing workflow preserved and regression passed; unavailable integrations hidden |
| O2 | Core-first reading, bounded media and aligned metadata | Responsive long-content and reading-workspace checks passed |
| O3 | Unified highlight authoring and matching feedback | Existing multi-fragment and granular help checks passed |
| O4 | Consolidated settings and actionable connection states | Website settings passed; external connection UI implemented on preview, packaged path pending |
| O5 | Unified front/back preview, target and dictionary selection | Five-width dictionary/send/preview tests passed; dictionary update-diff refinement pending |
| O6 | Visible-only task polling without focus/scroll loss | Implemented; ten task-UI regressions passed; account switch closes stale task dialog |
| N1 | Installed OALDPE reading in website | Implemented and browser-tested on acceptance preview; production gated |
| N2 | Private immutable snapshots and offline reading | Real cloud snapshot and browser offline/account-isolation checks passed; production gated |
| N3 | Independent Lexi Scene v2 dictionary card fields | Real dedicated note, duplicate skip and safe Undo passed; packaged path pending |
| N4 | Confirmed Fushi source import without consuming queues | Existing unshipped work; reverify |
| N5 | Cross-device website-confirmed card workflow | Existing unshipped work; reverify |
| N6 | Diagnostics, original-source tracking and safe receipt actions | Existing unshipped work; reverify |

## Release Gates

### Safety Hold After Reported Blue Screen

User reported a Windows blue screen on 2026-10-22. Read-only System log confirms bugcheck 0x3B / 0xC0000005 but does not identify a responsible module. Do not attribute it to or exonerate Fushi/Anki without evidence. Hold actual Fushi/Anki calls, real-deck tests and bulk browser launches; continue source edits, pure data/static checks and remote design generation. No driver changes, Driver Verifier or deliberate crash reproduction. Unrun UI/external acceptance must stay pending; no production enabling during this hold.

Hold lifted by the user's subsequent explicit instruction on 2026-10-22: resume the original plan, including external integration acceptance. Run live checks serially against the dedicated test deck; do not reproduce crashes or change drivers. If another crash occurs, stop live checks and retain diagnostics. Previous unrun acceptance remains pending until actually executed.

Offline checkpoint: npm run check passed, including independent view preferences and granular hint settings. Dictionary unit tests: 5 passed. FakeAnki/FakeCloud web-review tests: 7 passed after resolving sandbox temporary-file access with an approved test-only run. Snapshot identity, canonical JSON/hash, sense integrity and legacy-protocol rejection are covered. This is not live dictionary/card acceptance.

Browser checkpoint after hold lifted: check-browse-consistency.cjs passed 320/390/768/1024/1440 px in light/dark using synthetic offline data. Inspected history desktop and scenes mobile screenshots; extended the shared opaque header mask across the 8 px sticky-tools gap after noticing leaked text. Screenshots: tmp/dialog-qa/browse-consistency/. Independent filter/sort restoration and page-specific reset passed. check-scene-hints.cjs passed 320/390/768/1440 px in both themes, including multi-fragment highlights, separate editor/hover/pinned controls and Undo preservation. No physical iPhone claim.

Dictionary database checkpoint: isolated in-memory PGlite passed five migrations, account/device/lease isolation, authoritative sense selection, immutable snapshots, duplicate submission and v1/v2/v3 compatibility. Added content-hash verification for dictionary entries and senses; tampered sense rejection passed. No production migration executed at this checkpoint.

Live availability checkpoint: official Fushi CLI --no-launch --json status returned running:false; it did not start Fushi. Current process inventory did not show Anki. Real-deck acceptance is still pending, not failed or complete. Do not silently start either application or change its default configuration.

Later availability: user manually opened Fushi and Anki. CLI confirmed Fushi 3.0.0 initialized, and Anki was running. No application was auto-started.

Cloud checkpoint: applied lexi_anki_pending_job_v1 and lexi_dictionary_snapshots_v1 to the existing project after schema inspection and isolated tests. Verified snapshots RLS on, authenticated direct SELECT off, anonymous API execution off, legacy internal bridge execution off, authenticated dictionary RPC on. Production API gate remains false.

Preview checkpoint: https://f0d07401.ai-vocab-tool.pages.dev, alias integration-acceptance.ai-vocab-tool.pages.dev. This is a WIP acceptance deployment, not a v0.35 production release.

Real dictionary acceptance: scripts/accept-dictionary-cloud.py succeeded using the connector's independent OS-vault login. Official OALDPE query for clock, selected one sense, immutable cloud snapshot, v3 task, target-bound web-approval API, one Lexi Scene v2 note in Lexi 验收, unchanged-content skip and accurate receipt passed. The one test note was safely undone. Snapshot a0681643-6085-41b2-90b4-2125b0cf9e16; task 2d6f1070-8255-466d-a8dd-3ac9cbe08f21. Evidence: tmp/anki-bridge-qa/dictionary-acceptance-report.json. Does not prove physical-phone use, Anki own sync, media playback or packaged-executable integration.

Website checkpoint: dictionary-ui.js now provides safe text rendering, account-scoped IndexedDB snapshots, AI/dictionary tabs, installed-dictionary selection, selected-sense save, and shared dirty-close/Undo behavior. Card send uses saved snapshot references in v3 tasks; card preview blocks approval if any reference fails verification. Five-width/two-theme reading/send/preview simulation passed before the final selection-window additions; 390 px light/dark additionally passed selection/discard/Undo/save. Remaining widths must be rerun after final polish. Full Python mock suite: 40 passed. Build 0.3 in progress, not yet a packaged-executable acceptance.

Final website simulation: all five widths and both themes passed the complete selection/discard/Undo/save, cache, safe rendering, account switch, v3 send, card preview and invalid-reference blocking checks. Screenshots: tmp/dialog-qa/dictionary/. Inspected mobile card preview and desktop dictionary reading; corrected tab wrapping and dictionary translation spacing.

Packaging blocker: system Python 3.12.4 PyInstaller process crashed with 0xC0000005. A separate project-only venv using bundled Python 3.12.14 and the same locked wheels passed all 40 tests and built an EXE, but --self-test hung before loopback startup. Only the two verified self-test processes were stopped. Diagnostic rebuild then also exited with 0xC0000005. Application log identified python312.dll for the first crash; no new recent System bugcheck/Kernel-Power event was found at that inspection. Cause is unproven. Stop further package-build attempts for now; do not distribute the unverified EXE. No system Python, driver, Fushi or Anki configuration was upgraded. Packaging now requires a successful self-test receipt bound to the exact EXE hash/version, preventing accidental shipment of this artifact. Production release and production gate opening remain pending, even though source-helper cloud acceptance succeeded.

Latest preview: https://287a78d4.ai-vocab-tool.pages.dev. Six deployed static-resource hashes matched local dist. Anonymous preview task health returns 401 (login required), production returns 503 (still disabled). This is not a production v0.35 release. The acceptance ledger remains partial; do not count all 18 units as delivered.

First-stage release: code 530211a pushed to main and v0.35.0 deployed at https://a588f045.ai-vocab-tool.pages.dev. All 28 production static hashes matched local dist; isolated 390/1440 browser checks passed, and external task gate remained 503. Source/private credentials and unverified packages were excluded. Production screenshot inspection then caught a mobile top-button/bottom-navigation overlap and stale initial settings highlight; a follow-up fix and explicit assertions are being verified before final acceptance. Additional regressions passed: responsive long content, six reading-workspace cases, twenty website/helper integration UI cases, ten Fushi source-selection cases, four modal-dismissal cases, six notice-priority cases and eight control-motion cases. Integration 0.35.1/Bridge 0.3 is not released.

v0.35.0 delivers main-project improvements with unavailable external actions gated. v0.35.1 / Bridge 0.3 opens dictionary/card services only after migrations, security tests, Windows package and real dedicated-deck acceptance. Neither phase is complete until tested, committed, pushed, deployed and production-verified. Physical iPhone, actual media playback and Anki own sync must be reported separately.

## Existing Work

Production is v0.34.1 hotfix (78c9d5f). Preserve all uncommitted Fushi/Anki work. Preview cloud acceptance report confirms two synthetic notes, duplicate skips, two media hashes and two remote undos; this does not prove the new dictionary feature. Pending-job migration exists but is not yet confirmed applied. Do not reuse old success as dictionary acceptance.
