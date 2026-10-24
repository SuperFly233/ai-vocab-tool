# v0.40 Scene Editor Candidate

Status: released2026-10-25; evidence in docs/reports/v0400-scene-editor.md.

## Design First

Generated and inspected `docs/design/scene-editor-v040-reference.png` before implementation. Adopt its compact title-only header, home query context above media, paired bilingual/highlight fields and secondary source section. Do not copy fictional limits or example dropdown options. Existing media limits and storage stay unchanged.

## Bugs

- Replace native single-value dropdown presentation with the shared themed listbox while preserving original values, listeners and preferences.
- Selection-to-highlight action exists only after a real selection; Escape dismisses it before the editor.
- Preserve account/object-version guards during asynchronous title generation, failed storage and discarded-draft recovery.

## Optimization

- Follow-up2026-10-25: retain a folder icon on Home even when text is hidden; move query disclosure to a lightweight edge chevron, including sticky state. Do not increase the64px sticky shell or clear pending tasks when closing it.

- Home: one word/phrase field plus direction and focus; no duplicated pending-term field.
- Scene library: optional multi-term basket, not a mandatory lookup.
- Whole rectangular media target; paired text/highlights; title, notes, source last.
- Remove redundant header subtitle and editor placement toggle; preserve existing stored placement.

## New Capability

Empty titles reuse an explicitly configured text profile and only typed quote/translation and limited source labels. No image inference, new provider or hidden lookup. Without a usable profile, produce a deterministic short local title. Request failure keeps the draft and offers explicit local-title save. Existing titles never invoke the model.

## Acceptance

Five widths, both themes; actual custom dropdown interaction; selection popover; no-config/configured/failure/cancel/stale title paths; home field propagation and standalone distinction. Run existing authoring, queue, media, dismissal, consistency, provider and data regressions. Production release is gated by preview screenshots and resource checks.

Teyvat indexing, screenshot source recognition, media editing and duplicate entry identity remain separate unfinished work. No external software or private data operations in this iteration.
