# v0.42.0 legacy-entry supplementation

## Status

Stage A implemented and locally verified; preview/production acceptance pending. This is6 of the approved18 units, not the entire v0.42 plan. Stage B duplicate consolidation and C real-provider screenshot release remain pending. No private history, Anki/Fushi data or actual paid model was changed by these tests.

| Unit | Result | Evidence |
| --- | --- | --- |
| A1 structure scan | Implemented | History/favorites current-range More entry; missing sections use actual empty structure, not prose length; pure data test |
| A2 explicit selection | Implemented | No default selected entry; max20; section checkboxes; scanning performs zero requests |
| A3 structured generation | Implemented; live-provider use not tested | Current configured model shown, existing direct/cloud request transport, complete structured response and220KB/field limits, no silent truncation; prompt contract tests |
| A4 review/edit/retry | Implemented | Original reading plus selected-section fields, individual regenerate confirmation; existing successful proposals are skipped by batch generation |
| A5 new-version commit | Implemented | Atomic batch account/canonical full-record checks, old rolls/Origin/note/folders/scenes preserved; failed write leaves proposals |
| A6 recovery/undo | Implemented | Actual IndexedDB draft reload, no credentials, guarded discard/restore, adoption undo tombstones supplemental roll, future timestamps and later changes tested; no Anki snapshot mutation |

## Verification

- `npm run check` passes data/storage/settings/sync/media/queue and source contracts.
- `npm run check:entry-maintenance-data`: missing-not-short, selected-only composition, untouched identity/extensions, dual highlights, invalid/misaligned/oversize structure; provider purpose/section/context boundaries.
- `npm run check:entry-maintenance`:320/390/768/1024/1440 both themes, synthetic model, actual IndexedDB refresh, reviewed long summary, new rolls, storage failure and undo. Screenshots manually inspected; explicit viewport centering corrected after the first image review.
- `npm run check:entry-maintenance-safety`: two-entry conflict is all-or-none, future clock tombstones, later edit prevents undo, changed section requires regeneration, quota failure prevents inference, late result after account switch rejected.
- Shared control motion, nested-modal dismissal and existing scene supplementation suites pass.

Design was generated with built-in imagegen and inspected before implementation: `../design/entry-maintenance-v042-reference.png`. Its fictional dictionary attribution/preselection were rejected. Actual implementation screenshots contain only synthetic text.

## Limits

Physical iPhone and authenticated multi-device synchronization were not exercised. Generation tests simulate model responses, not provider quality/cost/availability. No claim of verified dictionary or official quotation content. Old duplicate records remain untouched. Screenshot recognition is not in the production build.

## Release

Pending preview and production evidence; do not interpret candidate source version as production deployment.
