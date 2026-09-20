# Integrated seller workspace

## What will change
- Rebuild the seller record around a clear top header where the cemetery and current selling location are the dominant facts. Keep the customer’s original location wording only before a quote is sent, clearly labelled “What the customer wrote”; hide it once staff have saved the quoted location.
- Make the pipeline a read-only progress display so clicking a stage cannot accidentally move a seller. Put any deliberate manual stage change behind a clearly labelled control and confirmation, while preserving the existing acceptance restrictions and automation.
- Remove repeated contact details, duplicate submitted dates, and other repeated seller facts. Keep email and phone as compact actions rather than prominent fields. Hide deed-owner status, relationship, and deed-name comparison after the family tree is complete because the completed ownership record supersedes them.
- Bring the email thread, family tree/document workflow, team notes, seller uploads, customer files, and remaining actions into one coherent workspace. Email will be the primary/default area; the other tools remain immediately accessible without living as disconnected blocks at the bottom.
- Ensure the editable “Locations being sold” value is the single saved source used by quote emails, listing agreements, family-tree preparation, and document requests.

## Technical details
- Preserve the existing quote acceptance gate: only an actual email acceptance or a confirmed manual Starter move can mark a seller accepted.
- Reuse the existing email, ownership paperwork, notes, and file components; this is a presentation and orchestration change, not a rewrite of their working processes.
- Keep all existing archive, delete, quote, agreement, family-tree, and document-request behavior available.
- Verify the finished seller record at desktop and mobile sizes, including stage safety, email composition, family-tree/documents, notes, files, and shared-location persistence.
