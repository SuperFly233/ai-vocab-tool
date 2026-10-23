# UI SOP / Persistent User Preferences

## Optional Hints

Clarification 2026-10-22: the user's original intent is to hide obstructive field-focus bubbles, not hover tooltips. `hintsHidden` now controls floating editor help only; `tooltipsHidden` separately controls button/reading hover and keyboard-focus tooltips and defaults false. Legacy `hintsHidden=true` must not disable hover hints. Pinned field explanations remain independently controlled. Result/error/Undo Toasts are unaffected.

User confirmed 2026-10-22: provide a global opt-out for explanatory button/reading/field bubbles and pinned field help. Preserve accessible control names, error/result notifications and Undo actions. Apply visibility immediately and after settings hydration. Field help must remain content-sized and bounded to the visual viewport, including mobile keyboards; long help scrolls internally. Never promise newline-separated input on a single-line control.

## Design Before Implementation

User confirmed 2026-10-21: generate a bitmap UI reference with the image model before substantial layout redesign, inspect it, then plan and implement. Keep the artifact and the concrete decisions in the project, not only in chat. The generated design guides hierarchy, not application data, navigation or background assets.

## Consistency and Readability

User confirmed 2026-10-22: history is the visual baseline for history/favorites/scenes search, filters, sorting and reset controls. Desktop search/filter tools remain sticky below the opaque global header; left folders/scenes stay visible while main content scrolls. Mobile preserves usable content space and safe header masking. Apply this consistently to future equivalent browsing views, not only to the page in the latest screenshot.

Each browsing page owns independent filter/sort preferences and its own reset action. A settings switch controls whether these survive refresh and synchronize. Do not share one sort variable between pages, persist temporary search text, or treat reset as deleting user records. Preference merges use per-page clocks so editing scenes cannot erase newer history preferences.

Return-to-top is a shared lower-right action, hidden at approximately the first 5 percent and on non-scrollable views. It targets the top active dialog's scroll region when present, otherwise the document. It must not be a permanent settings-header button. All pages share an opaque top mask; never cover the home query panel to fix header leakage.

Measure the mobile bottom navigation's actual rectangle when positioning return-to-top; it must sit above the navigation, not cover its last tab. Initialize settings scroll highlighting only while settings is visible, then refresh it after the active view/layout changes. Assert the initial category as well as scroll following; a stale highlight can otherwise pass overflow tests.

Settings categories must share one metadata source for navigation labels, section titles and search aliases; preserve stable section IDs. Use consistent concise naming, then explicit content subgroups rather than inconsistent navigation subtitles. Keep destructive actions last. Every preference row uses a copy wrapper plus control track; mobile stacks the same DOM. Inspect scrolled screenshots, including the area above floating headers.

Interaction geometry is invariant on hover/focus: outer control rectangles must not enlarge or translate. Use color, border or inset shadows. Structural centering transforms may remain unchanged between states. Dragging and top-layer tooltip entry/exit are deliberate exceptions, not reasons to disable all transforms. CSSOM rules plus real hover/focus rectangle checks in check-control-motion.cjs enforce this across shared control families and scene media choices.

- Inspect both themes and 320/390/768/1024/1440px, including long content and scrolled states.
- Align headings, metadata, filters, toolbars and row actions on explicit layout tracks; SVGs use stable centered hit areas. No character icons.
- Compare semantic candidates across established icon families, including Lucide and Phosphor. Match the existing style and licensing; do not bundle a new library just for variety. Reset is not close, review is not video playback, import is not browse-folder, opening a word is not generic sharing.
- Field help states purpose, required/optional constraints and a concrete example. Reuse visual-editor bubble/pinned preferences. Help must fit inside the visible viewport without being clipped by scroll containers.
- Place quote/translation highlights immediately after their respective text, and render both with the existing escaped highlighter everywhere.
- Show scene creation/modification using the same date formatter as history. List density may follow history time preference; detail/editor can show both explicitly. Never fabricate unknown timestamps.
- Rename media reference metadata without changing file hash, MIME, bytes or other unrelated scenes.

## Draft Safety

Native dialogs share a single top-layer dismissal handler: Escape and deliberate backdrop clicks affect only the top modal. Held/repeated Escape must not cascade; a media viewer never discards the editor beneath it. Underlying editors/review/folder dialogs must not trap native-dialog Tab focus. Keep native fullscreen exit before closing its containing viewer.

No change: close directly. Changed: confirm, then show discard Toast with undo. Undo restores editable fields, not committed data; reject account switches, deleted objects and newer saved revisions. Preserve invalid JSON drafts for recovery too. Cover close button, Escape and deliberate backdrop click. Do not treat save, cancel selection, or changing a help preference as an edit.

## Delivery

Report actual bugs fixed, optimizations and new functions separately; include tests, screenshots, commit and deployment. Browser mobile emulation is not a real iPhone test. Keep Anki production gate closed until its independent migration and real-deck acceptance.

## Integration Workflow Ownership

Lexi's existing website is the sole learning workspace, including external-source selection, card preview, target deck, confirmation and results. A local connector may expose device login, connection configuration and diagnostics, but must not grow a second scene library or card editor. Browser and connector sessions authenticate independently; never inherit credentials by reading another app's browser storage. External software writes require an explicit, current, target-bound preview confirmation.

Portable releases require a bounded isolated runtime self-test and a manifest of every runtime file, not only an EXE checksum. Validate from a newly extracted Unicode/space path with Python environment variables removed. Preserve runtime certificate policies; missing resources must not be worked around by disabling TLS. Real-deck evidence must identify the actual executable path, distinguish mocks from live faults, and verify receipts plus guarded undo. Use a dedicated test deck only. Keep reference images, actual synthetic screenshots and release evidence separate; never publish personal Fushi media or dictionary snapshot bodies as QA fixtures.

Card review keeps the confirmation area visible independently of its scrolling content. Show only changed owned fields, readable before/after text and explicit excerpt truncation. Validate every card's dictionary and media before batch approval, including cards not currently displayed. Card audio verification must not accidentally inherit image/video-only authoring restrictions.

External-source pickers keep routine outcomes and guarded undo inside the active window; after closure, renew the actionable toast instead of covering phone close controls. Persist request identities and selected IDs in account-scoped session state, not raw source bodies or shared searches. Discard undo must compare the later session revision as well as the account. Empty real source lists are valid evidence for empty-state handling, never proof of a real nonempty import; do not fabricate external records to complete acceptance.
