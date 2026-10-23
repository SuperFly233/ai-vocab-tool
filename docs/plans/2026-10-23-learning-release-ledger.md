# v0.37-v0.38 delivery ledger

Approved scope: full-content cards and screenshot learning, 6 reliability / 6 refinements / 6 additions. Status below is evidence, not a completion claim.

## Release order

1. v0.37.0 + Bridge 0.4: complete cards, unchanged old protocols, production migration, actual portable acceptance and dedicated-deck acceptance.
2. v0.38.0: selected-file intake, configured/manual vision, mobile/desktop non-destructive lightweight editing, source review.
3. v0.38.1: incremental Teyvat quotation index, evidence-based canonical source matches and reliable auto-save/lookup.

## Reliability

1. Code integration: checkpoint c3b34a3 preserves all original v0.37 work; merge 37c13a8 incorporates released direct transport and diagnostics migration. Released in07a1516,36 production resource hashes verified.
2. Storage/sync: v0.36.3 logs migration released. Physical iPhone confirmation and history/settings IndexedDB migration pending.
3. Vision capability: pending metadata + synthetic image validation. Model name is not proof of image support.
4. Task lifecycle: existing queue checks plus v0.37 account/object/close guards implemented; targeted concurrency regression pending.
5. Media/privacy: selected inputs only, original always retained. Intake/derivative tests pending.
6. Card safety: 51 Python tests, SQL/API isolation and renderer parity pass. Actual final-byte0.4 portable ZIP passed two synthetic cards, full/core-only fields, web confirmation, unchanged skips, update/Undo, receipt and restart on the dedicated deck. Published at GitHub v0.37.0; remote digest verified. Production authenticated v4 health passed.

## Refinements

1. Design first: v0.37 reference exists; v0.38 reference generated and inspected, docs/design/screenshot-learning-v038-reference.png.
2. Complete cards: published7-section defaults, direct entries, optional scene and independent model. Five widths x two themes and actual extracted portable/deck acceptance passed; production resources/health verified.
3. Reading/workspace consistency: existing SOP retained; new intake views not implemented.
4. Recognition review: pending actual components and screenshots.
5. Canonical sources: pending identity/alias matching; never silently merge fuzzy titles.
6. Connector productization: final0.4 build/self-test, actual extracted EXE/single-instance/exit and native icon/pause smoke pass; popup visual screenshot unverified. Full scope remains pending screenshot/media/source work.

## Additions

1. Batch selected screenshot intake: pending.
2. Evidence-qualified automatic extraction/save/lookup: pending; Anki still separately approved.
3. Vision modes: default preconfigured validated vision provider + optional per-run selection, pending.
4. Teyvat: local v0.9.0 source located at C:/Users/tomori/Documents/小项目/teyvat-scriptorium; catalog plus per-chapter bodies, not an existing global quote index. Pending index and representative matches.
5. Image/GIF/video lightweight editing: pending; GIF must stay animated, video audio retained, bounded browser resources and helper fallback.
6. AI crop suggestions: pending; explicit confirmation required before deterministic derivative creation.

## Design decisions

Use generated reference for batch list/detail hierarchy, visible footer and mobile detail navigation. Reject its invented canonical source, mandatory per-item copy controls, and optional-original checkbox: originals are ALWAYS retained. Keep actual existing icons/themes, show real match evidence and source coverage; do not display synthetic reference content as verified results. Do not bundle generated reference as application background.

## Mac direct report

Follow-up2026-10-23: user confirms Mac Edge now works. Device recovery confirmed by user; root cause remains unknown. No storage clear or browser security bypass used.

2026-10-23: user's Mac reports generic browser-direct failure. A proxy-disabled Python OPTIONS check got Cloudflare403/no CORS, whereas an actual isolated Edge request from the production page returned readable JSON401 using a deliberately invalid Key. Neither test reproduces the Mac. Do not call this a universal CORS outage or a verified Mac fix; browser + same-browser provider reachability requested, no Key requested. Refresh does not override device routing, blockers or provider policy. No automatic cloud fallback.
