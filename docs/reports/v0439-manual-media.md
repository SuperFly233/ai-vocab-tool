# v0.43.9 Manual Media Editing

## Actual Implementation

Scene > Edit scene > crop icon beside an attachment opens the shared editor. Home add-scene uses the same attachment editor. Images can be cropped by direct dragging, keyboard or numeric coordinates, constrained to a ratio and resized. GIF/video can also be trimmed. Original video has play/seek controls; generated copies have a separate preview.

Generate is not adoption. Use copy persists the hash-verified derivative and updates only the parent scene draft; Save scene is still required. Original reference, numeric edit recipe and derivative hash remain separate. Restore original uses the same draft path. Shared-scene propagation, backup collection and media sync include original references. No existing Anki snapshot is modified.

Static images use Canvas. Animated images and video use official @ffmpeg/ffmpeg0.12.15 MIT wrapper and optional @ffmpeg/core0.12.10 GPL-2.0-or-later single-thread core, with explicit download consent, exact size/SHA256 and bounded numeric commands. Core is downloaded directly from official NPM files through jsDelivr; the site does not mirror it or upload media there. Failure retains the original. No system software installation, native process operation or COOP/COEP change. Wrapper notices and source links: vendor/media-engine/NOTICE.md.

Limits: one processing job per page,60-second deadline including component download,20MB input/output,4096px/8MP output,10-minute input video maximum. Animated-image derivatives are GIF, video derivatives MP4; stated before processing. Larger media must be reduced externally; Bridge media fallback is not implemented or advertised as usable. AI crop is not part of this manual editor.

## Design And Verification

- Generated and inspected docs/design/manual-media-editor-reference.png before implementation: large crop stage plus aligned desktop controls, stacked mobile, restrained shared bottom-rule inputs and explicit two-step copy preview. Do not copy invented source/processing claims from mockups.
- Five widths320/390/768/1024/1440 × light/dark: actual cropped PNG width300, explicit adoption/save, provenance persisted and original restored.390dark storage failure and account mismatch preserve originals.
- Pointer/keyboard crop, keep/discard confirmation, protected discard Undo and account-change close pass.
- Actual locked WASM generated and processed synthetic media. Video output96×60,1.2s, audio decoded successfully; GIF96×60 with6 decoded frames. Processing tests use exact installed core bytes through isolated routes, not a mocked encoder.
- Numeric/identity/legacy merge/reference collection tests pass. Eight shared motion cases pass. Physical iPhone and real personal-media playback not tested.
- Also passed actual optional-core CDN download, SHA256 validation and synthetic GIF/audio processing (not a route fixture). Component-declined and tampered-byte responses are rejected, concurrent jobs denied, cancellation releases processing. Video UI screenshots wait for a decoded frame, not just a nonempty container.
- Independent preview https://6f3df4e8.ai-vocab-tool.pages.dev :173 resource hashes and sync/anki-jobs/sources401 pass;390dark deployed crop/resize/save/reopen-parameters/restore plus failure/account guards pass. Final preview https://a5c473f7.ai-vocab-tool.pages.dev additionally rejects malformed edit provenance during backup import;173 hashes/auth401 and1440light deployed editor pass. `npm run check`, scene unlink and AI safety regressions pass.
- Production verification appended when completed. This report records executable results, not completion of FSRS/source/storage or other unrelated work.

## Production: 2026-10-27

Runtime dd1ea9c pushed to main; deployment https://dfc8cab8.ai-vocab-tool.pages.dev and official https://ai-vocab-tool.pages.dev . Official173 resources match SHA256; sync/anki-jobs/sources401, source default false/token-bearing503 verified. Official390dark synthetic manual edit/save/reopen/restore/storage failure/account guard pass. Browser editor needs no Bridge update; Windows media component and AI crop remain unavailable. Original Anki/Fushi data and private media were not operated on.

Shared implementation merged selectively into the isolated capture branch at8784727. Capture data/vision,390light manual editor and npm check pass; independent deployment https://7a589c3c.ai-vocab-tool.pages.dev has177 matching resource hashes/auth401. Capture-only features remain outside main. Main checkout and173-resource build restored.
