export function feedbackAllowed(status: string, kind: string): boolean {
  return kind === "comment" || (kind === "outcome" && ["executed", "acknowledged"].includes(status));
}
export function aiActionEmail(html: string): boolean {
  return html.includes('data-tcb-email="ai_agent"');
}