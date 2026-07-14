# Project Context

Last updated: 2026-07-14

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
- Deployment target: Vercel
- Secondary deployment target: Cloudflare Pages (`ai-vocab-tool`, output `dist`, Functions in `functions/`)
- Supabase table: `public.study_store`
- Supabase project URL: `https://uoifrqehkfvpzqojaazh.supabase.co`

## Sync Design

The app uses the same Supabase project and `study_store` table as `study-kanban`, but keys are namespaced with `ai_vocab_tool_`.

Currently synced keys:

- `ai_vocab_tool_history`
- `ai_vocab_tool_settings`
- `ai_vocab_tool_theme`
- `ai_vocab_tool_layout`
- `ai_vocab_tool_logs`

Expected behavior:

- On login/session restore, sync should be silent and automatic.
- History is merged by normalized query, preserving rolls, followups, and favorites.
- Favorites survive if either side has the item favorited.
- API settings, theme, and layout are synced as single-value preferences.
- Local unsynced edits are protected with dirty-key tracking before remote values are applied.
- The app polls for cloud updates every 15 seconds while logged in, and also syncs when the window regains focus or becomes visible.
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
- Added synced `historyTimeMode` settings and history date filtering. Lists/details can show created time, edited time, or both; unchanged records no longer show "已编辑"; history filters now include created/updated date ranges.
- Improved history modal behavior: roll switching and reroll stay available as compact sticky controls while scrolling, a small sticky summary appears after scrolling, and API profile modal backdrop clicks no longer close drafts with typed content.

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
