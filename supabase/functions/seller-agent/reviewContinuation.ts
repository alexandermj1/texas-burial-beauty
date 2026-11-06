export type ReviewPhase = "research_ready" | "research_running" | "decision_ready" | "deciding";
/** Only acknowledged, ready phases may advance; interrupted inference is never replayed. */
export function claimPhase(status: string): ReviewPhase | null {
  if (status === "research_ready") return "research_running";
  if (status === "decision_ready") return "deciding";
  return null;
}