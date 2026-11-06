import { pendingRecordChanges } from "../../supabase/functions/_shared/originalDocumentReceipt";
type Action = { id: string; run_id?: string | null; submission_id: string; status: string; action_type: string };
export function replyDependencies(actions: Action[], reply: Action): Action[] {
  if (reply.action_type !== "reply_email") return [];
  return actions.filter(a => a.submission_id === reply.submission_id && pendingRecordChanges([a], reply));
}
export function orderSellerActions<T extends Action>(actions: T[]): T[] {
  // Stable order: all required changes come before their corresponding reply.
  return [...actions].sort((a, b) => Number(replyDependencies(actions, a).length > 0) - Number(replyDependencies(actions, b).length > 0));
}