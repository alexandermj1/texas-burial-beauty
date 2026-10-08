# Make the seller AI cheaper without losing accuracy

## What the numbers show
- Each full review sends the AI about 13,000–16,000 words-worth of input (the whole rulebook + action instructions + the seller's full history). Big ones with scans reach 45,000–55,000.
- About 90% of last week's AI cost was the AI re-loading that long rulebook on every review.
- Many reviews end with "nothing to do" (seller said thanks, we're waiting on them) but still cost a full review.
- Several reviews often fire for one event (an email, then a note, then a record change seconds apart).

## The new design

```text
Event (email / note / record change)
        |
  wait 2 min, merge bursts into one review
        |
  1. Quick triage (small, very cheap model, short summary only)
     -> "nothing to do"  => stop (no big review)
     -> topics needed: fees, documents, signing, quote, family tree, scans...
        |
  2. Full review (smart model), given:
     - core rules (always, short, identical for every seller => cached)
     - only the rulebook chapters for the topics triage picked
     - recent emails in full + a saved short summary of older history
        |
  3. Same suggestion box, same approvals as today
```

### 1. Merge bursts
Changes landing within 2 minutes of each other trigger one review, not three.

### 2. Cheap "is there anything to do?" check
A small model reads only the latest message, newest notes and the file's stage. If clearly nothing is needed (thank-you, "will post Friday", staff already replied) it records "no action needed" and stops. Staff instructions and approvals/declines always skip this check and go straight to the full review.

### 3. Rulebook split into chapters
- **Core (always sent):** tone, sellers-only, handoff rules, fees summary, "respect staff notes", how to answer in the required format.
- **Chapters (sent only when relevant):** fees and quote figures in detail, document rules and POAs, signing troubleshooting, family tree/ownership, quote revisions (10%, 70% ceiling, expired, spaces), document-request fixes, visuals/check tables, declined quotes and special replies.
- Chapters are picked by the triage step AND by simple keyword matching on the latest messages; if unsure, the chapter is included. Accuracy errs on the side of more rules, not fewer.
- The rulebook editor and versions keep working; chapters are just headed sections of the same rulebook.

### 4. Shorter history
Older emails are summarised once and saved; that summary is reused until new mail arrives. The last few emails and all notes since the quote stay word-for-word. Scans still load only when needed (as today).

### 5. Prove accuracy before switching
- Replay the last ~30 real reviews through the new design without saving anything, and compare against what the current design suggested (same action? same key facts in the draft?).
- Show you the side-by-side and the cost difference. Only switch over when you're happy. One switch turns the old design back on.

## Expected effect
Roughly 50–70% less AI cost per week (estimate, to be confirmed by the replay test and a week of real use). Bursts and "nothing to do" files get the biggest savings.

## Technical details
- `seller-agent`: add `triage` step with `google/gemini-3.1-flash-lite` (JSON: `{needs_review, topics[]}`); bypassed when trigger is manual/instruction/decision.
- Playbook: parse latest `ai_playbook.content` by `## ` headings into chapters; `CORE` list + topic→chapter map; keyword fallback; prefix order = static core + action schema first (stable for `prompt_cache_key`), then chapters, then seller context.
- Debounce: `ai_refresh_on_record_change` / note / email triggers write `ai_agent_settings`-style pending row (`ai_review_queue(submission_id, due_at)` upsert); a 1-minute cron drains due rows via existing `x-agent-cron` run.
- History: `contact_submissions.ai_history_summary` + `ai_history_summary_through` timestamp; rebuilt by the cheap model when older mail exceeds the window.
- Replay: new `compare` action runs old vs new prompts on recent `ai_agent_runs` without inserting actions; stores results for review. Feature flag in `ai_agent_settings` (`lean_mode`).
- Record the design rule in AGENTS.md.
