// Buyer AI: prepares one approval-only reply for a buyer inquiry using real seller inventory.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
const HIDDEN = new Set(["e07b4a4c-56d1-4b2f-bc27-7989314d008f"]);
const BUYER_SOURCES = new Set(["buy_property_wizard", "buy_inquiry", "cemetery_page_buyer", "preneed_inquiry", "buyer"]);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("auto"), submission_id: z.string().uuid() }),
  z.object({ action: z.literal("run"), submission_id: z.string().uuid() }),
  z.object({ action: z.literal("approve"), draft_id: z.string().uuid(), subject: z.string().min(1).max(200), body: z.string().min(1).max(8000) }),
  z.object({ action: z.literal("reject"), draft_id: z.string().uuid(), reason: z.string().max(500).nullable() }),
]);
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const canon = (s: unknown) => String(s ?? "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/memorial\s+park|funeral\s+home|cemetery|mortuary|mausoleum|memorial|gardens?|[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const category = (s: unknown) => { const t = String(s ?? "").toLowerCase(); return /niche|urn|columbar|cremain|cremat/.test(t) ? "niche" : /crypt|mausoleum|entomb/.test(t) ? "crypt" : t.trim() ? "burial" : "any"; };
const isBuyer = (s: any) => s.customer_kind === "buyer" || (!["seller", "partner"].includes(s.customer_kind) && BUYER_SOURCES.has(s.source));
// Broad, competitor-safe garden name: no lot, block, row, grave or space identifiers.
const lawn = (s: any) => {
  const raw = String(s.section || s.lawn || "").replace(/\b(lot|block|row|grave|space|spaces|sp|plot|crypt|niche)\b.*$/i, "").replace(/[#\d][\w-]*/g, "").replace(/[,·;:/-]+\s*$/g, "").replace(/\s+/g, " ").trim();
  return raw.length >= 3 ? raw : "an established garden";
};

async function staff(db: any, req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data } = await db.auth.getUser(token);
  if (!data.user || HIDDEN.has(data.user.id)) return null;
  const { data: role } = await db.from("user_roles").select("role").eq("user_id", data.user.id).in("role", ["admin", "staff"]).limit(1).maybeSingle();
  return role ? { id: data.user.id, name: data.user.email ?? "Staff" } : null;
}

async function inventory(db: any, buyer: any) {
  const want = canon(buyer.cemetery), kind = category(`${buyer.property_type ?? ""} ${buyer.message ?? ""}`);
  if (!want) return { kind, items: [] as any[] };
  const { data } = await db.from("contact_submissions").select("id,cemetery,cemetery_city,property_type,section,lawn,plot_count,spaces,quote_amount,accepted_quote_amount,transfer_fee_amount,buyer_fees,cemetery_retail,la_signed_at,quote_response,documents_completed_at,reserved_until,customer_kind,source")
    .is("deleted_at", null).is("archived_at", null).is("closed_at", null).is("sold_at", null).neq("customer_kind", "buyer")
    .or("la_signed_at.not.is.null,quote_response.eq.accepted").limit(1000);
  const rows = (data ?? []).filter((s: any) => canon(s.cemetery) === want && (!s.reserved_until || new Date(s.reserved_until) < new Date()) && (kind === "any" || category(s.property_type) === kind || category(s.property_type) === "any"));
  if (!rows.length) return { kind, items: [] };
  const ids = rows.map((r: any) => r.id);
  const { data: docs } = await db.from("submission_documents").select("submission_id,status").in("submission_id", ids).is("deleted_at", null);
  const items = rows.map((s: any) => {
    const count = Math.max(1, Number(s.plot_count) || Number(s.spaces) || 1);
    const net = Number(s.accepted_quote_amount) || Number(s.quote_amount) || 0;
    const fee = Math.max(0, Number(s.transfer_fee_amount) || 0);
    const extra = Array.isArray(s.buyer_fees) ? s.buyer_fees.reduce((a: number, f: any) => a + Math.max(0, Number(f?.amount) || 0), 0) : 0;
    const ourTotal = net > 0 && s.transfer_fee_amount != null ? Math.round((net * count + fee) * 1.15 + extra) : null;
    const retail = Number(s.cemetery_retail) > 0 ? Number(s.cemetery_retail) * count : null;
    const own = (docs ?? []).filter((d: any) => d.submission_id === s.id);
    const received = own.filter((d: any) => ["received", "signed", "notarized", "completed"].includes(String(d.status))).length;
    const readiness = s.documents_completed_at || (own.length && received === own.length) ? "available now"
      : own.length && received / own.length >= 0.75 ? "available in about 2 weeks"
      : s.la_signed_at ? "available, with transfer paperwork in progress" : "available through an accepted seller quote";
    return { garden: lawn(s), spaces: count, type: category(s.property_type), readiness, retail_total: retail ? money(retail) : null, our_total: ourTotal ? money(ourTotal) : null };
  }).filter((x: any) => x.our_total && x.retail_total).slice(0, 6);
  return { kind, items };
}

async function model(apiKey: string, buyer: any, items: any[], kind: string) {
  const preneed = /pre|future|planning|not urgent|year/i.test(`${buyer.timeline ?? ""} ${buyer.message ?? ""}`);
  const instructions = `You draft one warm, concise email from Texas Cemetery Brokers to a cemetery-property buyer. A staff member reviews it before sending.
Rules: use only the supplied facts. Match ${kind === "any" ? "the requested property" : kind} type. Do not focus on or mention their budget/price range. For each option state garden, number of spaces, cemetery retail and our price exactly as supplied. Never give lot, block, row, grave, crypt, niche or space identifiers. Do not invent features, availability or fees.
${preneed ? "This looks like preneed planning: say spaces backed by an agreement can be available within a month if that meets their timeframe." : "Use each option's readiness wording exactly; never imply we do not have the space."}
If there are no options, say we currently have no matching space at that cemetery, we keep a waitlist, and ask whether they would like us to add them for that cemetery. Never say they are already added. End with a simple question and "Texas Cemetery Brokers". Return JSON only.`;
  const res = await fetch(GATEWAY, { method: "POST", headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" }, body: JSON.stringify({
    model: MODEL, instructions, stream: true, store: false, reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
    input: [{ role: "user", content: JSON.stringify({ buyer: { first_name: String(buyer.name ?? "").split(/\s+/)[0] || "there", cemetery: buyer.cemetery, type: buyer.property_type, spaces: buyer.spaces, timeline: buyer.timeline, message: buyer.message, details: buyer.details }, options: items }) }],
    text: { format: { type: "json_schema", name: "buyer_reply", strict: true, schema: { type: "object", additionalProperties: false, required: ["subject", "body", "reason"], properties: { subject: { type: "string" }, body: { type: "string" }, reason: { type: "string" } } } } },
  }) });
  if (!res.ok || !res.body) { const e = new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 300)}`) as Error & { status?: number }; e.status = res.status; throw e; }
  const reader = res.body.getReader(), dec = new TextDecoder(); let buf = "", out = "", failed = "";
  while (true) { const { value, done } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line.startsWith("data:")) continue; try { const e = JSON.parse(line.slice(5)); if (e.type === "response.output_text.delta") out += e.delta ?? ""; if (e.type === "response.failed" || e.type === "error") failed = JSON.stringify(e).slice(0, 300); } catch { /* partial */ } } }
  if (!out.trim()) throw new Error(failed || "AI returned no answer");
  return JSON.parse(out);
}

async function draft(db: any, apiKey: string, id: string, force: boolean) {
  const { data: buyer } = await db.from("contact_submissions").select("*").eq("id", id).maybeSingle();
  if (!buyer || !isBuyer(buyer)) return { status: "skipped", reason: "Not a buyer inquiry" };
  if (buyer.deleted_at || buyer.archived_at || buyer.closed_at || buyer.ai_paused_at || !buyer.email) return { status: "skipped", reason: "Inquiry is closed, paused or has no email" };
  const { data: old } = await db.from("buyer_ai_drafts").select("id,status").eq("submission_id", id).maybeSingle();
  if (old && !force) return { status: "skipped", reason: "Already drafted" };
  if (old?.status === "sent") return { status: "skipped", reason: "Reply already sent" };
  const row = { submission_id: id, status: "processing", error: null, updated_at: new Date().toISOString(), deleted_at: null };
  const { data: claimed, error } = old ? await db.from("buyer_ai_drafts").update(row).eq("id", old.id).neq("status", "processing").select("id").maybeSingle() : await db.from("buyer_ai_drafts").insert(row).select("id").maybeSingle();
  if (error || !claimed) return { status: "skipped", reason: "Draft already in progress" };
  try {
    const { kind, items } = await inventory(db, buyer);
    const r = await model(apiKey, buyer, items, kind);
    await db.from("buyer_ai_drafts").update({ status: "proposed", subject: r.subject, body: r.body, reason: r.reason, inventory_snapshot: items, updated_at: new Date().toISOString() }).eq("id", claimed.id);
    return { status: "proposed", draft_id: claimed.id, options: items.length };
  } catch (e) {
    await db.from("buyer_ai_drafts").update({ status: "failed", error: String((e as Error).message).slice(0, 500), updated_at: new Date().toISOString() }).eq("id", claimed.id);
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, apiKey = Deno.env.get("LOVABLE_API_KEY");
  const db = createClient(url, service);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
  const b = parsed.data;
  try {
    if (b.action === "auto") {
      if ((req.headers.get("authorization") ?? "") !== `Bearer ${service}`) return json({ error: "Forbidden" }, 403);
      if (!apiKey) return json({ error: "AI is not configured" }, 500);
      return json(await draft(db, apiKey, b.submission_id, false));
    }
    const user = await staff(db, req);
    if (!user) return json({ error: "Admin or staff only" }, 403);
    if (b.action === "run") { if (!apiKey) return json({ error: "AI is not configured" }, 500); return json(await draft(db, apiKey, b.submission_id, true)); }
    const { data: d } = await db.from("buyer_ai_drafts").select("*").eq("id", b.draft_id).is("deleted_at", null).maybeSingle();
    if (!d || d.status !== "proposed") return json({ error: "Draft is no longer awaiting approval" }, 409);
    const decided = { decided_by_name: user.name, decided_by_user_id: user.id, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (b.action === "reject") { await db.from("buyer_ai_drafts").update({ ...decided, status: "rejected", error: b.reason }).eq("id", d.id); return json({ ok: true }); }
    const { data: s } = await db.from("contact_submissions").select("id,email,customer_profile_id,name").eq("id", d.submission_id).maybeSingle();
    if (!s?.email) return json({ error: "Buyer email missing" }, 400);
    const html = `<div data-tcb-email="buyer_ai" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#2d2a26;">${b.body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>`;
    const res = await fetch(`${url}/functions/v1/gmail-action`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: req.headers.get("authorization")!, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" }, body: JSON.stringify({ action: "send", to: s.email, subject: b.subject, body: b.body, htmlBody: html, submissionId: s.id, actorName: `Buyer AI (approved by ${user.name})` }) });
    const text = await res.text();
    if (!res.ok || /"error"/.test(text)) return json({ error: `Email failed: ${text.slice(0, 300)}` }, 502);
    await db.from("buyer_ai_drafts").update({ ...decided, status: "sent", subject: b.subject, body: b.body }).eq("id", d.id);
    await db.from("customer_notes").insert({ submission_id: s.id, customer_profile_id: s.customer_profile_id, body: "Buyer AI reply approved and emailed.", author_name: `Buyer AI (approved by ${user.name})` });
    return json({ ok: true });
  } catch (e) {
    const status = (e as any).status;
    return json({ error: String((e as Error).message) }, [402, 403, 429].includes(status) ? status : 500);
  }
});