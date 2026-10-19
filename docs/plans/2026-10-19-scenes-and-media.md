# Scene Memory Implementation Plan

**Goal:** Attach optional image/GIF/video and authored context to vocabulary or
individual senses; support click, paste and drop, clear browsing/editing, use in
review, creation before AI lookup and without AI. Preserve future Anki identity.

**Architecture:** Scene metadata lives on history records, independently of AI
versions. Each scene has a stable UUID, target fragment fingerprint, source
snapshot, plain text quote/translation/note, source title/chapter/time/URL and
content-addressed attachment references. Individual scene tombstones prevent
stale-device resurrection. Blobs live in IndexedDB, never localStorage/history.

**Storage alternatives:** Inline base64 history is rejected because videos would
inflate every render and sync. A private object bucket is a good larger-scale
backend, but needs separate deployment credentials/policies. For this personal
app, the initial independent media transport can reuse authenticated study_store
RLS with bounded immutable chunks and lazy reads, outside the sync-key allowlist.
Keep that adapter isolated so it can migrate to object storage without changing
scene IDs or UI. No public bucket, remote media hotlinking or third-party upload.

## Acceptance Gates

1. Data: deterministic scene merge, deletion vs stale copy, concurrent additions,
   no mutation of model results, stable fragment snapshot and size/type limits.
2. Local media: IndexedDB binary files, SHA-256 deduplication, GIF preservation,
   strict supported magic bytes, atomic transaction failure handling, object URL
   lifetime and unavailable-file state. No executable SVG/HTML attachments.
3. Editing: add before lookup or to existing entry/fragment; text-only and manual
   cards; source fields optional; save/cancel/dirty warning; multiple files via
   picker, paste or drag; duplicate and quota errors do not discard prior work.
4. Reading: bounded media, accessible video controls, no autoplay/audio surprise,
   clear caption/quote and collapsible provenance, light/dark/mobile/desktop.
5. Sync: lightweight scene metadata via current history sync; authenticated
   chunked media transport, resumable retry, ownership enforced by server token
   and existing RLS, lazy download and verified hash, no bulk media in polling.
6. Review/export: scene evidence available in review; original downloads and
   portable scene backup. Metadata-only exports must not pretend to contain
   binary attachments. Restore validates before committing.
7. Verification: pure data and security tests; browser interaction tests for all
   three inputs, refresh, both entry points, fragment targets, edits/deletes,
   narrow screens, errors and real persistence. Record what remains unverified.

## Steps

- [x] Add scene data/IndexedDB module with tests.
- [x] Add flat scene editor and reader, integrate entry/fragment and pre-query.
- [x] Add private independent media sync transport and retry/download states.
- [x] Add review and portable backup/restore.
- [x] Run functional, responsive and visual acceptance; update release docs.
- [ ] Commit, push and deploy only after release gates pass.

## Acceptance Record

- `npm run check`: data, API, sync, settings, storage and existing contracts pass.
- `npm run check:scenes-ui`: 390/1440 px, light/dark; picker, paste, drop,
  persisted drafts, authored entries, editing, deletion/undo and modal stacking.
- Media browser checks: valid WebM playback advances, no autoplay; multi-chunk
  upload/reconstruction, corrupt data rejection, retry, portable backup/restore,
  fragment association and review integration pass.
- Existing streaming, responsive (320/390/768/1440) and reading UI checks pass.
- Authorized production test created only the separate `场景功能验收` entry.
  Clipboard PNG persisted and uploaded; reload/history browsing retained it.
  At 2026-10-19 13:57:06 the production log recorded remote read-back and hash
  verification success, using refresh=true to bypass the local media cache.
- Physical iPhone/Safari and device-specific MP4 codecs were not tested. Native
  decode failures retain a clear fallback and original download. No claim of a
  real second-device test or completed Anki bridge.
- Normal history export includes metadata, not binary files. Portable scene
  backup includes originals (30 MB raw media limit). Deleted/unreferenced blobs
  are retained for undo/deduplication; automated garbage collection is deferred.

## Release Accounting

New capabilities (8): multimedia inputs; optional authored context/provenance;
pre-query and standalone creation; fragment association; edit/delete/undo;
private cloud media; scene search/review; portable backup and restore.

Optimizations (3): separate binary storage and deduplication; flat reading with
collapsible provenance; lazy bounded media without autoplay and URL leaks.

Integration fixes (3): nested-modal controls; monotonic pending-scene attachment
timestamps; automatic sync no longer overwrites manual verification status.
These are integration defects found during this release, not three unrelated
previous production bugs.

## Later: Fushi / Anki Bridge

User explicitly described this as a later integration. Preserve scene UUID and
hashes in export. Plan a deck/model mapping, external note ID, field templates,
media filenames, idempotent upsert and explicit preview. AnkiConnect requires a
running desktop Anki plus its installed add-on; a cloud web app alone cannot
promise unattended Anki writes. Automatic sync needs an authorized bridge and
conflict/deletion policy; do not install add-ons or overwrite existing notes
silently. Initial portable scene backup is not an Anki sync implementation.
