// Bayer Guaranteed Sale — Exclusive Right-to-Sell Agreement.
// Renders a full printable HTML contract (for online viewing) and a PDF
// (for attachment) from the same GuaranteeOfferInput used in the email.

import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import type { GuaranteeOfferInput, OfferTier } from "./guarantee-offer.ts";

const esc = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm} / ${dd} / ${d.getFullYear()}`;
}

export function renderContractHtml(i: GuaranteeOfferInput): string {
  const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const today = todayISO();
  const tiers = i.tiers.map((t, idx) => `
    <tr>
      <td style="border:1px solid #cbd5e1;padding:10px 12px;vertical-align:top;width:24px;">☐</td>
      <td style="border:1px solid #cbd5e1;padding:10px 12px;vertical-align:top;">
        <p style="margin:0;font-weight:700;">Option ${idx + 1}: ${esc(t.name)}</p>
        <p style="margin:4px 0 0;color:#334155;font-size:13px;">${esc(t.timeframe)}</p>
        <p style="margin:4px 0 0;color:#475569;font-size:13px;">${esc(t.description)}</p>
      </td>
      <td style="border:1px solid #cbd5e1;padding:10px 12px;vertical-align:top;text-align:right;font-weight:700;white-space:nowrap;">${esc(t.amount)}</td>
    </tr>`).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Exclusive Right-to-Sell Agreement — ${esc(i.cemeteryName)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;background:#eef2ff;font-family:${sans};color:#0f172a;}
  .page{max-width:820px;margin:24px auto;background:#fff;padding:48px 56px;border-radius:8px;box-shadow:0 8px 30px rgba(30,58,138,0.12);}
  h1{font-size:22px;margin:0 0 4px;letter-spacing:-0.01em;}
  h2{font-size:14px;margin:28px 0 10px;text-transform:uppercase;letter-spacing:.14em;color:#1e3a8a;}
  p{font-size:13.5px;line-height:1.65;color:#1f2937;margin:0 0 10px;}
  .meta{color:#64748b;font-size:12px;margin-bottom:20px;}
  .grid{display:grid;grid-template-columns:180px 1fr;gap:6px 16px;font-size:13.5px;margin:12px 0 18px;}
  .grid dt{color:#64748b;}
  .grid dd{margin:0;color:#0f172a;font-weight:600;}
  table{width:100%;border-collapse:collapse;margin:8px 0 20px;font-size:13px;}
  .sig{display:flex;gap:32px;margin-top:36px;}
  .sig div{flex:1;border-top:1px solid #94a3b8;padding-top:6px;font-size:12px;color:#475569;}
  .print{position:fixed;top:16px;right:16px;background:#1e3a8a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;}
  @media print{.print{display:none;}body{background:#fff;}.page{box-shadow:none;margin:0;border-radius:0;}}
</style></head><body>
<a class="print" href="javascript:window.print()">Print / Save PDF</a>
<div class="page">
  <p style="text-transform:uppercase;letter-spacing:.22em;color:#1e3a8a;font-weight:800;font-size:11px;margin:0 0 4px;">Bayer Cemetery Brokers</p>
  <h1>Exclusive Right-to-Sell Agreement &amp; Instruction to Broker</h1>
  <p class="meta">Prepared ${today} · Bayer Cemetery Brokers · 12277 Apple Valley Rd, PMB 449, Apple Valley, CA 92308-1701</p>

  <p>This Agreement (the "Agreement") is made effective ${today} (the "Execution Date") by and between <strong>Bayer Cemetery Brokers</strong>, a licensed Cemetery Broker (the "Broker"), and the Seller identified below.</p>

  <h2>Parties &amp; Property</h2>
  <dl class="grid">
    <dt>Seller</dt><dd>${esc(i.recipientName)}</dd>
    <dt>Cemetery</dt><dd>${esc(i.cemeteryName)}, ${esc(i.cemeteryLocation)}</dd>
    <dt>Property description</dt><dd>${esc(i.propertyDescription)}</dd>
    <dt>Number of plots</dt><dd>${esc(i.numberOfPlots)}</dd>
    <dt>Acceptance deadline</dt><dd>${esc(i.acceptDeadline)}</dd>
  </dl>

  <h2>Section 1 · Payment Option Selection</h2>
  <p>Seller shall select ONE payment option below. Each option represents a firm, written Guaranteed Net Payment to the Seller. If a private buyer is not secured within the timeframe of the selected option, Broker agrees to purchase the property directly at the stated Guaranteed Net Payment.</p>
  <table>
    <thead><tr>
      <th style="border:1px solid #cbd5e1;padding:8px;background:#f1f5f9;text-align:left;">Select</th>
      <th style="border:1px solid #cbd5e1;padding:8px;background:#f1f5f9;text-align:left;">Option</th>
      <th style="border:1px solid #cbd5e1;padding:8px;background:#f1f5f9;text-align:right;">Guaranteed Net</th>
    </tr></thead>
    <tbody>${tiers}</tbody>
  </table>

  <h2>Section 2 · Cemetery-Imposed Costs</h2>
  <p>Broker shall cover mandatory third-party cemetery-imposed costs (including transfer fees and endowment care upgrades) up to <strong>${esc(i.transferFeeCoverage)}</strong>. These costs are set by the Cemetery Authority and are outside the Broker's control.</p>

  <h2>Section 3 · Payment Timeline</h2>
  <p>Broker shall remit the Guaranteed Net Payment to the Seller within <strong>${esc(i.paymentTimeline)}</strong>.</p>

  <h2>Section 4 · Agreement Commitment</h2>
  <p><strong>Option A — Standard Agreement:</strong> Seller pays a ${esc(i.option1Fee)} one-time, non-refundable Agreement fee. Seller may cancel at any time with ten (10) days written notice.</p>
  <p><strong>Option B — Zero Upfront Cost:</strong> No upfront fee. An early cancellation fee of ${esc(i.option2CancelFee)} applies if the Agreement is cancelled by the Seller before ${esc(i.option2MinTerm)}.</p>

  <h2>Section 5 · Exclusivity, Duties &amp; Risk</h2>
  <p>Seller grants Broker the exclusive right to market and sell the Interment Property. Seller shall promptly provide proof of ownership, notarised transfer documents and any additional documentation reasonably required by the Broker or Cemetery Authority. Broker absorbs all market risk for any shortfall between the eventual sale price and the Guaranteed Net Payment for the selected option, subject only to adjustments for verified increases in Cemetery-Imposed Costs beyond the amount stated in Section 2.</p>

  <h2>Section 6 · Miscellaneous</h2>
  <p>This Agreement shall be governed by the laws of the State of California. It constitutes the entire Agreement between the parties and supersedes any prior oral or written agreements. The Agreement may be executed by electronic signature and delivered in counterparts, each of which shall be deemed an original.</p>

  <div class="sig">
    <div><strong>Seller</strong><br>${esc(i.recipientName)}<br>Signature: ______________________<br>Date: __ / __ / ____</div>
    <div><strong>Broker</strong><br>${esc(i.agentName)}, ${esc(i.agentTitle)}<br>Bayer Cemetery Brokers<br>Signature: ______________________<br>Date: __ / __ / ____</div>
  </div>
</div>
</body></html>`;
}

// ---------- PDF ----------

export async function renderContractPdf(i: GuaranteeOfferInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const pageW = 612; // 8.5in @ 72dpi
  const pageH = 792; // 11in
  const marginX = 56;
  const marginTop = 60;
  const marginBottom = 60;
  const contentW = pageW - marginX * 2;
  const navy = rgb(30 / 255, 58 / 255, 138 / 255);
  const ink = rgb(15 / 255, 23 / 255, 42 / 255);
  const grey = rgb(0.36, 0.4, 0.48);
  const line = rgb(0.8, 0.85, 0.92);

  let page = doc.addPage([pageW, pageH]);
  let y = pageH - marginTop;

  function newPage() {
    page = doc.addPage([pageW, pageH]);
    y = pageH - marginTop;
  }
  function ensure(minSpace: number) {
    if (y - minSpace < marginBottom) newPage();
  }
  function wrap(text: string, f: any, size: number, maxWidth: number): string[] {
    const words = String(text || "").split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      const width = f.widthOfTextAtSize(test, size);
      if (width <= maxWidth) { cur = test; } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function draw(text: string, opts: { f?: any; size?: number; color?: any; leading?: number; indent?: number; maxWidth?: number } = {}) {
    const f = opts.f || font;
    const size = opts.size || 11;
    const leading = opts.leading || size * 1.4;
    const color = opts.color || ink;
    const indent = opts.indent || 0;
    const maxWidth = (opts.maxWidth || contentW) - indent;
    const lines = wrap(text, f, size, maxWidth);
    for (const ln of lines) {
      ensure(leading);
      page.drawText(ln, { x: marginX + indent, y: y - size, size, font: f, color });
      y -= leading;
    }
  }
  function h1(text: string) {
    ensure(28);
    y -= 4;
    page.drawText(text, { x: marginX, y: y - 16, size: 16, font: bold, color: ink });
    y -= 22;
  }
  function h2(text: string) {
    ensure(24);
    y -= 8;
    page.drawText(text.toUpperCase(), { x: marginX, y: y - 10, size: 10, font: bold, color: navy });
    y -= 14;
    page.drawLine({ start: { x: marginX, y }, end: { x: marginX + contentW, y }, thickness: 0.5, color: line });
    y -= 10;
  }
  function kv(k: string, v: string) {
    ensure(16);
    page.drawText(k, { x: marginX, y: y - 11, size: 10, font: font, color: grey });
    const lines = wrap(v, bold, 11, contentW - 150);
    for (let i2 = 0; i2 < lines.length; i2++) {
      if (i2 > 0) ensure(14);
      page.drawText(lines[i2], { x: marginX + 150, y: y - 11, size: 11, font: bold, color: ink });
      if (i2 < lines.length - 1) y -= 14;
    }
    y -= 16;
  }

  // Header
  page.drawText("BAYER CEMETERY BROKERS", { x: marginX, y: y - 10, size: 10, font: bold, color: navy });
  y -= 16;
  h1("Exclusive Right-to-Sell Agreement");
  draw(`Prepared ${todayISO()} · 12277 Apple Valley Rd, PMB 449, Apple Valley, CA 92308-1701`, { f: italic, size: 9, color: grey, leading: 14 });
  y -= 4;
  draw(`This Agreement (the "Agreement") is made effective ${todayISO()} (the "Execution Date") by and between Bayer Cemetery Brokers, a licensed Cemetery Broker (the "Broker"), and the Seller identified below.`, { size: 11, leading: 16 });

  h2("Parties & Property");
  kv("Seller", i.recipientName);
  kv("Cemetery", `${i.cemeteryName}, ${i.cemeteryLocation}`);
  kv("Property", i.propertyDescription);
  kv("Number of plots", i.numberOfPlots);
  kv("Acceptance deadline", i.acceptDeadline);

  h2("Section 1 · Payment Option Selection");
  draw("Seller shall select ONE payment option below. Each option is a firm, written Guaranteed Net Payment to the Seller. If a private buyer is not secured within the timeframe of the selected option, Broker agrees to purchase the property directly at the stated Guaranteed Net Payment.", { size: 10.5, leading: 15 });
  y -= 4;
  i.tiers.forEach((t: OfferTier, idx: number) => {
    ensure(70);
    // box
    const boxTop = y;
    const boxH = 62;
    page.drawRectangle({ x: marginX, y: y - boxH, width: contentW, height: boxH, borderColor: line, borderWidth: 0.7, color: rgb(0.98, 0.98, 1) });
    // checkbox
    page.drawRectangle({ x: marginX + 10, y: boxTop - 22, width: 10, height: 10, borderColor: navy, borderWidth: 0.8 });
    // name
    page.drawText(`Option ${idx + 1}: ${t.name}`, { x: marginX + 30, y: boxTop - 20, size: 11, font: bold, color: ink });
    // amount
    const amtW = bold.widthOfTextAtSize(t.amount, 12);
    page.drawText(t.amount, { x: marginX + contentW - amtW - 12, y: boxTop - 20, size: 12, font: bold, color: navy });
    // timeframe
    page.drawText(t.timeframe, { x: marginX + 30, y: boxTop - 34, size: 9.5, font: italic, color: grey });
    // description (single wrapped line)
    const descLines = wrap(t.description, font, 9.5, contentW - 44);
    page.drawText(descLines[0] || "", { x: marginX + 30, y: boxTop - 48, size: 9.5, font: font, color: ink });
    if (descLines[1]) {
      page.drawText(descLines[1], { x: marginX + 30, y: boxTop - 58, size: 9.5, font: font, color: ink });
    }
    y -= boxH + 8;
  });

  h2("Section 2 · Cemetery-Imposed Costs");
  draw(`Broker shall cover mandatory third-party cemetery-imposed costs (including transfer fees and endowment care upgrades) up to ${i.transferFeeCoverage}. These costs are set by the Cemetery Authority and are outside the Broker's control.`, { size: 11, leading: 16 });

  h2("Section 3 · Payment Timeline");
  draw(`Broker shall remit the Guaranteed Net Payment to the Seller within ${i.paymentTimeline}.`, { size: 11, leading: 16 });

  h2("Section 4 · Agreement Commitment");
  draw(`Option A — Standard Agreement: Seller pays a ${i.option1Fee} one-time, non-refundable Agreement fee. Seller may cancel at any time with ten (10) days written notice.`, { size: 11, leading: 16 });
  draw(`Option B — Zero Upfront Cost: No upfront fee. An early cancellation fee of ${i.option2CancelFee} applies if the Agreement is cancelled by the Seller before ${i.option2MinTerm}.`, { size: 11, leading: 16 });

  h2("Section 5 · Exclusivity, Duties & Risk");
  draw("Seller grants Broker the exclusive right to market and sell the Interment Property. Seller shall promptly provide proof of ownership, notarised transfer documents and any additional documentation reasonably required by the Broker or Cemetery Authority. Broker absorbs all market risk for any shortfall between the eventual sale price and the Guaranteed Net Payment for the selected option, subject only to adjustments for verified increases in Cemetery-Imposed Costs beyond the amount stated in Section 2.", { size: 11, leading: 16 });

  h2("Section 6 · Miscellaneous");
  draw("This Agreement shall be governed by the laws of the State of California. It constitutes the entire Agreement between the parties and supersedes any prior oral or written agreements. The Agreement may be executed by electronic signature and delivered in counterparts, each of which shall be deemed an original.", { size: 11, leading: 16 });

  // Signature block
  ensure(120);
  y -= 20;
  page.drawLine({ start: { x: marginX, y }, end: { x: marginX + 220, y }, thickness: 0.6, color: grey });
  page.drawLine({ start: { x: marginX + 260, y }, end: { x: marginX + 260 + 220, y }, thickness: 0.6, color: grey });
  y -= 12;
  page.drawText("Seller Signature", { x: marginX, y, size: 9, font: font, color: grey });
  page.drawText("Broker Signature", { x: marginX + 260, y, size: 9, font: font, color: grey });
  y -= 14;
  page.drawText(i.recipientName, { x: marginX, y, size: 11, font: bold, color: ink });
  page.drawText(i.agentName, { x: marginX + 260, y, size: 11, font: bold, color: ink });
  y -= 14;
  page.drawText("Date: __ / __ / ____", { x: marginX, y, size: 10, font: font, color: grey });
  page.drawText(`${i.agentTitle}`, { x: marginX + 260, y, size: 9, font: italic, color: grey });

  const bytes = await doc.save();
  return bytes;
}

// Base64 encode Uint8Array (Deno)
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}
