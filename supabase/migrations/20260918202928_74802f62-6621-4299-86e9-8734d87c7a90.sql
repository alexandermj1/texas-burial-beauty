CREATE TABLE public.automation_job_state (
  job_name text PRIMARY KEY,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  pause_reason text,
  lease_until timestamptz,
  locked_by uuid,
  consecutive_rate_limits integer NOT NULL DEFAULT 0,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.automation_job_state TO authenticated;
GRANT ALL ON public.automation_job_state TO service_role;

ALTER TABLE public.automation_job_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view automation status"
ON public.automation_job_state
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
);

INSERT INTO public.automation_job_state (job_name)
VALUES ('document-request-followup')
ON CONFLICT (job_name) DO NOTHING;

ALTER TABLE public.reminder_log
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent' CHECK (status IN ('processing', 'sent', 'failed', 'suppressed')),
  ADD COLUMN IF NOT EXISTS missing_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS attempted_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS reminder_log_idempotency_key_unique
ON public.reminder_log (idempotency_key)
WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS reminder_log_doc_followup_recent
ON public.reminder_log (submission_id, sent_at DESC)
WHERE reminder_type = 'document_request_auto_followup' AND deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.reminder_log TO authenticated;
GRANT ALL ON public.reminder_log TO service_role;

CREATE OR REPLACE FUNCTION public.claim_automation_job(
  _job_name text,
  _run_id uuid,
  _lease_seconds integer DEFAULT 600
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed boolean;
BEGIN
  INSERT INTO public.automation_job_state (job_name)
  VALUES (_job_name)
  ON CONFLICT (job_name) DO NOTHING;

  UPDATE public.automation_job_state
  SET lease_until = now() + make_interval(secs => greatest(60, least(_lease_seconds, 3600))),
      locked_by = _run_id,
      last_started_at = now(),
      updated_at = now()
  WHERE job_name = _job_name
    AND status = 'active'
    AND (lease_until IS NULL OR lease_until < now() OR locked_by = _run_id);

  GET DIAGNOSTICS claimed = ROW_COUNT;
  RETURN claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_automation_job(
  _job_name text,
  _run_id uuid,
  _completed boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.automation_job_state
  SET lease_until = NULL,
      locked_by = NULL,
      last_completed_at = CASE WHEN _completed THEN now() ELSE last_completed_at END,
      updated_at = now()
  WHERE job_name = _job_name
    AND locked_by = _run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_automation_job(text, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_automation_job(text, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_automation_job(text, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_automation_job(text, uuid, boolean) TO service_role;