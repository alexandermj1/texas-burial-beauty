# Correct multi-plot accepted quote prices

## What will change
- Fix John W. Gaylord’s accepted amount so it remains the per-plot figure from his original quote instead of the all-plots total.
- Correct the same exact multiplication error on the other affected multi-plot records; preserve all original quote amounts, plot counts, fees, acceptance dates, and payment history.
- Fix both paid and free listing-option acceptance paths so future records store the accepted price per plot consistently.
- Make the seller record and Price Sheet derive per-plot and all-plots figures from the same shared quote calculation.

## Verification
- Confirm John displays $8,800 per plot and $17,600 for both plots before the one-time cemetery fee, matching his sent quote.
- Confirm no accepted multi-plot record still has the exact accidental multiplied-total pattern.
- Verify both acceptance paths and run the project checks.
