# v0.39.3: consistent two-level bulk selection

## Design and scope

Reference generated first, inspected, then implemented as real components: [design](../design/selection-v0393-reference.png), [plan](../plans/2026-10-24-selection-v0393.md). Adopt separate header session, grouped controls and vertical menu; reject invented filters/content from the image. Existing theme, typography and business functions remain. No new storage, navigation or native integration.

## Changes

| Area | Result |
| --- | --- |
| Header | History, mixed favorites and scenes show only `已选 N 条` and text `取消` while selecting. Ordinary header actions hide; cancel remains distinct from clearing selections. |
| Selection controls | Above-list compact bar, native all-checkbox, partial state and explicit clear. All covers current filtered data, including unloaded pages. |
| Selected actions | Separate operation group/divider, context-specific folder/unfavorite/remove commands, vertical more menu for export and history deletion. Existing destructive confirmation and guarded Undo retained. |
| Typography | Shared neutral13px/500 count and consistent cancel; no blue filled exit-circle or different scene/folder wording. Content remains left aligned. |
| Export bug | Mixed favorites previously exported current list from its selection menu. Now selected-only entry/scene JSON uses current selected identities, retaining choices outside current filter; scene selection exports only chosen groups. Whole-list export remains separate outside selection. |
| Compatibility | Existing folder metadata, account safety, paging, search, queue, timestamps, original media and Anki functions unchanged. No automatic merging of private duplicate records. |

## Evidence

- `check-selection-ui.cjs`:320/390/768/1024/1440px, both themes. Exact count/font/weight/color equality, header cancel-only,80-record paginated all/partial/clear,88 mixed records,2-record subset export, filtered scene selection/export and cancellation pass.
- Existing learning UI390/1440 both themes passes actual folder selection/export/delete confirmation/cancel/Undo/keyboard flows. Scene organization and consistency suites pass five widths/both themes.
- Control motion and data/storage/sync/queue/media contracts are run before release; screenshots inspected for desktop scenes and mobile history/favorites.
- [Mobile history](evidence/v0393/history-390-dark.png), [mobile favorites](evidence/v0393/folders-320-light.png), [desktop scenes](evidence/v0393/scenes-1440-light.png).

## Release

Pending deployed preview and production checks. Commit, resource hashes and URLs will be added after verification.

Physical iPhone remains untested. This does not claim to fix the separately identified original-input/display-title lookup identity mismatch (`inflict`); no existing user records are merged or deleted in this UI release. Confirmation-based import/association/card pickers keep their existing explicit approval semantics rather than being turned into bulk browsing modes.
