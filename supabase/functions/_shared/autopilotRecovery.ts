// Only billing/credit circuit-breaker pauses may recover automatically.
// Owner switches, per-record pauses, permission failures and rate-limit pauses stay untouched.
export function shouldAttemptCreditRecovery(job: { status?: string | null; pause_reason?: string | null }) {
  if (job.status !== "paused") return false;
  const reason = String(job.pause_reason ?? "");
  return /(?:^|\D)402(?:\D|$)/.test(reason)
    || /insufficient credits|out of credits|ran out of credits|not enough credits|no credits|payment required|credit balance|billing/i.test(reason);
}
