# v0.39.2: minute timestamps and explicit tooltip lines

Small correction to the approved shared date component, not a layout redesign. User requested list labels such as `10/24 23:30`, with full creation and modification times on separate lines when hovered/focused.

- Common list/detail formatter shows local date and minute; current local year omitted, other years retained. Midnight uses00, not24. Invalid/missing times remain absent.
- Timestamp tooltips use an explicit newline and scoped nonwrapping line style. Both full year and seconds retained. Other tooltip kinds are unchanged; text remains escaped, not injected HTML.
- No changes to stored values, backups, logs, sort clocks or selection preference. Creation/update selection still follows existing preferences.
- `check-timestamp-ui.cjs`:320/390/1440 light/dark; actual hover, exact minute label, two-line content/height, viewport bounds and no text overflow pass. Desktop and320dark screenshots manually inspected.
- Evidence: [phone](evidence/v0392/320-dark.png), [desktop](evidence/v0392/1440-light.png). Entity-level data is synthetic and isolated in local browser contexts.
- Existing five-width/two-theme consistency, data/storage/sync/queue/media contracts and build are checked before publishing. Deployment evidence recorded below after verification.

Physical iPhone remains untested. No model, Fushi or Anki operation is included.

## Deployment

Source `ec7c6ee3bef21dd7d21fdd4108c3a5c620f1aefe` pushed. Preview https://73495f06.ai-vocab-tool.pages.dev ; production https://48e30758.ai-vocab-tool.pages.dev / https://ai-vocab-tool.pages.dev . Both44 static hashes and authenticated-only integration gate match;390/1440 page checks and320/390/1440 light/dark timestamp interactions pass on deployed assets. Existing five-width/two-theme consistency and `npm run check` pass locally.

Shared correction merged into isolated screenshot preview `dc941d663cf406f6db08dabf10a9da5eb4e80567`, deployed https://d15ce409.ai-vocab-tool.pages.dev . Changed app/styles/index/manifest hashes and six deployed timestamp viewport/theme cases pass; capture contracts pass. No screenshot feature promoted to production. Main checkout and44-file build restored.
