# 0.43.22 Crop Edge Handle Hotfix

Scope: narrow compatible media-editor defect correction, independently of the unaccepted0.44 exercise candidate. No AI/model/API/Bridge changes.

The image stage must clip the outside-crop shade, but this also clipped handle hitboxes at full-image edges. Keep the clipped stage and shade unchanged; position handles within image bounds using intrinsic stage client dimensions. ResizeObserver repositions on scale/layout changes and disconnects when the editor closes. Pointer resizing now uses movement relative to the original corner so an inset handle cannot cause a first-move jump.

- `check-crop-edge-handles.cjs`:320/390/768/1024/1440, light/dark. All four boxes fully within clipped bounds, actual hit tests, all four real mouse drags without jump, scaled stage and resized viewport passed.
- `check-media-editor.cjs`:same10 cases, crop/output dimensions, explicit copy adoption, failed storage/account protection, saved edit provenance and restore passed.
- [Manually inspected mobile screenshot](v04322-crop-handles.png). No reference-image generation for this localized defect, no new layout or control.

Runtimeac456ae / release4b0642b pushed. Previewddd17b91 and production646cbd83 / official alias deployed2026-10-30:194 exact SHA256 resources and anonymous sync/Anki/source401 verified. Deployed390light corner hit/drag/scale/resize acceptance passed on preview and official site.0.44 real-batch429 gate remains separate and is not bypassed by this hotfix.

Shared parity: capture merge3c5f1f8 pushedd, previewd68487dd passed198 resource hashes, sync/Anki/source401, capture data contracts and deployed390light corner tests. Candidate branch52fc746 pushed; unpromoted0.44 previewd77bb3e5 passed194 hashes/401 and deployed390light corner tests. No additional real-model calls. Main checkout/84-icon194-file build restored after verification.
