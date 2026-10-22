# v0.34.1 Scene Highlights And Hint Visibility

## Scope And Results

The new user report takes priority over the unfinished Fushi/Anki integration. This is an isolated hotfix on the published v0.34.0 baseline, not an integration release. Existing uncommitted integration work remains in the main working directory and was not deployed.

Three fixes:

1. Scene overview derives automatic highlights from every associated entry when no explicit scene highlights are supplied. Previously it only rendered the scene array, so multiple linked words did not appear highlighted.
2. Scene default highlight edits now update links that still match the prior defaults, while preserving independent link edits. Library and linked records persist atomically. Both source and translated fragments are split through the shared parser; the renderer permits up to 40 fragments instead of silently limiting display to eight.
3. Field hint popovers have content-sized height, border-box width and visual-viewport limits. Long text scrolls inside the compact explanation rather than stretching the outer bubble.

One workflow optimization:

- Scene and association highlight controls are actual multiline textareas. Commas, Chinese enumeration separators and newlines work. Selecting original or translated text exposes an explicit action to append the selection to the appropriate highlight field without removing earlier fragments.

One new preference:

- Settings > Reading > Global hide hint bubbles disables button, reading-summary and editor help, including pinned explanations. It dismisses current popovers immediately, persists through refresh and participates in the existing settings merge. Accessible control names and error/result/Undo Toasts remain.

## Verification

- Reproduced before fixing: check-scene-hints.cjs failed because the highlight control was INPUT, not TEXTAREA.
- Isolated release snapshot: npm run check passed, covering contracts, history, settings, storage, lookup tasks, synchronization, scene data and media API.
- check-scene-hints.cjs: eight combinations of 320/390/768/1440px and light/dark, including multi-link automatic highlights, 12 fragments, selection append, bilingual save, inherited versus independent values, immediate visibility change, refresh persistence and working Undo with hints hidden.
- check-scene-authoring-polish.cjs: ten combinations of 320/390/768/1024/1440px and both themes passed on the development tree.
- check-scene-learning.cjs: ten combinations passed on the development tree, including input composition, queue deduplication, durable retry, per-link state, safe exports and review.
- check-control-motion.cjs: eight combinations passed on the development tree.
- Isolated release snapshot: check-scene-reading-settings.cjs passed eight combinations; check-modal-dismissal.cjs passed four combinations, including nested previews, Escape/backdrop/X, no drag-release dismissal and guarded draft Undo.
- check-scene-hints-production.cjs compared eleven production resources to the isolated dist, verified the production send gate remains disabled, and tested the real settings switch plus bilingual multiline save at 390/1440px. One initial popover measurement timed out; a repeat completed both sizes with screenshots. No original account records were accessed or changed.
- Screenshots: tmp/dialog-qa/scene-hints/editor-*.png; isolated release production evidence: tmp/scene-hints-release/tmp/dialog-qa/scene-hints/production-390.png and production-1440.png. Inspected the mobile dark screenshot visually.

## Release

- Code commit: 78c9d5f, pushed to main.
- Cloudflare deployment: https://c2872ee4.ai-vocab-tool.pages.dev
- Production: https://ai-vocab-tool.pages.dev, v0.34.1; eleven static resources matched the isolated release build.
- Production Anki cloud tasks remain closed. No Fushi plugin, existing Anki cards/templates or study scheduling changed in this hotfix.
- Physical iPhone and real on-device keyboard/zoom behavior have not been tested. Browser viewport checks do not replace that verification.

The original integration plan remains active. Its numbered release targets need to account for this intervening hotfix; its uncompleted capabilities must not be relabeled as delivered by v0.34.1.
