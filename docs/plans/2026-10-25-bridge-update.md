# Bridge 0.4.1 connection delivery

Design reference: `docs/design/bridge-connection-v0422-reference.png`.
Keep the existing logo, compact full-width sections and original learning workspace.
Reject the generated mockup's invented logo, dates and connected states.

1. Shared verified release contract and manual update instructions. Keep 0.4.0
   as the official download until the new portable package passes acceptance.
2. Additive database compatibility fix: preserve 0.4.0, allow tested 0.4.1,
   reject unknown workers for v4 and preserve account/device/lease isolation.
3. Separate required cloud/Anki diagnostics from optional Fushi/dictionary;
   bind checks to device and time, expire after 120 seconds.
4. Website and helper use the same update guide; helper remains connection-only.
   Pause stops new claims, and active batches block accidental shutdown/config changes.
5. Unit/database tests, responsive screenshots, one bounded portable build,
   fresh-directory self-test, hash checks and dedicated synthetic-deck acceptance.
6. Publish only after gates pass. Record failures and remaining work honestly.

Not included: duplicate consolidation, production vision, Teyvat index, media
editing, Anki's own cloud sync or existing Lapis/Fushi card conversion.
