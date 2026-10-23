CREATE TABLE public.ai_agent_feedback (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action_id uuid NOT NULL REFERENCES public.ai_agent_actions(id), submission_id uuid NOT NULL, kind text NOT NULL, comment text, correct boolean, went_live boolean, author_user_id uuid NOT NULL, author_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.ai_agent_feedback TO authenticated;
GRANT ALL ON public.ai_agent_feedback TO service_role;
ALTER TABLE public.ai_agent_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read AI feedback" ON public.ai_agent_feedback FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')) AND auth.uid() NOT IN ('e07b4a4c-56d1-4b2f-bc27-7989314d008f'::uuid, 'fcb3b678-3ac9-4207-83fe-86fb7952ae41'::uuid));
CREATE INDEX ai_agent_feedback_action_idx ON public.ai_agent_feedback(action_id, created_at);
CREATE OR REPLACE FUNCTION public.ai_supersede_stale_proposals() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
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
 UPDATE public.ai_agent_actions SET status = 'superseded' WHERE submission_id = sid AND status = 'proposed' AND created_at < at;
 RETURN NEW;
END $function$;