# Human-attention queue — staged, not active

No functions deployed, settings changed, migrations applied, or records reviewed for this work.

## Behavior after explicit owner activation
- Staff-clicked seller reviews may identify calls, necessary human checks/tasks and genuine material uncertainty after researching the file. The AI continues safe work itself; this is not an autonomous sending release.
- Each concrete outstanding `flag_human` carries validated priority, relative importance, task, reason and evidence in its existing payload. A colleague-language note is saved on both submission and linked customer profile immediately when queued.
- Submissions promote flagged record IDs before duplicate-email merging. A different record sharing an email or a newer sibling reply cannot conceal the task. Existing filters still apply; buyer and archived views are unchanged.
- Ranking uses model-chosen urgency then importance, with oldest task first on ties. Normal list order remains stable.
- Staff resolve with an outcome explaining their completed check/call; the action becomes acknowledged and leaves a file note. Dismissals retain a reason and note. Superseded/rejected/resolved flags no longer promote records. Existing genuine-context invalidation remains in place.

## Activation gate
The shared `HUMAN_ATTENTION_RELEASED` constant is deliberately false. Both server policy/note creation and client queries/sorting are locked off even if a setting is accidentally true. There is no activation button.

Only after Alexander approves: release that constant, deploy seller-agent/publish the UI, then set `ai_agent_settings.human_attention_queue` to JSON boolean true using existing protected settings access. Missing/invalid settings or read errors fail closed. No new schema is needed. Existing phone-only flags retain their legacy behavior while off.

## Verification limits
Pure rule tests cover the hard-off gate, metadata validation, task note content, discretionary ranking, stable ordinary ordering, separate same-email records, newer sibling replies, closed/archive exclusions and resolution/supersession. Current seller pipeline/parity/feedback tests also pass. Real priority creation and staff resolution are deliberately not run against customer records while this release is disabled; test them on an owner-authorized test record before activation.