ALTER TABLE public.ai_agent_actions
  ADD COLUMN IF NOT EXISTS decided_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS was_edited boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.ai_refresh_on_record_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE tok text;
BEGIN
  IF (NEW.cemetery, NEW.plot_description, NEW.section, NEW.lawn, NEW.space_numbers, NEW.plot_count, NEW.quote_amount, NEW.quote_sent_at, NEW.quote_response, NEW.accepted_quote_amount, NEW.la_signed_at, NEW.documents_requested_at, NEW.documents_completed_at, NEW.ownership_answers, NEW.deed_owner_names, NEW.archived_at, NEW.closed_at)
     IS NOT DISTINCT FROM
     (OLD.cemetery, OLD.plot_description, OLD.section, OLD.lawn, OLD.space_numbers, OLD.plot_count, OLD.quote_amount, OLD.quote_sent_at, OLD.quote_response, OLD.accepted_quote_amount, OLD.la_signed_at, OLD.documents_requested_at, OLD.documents_completed_at, OLD.ownership_answers, OLD.deed_owner_names, OLD.archived_at, OLD.closed_at) THEN
    RETURN NEW;
  END IF;
  UPDATE public.ai_agent_actions SET status = 'superseded', decision_reason = coalesce(decision_reason, 'Record changed after this suggestion')
   WHERE submission_id = NEW.id AND status = 'proposed' AND created_at < now() - interval '5 seconds';
  IF NEW.archived_at IS NULL AND NEW.closed_at IS NULL AND NEW.deleted_at IS NULL THEN
    SELECT value #>> '{}' INTO tok FROM public.ai_agent_settings WHERE key = 'cron_token';
    PERFORM net.http_post(
      url := 'https://mceguxfdoikjthsrbmzx.supabase.co/functions/v1/seller-agent',
      headers := jsonb_build_object('Content-Type','application/json','x-agent-cron', tok,
        'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZWd1eGZkb2lranRoc3JibXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTI4MDYsImV4cCI6MjA5MjM2ODgwNn0.YDuw7oQqllDnunSA0Fv4eENslzol1Lni7n6kfSRa9T0'),
      body := jsonb_build_object('action','run','submission_id',NEW.id,'trigger','record_change'),
      timeout_milliseconds := 180000);
  END IF;
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ai_refresh_on_record_change ON public.contact_submissions;
CREATE TRIGGER ai_refresh_on_record_change AFTER UPDATE ON public.contact_submissions
FOR EACH ROW EXECUTE FUNCTION public.ai_refresh_on_record_change();