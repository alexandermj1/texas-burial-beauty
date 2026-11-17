import { pendingRecordChanges } from "../../supabase/functions/_shared/originalDocumentReceipt";
import { parseExecutionPlan } from "../../supabase/functions/_shared/sellerWorkPlan";
type Action = { id: string; run_id?: string | null; submission_id: string; status: string; action_type: string; error?: string | null; payload?: any };
export function replyDependencies<T extends Action>(actions: T[], reply: Action): T[] {
  const p = parseExecutionPlan(reply.payload?.execution);
  if (p) return actions.filter(a => a.id !== reply.id && a.submission_id === reply.submission_id && ((a.run_id === reply.run_id && p.depends_on_action_types.includes(a.action_type) && a.status !== "executed") || (p.depends_on_staff_task_ids.includes(a.id) && a.status === "proposed")));
  if (reply.action_type !== "reply_email") return [];
  return actions.filter(a => a.submission_id === reply.submission_id && pendingRecordChanges([a], reply));
}
export function orderSellerActions<T extends Action>(actions: T[]): T[] {
  // Stable order: all required changes come before their corresponding reply.
  return [...actions].sort((a, b) => Number(replyDependencies(actions, a).length > 0) - Number(replyDependencies(actions, b).length > 0));
}