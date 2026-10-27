# Context Memory: Atomic Journal Checkpoint

Active implementation branch after v0.43.11: `feat/context-memory-atomic-journal`. Not a production memory release. No memory UI/service or cloud migration claimed.

Design reference generated using built-in imagegen and inspected: ../design/memory044-reference.png. Retain explicit unchecked target selection, scene-first presentation, four bounded rating buttons and phone2x2 grid. Reject invented navigation, front-side answer leakage, automatically checked targets, fake counts and the generated upward-sloping forgetting curve: actual model recall declines with elapsed time. No generated image is used as a UI background.

Added `LearningStore.atomic(account,keys,mutate)` with a declared bounded key set, one readwrite transaction, synchronous mutation, completion-only success and abort rollback. Added separate MemoryJournal enrollment, unique score-event receipts, pending outbox, guarded acknowledgement and remote-conflict retention. Events, state and outbox commit together; no settings JSON or Anki state touched. JSON key ordering does not create false event conflicts.

Actual isolated Edge tests passed: two tabs concurrently append the same rating and get one commit/one replay; stale ratings refused; offline transaction survives refresh; account isolation; quota failure during the event write rolls back an earlier state put; remote conflicts retain local and remote evidence; undeclared keys and async transaction callbacks refused. Algorithm already pinned/tested under v0.43.11. Durable journal is foundational work, not a working cross-device review service.

Next: server authorization/atomic commit and offline replay protocol, complete selection/reveal/rating UI and curve, database migration approval, preview/full acceptance. Source migration connector remains invalid/expired requestState; do not route DDL through execute_sql, whose tool instructions require apply_migration. User elected to perform actual model/device quality checks, not to waive database/authentication correctness.
