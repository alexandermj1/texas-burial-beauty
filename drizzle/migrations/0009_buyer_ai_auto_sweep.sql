-- lovable-cron-fallback-reviewed: owner requires buyer replies ~20 min after each inquiry; no delay-until provider exists, so a 10-minute bounded, single-flight sweep is the fallback.
SELECT cron.unschedule('buyer-ai-sweep') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'buyer-ai-sweep');
SELECT cron.schedule('buyer-ai-sweep', '*/10 * * * *', $$
  SELECT net.http_post(
    url := 'https://mceguxfdoikjthsrbmzx.supabase.co/functions/v1/buyer-agent',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZWd1eGZkb2lranRoc3JibXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTI4MDYsImV4cCI6MjA5MjM2ODgwNn0.YDuw7oQqllDnunSA0Fv4eENslzol1Lni7n6kfSRa9T0"}'::jsonb,
    body := '{"action":"sweep"}'::jsonb
  );
$$);