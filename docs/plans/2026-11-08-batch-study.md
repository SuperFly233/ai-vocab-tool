# Batch Processing and Independent Study

Feature release candidate: 0.47.0, based on released 0.46.0. Provider incident
work is explicitly paused. No Bridge changes or automatic Anki writes.

## Reference Decisions

Generated and inspected `docs/design/batch-study047-reference.png` before edits.
Adopt compact processing rows, source tabs, optional automatic lookup with a
visible budget, and an independent front/back learning page. Reject the mock's
duplicate sidebar, invented counts, and mandatory per-image approval.

## Implementation

- `/processing`: one global entry replaces repeated analysis-record buttons.
  Import originals before requesting a model; reuse existing account-owned
  task results. Accept old tasks and selected existing scenes in the same queue.
- Shared SceneAITasks pipeline, maximum two running analyses, twenty items per
  deliberate processing operation. No automatic regeneration on refresh.
- Collect complete distinct utterances; retain no-text and incomplete results
  without deleting originals. Existing object revisions guard supplementation.
- Optional automatic contextual lookup uses the existing lookup queue, captures
  current model identity, reserves at most twenty submissions per operation, and
  never automatically chooses between multiple existing entries.
- `/study`: separate navigation item, explicit enrollment, pinned ts-fsrs5.4.2
  and FSRS-6. Account-isolated IndexedDB state/event transactions, due-first,
  ten new targets/day, fixed timezone, four ratings, pause/skip/Undo/content
  confirmation, review history and estimated curve. Scene and history targets
  remain distinguishable. Local study ledger is not represented as cloud sync.
- Study export/restore does not overwrite conflicting or newer target states.
  Old cloud-memory module stays gated; no database permissions are weakened.

## Acceptance

Normal UI import -> synthetic HTTP image analysis -> collection -> contextual
lookup -> explicit study enrollment -> reveal -> score -> refresh/Undo. Cover
five widths/two themes, long text, account switch, delayed returns, failed
storage, duplicates, bounded queries, no-text images, and legacy result reuse.
Synthetic tests do not establish real-model quality. Physical devices remain
user acceptance. Deploy only an identified accepted build; do not claim all
historic roadmap modules completed.
