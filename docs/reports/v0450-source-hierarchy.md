# v0.45.0 Canonical Sources

## Scope

Canonical account-owned works, confirmed aliases, optional two child levels and
hierarchical scene browsing. New works require one shared confirmation; capture
and saving do not wait for it. Personal folders, media and Anki remain independent.
This is a minor capability release, not another0.44 patch.

## Design

Generated and inspected docs/design/source-hierarchy-0450-reference.png first.
Adopt restrained tree groups and aligned underline fields. Reject invented main
navigation, playback controls, mandatory work/time and per-screenshot approvals.
Actual screenshots: docs/design/source-hierarchy-0450-{desktop,mobile}.png.
Mobile directory scrolling was corrected after screenshot inspection; thumbnails
now bind by stable scene ID after grouping, never by the previous list position.

## Data and Service

- Applied additive sources base and20261031235203 hierarchy migrations to the
  existing app project after isolated PGlite tests. No prior source tables existed.
- Four private source tables retain RLS; RPC checks auth.uid(), not caller owner
  fields. Aliases collide explicitly, confirmation is idempotent, nodes scope by
  account/work/parent/kind/name, renames use expected revisions.
- Production rollback-only authenticated SQL exercised confirmation, repeated
  confirmation, chapter creation and foreign-subject isolation. Test writes rolled
  back; no private old scenes or model records were changed.
- Preview47311829 HTTPS authenticated catalog read succeeded through existing
  system credentials; no credentials logged. Anonymous private routes return401.
- Source catalog is on-demand cached, not polled. AI receives bounded existing
  names/IDs in its existing request; unknown IDs rejected. Context-only chapters
  remain clues. New canonical roots are never created by model output.
- Old text retained as sourceOriginal. Optional metadata survives old backup
  omissions; explicit null is distinct. Bulk edits/Undo protect account and object
  revision; moving works clears previous hierarchy suggestions.

## Acceptance Evidence

- check-source-hierarchy: alias Unicode/colon normalization, sequel safety,
  idempotency, collisions, chapter depth/scope, revisions, RLS and backup passed.
- check-source-directory-ui:320/390/768/1024/1440,light/dark;20 alias-variant
  scenes confirmed once, chapter identity, rename, refresh and layout passed.
 390dark also passed dirty close, quota failure without false save, refusal to
 create context-guessed chapter and clearing old path on reassignment.
- check-source-workspace: ten cases passed staged classification, exact synthetic
  evidence, failed commit, concurrent changes, safe Undo and account isolation.
- Existing analysis lifecycle/immediate-save/analysis390light, task safety,
  query-focus four cases, exercise journey four cases, paired-card preview,
  help safety, modal dismissal four cases and control-motion matrices passed.
- Media budget preserved: repeated missing manifests20->1; explicit retry only;
 30remote scenes/5focus-online-sync cycles/25renders/20seconds idle0requests.
- npm check, source API allowlist/auth/conflicts and production build passed.
- Preview47311829:196static SHA256 matches;sync/Anki/sources/media-v2 anonymous401,
  legacy media POST405. Final release evidence appended after promotion.

## User Operation

Scene page: manage works/sources icon -> confirm each new work once; aliases such
as Genshin Impact reuse the accepted work afterward. Select source grouping to
expand work, optional arc/season, chapter/episode and scenes. Edit chapter/time in
the existing editor. Organize existing sources explicitly; Undo refuses to erase
later changes. Missing-source generation uses the selected profile, at most20,
and never automatically reissues on refresh. Successful tasks remain available.

## Limits

No paid model calls this release; real recognition quality remains user-led.
Public Teyvat lines currently0: corpus integration is not claimed. Physical phone,
exercise-distance readability, native playback and Anki own sync not retested.
FSRS, old-data migration, safe duplicate merging and heavy Bridge media remain
separate unfinished milestones. Bridge0.4.2 media pause stays in force.
