# v0.44.1 Media Request Budget

## Incident and Authorization

On October30 the quota investigation recorded17 successful POST /api/media calls
in20seconds; daily production count was86,340 near17:24 Shanghai. The user reported
one exercise tab and no active media work. Request path/status alone do not prove
which action each request performed.

The user's direct reply in the investigation chat explicitly authorized a global
temporary cloud-media pause. Previewdbe3de22 and production83213989 use _routes.json
to exclude /api/media and /api/media/* from Functions. Public POST returns static
405 (empty body, not JSON success); sync/Anki retain401. No material deleted or
account signed out. A route exclusion stops old scripts before function execution.

## Reproduced Amplifiers and Fixes

- syncPending unconditionally called syncScene for every independent scene after
  each cloud merge. Upload queried manifest even when no local binary existed;
  an existing remote manifest with no local record returned without a local marker.
  Now both library and linked scenes require a local unsynced binary before
  automatic upload. Merely having a remote reference sends no request.
- ScenePreview generated list/home thumbnails by resolving remote full originals.
  Now it only uses saved JPEG thumbnails or local binaries. Opening a visible
  full-material detail still permits an authenticated, deduplicated fetch.
- Missing/incomplete manifests return HTTP200; resolve then rejects, deletes its
  in-flight map entry and forgets the failure. Repeated callers could send again.
  Deterministic published-source comparison reproduces20requests for20calls.
  Per-account/per-operation failure memory reduces this to1; explicit retry1.
  Integrity failure, quota/storage failure and upload failure also stop reissuing.
- Account identity is checked both before and after asynchronous token retrieval.
  Existing hash/MIME checks and durable-save semantics are unchanged.

## Safe New Transport

Keep the old route statically excluded. Fixed webpages call /api/media-v2, whose
handler reuses the same authentication, owner scoping, limits and chunk validator.
Old tabs cannot start charging Functions again just because new transport works.
No new database tables, public media access or provider/model calls.

Bridge0.4.2 uses the old endpoint. Its cloud-material download remains paused;
this patch does not claim the helper has been updated or the full Anki media path
restored. Local files and normal text workflows remain available. A later tested
helper build is required before claiming that particular path restored.

## Acceptance

- check-media-request-budget: published baseline20missing-manifest calls -> fixed1;
  explicit retry1; local previews0; download+failed persist not repeatedly fetched;
  upload failure bounded; account-switch-before-fetch0.
- check-media-idle-ui: actual page with30remote-only scenes,5sync/focus/online
  cycles,25renders and list scrolling; hidden scenes/list thumbnails0requests;
 20seconds exercise idle0requests. Visible failed detail fetch bounded to1.
  Uses intercepted synthetic HTTP responses, not private data or paid generation.
- Existing media roundtrip, playback/hash/backup and explicit retry tests are run
  separately. Full production quota recovery requires independent live sampling;
  local idle evidence alone does not prove every historical client action fixed.

## Release Evidence

Preview2d9a19c4 passed194public SHA256 hashes, sync/Anki/source/new-media anonymous401,
and old-media static405. One authenticated synthetic-ID manifest read returned null
as expected, using existing credentials in memory only. No private material or
paid model calls. Existing media roundtrip/WebM playback/integrity/backup/explicit
retry regression passed after synchronizing initial visibility in its test.
The independent quota chat also reported a real20second production tail with0
media function invocations after the emergency route exclusion; this is distinct
from the synthetic browser idle test. Do not reopen the old route.
