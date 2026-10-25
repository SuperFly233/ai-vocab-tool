# v0.43.0: on-site onboarding and installation

Date: 2026-10-25. Runtime commit: `3ad2df9`.

## Release evidence

- Independent preview: https://4288e978.ai-vocab-tool.pages.dev
- Production immutable: https://59372862.ai-vocab-tool.pages.dev
- Production: https://ai-vocab-tool.pages.dev
- All149 deployed static resource hashes match local build on both preview and production. Anonymous `/api/sync` returns401.
- Bridge remains0.4.1, ZIP25,001,587 bytes; SHA256 `5ccba21c528a53c22e5531e4d105d8fa94545e607de80a94f41ae3d505cac77d`. This release does not change or reaccept the native binary. Download source remains the verified v0.42.2 release.

## Stage A acceptance

| Unit | State | Evidence |
| --- | --- | --- |
| Existing help and searchable settings entry | Complete | Original navigation retained; settings searchable by download/Bridge/Anki/tutorial terms |
| Formal ZIP and update sequence | Complete | Same-origin validated manifest, official source/size/hash, full extraction and normal-exit instructions |
| Platform and directory boundaries | Complete | Windows executor vs mobile/Mac submission; recommended path distinguished from detected installation; `_internal` and user-data path explained |
| Actual device diagnostics | Complete, mocked connection regression | Account/device binding, heartbeat/readiness distinction,120-second expiry, optional Fushi/dictionary, request continuation and stop |
| Once-only invitation and replay | Complete | Local-account/version state, later/never, refresh does not nag, replay from help/settings |
| Four read-only tutorial groups | Complete | Twenty steps; real stable targets; synthetic examples, no model/history/settings/query writes |
| Focus, dismissal and draft safety | Complete | Esc/backdrop/Tab, original route/scroll/focus, dirty editor blocked, account switch/hidden stops |
| FAQ and retained backlog | Complete | Seven pending streams with dependencies, acceptance, evidence boundaries and next steps |

## Verification

`npm run check`, build, icon/control-motion checks; `check-learning-help.cjs` five widths320/390/768/1024/1440 and both themes on local and deployed preview. Safety suite covers storage quota, account change, dirty editor, request continuation/device switch and closed polling. Existing connections, Anki UI, learning-card UI and dictionary UI matrices pass. Deployed preview screenshots manually inspected: query highlight on390dark and installation workspace on1440light; local screenshots additionally inspected. Evidence copies: `docs/screenshots/onboarding043/`; full runtime captures: `tmp/onboarding043-preview/`.

No real model call or native Anki/Fushi operation was used for Stage A. Physical iPhone, native tray visual appearance, actual media playback and Anki own sync are not reverified. A download click or tutorial completion never sets actual connection state.

## Remaining work

Production screenshot learning, Teyvat incremental bilingual index/evidence-qualified automation, conflict-reviewed duplicate consolidation, history/settings IndexedDB migration, non-destructive media editing and AI crop remain incomplete. Current user choice for a synthetic actual vision test is saved `claude-sonnet-5`; model name alone is not capability evidence. Keep production capture disabled until actual browser-readable image recognition and learning-flow acceptance pass. Shared fixes still require capture-preview parity verification.
