CREATE OR REPLACE FUNCTION public.ai_supersede_stale_proposals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid; at timestamptz;
BEGIN
 IF TG_TABLE_NAME = 'email_messages' THEN
  IF coalesce(NEW.body_html,'') LIKE '%data-tcb-email="ai_agent"%' THEN RETURN NEW; END IF;
  sid := NEW.matched_submission_id; at := NEW.received_at;
 ELSE
  IF coalesce(NEW.author_name,'') ILIKE 'AI agent%' THEN RETURN NEW; END IF;
  sid := NEW.submission_id; at := NEW.created_at;
 END IF;
 IF sid IS NULL OR at IS NULL THEN RETURN NEW; END IF;
 UPDATE public.ai_agent_actions SET status = 'superseded' WHERE submission_id = sid AND status = 'proposed' AND action_type <> 'flag_human' AND created_at < at;
 RETURN NEW;
END $$;