UPDATE public.contact_submissions
SET ownership_answers = '{}'::jsonb, ownership_roster = '[]'::jsonb
WHERE ownership_answers IS NOT NULL AND ownership_answers::text <> '{}';