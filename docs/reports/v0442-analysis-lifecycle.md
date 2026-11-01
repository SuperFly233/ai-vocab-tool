# v0.44.2 Analysis Lifecycle

Date: 2026-10-31. Compatible repair of released scene analysis and confirmation
behavior, not a new source/memory/media feature release.

## Implemented

- Removed cumulative100-job rejection. The20 queued/running safety budget remains.
- All record states, including generated and exercise jobs, expose red deletion.
  Completed cleanup includes legacy generated records. Only task records change;
  scenes, binaries, entries and associations remain. Optional export is not a gate.
- Persist removal and tombstones before aborting. Late responses cannot restore
  deleted records. Restoring a deleted waiting/running record marks it interrupted;
  its former queued execution remains aborted and cannot resume or charge.
- Ordinary scene results no longer require per-field Check/approval. Immediate save
  binds immutable snapshot and save-time revision; eligible fields auto-save when
  unchanged. Account, material identity and exact object revision still guard writes.
  Conflicts retain results and open the existing editor with manual values preserved.
- Supplementation scans without a model and generates only selected scenes, up to20.
  It fills eligible missing content directly, with protected automatic-save Undo.
  Existing legacy batch drafts remain accessible without another model request.
- Task completion does not invalidate exercise receipts. Cleaning a completed record
  does not turn an analyzed saved screenshot into an unanalyzed pending item.
- Shared confirmation is wrapped in a native modal top layer, above other native
  dialogs; original IDs/custom actions remain compatible. Escape preserves parents.
  Opening results protects existing drafts; a native batch no longer hides its editor.
  Welcome popovers yield to modal work.
- Help/manual acceptance reflects optional editing instead of mandatory approval.
  Existing Anki approval, model consent, origins and uncertainty are unchanged.

## Evidence

Generated reference: ../design/analysis-records-reference.png. Adopt divider list,
direct commands and native confirmation; reject fictitious navigation/counters and
remote thumbnail loading. Real screenshots inspected at the same responsive sizes.

- check-analysis-lifecycle:320/390/768/1024/1440, light/dark,150 legacy records,
  pagination/deletion/cleanup, two underlying dialogs, Escape, immediate save and
  guarded completion, conflict editing, cancellation/late response, deletion Undo,
  storage failure. Additional390light waiting-slot deletion/Undo and20-active limit.
- check-scene-ai-immediate-save: ten width/theme cases; three delayed snapshots,
  closed editors/hidden page, independent bindings, manual revision conflict,
  closing supplementation while running, repeated material imports and statistics.
- check-scene-ai: ten cases; consent, validated synthetic HTTP responses, targets,
  no-call scan, long content, explicit editor save and duplicate image behavior.
- check-scene-ai-task-safety: cross-tab lock, no duplicate provider call, stale save
  refusal, before/after-response quota failure, emergency export, late cancellation,
  existing entry reuse and full contextual lookup.
- check-scene-ai-safety: failed atomic auto-save, successful retry without generation,
  protected Undo, legacy refresh drafts/title settings, manual targets, cancellation.
- check-modal-dismissal:390/1440 light/dark; image/Anki/highlight dialogs,
  Escape/backdrop/X, dirty parent, no drag-release close, discarded-draft Undo.
- check-control-motion: eight CSSOM width/theme cases passed.
- npm run check passed after the0.44.2 version/asset/document contract update.
- check-media-idle-ui:30 remote scenes,5 sync/focus/online cycles,25 renders and20s
  exercise idle produce0 hidden/list/idle media calls. Legacy route exclusion remains.

Async browser predicates now use an explicitly awaited polling helper rather than
relying on a promise being treated as a truthy browser predicate. This exposed the
new automatic Undo identity typo and an existing welcome-popover obstruction; both
were repaired before release.

## Acceptance Boundaries

Tests use isolated synthetic records and provider responses. No paid model calls,
private historical writes, Anki writes, database migration or Bridge release.
Physical phone/model quality remains user-run. Closing the browser may interrupt
direct requests; restart requires explicit action and may incur provider charges.
Do not bulk-apply pre-existing generated records on upgrade or delete real records
on the user's behalf.

Production and preview hashes/URLs are recorded after actual deployment, not inferred.

Independent preview: https://dcf8de37.ai-vocab-tool.pages.dev . Deployed390dark
three-delayed-image immediate-save/background-completion flow passed. Screenshots:
../evidence/v0442/records-1440-dark.png,
../evidence/v0442/confirm-1440-light.png,
../evidence/v0442/confirm-390-light.png,
../evidence/v0442/supplement-390-light.png .

Local preview is available at http://127.0.0.1:5192 . Real-model, phone and Anki
boundaries above remain unverified; no claim of their completion follows deployment.

## Release

Runtime commit1c66a38 pushed to main. Final independent preview
https://e6b3b2e1.ai-vocab-tool.pages.dev passed194 SHA256 matches and anonymous
sync/Anki/source/media-v2 401; legacy media remains static405. Initial preview
dcf8de37 also passed194 hashes and deployed390dark immediate-save flow.

Production: https://625fbabe.ai-vocab-tool.pages.dev and
https://ai-vocab-tool.pages.dev . Official194 hashes/authentication/legacy405 and
deployed390light three-delayed-image flow passed; independently read app version
is0.44.2. First production attempt returned Cloudflare internal10500; one bounded
retry succeeded without credential or security changes.

Exercise journey four desktop/mobile theme cases passed with HTTP fixtures and
explicit refresh recovery. Its interruption counter now waits for actual provider
request arrival before refreshing, rather than counting a not-yet-sent request.
No live model request was used to establish this release.

Capture parity: merge61e9238 pushed; existing isolated alias updated to
https://1480498a.ai-vocab-tool.pages.dev .198 static hashes, anonymous authentication
and legacy405 gates passed, as did capture data/ten UI/synthetic vision and deployed
390dark shared immediate-save flow. Three merge conflicts were reconciled retaining
capture-only styles/scripts/importCapture and public closeEditor/lifecycle fixes.
Main checkout restored and rebuilt84icons/194public files; no capture promotion.
