CREATE TABLE IF NOT EXISTS public.ai_review_queue (
  submission_id uuid PRIMARY KEY,
  requested_at timestamptz NOT NULL DEFAULT now(),
  trigger text
);
GRANT ALL ON public.ai_review_queue TO service_role;
ALTER TABLE public.ai_review_queue ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_agent_compare (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  seller_name text,
  old_result jsonb,
  new_result jsonb,
  old_input_chars integer,
  new_input_chars integer,
  same_actions boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_agent_compare TO authenticated;
GRANT ALL ON public.ai_agent_compare TO service_role;
ALTER TABLE public.ai_agent_compare ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read AI comparisons" ON public.ai_agent_compare FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS ai_history_summary text,
  ADD COLUMN IF NOT EXISTS ai_history_summary_through timestamptz;

INSERT INTO public.ai_agent_settings (key, value) VALUES ('lean_mode', 'false'::jsonb) ON CONFLICT (key) DO NOTHING;