# Exercise Capture / Approved Design

Reference: ../design/exercise-capture-reference.png. Inspected before implementation.

## Layout Decisions

- Keep existing navigation. Enter from home/scene action icons; no generated navigation labels are copied.
- Exercise mode is genuinely large type: body 30-34px, translation 26-28px, primary actions at least64px; no tiny routine metadata. Existing theme tokens and bottom-line inputs remain.
- Desktop task rail and current screenshot/content; phone horizontal recent-task strip, full-width current content, sticky quick lookup. Selected Backlog choices collapse under Change Sentence.
- Screenshot receipt follows file/draft and scene persistence. Capture is not AI completion, which is not dictionary completion.
- Each new screenshot has an immutable independent identity. Analyze at most two tasks concurrently across tabs using browser locks. Pending files remain in the account draft; never silently rerun after refresh.
- Auto-save is specific to exercise capture. Existing editors retain their manual-change guards; no automatic Anki approval. Model consent explains the distinction.
- Backlog candidates are independent utterances with normalized rectangles. A pointer must select exactly one complete candidate. No pointer/multiple candidates requires a single selection, not a full review form.

## Stages

1. Web exercise capture and Backlog, independently tested/released.
2. Static screenshot annotations in the existing media editor, original/derivative and privacy guards.
3. Optional Bridge session capture with restricted local authorization, packaged acceptance and website update flow.

Do not report stages2/3 as implemented by stage1. Actual model quality and physical exercise/device testing remain separate.
