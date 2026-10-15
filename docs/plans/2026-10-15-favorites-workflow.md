# Favorites Workflow v0.22

## Scope

The user wants direct membership management inside detail, a single top-level favorites search rather than separate folder search fields, and broader favorites bug fixes, workflow improvements and new features with explicit final counts.

## Design

- A persistent detail membership row opens the existing multi-select folder picker. Membership saves immediately and independently of word/JSON drafts; hidden stale text cannot override live membership on later saves.
- One sticky favorites toolbar searches all saved entries by default, with an explicit current-folder scope and sort order. Global results deduplicate records across memberships, include saved fragment text and folder names, and show matching folder shortcuts (including empty folders).
- Folder navigation preserves the query. Mobile root search reveals results without requiring folder drill-down. Export/review uses the displayed result scope; full backup exports remain available through existing settings paths.
- An existing-history picker adds multiple records to a folder, preserves other memberships, supports search and paginated rendering. Selected records survive filtering.
- The folder picker has search and inline creation. Nested overlays retain body scroll lock, Escape only dismisses the top layer, focus returns safely, and invalid/failed saves do not discard drafts.

## Acceptance

- [x] Actual mobile/desktop light/dark membership edits, draft preservation, removal and failure checks.
- [x] Global search, empty-folder match, current-folder scope, navigation retention, sort and result export/review.
- [x] Existing-record selection, filtering, duplicate protection and quota handling.
- [x] Screenshot and viewport/scroll geometry verification, existing test suites.
- [ ] Versioned release, commit/push, deployment and live verification.

## Verified Evidence

`check-favorites-ui.cjs` passed 320/390/1440px in light/dark modes using real tap/click events and inspected downloads. The 320px context uses a 640px-tall viewport and adds 30 folders to verify list scrolling without losing confirmation actions. Assertions cover membership replacement while visual drafts remain intact, later edit saves retaining new membership, top-layer Escape and body lock, inline create/duplicate handling, failed storage preserving selection, cross-folder deduplication, original/fragment/folder-name search, retained search focus and navigation, three sort modes, scoped JSON/Markdown/review and additive batch history selection. Membership badges navigate within favorites instead of switching to history.

Existing learning UI checks passed four contexts; version UI checks passed six contexts. Responsive checks passed normal and unbroken long results at 320/390/768/1440px, including sticky and detail geometry. `npm run check` passes all data, storage, settings, history and sync contracts. `npm run build:pages` builds the release output. Screenshots in the host temp directory `lexi-v022-qa` were inspected for desktop/mobile, dark/light, nested membership, compact list and scrolling states.

## Delivery Counts

- Bug fixes (8): stale detail edits overwriting membership; nested picker removing body lock; Escape closing underlying detail; folder navigation clearing query; focused membership tooltip causing overflow; Markdown export hidden while editing; favorites membership badges unexpectedly switching to history; internal fragment provenance falsely matching search text.
- Existing workflow improvements (4): persistent direct detail membership row; one sticky search toolbar with explicit scope; compact mobile entry actions; inline folder creation with duplicate protection and a visible selected count.
- New capabilities (4): global favorites/folder-name/fragment search; three result sort orders; existing-history multi-select addition; searchable membership picker.
