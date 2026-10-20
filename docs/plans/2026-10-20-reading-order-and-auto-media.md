# v0.26.0 Reading and Settings

## Decision

Keep the existing structured result and private media storage contracts. Change presentation hierarchy rather than introducing a second result model or a new page system.

Reading order is title/provenance, core meaning, basic metadata/summary, compact scenes, then detailed senses/collocations. Scene images retain their full aspect ratio, capped at 220px desktop / 180px phone; full-size image/video viewer is unchanged. Linked fragment scenes remain beside their corresponding sense/collocation.

Normal loading and uploading are automatic and quiet. Remove the always-visible sync button and technical state labels. Keep lazy acquisition for visible/near-visible media so collapsed or offscreen files do not trigger unnecessary large downloads. Local verified files are reused. Upload failures reveal an inline reason and retry; same-session rerenders retain the error by account and scene. Success removes the error. The browser online event retries pending local uploads.

Settings use a flexible description column plus intrinsic-width controls. Segment labels stay on one line. Mobile stacks controls without horizontal document overflow. Binary settings and scene-feature control share capsule styling, native checked semantics, keyboard Space and visible focus. Folder/version multi-selection remains checkbox.

## Count: 7 Items

- Fixes (2): prematurely wrapped settings descriptions; segmented labels splitting into characters.
- Improvements (4): core-first reading; compact non-cropped media; quiet normal media operations with failure-only retry; shared capsule binary switches.
- Feature (1): automatic pending upload retry after connectivity returns.

## Verification and Limits

- `npm run check`: syntax, contracts, metadata reconciliation, storage, authentication/media API and sync checks.
- `check:scene-reading-settings-ui`: Chromium 320/390/1024/1440, light/dark; home and details, real IndexedDB/image data, automatic loading, upload failure/retry, same-session rerender, successful upload deduplication, online resume, settings dimensions and keyboard switch.
- WebKit 390/1440 light/dark checks use explicit `QA_MEMORY_MEDIA=1`: Windows WebKit fails Blob IndexedDB writes in this test runtime. This substitutes only file storage for layout/transport fixture tests, not production code. Do not report it as real WebKit persistence or physical iPhone acceptance.
- `check:scenes-ui`: picker/paste/drop, multiple hero media, source editing, video controls/playback, private transport, hash rejection, portable backup and refresh behavior.
- `check:responsive`: long strings, tables, sticky toolbar and horizontal boundaries.
- Residual: the existing large-row cross-screen drag test failed one desktop release-order assertion on its first run, then passed on rerun. No drag implementation was changed for this release; this remains timing instability to investigate, not a claimed drag fix.
- Screenshots under ignored `tmp/scene-qa/`; synthetic fixtures only. No production user records were modified.
