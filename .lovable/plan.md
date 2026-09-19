# Seamless seller record cleanup

## What will change
- Consolidate the cemetery name, submission count, search, cemetery information, and re-match controls into one restrained toolbar in the seller summary.
- Keep detailed cemetery information and editing inline beneath that toolbar, removing the duplicated lower cemetery card.
- Move the document insights control into the seller summary and present extracted information as a clean inline disclosure instead of a separate lower card.
- Make the deed-match result clickable and open an inline deed preview focused on the owner-name area.
- Integrate the reply status with the latest communication area, including a direct reply action and a compact “no reply needed” control; remove the separate lower reply-state box.

## Accuracy fixes
- Use the dedicated plot count before the older `spaces` value everywhere the seller image and related seller displays choose a quantity.
- Display saved quote and resale totals as per-plot amounts by dividing them by the authoritative plot count; retain totals as secondary context when there are multiple plots.
- Tighten acceptance detection so phrases such as “less than expected,” “waiting,” and “not accepting yet” cannot mark a quote accepted.
- Prevent family-tree stages from displaying before acceptance, even if stale family-tree timestamps exist.
- Correct Robert’s incorrect accepted marker while preserving his correspondence and all other record history.

## Verification
- Confirm Robert shows two plots, the correct two-plot image, and correctly labelled per-plot and total amounts.
- Confirm Robert remains at Quoted and does not show Family tree sent.
- Confirm cemetery actions, document insights, deed preview, and reply actions work inline on desktop and mobile.
- Confirm the admin page opens without errors and the seller detail remains compact.
