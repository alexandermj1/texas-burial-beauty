// Files a seller's saved attachments (emailed or uploaded) under the matching
// document-request item and person. Copies the file into the request, never deletes
// anything, never confirms a physical original — a copy of an original-required
// document stays "original still needed". Possibly-misfiled attachments are noted, not removed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { isInternalCall } from "../_shared/internal-auth.ts";
import { aiFetch } from "../_shared/aiRunLabel.ts";
import { requiresPhysicalOriginal } from "../_shared/originalDocumentReceipt.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "google/gemini-3.1-flash-lite";
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const safe = (n: string) => String(n).replace(/[^a-zA-Z0-9._-]/g, "_");
const base = (p: string) => String(p).split("/").pop() ?? "";

async function fileSubmission(db: any, subId: string, extractLimit: number) {
  const { data: sub } = await db.from("contact_submissions").select("id,name,cemetery,customer_profile_id,ownership_answers,deleted_at").eq("id", subId).maybeSingle();
  if (!sub || sub.deleted_at || !sub.customer_profile_id) return { submission_id: subId, skipped: "no linked customer files" };
  const { data: docs } = await db.from("submission_documents").select("id,doc_code,label,person_name,status,manual_override,required_state,needs_notary,notes,file_url,file_urls").eq("submission_id", subId).is("deleted_at", null);
  if (!docs?.length) return { submission_id: subId, skipped: "no document request" };
  let { data: files } = await db.from("customer_files").select("id,file_name,file_path,mime_type,document_type,created_at,extracted_summary,extracted_data,extraction_status").eq("customer_profile_id", sub.customer_profile_id).is("deleted_at", null).order("created_at");
  files = files ?? [];
  const filedNames = new Set<string>(docs.flatMap((d: any) => [...(d.file_urls ?? []), ...(d.file_url ? [d.file_url] : [])]).map(base));
  const isFiled = (f: any) => [...filedNames].some(n => n.includes(f.id) || n.endsWith(safe(f.file_name)) || n === base(f.file_path));
  let unfiled = files.filter((f: any) => !isFiled(f));
  if (!unfiled.length) return { submission_id: subId, attached: [], note: "all files already filed" };

  // Read unread files first so matching sees their contents, not just names.
  const unread = unfiled.filter((f: any) => !f.extraction_status).slice(0, extractLimit);
  for (let i = 0; i < unread.length; i += 4) {
    await Promise.all(unread.slice(i, i + 4).map((f: any) => fetch(`${URL_}/functions/v1/extract-attachment-info`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ file_id: f.id, skip_filing: true }),
    }).then(r => r.text()).catch(() => null)));
  }
  if (unread.length) {
    const { data: again } = await db.from("customer_files").select("id,file_name,file_path,mime_type,document_type,created_at,extracted_summary,extracted_data,extraction_status").in("id", unfiled.map((f: any) => f.id));
    unfiled = again ?? unfiled;
  }

  const items = docs.filter((d: any) => !["not_needed", "not_required", "waived"].includes(String(d.manual_override ?? d.required_state)) && d.doc_code !== "LA" && d.doc_code !== "REVIEW");
  if (!items.length) return { submission_id: subId, attached: [] };
  const prompt = `Seller: ${sub.name}. Cemetery: ${sub.cemetery}.
DOCUMENT REQUEST ITEMS:
${items.map((d: any) => `- item_id=${d.id} | ${d.label}${d.person_name ? ` | person: ${d.person_name}` : ""} | already filed: ${[...new Set([...(d.file_urls ?? []), ...(d.file_url ? [d.file_url] : [])].map(base))].join(", ") || "none"}`).join("\n")}

UNFILED FILES:
${unfiled.map((f: any) => { const x = f.extracted_data ?? {}; return `- file_id=${f.id} | name: ${f.file_name} | source: ${f.document_type ?? ""} | ${String(f.created_at).slice(0, 10)} | read as: ${x.document_type ?? "unread"} | people: ${[x.principal, x.decedent, x.purchaser, ...(x.owners ?? []), x.name, x.full_name].filter(Boolean).join(", ")} | summary: ${String(f.extracted_summary ?? "").slice(0, 300)}`; }).join("\n")}

Match each unfiled file to the ONE request item it actually is (same document type AND same person). Several files may go to one item (front/back of an ID, deed pages). Skip files that are not one of these items (purchase agreements, insurance, letters, our own blank forms unless signed/returned) or that you cannot tell. A death certificate goes only to the death-certificate item for that person; a photo ID only to that person's ID; a signed/notarised POA only to that signer's POA; a deed/certificate of ownership only to the deed item. Use confidence 0-1; only be ≥0.85 when the name/summary clearly shows both document type and person.
Also list already-filed attachments that look wrong for their item (wrong person or wrong document).
Return JSON: {"assignments":[{"file_id":"","item_id":"","confidence":0.0,"reason":""}],"misfiled":[{"item_id":"","file_name":"","reason":""}]}`;
  const res = await aiFetch("Filing seller documents", "https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")! },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: "You are a careful paralegal filing cemetery-transfer paperwork. Reply with JSON only." }, { role: "user", content: prompt }], response_format: { type: "json_object" } }),
  });
  if (!res.ok) throw new Error(`matching failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const out = JSON.parse((await res.json())?.choices?.[0]?.message?.content ?? "{}");
  const attached: string[] = []; const notes: string[] = [];
  const byItem = new Map<string, any[]>();
  for (const a of out.assignments ?? []) {
    const f = unfiled.find((x: any) => x.id === a.file_id); const d = items.find((x: any) => x.id === a.item_id);
    if (!f || !d || Number(a.confidence) < 0.85) continue;
    byItem.set(d.id, [...(byItem.get(d.id) ?? []), { f, reason: String(a.reason ?? "") }]);
  }
  const now = new Date().toISOString();
  for (const [itemId, hits] of byItem) {
    const d = items.find((x: any) => x.id === itemId);
    const paths = [...(d.file_urls ?? []), ...(d.file_url && !(d.file_urls ?? []).includes(d.file_url) ? [d.file_url] : [])];
    const names: string[] = [];
    for (const { f } of hits) {
      const { data: blob } = await db.storage.from("customer-files").download(f.file_path);
      if (!blob) continue;
      const path = `${subId}/filed-${f.id}-${safe(f.file_name)}`;
      const { error } = await db.storage.from("portal-uploads").upload(path, blob, { contentType: f.mime_type || "application/octet-stream", upsert: true });
      if (error) continue;
      paths.push(path); names.push(f.file_name);
    }
    if (!names.length) continue;
    const original = requiresPhysicalOriginal(d, sub.ownership_answers ?? {});
    const state = String(d.manual_override ?? d.required_state ?? d.status ?? "");
    const patch: Record<string, unknown> = { file_urls: paths, file_url: paths.at(-1),
      notes: [d.notes, `Filed automatically from customer files: ${names.join(", ")}${original ? " — copy only; the physical original is still needed until staff log it" : ""}.`].filter(Boolean).join(" · ") };
    if (!original && !["received", "notarized", "complete", "issued"].includes(state)) Object.assign(patch, { status: "received", required_state: "received", manual_override: "received", received_at: now });
    // Re-read just before writing so concurrent filing runs merge instead of overwriting.
    const { data: fresh } = await db.from("submission_documents").select("file_urls,file_url").eq("id", d.id).maybeSingle();
    const merged = [...new Set([...(fresh?.file_urls ?? []), ...(fresh?.file_url ? [fresh.file_url] : []), ...paths])];
    patch.file_urls = merged; patch.file_url = merged.at(-1);
    const { error } = await db.from("submission_documents").update(patch).eq("id", d.id);
    if (!error) attached.push(`${d.label}${d.person_name ? ` (${d.person_name})` : ""} ← ${names.join(", ")}`);
  }
  for (const m of out.misfiled ?? []) {
    const d = items.find((x: any) => x.id === m.item_id);
    if (d) notes.push(`${d.label}: “${m.file_name}” may be wrong — ${m.reason}`);
  }
  if (attached.length || notes.length) {
    await db.from("customer_notes").insert({ customer_profile_id: sub.customer_profile_id, submission_id: subId, author_name: "AI document filing", body: [attached.length ? `Filed into the document request: ${attached.join("; ")}.` : "", notes.length ? `Please check: ${notes.join("; ")}.` : ""].filter(Boolean).join("\n") }).then(() => null, () => null);
  }
  return { submission_id: subId, attached, check: notes };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const db = createClient(URL_, KEY);
    const internal = isInternalCall(req) || req.headers.get("authorization") === `Bearer ${KEY}`;
    if (!internal) {
      const auth = req.headers.get("authorization") ?? "";
      const { data } = await db.auth.getUser(auth.replace(/^Bearer /, ""));
      if (!data.user) return json({ error: "unauthorized" }, 401);
      const { data: role } = await db.from("user_roles").select("role").eq("user_id", data.user.id).in("role", ["admin", "staff"]).limit(1);
      if (!role?.length) return json({ error: "forbidden" }, 403);
    }
    const body = await req.json().catch(() => ({}));
    let ids: string[] = Array.isArray(body.submission_ids) ? body.submission_ids.map(String).slice(0, 10) : body.submission_id ? [String(body.submission_id)] : [];
    if (!ids.length && body.customer_profile_id) {
      const { data } = await db.from("contact_submissions").select("id").eq("customer_profile_id", body.customer_profile_id).is("deleted_at", null).not("documents_requested_at", "is", null).limit(5);
      ids = (data ?? []).map((r: any) => r.id);
    }
    if (!ids.length) return json({ results: [] });
    const results = [];
    for (const id of ids) { try { results.push(await fileSubmission(db, id, Number(body.extract_limit ?? 12))); } catch (e) { results.push({ submission_id: id, error: (e as Error).message }); } }
    return json({ results });
  } catch (e) { return json({ error: (e as Error).message }, 500); }
});
