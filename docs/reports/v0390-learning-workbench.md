# v0.39.0: Scene x Entry learning workbench

Date: 2026-10-24. Candidate report, deployment verification pending.

This release completes the scoped organization/quick-learning implementation after stage A v0.37.2. It does not release the separate screenshot preview or a Teyvat search index. No native Fushi/Anki operation, database migration, paid inference or private cloud-record write was performed in this iteration. Browser fixtures use isolated synthetic local data.

## 24 acceptance units

| Unit | Status | Implementation and evidence |
| --- | --- | --- |
| R1 Header layout | Fixed; released in A | Visible-header geometry and non-retained view stacking context; workbench five-width/two-theme hit-target regression. A code4d149cf/production15c0a33b. |
| R2 Safe opening | Fixed; released in A | Shared pointer/selection intent guard, title links, independent controls; workbench row/keyboard/drag tests. |
| R3 Save/draft protection | Optimized + regression passed | Scene and inline-name failed saves keep inputs; unchanged close, changed confirm/Undo; authoring-polish, organization and scene-safety fixtures. |
| R4 Task identity/recovery | Regression passed | Existing queue identities and recovery retained; explicit existing-entry association, accepted basket removal; lookup-tasks, navigation and quick-learning fixtures. No real-provider interruption acceptance claimed. |
| R5 Organization synchronization | Complete; contract tests passed | Independently clocked scene favorite/pinned/folders and entryLearning, explicit clears, deterministic old/new merge and backup roundtrip; organization-data + settings-app. No authenticated two-device field sync tested. |
| R6 Shared deletion/Undo | Fixed + regression passed | Explicit folder IDs no longer guessed as legacy tags; folder deletion removes classification only. Account/clock/object guards retain later edits and tombstones; favorites boundaries and scene-safety. |
| R7 Input/mobile | Complete; emulated regression passed | IME guards, multiline Enter, separate explicit submit, bounded suggestions, 16px fields; quick-learning/organization/authoring five widths x two themes. |
| R8 Performance/storage | Complete within browser-fixture scope | Scene list batches60, lazy visible thumbnails; offline lexicon in Worker. Existing quota/rollback/export protection retained; storage tests and bounded list implementation. Large-scale physical-device profiling not performed. |
| O1 Design-first | Complete | Generated and inspected docs/design/scene-learning-workbench-reference.png before implementation; flat lists and text-first layout decisions recorded in plan. |
| O2 Whole-row pattern | Complete | Scene, linked entries/tasks, history/favorites use shared intent rules, real title links, blue underline hover without outer scaling. |
| O3 Shared toolbars | **Partial** | New organization controls share semantics and placement; existing reading/card actions preserved. Full low-frequency more-menu consolidation remains pending. |
| O4 Quick capture | Complete | Quote and optional adjacent phrases precede translation/media; text-only save and explicit save-and-query; no image requirement; quick-learning fixtures. |
| O5 Filters | Complete | History baseline, independent scene/folder filters and clocks, reset, typed mixed counts; private searches excluded from shared preferences; view-preferences + organization. |
| O6 Bidirectional relations | Complete; regression passed | Precise scene links and entry links, existing selection/return state retained; navigation five-width/two-theme tests and real hrefs. |
| O7 Feedback | Complete within scope | Save failures inline, routine queue states stay in place, accepted phrases removed, failed terms remain; guarded actions retain Toast Undo. |
| O8 Settings | Complete | Existing category contains local suggestion preference and shortcut explanation; editing hints and hover tips remain separate; no new main navigation/category. |
| N1 Scene favorites | Complete | Independent groupId favorite in list/detail/entry scenes; all/entry/scene filter with counts, bilingual summary highlights. |
| N2 Pins | Complete | Independent pin field, pinned-first sort, no scene body timestamp mutation or featured reuse; organization UI/data tests. |
| N3 Mixed folders | Complete | Typed IDs, shared folder definitions, multiple memberships, last membership removal keeps favorite, unfavorite clears membership; atomic history+settings save and guarded Undo. |
| N4 Bulk organization | Complete | Explicit selection mode, typed targets, favorite/folder/remove/unfavorite; no permanent bulk delete; mixed390dark fixture. |
| N5 Suggestions | Complete | Personal multilingual prefix first, word-list4.1.0 MIT local Worker, at most8; spelling suggestions explicitly labeled, no input upload or inference. Version/license/hash recorded under vendor/word-list. |
| N6 Shortcuts | Complete | Singleline Enter adds phrase; candidate Enter fills only; multiline Enter newline; Ctrl/Cmd+Enter saves; IME does not submit. |
| N7 Existing reuse | Complete | Exact Origin or unique exact title reuses existing entry; explicit rerun allowed. Ambiguous/similar titles are not silently merged; no extra model request in reuse fixture. |
| N8 Review | Complete | Current mixed folder scope, scene front/reveal and per-association state, separate standalone entry state and guarded Undo; unassociated scenes never blanket-marked mastered. Existing review engine, not new spaced repetition. |

Summary: 23 acceptance units implemented or regression-passed, 1 partial (O3). Reliability statuses are not a claim of8 distinct newly discovered bugs. Confirmed root fixes are header stacking/geometry, row intent handling (stage A), and explicit folder-ID migration; additional mobile selection-bar and empty-source-label polish is separate.

## Verification

- `npm run check`: passed at v0.39.0 (contracts, data, settings, storage, queue, sync, media API, icon subset).
- `scripts/check-workbench-release.cjs`: final run in progress; includes organization data/UI, quick learning, row opening, bidirectional navigation, authoring, scene safety, mixed review, favorite boundaries, real local HTTP/SSE streaming, modal dismissal and control geometry.
- Complete-card UI regression passed five widths x two themes using mocked task interfaces. Existing Anki behavior preserved; no actual new cards were written.
- Browser widths320/390/768/1024/1440, light/dark. Motion additionally checks320/390/768/1440; modal checks390/1440. Relevant screenshots inspected manually; selected evidence retained below after final verification.
- `git diff --check`: passed. No `window.prompt` remains in application JS. Folder names are inline forms; invalid/failed saves do not erase input.

## Separate unfinished ledger

[Teyvat read-only investigation](teyvat-integration-investigation.md) rechecked local0.10.2/9145b2a. Catalog/chapter API and bilingual identities are understood; incremental search index, coverage, canonical aliases and reliable automatic matching are not implemented. Existing reader verifies chapter/quest links, not precise line focusing.

Screenshot intake remains on feat/capture-intake-preview. Real provider image acceptance, configured/manual vision modes, source normalization, automatic save/query, non-destructive image/GIF/video editing and full history/settings IndexedDB migration remain pending. See ../plans/2026-10-23-learning-release-ledger.md. This release is not evidence those capabilities shipped.

The screenshot preview currently includes common fixes through v0.37.1, not this entire v0.39.0 implementation. Its next merge/retest/deployment is a separate pending release step; do not overwrite that branch or advertise parity before verification.

Physical iPhone, actual audio/video playback, real provider calls, authenticated cross-device synchronization and Anki's own synchronization were not tested this iteration. Test fixtures do not substitute for these.

## Release

Candidate v0.39.0; commit, independent preview, production resource hashes and URLs will be appended only after successful verification. Existing v0.37.2 production remains verified until then.
