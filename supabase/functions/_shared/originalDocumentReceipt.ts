type Document = { doc_code?: string | null; label?: string | null; person_name?: string | null; needs_notary?: boolean | null; manual_override?: string | null; required_state?: string | null; status?: string | null };
type Answers = { mailSkip?: string[]; mailOriginals?: Record<string, unknown> };

export function requiresPhysicalOriginal(doc: Document, answers: Answers = {}): boolean {
  const code = String(doc.doc_code ?? "");
  // The deed is never satisfied by a photograph or by "in the post".
  if (code === "D1") return true;
  if (doc.needs_notary) return true;
  const key = `${code}::${doc.person_name ?? ""}`;
  if (answers.mailOriginals?.[key]) return true;
  if (answers.mailSkip?.includes(key)) return false;
  return !["LA", "REVIEW", "NOTE", "D2", "D2P", "D15"].includes(code);
}

export function physicalOriginalLogged(doc: Document): boolean {
  return ["received", "notarized", "complete"].includes(doc.manual_override ?? "");
}

export function documentSatisfied(doc: Document, answers: Answers = {}): boolean {
  const state = doc.manual_override ?? doc.required_state ?? doc.status;
  if (["not_needed", "not_required", "waived"].includes(state ?? "")) return true;
  if (requiresPhysicalOriginal(doc, answers)) return physicalOriginalLogged(doc);
  return ["received", "notarized", "complete", "completed"].includes(state ?? "") || doc.status === "received";
}

export function pendingRecordChanges(actions: { id: string; run_id?: string | null; status: string; action_type: string }[], reply: { id: string; run_id?: string | null }): boolean {
  return !!reply.run_id && actions.some(a => a.id !== reply.id && a.run_id === reply.run_id && a.status === "proposed" && ["update_fields", "update_document_items", "fix_document_request"].includes(a.action_type));
}