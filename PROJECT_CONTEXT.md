# Project Context

Last updated: 2026-04-27

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
- New storage uses `apiProfiles` and `activeApiProfileId`.
- Query and follow-up calls should use `currentApiSettings()`.
- Cloud merge should preserve profiles from both local and remote devices.

## Open Follow-Up

After deployment, verify on two devices:

1. Log in on PC and save API URL/API Key/Model.
2. Query a word and favorite it.
3. Open/login on iPhone or iPad.
4. Confirm API settings, history, favorite state, theme, and layout appear without manual restore.
