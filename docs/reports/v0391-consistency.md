# v0.39.1 consistency closure

## Scope and design

This release implements the approved UI closure, not the remaining OCR, quotation-index or media-editing roadmap. Reference: [generated and inspected design](../design/consistency-v0391-reference.png); decisions and reproduction measurements: [implementation plan](../plans/2026-10-24-consistency-v0391.md). Historical-page typography, search and flat rows remain the baseline. Rules are appended to [UI SOP](../ui-sop.md).

## Verified changes

| Type | Unit | Result and evidence |
| --- | --- | --- |
| Fix | Multiselect row alignment | Explicit checkbox/content tracks replace the old accidental third grid child; actual selection geometry checked at five widths/both themes. |
| Fix | Expanding home capsule | Reproduced 135px top/366px split expansion; summary now64px for1/3/20 inputs and queued tasks. Original editor is a separate bounded panel; no duplicated input state. |
| Fix | Split-layout reading | Compact results span the full workspace. Normal split result no longer traps page scrolling in a fixed-height pane. |
| Fix | Mobile menu lifecycle | Resize repositions rather than closes menus; touch scene safety regression and nested native-dialog resize/keyboard/Esc tests pass. |
| Fix | Collection metadata safety | Unfavorite removes legacy tag memberships; unchanged chooser does not advance clocks; failed atomic save leaves data unchanged; Undo restores metadata only with account/revision guards. |
| Optimize | Contextual selection tools | One header slot; icon entry/exit/select-all, count and context-specific commands. Personal favorites has no duplicate remove; zero-object actions disabled. |
| Optimize | Collection entry | Scene uses one folder picker with personal favorites first, custom folders below, current membership and inline creation retained; no adjacent star/folder commands. |
| Optimize | Compact scene rows |56px thumbnail, top-aligned title, single summary and source/count/date line; selected background spans row; redundant saved/pinned text removed. |
| Optimize | Dates | Shared formatter omits current year, list seconds and time; details minute precision. Full original timestamp remains accessible, exports/log precision unchanged. |
| Optimize | Search/filter controls | Shared search baseline and pill filters; mobile filters scroll horizontally instead of growing into many rows. Independent preferences retained. |
| Optimize | Scene editor footer | Save primary plus real overflow menu; query action only with terms. Existing home/manual-entry action retained contextually, not invented for standalone scenes. Cmd/Ctrl+Enter remains save only. |
| Shared | Action menu | Same top-layer menu for versions, scene/row/result/folder tools; arrows/Home/End/Esc/Tab, disabled states, account check and bounded positioning. Superseded version-menu CSS removed. |
| Shared | Regression entry point | Release browser suite now includes consistency, complete-card UI and version UI; new modules included in icon source scanning. |

## Verification

- `npm run check`: contracts (141 handlers/181 DOM IDs/6 routes),72-icon subset, history/settings merges, storage rollback/quota, queue recovery, sync and media isolation pass.
- `check-consistency-ui.cjs`:320/390/768/1024/1440px, light/dark;60 sticky combinations, compact rows, selection, dates, footer and queue/input preservation.390dark additionally tests unchanged metadata, failed storage, legacy-tag Undo and native nested menus.
- Updated existing organization, quick-learning, row navigation, bidirectional navigation, authoring, learning UI, safety and version suites pass. Version suite includes naming/default/delete/cancel/Undo/stale-sync/integration/import/order/scroll/quota.
- Favorites boundaries, streaming translation, modal dismissal, control motion and full-card browser regressions pass. Complete-card tests mock external endpoints: no new native Anki or Fushi writes.
- Manually inspected synthetic desktop mixed selection, mobile dark scene list,320px editor footer and desktop split query panel. Evidence is copied below; temporary fixtures do not enter user cloud data.

## Release verification

Pending independent-preview and production deployment. Source commit, immutable URLs, resource hashes and screenshot-preview roll-forward will be recorded only after verification.

## Limits and remaining ledger

No physical iPhone check, real model request, native media playback or Anki synchronization was performed this iteration. Main learning data is not migrated or cleared. Remaining screenshot recognition, Teyvat index/source matching, media derivatives and broader storage work remain in the learning release ledger; isolated screenshot preview is not a production release.
