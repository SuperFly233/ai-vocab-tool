# UI SOP / Persistent User Preferences

## Unified Commands and Compact Lists (2026-10-24)

- Selection mode has two levels: the header right shows ONLY a shared neutral-weight count (已选 N 条) and a text cancel command; ordinary header actions hide during selection. A compact bar above rows separates selection controls (all/partial/clear) from selected-content actions with a divider. Never interleave count/cancel with folder/export/destructive controls. Use one shared typography and geometry across history/favorites/scenes. All means the current filtered set including unloaded pages; export selected means only selected identities, including those retained outside the current filter. Context decides which commands exist: personal-favorite removal is unfavorite, not a second duplicate action. Low-frequency commands use a vertical more menu.
- Collection entry is one folder picker with personal favorites first. Do not place independent favorite and folder commands beside each other. Preserve existing per-object data and guarded Undo.
- Selection has explicit checkbox/content/action tracks. In selection mode, hide per-row actions. Cover mixed real-length text and checkbox alignment, not only root overflow. Clear missing identities and exit old selection when switching folder contexts.
- Scene rows use56px thumbnails, title, one summary and one metadata line. Do not repeat favorite/pin state as both text and graphics. Dates in the current local year omit year; lists and details show date plus minute precision (10/24 23:30). Full timestamp hints put creation and modification on separate explicit lines, without wrapping either into an accidental third line. Serialized timestamps stay unchanged.
- Sticky home uses a64px summary bar. Original query controls and queue stay in one independently bounded panel, never stretch the capsule. Test top/split layout,1/3/20 queries and queues, scroll/resize and viewport keyboards. Results cannot fall into the vacated editor grid track.
- Shared menus reposition on relevant scroll/resize, support arrows/Home/End/Tab/Escape and affect only the topmost layer. A stale menu must not act on detached controls or another account. Scene save footer has one primary action and an actual overflow menu; no exposed native disclosure triangle.

## Storage Failure Recovery

2026-10-23: quota after a prior fix requires measuring storage categories, not repeatedly asking the user to clear data. Distinguish learning records from oversized diagnostics; never place HTML block pages or base64 in ordinary error UI. Migrate a legacy copy only after its destination transaction completes and exact read-back verifies it; failure must retain the original. Await asynchronous diagnostic writes before reporting cloud completion. Retain complete export even when the UI shows a bounded preview. Test real quota behavior in both Chromium and desktop WebKit, but keep physical iPhone unverified until tested. Moving logs alone is not a full history/settings migration or unlimited storage.

## Network Path Accuracy

2026-10-23: a device's direct/proxy setting does not change Cloudflare/relay egress. Show actual browser/cloud request path; never silently reroute a provider requiring direct access. Provider direct mode requires verified CORS and an explicit host/path allowlist, omits cookies and blocks redirects. Personal API credentials may go only to the selected provider; environment credentials stay server-side. Keep model transport independent from Supabase login/data/media/tasks; test each instead of promising all services can use one route. Never show raw HTML block pages, CSS/base64 or reflected secrets as error text. Invalid-key JSON401 proves reachability, not successful inference. Network-only fixes need no invented UI redesign or image mockup.

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

Streamed and final reading views must preserve the same semantic fields: definition, example and translation do not disappear during generation. Exercise a partial translated string before upstream completion, not only a completed JSON fixture. Scene/entry navigation uses stable group identities in both directions; opening active progress never re-submits or interrupts a query. Navigation out of entry details must reuse the guarded draft-close path, including cancel and Undo.

Native dialogs share a single top-layer dismissal handler: Escape and deliberate backdrop clicks affect only the top modal. Held/repeated Escape must not cascade; a media viewer never discards the editor beneath it. Underlying editors/review/folder dialogs must not trap native-dialog Tab focus. Keep native fullscreen exit before closing its containing viewer.

No change: close directly. Changed: confirm, then show discard Toast with undo. Undo restores editable fields, not committed data; reject account switches, deleted objects and newer saved revisions. Preserve invalid JSON drafts for recovery too. Cover close button, Escape and deliberate backdrop click. Do not treat save, cancel selection, or changing a help preference as an edit.

## Delivery

Report actual bugs fixed, optimizations and new functions separately; include tests, screenshots, commit and deployment. Browser mobile emulation is not a real iPhone test. Keep Anki production gate closed until its independent migration and real-deck acceptance.

## Integration Workflow Ownership

Screenshot learning approved 2026-10-23: language study takes priority over manual card entry. Process only explicitly imported/pasted/dropped media, never monitor an album or OS screenshots. Use a preconfigured validated vision profile by default and offer manual profile selection; unsupported providers must not silently change services. Reliable recognition and verified source matches may auto-save/queue lookups, but model self-reported confidence alone is not evidence. Explicit user text/terms take precedence. Preserve original files unconditionally; AI crop proposals require confirmation before deterministic derivative creation. Mobile and desktop both need bounded lightweight editing, GIF animation and video audio retained. Canonical game translations and machine translations must remain distinguishable. Reuse source identities rather than merging fuzzy names destructively.

Browser fixtures must await `globalThis.appReady` before `cloudInitPromise`, then inject their synthetic account/data. Diagnostics IndexedDB initialization is asynchronous; awaiting a still-null cloudInitPromise can race normal startup, erase fixture state, and produce false missing-UI failures. Do not remove initialization gates or weaken production storage safeguards to make such tests pass.

Lexi's existing website is the sole learning workspace, including external-source selection, card preview, target deck, confirmation and results. A local connector may expose device login, connection configuration and diagnostics, but must not grow a second scene library or card editor. Browser and connector sessions authenticate independently; never inherit credentials by reading another app's browser storage. External software writes require an explicit, current, target-bound preview confirmation.

Portable releases require a bounded isolated runtime self-test and a manifest of every runtime file, not only an EXE checksum. Validate from a newly extracted Unicode/space path with Python environment variables removed. Preserve runtime certificate policies; missing resources must not be worked around by disabling TLS. Real-deck evidence must identify the actual executable path, distinguish mocks from live faults, and verify receipts plus guarded undo. Use a dedicated test deck only. Keep reference images, actual synthetic screenshots and release evidence separate; never publish personal Fushi media or dictionary snapshot bodies as QA fixtures.

Card review keeps the confirmation area visible independently of its scrolling content. Show only changed owned fields, readable before/after text and explicit excerpt truncation. Validate every card's dictionary and media before batch approval, including cards not currently displayed. Card audio verification must not accidentally inherit image/video-only authoring restrictions.

External-source pickers keep routine outcomes and guarded undo inside the active window; after closure, renew the actionable toast instead of covering phone close controls. Persist request identities and selected IDs in account-scoped session state, not raw source bodies or shared searches. Discard undo must compare the later session revision as well as the account. Empty real source lists are valid evidence for empty-state handling, never proof of a real nonempty import; do not fabricate external records to complete acceptance.
# Shared learning interaction contract (2026-10-24)

- Small create/rename actions use inline editable rows in the current list, not window.prompt. Enter saves single-line names, Escape uses the shared unchanged/dirty discard rules, failed saves retain the input. Restore discarded drafts only after account/object checks. Deleting a folder removes classification, not learning contents.
- Scene and entry review states are independent. No blanket mastery for an unassociated scene. Local suggestion selection fills text only; model calls require explicit query. Personal history stays local until existing account synchronization, never goes to a suggestion service.
- Keep the screenshot/source-index/media-editing backlog visible separately from each UI release. A source investigation, mock response or independent preview is never a claim of production integration.

- Whole-row navigation: title, summary and blank surface open the same target. Secondary controls remain independent. Selection, pointer movement and cancelled touch gestures never open a row. Use a real keyboard-accessible title link; hover changes title color/underline, not outer geometry.
- Header ownership: compact home replaces navigation. Hidden headers never contribute mask geometry; page entry animations must not retain a stacking context trapping fixed search controls.
- Organization: scenes and entries share folders but never implicitly share favorite or learning state. Scene featured placement is not a global pin.
- Multiline Enter remains newline; IME confirmation is never submit. Explicit queries alone call the API.

