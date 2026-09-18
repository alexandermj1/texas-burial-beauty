INSERT INTO public.automation_job_state (job_name, status)
VALUES ('quote-expiry-reminder', 'active')
ON CONFLICT (job_name) DO NOTHING;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'quote-expiry-reminder-daily';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'quote-expiry-reminder-daily',
  '45 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mceguxfdoikjthsrbmzx.supabase.co/functions/v1/quote-expiry-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZWd1eGZkb2lranRoc3JibXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTI4MDYsImV4cCI6MjA5MjM2ODgwNn0.YDuw7oQqllDnunSA0Fv4eENslzol1Lni7n6kfSRa9T0',
      'x-automation-secret', (SELECT trigger_secret FROM public.automation_job_state WHERE job_name = 'quote-expiry-reminder')
    ),
    body := '{}'::jsonb
  );
  $$
);