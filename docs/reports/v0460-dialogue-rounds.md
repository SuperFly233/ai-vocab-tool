# v0.46.0 Ordinary Sentence Selection and Capture Rounds

## Actual Changes

- Ordinary image analysis reuses the validated multi-utterance response. One
  complete sentence can fill automatically; ambiguous/multiple sentences stay
  selectable inside the existing editor, not concatenated or sent to another app.
- Shared numbered choices and position renderer in scene-dialogues.js; known
  image indices bind boxes to the correct static image. Missing multi-image
  position evidence never draws a guessed box. Legacy single-scene output works.
- Choices persist on account-owned existing tasks, survive immediate save and
  refresh. Selection performs no model request. Manual text changes require
  confirmation; stale media/task/account results do not overwrite the editor.
- Exercise lists/counts/lookups are scoped to the current round. End does not
  cancel jobs. Start-new resets current image, unread state, results and input;
  old originals/tasks and unsent words remain in explicit past-round receipts.
- Opening an old task locates its exact round/item rather than merely navigating
  to the latest exercise page. Returning/ending does not approve Anki.

## SOP and Acceptance

Generated/inspected docs/design/dialogue-rounds0460-reference.png before code.
Adopt integrated choices, clear end/new-round actions; reject invented nav/audio.
Actual screenshots copied to docs/design/dialogue-rounds0460-{desktop,mobile,new}.png.

- check-dialogue-rounds:320/390/768/1024/1440 light/dark, normal-control import,
  synthetic HTTP image probe/three utterances, choose/save/reopen, end/new/archive
  and refresh passed.390dark also rejects replacement of manual text, continues
  an old delayed response without showing it in the new round, and correctly
  receives another screenshot into its new identity. No generation replay.
- check-dialogue-background passed immediate save before a delayed multi-sentence
  response, retained ambiguity, opening the result, selection/save and refresh.
- check-round-lookup-isolation passed same-word reuse with separate round receipts,
  archived submission preserving current input, failed new-round persistence
  retaining the old round, and retry/double-click creating exactly one new round.
- Existing ordinary AI/three delayed-image immediate-save/lifecycle390light,
  exercise safety/redesign390light/summary/quota and task safety passed.
- Media baseline20->1 and real-page30remote/5focus-sync-online/25renders/20s idle0
  remain passed. Source0.45 functionality and authentication are retained.
- Four-state exercise normal-controls journey390light passed after shared renderer.
  Final version checks, preview and deployment results follow below.

Independent preview6aafa5fc:197static SHA256 and private401/legacy media405 passed;
actual deployed390dark normal-control fixture workflow and runtime0.46.0 passed.
No paid model calls; latest guards are tested locally and included in final build.

## User Steps

Ordinary scene: add screenshot -> analyze -> choose a numbered sentence -> edit or
save. For immediate save, open the generated result from analysis records afterward.
Exercise: end -> start-new-round. Only the new round appears; past-round button
recovers prior screenshots and unsent text. Ending never means deleting a scene.

## Release Evidence

- Runtime commit8661e29 (capability commitb4135e2), final independent preview
  b3089303, production1441e53a and official alias ai-vocab-tool.pages.dev.
- Final preview197SHA/private401/legacy media405, actual390dark fixture journey
  and independent runtime0.46.0 passed. Official390light fixture journey passed;
  actual authenticated production source catalog HTTPS read passed, no writes.
- npm check passed on final version. Official197static SHA256 match, private
  sync/Anki/sources/media-v2 anonymous401 and legacy media POST405 passed.
  Shared capture preview parity completed separately, as recorded below.

Shared parity completed: merge5c36ec6 ->71ca469d/capture-v038-preview,201SHA/private401
and legacy media405; capture data/ten UI/synthetic vision, shared source/dialogue
390dark and deployed390dark normal-control fixture flow passed. Capture-only
intake hooks/metadata remain isolated. No preview-only promotion to main.
Main build retains84icons/197public assets; capture preview has85icons/201assets.

## Scope

Synthetic responses are HTTP fixtures, not paid real-model acceptance. Model
recognition quality/real phone/exercise distance remain user-led. No Anki writes,
Bridge protocol changes, database migrations or other unfinished features in this
follow-up.0.46 is the next capability version, not a claim that the old FSRS plan
has shipped. Source0.45 is already live, with Teyvat corpus still0lines.
