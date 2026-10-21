# Scene Editing and Reading Polish

本轮 v0.32.0：修复 3 组、优化 6 项、新增 1 项，共 10 项。采用先生图再实施的流程；原句/译文高亮、创建/修改时间、素材改名与编辑关闭撤销均已纳入验收。

Design reference: docs/design/scene-authoring-reference.png (image model generated before implementation).

## Bugs

1. Scene workspace translation currently escapes text without applying translationHighlights.
2. History/API/highlight dismissal paths do not consistently confirm and offer guarded draft undo; new API form defaults are incorrectly classified as edits.
3. Scene filters/review/action rows use unrelated alignment tracks; long labels and mobile controls need consistent bounds.

## Optimizations

1. Rename ambiguous scene labels and explain optional naming versus per-entry featured placement.
2. Move each highlight beside its corresponding source/translation and supply field-specific requirements/examples.
3. Share the visual editor hint/pinned behavior with scene editing; viewport-bound bubbles, accurate examples and focus/close support.
4. Show creation/modification on scene editor, detail, inline card and list; reuse history formatting.
5. Compact editor/reading sections and align toolbar geometry, without nested cards or throwing away source metadata.
6. Compare Lucide / Phosphor semantics; use book-open for review, rotate-ccw for reset and file-up for backup import, preserve consistent stroke. Give the Anki action an explicit label.

## New Function

1. Edit media display filenames in the scene draft; metadata-only changes use existing save/share/sync with immutable file hashes.

No new navigation, back-end schema, automatic model calls or Anki activation. Acceptance includes mobile/desktop, dark/light, undo conflicts, escaped highlights and media hash stability.

## Delivery Checklist

Scope count: **3 bug groups / 6 optimizations / 1 new function = 10 units**. Safety fixes are grouped by workflow, not inflated for every close button or viewport.

| Unit | Result | Evidence |
| --- | --- | --- |
| B1 Workspace translation highlights | Complete | Explicit escaped translationHighlights render alongside quote marks; browser assertion. |
| B2 Draft dismissal inconsistencies | Complete in audited editors | Scene editor, association picker, highlight dialog, history visual/JSON and API profile. No-change close, changed confirmation and discard undo; API new defaults no longer count as edits. Restore checks account and original saved revision. |
| B3 Scene alignment | Complete | Explicit heading/metadata tracks, stable icon geometry, wrapping filter grid and separate action group; SVG center measurements at five widths. |
| O1 Clear field purpose | Complete | Scene naming is separate from entry naming; standalone featured toggle states it applies to new associations, existing per-entry choices retained. Blank names use quote summary. |
| O2 Adjacent highlights | Complete | Field order assertion: quote, quote highlight, translation, translation highlight. |
| O3 Shared field help | Complete | Shared bubble and pinned preference, requirements and examples, close control, top-layer placement, viewport/header avoidance, scrollable text and unclipped arrow. Also checked in existing visual editor. |
| O4 Scene timestamps | Complete | Same formatHistoryTime as history. List follows historyTimeMode; detail, inline and editor display both recorded times. No invented dates for old records. |
| O5 Reading/editor structure | Complete | Generated reference guides compact unframed sections, bounded media, source information and mobile stacking. No generated page background or extra navigation. |
| O6 Icon semantics | Complete | Compared [Lucide](https://lucide.dev/icons) and [Phosphor](https://phosphoricons.com/); existing Lucide has appropriate book-open, rotate-ccw and file-up, so no duplicate library added. Anki has explicit text. |
| N1 Media filename editing | Complete | Draft metadata edit, discard/restore, saved caption and unchanged SHA-256 tested; download/viewer use context filename, no transcoding or re-upload. |

## Verification

- `npm run check` passed for data, metadata, storage, sync, queue, contracts and media API.
- `check-scene-authoring-polish.cjs`: 320/390/768/1024/1440px, light/dark. Both highlights, timestamps, exact field order, bubble geometry and dismissal, filename/hash/caption, visual editor examples, invalid JSON draft recovery, default API close and modified API undo all passed. Captures in ignored `tmp/dialog-qa/polish/` inspected at desktop dark and phone light.
- `check-scene-dialogs.cjs`: 320/390/768/1440/2048 plus 844x390, both themes; modal centering and scrolling controls passed.
- Existing scene learning, stale-edit/account/sync safety, actual encoded media/backup, overlay intent, deletion/undo and Anki UI suites passed.
- `check-editor-draft-safety.cjs` passed: history/API reject newer saved versions, native Escape supports keep/discard, cross-account undo is rejected and association selection can be restored.
- Anki cloud sending remains disabled. No private user records, cloud credentials or real Anki decks used for acceptance.
- Physical iPhone, Safari keyboard zoom and real mobile soft keyboard are not tested; responsive browser screenshots do not replace them.

## Persistent SOP

User requested preferences are recorded in AGENTS.md, docs/ui-sop.md and PROJECT_CONTEXT.md. Generated reference is preserved under docs/design/. This is durable repository memory, not a claim to have changed global ChatGPT memory.

## Production Acceptance (2026-10-21)

- Implementation commit: `d16c7ea`, pushed to main.
- Deployment: https://7ca9219c.ai-vocab-tool.pages.dev ; production: https://ai-vocab-tool.pages.dev/scenes .
- Nine production resources match the local build byte-for-byte after line-ending normalization: HTML, app, CSS, scene UI/study/workspace, overlays, Anki UI and icon subset.
- Actual production browser checks at 390px and 1440px confirm v0.32.0, quote/translation highlights, editor help, no horizontal overflow and no script errors.
- Checks ran in isolated browser contexts with offline-mode local fixtures only; no production user entries or media were modified.
- Production config still reports `ankiBridgeEnabled:false`; the independent database/real-Anki acceptance gate is unchanged.
