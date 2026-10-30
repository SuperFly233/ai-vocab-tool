# v0.43.21 Capture-First Exercise Redesign

## Design and Implementation

Built-in imagegen produced exercise04321-alternatives.png and exercise04321-layout.png before edits; both are saved under docs/design. Chosen capture-first rather than reading-first. Rejected invented summary word counts, false all-complete badges and background decoration. Layout decisions in docs/plans/2026-10-30-exercise-redesign.md.

- Empty capture has no vacant grid/nav, a single intake action and an immediately adjacent ordinary-lookup field. Header secondary actions48px; primary capture/lookup64px. Large reading34/30px and translation28/26px remain.
- Preferences uses a bounded native shared dialog, themed switch, deliberate model action, native focus containment and return focus. It never changes underlying geometry or invokes a model on opening.
- Horizontal numbered screenshots use lazy, serially generated96px local thumbnails. Desktop image/reading tracks2:3; below1100px stack. Original media is unchanged; temporary thumbnails are released on leaving/account changes.
- Keyed task rows and content signatures prevent unnecessary replacement. Text selection postpones current-content updates until released; reading disclosures and button focus are restored. Input skeleton remains stable. No new background network timer.
- Query target is captured before async storage or entry choice. Empty capture goes to ordinary queue; existing screenshot can accept lookup before AI finishes without an invented empty-sentence instruction. Reusing an existing term does not generate a duplicate. Clicking a target cannot clear unrelated unsent input.
- End summary shows durable receipts, then nonzero running/queued/ambiguous/failed/unstarted counts with exclusive classification. Input and session identity persist; submitted analysis is not cancelled.

## Evidence

- `check-exercise-redesign.cjs`:320/390/768/1024/1440 plus1152/960 effective CSS viewports (125/150% desktop-layout simulation), both themes; empty+open preferences geometry/focus,1/3/20 entries, long text, ordinary lookup, immutable query binding, native text selection preservation, IME/newline, Backlog and summary passed. Effective viewport simulation is not an actual physical browser zoom/device test.
- `check-exercise-capture.cjs`:five widths x both themes passed actual synthetic task scheduling, two execution slots, background completion, exact Enter, Backlog selection, refresh and cleanup summary.
- Dedicated safety and summary suites passed manual-edit protection, settings-save failure, durable receipts, no model on failed save, account isolation, ended refresh and deliberate restart identity.
- Actual screenshots under tmp/exercise04321 are manually compared to the generated hierarchy before release; selected copies and deployment evidence appended below.

## Boundaries

No new backend, database migration, provider fallback, Bridge release, real paid model call or private learning data change. Cloud API health remains a separate gate; synthetic UI success does not establish live cloud writing, exercise-distance readability or physical iPhone behavior. Existing source/memory/native capture/storage/consolidation debts remain separate.

## Final Preview Acceptance

- Final preview: https://c3b8094b.ai-vocab-tool.pages.dev/exercise . All194 static resources matched local SHA256; anonymous sync/Anki/source routes returned401. This establishes route protection, not authenticated private writes or actual Anki readiness.
- Full14-case redesign matrix rerun after the final literal clipboard instruction and target-click/input regression: passed. `npm run check`, idle-network, control-motion, immediate-save and unlink protections passed. Native zoom and physical keyboard/device behavior remain separate from simulated effective viewports.
- Selected actual screenshots: [empty](v04321/empty-1440-light.png), [preferences](v04321/preferences-390-light.png), [desktop content](v04321/3-1440-light.png), [phone content](v04321/3-390-dark.png), [Backlog](v04321/backlog-1440-dark.png), [summary](v04321/summary-390-light.png). Manually inspected against the generated hierarchy; preference bounds/padding and empty clipboard instruction corrected before release.
