UPDATE public.submission_documents
SET manual_override = NULL,
    required_state = CASE WHEN doc_code = 'D21' THEN 'issued' ELSE 'needed' END,
    status = 'pending',
    file_url = NULL,
    file_urls = '{}'
WHERE submission_id = '463d6052-1e72-49fd-acb8-2e95df0e2a3c'
  AND doc_code IS DISTINCT FROM 'LA'
  AND coalesce(manual_override, required_state) <> 'not_needed';

UPDATE public.contact_submissions
SET ownership_answers = (ownership_answers - 'mailedConfirmed')
WHERE id = '463d6052-1e72-49fd-acb8-2e95df0e2a3c';