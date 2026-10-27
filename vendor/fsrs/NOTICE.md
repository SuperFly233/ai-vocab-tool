# FSRS Dependency

Server-side scheduling uses the exact npm package `ts-fsrs@5.4.2`, MIT licensed. The registry integrity is recorded in package-lock.json. Upstream source and release: https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v5.4.2 . The original LICENSE is preserved alongside this notice.

The application explicitly fixes the21 FSRS-6 weights, retention, learning steps and disabled fuzz. The core is tested separately; it is not a deployed review service until durable atomic event storage and the user interface pass acceptance. No Anki scheduling is modified.
