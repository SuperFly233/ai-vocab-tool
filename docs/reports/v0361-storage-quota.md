# v0.36.1 Storage Quota Hotfix

## Scope

The reported message does not prove a Supabase quota failure. Local sync application writes browser storage and previously passed a raw DOMException through the generic cloud error formatter. Production-device storage has not been inspected.

Reproduced defect: history stores the same latest result both on each entry and its first roll. A large incoming merge exceeds localStorage even though the full distinct data fits. The hotfix omits only exactly identical duplicate entry results; all versions and metadata remain. Legacy normalization restores the usual in-memory result field. Exports still include full content.

Batch writes shrink values before growing others. Failed writes retain the prior batch and report whether rollback failed. No records, media, credentials, logs or unrelated storage keys are automatically deleted.

## Evidence

- `npm run check`: data/settings/scenes/storage/queue/sync/API/contracts passed.
- `scripts/check-storage-state.js`: true quota overflow and full rollback; shrinking-first bounded batch; legacy/distinct result preservation and non-mutating compaction.
- `scripts/check-storage-quota-ui.cjs`: isolated Edge at 390 and 1440, real localStorage exception for 300 synthetic full entries; incoming merge succeeds with approximately 48% reduction, all 300 full results/notes/versions intact after reload.
- Screenshots: `tmp/quota-qa/history-390.png`, `tmp/quota-qa/history-1440.png` (synthetic data).

## Limits

Not unlimited storage: a sufficiently large collection still requires a future account-aware IndexedDB migration. No physical iPhone test and no access to the user's reported failing browser state. No cloud quota increase, no Anki/Fushi changes and no new Bridge release. v0.37 complete-card work is deliberately excluded.

## Deployment

- Code commit: `e97501d`, pushed to `origin/main`.
- Preview: https://ee4be313.ai-vocab-tool.pages.dev (one final error-copy improvement subsequently included in production).
- Production: https://ai-vocab-tool.pages.dev ; immutable deployment https://6206873a.ai-vocab-tool.pages.dev .
- Production verification: all 28 static file hashes match final `dist`; unauthenticated integration access returns 401; isolated 390/1440 browsers verify v0.36.1, all four main views, scroll/header behavior, preferences and no horizontal overflow.
- No authenticated user-data modification, Anki/Fushi operation or cloud schema migration during this hotfix.
