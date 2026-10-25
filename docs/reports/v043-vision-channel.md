# v0.43 screenshot channel checkpoint

Date:2026-10-25. This is channel evidence, not a production screenshot release.

## Actual provider test

The user selected their existing Claude Sonnet5 configuration. Read-only metadata resolved the exact saved model `claude-sonnet-5` and endpoint `https://ai.hybgzs.com/v1/chat/completions`. A single exact profile was used; no alternate provider or model fallback.

The saved credential was retrieved through the already authenticated local credential-vault account and kept in process memory. No credential was printed, placed in a fixture, screenshot or diagnostic, or committed. Only settings were read, not private history or screenshots. The isolated Edge instance used `--no-proxy-server`; no system proxy, security software or provider settings were changed.

Two actual browser image calls from the official capture-preview origin succeeded:

1. Random six-digit canvas challenge: exact digits returned. This verifies this actual channel, not a capability guessed from its model name.
2. Synthetic bilingual image: main sentence `I clocked the detail.`, visible translation `我注意到了这个细节。`, vocabulary/highlights `clocked` and `注意到` returned as validated structured content. The visible heading `Clockwork museum` was retained as source evidence with a warning, not invented as a canonical source or episode.

The initial launch using Playwright's `proxy: {server:'direct://'}` failed before navigation/API calls (`ERR_PROXY_CONNECTION_FAILED`); the valid isolated-browser flag above succeeded. This was a test-launch issue, not a provider failure.

Evidence runtime: `tmp/check-sonnet-vision-live.cjs` and credential-free `tmp/sonnet-vision-live-result.json`. No private image used. No Lexi cloud learning records, model configuration or Anki cards created by this test. No claim about physical iPhone or every route/model supported by the provider.

## Shared-fix preview parity

- Capture branch merge `d3eb331` includes main's v0.43.0 tutorials, help and connection fixes while retaining its four capture assets.
- Immutable preview https://9c430b3e.ai-vocab-tool.pages.dev ; alias https://capture-v038-preview.ai-vocab-tool.pages.dev .153 resource hashes match; anonymous sync returns401.
- Capture data checks and five-width/two-theme UI regressions pass locally and against deployed preview. Synthetic vision lifecycle suite passes locally. Shared tutorials and connection flow pass390dark locally; deployed390dark tutorials pass.
- Screenshots and synthetic tests are not actual model or Anki acceptance substitutes. The actual two-call provider result above is recorded separately.

## Remaining production gates

Default/manual vision preferences and revalidation on credential/endpoint/model changes; reliable source identities/confirmed aliases; explicit capture tutorial; complete actual recognition -> review -> scene -> query/link -> existing card-preview acceptance; lifecycle/partial-failure/production rollout checks. Keep production capture disabled until these gates pass. Teyvat indexing, automatic evidence-qualified learning, consolidation, storage migration and media/crop editing remain separate pending streams.
