# Restore seller details and simplify the open submission

## What will change
- Restore the visible family-tree map and the seller-provided ownership answers inside **Family tree & documents**.
- Make **Notes** show the complete history for the seller, including notes attached to the wider customer profile and notes attached to this submission.
- Replace the full pipeline rail in the open record with one compact current-stage panel and a clear **Move to next stage** action; keep the correction menu available for exceptional changes.
- Remove archive/delete controls from the family-tree/document area and place them once at the very bottom of the open submission.
- Preserve all existing quote, agreement, family confirmation, document-request, and signed-document protections.

## Technical details
- Re-enable the existing `FamilyTreeMap` rather than creating a second ownership view.
- Expand the notes query/subscription scope without duplicating notes that reference both the customer and submission.
- Use the existing authoritative stage calculation and transition handler, so stage filters and automation remain consistent.
- Verify an existing seller on desktop and mobile, including historical notes, family answers, next-stage movement, and bottom record controls.
