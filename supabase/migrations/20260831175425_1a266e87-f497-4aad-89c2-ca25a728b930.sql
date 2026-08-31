DROP INDEX IF EXISTS public.submission_documents_unique_item;
CREATE UNIQUE INDEX IF NOT EXISTS submission_documents_unique_item
  ON public.submission_documents (submission_id, doc_code, coalesce(person_name, ''))
  WHERE doc_code IS NOT NULL AND deleted_at IS NULL;