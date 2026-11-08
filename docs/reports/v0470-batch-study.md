# v0.47.0 Batch Processing and Independent Study

Released 2026-11-08. Runtime commit: `a410a6d`.

## Deployment

- Official: https://ai-vocab-tool.pages.dev
- Accepted preview: https://dd8c2e22.ai-vocab-tool.pages.dev
- Production build: https://a9914341.ai-vocab-tool.pages.dev
- Both builds: 201 exact SHA256 resource matches; sync, Anki jobs, sources and
  media-v2 anonymous requests return401. Legacy media remains static405.
- Changes pushed to main. Bridge, Anki protocols and database permissions unchanged.

## How to Use

1. Open `/processing` using the single global material-processing icon. Import
   multiple PNG/JPEG/WebP images, paste or drop files. Originals persist first;
   importing alone does not call a model.
2. Select up to20 items and start processing. Optionally enable automatic lookup
   for this operation (maximum20 submissions). Two analyses can run concurrently.
   Extra imports remain available for later operations, not silently discarded.
3. Complete distinct utterances become separate scenes. Unreadable, incomplete,
   ambiguous or conflicting content retains its original and an actionable status.
   Open collected scenes directly from the processing row.
4. Use the past-analysis tab to reuse successful results without generating again,
   or select existing scenes for version-protected supplementation. Archive only
   hides the receipt; it does not delete scenes or original files.
5. Open `/study` from the independent learning navigation. Select scene targets,
   supported whole-sentence targets or history entries; explicitly enroll them.
   Reveal the answer, then grade1-4. Skip does not score; Undo checks later changes.
6. The records view includes next dates, actual scores and an estimated curve.
   Export the local study backup before clearing browser storage or changing devices.
   Restore accepts the same account and preserves conflicting existing records.

## Implemented Boundaries

- No per-image compulsory review for complete unambiguous new scenes.
- Existing records remain revision protected; manual input is not overwritten.
- Saving, leaving a view or changing tabs does not cancel running browser work.
  Closing the browser stops execution. Refresh retains data and requires explicit
  recovery for interrupted paid work rather than replaying it automatically.
- Lookup identity binds account, model configuration and originating scene.
  Multiple existing matches require a choice; no title-only silent merge.
- Study uses pinned ts-fsrs5.4.2/FSRS-6, explicit21 weights, retention90%, ten new
  targets per saved-timezone day and due-first ordering. Old mastered flags do not
  create invented rating history. Content changes require confirmation.
- State and score events commit atomically in account-isolated IndexedDB.
  Double-click and cross-tab conflicts cannot silently create a second score.
- Memory is local to this browser, NOT synchronized through the gated cloud
  memory service. Local use and export/restore are delivered; cloud convergence,
  personal parameter training and universal historic-data migration are not.

## Evidence

- Generated and inspected design reference before implementation:
  `docs/design/batch-study047-reference.png`; layout decisions in the dated plan.
- `check-batch-study.cjs`:320/390/768/1024/1440, light/dark; normal UI import,
  duplicate originals, HTTP response fixtures, collection, contextual lookup,
  explicit enrollment, answer concealment, four ratings, double-click, Undo,
  refresh and layout bounds. Additional390dark reuse/budget/storage/account cases.
- `check-processing-recovery.cjs`: refresh with pending lookup, no paid replay,
  explicit recovery, backup idempotency, concurrent scoring and guarded Undo.
- `check-memory-scheduler.cjs`: fixed-clock official algorithm comparison,
  weights, timezone/day budget, estimated curve and replay.
- Core `npm run check`, memory journal, scene AI task/safety, control-motion and
  real-page media idle-budget regressions passed. Fixed null active lookup
  snapshot normalization discovered during refresh testing.
- Deployed preview390light and official390dark synthetic UI journeys passed.
  Human-inspected desktop/mobile processing and answer screenshots are preserved
  under `tmp/batch-study047`; selected durable examples accompany this report.
- Actual model calls:0. Private old records modified:0. Anki writes:0.

## Unverified / Not Claimed

- Black-and-white provider incident intentionally paused. A working user-selected
  vision/text configuration is required for generation; deployment does not fix it.
- Real model OCR/source/meaning quality, physical phone and exercise-distance use
  remain user acceptance. Synthetic responses prove workflow, not model quality.
- Public Teyvat corpus remains0 lines. This release does not complete that index,
  safe duplicate merging, heavy Bridge media or the rest of the historic roadmap.
- Isolated capture-preview branch has not received feature-release parity yet;
  its preview-only behavior was not promoted to production.
