UPDATE public.submission_documents d
SET file_urls = old.file_urls, status = 'received', received_at = now()
FROM public.submission_documents old
WHERE d.id = '44a57d0d-a03f-4a6f-8ad5-7903b89a42c0' AND old.id = '5668c71f-9f0a-4975-88a4-98de50dfa493';

DELETE FROM public.submission_documents
WHERE id IN ('5668c71f-9f0a-4975-88a4-98de50dfa493','1c5ca119-f1ec-4ad6-887d-64d3a3afa47a');

UPDATE public.contact_submissions
SET documents_requested_at = NULL, documents_completed_at = NULL
WHERE id = 'e360e1a5-9287-472e-850c-0cd7781d4ca5';