
CREATE TABLE public.ai_draft_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  submission_id UUID,
  recipient_email TEXT,
  recipient_name TEXT,
  subject TEXT,
  template_id TEXT,
  original_instructions TEXT,
  revision_instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  original_draft TEXT NOT NULL,
  latest_ai_draft TEXT,
  final_sent_text TEXT,
  was_sent BOOLEAN NOT NULL DEFAULT false,
  edit_distance INTEGER,
  reviewed BOOLEAN NOT NULL DEFAULT false,
  training_notes TEXT
);

GRANT SELECT, INSERT, UPDATE ON public.ai_draft_edits TO authenticated;
GRANT ALL ON public.ai_draft_edits TO service_role;

ALTER TABLE public.ai_draft_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can insert their own draft edits"
  ON public.ai_draft_edits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_user_id);

CREATE POLICY "Admins and agents can read draft edits"
  ON public.ai_draft_edits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Admins can update draft edits"
  ON public.ai_draft_edits FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX ai_draft_edits_created_at_idx ON public.ai_draft_edits (created_at DESC);
CREATE INDEX ai_draft_edits_submission_id_idx ON public.ai_draft_edits (submission_id);
