# Screenshot learning: first preview checkpoint

Production is v0.39.1. This branch is an independent preview of part of the approved v0.38 scope, not a completed v0.38 release. Common streaming/navigation, organization/quick-learning and consistency fixes have been merged into this preview separately; screenshot features remain absent from production.

## Implemented

- Desktop batch list/review; mobile list/detail; provider options collapsed; fixed action footer. Uses the previously generated/inspected reference, real components and existing themes/icons.
- Selected-file picker, clipboard file paste outside text fields, and drag/drop. PNG/JPEG/static WebP only; reject GIF/video/animated WebP instead of silently flattening them.20items,8MB/item,40MB/batch,24MP/20000px guards. Original bytes remain hash-addressed in existing media IndexedDB; only a bounded2048px JPEG copy is sent for recognition.
- Account-scoped per-tab intake session and IndexedDB drafts. Refresh restores without inference; interrupted running items recover as retryable. Credentials are never persisted in intake drafts.
- Explicit random image-digit capability probe, bound to endpoint/model/key digest and one-hour memory TTL. Recognition requires the selected profile to pass first. Browser-direct OpenAI-compatible/CORS only; no cloud/provider fallback, no claim every third-party model supports images.
- Structured quote, visible/machine/manual translation provenance, independent highlights, candidate terms, visible-source evidence and uncertainty notes. Guessed source stays separate from confirmed source. Exact existing names reused; fuzzy canonical identity and game database matching are not implemented.
- User corrections take priority; successful extraction is not rerun silently. Save one current scene with stable original-file identity; repeat does not overwrite existing edits or restore tombstones. Reuses query queue; Anki remains independently approved. Saved scene opens existing learning workflow.
- Common Esc/backdrop dispatcher; no changes closes immediately; dirty discard confirms and offers account/session-version guarded Undo. Quota failure during discard keeps the window/input open. Scene-save Undo skips later changes or associations.

## Evidence

- `npm run check` and `npm run check:capture` pass.
- `check-capture-ui.cjs`:320/390/768/1024/1440,light/dark; actual IndexedDB originals, duplicate screenshot, edit/Undo,double-save, refresh,16px input and overflow checks. Synthetic screenshots in `tmp/dialog-qa/capture-v038`.
- `check-capture-vision.cjs`: mocked service, random challenge pass/fail, no unvalidated uploads, field correction priority, untrusted-source separation, invalid-term preservation, credential-free refresh, quota failure and late account result rejection. No real Key or paid model request used.
- Existing complete-card UI five-width/two-theme, shared control geometry and nested-modal dismissal regressions pass. No real Anki/Fushi changes in this checkpoint.

## Not delivered by this preview

Real provider vision acceptance; settings-level synchronized default/manual vision modes; canonical source records/aliases; Teyvat incremental quotation matching/coverage; reliable automatic scene saving and lookup; image/GIF/video crop/trim/resize and assistant fallback; AI crop proposals/confirmed derivatives; full history/settings IndexedDB migration. Physical iPhone, actual media playback, Anki cloud sync and native-tray popup appearance remain unverified.

Keep these limits visible in the delivery ledger. Do not call a mocked vision response real recognition, manual scene confirmation automatic source matching, or a preview deployment production release.

## v0.39.1 common-fix roll-forward

Follow-up v0.39.2: merge `dc941d663cf406f6db08dabf10a9da5eb4e80567` carries minute list timestamps and explicit two-line full-time hints. Independent deployment https://d15ce409.ai-vocab-tool.pages.dev . Four changed assets (app/styles/index/manifest) match local hashes; capture contracts and320/390/1440 light/dark timestamp interactions pass locally and deployed. No new recognition capability is enabled.

Merge `6afcd567cda2c49c475a2ebc56c8224560e75d71` preserves screenshot metadata/import, adds the new organization and shared UI modules, and regenerates a73-icon subset including capture. No wholesale old-file replacement. `npm run check`, capture contracts, local five-width/two-theme intake and consistency suites, and synthetic vision concurrency pass after merge. Inspected synthetic390dark and1440light intake screenshots.

Deployment: https://dea72f94.ai-vocab-tool.pages.dev / https://capture-v038-preview.ai-vocab-tool.pages.dev .48 deployed static hashes match; integration gate returns401,390/1440 view checks pass. Deployed five-width/two-theme intake interactions and390dark shared consistency pass. One earlier attempt failed with `ERR_CONNECTION_CLOSED` while loading a new scene page, before any capture operation; one bounded retry via the stable alias passed completely. No network/security settings changed. Synthetic evidence: [phone](evidence/v0391/capture-390-dark.png), [desktop](evidence/v0391/capture-1440-light.png).

## Preview rollout, 2026-10-24

Merged production v0.37.1 fixes into the independent preview in `70ce7770d2809d9f5e517e13431bccd94aa1fa09`. URL https://b3fe106a.ai-vocab-tool.pages.dev, alias https://capture-v038-preview.ai-vocab-tool.pages.dev . All40 static hashes and authentication gate match; deployed four-item navigation regression passes five widths/both themes. Capture contracts, five-width/both-theme capture UI and synthetic vision concurrency tests pass after merge. Real provider image recognition remains unverified. A separate read-only check confirms production still loads v0.37.1 without capture-ui.js. This is not a production v0.38 release.
