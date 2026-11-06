# Seller AI autopilot: replies, follow-ups and cheap check-backs

## Goal
Let the Seller AI keep sellers moving through the pipeline by itself: it replies to emails at human-looking times, plans when to check back, and leaves itself a note so a later visit costs almost nothing when little has changed. Anything it hands to a person stays with that person.

This replaces two current rules: "reviews only run when staff click" and "the automatic queue stays off". Autopilot starts **off** and is switched on per record or for everyone from one owner setting, so you can test it first.

## 1. When it replies (natural timing)
- **First reply to a new email:** wait a random 8–25 minutes, and never send at the same minute twice in a row.
- **Back-and-forth conversation** (the seller replied within the last ~30 minutes): faster, 3–9 minutes.
- **Long replies:** add about 1 minute for every ~80 words, up to 10 extra minutes, so a long email never arrives seconds after the seller's message.
- **Quiet hours:** it doesn't send between 9pm and 7:30am Texas time or on Sunday. Replies drafted then are held until the next morning, with a random delay added.
- **New email before sending:** if the seller writes again before the held reply goes out, the draft is dropped and the AI writes a fresh one covering both emails (this uses the existing rule that a newer email replaces old suggestions).
- **Who sends it:** the AI's own reply on its own record goes out automatically after the wait. Bigger steps (sending a quote, document requests, contract links, family-tree changes) follow the "Approval level" setting below.

## 2. Check-back plan and its own note
Every review ends with a short **check-back note** saved on the record:
- **Where it left off:** for example, "Sent the document request on 6 Nov; waiting for Douglas's ID and the POA original."
- **What it is waiting for:** a seller reply, a document, a payment, a signature, or the cemetery.
- **When to check back:** the AI picks a sensible date. For example, 3 days after a document request, 2 days after a quote, 1 day after a contract link, and 5–7 days when the cemetery is involved. The date is kept within 1–14 days.
- **What to do if nothing has happened:** for example, "send a gentle reminder; after the 2nd reminder, flag a person to phone."
- **A record fingerprint:** a compact summary of emails, notes, files, payments, contracts and record fields at that moment.

Staff can see this note and its date in the Seller AI box, and can change the date or cancel it.

## 3. Cheap wake-ups (the main token saver)
A background check runs every 10 minutes. It looks only at records whose check-back date has arrived or that received a new email, and it uses **no AI at all** to decide what to do:

| What changed since the note | What it does | Cost |
|---|---|---|
| Nothing, and the check-back date has arrived | Sends the follow-up already planned in the note, using a small template-based reminder written by the cheapest model from the note alone | about 1¢ |
| Only a staff note | A cheap model reads the note and decides: "staff handled it, move the date", "staff asked AI to do X", or "needs a full review" | under 1¢ |
| A new seller email, file, payment or signature | Full Sol review (with existing cached research and file reads) | as today |
| A person is handling the record (open human-attention task) | Does nothing until the task is resolved | 0 |

The fingerprint is compared **piece by piece**, so the AI knows exactly what changed (for example, "only a note from Cici at 3pm"). It doesn't have to reread the whole file to find out.

## 4. Safety limits
- **One review at a time:** only one automatic review can run on a record at once (a lock in the database).
- **Run limits:** each 10-minute run handles at most 5 records.
- **Daily limits:** at most 3 automatic emails per seller per day, and a daily spending limit for all of autopilot (suggested $5/day). When the limit is reached, autopilot pauses and shows why.
- **Automatic pause:** if AI credits run out or access is denied, autopilot pauses and an owner must resume it.
- **Reminder limit:** at most 3 reminders on the same request. After that, the record goes to a person to phone.
- **Records it never touches:** withdrawn, sold, archived, opted-out, refund or disputed records, and anything flagged for a person.
- **Fixed rules still apply:** never pay out, archive or do buyer matching, and staff-only calls stay with staff.

## 5. Approval level (owner setting)
- **Level 1, "Replies only":** the AI sends its own replies and reminders automatically. Everything else waits as a suggestion for staff.
- **Level 2, "Paperwork too":** it also sends document requests, reminders and family-tree corrections that follow a seller's clear answer.
- **Level 3, "Full":** it also sends quotes and contract links within the allowed figures.

I suggest starting at Level 1 on about 5 test records for a week. You can then compare its timing and wording before raising the level.

## 6. What you'll see
- **Autopilot strip** in the Seller AI box: "Next check: Tue 10 Nov · waiting for POA original · reply held until 8:12am".
- **Admin page:** autopilot on/off, approval level, daily spending limit, and today's activity (emails sent, check-backs, spend).
- **AI marking:** every automatic email is marked "Sent by AI" as now.

## Technical details
- **New table `ai_followups`:** record_id, due_at, waiting_for, plan_note, next_action, fingerprint JSON (per-part hashes plus counts and latest timestamps), reminder_count and status. Each new plan replaces the old one, and earlier plans are kept.
- **New table `ai_outbox`:** held replies with send_at. The sweep cancels a held reply when a newer inbound email arrives.
- **New `seller-autopilot` edge function** triggered by pg_cron every 10 minutes. It uses a lease-lock row, limits each batch, checks the paused-state flag at entry, stops on 402, 403 and repeated 429 errors, and records spend in an `autopilot_state` row.
- **seller-agent changes:**
  - Its decision output gets a `followup_plan` field, which is validated and clamped.
  - It accepts autopilot requests only with a signed internal secret, replacing the current rule that rejects all cron requests.
- **Diffing:** only staff-note diffs go to the cheap triage model. Template reminders reuse the planned wording.
- **Records to update:** the memory and project rules that say "reviews only on staff click" and "queue stays off" will be updated to say "autopilot, owner-enabled".
- **Tests:**
  - Timing: delay ranges, conversation cadence, long-reply padding and quiet hours.
  - Fingerprint diff routing.
  - Limits and pause behaviour.
