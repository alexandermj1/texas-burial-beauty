/** Use the existing staff follow-up switch; only staff may resume it. */
export function reminderPausePatch(reason: unknown, pausedAt: string | null, now: string) {
  if (typeof reason !== "string" || !reason.trim()) throw new Error("A reason is required to pause automatic follow-ups");
  if (!Number.isFinite(Date.parse(now))) throw new Error("Invalid pause timestamp");
  return {
    document_followup_paused_at: pausedAt || now,
    document_followup_pause_reason: reason.trim().slice(0, 500),
  };
}

export function reminderPauseVerified(saved: { document_followup_paused_at?: string | null; document_followup_pause_reason?: string | null } | null, patch: ReturnType<typeof reminderPausePatch>) {
  return !!saved?.document_followup_paused_at && Date.parse(saved.document_followup_paused_at) === Date.parse(patch.document_followup_paused_at)
    && saved.document_followup_pause_reason === patch.document_followup_pause_reason;
}