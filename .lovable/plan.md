# AI document-request explanation

## Goal
Make the next-step action explain the exact document request in plain English, without dropping an employee into the full family-tree workspace first.

## Changes
- Add a focused “Explain document request” view on the seller profile.
- Ground the explanation in the saved family answers, the rules engine’s exact requested documents, cemetery-specific rules, files already held, and each item’s current status.
- Explain each requested item separately: what fact triggered it, who it applies to, whether Texas/cemetery rules or a manual staff addition caused it, and whether it is already held, prepared by us, or still needed from the seller.
- Keep a clear button from the explanation to the actual document-request checklist for review and sending.
- Update the relevant next-step button to open this explanation instead of the whole family-tree area.
- Label automatically generated POAs as “prepared draft” until actually sent or signed, so they cannot be mistaken for returned documents.

## AI behavior and safety
- Generate the wording with Lovable AI from structured facts only; it may explain but must not add, remove, or reinterpret requirements.
- Show the rules-engine explanation immediately if AI is unavailable, and display the real service error rather than inventing an answer.
- Regenerate when the family answers, requested documents, statuses, held files, or cemetery rules change, so the explanation always reflects the current request.
- Restrict the explanation service to signed-in staff/admin users.

## Verification
- Check Patricia Perkins’s record and confirm Patricia Perkins, Deborah Perkins Wilkerson, and Wade Richard Wilkerson show as prepared POA drafts—not received POAs.
- Confirm the record clearly states that no document request has been sent yet.
- Test the next-step button and explanation on desktop and mobile.
- Verify the AI request live and confirm type-checking passes.
