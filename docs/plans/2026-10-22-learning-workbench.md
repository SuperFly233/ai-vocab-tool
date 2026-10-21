# Lexi / Fushi / Anki Learning Workbench

## Design and Delivery

Image generation preceded implementation: docs/design/learning-workbench-v034-reference.png.
Use compact source list, readable original/translation/media, truthful connection rows and one preview workflow. Do not copy invented main navigation, fake status or sample assets.

Stage 1 v0.34.0: narrow reading fix, scene actions and integration entry. Stage 2 v0.34.1 / Bridge 0.2: audited migration, Windows build and real test-deck acceptance before enabling cloud jobs. Stage 3 v0.34.2: Fushi official CLI adapter, unified previews, scene import and audio cards. No phase is complete until verified and deployed; independent work continues if login is blocked.

## Acceptance Ledger (Pending Until Evidence)

Reliability: R1 narrow reading; R2 shared overlays/draft safety; R3 cloud owner/device/lease isolation; R4 recovery/idempotence; R5 Fushi read-only subprocess whitelist; R6 media hashes/paths and guarded undo.

Optimization: O1 reading hierarchy; O2 scene action hierarchy; O3 integrations settings; O4 companion preview layout; O5 independent safe field mapping; O6 truthful per-item receipts.

New: N1 Fushi sources; N2 dual-source preview; N3 confirmed Fushi-to-Lexi scene import; N4 stable source tracking; N5 image/GIF/audio cards; N6 actionable diagnostics.

## Boundaries

Fushi upstream reference: hajisensai/Fushi@185dcfdd940226631bbc42069088ae5ae24fdd12, packages/fushi_cli/README.md. Installed Fushi 3.0.0 passed read-only status. Use absolute installed CLI path, argv arrays, timeout, --no-launch --json and fixed read-only commands. Never consume its queue or access its database. Do not transfer private source data without explicit item selection.

No new Anki plugin; reuse companion and AnkiConnect. Dedicated model/deck and manual batch confirmation; do not alter original Fushi cards/templates/scheduling. Browser never connects directly to Fushi or reads its token. Cloud identity is server-derived. Real Anki writes, Anki own sync and physical iPhone playback are distinct acceptance gates.

## Initial Reproduction

R1 confirmed on v0.33.0: 320px result reading track is 258px but scene toolbar is 280px after Anki action insertion, yielding root scrollWidth 298 > clientWidth 294. Reading nav's internal horizontal scrolling is intentional. Fix toolbar shrink/wrap, not global overflow clipping.

Supabase production migrations `lexi_anki_bridge_tasks_v02` and `lexi_anki_website_review` applied through the connected management tool. Synthetic rollback transactions verified isolation/leases and website approval; original study_store data was not modified. Production sending remains disabled pending the full cloud-to-desktop acceptance.

## Architecture Correction: One Website, One Connector

User clarified that Lexi is the sole learning interface. New reference: docs/design/unified-learning-v034-reference.png. The initial standalone local card editor has been removed from the shipped helper page; local UI only handles independent device login, connection setup and diagnostics. Scene reading, deck selection, card preview and explicit confirmation belong to the existing website. Fushi-to-website item selection is still pending, not replaced by a second local workflow.

New jobs use confirmationMode=web. The desktop publishes a lease-bound preview, the website approves its random revision, and a database trigger prevents legacy start RPC calls bypassing approval. Target changes, new leases and regenerated previews revoke approval. Only integration-owned prior text fields enter the preview; local credentials/lease tokens never appear in it. The connector periodically prepares tasks and only executes approved previews.

Evidence so far: npm run check; check-anki-jobs.cjs (PGlite, real RLS/trigger and revision/target tests); Python tests (22 after review-worker cases); 20 website/helper UI cases across five widths and both themes. UI fixtures are not a real cloud round trip. Earlier dedicated real Anki test created two synthetic image/audio notes, skipped duplicate sends, checked both hashes and safely undid both notes; Anki's own sync and actual playback were not tested.

Security advisors: review table intentionally has no direct role grants or policies (RPC only); authenticated SECURITY DEFINER RPCs are intentional with fixed search_path and explicit owner/lease checks. Preexisting set_updated_at search_path and leaked-password-protection warnings remain outside this change.

Still required: website Fushi selection/import, web-triggered safe undo/open actions, real independent-account cloud acceptance, Windows package acceptance and final per-unit release report. Never mark these delivered based on local fixtures.
