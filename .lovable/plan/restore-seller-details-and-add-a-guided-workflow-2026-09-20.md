# Restore seller details and add a guided workflow

## What will change
- Restore the visible family-tree map and the seller-provided ownership answers inside **Family tree & documents**.
- Make **Notes** show the complete history for the seller, including notes attached to the wider customer profile and notes attached to this submission.
- Replace the full pipeline rail in the open record with one compact current-stage panel and a stage-specific action that tells employees exactly what to do next; keep the correction menu available for exceptional changes.
- Make the document-request review and send area highly visible again, with a clear primary action and outstanding-document count.
- Remove archive/delete controls from the family-tree/document area and place them once at the very bottom of the open submission.
- Preserve all existing quote, agreement, family confirmation, document-request, and signed-document protections.

## Technical details
- Re-enable the existing `FamilyTreeMap` rather than creating a second ownership view.
- Expand the notes query/subscription scope without duplicating notes that reference both the customer and submission.
- Use the existing authoritative stage calculation and transition handler, so stage filters and automation remain consistent.
- Guide each stage into its real workflow rather than blindly advancing it: open the quote composer when attachments arrive, open/send the listing agreement after acceptance, resend family confirmation while awaiting answers, review the generated document request after the family tree returns, and manage returned documents before completion.
- Preserve the existing automatic agreement-to-family-tree transition; the guidance must not duplicate or bypass that automation.
- Verify an existing seller on desktop and mobile, including historical notes, family answers, prominent document requests, every guided action, and bottom record controls.
