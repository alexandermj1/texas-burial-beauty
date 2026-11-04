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

export type ToolCtx = { db: any; apiKey: string; dir: any[]; deedReads: number };

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
    const { data } = await db.from("customer_files").select("id,file_name,file_path,mime_type,document_type,extracted_summary").eq("customer_profile_id", r.customer_profile_id).is("deleted_at", null).order("created_at", { ascending: false }).limit(20);
    const files = data ?? [];
    if (name === "get_files") return files.map((f: any) => ({ name: f.file_name, type: f.document_type, summary: clip(f.extracted_summary, 500) }));
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
      { type: "image_url", image_url: { url: `data:${mime};base64,${btoa(bin)}` } }] }], { json: true });
    try { return { file: deed.file_name, ...JSON.parse(String(out.content ?? "{}").replace(/^```json|```$/g, "").trim()) }; } catch { return { error: "Deed could not be read clearly." }; }
  }
  if (name === "get_cemetery") {
    const c = resolveBuyerCemetery(String(args?.name ?? ""), ctx.dir, null);
    if (!c) return { error: "No confident match in our cemetery file." };
    const { data } = await db.from("texas_cemeteries").select("name,city,county,transfer_fee,sections,notes").eq("name", c.name).is("deleted_at", null).limit(1).maybeSingle();
    return data ? { ...data, notes: clip(data.notes, 400), sections: (Array.isArray(data.sections) ? data.sections : []).slice(0, 40).map((s: any) => ({ lawn: s.name, retail_per_space: s.price ?? null, type: s.property_type ?? null, notes: clip(s.notes, 120) })) } : { error: "not found" };
  }
  return { error: `Unknown tool ${name}` };
}

export async function chat(apiKey: string, messages: any[], opts: { tools?: any[]; json?: boolean } = {}) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({ model: AGENT_MODEL, messages, ...(opts.tools ? { tools: opts.tools.map(t => ({ type: "function", function: t })) } : {}), ...(opts.json ? { response_format: { type: "json_object" } } : {}) }),
  });
  if (!r.ok) throw Object.assign(new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`), { status: r.status });
  return (await r.json())?.choices?.[0]?.message ?? {};
}

/** Bounded tool loop: at most `maxSteps` model turns, then forces a final JSON answer. */
export async function runAgent(ctx: ToolCtx, system: string, task: string, maxSteps = 7): Promise<{ answer: any; trace: { tool: string; args: unknown }[] }> {
  const messages: any[] = [{ role: "system", content: system }, { role: "user", content: task }];
  const trace: { tool: string; args: unknown }[] = [];
  for (let step = 0; step < maxSteps; step++) {
    const msg = await chat(ctx.apiKey, messages, { tools: [...RECORD_TOOLS] });
    messages.push({ role: "assistant", content: msg.content ?? "", ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}) });
    if (!msg.tool_calls?.length) return { answer: parseJson(msg.content), trace };
    for (const tc of msg.tool_calls) {
      let args: any = {}; try { args = JSON.parse(tc.function?.arguments || "{}"); } catch { /* empty */ }
      trace.push({ tool: tc.function?.name, args });
      const result = await runTool(ctx, tc.function?.name, args).catch(e => ({ error: String(e?.message ?? e) }));
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result).slice(0, 12000) });
    }
  }
  messages.push({ role: "user", content: "Stop using tools. Give your final JSON answer now." });
  const last = await chat(ctx.apiKey, messages, { json: true });
  return { answer: parseJson(last.content), trace };
}

export function parseJson(s: unknown) {
  const t = String(s ?? "").replace(/^[\s\S]*?```(?:json)?|```[\s\S]*$/g, "").trim() || String(s ?? "");
  try { return JSON.parse(t); } catch { const m = String(s ?? "").match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } }
}
