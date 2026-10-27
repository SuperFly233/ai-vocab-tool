# v0.43.12 Scene Analysis and Review

## Scope

Implemented the latest requested scene-analysis lifecycle and review changes. Bridge remains 0.4.1. This is not delivery of the outstanding canonical-source database, production Teyvat index, FSRS UI/service, full capture pipeline, old-data migration, consolidation or desktop heavy-media phases.

## Delivered

- Snapshot input before configuration/hash/storage awaits. Immediate Save can close the editor before a task is created; late binding still targets the saved group and its save-time revision, not a later revision.
- Save, editor close, supplementation close and visibility changes do not abort submitted analysis. A second import during active analysis creates its own durable task. Explicit Stop/account changes still cancel. Direct requests cannot promise continuation after browser shutdown or OS suspension.
- Global task entry shows pending count and distinguishes running/generated states via accessible names, hints and running feedback. No automatic retry or silent provider switch.
- Supplementation rebuilt after generating and inspecting `docs/design/scene-review-background-reference.png`: left scene list, one original/review workspace, aligned bottom-rule fields, full-width draggable learning targets and phone list/detail switching. Successful proposals persist after closing; duplicate background batches for the same account are refused. Adoption retains version/account guards and marks corresponding tasks reviewed.
- Nonempty title proposals default selected in editor review, task pool and supplementation. Persisted explicit deselection wins. Model responses do not overwrite in-flight manual edits or prewritten editor titles without explicit adoption.
- Common works can be entered in the existing AI configuration. Prompt accepts recognizable visual work candidates without inventing visible evidence, canonical IDs or official translation. Source basis/candidates are stored with analysis metadata and displayed as pending review. Existing visible-evidence validation remains.
- Scene More menu exposes read-only statistics and 84-day creation heatmap based on retained records, with shared scenes counted once. It is not a count of model calls, reviews or measured retention.
- Site Help/FAQ includes five concrete background-analysis acceptance steps, in addition to crop/media/Anki steps; synthetic image download remains available.

## Evidence

- `npm run check`: version0.43.12,74 icons, data/settings/storage/queue/sync/API contracts passed.
- `npm run check:scene-ai`: five widths320/390/768/1024/1440, both themes, consent/probe/image payload/common-work configuration, editable proposals, atomic failure, Undo, concurrent edit refusal, explicit cancellation and recovery passed with synthetic model responses.
- `scripts/check-scene-ai-tasks.cjs`: five widths/both themes, hidden-tab/save continuity, late A/B isolation, drag/keyboard reorder, editable existing-entry selection, adoption, reload interruption and no persisted credentials passed.
- `scripts/check-scene-ai-immediate-save.cjs`: three image tasks whose creation is deliberately held until AFTER three scenes are saved, independent binding, generated statuses, saved-revision protection after a later edit, title defaults and explicit rejection restore, supplementation close/recovery, real top/menu entries and heatmap counts passed. Additional390dark case imports a second image while the first analysis is running, then saves and verifies two tasks bound to one scene.
- `scripts/check-control-motion.cjs`: all supported widths/themes in that suite passed; no outer-control scale/translation introduced.
- Local screenshots in `tmp/scene-review-background/` and `tmp/scene-ai0431/`; desktop/mobile review and320dark statistics manually inspected. Generated reference contains fictional timestamps/double checkboxes/malformed calendar labels, deliberately not copied.
- Initial independent preview https://68ce282f.ai-vocab-tool.pages.dev:175 resource hashes and auth401 gates passed; source capability remainsfalse and token-bearing request503. Deployed390dark new flow and17-step synthetic-download help checks passed.

## Real Acceptance

Open Help and About -> FAQ -> real acceptance steps. Select the user's existing vision configuration, paste different synthetic images, immediately save each, switch tabs and inspect the top task pool. Review actual OCR, translations, title selection and inferred work labels. No saved user credential was extracted and no paid model call or private record/native Anki operation was performed by these tests. Physical iPhone, actual playback and Anki's own sync remain user-verification items.

Final preview/commit/production verification is recorded below only after completion.

Final preview: https://54065cee.ai-vocab-tool.pages.dev. All175 file SHA256 values and sync401 passed; source capabilityfalse/token503 passed. Final deployed390dark immediate-save/multiple-import/review/menu/heatmap flow passed. Manual acceptance UI passed five widths/both themes with4 groups/17 steps and no settings/learning writes. Unlink safety passed cancellation, storage failure, concurrency, account change and stale Undo. Actual comparison captures retained in `docs/design/scene-review-v04312-*-actual.png`.

Production: runtime commit `7cdbe5a`, pushed to main; deployment https://b6d66c8b.ai-vocab-tool.pages.dev and official https://ai-vocab-tool.pages.dev. Official175 SHA256/sync401, sourcefalse/token503 and deployed390dark immediate-save/late-binding/continued-import/review/title/menu/heatmap synthetic path passed. No production database migration or native helper update was performed.
