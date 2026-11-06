// Admin-parity layer for the seller agent.
// 1) researchRecord: before deciding, a tool-using research pass reads the file the way the most
//    careful admin would (every email, payments, quote history, checklist + the actual files,
//    contracts, activity, cemetery prices/stock/nearby) and reports verified facts and mistakes.
// 2) Executors for admin jobs that used to stop at "open the dialog": sending/re-sending the
//    seller quote pack (same shared HTML builder staff use), re-sending any earlier email,
//    moving the pipeline stage, re-sending unsigned contract links and signed copies.
// Every executor runs only after a staff member approves the action.
import { runAgent, runAgentSlice, type ResearchState, RECORD_TOOLS, ADMIN_READ_TOOLS, parseJson } from "../_shared/recordAgent.ts";
import { buildListingOptionsBlock } from "../_shared/listingOptionsBlock.ts";
import { suggestedNetPerSpace } from "../_shared/quoteFigures.ts";
import { properCase, properFirstName } from "../_shared/properCase.ts";

type Sub = Record<string, any>;
const SITE = "https://www.texascemeterybrokers.com";
export const TEXAS_STAGES = ["new", "intake_sent", "details_received", "quoted", "listed", "closed"];

const RESEARCH_SYS = `You are the research desk for Texas Cemetery Brokers' seller team. Before a senior admin decides the next step on one SELLER file, you check the file more carefully than the best admin would.
Use the tools. Read every email on the record (page with get_all_emails until you have them all, max 3 pages), the payments, the quote history, the document checklist and contracts, the activity log and the files. Open the actual files that matter (deed, POA, ID, certificates) with read_file / read_deed when the question touches them — never assume a file is what its name says.
FAMILY TREE AND PAPERWORK REVIEW (whenever a family tree was sent or documents were requested): read get_family_tree and get_documents together. Check each requested item against the answers and its why_needed — right people (living deed owners; for deceased owners the surviving spouse and heirs at law), right POA type (single vs joint for a married couple), death/marriage certificates and affidavit where the rules need them, nothing missing, nothing unnecessary. Then open the documents the seller sent back (read_file / read_deed) and confirm each is the right document, for the right person, legible, signed and notarised where needed. Photos/scans are copies only — never count them as the mailed original.
STAGE CHECKS (the snapshot gives CURRENT PIPELINE STAGE):
- Attachments (no quote yet): open the seller's uploads/email attachments and say plainly whether one IS a cemetery deed / certificate of interment rights (name the cemetery, owners, section/lot/spaces you can read) or what it actually is (ID, receipt, map, blank, unreadable).
- TREE CHECK (Tree done or later): read get_family_tree with the deed. List as mistakes any answer that cannot be right: a name field holding "No"/"none"/"n/a"/"?" or a sentence, obvious typos vs the deed spelling, a deed owner missing or misnamed, impossible relations, alive/deceased contradictions, spouse/children answers that contradict emails. Quote the exact answer and the field.
- Use judgment, not literal matching: understand differences between deed, quote, record and emails from context (e.g. selling only some of the deed's spaces, nicknames, typos) and report as mistakes only what is genuinely wrong.
Only research cemetery prices, other stock (cemetery_stock) and nearby cemeteries when pricing, demand, alternatives or a revised quote is in play.
Verify, don't assume:
- Count the spaces on the deed vs the record and the quote. Check the lawn/section price on file vs the quote's retail.
- Check whether everything we PROMISED in emails or notes actually happened (we said we'd update / send / correct something — is it on the record, in the checklist, in a sent email?).
- Prices belong to the quote and listing agreement only. The printed POA/affidavit states no price (the POA defers to the signed listing agreement), so hidden price fields in their fill data are never a mistake.
- Check payments: what was paid, when, by whom, test vs live, refunds. Never treat a test payment as real.
- Spot mistakes: wrong figures, wrong names, files filed under the wrong person or item, stale stages, links that expired, duplicates.
Return ONLY JSON: {"facts":[{"fact":string,"source":string}] (max 25, each with where you saw it e.g. "email 2026-10-02 from seller", "deed scan", "payments"),
"mistakes":[{"what":string,"evidence":string,"fix":string}],
"open_promises":[string],
"answer_material":[string] (specific facts a reply to the seller's latest message would need)}`;

/** Tool-using research pass (cheap fast model). Returns text for the decision prompt plus the trace for staff. */
export async function researchRecord(db: any, apiKey: string, sub: Sub, focus: string, instruction: string, onUsage?: (model: string, usage: unknown) => void, continuation?: { state?: ResearchState }) {
  const { data: dir } = await db.from("texas_cemeteries").select("name,city,region,latitude,longitude,transfer_fee").is("deleted_at", null).limit(3000);
  const ctx = { db, apiKey, dir: dir ?? [], deedReads: 0, fileReads: 0, onUsage };
  const task = `Seller record id: ${sub.id}\nSeller: ${sub.name} <${sub.email}>, cemetery: ${sub.cemetery ?? "?"}\n${instruction ? `STAFF INSTRUCTION FOR THIS REVIEW: ${instruction}\n` : ""}CURRENT SNAPSHOT:\n${focus}\n\nResearch this file now.`;
  const result = continuation
    ? await runAgentSlice(ctx, RESEARCH_SYS, task, continuation.state, 9, [...RECORD_TOOLS, ...ADMIN_READ_TOOLS], "Seller AI — researching the record")
    : await runAgent(ctx, RESEARCH_SYS, task, 9, [...RECORD_TOOLS, ...ADMIN_READ_TOOLS], "Seller AI — researching the record");
  const { answer, trace } = result;
  if ("complete" in result && !result.complete) return { complete: false, state: result.state, text: "", trace: trace.map(t => t.tool), mistakes: 0 };
  const a = answer && typeof answer === "object" ? answer : {};
  const list = (x: unknown) => (Array.isArray(x) ? x : []);
  const text = [
    `FACTS:\n${list(a.facts).slice(0, 25).map((f: any) => `- ${f.fact} [${f.source}]`).join("\n") || "(none)"}`,
    `MISTAKES FOUND:\n${list(a.mistakes).slice(0, 10).map((m: any) => `- ${m.what} — evidence: ${m.evidence} — fix: ${m.fix}`).join("\n") || "(none)"}`,
    `OPEN PROMISES:\n${list(a.open_promises).slice(0, 10).map((p: any) => `- ${p}`).join("\n") || "(none)"}`,
    `ANSWER MATERIAL:\n${list(a.answer_material).slice(0, 12).map((p: any) => `- ${p}`).join("\n") || "(none)"}`,
  ].join("\n\n");
  return { complete: true, state: "state" in result ? result.state : undefined, text, trace: trace.map((t) => t.tool), mistakes: list(a.mistakes).length };
}

const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const P = "font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#2d2a26;margin:0 0 14px;";
export const plainHtml = (body: string) => `<div data-tcb-email="ai_agent" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#2d2a26;">${esc(body).replace(/\n/g, "<br>")}</div>`;

type Mail = { url: string; auth: string; anon: string; actor: string };
export async function sendMail(m: Mail, p: { to: string; subject: string; body: string; html: string; threadId?: string | null; submissionId: string }) {
  const res = await fetch(`${m.url}/functions/v1/gmail-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: m.auth, apikey: m.anon },
    body: JSON.stringify({ action: "send", to: p.to, subject: p.subject, body: p.body, htmlBody: p.html, ...(p.threadId ? { threadId: p.threadId } : {}), submissionId: p.submissionId, actorName: m.actor }),
  });
  const text = await res.text();
  let j: any = {}; try { j = JSON.parse(text); } catch { /* */ }
  if (!res.ok || j.error) throw new Error(`Email failed (${res.status}): ${String(j.error ?? text).slice(0, 300)}`);
  return j as { threadId?: string; id?: string };
}

/** The only per-space figures the AI may quote: what is saved, our standard formula from saved retail + fee, or the authorised +10%. */
export function allowedQuoteFigures(sub: Sub, tenPercent: number | null) {
  const out = new Map<number, string>();
  if (Number(sub.quote_amount) > 0) out.set(Math.round(Number(sub.quote_amount)), "saved quote");
  const retail = Number(sub.cemetery_retail), fee = Number(sub.transfer_fee_amount);
  if (retail > 0 && Number.isFinite(fee) && fee >= 0 && sub.transfer_fee_amount != null) out.set(suggestedNetPerSpace(retail, fee), "standard formula from saved retail and transfer fee");
  if (tenPercent) out.set(Math.round(tenPercent), "authorised +10% revision");
  return out;
}

/**
 * Sends the seller quote pack exactly like staff do from the composer ("Send seller pack"):
 * saves the quote fields, builds the shared quote block with live listing-fee links, emails
 * greeting + block + signature, stamps quote_sent_at / a fresh 10-day expiry, then sends the
 * optional explanation as its own email in the same thread.
 */
export async function sendQuotePack(db: any, m: Mail, callInternal: (name: string, body: unknown) => Promise<any>, sub: Sub, o: {
  perSpace: number; count: number; plotDescription?: string | null; intro?: string | null; explanation?: string | null; threadId?: string | null; adminName: string;
}) {
  if (!sub.email) throw new Error("This seller has no email address.");
  const fee = Number(sub.transfer_fee_amount);
  if (!(o.perSpace > 0) || !(o.count >= 1) || !Number.isFinite(fee) || sub.transfer_fee_amount == null) throw new Error("The quote needs a price per space, a space count and the cemetery transfer fee on file.");
  const plotDescription = String(o.plotDescription ?? sub.plot_description ?? "").trim() || null;
  const total = o.perSpace * o.count;
  const now = new Date();
  const answers = { ...(sub.ownership_answers ?? {}) } as Record<string, any>;
  const block = await buildListingOptionsBlock({
    seller: { id: sub.id, name: sub.name, email: sub.email, cemetery: sub.cemetery, section: sub.section, property_type: sub.property_type, spaces: String(o.count), space_numbers: sub.space_numbers, lawn: sub.lawn, transfer_fee_amount: fee },
    netPerPlot: o.perSpace, plotCount: o.count, transferFee: fee, environment: "live", plotDescription,
    createLink: (body) => callInternal("create-payment-link", body),
  });
  if ((block.match(/href="https?:\/\//g) ?? []).length < 2) throw new Error("Couldn't create the listing-fee payment links, so the quote was not sent.");
  const deedNames = String(sub.deed_owner_names ?? "").trim();
  if (!deedNames || !plotDescription) throw new Error("Deed owner names and the exact plot wording must be on the record before a quote goes out — the agreement and family tree are built from them.");
  const { error: saveErr } = await db.from("contact_submissions").update({
    deed_owner_names: deedNames, ownership_roster: rosterFromNames(deedNames, sub.ownership_roster),
    quote_amount: o.perSpace, plot_count: o.count, spaces: String(o.count), list_price: total, plot_description: plotDescription,
    ownership_answers: { ...answers, autopilot: { ...(answers.autopilot ?? {}), preparedAt: now.toISOString(), deedOwnerNames: deedNames, netPerPlot: o.perSpace, plotCount: o.count, authorizedMinTotal: total, transferFee: fee || null, plotDescription } },
  }).eq("id", sub.id);
  if (saveErr) throw new Error(saveErr.message);
  const first = properFirstName(sub.name) || "there";
  const sig = `Best regards,<br><br>${esc(o.adminName)}<br>Cemetery Salesperson<br>Texas Cemetery Brokers<br>www.texascemeterybrokers.com`;
  const html = `<div data-tcb-email="quote" data-tcb-sent-by="ai"></div><p style="${P}">Dear ${esc(first)},</p>${o.intro?.trim() ? `<p style="${P}">${esc(o.intro.trim()).replace(/\n/g, "<br>")}</p>` : ""}${block}<p style="${P}">${sig}</p>`;
  const subject = `Your Property Valuation is Complete - Listing Offer${sub.cemetery ? ` for ${properCase(sub.cemetery)}` : ""}`;
  const sent = await sendMail(m, { to: sub.email, subject, body: `Dear ${first},\n\nYour quote from Texas Cemetery Brokers: ${o.count} space${o.count === 1 ? "" : "s"} at $${o.perSpace.toLocaleString()} per space. Open this email in a browser to choose your listing option.\n\n${SITE}`, html, threadId: o.threadId, submissionId: sub.id });
  await db.from("contact_submissions").update({ quote_sent_at: now.toISOString(), quote_expires_at: new Date(now.getTime() + 10 * 86_400_000).toISOString(), quote_message: null }).eq("id", sub.id);
  if (o.explanation?.trim()) {
    await sendMail(m, { to: sub.email, subject: `Re: ${subject}`, body: o.explanation.trim(), html: plainHtml(o.explanation.trim()), threadId: sent.threadId ?? o.threadId, submissionId: sub.id });
  }
  return { total, threadId: sent.threadId ?? o.threadId ?? null };
}

// Same roster the staff seller pack saves: one entry per deed owner, keeping known deceased flags.
const normKey = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, "").trim();
export function rosterFromNames(raw: string, existing?: unknown) {
  const prev = new Set<string>();
  if (Array.isArray(existing)) for (const p of existing as any[]) { const n = String(p?.name ?? "").trim(); if (n && (p?.deceased === true || p?.role === "decedent")) prev.add(normKey(n)); }
  return String(raw || "").split(/\s*(?:&|,|;|\band\b)\s*/i).map((s) => s.trim()).filter(Boolean).map((name) => (prev.has(normKey(name)) ? { name, deceased: true } : { name }));
}

/** Re-sends one of OUR earlier emails (same HTML) in its thread, with an optional short intro above it. */
export async function resendEarlierEmail(db: any, m: Mail, sub: Sub, emailId: string, intro: string | null, subjectOverride: string | null) {
  const { data: e } = await db.from("email_messages").select("id,from_email,to_email,subject,body_html,body_text,gmail_thread_id,matched_submission_id").eq("id", emailId).is("deleted_at", null).maybeSingle();
  if (!e) throw new Error("That earlier email could not be found.");
  if (!/texascemeterybrokers|bayercemeterybrokers/i.test(e.from_email ?? "")) throw new Error("Only emails we sent can be re-sent.");
  const mine = e.matched_submission_id === sub.id || String(e.to_email ?? "").toLowerCase().includes(String(sub.email ?? "").toLowerCase());
  if (!mine || !sub.email) throw new Error("That email does not belong to this seller.");
  const body = String(e.body_html || "").trim() || plainHtml(String(e.body_text ?? ""));
  const html = `${intro?.trim() ? `<div data-tcb-email="ai_agent" style="${P}">${esc(intro.trim()).replace(/\n/g, "<br>")}</div>` : `<div data-tcb-email="ai_agent"></div>`}${body}`;
  const subject = subjectOverride?.trim() || (() => { const s0 = String(e.subject ?? "Your cemetery property").replace(/^(Re:\s*)*(Automatic email:\s*)?/i, ""); return `Re: ${s0}`; })();
  await sendMail(m, { to: sub.email, subject, body: `${intro?.trim() ? `${intro.trim()}\n\n` : ""}${String(e.body_text ?? "").slice(0, 8000)}`, html, threadId: e.gmail_thread_id, submissionId: sub.id });
  return { subject: e.subject as string };
}

/** Same patch the Texas pipeline buttons make. */
export function stagePatch(sub: Sub, next: string) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { texas_pipeline_stage: next };
  if (next === "intake_sent" && !sub.texas_intake_sent_at) patch.texas_intake_sent_at = now;
  if (next === "details_received" && !sub.texas_details_received_at) patch.texas_details_received_at = now;
  if (next === "closed" && !sub.closed_at) patch.closed_at = now;
  return patch;
}

export const contractLabel = (c: any) => {
  const k: Record<string, string> = { listing_agreement: "listing agreement", poa: "power of attorney", affidavit_heirship: "affidavit of heirship", spousal_consent: "spousal consent" };
  const who = c.fill_data?.principal_name || c.fill_data?.seller_name || "";
  return `${k[c.kind] ?? c.kind}${who ? ` (${who})` : ""}`;
};
export { parseJson };
