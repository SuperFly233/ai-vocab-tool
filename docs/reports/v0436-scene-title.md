# v0.43.6: one scene-analysis title flow

- Root cause: the optional title AI button increased only the left label's height; an obsolete separate text-title mode, marker and save-time model request remained alongside unified scene analysis.
- Remove the title-only AI button, mode, marker and followup request. Unified scene analysis still returns an editable title in its existing reviewed result. Saving uses an adopted/manual title or local blank-name fallback; no additional model call.
- Rename the remaining selector to 名称留空时, with text/source/manual local fallbacks. Legacy `ai` settings and recovered draft values map to text. Existing titles and task identities are not rewritten. No API/schema/native helper changes.
- Paired labels use one24px baseline track and both controls use44px border-box height. Desktop top/height differences asserted within1px in five-width/two-theme layout checks. Existing background-save/task regression390light and npm check passed.
- Scene AI390light confirms one verification + one analysis includes title; safety suite verifies legacy preference normalization and zero title calls. Draft/account/version/atomic adoption/Undo/cancellation protections pass. Synthetic provider tests only, no private content/native writes.
- [Desktop title row](../screenshots/title0436/title-1440-dark.png), [mobile title row](../screenshots/title0436/title-390-light.png). Uses the existing approved0.43.5 design; no separate new design/feature expansion.

Released runtime commit `db04cac`, pushed to main. Preview https://2af0653a.ai-vocab-tool.pages.dev: desktop1440dark/mobile390light flows and155 hashes/auth401 pass. Production https://9b6cd1e5.ai-vocab-tool.pages.dev / https://ai-vocab-tool.pages.dev:155 hashes/auth401 and deployed1440dark title-alignment flow pass.

Isolated capture parity: merge `6c9c246`, https://ea47b9c1.ai-vocab-tool.pages.dev / capture-v038-preview; capture data, synthetic vision,1440dark redesign and AI-safety checks pass.159 hashes/auth401 verified on retry after one transient fetch failure. Main checkout/155-resource build restored. No capture-only feature promoted into production.

Physical iPhone untested; canonical sources/Teyvat/FSRS and retained backlog are not delivered by this correction.
