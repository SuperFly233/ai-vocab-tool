# v0.43.20 / Bridge0.4.2 On-Demand Connections

## Implemented

- Removed unconditional15second cloud sync. Dirty-data debounced saves, focus/visibility merge and explicit user sync remain. No learning data is discarded.
- Task manager polls only while visible, with pending jobs, within a10minute viewing session. Empty/terminal/closed/hidden views do not poll. Four consecutive failures stop retries; manual Refresh restarts the session.
- Helper startup defaults stopped. Explicit Start connection authorizes600seconds; Stop/expiry prevents new auth, registration, device commands and job polling. Already claimed jobs retain necessary heartbeat/review and safe completion; no new claim afterward.
- Local status refresh reads saved identity without calling network auth. Login/logout stop receiving; logout removes the last active owner but preserves per-account device identities. Loopback origin/token/Host guards unchanged.
- Includes the previously verified independent exercise page, complete session ending and eight static annotation tools. System-global Bridge screenshot capture is not added.

## Local Evidence

- `check-idle-network.cjs`: no periodic sync; empty/terminal/hidden/expired/failed task lists stop scheduling; active visible work remains.
- `check-anki-idle.cjs`: browser virtual-clock tests confirm empty, hidden, terminal and closed managers make zero list polls; explicit active tasks update. Separate one-shot capability check is not counted as a list poll.
- Python unittest discovery:60 tests passed, including100 simulated worker ticks at startup/stopped/expired with zero cloud calls; claimed heartbeat/review preservation;20 authenticated local status reads with no cloud calls.
- Portable build uses180second timeout; self-test uses45second timeout. Actual fresh ZIP extraction, blocking-proxy zero outbound requests, repeated startup guard, restart identity inheritance, normal API shutdown and tamper rejection passed. No private data or actual Anki touched.
- Five widths and both themes: connection guidance, actual-vs-supported version, optional services, stale diagnostics and nested dismissal passed. Existing dialog test now waits for the actual asynchronous close before asserting removal.

## Attribution and Release Safety

- Coordinating audit reported daily Pages production counts95159/99769/108693 for10/27,10/28,10/29 and near2subrequests/request; Cloudflare email confirms account daily quota exceeded. Aggregate counts do not identify a client. No running Bridge was found by that audit; do not attribute all traffic to Bridge.
- Code audit confirms an idle webpage15second probe and helper5second cloud worker with20second registration were avoidable request sources. Remaining Fushi diagnostic10second timer redraws cached diagnostics only; explicit remote commands use bounded active checks, not startup polling.
- Existing production and preview returned405 on API POSTs during the outage. This mitigation may be deployed to stop further requests, but static-resource verification is not cloud-auth recovery or live Anki acceptance. Do not mark authentication healthy until independently verified.
- Official ZIP/manifest URLs, exact size/hash, commits and deployment evidence are appended after publication. Until then the download manifest must not point at an unverified asset.

## Operation

Website Settings / Help → Install and connect provides the official ZIP. Finish or explicitly cancel claimed work, quit the old helper normally, extract the whole new ZIP to a new directory keeping `_internal`, run `LexiConnect.exe`, then open tray Connection settings. Default is stopped; click Start connection (10minutes) only when needed, verify the account and Anki, then approve cards on the webpage. Stop when finished. Updating files alone cannot alter an old process still running; no automatic process termination or autostart is performed.

Real cloud writing, physical phone, live OCR/exercise experience and Anki's own sync are not verified by these isolated tests.
