# v0.43.8 Source And Classification Candidate

## Status: Not Released

This is the first stage of the approved all-debt plan, not completion of the seven-stage iteration. Production remains v0.43.7 / Bridge0.4.1. Source catalog, SQL/API, incremental builder and review UI are implemented and locally tested; production migration and authenticated real-source acceptance have not passed.

The Supabase migration connector failed twice with `Invalid or expired requestState`. A subsequent read-only database check confirmed both `public.lexi_sources_catalog` and `public.lexi_sources(text,jsonb)` remain absent. No DDL is retried blindly or routed around the migration/approval mechanism. Do not merge this candidate into production or advertise the source feature as live until the migration, public-index import and authenticated acceptance succeed.

## Implemented And Verified Locally

- Account-isolated canonical catalog, normalized-name/confirmed-alias uniqueness, optimistic revisions and stable source references across renamed catalogs.
- Authenticated public invoker RPC delegates to an explicit-account-checked private implementation. New public tables have RLS, no anonymous access, and no direct catalog mutation grant.
- Shared source reference validation rejects unsafe evidence URLs and retains optional references when old scenes/backups omit the field.
- Original/evidence/classification review: editable proposals, staged folders, up to20 adopted scenes, atomic scene+organization write, safe Undo, account/revision/storage failure protection.
- Account-scoped IndexedDB catalog and review drafts; refresh recovery, account-change closure and late-response rejection. Existing history/settings are not yet migrated.
- Public Teyvat builder uses real schema3 chapter data, validates identities/languages, writes hashed atomic artifacts and a resumable manifest; failed chapters retain previous good output. This does not upload public corpus to clients or use private records.

## Tests And Evidence

- `npm run check`, `check-sources.cjs` (PGlite SQL and data/legacy/index contracts), `check-sources-api.cjs` (auth, allowlist, bounds, conflict/status and feature switch).
- Source workspace:320/390/768/1024/1440px in light/dark themes; synthetic API fixtures, no model calls. Scan, editable exact-evidence proposal, staged folder creation, atomic adoption/Undo, reload, network and account guards.
- Additional390dark storage-failure and concurrent-scene-edit refusal tests; source save cannot produce half-applied classification.
- Additional1440dark protected Undo: a created folder subsequently used by another scene is retained; the old source adoption cannot remove later organization.
- Existing scene AI safety and unlink safety passed. Navigation matrix passed, including running lookup links and partial collocation translations. Motion and final-preview gates are recorded separately when complete.
- Real prepared public data: chapter1700 has1728 lines, chapter1500 has1218 lines; catalog reports1737 entries. Requested old chapter1000 returned404 and remains an explicit failed checkpoint. These2946 lines are **prepared artifacts, not production-index coverage**.
- Reference generated/inspected: `docs/design/sources0438-reference.png`. Three desktop regions and a fixed adoption footer retained; invented navigation, media players, certainty scores and example counts rejected. Existing theme, dropdowns and horizontal editor rules retained.
- Initial isolated preview https://ede14f36.ai-vocab-tool.pages.dev :159 exact resource hashes; unauthenticated sync/Anki/source endpoints return401. Deployed390light synthetic source workflow passed. This tests deployed components with fixtures, not a real database/source closure. Eight motion-contract cases passed.
- Final isolated preview https://8f76c627.ai-vocab-tool.pages.dev / https://sources-v0438-preview.ai-vocab-tool.pages.dev :159 resource hashes and all three401 checks passed; deployed1440dark later-folder-use Undo refusal passed. Production `app.js` was read back and still reports0.43.7.
- Wrangler local Worker startup failed with `spawn EFTYPE`; no system runtime was modified. The fallback static-only preview uses `scripts/serve-source-preview.cjs`, explicitly returns503 for all API routes and cannot sync records or call models. No frontend-only button is counted as a working production source service.
- Synthetic screenshots saved under `docs/screenshots/sources0438/`; prepared public index hashes verified by `scripts/check-source-index-integrity.cjs`.

## Resume Gate

1. Recheck production schema; only apply `migrations/20261026_sources.sql` if still absent and the migration connector works.
2. Import prepared public rows through bounded operator batches into the private staging table, then atomically swap one complete verified chapter and coverage record. No private catalog or scene fixtures in production.
3. Authenticate using the existing safe session, verify account isolation and actual search/evidence/coverage. Use synthetic learning records only for the full browser acceptance.
4. Finish preview screenshots and production gates, commit/push, release, verify all resources/auth and update the ledger. Until then keep this on the isolated candidate branch.
5. Proceed with FSRS0.44.0, batch0.44.1, migration0.45.0, consolidation0.45.1, media/optional component0.46.0 and AI crop0.46.1 in order. None is completed by this candidate.

Physical iPhone, actual device playback and Anki cloud sync remain unverified, as explicitly agreed. No native software, old Anki templates, existing cards or review scheduling was modified.
# Superseding Partial Release Decision (2026-10-27)

User requested publishing verified local inspection/classification only, leaving cloud sources/Teyvat and later work for next time. See v0438-local-organization-release.md for current release evidence. The candidate account/index testing below remains historical; production cloud capability defaults OFF. No successful production migration or corpus import is implied.

