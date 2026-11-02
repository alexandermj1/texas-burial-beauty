// Buyer Purchase Agreement: staff match a buyer to a seller's property, edit the
// schedule, email a private signing link; the buyer completes and e-signs on
// /purchase-agreement/:token; staff countersign, which produces the executed PDF
// with an audit certificate and issues the card payment link. The payments
// webhook marks the agreement paid. Public actions are token-scoped and never
// reveal the seller's identity.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "npm:pdf-lib@1.17.1";
import {
  ACKNOWLEDGEMENTS, BUYER_EDITABLE, CANCELLATION_NOTICE, ESIGN_CONSENT, TERMS, TERMS_VERSION,
  canonicalDocument, chargeTotals, normalizeFields, type AgreementFields,
} from "./terms.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = "https://www.texascemeterybrokers.com";
const MAILBOX = "info@texascemeterybrokers.com";
const db = createClient(SUPABASE_URL, SERVICE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const money = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD" });
const nowIso = () => new Date().toISOString();

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function newToken() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
const event = (type: string, extra: Record<string, unknown> = {}) => ({ at: nowIso(), type, ...extra });

async function staffUser(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  if (!data.user) return null;
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", data.user.id).in("role", ["admin", "staff"]);
  if (!roles?.length) return null;
  const { data: prof } = await db.from("profiles").select("full_name,email").eq("id", data.user.id).maybeSingle();
  return { id: data.user.id, name: prof?.full_name || prof?.email || data.user.email || "Staff" };
}

// ---------------- email ----------------
function b64url(s: string) {
  const bytes = new TextEncoder().encode(s); let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function hdr(s: string) {
  // deno-lint-ignore no-control-regex
  if (!/[^\x00-\x7F]/.test(s)) return s;
  const bytes = new TextEncoder().encode(s); let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return `=?UTF-8?B?${btoa(bin)}?=`;
}
async function sendEmail(opts: { to: string; subject: string; html: string; submissionId: string; snippet: string; attachment?: { name: string; bytes: Uint8Array; mime?: string } }) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY"); const gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY");
  const plain = opts.html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const alt = `=_alt_${crypto.randomUUID().replace(/-/g, "")}`; const mix = `=_mix_${crypto.randomUUID().replace(/-/g, "")}`;
  const altPart = [`Content-Type: multipart/alternative; boundary="${alt}"`, "", `--${alt}`, 'Content-Type: text/plain; charset="UTF-8"', "", plain, `--${alt}`, 'Content-Type: text/html; charset="UTF-8"', "", opts.html, `--${alt}--`];
  const lines = [`From: Texas Cemetery Brokers <${MAILBOX}>`, `To: ${opts.to}`, `Bcc: ${MAILBOX}`, `Subject: ${hdr(opts.subject)}`, "MIME-Version: 1.0"];
  if (opts.attachment) {
    let bin = ""; opts.attachment.bytes.forEach((b) => (bin += String.fromCharCode(b)));
    const b64 = btoa(bin).replace(/.{76}/g, "$&\r\n");
    lines.push(`Content-Type: multipart/mixed; boundary="${mix}"`, "", `--${mix}`, ...altPart, `--${mix}`,
      `Content-Type: ${opts.attachment.mime ?? "application/pdf"}; name="${opts.attachment.name}"`, "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${opts.attachment.name}"`, "", b64, `--${mix}--`, "");
  } else lines.push(...altPart, "");
  if (!lovableKey) throw new Error("Email is not configured");
  // Try each linked Gmail connection (one may need reconnecting), then Resend.
  let text = ""; let sent = false; const failures: string[] = [];
  for (const key of [gmailKey, Deno.env.get("GOOGLE_MAIL_API_KEY_1")].filter(Boolean) as string[]) {
    const res = await fetch("https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: b64url(lines.join("\r\n")) }),
    });
    text = await res.text();
    if (res.ok) { sent = true; break; }
    failures.push(`Gmail ${res.status}`);
  }
  if (!sent) {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error(`Email could not be sent (${failures.join(", ")})`);
    let att: unknown[] | undefined;
    if (opts.attachment) { let bin = ""; opts.attachment.bytes.forEach((b) => (bin += String.fromCharCode(b))); att = [{ filename: opts.attachment.name, content: btoa(bin) }]; }
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Texas Cemetery Brokers <${MAILBOX}>`, reply_to: MAILBOX, to: [opts.to], bcc: [MAILBOX], subject: opts.subject, html: opts.html, ...(att ? { attachments: att } : {}) }),
    });
    text = "{}";
    if (!res.ok) throw new Error(`Email could not be sent (${failures.join(", ")}; Resend ${res.status} ${(await res.text()).slice(0, 200)})`);
  }
  let out: any = {}; try { out = JSON.parse(text); } catch { /* ignore */ }
  await db.from("email_messages").upsert({
    gmail_message_id: out.id || `pa-${crypto.randomUUID()}`, gmail_thread_id: out.threadId ?? null,
    from_email: MAILBOX, from_name: "Texas Cemetery Brokers", to_email: opts.to, subject: opts.subject,
    snippet: opts.snippet, body_text: plain, body_html: opts.html, received_at: nowIso(),
    matched_submission_id: opts.submissionId, is_read: true,
  } as Record<string, unknown>, { onConflict: "gmail_message_id" });
  return out;
}

const SANS = "Helvetica,Arial,sans-serif";
export function shell(inner: string, kind: string, banner = "") {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body data-tcb-email="${kind}" style="margin:0;padding:0;background:#f6f1ea;font-family:${SANS};color:#2e2620;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1ea;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e6ddd0;border-radius:12px;overflow:hidden;">
${banner}
<tr><td align="center" style="padding:26px 24px 20px;border-bottom:1px solid #2e2620;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td valign="middle" style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:.5px;color:#2e2620;white-space:nowrap;">Texas Cemetery Brokers</td></tr></table>
<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b5f55;padding-top:6px;">Licensed cemetery property brokers &middot; Texas</div></td></tr>
<tr><td style="padding:30px 40px 12px;font-size:15px;line-height:24px;color:#2e2620;">${inner}</td></tr>
<tr><td style="padding:20px 40px 24px;font-size:13px;line-height:20px;color:#2e2620;border-top:1px solid #efe6da;">Kind regards,<br><strong>Simon James</strong><br>Texas Cemetery Brokers</td></tr>
<tr><td align="center" style="background:#2e2620;padding:16px 24px;font-size:12px;line-height:18px;color:#e6ddd0;">Texas Cemetery Brokers &middot; Dallas, Texas &middot; (214) 230-4740<br><a href="${SITE}" style="color:#ffffff;text-decoration:underline;">texascemeterybrokers.com</a> &middot; Secure electronic signature</td></tr>
</table></td></tr></table></body></html>`;
}
const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td style="background:#2e2620;border-radius:4px;"><a href="${esc(href)}" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-family:${SANS};font-size:15px;font-weight:bold;letter-spacing:.3px;">${label}</a></td></tr></table>`;
export const sampleBanner = `<tr><td align="center" style="background:#2e2620;padding:9px 16px;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ffffff;">Sample purchase agreement &middot; internal preview, not a real sale</td></tr>`;

function summaryTable(f: AgreementFields) {
  const t = chargeTotals(f.charges);
  const row = (k: string, v: string, last = false) => `<tr><td style="padding:10px 0;${last ? "" : "border-bottom:1px solid #e6ddd0;"}color:#6b5f55;font-size:13px;">${k}</td><td style="padding:10px 0;${last ? "" : "border-bottom:1px solid #e6ddd0;"}text-align:right;font-size:14px;color:#2e2620;${last ? "font-weight:bold;font-size:16px;" : ""}">${esc(v)}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;border:1px solid #e6ddd0;margin:18px 0;"><tr><td style="padding:6px 18px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row("Cemetery", [f.property.cemetery, f.property.city].filter(Boolean).join(", "))}
${row("Property", `${f.property.description || f.property.property_type}${f.property.spaces > 1 ? ` (${f.property.spaces} spaces)` : ""}`)}
${row("Total amount due", money(t.totalDue), true)}</table></td></tr></table>`;
}

function deedBlock(f: AgreementFields, url: string) {
  const sp = f.property.spaces > 1 ? `${f.property.spaces} spaces` : "one space";
  return `<p style="margin:22px 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b5f55;">Copy of the deed for your review</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6ddd0;"><tr><td style="padding:8px;background:#faf7f2;"><img src="${esc(url)}" width="502" alt="Copy of the cemetery deed (owner's name and address obscured)" style="display:block;width:100%;height:auto;border:0;"></td></tr>
<tr><td style="padding:8px 12px;font-size:12px;line-height:18px;color:#6b5f55;">The current owner's name and address have been obscured to protect their privacy. A copy is also attached to this email.</td></tr></table>
<p style="margin:16px 0 10px;font-size:14px;line-height:22px;">For your own protection, before signing please compare this deed carefully with the property described in your purchase agreement and confirm that the cemetery, section, lot and space number(s) correspond exactly.</p>
<p style="margin:0 0 10px;font-size:14px;line-height:22px;">Please note that a deed may cover more spaces than are being sold to you. This agreement transfers only the property described in the agreement (${esc(sp)}: ${esc(f.property.description)}). Any other spaces listed on the deed are not included and remain with the current owner.</p>
<p style="margin:0 0 6px;font-size:14px;line-height:22px;">If anything on the deed does not match your agreement, or you are unsure which space you are purchasing, please do not sign &mdash; reply to this email or call (214) 230-4740 and we will clarify it with you and the cemetery first.</p>`;
}

export function inviteEmailHtml(f: AgreementFields, signUrl: string, note?: string, sample = false, deedUrl?: string) {
  const first = (f.purchaser.names || "").trim().split(/\s+/)[0] || "there";
  const step = (n: number, t: string) => `<tr><td valign="top" style="padding:0 12px 10px 0;"><div style="width:22px;height:22px;border-radius:11px;border:1px solid #2e2620;color:#2e2620;font-size:12px;line-height:20px;text-align:center;">${n}</div></td><td style="padding:1px 0 10px;font-size:14px;line-height:21px;color:#2e2620;">${t}</td></tr>`;
  return shell(`<p style="margin:0 0 14px;">Dear ${esc(first)},</p>
<p style="margin:0 0 14px;">Thank you for choosing Texas Cemetery Brokers. Your purchase agreement for the cemetery property below has been prepared and is ready for you to review and sign online.</p>
${note ? `<p style="margin:0 0 14px;color:#6b5f55;font-style:italic;">${esc(note).replace(/\n/g, "<br>")}</p>` : ""}
${summaryTable(f)}
${deedUrl ? deedBlock(f, deedUrl) : ""}
${button(signUrl, "Review &amp; sign your agreement")}
<p style="margin:8px 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b5f55;">What happens next</p>
<table role="presentation" cellpadding="0" cellspacing="0">
${step(1, "Review the agreement and add your details and the names for the deed.")}
${step(2, "Sign electronically &mdash; it takes about five minutes.")}
${step(3, "We countersign and email you the completed agreement with a secure card payment link.")}
${step(4, "Once payment clears, we file the transfer with the cemetery and keep you updated.")}
</table>
<p style="margin:14px 0;font-size:13px;line-height:20px;color:#6b5f55;">You may cancel within five calendar days of signing. If you have any questions, simply reply to this email or call us on (214) 230-4740.</p>
<p style="margin:0 0 6px;font-size:11px;line-height:16px;color:#8a7766;word-break:break-all;">If the button does not work, copy this link into your browser:<br>${esc(signUrl)}</p>`, "purchase_agreement", sample ? sampleBanner : "");
}

// ---------------- PDF ----------------
const SAGE = rgb(0.18, 0.149, 0.125), INK = rgb(0.17, 0.16, 0.15), MUTED = rgb(0.45, 0.41, 0.37);
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}
const safe = (s: unknown) => String(s ?? "").replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022]/g, "");

async function buildPdf(pa: any): Promise<Uint8Array> {
  const f = normalizeFields(pa.fields); const t = chargeTotals(f.charges);
  const pdf = await PDFDocument.create();
  pdf.setTitle("Texas Cemetery Brokers — Purchase Agreement"); pdf.setAuthor("Texas Cemetery Brokers");
  const reg = await pdf.embedFont(StandardFonts.TimesRoman), bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const W = 612, H = 792, M = 54, CW = W - M * 2;
  let page: PDFPage = pdf.addPage([W, H]); let y = H - M;
  const ensure = (h: number) => { if (y - h < M + 20) { page = pdf.addPage([W, H]); y = H - M; } };
  const text = (s: string, o: { size?: number; font?: PDFFont; color?: any; indent?: number } = {}) => {
    const size = o.size ?? 10, font = o.font ?? reg;
    for (const l of wrap(safe(s), font, size, CW - (o.indent ?? 0))) { ensure(size + 4); page.drawText(l, { x: M + (o.indent ?? 0), y: y - size, size, font, color: o.color ?? INK }); y -= size + 3.5; }
  };
  const gap = (h = 8) => { y -= h; };
  const rule = () => { ensure(8); page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: SAGE }); y -= 8; };
  const kv = (k: string, v: string) => { ensure(14); page.drawText(safe(k).toUpperCase(), { x: M, y: y - 8, size: 7.5, font: bold, color: MUTED }); const lines = wrap(safe(v || "—"), reg, 10, CW - 170); lines.forEach((l, i) => page.drawText(l, { x: M + 170, y: y - 9 - i * 13, size: 10, font: reg, color: INK })); y -= Math.max(14, lines.length * 13 + 2); };
  const heading = (s: string) => { gap(6); ensure(30); text(s, { size: 11.5, font: bold, color: SAGE }); gap(2); };

  text("TEXAS CEMETERY BROKERS", { size: 18, font: bold, color: SAGE });
  text("Dallas, Texas  |  (214) 230-4740  |  www.texascemeterybrokers.com  |  info@texascemeterybrokers.com", { size: 8.5, color: MUTED });
  rule(); text("PURCHASE AGREEMENT", { size: 15, font: bold }); gap(2);
  text(`Agreement ID ${pa.id}  ·  Terms version ${pa.terms_version}`, { size: 8, color: MUTED }); gap(4);
  text("The Undersigned, hereafter referred to as \u201cPurchaser\u201d, hereby agrees to purchase the following interment property, services and/or commodities.");
  heading("Purchaser Details");
  kv("Name(s)", f.purchaser.names); kv("Address", f.purchaser.address); kv("Telephone", f.purchaser.phone); kv("Email", f.purchaser.email); kv("Date of birth", f.purchaser.dob); kv("Marital status", f.purchaser.marital_status);
  heading("Interment Property Details");
  kv("Cemetery name", f.property.cemetery); kv("City", f.property.city); kv("Property description", f.property.description); kv("Number of spaces", String(f.property.spaces)); kv("Property type", f.property.property_type); kv("Additional commodities", f.property.commodities || "None");
  heading("Persons Property Will Be Deeded To");
  kv("Deed holder #1", f.deed.same_as_purchaser ? `${f.purchaser.names} (same as Purchaser)` : f.deed.holder1);
  kv("Deed holder #2 (optional)", f.deed.holder2 || "—");
  if (!f.deed.same_as_purchaser) { kv("Deed holder name(s)", f.deed.names); kv("Address", f.deed.address); kv("Telephone", f.deed.phone); kv("Email", f.deed.email); kv("Date of birth", f.deed.dob); kv("Marital status", f.deed.marital_status); }
  heading("Schedule of Charges");
  const line = (label: string, v: number, b = false) => { ensure(14); page.drawText(safe(label), { x: M, y: y - 10, size: 10, font: b ? bold : reg }); const s = money(v); page.drawText(s, { x: W - M - (b ? bold : reg).widthOfTextAtSize(s, 10), y: y - 10, size: 10, font: b ? bold : reg }); y -= 15; };
  text("I. Sale Price Breakdown", { font: bold, size: 9.5 });
  line("1. Commitment Deposit", f.charges.deposit); line("2. Balance of Property Price", f.charges.balance); line("3. Total Property Price (Sum of 1 & 2)", t.totalProperty, true);
  text("II. Fees and Adjustments", { font: bold, size: 9.5 });
  line("4. Cemetery Transfer Fee (Transfer Fee & Commodities)", f.charges.transfer_fee); line(`5. Adjustments${f.charges.adjustments_note ? ` (${f.charges.adjustments_note})` : " (if any)"}`, f.charges.adjustments);
  text("III. Total Amount Due", { font: bold, size: 9.5 }); line("6. Total Amount Due (Sum of 3, 4 & 5)", t.totalDue, true);
  gap(4); text(`Cancellation. ${CANCELLATION_NOTICE}`, { size: 9 });
  const sig = pa.buyer_signature ?? {};
  heading("Purchaser Acknowledgements");
  for (const a of ACKNOWLEDGEMENTS) text(`${a.label}: ${a.text}  Purchaser initials: ${sig.initials?.[a.key] ?? "____"}`, { size: 9 });
  for (const s of TERMS) { heading(s.heading); for (const p of s.body) { text(p, { size: 9 }); gap(3); } }

  heading("Signatures");
  const drawSig = async (label: string, dataUrl: string | undefined, name: string, date: string) => {
    ensure(90); text(label, { font: bold, size: 9.5 });
    if (dataUrl?.startsWith("data:image/png;base64,")) {
      try { const img = await pdf.embedPng(Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0))); const d = img.scaleToFit(220, 55); page.drawImage(img, { x: M, y: y - d.height, width: d.width, height: d.height }); y -= d.height + 2; } catch { /* ignore */ }
    }
    page.drawLine({ start: { x: M, y }, end: { x: M + 260, y }, thickness: 0.5, color: MUTED }); y -= 4;
    text(`${name}   ·   ${date}`, { size: 9 }); gap(6);
  };
  await drawSig("Purchaser signature", sig.image, sig.typed_name ?? "", sig.signed_at ? new Date(sig.signed_at).toUTCString() : "");
  const cs = pa.countersignature ?? {};
  await drawSig("For Texas Cemetery Brokers (Broker)", cs.image, cs.name ? `${cs.name}, authorized representative` : "", cs.signed_at ? new Date(cs.signed_at).toUTCString() : "");

  page = pdf.addPage([W, H]); y = H - M;
  text("CERTIFICATE OF ELECTRONIC SIGNATURE", { size: 13, font: bold, color: SAGE }); rule();
  kv("Agreement ID", pa.id); kv("Terms version", pa.terms_version); kv("Document SHA-256", pa.document_hash ?? "");
  kv("Purchaser", `${sig.typed_name ?? ""} <${f.purchaser.email}>`); kv("Signed (UTC)", sig.signed_at ?? ""); kv("IP address", sig.ip ?? ""); kv("Device", sig.user_agent ?? "");
  kv("E-sign consent", sig.esign_consent_at ? `Accepted ${sig.esign_consent_at}` : ""); kv("Countersigned by", cs.name ? `${cs.name} (${cs.signed_at})` : "");
  gap(6); text("Event log", { font: bold, size: 10 });
  for (const e of (pa.events ?? []) as any[]) text(`${e.at}  ${e.type}${e.by ? ` — ${e.by}` : ""}${e.ip ? ` — IP ${e.ip}` : ""}`, { size: 8.5 });
  gap(6); text(`Consent text: ${ESIGN_CONSENT}`, { size: 8, color: MUTED });
  const pages = pdf.getPages();
  pages.forEach((p, i) => p.drawText(`Texas Cemetery Brokers — Purchase Agreement — Page ${i + 1} of ${pages.length}`, { x: M, y: 28, size: 7.5, font: reg, color: MUTED }));
  return await pdf.save();
}

// ---------------- schemas ----------------
const str = (max = 300) => z.string().max(max).optional().default("");
const FieldsSchema = z.object({
  purchaser: z.object({ names: str(200), address: str(400), phone: str(60), email: str(200), dob: str(40), marital_status: str(40) }),
  property: z.object({ cemetery: str(200), city: str(100), description: str(800), spaces: z.coerce.number().int().min(1).max(50), property_type: str(120), commodities: str(800) }),
  deed: z.object({ same_as_purchaser: z.boolean(), holder1: str(200), holder2: str(200), names: str(200), address: str(400), phone: str(60), email: str(200), dob: str(40), marital_status: str(40) }),
  charges: z.object({ deposit: z.coerce.number().min(0).max(5_000_000), balance: z.coerce.number().min(0).max(5_000_000), transfer_fee: z.coerce.number().min(0).max(1_000_000), adjustments: z.coerce.number().min(-1_000_000).max(1_000_000), adjustments_note: str(200) }),
});

const PUBLIC_VIEW = (pa: any) => ({
  id: pa.id, status: pa.status, fields: normalizeFields(pa.fields), terms_version: pa.terms_version,
  buyer_signed_at: pa.buyer_signed_at, countersigned_at: pa.countersigned_at, paid_at: pa.paid_at,
  payment_url: pa.status === "countersigned" ? pa.payment_url : null,
});

async function load(id: string) {
  const { data } = await db.from("purchase_agreements").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!data) throw new Error("Purchase agreement not found");
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // ================= PUBLIC (token) =================
    if (["get", "sign", "download"].includes(action)) {
      const token = z.string().min(20).max(80).parse(body.token);
      const { data: pa } = await db.from("purchase_agreements").select("*").eq("sign_token", token).is("deleted_at", null).maybeSingle();
      if (!pa || pa.status === "draft") return json({ error: "This link is not valid. Please contact Texas Cemetery Brokers." }, 404);
      if (pa.status === "void") return json({ error: "This purchase agreement has been withdrawn. Please contact Texas Cemetery Brokers on (214) 230-4740." }, 410);

      if (action === "get") {
        if (pa.status === "sent") {
          await db.from("purchase_agreements").update({ status: "viewed", viewed_at: nowIso(), events: [...pa.events, event("viewed", { ip: clientIp(req) })] }).eq("id", pa.id);
          pa.status = "viewed";
        }
        return json(PUBLIC_VIEW(pa));
      }
      if (action === "download") {
        if (!pa.signed_pdf_path) return json({ error: "The executed copy is available once we countersign." }, 409);
        const { data } = await db.storage.from("contracts").createSignedUrl(pa.signed_pdf_path, 600);
        return json({ url: data?.signedUrl });
      }
      // sign
      if (!["sent", "viewed"].includes(pa.status)) return json({ error: "This agreement has already been signed." }, 409);
      const S = z.object({
        purchaser: z.object(Object.fromEntries(BUYER_EDITABLE.purchaser.map((k) => [k, str(400)]))),
        deed: z.object({ same_as_purchaser: z.boolean(), holder2: str(200), names: str(200), address: str(400), phone: str(60), email: str(200), dob: str(40), marital_status: str(40) }),
        typed_name: z.string().trim().min(2).max(200),
        signature: z.string().startsWith("data:image/png;base64,").max(400_000),
        initials: z.object({ rules: z.string().trim().min(1).max(6), verification: z.string().trim().min(1).max(6) }),
        esign_consent: z.literal(true), read_terms: z.literal(true), cancellation_read: z.literal(true),
        hash_seen: z.string().length(64),
      }).parse(body);
      const f = normalizeFields(pa.fields);
      Object.assign(f.purchaser, S.purchaser);
      Object.assign(f.deed, S.deed);
      if (!f.purchaser.address.trim()) return json({ error: "Please enter your address." }, 400);
      if (!f.deed.same_as_purchaser && !f.deed.names.trim()) return json({ error: "Please enter the name(s) to go on the deed." }, 400);
      // The buyer must be signing the exact text staff issued (plus their own entries).
      const issuedHash = await sha256(canonicalDocument(normalizeFields(pa.fields), pa.terms_version));
      if (issuedHash !== S.hash_seen) return json({ error: "This agreement was updated while you had it open. Please reload the page to review the latest version." }, 409);
      if (!f.deed.same_as_purchaser) f.deed.holder1 = f.deed.names;
      const signedAt = nowIso(); const ip = clientIp(req); const ua = req.headers.get("user-agent")?.slice(0, 300) ?? "";
      const hash = await sha256(canonicalDocument(f, pa.terms_version) + `|${S.typed_name}|${signedAt}`);
      const buyer_signature = { typed_name: S.typed_name, image: S.signature, initials: S.initials, signed_at: signedAt, ip, user_agent: ua, esign_consent_at: signedAt, email: f.purchaser.email };
      const events = [...pa.events, event("esign_consent", { ip }), event("buyer_signed", { by: S.typed_name, ip })];
      const { error } = await db.from("purchase_agreements").update({ fields: f, status: "buyer_signed", buyer_signed_at: signedAt, buyer_signature, document_hash: hash, events })
        .eq("id", pa.id).in("status", ["sent", "viewed"]);
      if (error) throw error;
      await db.rpc("notify_staff", { _title: `${f.purchaser.names || "A buyer"} signed a purchase agreement`, _body: `${f.property.cemetery} — ready for your countersignature.`, _submission_id: pa.buyer_submission_id, _source_type: "purchase_agreement_signed" });
      try {
        if (f.purchaser.email) await sendEmail({ to: f.purchaser.email, submissionId: pa.buyer_submission_id, snippet: "Purchase agreement signed — awaiting countersignature.",
          subject: `We received your signed purchase agreement — ${f.property.cemetery}`,
          html: shell(`<p>Dear ${esc(f.purchaser.names.split(/\s+/)[0] || "there")},</p><p>Thank you — we have received your signed purchase agreement.</p>${summaryTable(f)}<p>Our team will countersign it shortly. You will then receive the fully executed agreement as a PDF together with a secure card payment link.</p><p style="font-size:13px;color:#6b5f55;">Signed ${esc(new Date(signedAt).toUTCString())}. Document fingerprint (SHA-256): ${esc(hash)}</p>`, "purchase_agreement") });
      } catch (e) { console.warn("buyer confirmation email failed", e); }
      return json({ ok: true, status: "buyer_signed" });
    }

    // ================= STAFF =================
    const user = await staffUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    if (action === "create") {
      const B = z.object({ seller_submission_id: z.string().uuid(), buyer_submission_id: z.string().uuid(), fields: FieldsSchema }).parse(body);
      if (B.seller_submission_id === B.buyer_submission_id) return json({ error: "A record cannot be matched to itself." }, 400);
      const { data: existing } = await db.from("purchase_agreements").select("id").eq("seller_submission_id", B.seller_submission_id).eq("buyer_submission_id", B.buyer_submission_id).neq("status", "void").is("deleted_at", null).maybeSingle();
      if (existing) return json({ error: "This buyer is already matched to this seller.", id: existing.id }, 409);
      const { data, error } = await db.from("purchase_agreements").insert({
        seller_submission_id: B.seller_submission_id, buyer_submission_id: B.buyer_submission_id, fields: B.fields,
        terms_version: TERMS_VERSION, created_by: user.id, events: [event("matched", { by: user.name })],
      }).select("*").single();
      if (error) throw error;
      return json({ agreement: data });
    }

    const id = z.string().uuid().parse(body.id);
    const pa = await load(id);

    if (action === "update") {
      if (!["draft", "sent", "viewed"].includes(pa.status)) return json({ error: "The buyer has signed — void and re-issue to change terms." }, 409);
      const fields = FieldsSchema.parse(body.fields);
      const { data, error } = await db.from("purchase_agreements").update({ fields, events: [...pa.events, event("edited", { by: user.name })] }).eq("id", id).select("*").single();
      if (error) throw error;
      return json({ agreement: data });
    }

    if (action === "link" || action === "send") {
      if (!["draft", "sent", "viewed"].includes(pa.status)) return json({ error: "This agreement is already signed." }, 409);
      const f = normalizeFields(pa.fields);
      if (!f.purchaser.names.trim()) return json({ error: "Add the purchaser's name first." }, 400);
      if (chargeTotals(f.charges).totalDue <= 0) return json({ error: "Set the price before sending." }, 400);
      if (!f.property.description.trim()) return json({ error: "Add the property description (section, lot, space) first." }, 400);
      const token = pa.sign_token ?? newToken();
      const signUrl = `${SITE}/purchase-agreement/${token}`;
      const to = z.string().email().parse(body.to || f.purchaser.email);
      let ev = event(action === "send" ? "emailed" : "link_issued", { by: user.name, to });
      if (action === "send") {
        const sample = body.sample === true;
        let deedUrl: string | undefined; let deedBytes: Uint8Array | undefined;
        if (typeof body.deed_image_path === "string" && body.deed_image_path) {
          const path = z.string().max(300).regex(/^purchase-agreements\/[\w-]+\/[\w.-]+\.(jpe?g|png)$/).parse(body.deed_image_path);
          const dl = await db.storage.from("contracts").download(path); if (dl.error) throw dl.error;
          deedBytes = new Uint8Array(await dl.data.arrayBuffer());
          deedUrl = (await db.storage.from("contracts").createSignedUrl(path, 60 * 60 * 24 * 60)).data?.signedUrl;
          ev = { ...ev, deed_copy_shared: path };
        }
        const html = inviteEmailHtml(f, signUrl, typeof body.note === "string" ? body.note.slice(0, 2000) : undefined, sample, deedUrl);
        await sendEmail({ to, submissionId: pa.buyer_submission_id, snippet: "Purchase agreement sent for signature.",
          subject: `${sample ? "SAMPLE PURCHASE AGREEMENT — " : ""}Your purchase agreement — ${f.property.cemetery} — ready to sign`,
          html, ...(deedBytes ? { attachment: { name: "Deed-copy-owner-details-redacted.jpg", bytes: deedBytes, mime: "image/jpeg" } } : {}) });
        if (sample) ev = { ...ev, sample: true };
      }
      const { data } = await db.from("purchase_agreements").update({
        sign_token: token, sent_at: pa.sent_at ?? nowIso(), status: pa.status === "draft" ? "sent" : pa.status, events: [...pa.events, ev],
      }).eq("id", id).select("*").single();
      return json({ agreement: data, sign_url: signUrl });
    }

    if (action === "countersign") {
      if (pa.status !== "buyer_signed") return json({ error: "Only an agreement the buyer has signed can be countersigned." }, 409);
      const C = z.object({ signer_name: z.string().trim().min(2).max(200), signature: z.string().startsWith("data:image/png;base64,").max(400_000), environment: z.enum(["sandbox", "live"]) }).parse(body);
      const f = normalizeFields(pa.fields); const t = chargeTotals(f.charges);
      const signedAt = nowIso();
      const countersignature = { name: C.signer_name, image: C.signature, signed_at: signedAt, user_id: user.id, ip: clientIp(req) };
      const events = [...pa.events, event("countersigned", { by: C.signer_name })];
      const draft = { ...pa, countersignature, countersigned_at: signedAt, events };
      const bytes = await buildPdf(draft);
      const path = `purchase-agreements/${pa.id}/executed-${Date.now()}.pdf`;
      const up = await db.storage.from("contracts").upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (up.error) throw up.error;

      // Card payment link for the Total Amount Due (same Stripe flow as other plot sales).
      const payRes = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-link`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
        body: JSON.stringify({ submissionId: pa.seller_submission_id, kind: "plot_sale", amountCents: Math.round(t.totalDue * 100),
          description: `Purchase of ${f.property.cemetery} — ${f.property.description}`.slice(0, 480), recipientEmail: f.purchaser.email,
          recipientName: f.purchaser.names, environment: C.environment, purchaseAgreementId: pa.id, buyerSubmissionId: pa.buyer_submission_id }),
      });
      const pay = await payRes.json().catch(() => ({}));
      if (!payRes.ok || !pay.url) throw new Error(`Payment link could not be created: ${JSON.stringify(pay).slice(0, 300)}`);
      events.push(event("payment_link_issued", { by: user.name, amount: t.totalDue, environment: C.environment }));

      await db.from("purchase_agreements").update({ countersignature, countersigned_at: signedAt, status: "countersigned", signed_pdf_path: path,
        payment_url: pay.url, payment_transaction_id: pay.transactionId ?? null, events }).eq("id", id);

      try {
        await sendEmail({ to: f.purchaser.email, submissionId: pa.buyer_submission_id, snippet: "Executed purchase agreement and payment link sent.",
          subject: `Your completed purchase agreement and payment link — ${f.property.cemetery}`,
          attachment: { name: "Texas-Cemetery-Brokers-Purchase-Agreement.pdf", bytes },
          html: shell(`<p>Dear ${esc(f.purchaser.names.split(/\s+/)[0] || "there")},</p><p>Your purchase agreement has now been countersigned by Texas Cemetery Brokers. The fully executed copy is attached for your records.</p>${summaryTable(f)}<p>To complete your purchase, please pay the total amount due using the secure card payment link below.</p>${button(pay.url, `Pay ${money(t.totalDue)} securely`)}<p style="font-size:13px;color:#6b5f55;">Once your payment clears we will file the transfer with the cemetery and keep you updated. You may also pay by certified check or wire — just reply and we will send the details.</p>`, "purchase_agreement") });
      } catch (e) {
        console.error("executed copy email failed", e);
        return json({ ok: true, warning: `Countersigned and payment link created, but the email failed: ${(e as Error).message}`, payment_url: pay.url });
      }
      return json({ ok: true, payment_url: pay.url });
    }

    if (action === "resend_executed") {
      if (!pa.signed_pdf_path || !pa.payment_url) return json({ error: "Not countersigned yet." }, 409);
      const f = normalizeFields(pa.fields); const t = chargeTotals(f.charges);
      const { data: file } = await db.storage.from("contracts").download(pa.signed_pdf_path);
      await sendEmail({ to: f.purchaser.email, submissionId: pa.buyer_submission_id, snippet: "Payment link re-sent.",
        subject: `Reminder: payment link for your purchase — ${f.property.cemetery}`,
        attachment: file ? { name: "Texas-Cemetery-Brokers-Purchase-Agreement.pdf", bytes: new Uint8Array(await file.arrayBuffer()) } : undefined,
        html: shell(`<p>Dear ${esc(f.purchaser.names.split(/\s+/)[0] || "there")},</p><p>Here is your executed purchase agreement and the secure payment link again.</p>${summaryTable(f)}${button(pa.payment_url, `Pay ${money(t.totalDue)} securely`)}`, "purchase_agreement") });
      await db.from("purchase_agreements").update({ events: [...pa.events, event("payment_link_resent", { by: user.name })] }).eq("id", id);
      return json({ ok: true });
    }

    if (action === "pdf") {
      if (pa.signed_pdf_path) {
        const { data } = await db.storage.from("contracts").createSignedUrl(pa.signed_pdf_path, 600);
        return json({ url: data?.signedUrl });
      }
      const bytes = await buildPdf(pa);
      let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b)));
      return json({ base64: btoa(bin) });
    }

    if (action === "void") {
      if (pa.status === "paid") return json({ error: "A paid agreement cannot be voided here — issue a refund instead." }, 409);
      const reason = z.string().trim().min(2).max(500).parse(body.reason);
      await db.from("purchase_agreements").update({ status: "void", voided_at: nowIso(), void_reason: reason, events: [...pa.events, event("voided", { by: user.name, reason })] }).eq("id", id);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("purchase-agreement error", e);
    const msg = e instanceof z.ZodError ? "Please complete every required field." : String((e as Error)?.message ?? e);
    return json({ error: msg, details: e instanceof z.ZodError ? e.flatten() : undefined }, e instanceof z.ZodError ? 400 : 500);
  }
});
