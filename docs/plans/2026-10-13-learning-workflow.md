# v0.20 Learning Workflow

Objective: review and fix bugs, improve existing workflows, and ship at least five independent new features.

The selected design extends the current lookup and library rather than adding another dashboard. Existing data, history identities, model results, and synchronization rules remain authoritative. Review progress is a resumable device-local session, not a new cloud mastery field. Speech uses the browser's Web Speech API and reports unsupported or failed playback. No new model requests are required.

## Acceptance Checklist

- [x] Reproduce and fix mobile result overflow (v0.19.2; browser checks at 320/390/768/1440px).
- [x] Fix nested keyboard activation, clipboard failures, canceled detail regeneration, and failed bookmark busy state.
- [x] Pronunciation: title and example controls, language detection, stop/replacement, error handling.
- [x] Review: words and pinned fragments, reveal, known/again/skip, shuffle, results, retry, local resume.
- [x] Folder search: original and normalized titles, meanings, examples, notes, fragments and source; reset pagination without losing input focus.
- [x] Markdown export: current/draft detail, folder, fragments and history selection; correct file type and escaped model text; JSON export unchanged.
- [x] Bulk history: select visible/matching records, explicit selection count, additive folder assignment, atomic delete with tombstones, JSON/Markdown export.
- [x] Pure data tests plus real browser interactions on mobile and desktop, light/dark screenshots, scroll/width measurements, and existing full test suite.
- [ ] Release docs, cache versions, clean build, commit/push, Cloudflare deployment and live version verification.

## Alternatives Considered

Spaced repetition with synchronized per-fragment mastery would require a new cross-device conflict contract and a permanent study section. It is deferred in favor of a complete session review flow. A large actions menu is unnecessary: secondary actions use labeled icon controls and a contextual selection bar. Folder search remains outside the rerendered list so typing never loses focus. Exports and review derive from the current filtered folder; existing JSON backups retain their full-fidelity scope.

## Evidence

Record tested behavior and release artifacts here as each acceptance item is completed. Passing static contracts alone does not prove a feature works.

- `npm run check` passes the learning pure tests and all existing history, settings, storage, lookup and sync contracts.
- Browser interactions passed at 390px (real touch events) and 1440px in light/dark modes: downloads inspected, review resumed after reload, additive folders preserved, deletion tombstones cleared by undo, malformed drafts blocked, quota errors left data unchanged, and model/visual ordering persisted after reload. Web Speech is mocked to verify routing and errors; physical device audio is not claimed.
- Width checks pass at 320/390/768/1440px for normal and unbroken long model text. Wide tables scroll internally. Scrolled toolbar top is 0px on mobile and 4px on desktop, with heights 62px and 64px respectively.
- Screenshots saved under the host temporary directory `lexi-v020-qa`; inspected mobile dark review/detail, desktop folder search and mobile scrolled result.
- Real browser testing found and fixed the undefined `clearApiProfileDropMarks` call and pointer capture preventing toast action clicks. Hidden CSS tooltips no longer contribute invisible scroll overflow.
