select cron.schedule(
  'family-tree-followup-hourly',
  '15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mceguxfdoikjthsrbmzx.supabase.co/functions/v1/family-tree-followup',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZWd1eGZkb2lranRoc3JibXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTI4MDYsImV4cCI6MjA5MjM2ODgwNn0.YDuw7oQqllDnunSA0Fv4eENslzol1Lni7n6kfSRa9T0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);