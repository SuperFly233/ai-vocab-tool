# v0.43.20 / Bridge0.4.2 On-Demand Connections

## Implemented

- Removed unconditional15second cloud sync. Dirty-data debounced saves, focus/visibility merge and explicit user sync remain. No learning data is discarded.
- Removed the network indicator's periodic60second static HEAD probe too; initial load, connectivity/visibility events and explicit recheck remain. That static probe was unnecessary but is not established as a Functions-quota source.
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

## Published Evidence (2026-10-30CST)

- Runtime commits:c73058d and1ec8dc2, pushed tomain. Final independent preview https://d8cf5d24.ai-vocab-tool.pages.dev ; production https://2072f099.ai-vocab-tool.pages.dev and https://ai-vocab-tool.pages.dev .
- Final preview and official domain each matched all194 static SHA256 resources. Both checks then failed sync authentication:405, not401. The checker was not weakened or marked passed. This is explicitly an emergency request-reduction deployment, not restoration of the cloud learning/Anki chain.
- Official390px dark synthetic exercise flow passed after deployment, including background completion, Backlog choice, exact multiline lookup, refresh and ending summary. Five-width/light-dark web and helper suites are synthetic local integration evidence, not private account/live Anki acceptance.
- Bridge release: https://github.com/SuperFly233/ai-vocab-tool/releases/tag/v0.43.20 . AssetID689089597, size25,003,820bytes, SHA256`4c4646b1dd1fea50b7b1f287e7321eb85fe7798056f8b03c92acd6eafd68e57a`. GitHub server digest exactly matches the locally verified packaged ZIP. The website manifest points only to this public release.
- Final bundle build30.81seconds; actual EXE self-test2.73seconds. Fresh extraction default paused,12local status checks, blocking-proxy zero outbound, duplicate startup, normal shutdown, restart identity and tamper rejection passed.100-worker-tick tests separately cover stopped/expired sessions and claimed-job safety.
- Public full re-download attempts encountered TLS/timeout errors in this environment; no successful independently re-downloaded ZIP is claimed. Server-provided size/digest and local self-tested ZIP are verified. User installation/current running version was not inspected or overwritten.
- Actual inspected screenshots: [mobile guide](v04320/connections-mobile.png), [synthetic helper desktop](v04320/helper-desktop.png). No generated reference is used as runtime content.
- Follow-up operational check: once the account's service is available, explicitly run one connection check and a user-approved dedicated-deck acceptance. Do not keep any background watcher polling for recovery. Old open tabs and old helper processes must be refreshed/restarted by their owner to adopt the new policy.
- Source/Teyvat, production FSRS, storage migration, safe consolidation, heavy-media helper and native capture remain separate unfinished gates. This mitigation does not complete them. Shared isolated capture-preview parity remains pending rather than silently merging its unaccepted features to production.

## Isolated Capture Parity

Merge72600ff preserves capture import/metadata/top-layer behavior alongside original-redaction protection and exercise tasks. Preview https://1aee6fff.ai-vocab-tool.pages.dev / capture-v038-preview contains198 exact-hash resources,85icons; its sync authentication gate still fails405. Local capture data, all10 width/theme UI cases, synthetic vision lifecycle, shared390dark exercise and privacy schema passed. Deployed390dark capture persistence/dedupe/review/discard/Undo/double-save passed. Idle scheduling tests pass here too. This supersedes the pending-parity note above; the capture-only intake is not merged back into production. Restore main with194files/84icons after these checks.
