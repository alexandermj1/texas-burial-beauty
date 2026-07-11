
CREATE TABLE public.cemetery_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cemetery_id UUID NOT NULL REFERENCES public.texas_cemeteries(id) ON DELETE CASCADE,
  label TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by_user_id UUID,
  uploaded_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cemetery_files TO authenticated;
GRANT ALL ON public.cemetery_files TO service_role;

ALTER TABLE public.cemetery_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and agents manage cemetery files"
  ON public.cemetery_files
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role));

CREATE INDEX idx_cemetery_files_cemetery_id ON public.cemetery_files(cemetery_id);

-- Storage policies for cemetery-files bucket
CREATE POLICY "Admins/agents read cemetery-files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'cemetery-files' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role)));

CREATE POLICY "Admins/agents upload cemetery-files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cemetery-files' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role)));

CREATE POLICY "Admins/agents update cemetery-files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'cemetery-files' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role)));

CREATE POLICY "Admins/agents delete cemetery-files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'cemetery-files' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role)));
