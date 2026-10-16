# Streaming, Provenance and Spacing

## Scope and Counts

v0.22.5 addresses two bugs and two existing-experience improvements, with zero new user-facing features:

1. Bug: scope text inherited an 18px icon font, and fixed absolute offsets overlapped clear/scope controls. Use independent grid tracks, 13px scope text and no clear button for empty input.
2. Bug: closed-only JSON preview fields/objects and disabled final fallback animation hid incremental presentation. Render partial strings/objects safely, smooth incoming cumulative text, and animate buffered fallback results. Query/followup share a cancellable queue. Do not replay completed streamed results.
3. Improvement: common provenance on home and detail (model, source, generation time). Resolve the displayed roll and render the normalized saved result; do not infer old models from current API settings. Unsaved results retain current request metadata; genuinely unknown fields stay unknown.
4. Improvement: reduce vertical reading whitespace moderately. Paragraph gaps go from 9px to 4px, entry padding from 12px to 10px vertically, section gap from 18px to 14px. Keep font sizes, horizontal reading width and 44px bookmark targets.

Including the preceding v0.22.4 delivery, this request batch totals three bug fixes, three optimizations and zero new user-facing features.

## Streaming Findings

The application already requests `stream:true` for both APIs. This does not establish the actual chunking behavior of the user's provider. The reproducible application issues are incomplete JSON being hidden until closure and ordinary JSON fallback being rendered without animation. The patch handles incremental SSE, buffered SSE and ordinary JSON without asserting a particular DeepSeek model/provider capability.

The server still validates the final structured result; only that final result is saved. Pending preview text is not stored as a completed result. Final SSE events without a blank-line terminator are consumed. Queue cancellation clears future presentation ticks; reduced-motion mode shows text immediately.

## Verification

- History controls: 36 checks across 390/1440/2138px light/dark, including actual filter/scope results, reload/resize, cache invalidation, non-overlapping buttons and text sizing.
- Streaming/provenance: four viewport/theme combinations using controlled mock Responses. Checks cover incomplete JSON values/objects, truncated escapes, Unicode, final SSE tail, buffered query/followup presentation, live followup updates before completion, no replay after SSE completion, cancellation and reduced motion.
- Provenance equality between home and detail, and model metadata changing with selected version, are asserted.
- Reading: six viewport/theme combinations assert 4px line gaps, preserved wide text and 44px bookmark clicks.
- Existing learning UI passed four viewport/theme combinations; responsive normal/long content passed at 320/390/768/1440px.
- Screenshots inspected: desktop history after overlap fix, mobile home provenance, and compact mobile/desktop reading. Evidence directories: `%TEMP%/lexi-history-controls-qa`, `%TEMP%/lexi-streaming-qa`, `%TEMP%/lexi-compact-qa`.

Tests run offline with synthetic data. No real model request or account credentials are used; live DeepSeek API behavior and physical iPhone/Safari remain outside this verification.

## Text Rhythm Follow-Up

The user correctly identified a remaining unequal visual interval after equal container gaps were checked. The 30px speech control stretched the example row beyond its 24.75px text line. A dedicated regression reproduced 28.75px versus 34px between text origins. Positioning the speech button outside row sizing while reserving its horizontal column yields 28.75px for both intervals, without reducing its 30px click area or covering adjacent text.

`check:reading-rhythm-ui` passes 12 home/detail checks at 320/390/1440px, light/dark, including real speech-button clicks with mocked synthesis. This is part of the same spacing optimization, not a separate feature. Asset revision 2 replaces the initial v0.22.5 build before this request batch is closed.
