DELETE FROM public.submission_documents
WHERE submission_id = '463d6052-1e72-49fd-acb8-2e95df0e2a3c'
  AND doc_code = 'D21'
  AND person_name = 'Jamie Alford'
  AND coalesce(array_length(file_urls, 1), 0) = 0;

UPDATE public.contact_submissions
SET ownership_answers = jsonb_set(
      coalesce(ownership_answers, '{}'::jsonb),
      '{linkedFiles}',
      coalesce(ownership_answers->'linkedFiles', '{}'::jsonb) || jsonb_build_object(
        'D1::', jsonb_build_array(
          'af06e336-ee1c-4f7e-8002-d58c60e854ad/email_19f6bc000b786444_1_185.jpg',
          'af06e336-ee1c-4f7e-8002-d58c60e854ad/email_19f6bc000b786444_2_186.jpg'
        )
      ),
      true
    )
WHERE id = 'e360e1a5-9287-472e-850c-0cd7781d4ca5';