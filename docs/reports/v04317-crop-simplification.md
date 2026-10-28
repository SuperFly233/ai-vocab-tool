# v0.43.17: Direct Crop Analysis

User requested removing the repetitive checkbox and explanatory text. This removes controls/copy within the existing layout, not a new editor or a redesign requiring another generated layout.

- Explicit Analyze click is the per-action authorization to analyze the current frame. Opening the editor does not probe or upload. Existing first profile/fee confirmation remains in SceneAI.chooseProfile.
- Removed the per-edit checkbox and its blocking/cancel handlers, permanent instructions and redundant preview explanation. Empty status is collapsed; progress, stop, short completion/empty feedback and actual errors remain.
- Follow-up: removed the three-purpose selector too. One analysis request evaluates full frame, subtitles and subject together, displayed in that order; no three separate paid calls. Missing/uncertain kinds may be omitted, never invented. Header now shares a single title/action row; obsolete selector CSS removed.
- Single-frame sampling, profile identity checks, manual-edit protection, explicit rectangle preview and confirmed non-destructive derivative are unchanged. Media component download confirmation is separate and unchanged.
- Updated synthetic regression to assert no checkbox, no initial copy, zero requests on open and one probe plus one analysis after the first click, in addition to the existing safety checks. No real model/provider acceptance is claimed.

Screenshot and release evidence appended below after tests and deployment.

## Evidence

- Actual screenshots manually inspected: `docs/reports/v04317/desktop.png` and `mobile.png`. No checkbox or purpose menu; title and Analyze share one row, empty status/footer collapsed.
- `npm run check`, ten width/theme crop cases, media-editor dismissal/pointer/keyboard/Undo safety and control-motion matrix passed. Requests are mocked; no actual paid model quality or physical phone acceptance is implied.
- Final independent preview https://861a9941.ai-vocab-tool.pages.dev :186 hashes/sync401 and390px light/dark simulated model flow passed. First hash attempt hit TLS ECONNRESET; repeat against unchanged build passed.
- Runtime0337e69+5827500 pushed to main; production https://0aca37df.ai-vocab-tool.pages.dev / https://ai-vocab-tool.pages.dev :186 resource hashes/sync401 and official390px dark synthetic crop flow passed.
- Capture paritye1a4ea3 pushed and deployed to https://300ac040.ai-vocab-tool.pages.dev :190 hashes/sync401, capture data, simulated vision safety and390dark crop passed. Returned to main and restored76-icon/186-file output. Source/memory service readiness and Bridge/Anki remain unchanged.
