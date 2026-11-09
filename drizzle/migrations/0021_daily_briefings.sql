CREATE TABLE public.daily_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_date date NOT NULL,
  recipients text[] NOT NULL DEFAULT '{}',
  is_practice boolean NOT NULL DEFAULT false,
  summary_text text,
  html text,
  stats jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_briefings TO authenticated;
GRANT ALL ON public.daily_briefings TO service_role;
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read briefings" ON public.daily_briefings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.automation_job_state (job_name, trigger_secret) VALUES ('daily-briefing', gen_random_uuid()::text) ON CONFLICT (job_name) DO NOTHING;