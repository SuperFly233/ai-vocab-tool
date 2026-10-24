# v0.39.2: minute timestamps and explicit tooltip lines

Small correction to the approved shared date component, not a layout redesign. User requested list labels such as `10/24 23:30`, with full creation and modification times on separate lines when hovered/focused.

- Common list/detail formatter shows local date and minute; current local year omitted, other years retained. Midnight uses00, not24. Invalid/missing times remain absent.
- Timestamp tooltips use an explicit newline and scoped nonwrapping line style. Both full year and seconds retained. Other tooltip kinds are unchanged; text remains escaped, not injected HTML.
- No changes to stored values, backups, logs, sort clocks or selection preference. Creation/update selection still follows existing preferences.
- `check-timestamp-ui.cjs`:320/390/1440 light/dark; actual hover, exact minute label, two-line content/height, viewport bounds and no text overflow pass. Desktop and320dark screenshots manually inspected.
- Evidence: [phone](evidence/v0392/320-dark.png), [desktop](evidence/v0392/1440-light.png). Entity-level data is synthetic and isolated in local browser contexts.
- Existing five-width/two-theme consistency, data/storage/sync/queue/media contracts and build are checked before publishing. Deployment evidence recorded below after verification.

Physical iPhone remains untested. No model, Fushi or Anki operation is included.
