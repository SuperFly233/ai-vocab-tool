# Analysis Lifecycle Repair

Scope: remove the compulsory scene-AI review workflow, fix cumulative100-task
blocking and inaccessible cleanup, and repair confirmation layering globally.
Compatible repair0.44.2; no model/provider, DB, Bridge or Anki approval changes.

Design reference: docs/design/analysis-records-reference.png. Adopt restrained
divider rows, direct open/edit/retry/delete, completed cleanup and native top-layer
confirmation. Reject invented navigation, success counters and remote thumbnails.

Keep the20-concurrent-request safety budget, remove lifetime-history limits.
Preserve legacy task results/drafts and state codes; present generated results as
generated, not pending approval. New bound results fill unchanged eligible fields
automatically under account/object-version protection; conflicts retain results.
Unbound results open the existing scene editor directly. No second editor system.

Deletion/cleanup affects task records only, can cancel a running task after durable
removal and must prevent late responses from resurrecting removed records. Undo
restores records under account and tombstone checks, never reissues a paid request.
Exercise screenshots/learning associations remain separate from task cleanup.

All shared confirmation DOM must live in a native modal top layer while open,
preserving custom confirmation buttons, keyboard cancellation and focus return.
Do not try to outrank native dialog with ordinary z-index.

Test seeded100/150 legacy tasks and new creation, every-state deletion, cleanup,
late results, quota, auto-save/background/manual edits, capture cleanup, concurrent
accounts and nested dialogs at five widths/light-dark. Retain media zero-idle gates.
