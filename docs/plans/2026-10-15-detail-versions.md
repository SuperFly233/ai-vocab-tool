# Detail and Version Workbench

## Requirements

- Delete individual or selected generation versions, confirm first, retain at least one, and offer undo. Stale synchronization must not revive deletion.
- Make generation/import, naming, default display, comparison and non-destructive integration accessible from the detail view.
- Integrate selected versions into a new result with an explicit base for scalar fields and exact deduplication of senses/collocations/confusions. Never silently discard conflicting meanings or modify source results.
- Fix overlap between version navigation and the visual editor when scrolling on desktop and touch devices.
- Preserve draft guards, editing/export consistency, folder/fragment relationships, and deterministic merge/order semantics.
- Verify with pure tests, production merge functions, actual browser interactions and screenshots. Deliver explicit bug/improvement/feature counts and deployment status.

## Design

The version strip lives outside the only content scroller. The editor directory alone sticks inside that scroller. A flat version manager provides selection, inline naming and icon actions. Import accepts structured entry JSON, not arbitrary history arrays. Comparison displays expandable source summaries and a complete merge preview. Sources are retained and provenance lives on the new roll, not model content.

Version ids survive edits. Roll tombstones reconcile by timestamp; explicit undo is a newer write. Default ordering has a separate clock so unrelated metadata updates cannot reverse it. Exact-content deduplication remains in place. There are no new AI requests or backend credentials.

## Verification

- [x] Pure reconciliation and integration tests.
- [x] Browser deletion/undo/stale sync/default/name/import/merge/draft/export tests.
- [x] Desktop/mobile light/dark scrolling, width and screenshot inspection.
- [x] Existing full checks and learning/responsive regressions.
- [x] Release and production verification.

## Evidence and Delivery Counts

`npm run check` passes data, contracts, history, settings, storage, lookup and sync tests. `check-versions-ui.cjs` passes six real-browser contexts: 320/390/1440px, each light/dark. Tests exercise actual clicks/taps, CDP touch long-press dragging and native horizontal swiping, downloads, refresh persistence, malformed imports, last-version protection, quota failures, stale source integration and in-flight generation snapshots. Existing learning workflows pass four desktop/touch contexts. Responsive checks pass 320/390/768/1440px with normal and unbroken long text.

Screenshots are in the host temp directory `lexi-v021-qa`. Inspected dark mobile scrolled visual editing, light desktop integration and light/dark 320/390px version managers. The version strip is outside the body scroller; geometry asserts the editor directory stays below it and content stays inside the viewport.

Fixes (7): overlapping sticky regions; stable-id edited versions duplicating on merge; in-flight generation overwriting live version changes; preview mutating source JSON; version changes leaving title/Origin stale; JSON export ignoring drafts; default ordering reversing after stale merge/new generation.

Existing workflow improvements (3): compact height-stable version strip; separate touch swipe and long-press grip sorting; persistent top save action and draft guards.

New features (5): single/bulk version deletion with undo and sync tombstones; version naming; explicit default display version; validated JSON version import; comparison and non-destructive integration with base selection, preview, deduplicated knowledge lists and source provenance. The flat manager groups these actions without nested cards. Integration is deterministic and does not invoke an AI model; scalar conflicts follow the chosen base and differently worded list items remain distinct.

Release v0.21.0: implementation commit `9e26b97` followed by the final scalar-metadata preview patch. Published to Cloudflare at https://e9b15cdf.ai-vocab-tool.pages.dev . Production `/history` returned HTTP 200 and the final `/app.js?v=0.21.0-20261015.2` asset; the fetched source includes version deletion, scalar comparison and roll reconciliation. The final patch passed all six browser contexts and `npm run check`; `npm run build:pages` produced the deployed static output. Unrelated pre-existing Wrangler development logs were not committed.
