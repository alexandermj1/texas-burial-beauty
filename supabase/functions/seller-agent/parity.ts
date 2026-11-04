// Which of the newer admin-parity actions apply to a seller record right now.
// Kept separate (and pure) so the rules can be tested without the edge runtime.
import { isUsableTree } from "./familyTree.ts";

type Rec = Record<string, any>;

/** Applied in the browser on the Documents panel, with the exact staff code. */
export const CLIENT_OP_TYPES = ["edit_family_tree", "sync_checklist", "send_document_request", "prepare_listing_agreement", "change_cemetery", "edit_document_request"];

/** Record/checklist changes that must be approved before a reply from the same review goes out. */
export const RECORD_CHANGE_TYPES = ["update_fields", "update_document_items", "fix_document_request", "edit_family_tree", "edit_document_request", "change_cemetery", "change_listing_option", "sync_checklist"];

export function parityAllowed(sub: Rec, contracts: Rec[]): Set<string> {
  const out = new Set<string>(["change_cemetery"]);
  const a = (sub.ownership_answers ?? {}) as Rec;
  const done = !!sub.documents_completed_at || !!sub.sold_at;
  const accepted = sub.quote_response === "accepted" || Number(sub.accepted_quote_amount) > 0 || !!sub.listing_paid_at;
  if (sub.quote_sent_at && !sub.sold_at) out.add("change_listing_option");
  if (accepted && !contracts.some((c) => c.kind === "listing_agreement" && c.status !== "void")) out.add("prepare_listing_agreement");
  if (!done && isUsableTree(a.v2)) { out.add("edit_family_tree"); out.add("sync_checklist"); }
  if (!done && a.sellerConfirmedAt && isUsableTree(a.v2) && sub.email) out.add("send_document_request");
  return out;
}

/** A send must wait for tree/request fixes proposed in the same review. */
export function pendingBefore(actions: { id: string; run_id?: string | null; status: string; action_type: string }[], act: { id: string; run_id?: string | null }) {
  return !!act.run_id && actions.some((x) => x.id !== act.id && x.run_id === act.run_id && x.status === "proposed" && RECORD_CHANGE_TYPES.includes(x.action_type));
}
