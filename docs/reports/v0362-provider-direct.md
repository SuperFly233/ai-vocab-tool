# v0.36.2 Provider Direct Transport

## Findings

The reported API is https://ai.hybgzs.com/v1/chat/completions . Previous lookup/followup/test/model-list/integration requests were forwarded through Cloudflare. Production public config confirms an IPv4 relay is configured; it triggers only for recognized IPv6 block text. Neither route inherits the phone's residential/direct exit. Screenshot 403 is an upstream block page, not evidence of a bad model or a Supabase database failure. The provider's exact filtering rule remains unknown.

## Shipped Scope

Exact HTTPS provider host/path uses the browser and user's supplied Key for lookup, followup, model listing, connection test and AI version integration. Other providers keep cloud behavior. Shared prompt/context/JSON/SSE contracts prevent separate output rules. No cookies, redirects or silent cloud fallback; no environment credential is exposed. Connection test and generation timings show browser direct. HTML block pages and inline media are replaced by bounded contextual errors, with reflected API Key redacted.

Supabase remains unchanged: data sync has the existing same-origin fallback; login is still a separate network dependency. No claim that the entire product or database has been relocated or that a direct-mode browser can override OS/router/TUN routing.

## Verification

- Actual proxy-disabled local OPTIONS: 204, CORS origin `*`, POST allowed.
- Actual isolated Edge with `--no-proxy-server`: cross-origin POST using an intentionally invalid diagnostic Key returns readable JSON401, no HTML block. No valid Key or paid model call used.
- `check-provider-client.cjs` at 390/1440: simulated direct lookup, followup, model list and test; incremental SSE protocol including EOF tail; JSON results and history persistence; user prompt override; no reasoning leak, cookies or cloud credential forwarding. Other-provider fallback preserved. HTML403 and network failure never silently retry through cloud.
- `check-upstream-errors.js`: four server endpoints preserve status and bounded JSON messages while removing HTML/base64 and reflected keys.
- Existing real HTTP streaming E2E: lookup and followup visible before provider completion at 390/1440.
- Existing data/storage/sync/contracts checks passed. No substantial layout change.
- Screenshots: `tmp/provider-qa/direct-390.png`, `tmp/provider-qa/direct-1440.png` (synthetic only).

## Limits

Real valid-Key inference, the user's mobile network and physical iPhone remain unverified. CORS or provider filtering can change. Direct mode follows the device's own routing; application code cannot force a clean residential IP or bypass a configured system proxy. This release does not implement new Supabase auth proxying, screenshot OCR, Bridge0.4 or full-content Anki release.

## Deployment

- Code commit `06bf287`, pushed to `origin/main`.
- Preview https://6df234a8.ai-vocab-tool.pages.dev ; production https://ai-vocab-tool.pages.dev ; immutable deployment https://dfafebfd.ai-vocab-tool.pages.dev .
- Preview and production: all32 resource hashes match, integration unauthenticated access401, 390/1440 isolated view/scroll/preferences checks passed.
- Actual production page `modelRequest('test-profile', diagnostic invalid Key)` with proxy-disabled Edge returns JSON401 and `X-Lexi-Request-Path: browser`. No HTML. This confirms deployed browser-direct transport, not valid-Key model success.
- No Supabase schema change or external-app operation. API credentials already stored/synced under the existing settings policy remain governed by that policy; this change only removes the model-call forwarding hop, not existing settings synchronization.
