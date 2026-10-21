# Project Working Agreements

Read PROJECT_CONTEXT.md for current architecture and release boundaries.

## UI Workflow (User Preference)

For substantial UI/layout changes, call the image generation model FIRST to produce a concrete design reference. Then inspect the generated result, write the scoped bug/optimization/new-feature plan, implement real components, and validate screenshots before publishing. Do not use the generated mockup as the webpage background or copy invented navigation/data from it.

Compare suitable icon families when choosing semantics; use a coherent rendered set with consistent stroke, size and button geometry. Prefer an accurate action over a decorative/ambiguous symbol. Do not mix character glyphs with SVG controls. Existing Lucide remains the implementation default when it has a suitable icon.

Editor dismissal: unchanged closes immediately; modified drafts require confirmation; discarding shows a Toast undo that restores the draft only after checking account, object identity and later modifications. This applies to close buttons, Escape and deliberate backdrop clicks. Saving is not discarding.

Persistent project memory: PROJECT_CONTEXT.md and docs/ui-sop.md. Append new user preferences without removing prior agreements. See docs/ui-sop.md for acceptance details.
