# Favorites Boundary Patch

## Scope

v0.22.1 fixes four reproduced behaviors without UI changes:

1. A stale membership picker overwrote unrelated newer memberships and star state.
2. Confirming an unchanged selection advanced record and metadata clocks.
3. Deleted or already-added records remained selected in the existing-record picker.
4. Repeated batch additions changed timestamps and overstated the success count.

## Implementation

- Keep initial picker memberships and merge only additions/removals into the latest record.
- Advance only changed metadata clocks; skip no-op storage writes entirely.
- Revalidate existing-record selections at render and submission.
- Count only records with actual membership additions.

## Verification

- Six production-browser boundary cases pass, including independent field clocks and submission without a prior rerender.
- Favorites UI regression passes at 320, 390 and 1440 pixels in light and dark themes, including touch, draft preservation, nested overlays, quota failure, search and exports.
- Screenshot evidence: `%TEMP%/lexi-v0221-qa`; narrow dark membership picker inspected visually.
- Full data/contracts checks and Cloudflare build are release gates.
- Browser tests simulate concurrent changes in offline fixtures; no real credentials or live account records are used.

## Next

Only after deployment verification: redesign result/detail reading sections to remove nested borders and reclaim mobile text width. Keep this separate from the data patch.
