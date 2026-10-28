# v0.43.17: Direct Crop Analysis

User requested removing the repetitive checkbox and explanatory text. This removes controls/copy within the existing layout, not a new editor or a redesign requiring another generated layout.

- Explicit Analyze click is the per-action authorization to analyze the current frame. Opening the editor does not probe or upload. Existing first profile/fee confirmation remains in SceneAI.chooseProfile.
- Removed the per-edit checkbox and its blocking/cancel handlers, permanent instructions and redundant preview explanation. Empty status is collapsed; progress, stop, short completion/empty feedback and actual errors remain.
- Follow-up: removed the three-purpose selector too. One analysis request evaluates full frame, subtitles and subject together, displayed in that order; no three separate paid calls. Missing/uncertain kinds may be omitted, never invented. Header now shares a single title/action row; obsolete selector CSS removed.
- Single-frame sampling, profile identity checks, manual-edit protection, explicit rectangle preview and confirmed non-destructive derivative are unchanged. Media component download confirmation is separate and unchanged.
- Updated synthetic regression to assert no checkbox, no initial copy, zero requests on open and one probe plus one analysis after the first click, in addition to the existing safety checks. No real model/provider acceptance is claimed.

Screenshot and release evidence appended below after tests and deployment.
