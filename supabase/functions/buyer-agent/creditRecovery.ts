import { shouldAttemptCreditRecovery } from "../_shared/autopilotRecovery.ts";

export type CreditPause = { status?: string | null; pause_reason?: string | null };

/** Only an explicit pre-execution credit failure is safe to draft again. */
export function retryableBuyerCreditDraft(draft: { status?: string | null; error?: string | null }) {
  return draft.status === "failed" && shouldAttemptCreditRecovery({ status: "paused", pause_reason: draft.error });
}

export async function recoverBuyerCredits(
  state: CreditPause,
  probe: () => Promise<boolean>,
  resumeIfUnchanged: () => Promise<boolean>,
) {
  if (state.status !== "paused") return { ready: true, recovered: false };
  if (!shouldAttemptCreditRecovery(state)) return { ready: false, recovered: false };
  if (!await probe()) return { ready: false, recovered: false };
  const resumed = await resumeIfUnchanged();
  return { ready: resumed, recovered: resumed };
}