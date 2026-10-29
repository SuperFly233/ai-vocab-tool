# v0.43.19 Independent Exercise Page and Static Annotations

## Delivered Behavior

- Exercise is a real /exercise page, not a dialog. Ordinary navigation/background UI is hidden only on that page. A licensed Tabler Run icon matches the existing24px/2px icon geometry; no extra main navigation item.
- Large reading text,64px main actions, one concise intake instruction and exact multiline lookup remain. Return detaches presentation without cancelling tasks.
- Ending stops new intake and shows session-specific saved/running/ambiguous/failed/waiting counts. Unsent lookup text persists; process-pending opens the first pending item. Review, continue and query-task routes are explicit. Refresh preserves an ended session summary rather than silently starting another session.
- Existing media editor now supports eight static annotation tools, native text editing/size, selection/transform, layer drag order, Undo/Redo and crop-independent parameters. Konva10.9.0 is locked, MIT licensed and loaded lazily from same origin.
- Derivatives are flattened deterministically before crop/resize. Original and editable parameters stay separate. Animated GIF/video processing is unchanged, not flattened into a still image.
- Privacy-marked restoration originals are omitted from this scene's normal sync/backup file-reference lists; AI crop receives baked annotations. Legacy missing annotation fields cannot remove existing masks. Explicit clear remains distinct. This does not recall earlier uploads or make pixelation reliable secure redaction.

## SOP and Evidence

- Generated and inspected exercise-page-reference.png before the independent-page change; annotation layout uses the inspected third view of exercise-capture-reference.png. No generated data, extra navigation or backgrounds copied.
- Five widths320/390/768/1024/1440 x light/dark: independent route, runner, large controls, background2-slot execution, Backlog selection, Enter, refresh, input retention and complete ending summary passed.
- Ten annotation viewport/theme cases: all8 tools, native text, Undo/Redo, reset-crop independence, saved derivative/original, privacy refs and reopened parameters passed. Pixel assertion verifies AI crop reads the redacted area instead of the raw original.
- Strict bounded annotation schema and malformed payload tests pass, including legacy-missing versus explicit-clear roundtrip. Original scene save-failure/manual-edit/account guards pass.
- Actual pinned WASM synthetic video96x60/1.2s retained audio; synthetic GIF retained6 frames. Component consent/checksum/cancel/video preview and single-frame crop pass. Old motion test was corrected to the already-shipped no-checkbox Analyze authorization.
- Shared control-motion8 cases and npm check passed; manual Help acceptance has6 groups25 steps with no learning/settings writes.
- Actual screenshots in v04319 folder are inspected before release. Preview/release URLs and resource hashes appended after verification.

## Boundaries

Bridge remains0.4.1. System-global capture and its new portable-package acceptance are not delivered by this web stage. Browser paste works without upgrading Bridge. No Anki protocol/template/scheduling change, no source or memory service activation. Paid model quality, live exercise readability, native mobile behavior and real Backlog extraction remain user-run acceptance; synthetic tests do not establish those.
