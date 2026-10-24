# v0.40.0 Scene Editor and Home Controls

Status: released2026-10-25; production verification passed.

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

- Implementation0a6f3686c5a47c0cbbdf56225c3c4e423b7a2e10; final production source35ab4d1f488137ebaac9ad9d7fbb9ce8d2e5c6c4 (last test-only commit after final CSS5c2cb31).
- Preview https://a45f9063.ai-vocab-tool.pages.dev passed44 hashes/auth and complete new five-width/two-theme matrix. Final one-file CSS update preview https://b1882709.ai-vocab-tool.pages.dev passed44 hashes/auth and390dark full interactions, including actual scene dropdown selection.
- Production https://615ebef2.ai-vocab-tool.pages.dev / https://ai-vocab-tool.pages.dev:44 hashes match final dist; unauthenticated sync401;390dark/1440light editor, selection, mocked title/failure/cancel, dropdown, folder icon and64px sticky tests passed.
- Extra reading workspace, folder boundaries and full authoring-polish regressions passed after updating old hidden-button tests to real menus. No application behavior was bypassed to make these tests pass.
- Representative synthetic screenshots: [mobile editor](v0400/editor-mobile.png), [desktop editor](v0400/editor-desktop.png), [mobile dropdown](v0400/dropdown-mobile.png), [home](v0400/home-mobile.png).
- Screenshot-preview roll-forward remains separately verified and will be recorded below; its unfinished capabilities are not part of production.
