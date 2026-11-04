# Buyer "waiting for" tracking — replaces Potential plot match

## The idea in one line
AI reads each buyer reply **once** and writes down, in a structured note, exactly what they are waiting for. After that, matching new plots against those notes is mostly plain arithmetic (free). AI is only asked again for the borderline "close but not exact" cases, with a tiny payload. Records come back to the top with a plain-English reason. Nothing is ever emailed automatically.

## 1. "Waiting for" note (one cheap AI read per buyer reply)
Runs only when a buyer **replies to us** — not on every email, not on page loads, not on a timer.

The AI gets: the buyer's new message, what we last offered them, and their existing note (if any). It returns an updated note:
- **Status**: waiting / declined everything / bought elsewhere / no longer interested / nothing to track
- **Must-haves**: cemetery (or "any near X"), burial vs niche vs mausoleum, number of spaces (companion = 2), side-by-side needed, at-need vs pre-need deadline
- **Price**: their ceiling, and whether it was firm ("absolutely no more than") or soft ("ideally under")
- **Nice-to-haves**: section, garden, location in the cemetery
- **What they rejected** from our offer and why ("too expensive", "wrong cemetery")
- **Their exact words** quoted, so staff can check the AI's reading
- **Confidence**; low-confidence notes are marked "check this" for staff

Staff can see and edit the note on the buyer card. Staff edits always win and are never overwritten by AI.

## 2. Matching when new plots appear (mostly zero tokens)
When a seller reaches quote accepted / listing live, or a price changes, every open note is checked by code:
- **Clear match**: meets every must-have and price → surfaced, no AI needed
- **Clear miss**: wrong cemetery and far away, wrong type, too few spaces → ignored, no AI
- **Borderline**: e.g. $6,000 when they said "under $5,000", 5 spaces when they asked for 6, a cemetery 15 miles away, a soft ceiling slightly exceeded → a short AI judgement (note + one plot summary, a few hundred words) answers "worth showing a human? yes / maybe / no" plus one sentence why. Cached so the same pair is never judged twice.

Tolerance bands (firm vs soft price, ± spaces, distance) live in one settings block so they can be tuned.

## 3. Back on top, with the reason
Replaces the "Potential plot match" tag and its logic entirely. The buyer card shows e.g.:

> **Back on top — new plot may suit them.** Wanted 2 side-by-side at Restland under $5,000 (soft). New: 2 spaces at Restland, $5,400 — 8% over their budget.

Other reasons it can surface: their deadline is approaching, or a buyer who said "tell me when more come up" now has any new stock nearby.

Buttons: **Dismiss**, **Not suitable (why)**, **Snooze**. "Not suitable" feedback is stored for tuning, the same way as seller-AI feedback.

## 4. Getting started
- One-off pass over existing buyers who have replied to us, so old waiting-list requests are captured (I'll tell you the estimated cost before running it).
- Tests built from real cases: Marinell (companion vs 2 spaces), Magdalena (nearby cemeteries), Bruce (misspelt cemetery name), plus price-ceiling and space-count edge cases.

## Cost
- About one cheap AI read per buyer reply, plus occasional short borderline judgements when new stock arrives. Older emails are summarised rather than re-read. No scheduled AI scans.

## Needs your OK
- An earlier rule says AI runs **only when staff click**, never because an email arrived. This plan makes an exception for buyer replies (one cheap read each). If you'd rather not, a "Read buyer reply" button works too, but records won't surface by themselves.

## Technical details
- New `buyer_wants` table (submission id, structured JSON, quoted text, confidence, source message id, staff_edited flag, superseded_at; soft-delete only) and `buyer_want_alerts` (want id, seller id, verdict, reason, dismissed/snoozed, feedback).
- `buyer-agent` gets an `extract_want` action (cheap Gemini Flash-Lite, strict JSON schema, fingerprint cache on message id) triggered by sync-inbox when an inbound buyer message arrives after one of our outgoing emails.
- Matching: a `match_wants` action fired by a trigger on seller stage/price changes; deterministic filter reuses `cemeteryMatching`, `quoteFigures`/`buyerQuotedTotal` and the existing 25-mile distance logic; borderline pairs go to a short judge call cached by (want version, seller version).
- `SubmissionsPanel`: delete `plotMatchMap` and its tag; `awaitingAll` merges open alerts; new reason banner and note editor on buyer cards.
- Record the rule in AGENTS.md.
