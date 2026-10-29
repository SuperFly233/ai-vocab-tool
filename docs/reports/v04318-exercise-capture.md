# v0.43.18 Exercise Capture / Web Stage

## Implemented

- Existing home/scene actions open a large-type capture workspace, not a second main navigation.
- PNG/JPEG/WebP originals and per-account receipts persist before model consent/request. New scenes save first; clear complete single utterances auto-fill after generation, with exact bound scene revision checks.
- At most two scene analyses execute concurrently through shared browser locks. Extra intake remains saved; errors/recovery do not silently repeat requests. Closing UI or hiding a tab does not abort analysis.
- Backlog response contains independent utterances, speakers and normalized bounds; no concatenated speakers. Unique pointer selection or complete single candidate can select automatically; ambiguity stays available for one-click choice.
- Contextual target clicks and exact multiline Enter input reuse existing query/association queue. Multiple existing records require a choice. No automatic Anki approval.
- Large30-34px reading text and64px primary actions, desktop image/reading columns, phone recent-task strip; secondary operations collapse. Tasks remain independent from query completion.
- Static annotation and optional Bridge capture are NOT implemented by this stage. Bridge remains0.4.1; canonical sources/memory gates unchanged.

## Verification

- Generated reference inspected before implementation: ../design/exercise-capture-reference.png. Rejected generated navigation/invented data; actual populated screens manually inspected.
- Five widths320/390/768/1024/1440 x light/dark: three screenshots, two running slots, detached auto-save, Backlog one-click choice, exact multiline Enter, persisted refresh, no secrets/overflow passed.
- Safety: in-flight manual edit refuses automatic overwrite; failed scene save retains original/receipt and dispatches no model; refresh and account switch guarded.
- Existing scene-AI contracts,390dark editor/supplement safety and immediate-save/late-task binding passed. Immediate-save regression now resolves two concurrent jobs before the queued third; asserts no task loss.
- Shared control-motion eight cases, npm check, manual acceptance390dark passed. Help now contains five groups22 explicit steps.
- Earlier independent previews18034d9f and728b09ae passed189 resource hashes and sync/Anki/source401; final desktop arrangement follows after screenshot inspection. Final release evidence appended only after deployment.

Model responses are synthetic/mocked, not paid private-image quality testing. Physical iPhone, native Bridge capture, live exercise readability and real Backlog OCR quality remain unverified.

## Release

- Runtime9493184 pushed to main. Final preview https://260bf5c0.ai-vocab-tool.pages.dev :189 SHA256 resources plus sync/Anki/source401, actual1440dark synthetic flow passed.
- Production https://4aed30ae.ai-vocab-tool.pages.dev / https://ai-vocab-tool.pages.dev :189 SHA256 resources plus sync/Anki/source401; actual official390dark capture/Backlog/auto-save/refresh passed.
- Screenshots desktop.png/mobile.png in v04318 folder were manually inspected. No real model or physical device claims.
