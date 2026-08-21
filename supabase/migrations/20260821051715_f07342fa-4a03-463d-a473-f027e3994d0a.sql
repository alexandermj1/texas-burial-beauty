update public.contact_submissions
set ownership_answers = jsonb_set(coalesce(ownership_answers,'{}'::jsonb),'{sellerConfirmedAt}', to_jsonb(now()::text))
where id = '49820184-3601-49b4-be1d-81b654d6655e'
  and (ownership_answers->>'sellerConfirmedAt') is null;