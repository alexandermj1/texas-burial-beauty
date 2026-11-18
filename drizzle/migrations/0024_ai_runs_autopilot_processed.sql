ALTER TABLE public.ai_agent_runs ADD COLUMN IF NOT EXISTS autopilot_processed_at timestamptz;
UPDATE public.ai_agent_runs r SET autopilot_processed_at = now()
WHERE autopilot_processed_at IS NULL AND (
  r.created_at < now() - interval '48 hours'
  OR EXISTS (SELECT 1 FROM public.ai_agent_actions a JOIN public.ai_outbox o ON o.action_id = a.id WHERE a.run_id = r.id)
);