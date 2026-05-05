CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link_url text,
  source_type text,
  source_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.user_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.user_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can create notifications" ON public.user_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id, read_at, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;