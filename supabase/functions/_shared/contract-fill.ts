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

// Brand palette — pulled from the printed template so overlays feel native.
const INK = rgb(0.05, 0.15, 0.28);           // deep navy body text
const CORAL = rgb(0.86, 0.36, 0.30);         // section accent
const SAGE = rgb(0.30, 0.42, 0.34);          // secondary accent
const MUTED = rgb(0.42, 0.44, 0.46);
const PAPER = rgb(0.96, 0.94, 0.88);         // matches the tan field boxes
const HAIRLINE = rgb(0.78, 0.76, 0.70);

// Every filled blank uses the same size + font so the document feels uniform.
const FIELD_SIZE = 11;
const FIELD_X = 210;         // 5pt right of the underline start (x0 = 204.7)
const FIELD_BASELINE_OFFSET = 3; // pt above the underline y

function money(n?: number | null): string {
  if (n == null || Number.isNaN(Number(n))) return '';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function stamp(page: PDFPage, text: string, x: number, lineY: number, font: PDFFont, size = FIELD_SIZE, color = INK) {
  if (text == null || text === '') return;
  page.drawText(String(text), { x, y: lineY + FIELD_BASELINE_OFFSET, size, font, color });
}

/** Draw an X-mark inside a checkbox at the measured box origin (bottom-left x, y with 15x15 box). */
function checkBox(page: PDFPage, x: number, y: number, bold: PDFFont) {
  // Draw a solid accent square then a white ✓ so it stands out on the tan bg.
  page.drawRectangle({ x, y, width: 15, height: 15, color: SAGE, borderColor: SAGE, borderWidth: 0.5 });
  page.drawText('X', { x: x + 3.2, y: y + 3, size: 12, font: bold, color: rgb(1, 1, 1) });
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
// Option row baselines (text bottoms): Starter y≈714, Pro y≈639, Featured y≈564.
// Boxes are 15x15 squares immediately left of the option label.
const LA_P2 = {
  optStarter: { x: 102, y: 712 },
  optPro: { x: 102, y: 637 },
  optFeatured: { x: 102, y: 562 },
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
  else if (opt.includes('featured') || opt === 'option 3') checkBox(page2, LA_P2.optFeatured.x, LA_P2.optFeatured.y, bold);

  if (data.authorized_min_per_plot != null) {
    const s = Number(data.authorized_min_per_plot).toLocaleString('en-US');
    // Right-align within the small rect so the "$" prefix reads correctly.
    const w = font.widthOfTextAtSize(s, FIELD_SIZE);
    stamp(page2, s, LA_P2.authPerPlot.x + LA_P2.authPerPlot.width - w - 4, LA_P2.authPerPlot.y, font);
  }
  if (data.authorized_min_total != null) {
    const s = Number(data.authorized_min_total).toLocaleString('en-US');
    const w = font.widthOfTextAtSize(s, FIELD_SIZE);
    stamp(page2, s, LA_P2.authTotal.x + LA_P2.authTotal.width - w - 4, LA_P2.authTotal.y, font);
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
  stamp(page1, data.county_state ?? '', FIELD_X, POA_P1.county_state, font);
  stamp(page1, data.plot_count ? String(data.plot_count) : '', FIELD_X, POA_P1.plots, font);
  const desc = data.plot_description ?? '';
  if (desc) {
    const lines = wrapToWidth(desc, font, FIELD_SIZE, 330);
    stamp(page1, lines.join(' '), FIELD_X, POA_P1.desc, font, lines.length > 1 ? 10 : FIELD_SIZE);
  }
}

// ---------- APPENDED DATA REFERENCE SHEET ----------
// Redesigned to feel like a continuation of the main document: same navy ink,
// coral eyebrow, sage rule, tan field cards with muted labels + serif values.
function appendInfoSheet(pdf: PDFDocument, font: PDFFont, bold: PDFFont, serif: PDFFont, serifBold: PDFFont, kind: string, data: FillData) {
  const page = pdf.addPage([612, 792]);
  const { width } = page.getSize();

  // Header masthead — coral eyebrow + serif title (mirrors template cover).
  page.drawText('TEXAS CEMETERY BROKERS', { x: 50, y: 740, size: 9, font: bold, color: CORAL });
  page.drawText(
    kind === 'poa' ? 'Power of Attorney — Data Reference' : 'Listing Agreement — Data Reference',
    { x: 50, y: 712, size: 20, font: serifBold, color: INK },
  );
  page.drawLine({ start: { x: 50, y: 700 }, end: { x: 130, y: 700 }, thickness: 1.5, color: CORAL });
  page.drawText('Verify each value below before signing. This sheet is included in the executed PDF as an audit reference.',
    { x: 50, y: 682, size: 9, font, color: MUTED });

  // Two-column card layout.
  const cardX = 50, cardW = width - 100;
  let y = 660;

  const startCard = (title: string, rows: number) => {
    const h = 34 + rows * 22 + 10;
    page.drawRectangle({ x: cardX, y: y - h, width: cardW, height: h, color: PAPER, borderColor: HAIRLINE, borderWidth: 0.6 });
    page.drawText(title.toUpperCase(), { x: cardX + 18, y: y - 20, size: 9, font: bold, color: SAGE, });
    page.drawLine({ start: { x: cardX + 18, y: y - 26 }, end: { x: cardX + cardW - 18, y: y - 26 }, thickness: 0.4, color: HAIRLINE });
    return y - 44; // first row baseline
  };
  const endCard = (rows: number) => { y -= 34 + rows * 22 + 10 + 14; };

  const row = (rowY: number, label: string, value?: string | null) => {
    page.drawText(label, { x: cardX + 18, y: rowY, size: 8, font: bold, color: MUTED });
    page.drawText(value && String(value).trim() ? String(value) : '—',
      { x: cardX + 180, y: rowY, size: 11, font: serif, color: INK });
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
    ];
    rowY = startCard('Sale Terms', termsRows.length);
    for (const [l, v] of termsRows) { row(rowY, l, v); rowY -= 22; }
    endCard(termsRows.length);
  } else {
    const termsRows: Array<[string, string | undefined]> = [
      ['Quoted to Seller', money(data.quote_amount)],
      ['Transfer Fee (Buyer)', money(data.transfer_fee)],
    ];
    rowY = startCard('Transaction', termsRows.length);
    for (const [l, v] of termsRows) { row(rowY, l, v); rowY -= 22; }
    endCard(termsRows.length);
  }

  // Footer to match the template chrome.
  page.drawLine({ start: { x: 50, y: 55 }, end: { x: width - 50, y: 55 }, thickness: 0.4, color: HAIRLINE });
  page.drawText('TEXASCEMETERYBROKERS.COM', { x: 50, y: 40, size: 8, font: bold, color: MUTED });
  page.drawText('DATA REFERENCE SHEET', { x: width - 50 - font.widthOfTextAtSize('DATA REFERENCE SHEET', 8), y: 40, size: 8, font: bold, color: MUTED });
}

export async function buildFilledPdf(
  templateBytes: Uint8Array,
  kind: 'listing_agreement' | 'poa',
  data: FillData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templateBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const pages = pdf.getPages();

  if (kind === 'listing_agreement') {
    if (pages.length >= 8) buildLaOverlays(pages[0], pages[1], font, bold, data);
  } else {
    if (pages.length >= 3) buildPoaOverlays(pages[0], font, bold, data);
  }
  appendInfoSheet(pdf, font, bold, serif, serifBold, kind, data);
  return await pdf.save();
}
