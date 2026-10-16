# History Controls Repair

## Requested Behavior

1. Desktop history must show its filter controls on direct navigation, reload and return visits, without going through settings.
2. Search is global by default. Opening the scope menu must not require deselecting six fields just to search one or two.

## Root Cause and Changes

`renderHistory` gated creation of filter controls behind `historyState.filtersOpen`, a mobile collapse state. Desktop CSS displays the filter bar and hides the collapse button, so its unpopulated container appeared to vanish. Always populate the controls, including empty history; mobile CSS still collapses them. Cache collected option values on the existing derived-history cache so repeated searches do not rescan all records. History/settings updates use the existing invalidation mechanism.

For scopes, retain the existing normalized full list for default all-field matching, but render it as implicit all rather than six active choices. The first click narrows to that field, additional clicks add or remove fields, removing the final field restores all, and the explicit all action resets. Merely opening the menu leaves results unchanged. Use a Lucide check icon and `aria-pressed` for explicit selections.

## Counts

- Bugs fixed: 1 (missing filter control initialization).
- Existing functionality optimized: 1 (scope-selection workflow, including icon state).
- New user-facing features: 0.

## Verification

Both failures were reproduced in the new browser regression before editing production logic. After fixes, 30 checks pass across 390/1440/2138px, light/dark:

- Empty-history direct `/history` entry initializes all seven filters.
- Reload and settings round trip retain working language filtering.
- Scope first choice, additional choices, removal and reset produce the expected matching records.
- Collapsed mobile to desktop resizing requires no settings detour.
- Unchanged history reuses option collection; record additions/deletions invalidate it and refresh choices.

Screenshots include normal, scope-all, scope-example and scrolled states in `%TEMP%/lexi-history-controls-qa`. Desktop light history and mobile dark scope selection were inspected. No new layout theme or data schema is introduced. Touch context uses browser emulation, not a physical phone.
