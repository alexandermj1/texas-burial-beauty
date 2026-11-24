CREATE TABLE public.glendale_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL DEFAULT 'Untitled document',
 pages jsonb NOT NULL DEFAULT '[]'::jsonb,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz,
 deleted_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.glendale_documents TO authenticated;
GRANT ALL ON public.glendale_documents TO service_role;
ALTER TABLE public.glendale_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY glendale_read ON public.glendale_documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY glendale_insert ON public.glendale_documents FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) AND length(name) BETWEEN 1 AND 200 AND jsonb_typeof(pages) = 'array' AND jsonb_array_length(pages) BETWEEN 1 AND 50);
CREATE POLICY glendale_update ON public.glendale_documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE TRIGGER glendale_no_delete BEFORE DELETE ON public.glendale_documents FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
CREATE TRIGGER glendale_audit AFTER UPDATE ON public.glendale_documents FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE INDEX glendale_documents_created ON public.glendale_documents (created_at DESC) WHERE deleted_at IS NULL;
CREATE POLICY glendale_storage_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'glendale-documents' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')));
CREATE POLICY glendale_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'glendale-documents' AND (storage.foldername(name))[1] = auth.uid()::text AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')));