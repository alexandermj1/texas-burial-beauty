/** Live-activity grouping: one entry per seller per scan with plain outcomes (emailed, changed, asked staff). */
import { SELLER_EMAIL_ACTIONS } from "../_shared/sellerAutopilotState.ts";
export type Outcome = { label: string; tone: "email" | "change" | "staff" | "draft" | "held" | "problem" | "none" };
export type ActivityItem = { at: string; submission_id: string; seller: string; kind: string; text: string; outcomes: Outcome[]; run_ids: string[] };
const SCAN_GAP_MS = 30 * 60_000;
const CHANGE_LABEL: Record<string, string> = {
  add_note: "added a note", update_fields: "updated record details", set_stage: "moved the stage", send_document_request: "sent the document checklist",
  extend_quote_deadline: "extended the quote deadline", change_listing_option: "changed the listing option", change_cemetery: "corrected the cemetery",
  edit_family_tree: "edited the family tree", edit_document_request: "changed the document request", update_document_items: "updated document items",
  sync_checklist: "synced the checklist", send_quote: "sent a quote", resend_contract_link: "resent the agreement link", update_quote_spaces: "changed quote spaces",
};
export const changeLabel = (t: string) => CHANGE_LABEL[t] ?? t.replace(/_/g, " ");

export function groupActivity(input: {
  runs: { id: string; created_at: string; status: string; submission_id: string; stage_summary?: string | null }[];
  actions: { run_id: string; action_type: string; status: string; decided_by_name?: string | null; email_subject?: string | null }[];
  outbox: { submission_id: string; kind?: string | null; status: string; status_reason?: string | null; sent_at?: string | null; created_at: string; subject?: string | null; seller: string }[];
  flags: { created_at: string; submission_id: string; reason?: string | null; run_id?: string | null }[];
  nameOf: (id: string) => string;
}): ActivityItem[] {
  const items: ActivityItem[] = [];
  const runs = [...input.runs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const r of runs) {
    const last = items.filter(i => i.submission_id === r.submission_id).at(-1);
    const lastRunAt = last ? Date.parse(last.at) : 0;
    if (last && Date.parse(r.created_at) - lastRunAt < SCAN_GAP_MS) {
      last.at = r.created_at; last.run_ids.push(r.id);
      if (r.status === "running") last.kind = "running";
      else if (r.status === "done") { last.kind = "review"; if (r.stage_summary) last.text = r.stage_summary; }
      continue;
    }
    items.push({ at: r.created_at, submission_id: r.submission_id, seller: input.nameOf(r.submission_id), kind: r.status === "done" ? "review" : r.status === "running" ? "running" : "error", text: r.status === "running" ? "Reviewing the record now" : r.stage_summary ?? `Review ${r.status}`, outcomes: [], run_ids: [r.id] });
  }
  const byRun = new Map<string, ActivityItem>();
  for (const it of items) for (const id of it.run_ids) byRun.set(id, it);
  for (const a of input.actions) {
    const it = byRun.get(a.run_id); if (!it) continue;
    if (a.action_type === "flag_human") continue; // counted from flags below
    if (a.status === "executed" && a.action_type !== "reply_email") it.outcomes.push({ label: `Changed: ${changeLabel(a.action_type)}`, tone: "change" });
    else if (a.status === "proposed" && a.action_type !== "reply_email") it.outcomes.push({ label: `Suggested: ${changeLabel(a.action_type)} (waiting for staff)`, tone: "draft" });
  }
  const near = (sid: string, at: string) => items.filter(i => i.submission_id === sid).sort((a, b) => Math.abs(Date.parse(a.at) - Date.parse(at)) - Math.abs(Date.parse(b.at) - Date.parse(at)))[0];
  for (const f of input.flags) {
    const close = near(f.submission_id, f.created_at);
    const it = (f.run_id && byRun.get(f.run_id)) || (close && Math.abs(Date.parse(close.at) - Date.parse(f.created_at)) < SCAN_GAP_MS ? close : null);
    const label = `Asked staff: ${String(f.reason ?? "").slice(0, 140)}`;
    if (it) it.outcomes.push({ label, tone: "staff" });
    else items.push({ at: f.created_at, submission_id: f.submission_id, seller: input.nameOf(f.submission_id), kind: "flag", text: "Passed to staff", outcomes: [{ label, tone: "staff" }], run_ids: [] });
  }
  for (const e of input.outbox) {
    if (!["sent", "cancelled", "failed"].includes(e.status)) continue;
    if (e.kind && !SELLER_EMAIL_ACTIONS.has(e.kind)) continue; // record-only queue jobs are not emails
    const at = e.sent_at ?? e.created_at;
    const label = e.status === "sent" ? `Emailed the seller${e.subject ? `: “${e.subject}”` : ""}` : e.status === "failed" ? `Email stopped — ${e.status_reason ?? "failed"}` : `Draft reply not sent — ${e.status_reason ?? "cancelled"}`;
    const tone: Outcome["tone"] = e.status === "sent" ? "email" : e.status === "failed" ? "problem" : "held";
    const it = near(e.submission_id, at);
    if (it && Math.abs(Date.parse(it.at) - Date.parse(at)) < 3 * 3600_000) { it.outcomes.push({ label, tone }); if (e.status === "sent") it.at = at > it.at ? at : it.at; }
    else items.push({ at, submission_id: e.submission_id, seller: e.seller, kind: e.status === "sent" ? "sent" : e.status === "failed" ? "error" : "cancelled", text: "", outcomes: [{ label, tone }], run_ids: [] });
  }
  for (const it of items) {
    // dedupe identical outcome labels and add an explicit "nothing changed" line
    const seen = new Set<string>(); it.outcomes = it.outcomes.filter(o => !seen.has(o.label) && seen.add(o.label));
    if (it.kind !== "running" && it.run_ids.length && !it.outcomes.length) it.outcomes.push({ label: "No email sent · no changes made", tone: "none" });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
