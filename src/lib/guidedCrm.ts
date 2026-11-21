export type QueueOutcome = "worked" | "waiting" | "reviewed";
export interface QueueReceipt { recordId: string; outcome: QueueOutcome; noteId: string }

/** Count saved open tasks, never infer additional tasks from their prose. */
export function guidedTaskCount(tasks: { id: string; status: string; action_type: string }[], needsReply: boolean): number {
  return new Set(tasks.filter(t => t.status === "proposed" && t.action_type === "flag_human").map(t => t.id)).size + Number(needsReply);
}

/** Capture the CRM's authoritative order once; never reshuffle a live session. */
export function snapshotQueue(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function advanceQueue(ids: string[], receipts: QueueReceipt[], receipt: QueueReceipt): QueueReceipt[] {
  if (ids[receipts.length] !== receipt.recordId) throw new Error("Finish the current record before moving forward.");
  if (!receipt.noteId.trim()) throw new Error("Save the outcome before moving forward.");
  return [...receipts, receipt];
}

export function queueOutcomeBody(outcome: QueueOutcome, findings: string): string {
  if (!findings.trim()) throw new Error("Add your findings or what you are waiting for.");
  const labels = { worked: "Action taken", waiting: "Waiting / blocked", reviewed: "Reviewed — no action needed" };
  return `Guided work · ${labels[outcome]}\n${findings.trim()}`;
}