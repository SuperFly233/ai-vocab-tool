# 0.44.0 Exercise Usability Candidate

## Status

### Production Promotion Authorization

**RELEASED:** runtime/release commit `a6a7436` pushed to main; Cloudflare deployment
https://1117cbff.ai-vocab-tool.pages.dev and official https://ai-vocab-tool.pages.dev .
Official app.js independently reports0.44.0. All194 static SHA256 hashes match;
anonymous sync/Anki/source401. Deployed390light normal-controls fixture journey
passed import, lookup/full entry, protected arrivals, ending, refresh and explicit
recovery. No live model generation was repeated during release.

Initial deployment auth refresh hit TLS ECONNRESET; rerunning the CLI with Node's
explicit `--use-env-proxy` using the existing proxy restored login and deployment.
No credentials were cleared and no system proxy settings changed. This release
does not claim private cloud writes, live Anki, physical iPhone or exercise-distance
acceptance. Continuous real-model batch quality remains user-led as authorized.

On2026-10-30 the user explicitly requested: "那这个验收我自己来，你跟我讲。先上线".
This supersedes the previous promotion hold for the real-model quality gate only.
Promote the tested0.44 candidate to Cloudflare; do not treat the outstanding
continuous-batch quality or physical-device checks as passed. No new model calls,
provider changes, database migrations or Anki writes are authorized by this release.
Vercel remains deferred. Record actual deployment verification separately below.

### User Acceptance Steps

1. Refresh the official site, verify About shows0.44.0, then enter运动采集.
2. Paste one bilingual screenshot. Wait for已收下, then analysis/saved status;
   check quote, translation and title. Click a learning target, wait for lookup,
   then open the actual complete entry without returning home.
3. Paste three distinct screenshots successively (long dialogue, untranslated
   dialogue, Backlog). Switch browser tabs during analysis. Return and confirm
   each original remains with its own status; select a numbered Backlog sentence.
4. Type a word but do not submit, then add another screenshot. The input and
   current reading target must remain; use新收下 and上一张/下一张 to navigate.
5. End collection while tasks remain. Verify the summary distinguishes saved,
   pending selection and failed items, and opens the exact lookup result. Refresh:
   interrupted requests require deliberate confirmation, not automatic recharging.
6. Edit a disposable scene: select learning targets and use保存并查询 beside保存场景.
   Verify only selected targets are queried. Crop the image to all four edges and
   check all corner handles can be dragged. Removing one linked entry must not
   delete the scene.

If429 appears, leave the preserved screenshots in place and do not repeatedly
retry; retry only a failed item after checking the provider's quota. Report the
step, screenshot and short error, never API keys. Use disposable test scenes and
do not approve Anki writes for this acceptance.

### 2026-10-30 Follow-Up

The user selected Cloudflare as the release target and deferred Vercel logs.
Production independently reads **0.43.22**, with sync/Anki/source anonymous
requests returning401. Earlier0.43.21 status paragraphs below are historical.

Merged all published crop fixes into the0.44 branch (`0895655`); release date now
matches October30. No additional0.43 patch is being released.

Fresh bounded real-model acceptance used the current saved vision/lookup profile,
six additional requests maximum, in isolated storage with synthetic images. The
first settings read failed transiently before sending any model request; a safe
diagnostic confirmed settings access and a subsequent read succeeded. Backlog
import/selection, persisted contextual lookup/full entry, protected arrivals,
ending and refresh completed. A continuous-batch request returned429, so full
long/untranslated-image quality remains unaccepted. Stopped without switching
provider or retrying the failed request. Historical twelve-request budget was not
reset; the new budget is separately recorded in tmp/exercise0440/live-followup-budget.json.

The run exposed a false-positive in the test: it waited for tasks to stop without
requiring all analyses to succeed. The old run printed a successful journey despite
429. This is **partial evidence only**, not a passing whole-batch result. Added
quota/auth stop assertion, per-task successful-state assertions and long-text /
machine-translation checks. Live OPTIONS requests are no longer mocked. Saved
videos have unique filenames, but generic screenshot filenames are reused by
fixture runs; do not label those reused definition screenshots real-model evidence.

Final follow-up preview: https://5664dceb.ai-vocab-tool.pages.dev/exercise . All194
static SHA256 hashes match; anonymous sync/Anki/source401. Deployed390light
normal-controls journey with HTTP fixtures passed. Locally reran full npm check,
four normal-control fixture journeys, ten footer cases, ten crop-edge cases and
four streaming cases. No private edits, Anki writes, DB or Bridge changes.

Production promotion remains held by the real continuous-batch quality gate.
Vercel's concrete helper-directory and direct-route defects were fixed and tested,
but its historical deployment error was not retrieved; see vercel-2026-10-30.md.

Implementation and isolated UI/safety acceptance completed; production promotion HELD. Real current-provider testing returned HTTP429 during the final continuous batch. Maximum12 upstream attempts reached across three runs; no more paid-model requests authorized by this acceptance budget. Production remains0.43.21 / Bridge0.4.2. No Anki writes, private learning changes, backend or database migration.

## Implemented

- Credential-free per-account lookup receipts in existing capture drafts. Stable request ID/owner follows queue persistence, completion signature and exact saved entry ID, rather than display-title inference.
- In-page query states/core meaning and shared full-entry modal. A completed target opens its actual entry; summary opens this session's retained results, not a generic home navigation.
- Previous/next screenshot navigation and unread arrivals. Nonempty input, selected text, open advanced options or the entry modal protect the current screenshot even if file-picker focus changes.
- Recovered exercise requests require explicit fee confirmation. Existing queued request identity is resumed where present; successful completion signature can recover a receipt. Ordinary lookup recovery remains automatic as before.
- Tutorial offer suppressed during exercise; global page scroll-top no longer covers sticky lookup. No-readable-dialogue result is not an impossible pending sentence choice; deliberate reanalysis is available.
- Real429 led to specific limit/credit wording and account/profile-scoped capture pause: queued requests stop without losing originals, retry requires explicit action. No provider fallback.
- Cross-tab safety exposed a pre-existing lock-order problem: duplicate execution waited for a busy slot before checking runtime ownership. Runtime lock now precedes slot acquisition, rejecting duplicates promptly while retaining two global slots.
- Latest user request included: selected-target query moved from section header into fixed editor footer beside Save; manually entered terms also query directly there, not via More. Selected targets take precedence. Counts/color change without control translation; mobile buttons align and reduced motion is respected.
- Fixed ordinary successful lookup being classified as an association error when no scene association was requested.

## Iterations and Real Evidence

1. Built-in imagegen generated docs/design/exercise0440-reference.png before implementation. Adopted inline results/arrival notice, rejected invented sidebar/player/success marks. First normal-control pass found tutorial obstruction; screenshots also revealed the global scroll-top covering lookup. Both corrected.
2. Normal file-input/confirmation/target query/full entry/continuous intake/navigation/end/results/refresh loop, with provider HTTP fixtures only, found focus-change arrival protection issue. Corrected, then reran desktop/mobile in both themes. Added explicit interrupted-query recovery and exact single-request assertion.
3. Securely read current saved vision and active lookup preferences using the existing helper credential vault and authenticated select, in memory only. Test browser had isolated offline learning storage; synthetic PNGs only. No profile secrets, cookies or private records were written to artifacts.
4. Real first run: synthetic bilingual screenshot recognized and saved; local test server lacked the actual prompt-config handler, so lookup acceptance did not complete. Added the existing exported production prompt handler to the harness, not a product/server change. Real second run reached successful lookup save and full entry; a premature navigation assertion was corrected to await UI update.
5. Real third run: three Backlog utterances identified separately with image bounds; selected one, completed contextual lookup, opened actual full entry. Submitted long text, untranslated text and no-dialogue images as a continuous batch; HTTP429 prevented full quality acceptance. Do not mark these three cases passed. Total12 upstream attempts, including capability probes, across all runs. Budget file under tmp/exercise0440/live-budget.json; no automatic recovery/retry of this failed acceptance run.

Real Backlog evidence: [image](v0440/backlog-real-1440-light.png). Synthetic replay evidence: [mobile results](v0440/results-390-light.png), [mobile footer](v0440/390-light.png), [desktop footer](v0440/1440-dark.png), [normal-control recording, HTTP fixtures](v0440/fixture-normal-journey.webm). Real partial recording retained locally at tmp/exercise0440/video/page@8825722b824445c7facb1d781647537d.webm; it is not a passing full-batch recording.

## Tests

- `npm run check`: syntax/contracts, versions, history/settings/storage/lookup/sync and media protections passed.
- `check-exercise-journey.cjs`:390/1440 both themes, actual controls with HTTP fixtures; result/entry/arrival/navigation/end/refresh/confirmed recovery passed. No completed task or history entry injected.
- `check-exercise-redesign.cjs`:14 cases, five widths plus effective125/150% layout sizes, both themes; empty/preferences,1/3/20, long content, IME, fixed submission binding and native selection passed. Effective viewports are not native browser zoom.
- `check-exercise-capture.cjs`:10 width/theme cases; three delayed images/two slots, background completion, Backlog, exact Enter, refresh/summary passed.
- `check-scene-query-footer.cjs`:10 width/theme cases; direct input queries, selected-only precedence, adjacent equal-height/footer geometry and no menu detour passed. Actual selected existing-entry save/query additionally passed the safety suite below.
- `check-scene-ai-task-safety.cjs`:cross-tab dedupe, stale adoption, cancelled late result, pre/post-response storage failure rescue, existing-entry selected reuse and complete contextual lookup passed after lock-order fix.
- Exercise safety/summary, immediate scene save, single-entry unlink, idle-zero-poll and motion tests passed. New quota pause/retry test passed. Physical iPhone, exercise-distance readability, live-stream source/OCR quality and real Anki are not claimed.

## Remaining Gate

Final independent preview: https://c5f30230.ai-vocab-tool.pages.dev/exercise . All194 resources matched SHA256 and anonymous sync/Anki/source returned401. Deployed390light normal-control journey with HTTP fixtures passed, including exact entry opening and explicit recovery. Official production version was independently read and remains0.43.21. Candidate is on feat/exercise-usability-0440; no production promotion or claim of live private sync/Anki acceptance.

After provider availability and a separately approved model budget, rerun the unaccepted long/no-translation/no-dialogue batch through normal controls, then complete real ending/refresh acceptance. No production promotion or capture-preview merge until that gate passes. Independent preview resources/authentication are verified separately and do not substitute for model acceptance.
