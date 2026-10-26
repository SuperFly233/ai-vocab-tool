# v0.43.2 association safety hotfix

Released2026-10-26. Commit4bb1c98, preview https://7898f41d.ai-vocab-tool.pages.dev, production https://ec4de4bf.ai-vocab-tool.pages.dev.153 exact resource hashes and unauthenticated sync/Anki401 passed. One transient502 was retried with a bounded verifier; persistent failures remain failures.

Reproduction: two ordinary links did not delete the whole scene in synthetic testing. However legacy scenes may exist only inside entry associations: removing their last link did remove the scene from all lists. This real gap is fixed; do not claim the user's exact private dataset was inspected or recovered.

Dedicated unlink command carries explicit entry/association IDs and never invokes library deletion. Before unlink, independently preserve the canonical scene in the same history/settings atomic commit. Other entries remain byte-identical; original media, text, contextual targets, notes and source survive last-link removal and reload. Confirmation and Undo guard account/object changes. Later edited entries refuse stale Undo. Independent scene deletion remains a separate existing action.

Tests: scripts/check-scene-unlink.cjs20 width/theme/library-vs-legacy combinations; scripts/check-scene-unlink-safety.cjs cancel, atomic failure, concurrent change, account change, stale Undo. Preview390dark synthetic-media acceptance passed. npm check passed. Physical iPhone and actual private-record recovery not tested. No database/native/private mutations.
