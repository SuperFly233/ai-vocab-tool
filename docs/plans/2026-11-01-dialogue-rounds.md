# v0.46.0 Shared Sentence Selection and Fresh Capture Rounds

User extension approved during0.45 deployment: ordinary image analysis must expose
the same numbered utterance selection as exercise capture; ending and starting
another round must visibly clear the current capture workspace.

Generated/inspected dialogue-rounds0460-reference.png first. Adopt integrated
sentence choices, numbered image locations and an explicit start-new-round action.
Reject invented main navigation, speech/audio buttons and duplicate editor panels.

Reuse ExerciseData validation and the existing model request/task storage. A single
complete utterance can fill automatically; multiple/ambiguous utterances remain
selectable. Candidates and selection persist on the task, not as concatenated
scene text. Saved-scene late results remain account/media/version guarded. Manual
editing before switching candidates requires confirmation; no extra model call.

Capture rounds receive stable identities. The visible list/count/lookup association
uses only the current round. Start-new clears current selection, unread/results and
quick input; finished round receipts retain unsent text and original item/task IDs.
Past rounds are readable explicitly; their analysis continues and cannot appear
as new current-round content. No deleting scenes/media or cancelling jobs on end.

Acceptance: ordinary image import -> three candidates -> select -> save/reopen;
single/legacy/no-readable response; immediate save and background return; manual
edit conflict, refresh/account/quota protection. Exercise end -> start-new empty
-> import next screenshot with correct round/association, old tasks/results intact.
Five widths/themes, keyboard/touch, media request budget, existing query and scene
deletion protections. New capability release0.46.0, not a0.45 layout patch.
