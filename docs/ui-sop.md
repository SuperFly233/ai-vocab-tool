# UI SOP / Persistent User Preferences

## Design Before Implementation

User confirmed 2026-10-21: generate a bitmap UI reference with the image model before substantial layout redesign, inspect it, then plan and implement. Keep the artifact and the concrete decisions in the project, not only in chat. The generated design guides hierarchy, not application data, navigation or background assets.

## Consistency and Readability

- Inspect both themes and 320/390/768/1024/1440px, including long content and scrolled states.
- Align headings, metadata, filters, toolbars and row actions on explicit layout tracks; SVGs use stable centered hit areas. No character icons.
- Compare semantic candidates across established icon families, including Lucide and Phosphor. Match the existing style and licensing; do not bundle a new library just for variety. Reset is not close, review is not video playback, import is not browse-folder, opening a word is not generic sharing.
- Field help states purpose, required/optional constraints and a concrete example. Reuse visual-editor bubble/pinned preferences. Help must fit inside the visible viewport without being clipped by scroll containers.
- Place quote/translation highlights immediately after their respective text, and render both with the existing escaped highlighter everywhere.
- Show scene creation/modification using the same date formatter as history. List density may follow history time preference; detail/editor can show both explicitly. Never fabricate unknown timestamps.
- Rename media reference metadata without changing file hash, MIME, bytes or other unrelated scenes.

## Draft Safety

No change: close directly. Changed: confirm, then show discard Toast with undo. Undo restores editable fields, not committed data; reject account switches, deleted objects and newer saved revisions. Preserve invalid JSON drafts for recovery too. Cover close button, Escape and deliberate backdrop click. Do not treat save, cancel selection, or changing a help preference as an edit.

## Delivery

Report actual bugs fixed, optimizations and new functions separately; include tests, screenshots, commit and deployment. Browser mobile emulation is not a real iPhone test. Keep Anki production gate closed until its independent migration and real-deck acceptance.
