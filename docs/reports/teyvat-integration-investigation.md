# Teyvat quotation integration: read-only investigation

Rechecked 2026-10-24, local `C:/Users/tomori/Documents/小项目/teyvat-scriptorium`, version0.10.2, commit9145b2a. No source records, settings or deployments were modified.

## Verified source shape

- `functions/api/catalog.js`: public catalog with CHS/EN upstream metadata and fallback behavior. A catalog is not a searchable corpus of dialogue.
- `functions/api/quest/[id].js`: on-demand chapter content; `langs=CHS,EN`, supported source selection. Returned chapter contains quests/scenes/lines, per-language maps and missing-pair statistics.
- `src/types.ts`: dialogue has `key`, `nodeId`, `variant`, kind, speaker/text language pairs and branching metadata. Query/line identity must include chapter and quest, not just sentence text.
- Existing local public data includes catalog, hangouts, manifest and quest1700, not every chapter's complete bilingual dialogue. Building a full index requires explicit incremental retrieval and coverage bookkeeping.
- Current reader consumes chapter and quest URL parameters and renders `data-line-key`; the inspected source does not establish automatic `line=` URL focusing. Do not advertise precise line deep-linking until implemented and tested.

## Decisions for the pending integration

Index public dialogue incrementally outside private learning records. Store source/schema version, chapter/quest/line identity, node/variant, language presence, source URL, normalized search text and original text. The generated line key contains positional components, so source refresh must not assume it is an eternal globally stable identifier.

An exact unique bilingual match can suggest original text, corresponding translation and canonical source. Partial, contradictory, missing-language and multiple matches require review. Never call fallback text in another language a verified official translation. Show indexed coverage; a miss means no match in current coverage, not absence from the whole game.

Canonical sources need stable IDs and aliases. Exact known identities can be reused; similar titles are suggestions, not silent merges. No entire private collection/configuration is uploaded to construct the public index.

## Delivery status

Investigation complete at the level above. Incremental index, coverage UI, representative match acceptance, automatic learning rules and exact line links are NOT implemented or released. Retain these items alongside screenshot recognition/provider acceptance and non-destructive media editing in the master ledger.
