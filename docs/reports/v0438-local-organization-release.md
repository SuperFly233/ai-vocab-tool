# v0.43.8 Local Scene Organization

Release scope approved by user on2026-10-27: publish verified usable work, leave remaining work for next time. Bridge stays0.4.1; no reinstall is required for this web update.

## Delivered Scope

- Scene page > more menu > 场景检查与整理.
- Read-only checks for missing quote/context/source/classification; scanning makes no AI calls.
- Editable source text, chapter and translation; existing stable source bindings cannot be silently detached in local mode.
- Staged folder selection/new folders; final adoption saves scene and classification atomically using existing persistence/sync semantics.
- Account-scoped IndexedDB review drafts, refresh recovery, guarded adoption and Undo. This is not history/settings storage migration.
- Default-OFF server source capability; canonical catalog, evidence search and source export hidden while disabled. No production schema migration or corpus import.

## Evidence

- Prior generated/inspected design reference: ../design/sources0438-reference.png; local-mode screenshots in ../screenshots/sources0438/.
- `check-local-organization.cjs`:320/390/768/1024/1440, light/dark, staged folders, no source POST or AI call, atomic save/Undo, refresh recovery/account isolation;390dark storage failure retains original and folder settings.
- Explicit-enabled candidate regression390dark: exact evidence, draft recovery, failure, concurrent edit and account guards. This synthetic fixture does not mean cloud production readiness.
- `npm run check`: icons/contracts/history/settings/storage/queue/sync regressions pass.
- Independent preview https://7ca30297.ai-vocab-tool.pages.dev :159 resource hashes, sync/anki-jobs/sources unauthenticated401, capability false and token-bearing source request503 verified. Deployed390light and1440dark isolated synthetic adoption/Undo/recovery passed. Screenshots manually inspected at both sizes.

## Deferred / Stop Boundary

## Production Verification: 2026-10-27

- Runtime commit d1b1795, pushed to main in the existing official repository.
- Production deployment https://7b1db1bf.ai-vocab-tool.pages.dev and official https://ai-vocab-tool.pages.dev . Official159 resources match local SHA256; sync/anki-jobs/sources deny unauthenticated requests401. Source capability returns false and token-bearing request503 before database access.
- Official390dark isolated synthetic flow passes staged classification, save/Undo, storage failure, refresh and account guards. No actual account/native Anki write was used.

## Remaining Work

Canonical sources/Teyvat remain incomplete: production migration connector failed twice, read-only confirmation found source tables/RPC absent. Prepared public chapter artifacts are not production coverage. No workaround migration attempted in this partial release.

Next time: finish source catalog/matching gates, then FSRS-6, batch screenshot/controlled automatic learning, history/settings IndexedDB migration, reviewed consolidation, non-destructive media/Bridge0.5 and confirmed AI crop. Full ledger: ../plans/2026-10-26-unfinished-delivery.md. Physical iPhone, actual media playback and Anki cloud sync unverified. No private learning records or native programs modified for acceptance.
