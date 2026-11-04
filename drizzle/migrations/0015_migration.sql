alter table public.buyer_want_alerts
  add column if not exists ai_verdict text,
  add column if not exists investigation jsonb,
  add column if not exists investigated_at timestamptz;
comment on column public.buyer_want_alerts.ai_verdict is 'show = investigator confirmed worth a human look; hidden = investigator ruled it out (kept for audit, auto-dismissed)';