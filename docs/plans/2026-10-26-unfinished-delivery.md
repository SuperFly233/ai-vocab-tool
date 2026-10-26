# Remaining Learning Work Delivery

Approved baseline: v0.43.7 / Bridge0.4.1. Execute in order, preserving all production safety fixes. Separate evidence is required for each stage; no stage or UI entrance counts as completion of later work.

| Release | Deliverable | Acceptance / status |
| --- | --- | --- |
|0.43.8|Canonical sources, incremental Teyvat evidence and reviewed classification|PARTIAL release: local inspection/source text/chapter/translation/classification/drafts/Undo only. Canonical sources, migration and production Teyvat evidence pending, backend default OFF|
|0.44.0|Explicit scene-target FSRS-6 memory|Pending; ts-fsrs5.4.2,90% retention/10 daily new, due-first, reveal/rating/curves, atomic idempotent events, offline conflict review|
|0.44.1|Batch screenshot intake and opt-in evidence-qualified save/query|Pending; shared pipeline,20-item and20-lookup budget, originals and manual edits protected, no automatic Anki approval|
|0.45.0|History/settings IndexedDB migration|Pending; durable async commits, verified readback before legacy removal, accounts, multi-tab, backup/sync and quota recovery|
|0.45.1|Reviewed duplicate consolidation|Pending; identity/language/direction matching, atomic versions/folders/links/tombstones, explicit memory conflicts, guarded Undo|
|0.46.0 / Bridge0.5.0|Non-destructive image/GIF/video editing|Pending; retained originals/audio/animation, single-worker time/resource limits, optional verified Windows media component, bounded operations only|
|0.46.1|Confirmed AI crop and end-to-end closure|Pending; editable suggestions and deterministic derivatives, tutorial/download updates, full learning-to-card-preview acceptance|

All new UI uses the shared theme, Lucide, bottom-rule content editors, drag handles, dangerous-action red and common more menus. No new main navigation or local learning editor. For each stage: generate/inspect reference, record decisions, implement, independent preview, inspect five widths/light-dark screenshots, safety tests, commit/push, deploy and verify resource/auth/download hashes. Databases are additive and isolated before production migration. Native operations use synthetic content and Lexi acceptance deck only. Bridge build180s/selftest45s, full package hashes; a real BSOD stops external native operations.

Physical iPhone, actual device playback and Anki cloud sync remain explicitly unverified until evidence is available. They do not block unrelated software delivery and cannot be represented by simulated results. Once all functional stages pass, stop without adding another round.

## Stop Boundary: 2026-10-27

User requested publishing the verified usable subset now and continuing remaining work next time. Do not start FSRS or later stages in this round. Canonical source/Teyvat production gates remain unresolved; connector failed twice and source tables/RPC are absent. No production corpus imported. See ../reports/v0438-local-organization-release.md.

## Stage0.43.8 Design Decision

Generated reference: `docs/design/sources0438-reference.png`, inspected before implementation. Retain three aligned desktop regions, stacked mobile and one fixed adoption footer. Reject invented navigation, audio/video players, certainty scores and example coverage as real data. Use the current dark/light theme and bottom horizontal rules. Scanning makes no model calls; source catalog saving is distinct from scene adoption. Folder preparation must not change existing settings until the final atomic save.
