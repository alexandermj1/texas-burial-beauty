CREATE OR REPLACE FUNCTION public.ai_supersede_stale_proposals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid; at timestamptz;
BEGIN
  IF TG_TABLE_NAME = 'email_messages' THEN
    sid := NEW.matched_submission_id; at := NEW.received_at;
  ELSE
    IF coalesce(NEW.author_name,'') ILIKE 'AI agent%' THEN RETURN NEW; END IF;
    sid := NEW.submission_id; at := NEW.created_at;
  END IF;
  IF sid IS NULL OR at IS NULL THEN RETURN NEW; END IF;
  UPDATE public.ai_agent_actions SET status = 'superseded'
   WHERE submission_id = sid AND status = 'proposed' AND created_at < at;
  RETURN NEW;
END $$;

CREATE TRIGGER ai_supersede_on_email AFTER INSERT ON public.email_messages
  FOR EACH ROW EXECUTE FUNCTION public.ai_supersede_stale_proposals();
CREATE TRIGGER ai_supersede_on_note AFTER INSERT ON public.customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.ai_supersede_stale_proposals();

UPDATE public.ai_agent_actions a SET status = 'superseded'
 WHERE a.status = 'proposed' AND (
   EXISTS (SELECT 1 FROM public.email_messages e WHERE e.matched_submission_id = a.submission_id AND e.received_at > a.created_at AND e.deleted_at IS NULL)
   OR EXISTS (SELECT 1 FROM public.customer_notes n WHERE n.submission_id = a.submission_id AND n.created_at > a.created_at AND coalesce(n.author_name,'') NOT ILIKE 'AI agent%' AND n.deleted_at IS NULL));

INSERT INTO public.ai_agent_settings(key, value) VALUES ('cron_token', to_jsonb(encode(extensions.gen_random_bytes(24),'hex')))
ON CONFLICT (key) DO NOTHING;