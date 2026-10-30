# Exercise Capture-First Redesign

Generated with built-in imagegen and inspected before implementation: exercise04321-alternatives.png compares capture-first/reading-first; exercise04321-layout.png covers desktop/phone task states. Choose capture-first. Reject invented word-count summaries, fake green completion, decorative backgrounds and translation-only target buttons in the generated references.

- One compact header: runner/title, factual counts, secondary Return/Preferences, separated End. Empty mode has no task/navigation column; one clipboard intake band, one file picker, underline query immediately below.
- Populated horizontal task sequence; desktop40% image/60% reading, below1100px stack. Primary64px and secondary48px hitboxes; original34/30px, translation28/26px. Existing font/theme semantics,6px corners and dividers.
- Preferences uses bounded shared dialog with existing feature switch, never in-flow details. Focus returns to trigger; model config remains explicitly initiated. No AI call when opening preferences.
- Update keyed task rows and detail only when their content changes. Retain text selection/open disclosure/scroll; input and action skeleton remain stable through background updates. Query binds the selected screenshot before awaiting any work; empty capture can enqueue ordinary lookup without creating a scene.
- End summary counts durable receipts once, plus nonzero unresolved states; no fake all-done indicator. Preserve input/session identity and existing queued work.
- QA must inspect actual empty+preferences light state,1/3/20 screenshots, failures, long text, Backlog and ending; five widths/light-dark,125/150% effective CSS zoom, focus/selection/IME/scroll/keyboard safe areas and idle request regression. Real devices/model quality remain unverified by synthetic tests.
