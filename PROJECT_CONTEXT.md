# Project Context

Last updated: 2026-08-03

This file exists so a new Cursor/Codex conversation can continue without relying on compressed chat history.

## Current Goal

`ai-vocab-tool` is a personal AI vocabulary lookup tool. The user cares most about:

- Seamless cross-device sync.
- No intrusive sync decisions during normal use.
- Preserving API settings, history, favorites, theme, layout, and useful logs across devices.
- Keeping README, changelog, and in-app version notes updated whenever meaningful work is shipped.

## Repository

- Local path: `d:\Files\Projects\lexi-glass`
- GitHub: `https://github.com/SuperFly233/ai-vocab-tool`
- Main branch: `main`
- Primary deployment target: Cloudflare Pages (`ai-vocab-tool`, output `dist`, Functions in `functions/`)
- Secondary deployment target: Vercel (also used as the optional IPv4 model relay)
- Supabase table: `public.study_store`
- Supabase project URL: `https://uoifrqehkfvpzqojaazh.supabase.co`

## Sync Design

The app uses the same Supabase project and `study_store` table as `study-kanban`, but keys are namespaced with `ai_vocab_tool_`.

Currently synced keys:

- `ai_vocab_tool_history`
- `ai_vocab_tool_history_tombstones`
- `ai_vocab_tool_settings`
- `ai_vocab_tool_theme`
- `ai_vocab_tool_layout`
- `ai_vocab_tool_logs`

Expected behavior:

- On login/session restore, sync should be silent and automatic.
- History is merged by normalized query, preserving rolls and followups with deterministic conflict rules.
- Favorite, folder membership, and legacy tags use independent field clocks. Explicit newer removals beat stale additions; records without clocks retain the legacy OR/union behavior for migration safety.
- Favorite-folder definitions and API profiles use item tombstones inside settings. Older copies of deleted ids are filtered during merge, while unrelated concurrent additions and genuinely newer recreations survive.
- API profile ordering is stored separately as `apiProfileOrder` plus `apiProfileOrderUpdatedAt`. Content and order conflicts resolve independently; profiles missing from the winning order because of concurrent creation are appended deterministically.

## Latest Release

- v0.16.1 self-hosts the Supabase browser SDK under `/vendor` instead of relying on jsDelivr. Fresh mobile sessions on direct Cloudflare connections can initialize authentication without a cached third-party script. Cloud startup messaging now distinguishes loading, missing project configuration, and a missing SDK, and contract checks lock the same-origin load order.
- v0.16.0 reorganizes Settings around four task-based destinations with a sticky desktop directory and a horizontally scrollable mobile category strip. Sections start expanded, directory navigation expands and scrolls to its target, and scroll position updates the active category. Snackbar position is now a synced top/bottom preference with top as the default. Status, back, disclosure, and release controls use centered Lucide SVGs instead of font glyphs.
- v0.15.0 separates the compact account menu from an independent `/account` center. Authentication, cloud synchronization, and email-verified password recovery now have dedicated page sections instead of sharing a crowded popover. Desktop navigation keeps only Home, History, and Favorites in the center while Settings and About move beside the theme control as icon actions. Snackbar colors are explicit per theme, the brand mark gains an adaptive plate across page and favicon surfaces, and About becomes a full-width flat information flow.
- v0.14.3 replaces the query queue's legacy move/promote controls and the favorite sidebar's native HTML drag with the shared long-press reorder interaction. Queue rows stay compact on mobile, reordered recovery tasks persist, and favorite folders preserve their explicit order instead of being silently re-sorted by record count. Startup history repair coalesces duplicate query records, content-deduplicates their versions, preserves merged folder/follow-up metadata, and persists the clean result for cloud sync. Successful history writes retain that reconciled value in the read cache and only rerender the history list while its view is active, avoiding an immediate whole-library parse and hidden DOM rebuild. The selected brand mark is visible in the mobile topbar as well as desktop and browser surfaces. Toast/Snackbar uses the application z-index ceiling and remains a direct body child after all overlays; contract checks protect both conditions. Mobile history and folder headers retain a compact horizontal title/action layout instead of inheriting the generic stacked form layout.
- History detail preview, visual editing, and JSON editing share one unsaved draft. Tab changes synchronize the active editor first, malformed JSON blocks destructive navigation, backdrop clicks retain drafts, and close/version-switch gestures require confirmation before discarding edits.
- v0.14.2 adopts the selected text-free overlapping-dialogue-and-round-magnifier mark across the app shell, favicon, and manifest. Toast/Snackbar feedback now owns the global top layer above modals, confirmations, hints, and reorder ghosts. The same release fixes horizontal history-version reordering by comparing the pointer against each target button's x-axis midpoint; vertical API-profile and visual-editor ordering retain y-axis hit testing.
- v0.14.1 removes the duplicate topbar settings shortcut and keeps direction, focus, and folder controls visible in the desktop sticky lookup bar. Mobile retains the compact two-layer toolbar. API profiles, history versions, and visual-editor blocks now share one long-press reorder interaction with a drag ghost, animated sibling swaps, edge autoscroll, and order-only persistence.
- v0.14.0 establishes the Lexi酱 product identity and removes the borrowed colored top stripe. Brand icon, favicon, theme slider, rounded controls, compact settings, favorite-folder picker, neutral folder rows, history time presets, and bottom Snackbar notifications now share one visual language. The notification mode is synced in settings and defaults to `snackbar`; `detail` preserves the earlier card notifications.
- API settings, theme, and layout are synced as single-value preferences.
- Local unsynced edits are protected with dirty-key tracking before remote values are applied.
- The app polls for cloud updates every 15 seconds while logged in, and also syncs when the window regains focus or becomes visible.
- Stable background polls request only `key + updated_at`; full `value` rows are fetched only when one of the six cloud row versions changes. Upserts return refreshed row versions so the next poll stays metadata-only.

## Latest UI Notes

- v0.16.1 removes authentication's third-party CDN dependency and replaces the misleading initial “Supabase not configured” label with an explicit connection state. A missing same-origin SDK now produces a refresh-oriented loading error instead of blaming account configuration.
- v0.16.0 replaces the long undifferentiated Settings stack with task-oriented navigation while preserving full-width controls. Every group is open by default, mobile navigation stays compact and sticky, and icon-only controls share explicit grid centering and center-origin rotation. Snackbar feedback can sit above or below the content and defaults to the more visible top position.
- v0.15.0 gives account management a page-level information architecture, keeps the popup focused on identity and navigation, separates core and utility navigation on desktop, and replaces the boxed About dashboard with full-width editorial rows. Dark Snackbar contrast and every account close target are now explicit visual contracts.
- v0.14.3 keeps queued lookups scannable by reducing every row to one line with a drag handle and remove action. Favorite folders use the same long-press ghost, animated swap, edge autoscroll, and independent order clock; their visible order now follows the persisted catalog rather than item counts, and mobile keeps content, reorder, and delete controls on one row. Duplicate history records and identical result versions are repaired before tombstone reconciliation and written back once, so old local/cloud corruption cannot keep reappearing. Mobile restores the selected brand mark beside the product name. Toast/Snackbar feedback is guarded as the highest application layer instead of relying on an unverified fixed number.
- v0.14.2 shares one transparent vector brand mark across app and browser surfaces, establishes notifications as the highest global feedback layer, and makes reorder hit-testing explicit: history version tabs use horizontal geometry while API profiles and visual-editor blocks use vertical geometry.
- v0.14.1 keeps the full desktop lookup context visible after the toolbar becomes sticky while the narrow-screen smart mode collapses secondary fields. Reorderable API profiles, result versions, and visual-editor sections use one pointer-driven long-press system instead of mixed native drag and arrow controls.
- v0.13.2 makes all local storage reads failure-tolerant: blocked storage returns the same per-key defaults, emits one export warning, and lets the page continue as a temporary session. Supabase auth operations convert direct network throws into handled errors, including startup session initialization. History search coalesces rapid input into one render after 90ms while explicit clear/filter/sort actions stay immediate.
- v0.13.1 replaces the browser's full 414 KB Lucide payload with a generated 25-icon subset of about 6 KB and scopes dynamic hydration to added DOM roots; build checks fail if a literal icon use is missing, and a tiny compatibility asset overwrites Cloudflare's retained legacy bundle path. Factory reset, theme, layout, offline mode, lookup queue, and lookup draft writes now use the rollback-capable local storage transaction path, and visible preferences change only after persistence succeeds.
- v0.13.0 replaces the desktop vertical rail with a horizontal application bar while retaining mobile bottom navigation. Theme/account controls follow one rounded grouped-control language, and Lucide is bundled locally for real icons instead of character glyphs. Home preserves a dominant query field, two compact mobile rows, and a viewport-aligned empty result. Repeated list surfaces use dividers rather than card stacks. The same release introduces atomic localStorage batches: history plus tombstones, folder deletion across history plus settings, and full cloud replacements roll back together on any failure. Generated model output remains visible and exportable if persistence fails.
- v0.12.2 makes legacy settings normalization deterministic. A newer empty `modelPrompt` is an authoritative restore-default operation and must not fall back to an older custom value; merged scalar content also carries the winning side's overall `updatedAt`. API profiles without ids use a stable content-derived id; profiles and folders without item clocks inherit the stable parent settings clock or remain unclocked, never `Date.now()` during reads. Pure data tests cover stable ids, clocks, distinct credentials, and empty scalar selection.
- v0.12.1 makes lookup recovery proof-based. Successful history entries store `lookupSignature` and `lookupCompletedAt`; an interrupted request is suppressed only by the exact query/direction/note/folder/existing-id signature. Legacy query-time fallback is limited to plain unqualified requests, preferring a harmless rerun over silently dropping a distinct intent. Direct `/favorites/<id>` links now return to `/favorites`, while details entered from the in-app folder root still use browser back.
- v0.12.0 establishes a quieter list-first UI rule: repeated navigation/list content should use dividers and selected rows instead of stacks of bordered cards, while cards remain for self-contained vocabulary/result modules. Home sticky controls now collapse in two layers (secondary query fields, then queue rows), with a synced compact/expanded preference. Folders use a desktop master-detail list and a mobile list-to-detail flow with `/favorites/<id>` routes. Theme controls use one three-state capsule pattern in the topbar and settings. This release also removes equal-time settings merge conflicts through `SettingsData.preferNewerItem`; profiles, folders, order, active selection, and scalar settings converge regardless of merge argument order.
- v0.11.25 makes the About release archive genuinely lazy at the DOM level: only six recent releases render initially and only the newest opens, while 88 older entries load on demand after this release and can be collapsed again. Final v0.11.25 isolated Edge measurements reduced initial page height from about 14,052px to 2,183px on mobile and 13,141px to 1,617px on desktop; all five primary views retained zero page-level horizontal overflow and no runtime exceptions.
- v0.11.24 fixes the mobile History detail header by reserving close-button space only on the title row, allowing all three view tabs plus copy/export to remain visible without overflow. Favorite-folder order is now independently clocked and merged, so newer drag order, newer remote renames, and concurrent additions can coexist; actual drag writes leave folder content timestamps unchanged.
- v0.11.23 makes API profile drag ordering a first-class synced field instead of relying on array insertion order. Production merge probes preserved the newer explicit order, a concurrent new profile, and a newer remote model edit simultaneously in both merge directions. The real reorder handler advanced only the order clock and left profile content timestamps unchanged.
- v0.11.22 adds item tombstones for favorite-folder definitions and API profiles, closing the remaining settings-list resurrection path. Pure data tests and isolated production `mergeSettings()` probes confirmed order-independent deletion, preservation of unrelated concurrent additions, and newer recreation. `settings-data.js` is included in both static asset version contracts and the Cloudflare build output.
- v0.11.21 treats explicit user confirmation as a write even when the visible metadata value is unchanged. Lookup folder/favorite reassertions refresh their field clocks, while History editor saves authoritatively clock folder and legacy-tag state including empty arrays. Isolated browser probes called the production write paths and confirmed all relevant clocks advance.
- v0.11.20 adds field-level clocks for favorite state, folder membership, and legacy tags so explicit removals converge instead of being resurrected by stale devices. Legacy records without clocks still use OR/union compatibility. Mobile Home also removes the obsolete 44px query-row reserve, widens the primary input, and equalizes compact secondary control heights; isolated Edge checks at 390x844 confirmed `top:0` and zero horizontal overflow.
- v0.11.19 separates the History detail header into title, view tabs, file utilities, and an independently anchored close control. Desktop keeps one aligned row; mobile reserves the top-right corner for close, lets only the view tabs scroll horizontally, and keeps copy/export visible. Isolated Edge checks at 1440x900 and 390x844 reported zero page overflow; Home empty states remained aligned with the desktop sidebar and mobile nav.
- v0.11.18 makes cross-device History merging commutative and idempotent. The newer parent record determines roll order, missing rolls are appended, stable rules resolve record ids, tags/folders, equal-time notes/followups, and tombstone ties. Direct browser checks produced identical forward/reverse/repeated JSON, and 100 swapped production merges had zero failures.
- v0.11.17 replaces periodic full-value cloud downloads with six-row `key + updated_at` probes. In a 3000-record browser run, the full response was about 2,673,614 bytes and the metadata response about 439 bytes (roughly 6090x smaller). A remote-only record still promoted the probe to a full fetch, merge, and represented upsert. The same protocol is covered by a mocked `/api/sync` regression test.
- v0.11.16 adds a raw-value equality fast path before cloud polling parses or merges data. With 3000 browser records, unchanged polling averaged about 0.14ms while the skipped full merge averaged about 160.8ms. A remote-only record still triggered one merge, local restoration, and a unified cloud upload. Raw map equality now has production-module regression tests.
- v0.11.15 changes automatic cloud writes to dirty-key-only uploads with a 180ms debounce. Per-key version snapshots prevent an older upload from clearing a newer edit, and bootstrap captures the local snapshot after the remote fetch so edits made during that fetch survive. Factory reset and explicit manual upload remain authoritative full writes. Mobile Home reserves a 44px right-side safe area for browser-injected floating tools, including the compact sticky state.
- v0.11.14 caches parsed/normalized history, tombstones, and settings by their raw localStorage values, skips canonical filter extraction when no History filters are active, and reuses normalized rows/settings during list rendering. A 3000-record browser stress run reduced History navigation from about 137ms to 28ms on desktop and 133ms to 19ms on mobile; raw storage replacement, active filtering, and zero horizontal overflow were also verified.
- v0.11.13 persists the active lookup request and queued lookups locally. Reload/crash recovery resumes unfinished work in order, but first drops tasks whose result was already saved locally or arrived through cloud sync after the task started. Recovery state is intentionally device-local to avoid duplicate cross-device API calls.
- v0.11.12 adds synced history deletion tombstones so stale cloud copies cannot resurrect offline deletions, resolves same-id followup edits by update/create time, force-anchors the History detail close control to the modal top-right, and removes the active-view transform that made a computed `position: fixed` Home search panel still scroll out of view.
- v0.11.11 adds `npm run check:contracts` to catch version drift, duplicate DOM ids, missing inline handlers, non-root static asset paths, and missing Vercel rewrites before deployment.
- v0.11.10 gives each primary view a real route (`/history`, `/favorites`, `/settings`, `/about`), restores the correct view on refresh and browser back/forward, uses Cloudflare's native SPA fallback, and adds Vercel rewrites for direct entry.
- v0.11.9 makes the Home top-layout query textarea behave as a true single-line field, preventing mobile placeholder and query text from wrapping into a clipped second line. Split layout explicitly restores multiline wrapping.
- v0.11.8 moves the History detail close button out of the horizontally scrolling action group and makes it a direct child of the modal header, so it is anchored to the modal top-right on desktop and mobile. Home empty-state height is measured from the result panel to the desktop sidebar bottom or mobile navigation top; its label is centered by the result-page grid rather than fixed offsets.
- v0.11.7 adjusts the mobile Home lookup controls into two rows: the main search field spans the first two columns with the search button fixed beside it, while language direction and folder selection share the second row.
- On mobile Home scroll, the lookup editor becomes fixed at the viewport top with a spacer on the workspace, so the compact search controls remain visible instead of only animating out of view.
- History detail modals now keep the close button fixed at the top-right, keep version tabs and regenerate on one row, and support left-edge swipe-to-close.
- Version, API profile, and visual editor item ordering use long-press pointer drag. `dedupeRolls()` preserves input order so manual version ordering is not undone by normalization.
- UI busy state and the actual cloud read/write lock are separate; login status messages must not block `bootstrapCloudSync()`.
- Browser sync tries Supabase REST directly first; on mobile-style network errors such as `TypeError: Load failed`, it falls back to same-origin `/api/sync`, which verifies the Supabase session token and reads/writes `public.study_store` from Vercel. The fallback token path reads the local Supabase session cache before calling SDK `getSession()`.

## Recent Changes

- Added favorites inside History with an `全部 / 收藏` scope switch.
- Simplified the top-right account menu when logged in to `重设密码` and `退出`.
- Reworked cloud sync to include history, favorites, API settings, theme, layout, and logs.
- Replaced normal startup conflict prompts with automatic merge behavior.
- Added this project context file for future conversation continuity.
- Polished right-top toast notifications with manual close buttons, status icons, progress animation, and richer entrance/exit effects.
- Added multi-profile API settings: settings now support multiple named API URL/API Key/Model profiles, with legacy single settings migrated to the default profile.
- Added a clickable brand icon and home-focus behavior so opening the app or returning home puts the cursor in the query box.
- Highlighted favorited history items in the all-history view with a warmer card background and visual marker.
- Normalized history filter fields and changed language/direction/POS/style filters to multi-select. The prompt now asks the model to use fixed enum values for these fields.
- Simplified the settings page by removing the environment/status card and centralizing API profile actions into add, save changes, delete current, and restore default from the profile menu.
- Fixed toast progress/timer reset behavior when the same notification is triggered repeatedly or manually closed.
- Simplified lookup loading feedback to a single linear progress bar with a cleaner waiting card.
- Tightened the History page controls: filters are compact dropdowns, sort buttons are a small toolbar, and favorited items no longer use a large decorative star that overlaps actions.
- Reworked custom API profile management: current profile is shown as a card, switching uses a custom menu, and add/save/delete/reset are explicit buttons.
- Cleaned up API profile management again: outer settings only selects profiles, add/edit happen in a modal, delete/reset now handle the final profile, and `/api/models` can proxy model list lookup.
- Replaced History filters with custom multi-select menus using a short dash for the default/unfiltered state.
- Fixed API profile modal saving by binding modal buttons from JavaScript, and changed API Key input away from `type=password` to avoid browser password-save prompts colliding with login credentials.
- Polished favorited history cards with a more refined gold treatment and fixed custom history filter menus so selecting an option does not close the menu during multi-select.
- Hardened API profile modal saving: local save is separated from cloud sync, success/failure uses toast, and the modal closes immediately after local save succeeds.
- Fixed layout preference initialization: startup writes a normalized default layout when missing, marks it dirty for sync, and cloud restore re-applies normalized layout state.
- Fixed API profile normalization so legacy top-level `apiUrl/apiKey/model` fields no longer overwrite existing profile groups after modal saves, and exact duplicate profiles are collapsed.
- Reworked favorited history styling with defined gold theme variables, animated gleam, subtle starburst texture, and a glowing active favorite button.
- Changed result rendering so senses are grouped by part of speech with per-group numbering, and updated the model prompt so `headword.basicPartOfSpeech` can list multiple fixed POS enums separated by `/`.
- Fixed cloud sync getting stuck after password login by splitting `cloudBusy` UI state from `cloudSyncBusy` read/write locking, adding `try/catch/finally` around sync operations, and improving Supabase table/RLS/session/network error messages.
- Added `/api/sync` as a same-origin fallback for mobile browsers that fail direct Supabase REST requests with `Load failed` / `Failed to fetch`.
- Hardened `/api/sync` token acquisition for mobile by reading local Supabase auth storage first, and mock-tested the API handler select/upsert path.
- Expanded follow-up answer Markdown rendering: blockquotes, fenced code blocks, tables, horizontal rules, headings, ordered/unordered lists, links, strikethrough, inline code, bold, and emphasis are handled by a small escaped line parser. Tables use a horizontal scroll wrapper and a column-count-based minimum width for mobile.
- Compressed the mobile History page: advanced filters are collapsed behind a summary button, sorting is a horizontal strip, item actions move below the content, and the list renders in batches with near-bottom loading to reduce jank on large histories.
- Added softer opacity/translate entrance motion to the main lookup stream and pending follow-up answers so streamed content no longer appears as abrupt blocks.
- Reverted the main lookup and pending follow-up block entrance animations because the stream preview rerenders on every delta; keep the live content visually stable and only show the lightweight caret/pending state.
- Fixed queueing during streamed main lookup: clearing the input while `lookupBusy` no longer resets the active request or empties `lookupQueue`; queued requests copy their query/direction/note back into the editor when they start, and busy-time duplicate-history submissions enqueue instead of opening the existing-record confirmation.
- Improved history list density by showing core meaning, compact part of speech, direction, and language on each row.
- Added result text highlighting so examples, translations, collocation examples, and sense meanings can mark the current query or corresponding short labels.
- Clearing the query input now clears the visible result/loading state and invalidates in-flight lookup responses so stale results are not rendered or saved.
- Added a synced `labelMode` setting for language/direction/POS/style labels. The setting supports Chinese-only, code-only, and bilingual display, and the result view, history filters, history summaries, and style labels now use it.
- API profile save/reset flows preserve `labelMode` so display preferences are not lost during API configuration changes.
- Added first-stage entry linking: result pages now show related history entries when the normalized query text contains another saved query or is contained by it. This supports simple word/phrase back-and-forth navigation without changing the stored history schema yet.
- Added first-stage Tag/Note support on history entries. `normalizeHistoryItem()` now carries `tags`, `note`, and `noteUpdatedAt`; history search includes them; the history modal edit tab can edit them; result previews render tags and Markdown notes. History merge combines tags and uses `noteUpdatedAt` so clearing a note can sync correctly.
- Added Tag as a first-class History filter. The history filter bar now includes `tag`, tag chips on history rows can be clicked to filter, and `historyState.filters.tag` participates in the same multi-select/clear/count logic as language, direction, POS, and style.
- Added a Markdown shortcut toolbar for history notes. `insertNoteMarkdown(kind)` inserts or wraps bold, list, quote, code, and table snippets while preserving textarea focus and selection.
- Added first-stage visual history editing. The history modal now has a `visual` tab rendered by `renderVisualEditor()`, with form editing for headword/meta fields, senses, and collocations. `saveVisualHistoryEdit()` writes the form back into JSON, syncs edited titles into the history record, and reuses the existing save path, while raw JSON editing remains available.
- Tuned follow-up Markdown tables for narrow mobile screens: table rendering now sets a column-count-aware minimum width so many-column tables scroll horizontally without each column becoming unreadably thin or excessively wide.
- Added a first-stage word/phrase type layer. New lookup results are prompted and normalized to `meta.entryType` (`word` or `phrase`), history filters include `entryType`, result and history summaries show the type, and the visual editor can change it. Older history infers the type from the saved query/title instead of requiring a migration.
- Added the first AI Vocab site icon pass: `favicon.svg` reuses the sidebar brand idea as a blue "词" magnifier, `index.html` links favicon/theme-color/manifest, and `site.webmanifest` points to the same SVG icon. Study Kanban still needs its own matching update later for cross-project consistency.
- Added a synced `fontMode` setting. The settings Appearance group now supports system, sans, serif, and mono font modes; `normalizeSettings()` preserves it, `mergeSettings()` syncs it with `labelMode`, and CSS applies the choice through `--font-ui` while code/JSON fields keep `--font-mono`.
- Added first-stage lookup queueing. `runLookup()` now submits through `submitLookup()`: when `lookupBusy` is true, requests are stored in `lookupQueue` with query/direction/note/source metadata; the UI supports move up/down, promote to front, and remove; `processNextLookup()` starts the next queued lookup after the active run finishes. `clearEditor()` clears the queue together with current lookup state.
- Added first-stage lookup failure recovery. `performLookup()` now calls `fetchLookupWithRetry()`, which retries once for network-style errors, timeouts, HTTP 408/429, and 5xx responses. `renderLookupRetry()` shows the previous failure and next attempt in the result pane. Non-retryable failures such as bad config, auth/permission errors, or valid 200 responses with invalid JSON still fail fast.
- Added a first-stage Tag management panel in Settings > Data. `renderTagManager()` scans history tags and shows usage counts; users can filter by a tag, rename it across all matching history entries, or remove it from every entry. These operations call `setHistory()`, so they update the UI and sync to cloud.
- Tightened mobile Markdown table rendering. `formatFollowupAnswer()` now emits wider column-count-aware table width variables, and CSS constrains the wrapper while allowing horizontal touch scrolling so many-column tables remain readable on narrow phones.
- Added first-stage streaming output for follow-up answers. `/api/followup` accepts `stream:true`, forwards OpenAI-style SSE chunks, and the front end reads `data:{delta}` events to update the pending follow-up card live before saving the final answer.
- Added API profile connection testing. Settings > API profile now has a `testCurrentApiProfile()` action and status chip; `/api/test-profile` sends a minimal chat-completions request through the selected profile or environment variables, reusing admin environment-key checks and returning elapsed time or a compact failure reason.
- Re-collapsed API profile management after the outer actions became too crowded. The settings card now only shows the current profile name plus a chevron; create/select/edit/delete live in the dropdown, draft connection testing lives inside the add/edit modal, and delete still uses confirmation. The main result header now highlights `headword.coreMeaning` on its own line while type/POS/direction share one row.
- Added a front-end typewriter reveal for main lookup results after JSON validation succeeds. The app still waits for full structured JSON from `/api/analyze`, then `startResultTypewriter()` progressively reveals rendered text nodes while excluding follow-up panels and controls. Mobile follow-up prose is slightly smaller/tighter so streamed answers do not look oversized next to tables.
- Upgraded the main lookup typewriter to chunk by rendered JSON structure. `startResultTypewriter()` now treats top-level result sections as chunks, hides pending chunks, fades each chunk in, then reveals its text nodes before moving to the next section. This keeps JSON parsing stable while making the home lookup feel closer to the follow-up streaming experience.
- Reworked the main lookup waiting experience. `renderLookupLoading()` now immediately renders result-shaped skeleton blocks with an estimated progress badge, then the validated result replaces those blocks with chunked typewriter output. The JSON view also gets a lightweight loading placeholder and a final `startJSONTypewriter()` reveal after JSON validation.
- Fixed API profile menu stacking on mobile by positioning the menu as a fixed viewport layer and temporarily raising the host settings card while the menu is open. The menu reserves bottom space for the mobile nav so profile rows and delete/edit controls are not covered.
- Fixed mobile follow-up table overflow. `.followup-answer` and `.followup-item` now clamp their own width, `.md-table-wrap` owns horizontal scrolling without negative mobile margins, mobile table column minimums are smaller, and table cells convert escaped `<br>` into actual line breaks.
- Replaced the fake main lookup loading reveal with true streaming. `/api/analyze` now accepts `stream:true`, forwards OpenAI-style SSE deltas while accumulating the model JSON, then runs the existing final JSON parse/repair before sending `{result, done:true}`. The front end reads the stream, writes raw JSON into the JSON pane, and uses best-effort extraction from partial JSON to update headword, senses, collocations, register, and confusions before the final validated result is saved.
- Added Cloudflare Pages double-deploy support. `functions/_utils/vercel-adapter.js` turns Pages Functions `Request/env` into the existing Vercel-style handlers, so `/api/analyze`, `/api/followup`, `/api/sync`, `/api/models`, `/api/test-profile`, and `/api/config` work on Cloudflare without duplicating business logic. `npm run build:pages` writes only public static assets into `dist`; Supabase remains the same `study_store` backend.
- Added an optional IPv4 relay fallback for Cloudflare Pages. If an upstream model API returns an IPv6-block HTML page, `api/relay.js` can forward `analyze`, `followup`, `models`, and `test-profile` to `AI_IPV4_RELAY_BASE_URL` such as the Vercel deployment. The browser still only talks to Cloudflare; if the provider also blocks Vercel egress, replace the relay with another IPv4-capable endpoint.
- Improved and then narrowed result highlighting. `highlightText()` expands common English inflections and highlights the full word form instead of only the base stem, but rendering now uses only the current query/headword as highlight terms and only applies marks in example and translation rows; meaning rows stay unmarked.
- Made the home topbar and query panel sticky. When the home page scrolls, `home-scrolled` compacts the title and query controls; clicking the sticky query panel scrolls back to the top and focuses the query input for faster mobile reuse.
- Reworked split layout as a wide-screen workbench. The left panel is now a compact sticky input console with a resizable long textarea, one focus field, and bottom-aligned query action; the right panel keeps the result readable instead of inheriting the old top-layout control shape.
- Refined highlight scope again: examples use only query/headword terms plus narrow `exampleHighlights`; translations use `translationHighlights` and conservative Chinese label candidates so the translated equivalent can be marked without highlighting unrelated context words.
- Added settings-side model prompt management. `/api/config` exposes the backend default analyze prompt, settings can store a synced `modelPrompt` override, and `/api/analyze` uses `payload.systemPrompt` when provided while falling back to the built-in prompt.
- Reworked the settings-side model prompt area into a small implementation map plus a wider prompt workbench. It now shows the input -> frontend request -> system prompt -> model JSON -> validation/render path, default/custom source, default prompt length, and edit state.
- Fixed lookup queue duplication: `submitLookup()` now signs query/direction/note/existingId and ignores repeated submissions already running or already queued.
- Added a narrow tilde-placeholder highlight fallback for examples. Query/headword/current item strings containing `~`, `～`, or `…` are split into meaningful fragments so entries like `つもり～ということだ` can highlight `つもり` in examples without broadening semantic-row highlights.
- Fixed a regression in lookup queue signing: it called a non-existent `normalizeQueryText()` helper, so non-empty lookups could fail before sending any request. The signature now uses `normalizeSearch()`, and `runLookup()` catches entry-point errors with a toast.
- Added synced `historyTimeMode` settings, then corrected the history UI so time handling is global display preference plus explicit created/updated sorting rather than created/updated date range filters. Unchanged records show one plain time; edited records can show created, modified, or both according to settings.
- Improved history modal behavior: roll switching and reroll stay available as compact sticky controls while scrolling in preview mode, edit modes hide those learning-oriented sticky controls for more workspace, and API profile modal backdrop clicks no longer close drafts with typed content.
- Bumped the project to `0.10.0` after the accumulated history/editor/settings/API-profile work became a minor-level UX and structure update. Future patch releases should be single bug/style fixes; minor releases should cover grouped cross-module experience changes; `1.0.0` should wait until lookup, sync, API settings, history editing, mobile behavior, and deployment docs are stable.
- Fixed long translation highlight terms being dropped by the old length filter, so explicit `translationHighlights` can mark longer translated equivalents.
- Expanded visual history editing with example/translation highlight fields, register fields, confusions, and drag reordering for senses, collocations, and confusions.
- Added collapsible settings groups, wider Prompt workspace behavior, fixed-position API profile menu placement, and manual API profile ordering.
- In v0.10.1, visual editing hints moved from a single banner to per-field hint bubbles with temporary close buttons and a synced pinned-display setting. History search also gained a scope selector so users can search only words, meanings, examples, collocations, confusions, or other metadata.
- API profile and visual editor ordering should now favor drag handles instead of explicit up/down buttons. The drag interaction includes insertion feedback and slow edge autoscroll; future refinement can tune pointer/touch behavior if mobile browser drag support is inconsistent.
- Home query focus should not bubble into automatic scroll-to-top anymore; only clicking the non-control editor surface should trigger that helper behavior.
- v0.10.2 corrected the history modal display intent: keep the normal top header visible in preview, visual edit, and JSON edit modes; remove only the extra sticky summary block that appears inside the modal body after scrolling.
- v0.10.3 fixed the visual editor hint pin toggle sticking on after cloud sync. Boolean settings are normalized explicitly, and settings merge now prefers local pending/newer settings instead of OR-ing remote and local values.
- v0.10.4 removed the old 120-entry storage cap from `addHistory()`, `saveLookupResult()`, and `mergeHistoryItems()`. History performance should rely on batched rendering, not data truncation; old entries already overwritten by capped saves cannot be reconstructed client-side.
- v0.10.5 added a Settings > Data history JSON import flow. `parseHistoryImportPayload()` accepts plain arrays, `{raw:"..."}`, Supabase `{value:{raw:"..."}}`, `history`, `items`, and `data` wrappers; `analyzeHistoryImport()` previews new/overlap/changed/duplicate counts before `importHistoryFromText()` merges via `mergeHistoryItems()`.
- v0.10.6 extended history import with file picker and drag/drop loading through `loadHistoryImportFile()`. Settings desktop layout should use full-width/right-side work areas for API profiles, Prompt, import, and tag management rather than narrow left-aligned forms.
- v0.10.7 fixed the history import preview crash caused by calling nonexistent `formatTime()` in `historyRangeLabel()`; use `formatHistoryTime()` with ISO fallback instead.
- v0.11.0 introduced Favorites/Folders as the replacement user-facing model for Tag. Existing `tags` are still preserved for backward compatibility and are mapped to deterministic `tag_*` folder IDs; new edits write `folderIds` and settings store `favoriteFolders` with a reserved `parentId` for future nesting. The star/favorite boolean is the system folder `liked` / “个人收藏”. History top-right no longer exposes clear-history; keep that destructive action in Settings > Data.
- v0.11.1 extends folder workflow: home lookup can preselect folders and queued requests carry those folder IDs; Folder view can start a lookup targeting the active folder; History rows can open a checkbox folder selector; folder sidebar supports create/delete-with-mode and drag sorting. Static `app.js`/`styles.css` URLs now include `?v=0.11.1` to avoid stale browser cache after import fixes.
- v0.11.2 removes the remaining old History-page favorite entry points: no hidden `historyState.scope`, no star button in the History list. Favorites remain as data/system folder semantics and can be changed through the folder selector or Folder view.
- v0.11.3 tightens Folder view layout: the folder panel now has its own padding like History, desktop folder sidebar clips horizontal overflow, and scrollbar chrome is hidden globally while scroll behavior remains available. The home folder picker is folded into the main query row between direction and search, with truncated labels and `+N` overflow. History rolls now dedupe by a stable comparable result fingerprint and modal roll selection uses a stable view key instead of numeric ids, preventing visually identical duplicate versions and multiple active version tabs. Static asset query params are bumped to `?v=0.11.3`.
- v0.11.4 restores top-layout Home scrolling so the sticky query panel can actually stay fixed while results scroll in the page. The query row gives more width to the main input, narrows direction/folder controls, and equalizes control heights. History/folder derived folder catalogs, stats, item mappings, and folder item lists are cached until history/settings change; Folder view now renders records in batches like History. Home lookup drafts are saved locally under `ai_vocab_tool_lookup_draft_v1` so refresh/crash restores query, direction, note, and selected lookup folders. About changelog items are collapsible. Highlight filtering now allows single Han/Hiragana/Katakana/Hangul fragments from tilde placeholders, fixing cases like `流石の～も` while still rejecting single Latin letters.
- v0.11.5 corrects the v0.11.4 Home density regression: top-layout editor panes must shrink to content height, empty result states must be lightweight, and the main query input should remain visually larger than direction/folder/search controls. Future UI changes should be screenshot-checked before claiming completion.
- v0.11.6 corrects the remaining Home empty/sticky behavior: empty result panels fill the remaining first viewport again, while the topbar collapses on scroll and the home editor pane sticks at `top:0` with a higher z-index so the search controls remain visible at the viewport top.

## Working Rules

For future code changes:

- Update `APP_INFO.version`, `APP_INFO.releaseDate`, and in-app `CHANGELOG` in `app.js` for meaningful feature or bug-fix releases.
- Update `CHANGELOG.md` with user-facing changes.
- Update `README.md` when behavior, setup, storage, or workflow changes.
- Keep this `PROJECT_CONTEXT.md` current with important decisions, sync design, and handoff notes.
- Run at least `node --check app.js` before committing JavaScript changes.
- Commit and push after completing requested changes unless the user says not to.

## API Settings

Settings are normalized through `normalizeSettings()` in `app.js`.

- Legacy fields `apiUrl`, `apiKey`, and `model` are still accepted.
- Legacy top-level fields should only migrate when no valid `apiProfiles` array exists; once profile groups exist, they must not overwrite current profile values.
- New storage uses `apiProfiles` and `activeApiProfileId`.
- Display preferences currently include `labelMode` and `fontMode`; API profile save/reset flows should preserve both.
- Query and follow-up calls should use `currentApiSettings()`.
- Cloud merge should preserve profiles from both local and remote devices.
- API profile creation/editing lives in a modal. The settings page surface should stay selection/action oriented, not an inline form.
- `/api/models` proxies model-list lookup for OpenAI-compatible APIs to avoid browser CORS issues where possible.
- `/api/test-profile` validates the currently selected OpenAI-compatible chat completions endpoint with a tiny request before the user spends time on real lookups.
- API Key fields should not use `type=password`; use autocomplete-off text inputs so browser password managers do not confuse API keys with the Supabase login password.

## Open Follow-Up

After deployment, verify on two devices:

1. Log in on PC and save API URL/API Key/Model.
2. Query a word and favorite it.
3. Open/login on iPhone or iPad.
4. Confirm API settings, history, favorite state, theme, and layout appear without manual restore.
