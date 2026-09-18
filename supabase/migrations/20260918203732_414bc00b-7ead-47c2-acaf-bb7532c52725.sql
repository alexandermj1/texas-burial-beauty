REVOKE SELECT ON public.automation_job_state FROM authenticated;
GRANT SELECT (job_name, status, pause_reason, lease_until, locked_by, consecutive_rate_limits, last_started_at, last_completed_at, updated_at)
ON public.automation_job_state TO authenticated;