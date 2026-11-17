/** Explicit dependencies are saved with proposals; legacy sends remain conservative. */
export type WorkAction = { id: string; action_type: string; status: string; payload?: any };
export type ExecutionPlan = { independent: boolean; reason: string; depends_on_action_types: string[]; depends_on_staff_task_ids: string[] };
export function parseExecutionPlan(value: unknown): ExecutionPlan | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.independent !== "boolean" || typeof v.reason !== "string" || !v.reason.trim()) return null;
  const types = Array.isArray(v.depends_on_action_types) ? v.depends_on_action_types.filter((x): x is string => typeof x === "string" && /^[a-z_]+$/.test(x)).slice(0, 15) : [];
  const tasks = Array.isArray(v.depends_on_staff_task_ids) ? v.depends_on_staff_task_ids.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 15) : [];
  return { independent: v.independent && !tasks.length, reason: v.reason.trim().slice(0, 1000), depends_on_action_types: types, depends_on_staff_task_ids: tasks };
}
export function workBlocker(action: WorkAction, siblings: WorkAction[], staffTasks: WorkAction[]): string | null {
  const p = parseExecutionPlan(action.payload?.execution);
  if (p) {
    // A missing/rejected prerequisite is not evidence of completion.
    for (const t of p.depends_on_action_types) {
      const matches = siblings.filter(a => a.id !== action.id && a.action_type === t);
      if (!matches.length || matches.some(a => a.status !== "executed")) return `Waiting for ${t.replace(/_/g, " ")} to finish successfully.`;
    }
    if (p.depends_on_staff_task_ids.some(id => !staffTasks.some(t => t.id === id && t.status === "acknowledged"))) return "Waiting for the requested staff findings.";
    if (p.independent || p.depends_on_staff_task_ids.length) return null;
  }
  if (staffTasks.some(t => t.status === "proposed") && !p?.independent && !(["add_note", "update_fields", "update_document_items", "edit_family_tree", "edit_document_request", "sync_checklist", "prepare_listing_agreement", "repair_unsigned_agreement", "change_listing_option", "change_cemetery", "set_stage", "extend_quote_deadline"].includes(action.action_type))) return "Waiting for staff findings; independent work needs an explicit evidence-based plan.";
  return null;
}

export type RelatedRecord = { id: string; email?: string | null; customer_profile_id?: string | null; cemetery?: string | null; plot_description?: string | null };
export function relatedRecordEvidence(current: RelatedRecord, candidate: RelatedRecord): string | null {
  if (candidate.id === current.id) return null;
  if (current.customer_profile_id && candidate.customer_profile_id === current.customer_profile_id) return "shared customer profile; verify the property separately";
  if (current.email?.trim() && current.email.trim().toLowerCase() === candidate.email?.trim().toLowerCase()) return "same contact email only; not proof of duplicate property";
  return null;
}