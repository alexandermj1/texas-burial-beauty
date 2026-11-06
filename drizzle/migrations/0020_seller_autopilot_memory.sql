CREATE TABLE public.ai_record_memory (
  submission_id uuid PRIMARY KEY,
  summary text NOT NULL DEFAULT '',
  waiting_for text,
  next_if_silent text,
  due_at timestamptz,
  suspect_problem boolean NOT NULL DEFAULT false,
  reminder_count integer NOT NULL DEFAULT 0,
  fingerprint jsonb,
  last_full_review_at timestamptz,
  last_run_id uuid,
  last_route text,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_record_memory_due_idx ON public.ai_record_memory (due_at);
GRANT SELECT, UPDATE ON public.ai_record_memory TO authenticated;
GRANT ALL ON public.ai_record_memory TO service_role;
ALTER TABLE public.ai_record_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read AI memory" ON public.ai_record_memory FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff adjust AI check-back" ON public.ai_record_memory FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TABLE public.ai_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  action_id uuid NOT NULL UNIQUE,
  send_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'held',
  status_reason text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_outbox_due_idx ON public.ai_outbox (status, send_at);
GRANT SELECT, UPDATE ON public.ai_outbox TO authenticated;
GRANT ALL ON public.ai_outbox TO service_role;
ALTER TABLE public.ai_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read AI outbox" ON public.ai_outbox FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff cancel AI outbox" ON public.ai_outbox FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS ai_autopilot boolean NOT NULL DEFAULT false;

INSERT INTO public.automation_job_state (job_name, status, pause_reason)
VALUES ('seller-autopilot', 'paused', 'Not switched on yet')
ON CONFLICT (job_name) DO NOTHING;