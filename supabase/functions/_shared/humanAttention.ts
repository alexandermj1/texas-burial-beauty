// Owner-controlled rollout lock. Do not release without explicit approval.
export const HUMAN_ATTENTION_RELEASED = false;
export const HUMAN_ATTENTION_SETTING = "human_attention_queue";
export const humanAttentionEnabled = (value: unknown, released: boolean = HUMAN_ATTENTION_RELEASED) => released && value === true;

export type HumanAttention = {
  priority: "urgent" | "high" | "normal" | "low";
  importance: number;
  category: "call" | "check" | "human_task" | "uncertain";
  task: string;
  reason: string;
  evidence: string;
};
const text = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
export function parseHumanAttention(value: unknown): HumanAttention | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!["urgent", "high", "normal", "low"].includes(String(v.priority)) ||
      !["call", "check", "human_task", "uncertain"].includes(String(v.category))) return null;
  if (typeof v.importance !== "number" || !Number.isFinite(v.importance) || v.importance < 0 || v.importance > 100) return null;
  const task = text(v.task, 1000), reason = text(v.reason, 1000), evidence = text(v.evidence, 1000);
  if (!task || !reason || !evidence) return null;
  return { priority: v.priority as HumanAttention["priority"], category: v.category as HumanAttention["category"], importance: Math.round(v.importance), task, reason, evidence };
}
export const humanAttentionNote = (a: HumanAttention) =>
  `Needs a person (${a.priority} priority): ${a.task}\n${a.reason}\nWhere to check: ${a.evidence}`;

export type AttentionAction = { id: string; submission_id: string; action_type: string; status: string; created_at: string; deleted_at?: string | null; payload?: { human_attention?: unknown } | null };
export type AttentionEntry = { actionId: string; createdAt: string; attention: HumanAttention };
const ranks = { urgent: 4, high: 3, normal: 2, low: 1 };
export function compareAttention(a: AttentionEntry, b: AttentionEntry): number {
  return ranks[b.attention.priority] - ranks[a.attention.priority] || b.attention.importance - a.attention.importance || a.createdAt.localeCompare(b.createdAt);
}
export function attentionIndex(actions: AttentionAction[]): Map<string, AttentionEntry> {
  const out = new Map<string, AttentionEntry>();
  for (const a of actions) {
    if (a.action_type !== "flag_human" || a.status !== "proposed" || a.deleted_at) continue;
    const attention = parseHumanAttention(a.payload?.human_attention);
    if (!attention) continue;
    const entry = { actionId: a.id, createdAt: a.created_at, attention };
    const previous = out.get(a.submission_id);
    if (!previous || compareAttention(entry, previous) < 0) out.set(a.submission_id, entry);
  }
  return out;
}
export function prioritizeHumanAttention<T extends { id: string; archived_at?: string | null; deleted_at?: string | null; sold_at?: string | null; closed_at?: string | null }>(
  rows: T[], index: Map<string, AttentionEntry>, enabled: boolean,
): T[] {
  if (!enabled) return rows;
  const eligible = (s: T) => !s.archived_at && !s.deleted_at && !s.sold_at && !s.closed_at ? index.get(s.id) : undefined;
  return [...rows].sort((a, b) => {
    const aa = eligible(a), bb = eligible(b);
    return aa && bb ? compareAttention(aa, bb) : aa ? -1 : bb ? 1 : 0;
  });
}

/** Rollout-only protocol; the saved playbook remains the business/tone authority. */
export function withHumanAttentionPolicy(instructions: string, enabled: boolean): string {
  if (!enabled) return instructions;
  const softened = instructions
    .replace(/nothing goes to staff except a phone call/gi, "handle all work you can safely perform; request a person only for a concrete blocker")
    .replace(/flag_human only (?:if|when)[^.\n]+\./gi, "Use flag_human for a concrete human-only blocker, not ordinary uncertainty you can resolve from the file.")
    .replace(/- flag_human: ONLY[^\n]+/, "- flag_human: request a necessary human check, call, human-only task or genuinely unresolved material uncertainty.");
  return `${softened}\n\nHUMAN ATTENTION QUEUE (owner-controlled):
Use discretion like an experienced admin. Read the available evidence and try the safe actions you can do first. Do not escalate merely because a case is complex, a deed owner died, or an action needs routine staff approval. Never guess a material fact or force your best answer when genuinely unsure. If a human must call, inspect something unavailable to you (including physical originals), perform a task you cannot perform, or settle uncertainty that remains after research, propose flag_human alongside any independent safe fixes/reply. A staff instruction does not remove a real blocker. Do not claim a colleague has called or completed a check.
Each flag_human action MUST include human_attention: {priority: "urgent"|"high"|"normal"|"low", importance: integer 0..100, category: "call"|"check"|"human_task"|"uncertain", task: string, reason: string, evidence: string}. Say exactly who to contact/what to check or decide, why you cannot settle it, and where in the file to look. Choose relative importance yourself from real deadlines, customer impact, risk and blocked progress; urgent means genuine immediate harm or an evidenced near deadline, not simply an old record. Use importance to order similar-priority cases, not a fixed score per stage. note must explain the task in plain colleague language. These are internal notes, never customer messages. Keep handling everything else you safely can. Only propose flag_human when this concrete task is still outstanding.`;
}