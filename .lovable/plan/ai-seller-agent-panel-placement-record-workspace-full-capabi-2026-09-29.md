# AI Seller Agent: panel placement, record workspace, full-capability audit

## 1. Tone: gentler next steps
- Add a "Moving sellers forward" section to the playbook (new version, old one kept):
  - Mention the next step once, softly: "Whenever you're ready…", "When it suits you…".
  - Never stack several steps or instructions in one email. Name only the next one.
  - No urgency words ("please make sure", "as soon as possible", "to get started, you must").
  - If we've already suggested a step and they haven't replied, don't repeat it. Leave follow-ups to the reminder system.
- Re-run Gary Kloc and Charles Reeder as a test (nothing sent) so you can compare the tone.

## 2. Where the AI lives in the admin panel
- Remove the separate AI Agent tab. Put a clear **AI Agent** button in the Submissions panel toolbar, next to Price sheet. It opens the same panel full-screen: the approval queue, what the AI has done, the "needs you" list, the playbook and the review buttons.
- The button shows a count of suggestions waiting for approval.

## 3. AI workspace on each record
- On every seller record, add an **AI Agent** card near the top in the AI's own indigo colour. It shows:
  - the AI's current status line: stage, next step, and when it last looked
  - suggestions waiting for approval, with Approve / Edit / Reject right there
  - a history of what the AI has done on this record: emails, notes, documents sent
  - a "Pause AI for this seller" switch and a "Review now" button
  - an "Instruction for AI" box, saved as a note the AI reads first
- Rows in the Submissions list get a small indigo AI dot when the AI has something waiting or is working on that seller.

## 4. Audit: what the admin panel can do vs what the AI can do

| Admin action | How staff do it today | AI today | Plan |
|---|---|---|---|
| Reply to seller email | Email composer | Yes (with approval) | Keep; tagged "Sent by AI" |
| Internal note | Notes | Yes | Keep; indigo "Done by AI" note |
| Send / resend quote | Send Quote dialog (builds figures, payment links, sets quote sent) | No | **Opens the same dialog, prefilled** |
| Send listing agreement | Autopilot / Contracts panel | No | **Calls the same autopilot step** |
| Resend signing link | Contracts panel | No | Same autopilot step (reuses existing link) |
| Send family tree | Autopilot family-tree step | No | **Calls the same autopilot step** |
| Send / update document request | Ownership paperwork review dialog (items, POAs, packet) | No | **Opens the same review dialog, prefilled** |
| Change stage / fields | Record editor | No | Proposed field change, applied through the same record update (audit history kept) |
| Payment link | Payment link dialog | No | Needs a person; the AI can only flag it |
| Refunds, cancellations, price changes | Owner only | No | Never; always flag a person |

**Rule:** the AI never has its own copy of any of these. Every action goes through the exact code staff use, so the saved record matches a human action exactly: quote sent date, contract rows, signing tokens, family-tree sent stamp, document request items, activity log, notifications and email tags.
- **Sent straight from the server** (same functions the office uses): listing agreement, signing link, family tree, notes, replies.
- **Opens the existing staff dialog, prefilled by the AI; staff click Send:** quote and document request. These are built in the browser today (payment links, POAs, packet assembly). Moving them to the server comes later, when they're ready to send by themselves.

## 5. Teaching the AI to use every action
- Add an "Operating the admin panel" section to the playbook. For each action it covers: when to use it, what must already be true, what it changes, and what not to do. Examples:
  - Send a listing agreement only after the quote is accepted and there's no signed agreement.
  - Send the family tree only after the agreement is signed.
  - Send a document request only when the ownership answers are complete.
- Before proposing an action, the AI gets a code-computed list of which actions are allowed on this record right now (from the same rules the panel uses). Anything not on that list is thrown out.
- Every executed action writes: an indigo AI note on the profile, an activity-log entry naming the approving staff member, and the normal milestone stamps.

## 6. Checks after building
- On a test seller record: approve each action type once, then confirm the record, email history tags, notes, activity log and notifications match a staff-performed action.
- Re-run the four sellers from last time, with nothing sent.

## Technical details
- `seller-agent`:
  - new action types `send_listing_agreement`, `send_family_tree`, `open_quote_dialog`, `open_document_request`, `update_fields` (allow-listed columns only)
  - `allowedActions(sub)` gate before and after the model runs
  - execution calls `autopilot` (service role) for the server-side steps
  - the model output checks its choices against that allowed list
- Frontend:
  - `AiAgentButton` + full-screen sheet in `SubmissionsPanel`
  - `AiRecordCard` in the submission detail
  - approving an "open dialog" action opens `SendQuoteDialog` / the `OwnershipPaperworkPanel` review, prefilled from the AI draft; the action is marked done when that dialog reports success
- Remove the `ai_agent` tab from `Admin.tsx`.
- Playbook v2 adds the tone and "Operating the admin panel" sections.
- Everything still requires approval; autonomous sending stays off.
