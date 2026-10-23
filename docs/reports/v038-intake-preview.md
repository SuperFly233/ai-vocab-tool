# Screenshot learning: first preview checkpoint

Production remains v0.37.0. This branch is an independent preview of part of the approved v0.38 scope, not a completed v0.38 release.

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
