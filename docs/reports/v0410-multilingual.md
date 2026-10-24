# v0.41.0 Multilingual Suggestions and Basic Reference

Status: candidate; local data/UI gates passed, release pending.

## Delivered Scope

1. English-Chinese ECDICT basic meanings (38,103 entries), Japanese-English JMdict common entries (22,647), and Chinese-English CC-CEDICT (125,314). Kana readings and simplified/traditional aliases are searchable. This is not Japanese-Chinese translation or a complete commercial dictionary.
2. Personal multilingual entries remain first, with their current core meaning. Public candidates show actual source and short meaning; selecting only fills input, never calls AI or submits a query.
3. Caret-aware replacement works on any line, including the middle of three terms. The former scroll listener cancelled pending suggestions when the textarea scrolled; own-input scroll now repositions instead of cancelling. Shift+Enter inserts a newline; IME confirmation does not submit.
4. Home and scene multiline input derive removable chips from the same text, without a second draft store. Removing a term preserves other terms. Existing explicit queue limits and save/query actions remain unchanged.
5. A default-on Reading setting controls basic meanings/reference independently of autocomplete. The compact sourced reference is collapsed beside successful AI content and expanded before an AI failure. It does not overwrite AI JSON, saved history, PC dictionary snapshots or Anki fields.
6. Lazy same-origin Worker shards, exact byte/SHA256 validation, four parsed-shard LRU and bounded best-effort own CacheStorage. Public data cannot consume unbounded learning-history storage. Corrupt data is rejected and explicit retry recovers.

## Design and Data

Generated/inspected [reference](../design/multilingual-v041-reference.png) before implementation. Adopted bounded word/meaning/source rows and compact removable terms; rejected invented Oxford labels/navigation. Sources, revisions, hashes, derived-data rules and licenses are recorded in vendor/basic-dictionaries/README.md and manifest.json. Full raw downloaded sources remain outside the commit. 94 public dictionary/attribution files, 45,288,598 JSON shard bytes; only requested shards load, not the whole dataset at startup. Source excerpts are marked, not presented as complete definitions.

Apple documents UIReferenceLibraryViewController as native UIKit UI, not a browser extraction API: https://developer.apple.com/documentation/uikit/uireferencelibraryviewcontroller . No native bridge/private URL workaround was added. Native text selection remains available; actual iPhone system-menu behavior was not tested. Existing PC dictionary remains independently available and its regression suite passed.

## Evidence

- npm run check, check:basic-dictionaries, build:pages and git diff --check passed. Data gate checks every shard hash/size/bucket plus licenses and real English/Japanese/Chinese aliases.
- check-multilingual-ui.cjs: 320/390/768/1024/1440, light/dark; actual public-data Worker, EN/kana/kanji/Chinese meanings, middle-line replacement, Shift+Enter, IME, chips, normal AI reference, failed-AI fallback, disabled settings, no overflow/errors and no AI calls. Loaded-shard offline lookup and corrupt-shard rejection/retry passed.
- Existing quick-learning, expanded Home editor, scene-learning safety and PC dictionary matrices passed. Control-motion test now waits for its intentional drag transition to settle rather than sampling an intermediate animation frame; the geometry assertion remains unchanged.
- Synthetic screenshots only: [desktop suggestions](v0410/suggestions-desktop.png), [mobile terms](v0410/multiline-mobile.png), [mobile fallback](v0410/fallback-mobile.png). No private content or paid inference used.

## Boundaries and Remaining Work

No physical iPhone/native Apple dictionary, real paid-model, native media playback, Anki/Fushi mutation or Anki sync acceptance in this release. Offline means already-loaded/cached dictionary shards, not guaranteed full-site availability or a fully downloaded dictionary. Other-language personal suggestions remain; public static coverage is EN/JA/ZH only. Existing screenshot recognition, Teyvat indexing, media editing, storage migration and duplicate-history identity backlog are unchanged and not claimed complete.

## Release

Preview, production resource hashes/auth and capture-branch parity will be recorded after deployment gates pass.
