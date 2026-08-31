// Shared PDF-fill logic used by generate-contract and sign-contract (refresh mode).
// Field coordinates were measured directly from the template PDFs by detecting the
// underline rects; every stamp sits ~3pt above the printed line so the baseline
// visually rests on the rule (matching how a person would hand-write into the blank).
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'npm:pdf-lib@1.17.1';

export interface FillData {
  seller_name: string;
  co_owner_name?: string;
  address?: string;
  city_state_zip?: string;
  phone?: string;
  email?: string;
  cemetery?: string;
  county_state?: string;
  plot_count?: number | string;
  plot_description?: string;
  authorized_min_per_plot?: number;
  authorized_min_total?: number;
  listing_option?: string;
  quote_amount?: number;
  retail_price?: number;
  transfer_fee?: number;
}

// Restrained palette to match the printed contract: dark text, light rules, no UI-like color blocks.
const INK = rgb(0.08, 0.08, 0.08);
const MUTED = rgb(0.28, 0.28, 0.28);
const HAIRLINE = rgb(0.68, 0.68, 0.68);

// Every filled blank uses the same size + font so the document feels uniform.
const FIELD_SIZE = 10.5;
const FIELD_X = 210;         // 5pt right of the underline start (x0 = 204.7)
const FIELD_BASELINE_OFFSET = 2.2; // pt above the underline y

function money(n?: number | null): string {
  if (n == null || Number.isNaN(Number(n))) return '';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function stamp(page: PDFPage, text: string, x: number, lineY: number, font: PDFFont, size = FIELD_SIZE, color = INK) {
  if (text == null || text === '') return;
  page.drawText(String(text), { x, y: lineY + FIELD_BASELINE_OFFSET, size, font, color });
}

/** Draw an X-mark inside the template's ~14x14 checkbox at bottom-left (x, y). */
function checkBox(page: PDFPage, x: number, y: number, bold: PDFFont) {
  const size = 10.5;
  const box = 14.3;
  const glyphW = bold.widthOfTextAtSize('X', size);
  page.drawText('X', {
    x: x + (box - glyphW) / 2,
    y: y + (box - size) / 2 + 0.7,
    size,
    font: bold,
    color: INK,
  });
}

/** Wrap by width using font metrics, so long descriptions never overflow. */
function wrapToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) cur = trial;
    else { if (cur) out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}

// ---------- LISTING AGREEMENT ----------
// Underline rect y (from template): name 445.5, addr 419.3, csz 393.0, tel 366.8,
// email 340.5, cemetery 258.8, plots 232.5, desc line 1 206.3, desc line 2 169.5.
const LA_P1 = {
  seller_name: 445.5, address: 419.3, city_state_zip: 393.0,
  phone: 366.8, email: 340.5,
  cemetery: 258.8, plots: 232.5,
  desc1: 206.3, desc2: 169.5,
} as const;

// Page 2 (LA): option checkbox origins + authorized-min rects.
// Checkbox vector rects measured from template: x0≈67.1, w≈14.3, h≈14.3.
// Bottoms (pdf-lib): Starter 710.6, Pro 635.6, Featured 560.6.
const LA_P2 = {
  optStarter: { x: 67.1, y: 710.6 },
  optPro: { x: 67.1, y: 635.6 },
  optFeatured: { x: 67.1, y: 560.6 },
  authPerPlot: { x: 215, y: 381.8, width: 76 },     // rect [209.2..291.7]
  authTotal: { x: 407, y: 381.8, width: 77 },       // rect [402.0..484.5]
} as const;

function buildLaOverlays(page1: PDFPage, page2: PDFPage, font: PDFFont, bold: PDFFont, data: FillData) {
  stamp(page1, data.seller_name ?? '', FIELD_X, LA_P1.seller_name, font);
  stamp(page1, data.address ?? '', FIELD_X, LA_P1.address, font);
  stamp(page1, data.city_state_zip ?? '', FIELD_X, LA_P1.city_state_zip, font);
  stamp(page1, data.phone ?? '', FIELD_X, LA_P1.phone, font);
  stamp(page1, data.email ?? '', FIELD_X, LA_P1.email, font);

  stamp(page1, data.cemetery ?? '', FIELD_X, LA_P1.cemetery, font);
  stamp(page1, data.plot_count ? String(data.plot_count) : '', FIELD_X, LA_P1.plots, font);
  const desc = data.plot_description ?? '';
  if (desc) {
    const lines = wrapToWidth(desc, font, FIELD_SIZE, 330);
    if (lines[0]) stamp(page1, lines[0], FIELD_X, LA_P1.desc1, font);
    if (lines[1]) stamp(page1, lines.slice(1).join(' '), FIELD_X, LA_P1.desc2, font, 10);
  }

  const opt = (data.listing_option ?? '').toLowerCase();
  if (opt.includes('starter') || opt === 'option 1') checkBox(page2, LA_P2.optStarter.x, LA_P2.optStarter.y, bold);
  else if (opt.includes('pro') || opt === 'option 2') checkBox(page2, LA_P2.optPro.x, LA_P2.optPro.y, bold);
  else if (opt.includes('featured') || opt.includes('own price') || opt.includes('own_price') || opt.includes('set your') || opt.includes('set_your') || opt === 'option 3' || opt === 'option 4') {
    // "Set your own price" is the Featured package with a seller-set minimum,
    // so it simply ticks Featured — the seller's figure lands on the
    // authorized-minimum lines below instead of being written over the label.
    checkBox(page2, LA_P2.optFeatured.x, LA_P2.optFeatured.y, bold);
  }


  if (data.authorized_min_per_plot != null) {
    const s = Number(data.authorized_min_per_plot).toLocaleString('en-US');
    // Left-aligned just inside the underline so the value sits on the rule like the other fields.
    stamp(page2, s, LA_P2.authPerPlot.x + 2, LA_P2.authPerPlot.y, font);
  }
  if (data.authorized_min_total != null) {
    const s = Number(data.authorized_min_total).toLocaleString('en-US');
    stamp(page2, s, LA_P2.authTotal.x + 2, LA_P2.authTotal.y, font);
  }
}

// ---------- POWER OF ATTORNEY ----------
// Underline rect y (from template): name 416.3, addr 390.0, csz 363.8,
// cemetery 219.8, county 193.5, plots 167.3, desc 141.0.
const POA_P1 = {
  principal_name: 416.3, address: 390.0, city_state_zip: 363.8,
  cemetery: 219.8, county_state: 193.5, plots: 167.3, desc: 141.0,
} as const;

function buildPoaOverlays(page1: PDFPage, font: PDFFont, _bold: PDFFont, data: FillData) {
  stamp(page1, data.seller_name ?? '', FIELD_X, POA_P1.principal_name, font);
  stamp(page1, data.address ?? '', FIELD_X, POA_P1.address, font);
  stamp(page1, data.city_state_zip ?? '', FIELD_X, POA_P1.city_state_zip, font);
  stamp(page1, data.cemetery ?? '', FIELD_X, POA_P1.cemetery, font);
  // County is intentionally left blank on the POA: the county our records hold
  // is often wrong, and the notary acknowledgment must state the county where
  // the document is actually signed. The signer/notary completes it by hand.

  stamp(page1, data.plot_count ? String(data.plot_count) : '', FIELD_X, POA_P1.plots, font);
  const desc = data.plot_description ?? '';
  if (desc) {
    const lines = wrapToWidth(desc, font, FIELD_SIZE, 330);
    stamp(page1, lines.join(' '), FIELD_X, POA_P1.desc, font, lines.length > 1 ? 10 : FIELD_SIZE);
  }
}

// ---------- LISTING AGREEMENT BUYER-FEE CLAUSE ----------
// Written into the body of the agreement (immediately after the Sale Terms page)
// rather than tacked on at the end as an addendum, so it reads as part of the
// contract and the seller initials it alongside the rest of the terms.
const BUYER_FEE_BODY = [
  `4.1  Buyer's fee. In addition to the purchase price for the Property, the buyer shall pay Texas Cemetery Brokers LLC (the "Broker") a buyer's fee equal to fifteen percent (15%) of the purchase price, for handling the purchase, the transfer paperwork and coordination with the cemetery.`,
  `4.2  Charged to the buyer. The buyer's fee is charged to and collected from the buyer. It is separate from, and in addition to, the Broker's commission payable by the Seller under this Agreement, and it is not deducted from the Seller's proceeds.`,
  `4.3  Other buyer-paid amounts. The buyer also remains responsible for the cemetery's transfer fee and any other cemetery charges, together with any administrative, documentary, notarial, statutory or third-party charges properly billed to the buyer, and any optional buyer services the buyer elects. The buyer's total at closing will therefore exceed the purchase price on which the Seller's proceeds are calculated.`,
  `4.4  No change to Seller's proceeds. Nothing in this Section alters the price, commission or net proceeds agreed with the Seller elsewhere in this Agreement.`,
];

/** Page index of the generated Sale Terms page inside a filled listing agreement. */
export const SALE_TERMS_PAGE_INDEX = 2;
/** Underline geometry of the Sale Terms "Seller's initials:" / "Date:" rules. */
export const SALE_TERMS_INITIALS_X = 140;
export const SALE_TERMS_INITIALS_W = 90;
export const SALE_TERMS_DATE_X = 295;
export const SALE_TERMS_DATE_W = 105;

/** Baseline of the Sale Terms initials/date labels. The body text is static, so
 *  this is fully deterministic given the body font — the signer stamps the same
 *  line the generator drew, instead of a coordinate measured against an old
 *  template that has since shifted. */
export function saleTermsInitialsY(font: PDFFont): number {
  let y = 668;
  for (const text of BUYER_FEE_BODY) {
    y -= 15 * wrapToWidth(text, font, 10.5, 612 - 100).length;
    y -= 12;
  }
  y -= 10;   // spacer before the Seller line
  y -= 18;   // Seller line -> Property line
  y -= 42;   // Property line -> initials block
  return y;
}

function insertBuyerFeeClause(pdf: PDFDocument, font: PDFFont, bold: PDFFont, data: FillData) {
  const page = pdf.getPageCount() >= 3 ? pdf.insertPage(SALE_TERMS_PAGE_INDEX, [612, 792]) : pdf.addPage([612, 792]);
  const { width } = page.getSize();

  page.drawText('LISTING AGREEMENT (CONTINUED)', { x: 50, y: 740, size: 9, font: bold, color: MUTED });
  page.drawText("Sale Terms — Buyer's Fee and Buyer-Paid Costs", { x: 50, y: 712, size: 15, font: bold, color: INK });
  page.drawLine({ start: { x: 50, y: 700 }, end: { x: width - 50, y: 700 }, thickness: 0.6, color: HAIRLINE });

  let y = 668;
  for (const text of BUYER_FEE_BODY) {
    for (const line of wrapToWidth(text, font, 10.5, width - 100)) {
      page.drawText(line, { x: 50, y, size: 10.5, font, color: INK });
      y -= 15;
    }
    y -= 12;
  }

  y -= 10;
  page.drawText(`Seller: ${data.seller_name ?? ''}`, { x: 50, y, size: 10.5, font: bold, color: INK });
  y -= 18;
  page.drawText(`Property: ${[data.cemetery, data.plot_description].filter(Boolean).join(' — ')}`,
    { x: 50, y, size: 9.5, font, color: MUTED });

  // Initials block — the seller initials this section with the rest of the terms.
  y -= 42;
  page.drawText("Seller's initials:", { x: 50, y, size: 10, font, color: MUTED });
  page.drawLine({ start: { x: SALE_TERMS_INITIALS_X, y: y - 2 }, end: { x: SALE_TERMS_INITIALS_X + SALE_TERMS_INITIALS_W, y: y - 2 }, thickness: 0.8, color: INK });
  page.drawText('Date:', { x: 260, y, size: 10, font, color: MUTED });
  page.drawLine({ start: { x: SALE_TERMS_DATE_X, y: y - 2 }, end: { x: SALE_TERMS_DATE_X + SALE_TERMS_DATE_W, y: y - 2 }, thickness: 0.8, color: INK });

  page.drawLine({ start: { x: 50, y: 55 }, end: { x: width - 50, y: 55 }, thickness: 0.4, color: HAIRLINE });
  page.drawText("LISTING AGREEMENT — SALE TERMS (CONTINUED)", { x: 50, y: 40, size: 8, font: bold, color: MUTED });
}


// ---------- APPENDED DATA REFERENCE SHEET ----------

// Plain contract-style data sheet: Times fonts, black ink, thin rules, no colored UI cards.
function appendInfoSheet(pdf: PDFDocument, font: PDFFont, bold: PDFFont, serif: PDFFont, serifBold: PDFFont, kind: string, data: FillData) {
  const page = pdf.addPage([612, 792]);
  const { width } = page.getSize();

  // Header masthead — deliberately conservative so it reads as part of the contract packet.
  page.drawText('TEXAS CEMETERY BROKERS LLC', { x: 50, y: 740, size: 9, font: bold, color: MUTED });
  page.drawText(
    kind === 'poa' ? 'Power of Attorney — Data Reference' : 'Listing Agreement — Data Reference',
    { x: 50, y: 712, size: 18, font: serifBold, color: INK },
  );
  page.drawLine({ start: { x: 50, y: 700 }, end: { x: width - 50, y: 700 }, thickness: 0.6, color: HAIRLINE });
  page.drawText('Verify each value below before signing. This sheet is included in the executed PDF as an audit reference.',
    { x: 50, y: 682, size: 9, font: serif, color: MUTED });

  // Two-column card layout.
  const cardX = 50, cardW = width - 100;
  let y = 660;

  const startCard = (title: string, rows: number) => {
    const h = 34 + rows * 22 + 10;
    page.drawRectangle({ x: cardX, y: y - h, width: cardW, height: h, borderColor: HAIRLINE, borderWidth: 0.5 });
    page.drawText(title.toUpperCase(), { x: cardX + 18, y: y - 20, size: 8.5, font: bold, color: INK, });
    page.drawLine({ start: { x: cardX + 18, y: y - 26 }, end: { x: cardX + cardW - 18, y: y - 26 }, thickness: 0.4, color: HAIRLINE });
    return y - 44; // first row baseline
  };
  const endCard = (rows: number) => { y -= 34 + rows * 22 + 10 + 14; };

  const row = (rowY: number, label: string, value?: string | null) => {
    page.drawText(label, { x: cardX + 18, y: rowY, size: 8, font, color: MUTED });
    page.drawText(value && String(value).trim() ? String(value) : '—',
      { x: cardX + 180, y: rowY, size: 10.5, font: serif, color: INK });
  };

  const partyRows: Array<[string, string | undefined]> = [
    ['Seller / Principal', data.seller_name],
    ['Co-owner', data.co_owner_name],
    ['Mailing Address', data.address],
    ['City / State / ZIP', data.city_state_zip],
    ['Telephone', data.phone],
    ['Email', data.email],
  ];
  let rowY = startCard('Party', partyRows.length);
  for (const [l, v] of partyRows) { row(rowY, l, v); rowY -= 22; }
  endCard(partyRows.length);

  const propRows: Array<[string, string | undefined]> = [
    ['Cemetery', data.cemetery],
    ['County / State', data.county_state],
    ['Plots / Spaces', data.plot_count != null ? String(data.plot_count) : undefined],
    ['Description', data.plot_description],
  ];
  rowY = startCard('Interment Property', propRows.length);
  for (const [l, v] of propRows) { row(rowY, l, v); rowY -= 22; }
  endCard(propRows.length);

  if (kind === 'listing_agreement') {
    const termsRows: Array<[string, string | undefined]> = [
      ['Listing Option', data.listing_option],
      ['Authorized Min. per Plot', money(data.authorized_min_per_plot)],
      ['Authorized Min. Total', money(data.authorized_min_total)],
      ['Seller Net at Min. (85%)', data.authorized_min_total ? money(Math.round(Number(data.authorized_min_total) * 0.85)) : undefined],
      // Buyer-side charge under Sale Terms 4.1 — shown here so the economics of the
      // deal read in full, but it never reduces the Seller's net above.
      ["Buyer's Fee (15%) - paid by buyer", data.authorized_min_total ? money(Math.round(Number(data.authorized_min_total) * 0.15)) : undefined],
      ['Buyer Total at Min. (before cemetery fees)', data.authorized_min_total ? money(Math.round(Number(data.authorized_min_total) * 1.15)) : undefined],
    ];
    rowY = startCard('Sale Terms', termsRows.length);
    for (const [l, v] of termsRows) { row(rowY, l, v); rowY -= 22; }
    endCard(termsRows.length);
  }

  // Footer to match the template chrome.
  page.drawLine({ start: { x: 50, y: 55 }, end: { x: width - 50, y: 55 }, thickness: 0.4, color: HAIRLINE });
  page.drawText('TEXASCEMETERYBROKERS.COM', { x: 50, y: 40, size: 8, font: bold, color: MUTED });
  page.drawText('DATA REFERENCE SHEET', { x: width - 50 - font.widthOfTextAtSize('DATA REFERENCE SHEET', 8), y: 40, size: 8, font: bold, color: MUTED });
}

/**
 * Public wrapper so composed documents (e.g. the joint POA, which is typeset
 * from scratch rather than stamped onto a scanned template) can append the
 * exact same audit/data-reference sheet the single-signer contracts carry.
 */
export async function appendDataReferenceSheet(
  pdf: PDFDocument,
  kind: 'listing_agreement' | 'poa',
  data: FillData,
): Promise<void> {
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  appendInfoSheet(pdf, serif, serifBold, serif, serifBold, kind, data);
}

export async function buildFilledPdf(

  templateBytes: Uint8Array,
  kind: 'listing_agreement' | 'poa',
  data: FillData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templateBytes);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const pages = pdf.getPages();
  // Never print a county anywhere on a Power of Attorney (body, notary block or
  // data sheet): our stored county is often wrong and the acknowledgment county
  // must be the county where the seller actually signs.
  if (kind === 'poa') data = { ...data, county_state: '' };


  if (kind === 'listing_agreement') {
    if (pages.length >= 9) {
      buildLaOverlays(pages[0], pages[1], serif, serifBold, data);
      // The template ships with a pre-printed broker signature + typed name in the
      // broker block on the signature page. Cover those areas with opaque white
      // so the seller sees a blank broker block until we counter-sign.
      const p8 = pages[8];
      const white = rgb(1, 1, 1);
      p8.drawRectangle({ x: 204, y: 94, width: 300, height: 40, color: white });
      p8.drawRectangle({ x: 204, y: 134, width: 300, height: 18, color: white });
      p8.drawRectangle({ x: 204, y: 68, width: 300, height: 18, color: white });
    }
    insertBuyerFeeClause(pdf, serif, serifBold, data);
  } else {
    // Powers of attorney are no longer stamped onto a scanned template — they
    // are typeset in _shared/poa.ts. This branch remains only for legacy
    // regeneration of an older stamped POA.
    if (pages.length >= 3) buildPoaOverlays(pages[0], serif, serifBold, data);
  }
  appendInfoSheet(pdf, serif, serifBold, serif, serifBold, kind, data);
  return await pdf.save();
}
