# v0.40.1 Expanded Query Fix

Status: candidate verification, not yet deployed.

## Reproduction and Cause

The previous acceptance measured the64px sticky summary but failed to limit its OPEN editor. On1440px/dark/top with one phrase and no queued task: popup1400x252px, input104px, input-wrapper radius999px. Split layout also reserved104px input height. Saved baseline screenshots: tmp/expanded-before.

This is a focused correction to the existing compact-editor design, not a new design direction. Input CSS explicitly reserved96–104px for every query, inherited pill corners and full-page popup width; the panel also duplicated search/media actions already present in the sticky bar.

## Correction

- Popup maximum880px, anchored beneath the disclosure; mobile uses safe side margins.
- Input44px for one short line, grows/shrinks with actual wrapped text to136px;8px wrapper corners.
- Expanded queue has its own160px scroll area; overall popup capped420px and available viewport height.
- Only sticky bar retains scene/search actions. Original input node, queue, keyboard and folder selector remain intact. Closing clears temporary inline sizing without clearing user input.
- SOP now requires open-popup measurements and screenshots, not just shell height.

## Acceptance

check-expanded-query.cjs:320/390/768/1024/1440, both themes, top/split,1/3/20 input lines,0/3/20 FULLY EXPANDED queued tasks, live growth/shrink, close/reopen and return-top restoration. No global overflow hiding, no native app/data change, no paid model call. Physical iPhone not tested.

Preview/production hashes, screenshots and commits are recorded after actual deployment.
