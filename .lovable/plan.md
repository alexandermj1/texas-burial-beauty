# Seamless seller record cleanup

## What will change
- Consolidate the cemetery name, submission count, search, cemetery information, and re-match controls into one restrained toolbar in the seller summary.
- Keep detailed cemetery information and editing inline beneath that toolbar, removing the duplicated lower cemetery card.
- Move the document insights control into the seller summary and present extracted information as a clean inline disclosure instead of a separate lower card.
- Make the deed-match result clickable and open an inline deed preview focused on the owner-name area.
- Integrate the reply status with the latest communication area, including a direct reply action and a compact “no reply needed” control; remove the separate lower reply-state box.
- Rebuild the email chain as a compact conversation view: show the latest messages first, collapse older history behind a clear control, group repeated thread content, and keep reply composition close to the active message on desktop and mobile.

## Accuracy fixes
- Use the dedicated plot count before the older `spaces` value everywhere the seller image and related seller displays choose a quantity.
- Display saved quote and resale totals as per-plot amounts by dividing them by the authoritative plot count; retain totals as secondary context when there are multiple plots.
- A seller can become Accepted only through an explicit acceptance in their email response, or when staff manually moves them to Accepted for the free listing option. Selecting a tier, sending materials, timestamps, or inferred wording must never accept a seller automatically.
- Tighten email acceptance detection to require unambiguous confirmation and reject phrases such as “less than expected,” “waiting,” and “not accepting yet.”
- Prevent family-tree stages from displaying before acceptance, even if stale family-tree timestamps exist.
- Correct Robert’s incorrect accepted marker while preserving his correspondence and all other record history.

## Verification
- Confirm Robert shows two plots, the correct two-plot image, and correctly labelled per-plot and total amounts.
- Confirm Robert remains at Quoted and does not show Family tree sent.
- Confirm paid-tier selection alone cannot mark a seller Accepted, while a deliberate staff move to Accepted records the free option.
- Confirm cemetery actions, document insights, deed preview, and reply actions work inline on desktop and mobile.
- Confirm a long email history initially stays compact, older messages are easy to reveal, and replies remain in context.
- Confirm the admin page opens without errors and the seller detail remains compact.
