# Project Context

Last updated: 2026-04-29

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
- Supabase table: `public.study_store`

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
- Query and follow-up calls should use `currentApiSettings()`.
- Cloud merge should preserve profiles from both local and remote devices.
- API profile creation/editing lives in a modal. The settings page surface should stay selection/action oriented, not an inline form.
- `/api/models` proxies model-list lookup for OpenAI-compatible APIs to avoid browser CORS issues where possible.
- API Key fields should not use `type=password`; use autocomplete-off text inputs so browser password managers do not confuse API keys with the Supabase login password.

## Open Follow-Up

After deployment, verify on two devices:

1. Log in on PC and save API URL/API Key/Model.
2. Query a word and favorite it.
3. Open/login on iPhone or iPad.
4. Confirm API settings, history, favorite state, theme, and layout appear without manual restore.
