# v0.43.1 scene AI and contextual meaning

Date:2026-10-26. This is the first approved stage, not completion of canonical sources or spaced repetition.

## Release

- Runtime: `4e74b3a` (initial implementation `8b1b2ec`, reviewed choices `52490ea`, cancellation `90cff58`).
- Final preview: https://20da9ace.ai-vocab-tool.pages.dev
- Production immutable: https://169f8dc6.ai-vocab-tool.pages.dev
- Production: https://ai-vocab-tool.pages.dev
- Final preview and production153 static resource hashes match the build; anonymous sync returns401. Bridge remains0.4.1; no native binary/template/scheduling changes or database migration in this stage.

## Delivered acceptance

| Area | State | Evidence |
| --- | --- | --- |
| Existing scene editor image analysis | Complete | Explicit profile/cost consent, optional auto static-image analysis, one-command/field commands and stop; originals retained |
| Contextual learning targets | Complete | Stable IDs, exact original fragments, concise contextual meaning; existing supplied senses can be selected with provenance, other meanings unchanged |
| Concentrated editable Check | Complete | Blank fields filled; old/manual fields preserved; uncheck retracts untouched AI fill, not manual edits; all suggestions survive local refresh recovery |
| Scene checks and supplementation | Complete | Read-only scan/filter, up to20 selected scenes, original/media/proposal workspace, editable field adoption, per-item retry and recoverable local drafts |
| Atomic adoption and Undo | Regression passed | Whole-batch account/object version checks, failed-commit preservation, concurrent-edit refusal, original notes retained and guarded Undo |
| Six settings groups | Complete | All old controls retained; search/category stationary, independent content scrolling and correctly targeted return-to-top above5% |
| Responsive short-status fix | Complete | Quantity and chevron grouped; automatic title does not defeat exact-content/media dedupe; different substantive content still distinct |
| Old word-entry supplementation/card flows | Regression passed | Existing word-entry new-version process and full-content card preview tests remain; this stage does not redesign that separate word-entry editor |

## Actual provider acceptance

Used the user's exact saved `claude-sonnet-5` configuration at the saved black-and-white endpoint, from official preview0f032288. Secure vault session/settings retrieval, isolated Edge `--no-proxy-server`; no system proxy changes, credential logging or private screenshot use. Two real image calls: random-digit capability challenge and a synthetic bilingual museum image.

The actual editor extracted `I clocked the detail.` / `我注意到了这个细节。`, and selected the supplied existing sense `注意到` (`provenance:entry`). Explicit local save succeeded, the synthetic existing word was associated, and its deliberately different full-entry core meaning remained unchanged. The existing card-preview interface opened with the scene. That card service was mocked: no real cloud learning records or native Anki cards were written by this acceptance. Evidence: credential-free `tmp/scene-ai-live-evidence.json`, local harness `tmp/check-scene-ai-live.cjs`, synthetic screenshots in `docs/screenshots/scene-ai0431/`.

## Tests and visual evidence

- Five widths320/390/768/1024/1440 × light/dark: auto/manual consent, full JSON validation, long original/meaning, Check cancellation/manual preservation, explicit save, same bytes with changed AI title dedupe, no-model scan, body/panel/button bounds. Deployed pre-final preview ran the full matrix; final preview and production390dark smoke additionally pass.
- `check-scene-ai-safety.cjs`: atomic failure, editable fields, guarded adoption/Undo, concurrent changes, account-keyed refresh draft, manual target, explicit text title, stop/late-result protection. Former maintenance test entrypoint delegates to this replacement contract.
- `npm run check`, settings clock/metadata credential exclusion, old-client missing-field vs explicit clear, backup roundtrip, settings refinement10 cases, motion8 cases, tutorial10 cases/safety, learning-card10 cases, word-entry supplementation390dark, manual Home scene continuity390dark pass.
- Generated reference: `docs/design/scene-ai-v0431-reference.png`. Real screenshots manually inspected: desktop editor, mobile contextual meaning, batch layout, mobile/desktop settings and actual synthetic-provider editor. Kept existing theme/Lucide, added bilingual highlight inputs and placed detailed source fields lower rather than copying invented counters/source certainty. No claim of pixel-identical rendering across viewports.

## Current operation

Settings -> 模型采集 -> 场景 AI 分析 chooses the model, auto/manual mode and image scope. In an existing scene editor, import a PNG/JPEG/WebP or click 分析场景, then Check, edit and save. With no original text, use scene AI first rather than attempting a text-only title. Existing scenes are scanned without API calls; select records before batch analysis. AI does not automatically query words or approve Anki writes.

## Explicit remaining work

v0.43.2 canonical source identities/aliases, Teyvat incremental bilingual evidence/coverage and folder proposals: not implemented. v0.44.0 FSRS scene-target enrollment, ratings1-4, due schedule, curves, independent event API/offline synchronization: not implemented; current review remains browsing/manual state. Separate batch-screenshot intake remains preview-only. General source matches are still editable AI suggestions, not verified canonical matches.

Physical iPhone, real media playback, Anki own sync and a newly repeated native portable-deck acceptance are not verified in this stage. GIF/video remain supported as scene originals/display, not full-animation/video AI recognition or non-destructive editing. Consolidation, large learning-data migration, media editing and AI crop retain their previous ledger entries.
