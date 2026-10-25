# Bridge 0.4.1 / Lexi v0.42.2

Windows ZIP: extract the entire archive to a new directory, keep `_internal`,
then start `LexiConnect.exe`. No Python installation required. Default startup
is manual, with no browser popup or autorun registration.

Before updating, pause new tasks, finish or explicitly cancel the remaining
batch in Lexi, then exit the old helper from the tray. Do not overwrite running
files. Settings remain in `%LOCALAPPDATA%\LexiAnkiBridge`; credentials remain
in Windows Credential Manager.

Open connection settings from the tray, verify the actual helper version,
sign into the same Lexi account, register this PC and check Anki. Use the
original Lexi website to select content, choose the deck and approve preview.
Fushi and dictionary connections are optional for ordinary card creation.
Diagnostics expire after120seconds; heartbeat is not proof of Anki readiness.

This release preserves old tasks and Lapis/Fushi templates. Actual portable
acceptance uses only synthetic content in the dedicated Lexi test deck.
Writing to Anki is distinct from Anki's own cloud sync. Physical iPhone,
real media playback, native tray popup screenshots and Anki cloud sync remain
outside the verified scope. Production vision and duplicate consolidation
are separate unfinished work.
