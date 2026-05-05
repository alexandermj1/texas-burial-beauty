CREATE TABLE public.submission_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, user_id)
);

ALTER TABLE public.submission_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all submission views" ON public.submission_views
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert own submission views" ON public.submission_views
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());

CREATE POLICY "Admins update own submission views" ON public.submission_views
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());

CREATE INDEX idx_submission_views_submission ON public.submission_views(submission_id);