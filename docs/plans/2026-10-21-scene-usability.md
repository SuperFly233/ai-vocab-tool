# v0.29.1 Scene Usability

## Scope

Repair mobile scene browsing without changing shared metadata, backend APIs or lookup persistence.

## Changes

### Fixes (3)

1. List previews: only visible items resolve, with mobile concurrency 1 and desktop 2. JPEG posters are capped at 240px and cached locally; videos no longer mount a player in each list row. Failed previews retain an accessible placeholder and the original scene remains openable.
2. Query action layout: explicit grid tracks, full-width submit on narrow phones, no hover scaling outside the form.
3. Editor dirty detection: snapshot actual form values and media after initial render. Unchanged or reverted forms close immediately; changed forms confirm.

### Optimizations (3)

1. Direct lookup: enter one phrase and submit or press Enter. Plus, quote selection and multiline paste build removable chips for multiple phrases. Existing queue and per-scene drafts remain unchanged.
2. Discard undo: Toast restores unsaved fields and media into an editor, without overwriting saved scene content. Account changes block cross-account draft restoration.
3. Home entry: image-plus opens scene editing directly. Independent import, backup and library navigation remain in Scenes.

## Validation

- `check:scene-usability-ui`: 320 / 390 / 1440, light and dark. Visible-only preview resolution, concurrency, clean/dirty/reverted close, discard undo, direct/Enter queries and action bounds.
- `check:scene-workspace-ui`: 320 / 390 / 768 / 1024 / 1440, light and dark. Existing navigation, drafts, associations, IME, retry and responsive behavior.
- `check:scenes-ui`: scene authoring plus actual WebM poster generation, IndexedDB persistence, upload/download fixtures, playback and viewer behavior.
- Screenshots: `tmp/scene-qa/usability-{width}-{theme}.png` (local ignored QA output).
- Full data/storage/sync contract suite and production build required before release.

## Limits

Physical iPhone not available for this verification. Supported browser codecs and first-time cloud download speed can still affect initial poster generation; a cached poster avoids repeated decoding. Preview failures do not block opening originals. Cloud acceptance uses mocked private transport, not changes to real user entries.
