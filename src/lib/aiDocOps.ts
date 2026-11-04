/** Approved seller-AI steps that the Documents panel carries out with the staff code. */
export type AiDocOp = { kind: string; action_id: string } & Record<string, unknown>;

const keyFor = (submissionId: string) => `ai-doc-ops:${submissionId}`;

export function queueAiDocOp(submissionId: string, op: AiDocOp) {
  const list = readAiDocOps(submissionId).filter((o) => o.action_id !== op.action_id);
  sessionStorage.setItem(keyFor(submissionId), JSON.stringify([...list, op]));
  window.dispatchEvent(new CustomEvent("ai-doc-instruction", { detail: { submissionId } }));
}

export function readAiDocOps(submissionId: string): AiDocOp[] {
  try { return JSON.parse(sessionStorage.getItem(keyFor(submissionId)) || "[]") as AiDocOp[]; } catch { return []; }
}

/** Takes the oldest queued step off the queue. */
export function shiftAiDocOp(submissionId: string): AiDocOp | null {
  const list = readAiDocOps(submissionId);
  const first = list.shift() ?? null;
  sessionStorage.setItem(keyFor(submissionId), JSON.stringify(list));
  return first;
}
