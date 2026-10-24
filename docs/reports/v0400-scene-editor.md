# v0.40.0 Scene Editor and Home Controls

Status: local verification passed; preview/production acceptance pending.

## Implemented Scope

| Area | Result | Evidence |
| --- | --- | --- |
| Home query context | One word/phrase plus direction/focus above media; no duplicated pending field | check-scene-editor-v040 |
| Independent scene | Optional multi-term input, no forced entry | New suite plus quick-learning |
| Bilingual editor | Original/highlights and translation/highlights paired on desktop, stacked on mobile | Five widths/two themes, screenshots |
| Media target | Whole rectangular picker, files/rename remain separate | Authoring and actual WebM/backup regression |
| Selection action | Only real selected text opens action; Escape dismisses it without parent | New suite |
| Closed hints | Fixed old focus CSS revealing dismissed popovers | Computed-style assertion and inspected screenshots |
| Title generation | Configured text profile only; quote/translation/source labels, no image | Mocked direct provider,128-token contract |
| Failure/cancel/stale drafts | Draft preserved; explicit local title fallback; delayed response cannot overwrite changed/cancelled draft | New suite deferred responses |
| Existing data/placement | Existing featured value retained, confusing editor switch removed; association and queue reused | Scene safety, authoring, data tests |
| Themed selects | Shared listbox replaces native single-select presentation, one chevron, keyboard/selection state | New suite and existing preferences/workbench |
| Home folders | Folder icon remains visible when narrow text label hides | Five-width DOM/visibility assertions |
| Home disclosure | Edge chevron; sticky disclosure not a peer icon command;64px shell unchanged | New suite and consistency1/3/20 tasks |

## Verified Locally

- npm run check and build:pages.
- Authoring polish, authoring, quick learning, actual encoded WebM media/backup, scene workbench, safety, learning UI, consistency, modal dismissal, motion and provider routing regressions.
- New editor suite320/390/768/1024/1440, light/dark. Saved screenshots in tmp/qa-v040 and existing tmp/dialog-qa/consistency-v0391. Inspected mobile editor and Home, desktop editor. No global overflow hiding added.
- Some old tests referenced removed manual/import buttons directly; updated to exercise the actual shared menus, preserving their data assertions.

## Limits and Separate Ledger

No paid text/vision calls, private records or native Anki/Fushi changes in this iteration. Model tests are mocked. Physical iPhone keyboard/selection/zoom, authenticated two-device sync and native Anki sync are not validated here. Source/image recognition, Teyvat full index, automatic source matching, media editing and inflict query/title identity are NOT delivered by this release. See docs/plans/2026-10-23-learning-release-ledger.md.

## Release

Commit, preview URL, production URL and resource verification will be appended only after actual acceptance. Screenshot preview remains separate from production.
