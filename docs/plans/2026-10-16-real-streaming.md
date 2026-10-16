# Real Streaming Acceptance

## Requirement

Show text as the actual provider produces it, for lookup and followup. Do not
replay a buffered response as a typewriter animation. Measure live production,
not just a simulated browser Response. Preserve validated final persistence.

## Findings

- Both requests already requested `stream: true`. This alone did not prove
  incremental content.
- Lookup requested `response_format: json_object`. The active compatible
  gateway returned reasoning separately, then the complete answer as ONE
  content event. The browser cannot render content that has not arrived.
- The non-SSE fallback wrapped complete content in SSE, and the frontend
  cumulative reveal queue spread already received text across timers.
- Server SSE readers dropped an unterminated final frame and ignored provider
  errors and reasoning state.

## Changes

- Streaming lookup relies on its JSON system contract instead of forcing the
  gateway's JSON response mode. Final parsing/repair remains mandatory before
  persistence. Non-stream and repair calls retain JSON response mode.
- Immediate received-text presentation for lookup/followup; no replay or fake
  JSON placeholder typing. Non-stream fallback remains ordinary JSON.
- Shared server SSE decoder, EOF tail, UTF-8 fragments, error propagation and
  thinking status. Reasoning text is never forwarded, logged or saved.
- Safe transport timing logs: headers, first reasoning status, first content,
  content-event count, completion. No credential, query or response text.

## Evidence

Production Edge, existing active WONG DS V4 Flash profile; same lookup input:

| Mode | Headers | Thinking | First content | Complete | Content events |
| --- | ---: | ---: | ---: | ---: | ---: |
| JSON response mode | 7.973 s | 7.974 s | 32.090 s | 32.100 s | 1 |
| Streaming without JSON mode | 4.978 s | 5.402 s | 9.179 s | 16.622 s | 178 |
| Followup, streaming | 5.404 s | 5.405 s | 6.878 s | 7.765 s | 12 |

These observations demonstrate that JSON mode triggered buffered content on
this gateway; they are not a universal benchmark or a promise of 2-3 s TTFT.
Network, upstream queueing and reasoning still contribute to first content.

`check:streaming-e2e` uses a real local HTTP provider, the production API handlers,
the actual Pages adapter, and a browser at 390/1440 px. Provider completion is
held by an explicit gate. Lookup and followup text must be visible BEFORE the
gate is released. It also checks final persistence and honest JSON fallback.
This test proves the application chain, not the remote model's speed.

`check:streaming-ui` covers 390/1440 px, both themes, incomplete JSON fields,
Unicode, tail frames, no animation for buffered responses, provenance and
cancelled display updates. Reading rhythm retains its separate 12-case check.
