# Plain-English document-request explanation

## Goal
Replace the family-tree diagram in its current location with a short, plain-English explanation of the ownership relationships and the non-obvious documents those relationships create.

## Changes
- Put the explanation where the family-tree diagram lives now.
- Explain relationships and consequences conversationally, for example: who owns the plot, how another person is related, who is married to whom, and why that produces a joint or individual power of attorney.
- Omit obvious repeated explanations for photo IDs and the certificate of ownership.
- Keep the actual document request immediately below and make each POA mentioned in the explanation clickable so staff can open, check, or edit it.
- Show POAs simply as needed in the request; do not add a separate “prepared” label.
- Update the relevant next-step button to open this explanation and request area.
- Ensure changing the cemetery or verified selling location from the top of the seller profile safely rebuilds every unsigned generated request document, while leaving signed, notarized, or completed copies unchanged.

## AI behavior and safety
- Generate the wording with a low-cost Gemini model from structured facts only; it may explain but must not add, remove, or reinterpret requirements.
- Show the rules-engine explanation immediately if AI is unavailable, and display the real service error rather than inventing an answer.
- Regenerate when the family answers, requested documents, statuses, held files, or cemetery rules change, so the explanation always reflects the current request.
- Restrict the explanation service to signed-in staff/admin users.

## Verification
- Check Patricia Perkins’s record and confirm the three POAs show as needed request items, not received documents.
- Confirm the record clearly states that no document request has been sent yet; the internal PDFs were auto-generated drafts only.
- Test the next-step button and explanation on desktop and mobile.
- Verify the AI request live and confirm type-checking passes.
