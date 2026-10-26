# v0.43.4: consistent target reordering

## Scope and Layout Decision

The user rejected visible up/down commands. Reuse the existing history/settings six-dot Lucide grip, 36x40 geometry, grab cursor, direct movement, sibling animation and scroll helpers. Do not generate a competing control design. Both the scene editor and AI task Check surface use this same behavior; numbers describe order, not separate controls.

## Implementation

- Remove visible target up/down buttons in both surfaces.
- Shared reorder binding supports mouse drag, touch hold/drag, keyboard directions on the grip, Escape cancellation and pointer cancellation. Cancellation restores the original order without closing the editor.
- Keep stable target IDs, checkbox selection, typed contextual meaning and existing-entry choice; reorder performs no AI request.
- Pending review moves complete target groups including phrase, contextual meaning and existing-entry selector. Persist their order in the same account-scoped draft.

## Acceptance

- Local 320/390/768/1024/1440, light/dark: mouse drag, touch drag in narrow Check view, cancellation, keyboard/focus, stable selection, guarded adoption and refresh recovery passed.
- Task safety suite: duplicate execution, stale adoption, quota before/after response, cancelled late results, existing-entry reuse and contextual full lookup passed.
- Existing control/motion suite: eight width/theme cases passed. Full npm check passed.
- Final independent preview: https://d6139c03.ai-vocab-tool.pages.dev (supersedes the earlier60ada98f/61fa7235 inspection builds). Final deployed mobile regression includes the row-local enhanced-selector assertion.
- Screenshots inspected: [editor390dark](../screenshots/target-drag0434/editor-390-dark.png), [Check390dark](../screenshots/target-drag0434/check-390-dark.png), [Check1440light](../screenshots/target-drag0434/check-1440-light.png). Screenshot inspection caught the enhanced-selector wrapper remaining outside its target; enhancement now runs after row assembly, with a regression assertion.

## Limits

## Release Evidence

- Runtime commit: `6dbe444`, pushed to main.
- Production: https://88abd4ea.ai-vocab-tool.pages.dev and https://ai-vocab-tool.pages.dev.
- Final preview and official domain:155 file hashes matched, sync/Anki unauthenticated requests returned401. Official390dark synthetic drag/keyboard/cancel/target-adoption/recovery flow passed.

## Remaining Scope

Synthetic browser fixtures, not physical iPhone testing. No paid model requests or Anki/Fushi changes in this correction. Canonical sources/Teyvat/classification and FSRS remain unfinished, tracked separately; source WIP checkpoint remains intact.
