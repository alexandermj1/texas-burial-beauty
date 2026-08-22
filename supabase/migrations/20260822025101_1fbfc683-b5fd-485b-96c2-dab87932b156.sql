-- 1. Hard delete block ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Deletion is disabled on %.% to protect customer data. Set deleted_at instead.', TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
  RETURN NULL;
END;
$$;

-- 2. Change history ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.record_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  op text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.record_history TO authenticated;
GRANT ALL ON public.record_history TO service_role;

ALTER TABLE public.record_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read record history" ON public.record_history;
CREATE POLICY "Admins can read record history"
  ON public.record_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS record_history_lookup_idx ON public.record_history (table_name, record_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
    INSERT INTO public.record_history (table_name, record_id, op, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, (to_jsonb(OLD)->>'id')::uuid, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

-- 3. Apply protection to every business table --------------------------------
DO $do$
DECLARE
  t text;
  protected text[] := ARRAY[
    'contact_submissions','contracts','payment_transactions','quote_estimates','quote_revisions',
    'customer_activity_log','submission_views','reminder_log','sales','ai_draft_edits',
    'marketing_sends','marketing_campaigns','marketing_contacts','ca_sold_history','ca_inventory',
    'agent_sales','agent_locations','customer_profiles','customer_files','customer_notes',
    'submission_documents','email_messages','buyer_recommendations','cemetery_files',
    'texas_cemeteries','team_tasks','poa_records','listings','plot_reservations','profiles'
  ];
  audited text[] := ARRAY[
    'contact_submissions','contracts','submission_documents','customer_profiles','customer_notes',
    'customer_files','poa_records','payment_transactions','quote_estimates','listings',
    'texas_cemeteries','team_tasks','buyer_recommendations','ca_inventory','profiles'
  ];
BEGIN
  FOREACH t IN ARRAY protected LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at timestamptz', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_by text', t);
    EXECUTE format('REVOKE DELETE ON public.%I FROM anon, authenticated', t);
    EXECUTE format('DROP TRIGGER IF EXISTS zzz_prevent_hard_delete ON public.%I', t);
    EXECUTE format('CREATE TRIGGER zzz_prevent_hard_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete()', t);
  END LOOP;

  FOREACH t IN ARRAY audited LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS zzz_audit_row_change ON public.%I', t);
    EXECUTE format('CREATE TRIGGER zzz_audit_row_change AFTER UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t);
  END LOOP;
END
$do$;

-- 4. Storage: no file deletions ---------------------------------------------
DROP POLICY IF EXISTS "Admins can delete contract files" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete customer files" ON storage.objects;
DROP POLICY IF EXISTS "Admins/agents delete cemetery-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing photos" ON storage.objects;
DROP POLICY IF EXISTS "portal_uploads_staff_all" ON storage.objects;

CREATE POLICY "portal_uploads_staff_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'portal-uploads' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'agent'::app_role)));
CREATE POLICY "portal_uploads_staff_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portal-uploads' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'agent'::app_role)));
CREATE POLICY "portal_uploads_staff_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'portal-uploads' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'agent'::app_role)))
  WITH CHECK (bucket_id = 'portal-uploads' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'agent'::app_role)));

-- 5. Nightly backups ---------------------------------------------------------
SELECT cron.unschedule('weekly-full-backup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-full-backup');
SELECT cron.unschedule('nightly-full-backup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-full-backup');

SELECT cron.schedule(
  'nightly-full-backup',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mceguxfdoikjthsrbmzx.supabase.co/functions/v1/full-backup',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZWd1eGZkb2lranRoc3JibXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTI4MDYsImV4cCI6MjA5MjM2ODgwNn0.YDuw7oQqllDnunSA0Fv4eENslzol1Lni7n6kfSRa9T0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);