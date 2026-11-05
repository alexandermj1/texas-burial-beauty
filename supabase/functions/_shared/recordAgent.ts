import { aiFetch } from "./aiRunLabel.ts";
// Shared, READ-ONLY record toolkit + bounded tool-calling loop for AI agents.
// Built so any agent (buyer-watch today; a future buyer/seller communications agent) can read
// records the way staff do: the record, its email thread, staff notes, files, the deed, cemetery
// lawn prices and live stock. Tools never write; callers decide what to do with the answer.
import { resolveBuyerCemetery } from "./cemeteryMatching.ts";
import { quoteFigures, normalizeBuyerFees } from "./quoteFigures.ts";

export const AGENT_MODEL = "google/gemini-3.8-flash";
const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+\n/g, "\n").slice(0, n);
const roundDown = (n: number) => { const step = n >= 1000 ? 100 : 50; return Math.floor(n / step) * step; };

export const RECORD_TOOLS = [
  { name: "get_record", description: "Read a buyer or seller record: who they are, cemetery, lawn/section, spaces, stage, quote, reservation, sold state. For sellers also our buyer-facing price (rounded like buyer quotes).", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "get_emails", description: "Read the email thread with a record, newest first (both directions).", parameters: { type: "object", properties: { id: { type: "string" }, limit: { type: "number" } }, required: ["id"] } },
  { name: "get_notes", description: "Read staff notes on a record, newest first.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "get_files", description: "List a record's files with any summary already read from them (deeds, certificates).", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "read_deed", description: "Look at the seller's deed image with vision and list every space it conveys exactly as written. Costs more — use only when the space/lawn/count matters to the decision.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "get_cemetery", description: "Our file on a cemetery: city, transfer fee, lawns/sections with retail price per space and type.", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
] as const;

/** Extra read-only tools that give an agent the same view of a seller file an admin has. */
export const ADMIN_READ_TOOLS = [
  { name: "get_all_emails", description: "Every email on the record (both directions), oldest first, full text. Use offset/limit to page (max 25 per call). Each item has an id you can cite.", parameters: { type: "object", properties: { id: { type: "string" }, offset: { type: "number" }, limit: { type: "number" } }, required: ["id"] } },
  { name: "get_payments", description: "Every payment on the record: what for, amount, status, who paid, when paid, refunds, test vs live.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "get_quote_history", description: "Quote history: AI estimates, approved revisions and every past change to quote/price/space fields with who changed them.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "get_activity", description: "The record's activity log (who did what, when), newest first.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "get_family_tree", description: "The seller's family-tree questionnaire exactly as answered (every person, relationship, alive/deceased, spouses, heirs, wills, notes), the deed-owner roster it started from, when it was sent/confirmed, staff-added/removed document requests, and the saved 'Why these documents are needed' explanation.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "get_documents", description: "The live document request checklist: each item, person, state, notary need, received date, notes and attached file names.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "get_contracts", description: "Every contract on the record (listing agreement, POAs, affidavits): status, sent/viewed/signed/countersigned dates, link expiry; plus buyer purchase agreements for this plot.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "read_file", description: "Open ONE file (image or PDF) from get_files (file_id) or a checklist upload path from get_documents (path) and read it with vision. Ask a specific question.", parameters: { type: "object", properties: { id: { type: "string" }, file_id: { type: "string" }, path: { type: "string" }, question: { type: "string" } }, required: ["id", "question"] } },
  { name: "cemetery_stock", description: "Other plots we hold or are working on at a cemetery: other seller records (stage, lawn, spaces, quote) and website listings. Never share another seller's identity with a customer.", parameters: { type: "object", properties: { cemetery: { type: "string" }, exclude_id: { type: "string" } }, required: ["cemetery"] } },
  { name: "nearby_cemeteries", description: "Cemeteries in our file within N miles (default 25) of a cemetery, nearest first, with how many active seller records each has.", parameters: { type: "object", properties: { cemetery: { type: "string" }, miles: { type: "number" } }, required: ["cemetery"] } },
] as const;

export type ToolCtx = { db: any; apiKey: string; dir: any[]; deedReads: number; fileReads?: number };
const US = /texascemeterybrokers|bayercemeterybrokers/i;
const b64 = (bytes: Uint8Array) => { let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); };
const miles = (a: any, b: any) => { const r = (x: number) => x * Math.PI / 180; const dLat = r(b.latitude - a.latitude), dLng = r(b.longitude - a.longitude); const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dLng / 2) ** 2; return 3958.8 * 2 * Math.asin(Math.sqrt(h)); };
async function emailOr(db: any, id: string) {
  const { data } = await db.from("contact_submissions").select("email").eq("id", id).maybeSingle();
  const e = String(data?.email ?? "").toLowerCase().replace(/[,()]/g, "");
  return `matched_submission_id.eq.${id}${e ? `,from_email.ilike.%${e}%,to_email.ilike.%${e}%` : ""}`;
}

async function record(db: any, id: string) {
  const { data } = await db.from("contact_submissions").select("id,name,customer_kind,source,cemetery,cemetery_city,property_type,section,lawn,space_numbers,plot_description,plot_count,spaces,budget,timeline,message,quote_amount,accepted_quote_amount,transfer_fee_amount,buyer_fees,quote_response,la_signed_at,reserved_until,sold_at,closed_at,archived_at,customer_profile_id,created_at").eq("id", id).is("deleted_at", null).maybeSingle();
  return data;
}

export async function runTool(ctx: ToolCtx, name: string, args: any): Promise<unknown> {
  const { db } = ctx;
  const id = String(args?.id ?? "");
  if (name === "get_record") {
    const r = await record(db, id); if (!r) return { error: "not found" };
    const count = Math.max(1, Number(r.plot_count) || Number(r.spaces) || 1);
    const c = resolveBuyerCemetery(r.cemetery, ctx.dir, r.cemetery_city);
    const fee = c?.transfer_fee ?? r.transfer_fee_amount;
    const f = quoteFigures({ quoteAmount: r.quote_amount, acceptedAmount: r.accepted_quote_amount, transferFee: fee, buyerFees: normalizeBuyerFees(r.buyer_fees), plotCount: count });
    const one = quoteFigures({ quoteAmount: r.quote_amount, acceptedAmount: r.accepted_quote_amount, transferFee: fee, buyerFees: normalizeBuyerFees(r.buyer_fees), plotCount: 1 });
    const { customer_profile_id: _p, buyer_fees: _b, ...rest } = r;
    return { ...rest, message: clip(r.message, 800), cemetery_on_file: c?.name ?? null, spaces_for_sale: count,
      buyer_price_all: f.hasQuote && fee != null ? roundDown(f.buyerPriceTotal) : null,
      buyer_price_one: count > 1 && one.hasQuote && fee != null ? roundDown(one.buyerPriceTotal) : null,
      available: !r.sold_at && !r.closed_at && !r.archived_at && (!r.reserved_until || new Date(r.reserved_until) < new Date()) };
  }
  if (name === "get_emails") {
    const { data } = await db.from("email_messages").select("from_email,subject,body_text,snippet,received_at").eq("matched_submission_id", id).is("deleted_at", null).order("received_at", { ascending: false }).limit(Math.min(12, Number(args?.limit) || 8));
    return (data ?? []).map((m: any, i: number) => ({ from: /texascemeterybrokers|bayercemeterybrokers/i.test(m.from_email) ? "US" : "THEM", at: m.received_at, subject: m.subject, text: clip(m.body_text || m.snippet, i < 3 ? 2500 : 600) }));
  }
  if (name === "get_notes") {
    const { data } = await db.from("customer_notes").select("body,author_name,created_at").eq("submission_id", id).is("deleted_at", null).order("created_at", { ascending: false }).limit(10);
    return (data ?? []).map((n: any) => ({ by: n.author_name, at: n.created_at, text: clip(n.body, 600) }));
  }
  if (name === "get_files" || name === "read_deed") {
    const r = await record(db, id);
    if (!r?.customer_profile_id) return { files: [], note: "No files on this record." };
    const { data } = await db.from("customer_files").select("id,file_name,file_path,mime_type,document_type,extracted_summary,extracted_data").eq("customer_profile_id", r.customer_profile_id).is("deleted_at", null).order("created_at", { ascending: false }).limit(20);
    const files = data ?? [];
    if (name === "get_files") return files.map((f: any) => ({ name: f.file_name, type: f.document_type, summary: clip(f.extracted_summary, 500), insights: f.extracted_data ? clip(JSON.stringify(f.extracted_data), 1500) : null }));
    if (ctx.deedReads >= 2) return { error: "Deed reading budget used for this check — rely on file summaries." };
    const isImg = (f: any) => /^image\/(jpe?g|png|webp)$/i.test(f.mime_type ?? "") || /\.(jpe?g|png|webp)$/i.test(f.file_name ?? "");
    const score = (f: any) => /(deed|certificate|sepulture|ownership|interment right|title)/i.test(`${f.document_type} ${f.extracted_summary} ${f.file_name}`) ? 1 : 0;
    const deed = files.filter(isImg).sort((a: any, b: any) => score(b) - score(a))[0];
    if (!deed) return { error: "No deed image on file.", files: files.map((f: any) => f.file_name) };
    ctx.deedReads++;
    const dl = await db.storage.from("customer-files").download(deed.file_path); if (dl.error) return { error: "Could not open the deed file." };
    const bytes = new Uint8Array(await dl.data.arrayBuffer());
    let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const mime = /png$/i.test(deed.file_name) ? "image/png" : /webp$/i.test(deed.file_name) ? "image/webp" : "image/jpeg";
    const out = await chat(ctx.apiKey, [{ role: "user", content: [
      { type: "text", text: `Read this cemetery deed exactly. Return JSON only: {"cemetery":string,"section_or_lawn":string,"spaces":[{"label":"as written","lot":string,"space":string}],"interments_per_space":string|null,"notes":string}. List every grave/space/crypt/niche separately. Never invent; say what is unreadable in notes. Do not include owner names or addresses.` },
      { type: "image_url", image_url: { url: `data:${mime};base64,${btoa(bin)}` } }] }], { json: true, label: "AI reading the deed" });
    try { return { file: deed.file_name, ...JSON.parse(String(out.content ?? "{}").replace(/^```json|```$/g, "").trim()) }; } catch { return { error: "Deed could not be read clearly." }; }
  }
  if (name === "get_cemetery") {
    const c = resolveBuyerCemetery(String(args?.name ?? ""), ctx.dir, null);
    if (!c) return { error: "No confident match in our cemetery file." };
    const { data } = await db.from("texas_cemeteries").select("name,city,county,address,transfer_fee,endowment_notes,contact_name,contact_phone,contact_email,website,process_info,typical_prices,sections,notes").eq("name", c.name).is("deleted_at", null).limit(1).maybeSingle();
    return data ? { ...data, notes: clip(data.notes, 600), process_info: clip(data.process_info, 600), typical_prices: clip(typeof data.typical_prices === "string" ? data.typical_prices : JSON.stringify(data.typical_prices ?? ""), 400), sections: (Array.isArray(data.sections) ? data.sections : []).slice(0, 40).map((s: any) => ({ lawn: s.name, retail_per_space: s.price ?? null, type: s.property_type ?? null, notes: clip(s.notes, 120) })) } : { error: "not found" };
  }
  if (name === "get_all_emails") {
    const off = Math.max(0, Number(args?.offset) || 0), lim = Math.min(25, Math.max(1, Number(args?.limit) || 15));
    const { data, count } = await db.from("email_messages").select("id,from_email,to_email,subject,body_text,snippet,received_at,gmail_thread_id", { count: "exact" }).or(await emailOr(db, id)).is("deleted_at", null).order("received_at", { ascending: true }).range(off, off + lim - 1);
    return { total: count ?? 0, offset: off, emails: (data ?? []).map((m: any) => ({ id: m.id, from: US.test(m.from_email) ? "US" : "THEM", to: m.to_email, at: m.received_at, subject: m.subject, text: clip(String(m.body_text || m.snippet || "").replace(/\nOn .{5,160}wrote:[\s\S]*$/, ""), 5000) })) };
  }
  if (name === "get_family_tree") {
    const { data: r } = await db.from("contact_submissions").select("deed_owner_names,ownership_roster,ownership_answers,documents_requested_at,documents_completed_at").eq("id", id).maybeSingle();
    if (!r) return { error: "Record not found." };
    const { autopilot: _a, requestExplanation, ...answers } = (r.ownership_answers ?? {}) as Record<string, any>;
    return { deed_owner_names: r.deed_owner_names, roster_from_deed: r.ownership_roster ?? [], sent_at: answers.questionsSentAt ?? null, seller_confirmed_at: answers.sellerConfirmedAt ?? null,
      answers: clip(JSON.stringify(answers), 14000), why_these_documents: requestExplanation?.text ?? null, explanation_written_at: requestExplanation?.at ?? null,
      documents_requested_at: r.documents_requested_at, documents_completed_at: r.documents_completed_at };
  }
  if (name === "get_payments") {
    const { data } = await db.from("payment_transactions").select("kind,description,amount_cents,status,environment,recipient_email,recipient_name,paid_at,created_at,refunded_at,refund_amount_cents,dispute_status,created_by_name,metadata").eq("submission_id", id).is("deleted_at", null).order("created_at", { ascending: true });
    return (data ?? []).map((p: any) => ({ for: p.kind, description: p.description, amount: p.amount_cents / 100, status: p.status, test_payment: p.environment !== "live", payer: p.metadata?.customer_email ?? p.recipient_email, payer_name: p.recipient_name, link_created: p.created_at, link_created_by: p.created_by_name, paid_at: p.paid_at, refunded_at: p.refunded_at, refund: p.refund_amount_cents ? p.refund_amount_cents / 100 : null, dispute: p.dispute_status, tier: p.metadata?.listing_tier ?? p.metadata?.listingTier ?? null }));
  }
  if (name === "get_quote_history") {
    const [est, rev, hist] = await Promise.all([
      db.from("quote_estimates").select("cemetery,lawn,property_type,spaces,estimated_low,estimated_mid,estimated_high,confidence_label,closest_comp,ai_explanation,outcome,outcome_amount,generated_by_name,created_at").eq("submission_id", id).is("deleted_at", null).order("created_at"),
      db.from("quote_revisions").select("prior_amount,new_amount,reason,approved_by,approved_at,created_by_name,created_at").eq("submission_id", id).is("deleted_at", null).order("created_at"),
      db.from("record_history").select("old_data,new_data,changed_by,changed_at").eq("table_name", "contact_submissions").eq("record_id", id).eq("op", "UPDATE").order("changed_at", { ascending: false }).limit(200),
    ]);
    const keys = ["quote_amount", "accepted_quote_amount", "plot_count", "spaces", "space_numbers", "cemetery_retail", "transfer_fee_amount", "quote_sent_at", "quote_response", "quote_expires_at", "listing_tier", "listing_paid_at"];
    const changes = (hist.data ?? []).map((h: any) => ({ at: h.changed_at, by: h.changed_by, changed: Object.fromEntries(keys.filter((k) => JSON.stringify(h.old_data?.[k]) !== JSON.stringify(h.new_data?.[k])).map((k) => [k, { from: h.old_data?.[k] ?? null, to: h.new_data?.[k] ?? null }])) })).filter((c: any) => Object.keys(c.changed).length).slice(0, 40);
    return { estimates: (est.data ?? []).map((e: any) => ({ ...e, ai_explanation: clip(e.ai_explanation, 300) })), revisions: rev.data ?? [], field_changes_newest_first: changes };
  }
  if (name === "get_activity") {
    const { data } = await db.from("customer_activity_log").select("actor_name,action_type,action_summary,created_at").eq("submission_id", id).is("deleted_at", null).order("created_at", { ascending: false }).limit(60);
    return data ?? [];
  }
  if (name === "get_documents") {
    const { data } = await db.from("submission_documents").select("id,doc_code,label,person_name,status,required_state,manual_override,needs_notary,received_at,notes,why,file_url,file_urls").eq("submission_id", id).is("deleted_at", null).order("sort_order");
    return (data ?? []).map((d: any) => ({ id: d.id, code: d.doc_code, label: d.label, person: d.person_name, state: d.manual_override ?? d.required_state ?? d.status, status: d.status, why_needed: clip(d.why, 400), needs_notary: d.needs_notary, received_at: d.received_at, notes: clip(d.notes, 300), files: [...new Set([...(d.file_urls ?? []), ...(d.file_url ? [d.file_url] : [])])] }));
  }
  if (name === "get_contracts") {
    const [c, pa] = await Promise.all([
      db.from("contracts").select("id,kind,status,sent_at,viewed_at,signed_at,countersigned_at,notarized_at,completed_at,signed_copy_emailed_at,sign_token_expires_at,principal_key,fill_data").eq("submission_id", id).is("deleted_at", null).order("created_at"),
      db.from("purchase_agreements").select("id,status,sent_at,buyer_signed_at,countersigned_at,paid_at,voided_at,fields").eq("seller_submission_id", id).is("deleted_at", null),
    ]);
    return { contracts: (c.data ?? []).map((x: any) => ({ id: x.id, kind: x.kind, status: x.status, sent_at: x.sent_at, viewed_at: x.viewed_at, signed_at: x.signed_at, countersigned_at: x.countersigned_at, notarized_at: x.notarized_at, signed_copy_emailed_at: x.signed_copy_emailed_at, link_expires: x.sign_token_expires_at, signer: x.fill_data?.principal_name ?? x.fill_data?.seller_name ?? x.principal_key ?? null, plot: x.fill_data?.plot_description ?? null, listing_option: x.fill_data?.listing_option ?? null })),
      purchase_agreements: (pa.data ?? []).map((x: any) => ({ status: x.status, sent_at: x.sent_at, buyer_signed_at: x.buyer_signed_at, paid_at: x.paid_at, voided_at: x.voided_at, total: x.fields?.charges?.total ?? null })) };
  }
  if (name === "read_file") {
    if ((ctx.fileReads ?? 0) >= 4) return { error: "File reading budget used for this review." };
    let path = String(args?.path ?? ""), bucket = "portal-uploads", fileName = path.split("/").pop() ?? "file", mime = "";
    if (args?.file_id) {
      const { data: f } = await db.from("customer_files").select("file_path,file_name,mime_type").eq("id", String(args.file_id)).is("deleted_at", null).maybeSingle();
      if (!f) return { error: "File not found." };
      path = f.file_path; bucket = "customer-files"; fileName = f.file_name; mime = f.mime_type ?? "";
    } else if (!path || !path.startsWith(`${id}/`)) return { error: "Give a file_id from get_files or a checklist path from get_documents for this record." };
    if (!mime) mime = /\.pdf$/i.test(fileName) ? "application/pdf" : /\.png$/i.test(fileName) ? "image/png" : /\.webp$/i.test(fileName) ? "image/webp" : "image/jpeg";
    if (!/^(image\/(jpe?g|png|webp)|application\/pdf)$/i.test(mime)) return { error: `Can't read ${mime} files.` };
    const dl = await db.storage.from(bucket).download(path);
    if (dl.error || !dl.data) return { error: "Could not open the file." };
    const bytes = new Uint8Array(await dl.data.arrayBuffer());
    if (bytes.length > 8_000_000) return { error: "File too large to read." };
    ctx.fileReads = (ctx.fileReads ?? 0) + 1;
    const data = `data:${mime};base64,${b64(bytes)}`;
    const part = mime === "application/pdf" ? { type: "file", file: { filename: fileName, file_data: data } } : { type: "image_url", image_url: { url: data } };
    const out = await chat(ctx.apiKey, [{ role: "user", content: [{ type: "text", text: `You are checking a document for a cemetery-plot brokerage. Question: ${clip(args?.question, 600)}\nAnswer exactly from what is visible. Quote names, plot/lot/space wording, dates, signatures, notary seals as written. Say clearly what is missing or unreadable. Max 200 words.` }, part] }], { label: `AI checking a file: ${fileName}` });
    return { file: fileName, answer: clip(out.content, 2500) };
  }
  if (name === "cemetery_stock") {
    const c = resolveBuyerCemetery(String(args?.cemetery ?? ""), ctx.dir, null);
    const target = c?.name ?? String(args?.cemetery ?? "");
    const { data: rows } = await db.from("contact_submissions").select("id,cemetery,cemetery_city,lawn,section,property_type,plot_count,spaces,quote_amount,accepted_quote_amount,quote_response,la_signed_at,documents_completed_at,listing_live_at,sold_at,closed_at,reserved_until,created_at,source,customer_kind").ilike("cemetery", `%${target.split(/\s+/).slice(0, 2).join(" ").replace(/[%_]/g, "")}%`).is("deleted_at", null).is("archived_at", null).neq("id", String(args?.exclude_id ?? "00000000-0000-0000-0000-000000000000")).limit(200);
    const sellers = (rows ?? []).filter((r: any) => !String(r.customer_kind ?? "").toLowerCase().includes("buyer") && (r.source === "seller_quote" || r.quote_amount != null) && (!c || resolveBuyerCemetery(r.cemetery, ctx.dir, r.cemetery_city)?.name === c.name));
    const { data: listings } = await db.from("listings").select("section,plot_type,spaces,status,created_at").ilike("cemetery", `%${target.replace(/[%_]/g, "")}%`).is("deleted_at", null).limit(50);
    const stage = (r: any) => r.sold_at ? "sold" : r.closed_at ? "closed" : r.listing_live_at || r.documents_completed_at ? "listed" : r.la_signed_at ? "signed, paperwork in progress" : r.quote_response === "accepted" ? "quote accepted" : r.quote_amount ? "quoted" : "enquiry";
    return { cemetery: c?.name ?? target, seller_records: sellers.map((r: any) => ({ record: r.id.slice(0, 8), lawn: r.lawn || r.section, type: r.property_type, spaces: Number(r.plot_count) || Number(r.spaces) || 1, net_per_space: r.accepted_quote_amount ?? r.quote_amount, stage: stage(r), reserved: !!r.reserved_until && new Date(r.reserved_until) > new Date(), since: String(r.created_at).slice(0, 10) })), website_listings: listings ?? [] };
  }
  if (name === "nearby_cemeteries") {
    const c = resolveBuyerCemetery(String(args?.cemetery ?? ""), ctx.dir, null);
    if (!c) return { error: "No confident match in our cemetery file." };
    const { data: all } = await db.from("texas_cemeteries").select("name,city,county,latitude,longitude").is("deleted_at", null).not("latitude", "is", null).limit(2000);
    const me = (all ?? []).find((x: any) => x.name === c.name);
    if (!me) return { error: "That cemetery has no map position on file." };
    const r = Math.min(100, Math.max(1, Number(args?.miles) || 25));
    const near = (all ?? []).filter((x: any) => x.name !== me.name).map((x: any) => ({ name: x.name, city: x.city, county: x.county, miles: Math.round(miles(me, x) * 10) / 10 })).filter((x: any) => x.miles <= r).sort((a: any, b: any) => a.miles - b.miles).slice(0, 15);
    return { from: me.name, within_miles: r, cemeteries: near };
  }
  return { error: `Unknown tool ${name}` };
}

export async function chat(apiKey: string, messages: any[], opts: { tools?: any[]; json?: boolean; model?: string; label?: string } = {}) {
  const r = await aiFetch(opts.label ?? "AI researching a record", "https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({ model: opts.model ?? AGENT_MODEL, messages, ...(opts.tools ? { tools: opts.tools.map(t => ({ type: "function", function: t })) } : {}), ...(opts.json ? { response_format: { type: "json_object" } } : {}) }),
  });
  if (!r.ok) throw Object.assign(new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`), { status: r.status });
  return (await r.json())?.choices?.[0]?.message ?? {};
}

/** Bounded tool loop: at most `maxSteps` model turns, then forces a final JSON answer. */
export async function runAgent(ctx: ToolCtx, system: string, task: string, maxSteps = 7, tools: readonly any[] = RECORD_TOOLS, label = "AI researching a record"): Promise<{ answer: any; trace: { tool: string; args: unknown }[] }> {
  const messages: any[] = [{ role: "system", content: system }, { role: "user", content: task }];
  const trace: { tool: string; args: unknown }[] = [];
  for (let step = 0; step < maxSteps; step++) {
    const msg = await chat(ctx.apiKey, messages, { tools: [...tools], label: `${label} (step ${step + 1})` });
    messages.push({ role: "assistant", content: msg.content ?? "", ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}) });
    if (!msg.tool_calls?.length) return { answer: parseJson(msg.content), trace };
    for (const tc of msg.tool_calls) {
      let args: any = {}; try { args = JSON.parse(tc.function?.arguments || "{}"); } catch { /* empty */ }
      trace.push({ tool: tc.function?.name, args });
      const result = await runTool(ctx, tc.function?.name, args).catch(e => ({ error: String(e?.message ?? e) }));
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result).slice(0, 20000) });
    }
  }
  messages.push({ role: "user", content: "Stop using tools. Give your final JSON answer now." });
  const last = await chat(ctx.apiKey, messages, { json: true, label: `${label} (final answer)` });
  return { answer: parseJson(last.content), trace };
}

export function parseJson(s: unknown) {
  const t = String(s ?? "").replace(/^[\s\S]*?```(?:json)?|```[\s\S]*$/g, "").trim() || String(s ?? "");
  try { return JSON.parse(t); } catch { const m = String(s ?? "").match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } }
}
