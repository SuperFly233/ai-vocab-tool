# v0.42 implementation checkpoints

Approved order: A legacy entry supplementation (0.42.0), B reviewed duplicate consolidation (0.42.1), C validated screenshot recognition (0.42.2). Do not claim all18 units complete after A.

## Design decisions

Generated and inspected `docs/design/entry-maintenance-v042-reference.png` before implementation. Use the compact list/reading workspace and persistent footer; phone list enters detail with a back action. Reject fictional dictionary attribution and preselected entry checkboxes. AI proposals are unverified suggestions, not official dictionary quotations. Keep original identity and versions.

## A acceptance

1. Missing structure scan from history/favorites More, within current browsing range; short values are not missing.
2. Explicit item/section selection, max20, scan has zero model calls.
3. Current configured text model shown; same provider path, no key in drafts; structured220KB bounds, no silent truncation.
4. Read original alongside editable section suggestions; retry individual failures, retain successful proposals.
5. Atomic batch adopts new default rolls, retains all old rolls/Origin/notes/folders/scenes. Canonical entire-record fingerprint and account checked before commit.
6. Local IndexedDB drafts recover on refresh without inference. Guarded discard/undo and adoption undo; unchanged existing Anki snapshots.

## Pending B and C

B must introduce shared query matching, reviewed per-group selection/conflict resolution, atomic reference migration, synchronized consolidation trace/tombstones and guarded undo. Existing private duplicates remain untouched until explicitly confirmed.

C must merge preview selectively, add default/manual vision preferences without syncing new secrets, pass actual provider image probe, validate structured extraction/source evidence, and exercise full lifecycle before production enablement. No real-provider acceptance has happened in A.

Teyvat index, automatic save/query, non-destructive media editing/crop and large-data storage migration remain separate ledger rows.
