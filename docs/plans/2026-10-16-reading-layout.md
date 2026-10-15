# Reading Layout Refresh

## Release Order

The user explicitly requested completing and verifying the data patch first. v0.22.1 was committed as `6bbf62d`, pushed, deployed to Cloudflare, and production `/favorites` plus the exact built application script were verified before editing styles.

## Design

Replace nested bordered groups and cards with a reading-first hierarchy: section headings, compact part-of-speech headers, plain numbered entries and fine separators. Preserve the containing detail dialog, version controls, membership row, editing, highlights, speech and fragment bookmarks.

## Three Improvements

1. Flatten sense groups and collocation entries, removing nested borders, colored fills and hover shadows.
2. Place numbering and bookmarks on the heading row only, restoring full-width body lines and a 44px touch target.
3. Unframe core meaning, metadata and register blocks, consistently on home results and history detail.

No new user-facing features are introduced in this visual patch.

## Measured Evidence

`check:reading-ui` uses a realistic two-sense English phrase with Chinese definitions:

| Viewport | Previous definition width | New definition width |
| --- | --- | --- |
| 320px | 83px | 216px |
| 390px | 153px | 286px |
| 1440px | 792px | 960px |

Screenshots: `%TEMP%/lexi-reading-qa`, before/flat, mobile and desktop, light and dark, detail and scrolled home. Mobile dark reading and desktop light overview inspected visually after opening animations settle.

## Release Gates

- Reading UI: six viewport/theme combinations, real bookmark clicks/taps, no title overlap or page overflow.
- Responsive UI: 320/390/768/1440 normal and long text, local wide-table scrolling, sticky search and detail width.
- Existing learning workflow: speech, review, export, drafts, reorder and quota rollback. The quota case now uses an actually absent membership rather than a no-op repeat addition.
- Complete data and contract checks, build, Git push and production resource verification.
