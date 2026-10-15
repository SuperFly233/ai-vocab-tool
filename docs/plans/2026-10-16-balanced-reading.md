# Balanced Reading Hierarchy

## Feedback

The user found v0.22.2 too bare: removing nested borders also removed helpful reading boundaries. Keep the regained mobile text width without treating every visual container as unnecessary.

## Scope and Counts

- Bug fixes: 0 new behavioral bugs claimed.
- Existing experience improvements: 3 (entry grouping, core meaning emphasis, text hierarchy).
- New features: 0.

Individual senses and collocations receive one subtle background surface with 8px corners and modest padding. The outer part-of-speech group remains transparent and borderless. Numbering is a compact marker on the heading row, not a full-height sidebar. Bookmarks remain 44px and occupy only the heading row. Saved entries have a restrained background difference rather than additional framing.

Core meaning uses an emphasis band. Definitions and examples have primary text color; translations remain secondary. No changes to schema, sync, editing or highlight matching.

## Verification

- Reading screenshots and real bookmark clicks at 320/390/1440px, light/dark, detail and scrolled home.
- At 390px the definition is 262px wide, versus 153px in the original nested layout and 286px in the overly bare version; at 320px it is 192px versus the original 83px.
- Mobile dark reading and desktop light overview screenshots inspected in `%TEMP%/lexi-balanced-qa`.
- Regression assertions preserve unbordered outer groups, visible individual reading surfaces, title/bookmark separation, touch area and no page overflow.
- Responsive long text, speech/review/export/editing and full checks remain release gates.

All local release gates passed: six reading viewport/theme combinations, four responsive widths with normal/long content and sticky/detail checks, four learning workflow viewport/theme combinations, `npm run check`, `npm run build:pages` and `git diff --check`. Touch coverage uses Edge emulation rather than a physical iPhone/Safari.

This is a calibrated reading-layout adjustment, not a claim that the entire application has been redesigned.
