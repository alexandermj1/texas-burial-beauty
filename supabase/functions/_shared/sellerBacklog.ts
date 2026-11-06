export type BacklogAction = { id: string; action_type: string; reason?: string | null; payload?: any; run_id?: string | null };
export function replacedAutomationBlocker(a: BacklogAction): boolean {
  if (a.action_type !== "flag_human" || a.payload?.source !== "autopilot") return false;
  return a.reason === "AI suggestions on this file have been waiting for approval for over a day — please approve or decline them so the seller isn't left waiting."
    || a.reason === "Approve the AI's change cemetery on this record (it needs the Family tree & documents panel), then approve the rest of its suggestions.";
}
export function legacySuggestionsNeedReview(actions: BacklogAction[], automaticRunIds: Set<string>, held: boolean) {
  return !held && actions.some(a => a.action_type !== "flag_human" && (!a.run_id || !automaticRunIds.has(a.run_id)));
}