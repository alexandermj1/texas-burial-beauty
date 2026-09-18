# Seller document auto follow-up plan

## Goal
Send a polite branded reminder after one week when a seller still has outstanding document-request items, while suppressing reminders when recent notes, calls, or emails indicate active contact.

## Work
1. Map the current document request, communication history, email threading, and scheduled-job infrastructure.
2. Define one clear eligibility rule, recent-contact suppression window, retry/idempotency behavior, and owner-visible pause state.
3. Add a bounded scheduled processor with a database lease, per-reminder audit records, and circuit-breaker handling.
4. Send one branded message listing the specific missing items and linking to the seller request.
5. Record the message in the existing email chain with an Auto follow-up tag.
6. Verify selection, suppression, duplicate prevention, email content, and the admin display.

## Safety defaults
- Evaluate once daily; a seller becomes eligible seven days after the request was sent or the last reminder.
- Suppress when any staff note, logged phone contact, or inbound/outbound email exists within the prior seven days.
- Never send more than one reminder per seller in seven days.
- Skip archived, completed, invalid-email, and paused records.
- Process a small fixed batch each run; overlapping runs exit.
- Pause automation on email credit/policy errors, access denial, or repeated rate limits, and show the reason to the owner.
