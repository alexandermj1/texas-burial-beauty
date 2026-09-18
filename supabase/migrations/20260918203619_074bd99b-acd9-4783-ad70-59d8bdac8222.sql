ALTER TABLE public.automation_job_state
  ADD COLUMN IF NOT EXISTS trigger_secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex');

DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'document-request-followup-daily';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'document-request-followup-daily',
  '30 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mceguxfdoikjthsrbmzx.supabase.co/functions/v1/document-request-followup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZWd1eGZkb2lranRoc3JibXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTI4MDYsImV4cCI6MjA5MjM2ODgwNn0.YDuw7oQqllDnunSA0Fv4eENslzol1Lni7n6kfSRa9T0',
      'x-automation-secret', (SELECT trigger_secret FROM public.automation_job_state WHERE job_name = 'document-request-followup')
    ),
    body := '{}'::jsonb
  );
  $$
);