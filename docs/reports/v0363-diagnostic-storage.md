# v0.36.3 Diagnostic Storage Recovery

## Actual Cause

User confirmed real black-white inference succeeds, then supplied a remaining local quota message. Read-only cloud metadata (no private record body output) showed history at1,796,490 characters and logs at1,708,102. Aggregate inspection found2 of80 logs contain HTML/embedded images, totaling1,696,508 message characters. Prior latest-result deduplication did not address these diagnostics.

## Fix and Safety

Full logs move to the separate `lexi-diagnostics` IndexedDB database. Startup waits for migration; the destination transaction must complete and its read-back match exactly before the old localStorage log key is removed. Existing archives and reappearing legacy entries are reconciled. A failed/blocked migration retains legacy values and explicitly warns, rather than assuming success. Normal80-entry log retention remains unchanged.

Learning history/settings keep their existing synchronous localStorage persistence and rollback contract. The shared storage facade redirects logs only; cloud wire format is unchanged and synchronization waits for log writes. No cloud schema or user-record mutation. Black-white direct mode remains unchanged. Cross-tab locking/broadcast plus transactional merge avoid losing distinct concurrent log additions.

Legacy HTML/long diagnostics use a bounded text preview; the original log messages remain available through complete JSON export. Explicit clear updates IndexedDB and survives reload. No learning data or original media are cleared to recover space.

## Evidence

- `check-diagnostic-storage.cjs`, Chromium and desktop WebKit at390/1440: genuine quota exception; 1.7-million-character legacy diagnostic migration;120 full entries with15,000-character content each merged/restored; full diagnostic export; repeated reload; multi-tab updates; explicit clear; injected IDB write failure retains legacy data.
- Earlier Chromium stress also passed2.7-million-character logs plus200 large entries; final fixtures match the user's scale and WebKit's smaller Web Storage quota.
- Existing data/settings/storage/sync/contracts and black-white direct browser tests passed; mobile notification/core-meaning regression additionally checked.
- Screenshots under `tmp/diagnostic-qa/settings-{chromium,webkit}-{390,1440}.png`, synthetic records only.

## Limits

Physical iPhone, the user's exact browser and authenticated end-user synchronization remain to be confirmed by refresh. IndexedDB can still fail under disk pressure/private restrictions; fallback preserves originals. Entire history/settings are NOT migrated and an arbitrarily large history can still reach Web Storage limits. Diagnostics are not automatically pruned beyond existing80-entry retention. No Anki/Fushi or v0.37 feature release in this hotfix.

## Deployment

- Code commit `25dbc26`, pushed to `origin/main`.
- Preview https://70dcd7e8.ai-vocab-tool.pages.dev ; production https://ai-vocab-tool.pages.dev ; immutable production https://477db778.ai-vocab-tool.pages.dev .
- All33 production resources match final dist hashes, authentication protection and390/1440 browser checks passed.
- Actual production-page isolated Chromium fixtures at390/1440 additionally passed genuine quota reproduction, full log migration,120 large-entry merge/reload, full export, cross-tab updates, explicit clear and injected migration-failure preservation. No authenticated user rows were altered.
- Desktop WebKit local fixtures passed the same migration/data cases; physical iPhone still requires the user's refresh/sync confirmation.
