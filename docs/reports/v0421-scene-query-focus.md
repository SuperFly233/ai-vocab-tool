# v0.42.1 scene query focus hotfix

## Cause and change

`SceneUI.queueSceneQueries` appends model-only quote/instructions to `request.note`. Queue processing called `applyLookupRequestToEditor`, which copied that whole value into Home's focus field; new scene editors then inherited it. This is a confirmed path, not a claim that every reported residual was identical.

Add optional `userNote` to local task serialization, retain `note` as the unchanged model request and signature input. Editor hydration uses only explicit userNote. Legacy scene tasks without separable user text do not expose their model note in the editor; the actual queued model request remains unchanged. Regular non-scene user notes remain intact. Scene task retry records retain user focus/direction and regenerate scene context once, rather than appending old instructions again.

Hydrated old Home drafts are repaired only when their note exactly equals a stored scene task's model note. No keyword-based stripping, mass draft clearing, API invocation or private-history modification.

## Evidence

- `check-lookup-tasks.js`: independent user focus survives normalization/recovery; request identity unchanged; legacy scene fallback and ordinary user requirements preserved.
- `check-scene-query-focus.cjs`:390/1440, light/dark, real queue/editor components with synthetic scenes and stubbed execution. First and second words retain only user-authored focus; a new scene with no focus is empty. Both requests still contain their own scene context. Proven old draft repaired; unrelated authored text retained. No real provider call.
- No layout changes, no new image generation needed; existing scene editor visual baseline retained. Physical iPhone not tested.

## Release checkpoint

Released runtime00a3541c8eb07733b5840926af5e5a6f761c66bc. Preview https://cff44aa4.ai-vocab-tool.pages.dev and production https://5f3f9a0f.ai-vocab-tool.pages.dev / https://ai-vocab-tool.pages.dev both pass143 exact static hashes/auth401 plus390/1440 light/dark focus flows. `npm run check` and existing Home scene390dark regression pass. No private user data/model/native app changes.

This is a hotfix release, NOT completion of approved stage B duplicate consolidation. Stage B and C remain pending; their original proposed version numbers are superseded by this intervening hotfix.

Capture parity mergeb74907f37e6f1d6b6fab68370e76ecefe364ba2b: https://12c4b39d.ai-vocab-tool.pages.dev passes147 hashes/auth and390/1440 light/dark focus flows. Local capture five-width/two-theme and data/contracts pass; existing capture import/dismiss adapters retained. Still not production recognition acceptance.
