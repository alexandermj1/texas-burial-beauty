// Compact per-part fingerprint of a seller record, built from plain database reads (no AI).
// Lets the autopilot see exactly WHAT changed since the AI last looked.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { hashOf, type Fingerprint } from "./autopilotPolicy.ts";
import { emailAddress, sellerMailOutgoing } from "./sellerWakeCandidates.ts";

const VOLATILE = new Set(["updated_at", "ownership_answers", "ai_paused_at", "ai_autopilot", "last_viewed_at", "viewed_at"]);

export async function recordFingerprint(db: SupabaseClient, sub: Record<string, any>): Promise<Fingerprint> {
  const id = sub.id;
  const address = emailAddress(sub.email);
  const mailFilter = /^[a-z0-9.+_-]+@[a-z0-9.-]+$/i.test(address)
    ? `matched_submission_id.eq.${id},from_email.ilike.%${address}%,to_email.ilike.%${address}%`
    : `matched_submission_id.eq.${id}`;
  const [emails, notes, files, pays, contracts, docs] = await Promise.all([
    db.from("email_messages").select("id,from_email,to_email,received_at,matched_submission_id").or(mailFilter).is("deleted_at", null).order("received_at", { ascending: false }).limit(200),
    db.from("customer_notes").select("id,author_name,created_at").eq("submission_id", id).is("deleted_at", null).limit(500),
    sub.customer_profile_id
      ? db.from("customer_files").select("id,file_path,document_type").eq("customer_profile_id", sub.customer_profile_id).is("deleted_at", null).limit(500)
      : Promise.resolve({ data: [] as any[] }),
    db.from("payment_transactions").select("id,status,paid_at,refunded_at,dispute_status").eq("submission_id", id).is("deleted_at", null).limit(200),
    db.from("contracts").select("id,status,sent_at,signed_at,countersigned_at,notarized_at,completed_at").eq("submission_id", id).is("deleted_at", null).limit(200),
    db.from("submission_documents").select("id,status,required_state,received_at,file_url,file_urls,label,person_name").eq("submission_id", id).is("deleted_at", null).limit(300),
  ]);
  const ours = (e: any) => sellerMailOutgoing(e.from_email);
  const em = ((emails.data ?? []) as any[]).filter(e => e.matched_submission_id === id || emailAddress(e.from_email) === address || String(e.to_email ?? "").split(/[,;]/).some(raw => emailAddress(raw) === address));
  const staffNotes = ((notes.data ?? []) as any[]).filter((n) => !/^AI agent/i.test(n.author_name ?? "")).map((n) => n.id).sort();
  const sorted = (rows: any[] | null | undefined) => [...(rows ?? [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const record = Object.fromEntries(Object.entries(sub).filter(([k]) => !VOLATILE.has(k)).sort(([a], [b]) => a.localeCompare(b)));
  return {
    seller_email: hashOf(em.filter((e) => !ours(e)).map((e) => e.id).sort()),
    our_email: hashOf(em.filter(ours).map((e) => e.id).sort()),
    staff_note: hashOf(staffNotes),
    files: hashOf(sorted(files.data as any[])),
    payments: hashOf(sorted(pays.data as any[])),
    contracts: hashOf(sorted(contracts.data as any[])),
    documents: hashOf(sorted(docs.data as any[])),
    family_tree: hashOf((sub.ownership_answers ?? {}).v2 ?? null),
    record: hashOf(record),
  };
}
