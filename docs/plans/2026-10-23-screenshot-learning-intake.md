# Screenshot-First Learning Intake (Required Follow-On)

User requirement, 2026-10-23: reduce manual collection and card preparation so language learning remains the primary activity. Continue v0.37 complete-content cards; this screenshot workflow is mandatory additional scope, not a replacement for unfinished acceptance.

## Flow

Select/paste/drop screenshots from phone or desktop, including batches -> analyze only explicitly submitted media -> match original sentence and canonical source -> derive translation, highlight and queried terms -> save scene draft -> reuse existing lookup queue and Anki preview.

Explicit user-specified sentence/term wins. Without a specified term, analysis may propose or select meaningful phrases. Do not silently submit a whole image archive or monitor OS screenshots. Anki writing still requires existing batch approval.

## Reliability Theme: Trustworthy Attribution

1. Preserve original image and recognition text, with bounded batch size and independent failure retry.
2. Give each item a stable request identity; retry must not upload or create duplicate scenes.
3. Normalize source identity and reuse an existing canonical source; aliases must not create near-duplicate records.
4. Exact quotation/source-ID matches can resolve automatically; ambiguous fuzzy candidates require review, not automatic destructive merge.
5. Unknown chapter, speaker, episode and timestamp remain unknown, not invented by a model.
6. Account/device changes and late replies cannot overwrite another draft or previously corrected source.

## Optimization Theme: Minimal Manual Work

1. Reuse existing paste/file/drag media intake and scene editor.
2. Original sentence, translation and their highlights remain adjacent and independently editable.
3. Batch progress and failures stay in one intake workspace, not repeated Toasts.
4. Remember a chosen source for the current batch, allowing per-item overrides.
5. Preserve user corrections and never rerun successful extraction silently.
6. Resulting scenes enter existing association, review and complete-content card workflows; no new primary navigation.

## New Capabilities Theme: Capture to Learning

1. Screenshot batch inbox usable on phone and desktop.
2. Explicitly configured vision recognition, with visible provider/cost/privacy boundary; no silent fallback to a different service.
3. Genshin quotation database adapter for canonical original sentence/translation/source matching. Database location/interface currently requested from the user.
4. Canonical sources and editable aliases with transparent match evidence.
5. Automatic ordinary-source translation when no quotation translation is available, marked as model-generated rather than canonical game text.
6. Suggested terms plus bilingual multi-fragment highlights; user's explicit query overrides inference.

## SOP and Release Gates

Generate and inspect desktop/mobile intake references before substantial UI work. Use real components, established history search and theme; test five widths, both themes, empty/ambiguous/no-match sources, duplicate screenshots, offline recovery, partial model failure and manual corrections. Keep selected-upload consent separate from arbitrary background device capture. Do not advertise Genshin matching until the actual database and representative matches have been verified. Do not claim this document itself delivers OCR or screenshot automation.

Current urgent work is the independent v0.36.1 storage quota hotfix, then finishing v0.37/Bridge0.4 acceptance. No screenshot recognition has been shipped by this plan file.
