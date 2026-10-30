# Version and Release Policy

## Meaning

Website versions use `major.minor.patch`. The current `0.x` series means the product is still evolving; it does not make every change a patch.

- Patch: compatible defect, accessibility, layout, performance or security fixes within an existing workflow. Example: correct button alignment or prevent interrupted analysis.
- Minor: a new user-facing capability or substantial workflow redesign. Example: manual media editing, bilingual highlight pairing, exercise capture or its complete capture-first redesign.
- Major: a deliberately stabilized product generation or a breaking public compatibility change. During `0.x`, breaking changes require an explicit minor release, migration notes and compatibility acceptance; they must never hide inside a patch.
- A documentation-only correction does not require a new runtime version. Deployment IDs and Git commits identify builds; they are not product versions.

Bridge versions are independent. Website releases do not automatically require reinstalling Bridge. Protocol/schema versions describe compatibility separately from either product version.

## Correction of the 0.43 Series

The published0.43.x series mixed feature releases with fixes. This was inconsistent release classification, not a technical requirement or a reliable measure of progress. Preserve published versions, assets, hashes and evidence; do not silently relabel old builds.

| Historical range | Actual scope |
| --- | --- |
| 0.43.0-0.43.8 | Onboarding, scene analysis and editor/organization work, including fixes |
| 0.43.9-0.43.12 | Manual media editing, AI crop and background analysis/review work |
| 0.43.13-0.43.17 | Bilingual pairing and subsequent input/crop fixes |
| 0.43.18-0.43.21 | Exercise capture, annotations, connection mitigation and capture-first redesign |

These ranges summarize scope, not acceptance. Some versions were candidates or previews, and some capabilities remain disabled. Per-release reports determine what actually shipped. In particular,0.43.21 is a substantial workflow redesign and should not have been classified as a patch.

0.43.21 remains the historical deployed version. Do not create0.43.22 by default. The next accepted feature/workflow release starts at0.44.0; a genuinely necessary0.43 hotfix may still use0.43.22 with its narrow scope documented. New features after0.44.0 advance0.45.0,0.46.0, etc.; fixes to0.44 use0.44.1,0.44.2, etc.

## Milestones Are Not Reserved Releases

Older plans associated0.44.0 with FSRS and0.45.0 with storage. Treat those numbers as superseded planning labels, not reserved release slots or evidence of completion. Identify unfinished work by stable capability names and acceptance criteria. Assign the actual next release number when its accepted scope is known. Do not claim FSRS, source matching or another milestone shipped merely because its formerly planned number was reached.

## Release Gate

Before implementation/release, record the scope, feature-versus-fix classification, version choice and compatibility impact. Previews use an explicitly marked candidate such as0.44.0-rc.1 or an identified preview deployment; never present them as production acceptance. Only promote after the applicable UI/data/API tests pass, then record the production URL, commit and limitations. No version bump can substitute for functional delivery.
