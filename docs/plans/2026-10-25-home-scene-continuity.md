# Home Scene Continuity v0.41.1

Design first: generated and inspected home-scene-v0411-reference.png. Adopt compact saved-scene context, explicit multi-term query and bounded media. Reject fake navigation, duplicate save controls and invented progress.

Fix: Home saves must retain a visible, account-scoped scene binding; Home multiline text must submit individual deduplicated requests, not one newline query. Pure-media scene details must not reserve an empty text column.

Optimize: reuse the existing queue, scene links, chips, editor, media hashes and upload storage. Saving does not silently query; partial failures retain input. Show exact-media reuse when adding files and no duplicate file rows. Scene actions retain shared semantics.

Safety: exact bytes reuse existing blobs. New scenes reuse an existing live scene only when media hashes and all meaningful content/highlights/source fields match; distinct content is never silently merged. Existing duplicate records are not auto-deleted or privately migrated. Recheck duplicates after asynchronous title generation. Account changes and stale bindings must not attach another account's scene. Home binding stores only a group ID in account-scoped session state.

Acceptance: synthetic PNG bytes under different filenames, repeated editor saves, changed source/quote, multi-term Home with/without scene, existing-entry reuse, IME, double submit, storage failure, reload/account isolation, pure-media layout, five widths and both themes. Explicit model requests mocked in tests; no private data mutation or external native apps. Preview, resource hashes/auth and production checks before release. Shared fixes roll forward separately to capture preview.

## Follow-ups Included

Generated/inspected scene-maintenance-v0411-reference.png before implementing the follow-up UI. Adopt compact reviewed supplementation and restrained AI tint; reject fictional extra navigation, fabricated vision/Oxford access and screenshot-derived claims.

- Shared destructive actions/menu states remain red; primary add first; default resets hidden for history/favorites as well as scenes. History multi-facets remain multiple; sort/state/source single selectors are not arbitrarily converted to multiple values.
- Explicitly adding a known term associates it immediately, removing the refresh/bookmark toggle. Re-query remains an explicit entry/version operation rather than a hidden basket mode.
- Scene titles: model-free text/source-time/manual plus explicit AI-text; default text, settings synchronized. AI never sees images in this release.
- Scene legacy supplementation: read-only scan; up to20 selected text-based title/translation proposals per explicit batch; editable preview, selected-field atomic save, account/revision conflict rejection and guarded undo. No automatic original/official-source invention, note replacement, full old-entry long-form expansion or private-record cleanup. Those broader vision/entry tasks remain in the ledger.
