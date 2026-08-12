WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id, title, coalesce(source_id::text,''), coalesce(source_type,'') ORDER BY created_at) rn
  FROM public.user_notifications
)
UPDATE public.user_notifications n
SET read_at = now()
FROM ranked r
WHERE n.id = r.id AND r.rn > 1 AND n.read_at IS NULL;