# AI Seller Agent: moving sellers through the pipeline with less staff time

## Goal
An AI agent that works in the background on every seller submission. It reads each new email, note, upload and stage change, then decides the next step: replying, fixing a problem, chasing a missing item, or moving the seller forward. Staff still take phone calls and log a note afterwards. The agent reads those notes and carries on from there. People only step in for exceptions.

## How it will work for the office

```text
New email / note / upload / stage change
            |
     AI agent reviews the full seller record
            |
   +--------+---------+------------------+
   |                  |                  |
 Safe action        Needs approval     Needs a human
 (does it)          (drafts it)        (flags it)
   |                  |                  |
 Logged + shown     "Approve" queue    "Needs you" queue
 on the record      in admin           with reason
```

### 1. One company playbook the AI follows
- A single maintained "TCB Playbook" covering fee structure (55% target, 70% ceiling, 15% buyer fee, transfer fee once), stages, document rules and why each document is needed, POA and heirship logic, tone and wording rules (no hand-written feel, never promise offer reviews), cemetery-specific rules, and what must never be said.
- Built from what already exists: the quote engine, ownership rules engine, document-request explanations, email templates and past approved replies. The old AI reply prompt gets replaced so it can't fall out of date again.
- An admin "Playbook" page where you can read and edit the rules in plain English. Every change is versioned.

### 2. Background agent run on every seller event
- Triggered by an incoming email, a staff note or call log, an upload, a signed agreement, a completed family tree, a quiet period (for example 3 days with no progress), or a stage change.
- Before acting, it reads the whole record: all submissions for that email, the full email thread, notes, files and what the AI found in them, the quote, the agreement, the family tree and the document request.
- It always works out figures, required documents and stages with the existing rules code. It never estimates them itself, so numbers always match the quote.

### 3. What the agent can do (tools)
Autonomous (low risk, reversible):
- Answer common questions: how selling works, fees, timing, why a document is needed, and how to sign or upload.
- Resend a signing link, family-tree link or document-upload link, and generate a fresh agreement when a link has expired.
- Check uploaded files, confirm the right document arrived, and ask for a clearer copy or the correct document.
- Move the seller forward when the rules show a step is finished (for example, documents received leads to review).
- Add an internal note explaining what it did and why.

Needs one-click approval at first (can be switched to autonomous per action later):
- Sending a quote, or changing a price or listing tier.
- Sending or changing a document request.
- Replying to complaints, legal questions, disputes, or anything the AI is unsure about.

Always human:
- Phone calls, refunds, cancellations, death or probate edge cases the rules can't resolve, angry customers, and anyone who asks for a person.

### 4. Safety rules (reusing what already works)
- Sellers only. Buyers, general enquiries and job-site emails (such as Indeed) are never touched.
- Waits for staff: if a person emailed, called or left a note in the last X hours, the agent pauses. It then reads the note and follows its instructions ("customer will sign Friday, don't chase").
- One email per person per step, weekday business hours only, sent in the existing Gmail thread with the branded design.
- A confidence score on every decision. Anything low confidence goes to the human queue.
- Global and per-seller "pause AI" switches, plus a daily cap on emails sent.
- Every action is logged with the AI's reasoning. You can undo stage changes. Nothing is ever deleted.

### 5. Admin experience
- **AI inbox** with three tabs: Done by AI, Awaiting approval, and Needs you. Each item shows a one-line reason and an Approve / Edit / Reject control.
- On each seller record: an "AI status" line (for example "Waiting on signed agreement, will remind Tue"), the AI's planned next step, and a pause toggle.
- Notes get a simple "Instruction for AI" option, so staff can steer the agent after a phone call.
- A weekly summary: sellers moved forward, hours saved, and items handled by people.

### 6. Learning from the office
- When staff edit or reject a draft, the correction is saved as an example. Approved examples feed back into the agent's prompts so it matches how you reply.
- A monthly review list of the edits made most often, suggesting playbook updates for you to approve.

## Rollout (phased)
1. **Shadow mode (1–2 weeks):** the agent decides and drafts everything but sends nothing. You compare its decisions with what staff actually did.
2. **Approval mode:** every outgoing action needs one click.
3. **Partial autonomy:** turn on autonomous sending action by action (link resends first, then FAQs, then document chasing) once approval rates are high.
4. **Full background operation:** people handle only the Needs-you queue and phone calls.

## Technical details
- New tables: `ai_playbook` (versioned sections), `ai_agent_runs` (trigger, context snapshot, decision, confidence, reasoning), `ai_agent_actions` (proposed/approved/executed/undone, with the approver), `ai_agent_settings` (global and per-action autonomy level, caps, pause), and `ai_reply_examples`. All have RLS limited to admin/staff, grants, and soft-delete only.
- New edge function `seller-agent`: builds the context, calls `openai/gpt-6-astra` through the Lovable AI Gateway Responses API with function tools that wrap the existing functions (gmail-action, send-contract-link, generate-contract, ownership-questions, send-document-packet, extract-attachment-info, the quote engine and the rules engine). It streams, uses `store:false` and reasoning, and follows the gateway error handling (a 402/403 pauses the queue).
- Triggers: incoming email sync, inserts into customer_notes and customer_files, stage-change hooks, and a cron sweep for stalled sellers. Idempotency uses the reminder_log pattern, and the existing autoFollowup suppression rules are reused.
- `draft-email-reply` is replaced by the agent's reply tool so there's only one prompt source.
- Existing follow-up jobs (quote, family tree, documents, listing agreement) stay as they are at first. They're folded into the agent in phase 4.
- Every figure comes from `quoteFigures`/`quoteEngine`, and every document from `ownershipRules`. The model only chooses and words actions.
