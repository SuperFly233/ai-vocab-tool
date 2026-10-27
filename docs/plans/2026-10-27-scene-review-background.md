# Scene Review and Background Analysis

Reference: `docs/design/scene-review-background-reference.png`, generated and inspected before implementation.

Use a selectable left list and one right workspace. Put original media and text above editable field comparisons; learning targets span the workspace. Mobile switches between the list and one current item. Keep bottom-rule editors, existing drag grips and explicit adoption. Reject reference-only video timestamps, double checkboxes, invented records and the heatmap's malformed day labels.

Capture input synchronously before configuration/hash/database awaits. Saving binds the immutable task even if creation completes after the editor closes. Closing detaches UI, not the task; explicit Stop and account changes cancel. Browser shutdown still interrupts direct requests. Results remain review proposals and cannot write through stale object revisions.

Share title defaults: a nonempty proposal is selected, other populated fields remain protected. Stored explicit choices win on restore. Distinguish proposed work names from independently verified sources.

Activity visualization must count actual stored creation dates, not pretend that creation is a review or estimated recall. No new main navigation or model calls for statistics.
