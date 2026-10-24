# v0.37.1: streaming translation and scene navigation

Scope: the user's latest four items. Two reproduced bugs plus two navigation improvements; not a new site redesign. Screenshot learning stays on `feat/capture-intake-preview` and its independent deployment. No database migration, real provider call, Anki write or Fushi modification in this release.

| Request | Implementation | Evidence |
|---|---|---|
| Collocation translation during typing | Partial parser already included translation; temporary collocation renderer omitted the row. Render arriving fragments through the same escaped streamValue used by senses, with placeholder before arrival. | `check-streaming-e2e.cjs` uses an actual local HTTP/SSE provider gated after the first translation fragment; UI shows 请打 before the upstream may finish. Final content remains unchanged. |
| Phone back button at left | Stop the mobile grid item stretching, use start alignment and intrinsic width. Keep existing header/action tracks. | `check-scene-navigation-hotfix.cjs` measures button left against header left at320/390/768 and captures both themes; no global overflow masking added. |
| Open running query from scene | Running query title opens existing home stream; waiting query opens its existing queue row. Revalidate live group/query identity on click; no new request, reorder, cancellation or input overwrite. | Test reproduces production's running notification before activeLookupRequest assignment; navigation keeps the active task and request count unchanged. Waiting item remains queued. |
| Entry back to precise scene | Entry scene title/source (or 返回场景 fallback) opens that scene group. Uses draft-safe modal dismissal; old generic scene hub and query-from-scene reuse the same guarded route. | Two associated scenes select the correct group. Cancel preserves editing; discard navigation offers Undo which restores even an invalid JSON draft. |

## Verification

- `npm run check`: contracts/data/media/settings/sync/storage/queue regression.
- `check-scene-navigation-hotfix.cjs`:320/390/768/1024/1440,light/dark; stream translation, left geometry, waiting/running links, exact two-way navigation, no request duplication, no page errors/overflow.
- `check-streaming-e2e.cjs`: actual HTTP with controlled upstream completion,390/1440; both lookup and follow-up remain genuinely streamed.
- Shared control motion and nested modal dismissal regressions pass, including drag-release protection and editor Undo.
- Synthetic screenshots: `tmp/dialog-qa/scene-navigation-hotfix`; selected evidence copied into `docs/reports/evidence/v0371`.

## Release boundary

Version0.37.1, release date2026-10-24. Physical iPhone hardware, real provider inference, media playback and Anki's own synchronization are not verified by this hotfix.

## Published evidence

- Source commit `3631d1b29de329b58133786d980fe7d405978803`, pushed to main.
- Independent preview https://e5000fbf.ai-vocab-tool.pages.dev; production https://d05e4fb5.ai-vocab-tool.pages.dev and https://ai-vocab-tool.pages.dev . Same build, no production-only code changes.
- Both deployments:36 static resource SHA256 values match local dist; unauthenticated Anki endpoint401;390/1440 history/folders/scenes/settings and scroll masking checks pass. Actual deployed four-item regression passes320/390/768/1024/1440 in light/dark. All browser records synthetic/local, no private cloud writes.
- Screenshot learning remains an independent incomplete preview; its pending real vision/source/index/media acceptance is not included in this release's completion claim.
