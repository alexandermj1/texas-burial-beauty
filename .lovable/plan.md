# AI: correct family-tree start, full document-request fields, and live proof sends

## Honest answer to "how does the AI make sure the tree starts from the right place?"
Today it doesn't, fully. The AI can send the listing agreement and family tree through the same steps staff use, but:
- The tree's starting point (Step 2 plot wording, Step 4 deed owner names) is only checked by a person in the quote generator. When the AI prepares a quote it opens that generator pre-filled, so staff still do this check.
- The AI's document-request action only opens the "Check the request" screen. It does not fill in the greeting, the email message or the note on the document page.

## What will change

### 1. Deed check before the tree goes out
- Before any quote, agreement or family tree step, the AI reads the deed scan (only when one exists and the names or plot wording are missing or might be wrong). It compares against Step 2 (exact plot wording) and Step 4 (one box per deed owner).
- If the deed clearly matches, the AI fills in or confirms those fields and leaves a colored AI note, e.g. "Deed shows Edward or Patricia Behne, Garden of David, Lot 108, Spaces 3 & 4 — confirmed."
- If the deed disagrees with the record, is unreadable, or shows a later transfer to someone else, the AI does not send the tree. The seller stays in Needs reply, marked "Needs checking".
- The family-tree send is blocked until deed owner names and plot wording are filled in.

### 2. Document request: every field on "Check the request"
- The AI's document-request suggestion now includes:
  - Who the email greets (e.g. "Don", taken from the signer rather than a nickname)
  - Your message in the email (optional; used only when something needs explaining, e.g. a joint POA or a wet-ink original)
  - Your message on their document page (optional; e.g. "Please sign the power of attorney in front of a notary before mailing")
- Approving it opens the same screen with those fields filled in. You press Preview, then Send, exactly as now. The items, POAs and attachments still come from the rules engine.
- Playbook guidance on when to leave each note (and when to leave them blank).

### 3. Live proof, sent to you (using the AI TEST seller)
Each step is proposed by the AI, approved with the normal button, and goes through the real sending steps:
1. **Listing agreement** — the AI proposes sending it and it arrives at alexandermaclarenjames+aitest@gmail.com. I then sign it on the real signing page as the test seller.
2. **Family tree** — the AI checks the deed names and plot wording, then sends the questionnaire. I complete it as a family where the deed holder has died and **Emma Jane** is the heir signing.
3. **Document request** — the AI proposes it with the greeting and both notes filled in. The rules engine builds the checklist, including a prepared **Limited POA for Emma Jane**, which is attached as a PDF. It is sent to you.

All emails go to your +aitest address, which lands in your normal inbox. No real seller is touched. Afterwards I'll report exactly what arrived and anything that looked off.

## Technical details
- `seller-agent`: add a `verify_deed_details` step (with vision on the deed file, used only when relevant) that writes `deed_owner_names` / `plot_description`. Gate `send_family_tree` on both fields being filled and no unresolved deed conflict. Add a `packet` payload to `open_document_request` with `{greeting_name, email_note, page_note}`, and add prompt and playbook rules for these.
- `OwnershipPaperworkPanel`: when opened from an approved AI action, pre-fill `greetName`, `emailNote` and the page note from the payload.
- Test chain run via Playwright and function calls against record 94940c63; plus-addressed email only.
