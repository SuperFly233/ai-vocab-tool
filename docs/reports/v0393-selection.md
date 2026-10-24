# v0.39.3: consistent two-level bulk selection

## Design and scope

Reference generated first, inspected, then implemented as real components: [design](../design/selection-v0393-reference.png), [plan](../plans/2026-10-24-selection-v0393.md). Adopt separate header session, grouped controls and vertical menu; reject invented filters/content from the image. Existing theme, typography and business functions remain. No new storage, navigation or native integration.

## Changes

| Area | Result |
| --- | --- |
| Header | History, mixed favorites and scenes show only `已选 N 条` and text `取消` while selecting. Ordinary header actions hide; cancel remains distinct from clearing selections. |
| Selection controls | Above-list compact bar, native all-checkbox, partial state and explicit clear. All adds/removes current filtered data, including unloaded pages; outside-filter choices stay selected. Only clear clears every selection. |
| Selected actions | Separate operation group/divider, context-specific folder/unfavorite/remove commands, vertical more menu for export and history deletion. Existing destructive confirmation and guarded Undo retained. |
| Typography | Shared neutral13px/500 count and consistent cancel; no blue filled exit-circle or different scene/folder wording. Content remains left aligned. |
| Export bug | Mixed favorites previously exported current list from its selection menu. Now selected-only entry/scene JSON uses current selected identities, retaining choices outside current filter; scene selection exports only chosen groups. Whole-list export remains separate outside selection. |
| Compatibility | Existing folder metadata, account safety, paging, search, queue, timestamps, original media and Anki functions unchanged. No automatic merging of private duplicate records. |

Fragment-only favorites keep their existing individual actions; a previously displayed unsupported bulk entry is removed rather than exposing zero selectable rows. Mobile favorites also replaces the old forced second-row action placement: count/cancel stay beside the heading, long folder titles ellipsize.

## Evidence

- `check-selection-ui.cjs`:320/390/768/1024/1440px, both themes. Exact count/font/weight/color equality, header cancel-only,80-record paginated all/partial/clear,88 mixed records,2-record subset export, filtered scene selection/export and cancellation pass.
- Existing learning UI390/1440 both themes passes actual folder selection/export/delete confirmation/cancel/Undo/keyboard flows. Scene organization and consistency suites pass five widths/both themes.
- Control motion and data/storage/sync/queue/media contracts are run before release; screenshots inspected for desktop scenes and mobile history/favorites.
- [Mobile history](evidence/v0393/history-390-dark.png), [mobile favorites](evidence/v0393/folders-320-light.png), [desktop scenes](evidence/v0393/scenes-1440-light.png).

## Release

- Source commits `34600d0` (shared UI), `c20d4b0` (off-filter selection) and final `e76487537f2c9fea5b49909747de682b976da083` (unsupported fragment guard), pushed to main.
- Final independent preview https://cda0c847.ai-vocab-tool.pages.dev / https://selection-v0393.ai-vocab-tool.pages.dev:44 resources match local hashes, authentication gate401,390/1440 page checks and five-width/two-theme selection suite pass.
- Production https://ai-vocab-tool.pages.dev , immutable https://eb5408ed.ai-vocab-tool.pages.dev:44 resource hashes/auth,390/1440 views,390dark and1440light selection including exact export/cancel pass.
- Shared fix roll-forward to isolated screenshot preview pending separate merge/verification. No screenshot capability is promoted to production.

Physical iPhone remains untested. This does not claim to fix the separately identified original-input/display-title lookup identity mismatch (`inflict`); no existing user records are merged or deleted in this UI release. Confirmation-based import/association/card pickers keep their existing explicit approval semantics rather than being turned into bulk browsing modes.
