# v0.43.15 Candidate: Classification And Memory

Date: 2026-10-28. Production baseline: v0.43.14 / Bridge 0.4.1.

## Implemented

- Source workspace: read-only folder suggestions based on stable source identity, exact names and other scenes' confirmed folder memberships. Conflicting stable IDs are excluded. Adoption changes the draft only; existing final confirmation and protected Undo remain required. No model call or automatic source merge.
- Shared API reader: reject HTML, malformed/empty JSON and incomplete sync write receipts. Invalid responses cannot clear local dirty markers or invent cloud versions. Applied to sync fallback, Bridge, sources and memory requests.
- Resumed journal commit 1aa0bbb as d15a0a0; account-isolated IndexedDB state/event/outbox transaction, pending-event preservation and explicit conflict archives.
- Explicit ts-fsrs@5.4.2 / FSRS-6 shared algorithm, pinned weights, official UMD and license. Server computes canonical scheduling; browser computes matching offline previews/events. No Anki scheduling changes.
- Guarded memory candidate: explicit selection, same-phrase/different-scene separation, answer reveal, four ratings, predicted interval, skip, pause/resume, protected Undo, offline score persistence/replay, content fingerprints, saved timezone and estimated curve.
- Service-only SQL commit specification and authenticated API. Unique receipts, revision/head compare-and-swap, atomic state/event writes, account isolation and delete protection. Anonymous/authenticated users cannot call the private commit function directly.
- Fixed actual 320px toolbar overlap found during screenshot inspection; added rectangle-intersection checks, not only overflow checks.

## Layout Evidence

Existing generated references were inspected before implementation:

- `docs/design/sources0438-reference.png`
- `docs/design/memory044-reference.png`

Kept existing typography, icons and controls. Rejected reference-only invented navigation, automatic target selection, answer leakage and an upward forgetting curve. Actual source and memory screenshots are saved under `docs/reports/v04315/`; these show synthetic data, not a production account.

## Verified Locally

- `npm run check`: contracts, icons, history/settings convergence, storage failure, lookup queue, sync metadata and represented receipts.
- `check-api-response.cjs`: non-JSON/invalid object denial, sanitized errors, wrong/duplicate/missing write receipts and preservation of unsynced edits.
- `check-source-classification.cjs` and `check-source-classification-ui.cjs`: read-only identity rules, draft adoption, final save and scoped Undo; 320/390/768/1024/1440, light/dark.
- `check-memory-scheduler.cjs`: fixed-clock library parity, 21 pinned weights, event chains, Undo, content change, saved timezone, daily budget and curve.
- `check-memory-service.cjs`: actual SQL in isolated PGlite, role restrictions, owner isolation, canonical request replay/collision, concurrent revision conflict, timezone reuse, atomic commit and account-deletion cascade.
- `check-memory-api.cjs`: default OFF, all readiness gates required, verified JWT owner, caller-owner override rejection and sanitized failures.
- `check-memory-journal.cjs`: atomic local state/event/outbox, quota/transaction errors, conflict retention and explicit archive resolution.
- `check-memory-workspace.cjs`: 10 viewport/theme cases with real FSRS and a synthetic authenticated backend. Explicit selection, hidden answer, skip, four ratings, repeated click, Undo, offline persistence/replay and toolbar geometry. Earlier timing-dependent assertions failed intermittently; tests now wait for operation completion rather than a fixed delay. Repeated full reruns passed; this is not a real cross-device service acceptance.
- `check-scene-term-input.cjs`: 12 viewport/theme cases including 1947px; native Enter unless candidate explicitly selected, second-line input, 2/3/20 terms, chip removal and grid alignment.
- `check-scene-ai-immediate-save.cjs`, `check-scene-unlink-safety.cjs`, `check-learning-help-safety.cjs`, `check-control-motion.cjs`: regression passed. An initial Node process crashed during motion checks; a full rerun passed. No operating-system blue screen was observed or diagnosed.

## Not Accepted / Not Enabled

- Supabase `apply_migration` connector still returned invalid/expired requestState. Subsequent read confirmed source catalog/RPC absent. No execute_sql DDL workaround, no RLS weakening. Memory SQL is an isolated specification, not an applied production migration.
- Memory needs the migration, server-only credential and verified schema flag before activation. Default capability is OFF. Standard backup/restore integration and offline Undo/pause still need completion. Synthetic auth tests are not real account/cross-device acceptance.
- Cloudflare old production and isolated previews were returning SPA HTML for API GETs and 405 for POSTs. Local Functions build/routes were correct. Daily free quota/fail-open is a hypothesis only, not an account-usage diagnosis. Release gates remain failed until real JSON/auth routes recover.
- No real model quality acceptance, native iPhone, device media playback or Anki cloud synchronization was performed.
- Canonical-source production migration/Teyvat corpus coverage, full memory activation, batch automatic learning, legacy storage migration, safe consolidation and Bridge heavy-media component remain incomplete. Existing manual media editing and AI crop were not rebuilt or declared newly delivered here.

## Release Gate

Independent preview only until static hashes, anonymous/authenticated API behavior and readiness flags all pass. Never promote a static-only success while Functions are bypassed. Production remains v0.43.14 unless this report is explicitly updated with a successful production deployment and resource/auth evidence.

- Independent preview: https://15e078f3.ai-vocab-tool.pages.dev (alias https://classification-memory-v04315.ai-vocab-tool.pages.dev).
- All 186 deployed static files matched local SHA256 before the release script reached its API assertion. The assertion failed: anonymous POST `/api/sync` returned405 rather than401. This is a failed release gate, not a successful production deployment.
