# Multilingual Suggestions and Basic Dictionary

Status: released v0.41.0; see docs/reports/v0410-multilingual.md for source, deployment and evidence.

## Design

Generated and inspected docs/design/multilingual-v041-reference.png. Adopt bounded word/meaning rows, removable batch terms and a separate compact basic-dictionary reading band. Reject invented navigation, provider names, example counts and Oxford labels. Keep current Lexi layout and existing PC dictionary snapshots.

## Delivery

1. Line-aware autocomplete: current caret segment only, preserving every other line; guard IME, stale responses, account changes and selected ranges.
2. Meaning hints: personal core meanings first, then licensed English/Chinese/Japanese dictionary records. No AI or third-party search of unsubmitted input.
3. Basic dictionary: default-on independent setting; separate sourced reference, including when AI lookup fails. Do not modify AI JSON, original input, saved PC dictionary snapshots or card content.
4. Batch chips: derive from the existing text, no second data store; remove individual terms without API calls. Existing queues/save behavior remain explicit.
5. Lazy public lexicon shards with hashes, provenance and separate licenses. English ECDICT, Japanese JMdict common English, Chinese CC-CEDICT. Coverage is explicitly bounded, not full dictionaries or silent machine translation.

## Apple Boundary

Apple documents UIReferenceLibraryViewController as native UIKit UI and prohibits republishing its contents. This web project has no native bridge/public browser dictionary API. Preserve native selection menus; do not promise automatic system-dictionary extraction, invoke private URL schemes or replace the existing PC connection.

Primary references: https://developer.apple.com/documentation/uikit/uireferencelibraryviewcontroller ; https://github.com/skywind3000/ECDICT ; https://www.edrdg.org/edrdg/licence.html ; https://www.mdbg.net/chinese/dictionary?page=cc-cedict . MDBG current download declares BY-SA4.0, unlike the older CC-CEDICT wiki3.0 wording; preserve the actual downloaded header/license.

## Acceptance

English/Chinese/kana/kanji/reading searches, multiline middle-line insertion, chips, IME, disabled preferences, stale/account responses, asset failure and offline cached shards; exact dictionary fallback on failed AI; five widths/both themes and unchanged queue/scene/media/storage behavior. Source/license/size/hash validation before release; report physical iPhone/native dictionary as untested, not delivered via web.
