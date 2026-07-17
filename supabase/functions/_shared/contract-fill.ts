// Shared PDF-fill logic used by generate-contract and sign-contract (refresh mode).
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

const INK = rgb(0.05, 0.15, 0.28);
const MUTED = rgb(0.3, 0.3, 0.3);

function money(n?: number | null): string {
  if (n == null || Number.isNaN(Number(n))) return '';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function stamp(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size = 11, color = INK) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

function checkMark(page: PDFPage, cx: number, cy: number, font: PDFFont) {
  page.drawText('X', { x: cx - 4, y: cy - 4, size: 14, font, color: INK });
}

function wrap(s: string, w: number): string[] {
  const words = s.split(/\s+/); const out: string[] = []; let cur = '';
  for (const wd of words) {
    if ((cur + ' ' + wd).trim().length > w) { if (cur) out.push(cur); cur = wd; } else { cur = (cur + ' ' + wd).trim(); }
  }
  if (cur) out.push(cur);
  return out;
}

function buildLaOverlays(page1: PDFPage, page2: PDFPage, font: PDFFont, bold: PDFFont, data: FillData) {
  const X_FIELD = 225;
  stamp(page1, data.seller_name ?? '', X_FIELD, 443, font, 11);
  stamp(page1, data.address ?? '', X_FIELD, 417, font, 11);
  stamp(page1, data.city_state_zip ?? '', X_FIELD, 391, font, 11);
  stamp(page1, data.phone ?? '', X_FIELD, 364, font, 11);
  stamp(page1, data.email ?? '', X_FIELD, 338, font, 11);

  stamp(page1, data.cemetery ?? '', X_FIELD, 256, font, 11);
  stamp(page1, data.plot_count ? String(data.plot_count) : '', X_FIELD, 230, font, 11);
  const lines = wrap(data.plot_description ?? '', 55).slice(0, 3);
  lines.forEach((ln, i) => stamp(page1, ln, X_FIELD, 193 - i * 22, font, 10));

  const opt = (data.listing_option ?? '').toLowerCase();
  if (opt.includes('starter') || opt === 'option 1') checkMark(page2, 82, 717, bold);
  else if (opt.includes('pro')) checkMark(page2, 82, 642, bold);
  else if (opt.includes('featured')) checkMark(page2, 82, 567, bold);

  if (data.authorized_min_per_plot != null) stamp(page2, money(data.authorized_min_per_plot).replace('$', ''), 225, 379, font, 11);
  if (data.authorized_min_total != null) stamp(page2, money(data.authorized_min_total).replace('$', ''), 400, 379, font, 11);
}

function buildPoaOverlays(page1: PDFPage, font: PDFFont, _bold: PDFFont, data: FillData) {
  const X_FIELD = 225;
  stamp(page1, data.seller_name ?? '', X_FIELD, 421, font, 11);
  stamp(page1, data.address ?? '', X_FIELD, 394, font, 11);
  stamp(page1, data.city_state_zip ?? '', X_FIELD, 368, font, 11);
  stamp(page1, data.cemetery ?? '', X_FIELD, 224, font, 11);
  stamp(page1, data.county_state ?? '', X_FIELD, 198, font, 11);
  stamp(page1, data.plot_count ? String(data.plot_count) : '', X_FIELD, 172, font, 11);
  const desc = data.plot_description ?? '';
  if (desc) {
    const parts = desc.length > 55 ? [desc.slice(0, 55), desc.slice(55, 110)] : [desc];
    parts.forEach((ln, i) => stamp(page1, ln, X_FIELD, 135 - i * 22, font, 10));
  }
}

function appendInfoSheet(pdf: PDFDocument, font: PDFFont, bold: PDFFont, kind: string, data: FillData) {
  const page = pdf.addPage([612, 792]);
  const { width } = page.getSize();
  let y = 750;
  page.drawText(kind === 'poa' ? 'POA — DATA REFERENCE SHEET' : 'LISTING AGREEMENT — DATA REFERENCE SHEET',
    { x: 50, y, size: 15, font: bold, color: rgb(0.15, 0.28, 0.22) });
  y -= 12;
  page.drawText('The fields above are stamped from this reference sheet. Verify each entry before signing.',
    { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 20;
  const row = (label: string, value?: string) => {
    if (!value) return;
    page.drawText(label, { x: 50, y, size: 9, font: bold, color: MUTED });
    page.drawText(String(value), { x: 210, y, size: 11, font });
    y -= 18;
  };
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 14;
  row('SELLER / PRINCIPAL', data.seller_name);
  row('CO-OWNER', data.co_owner_name);
  row('ADDRESS', data.address);
  row('CITY / STATE / ZIP', data.city_state_zip);
  row('TELEPHONE', data.phone);
  row('EMAIL', data.email);
  y -= 6;
  row('CEMETERY', data.cemetery);
  row('COUNTY / STATE', data.county_state);
  row('PLOTS', data.plot_count ? String(data.plot_count) : undefined);
  row('DESCRIPTION', data.plot_description);
  if (kind === 'listing_agreement') {
    y -= 6;
    row('LISTING OPTION', data.listing_option);
    row('AUTH. MIN / PLOT', money(data.authorized_min_per_plot));
    row('AUTH. MIN TOTAL', money(data.authorized_min_total));
    row('SELLER NET AT MIN (85%)',
      data.authorized_min_total ? money(Math.round(Number(data.authorized_min_total) * 0.85)) : undefined);
  } else {
    y -= 6;
    row('QUOTED TO SELLER', money(data.quote_amount));
    row('TRANSFER FEE (BUYER)', money(data.transfer_fee));
  }
}

export async function buildFilledPdf(
  templateBytes: Uint8Array,
  kind: 'listing_agreement' | 'poa',
  data: FillData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templateBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  if (kind === 'listing_agreement') {
    if (pages.length >= 8) buildLaOverlays(pages[0], pages[1], font, bold, data);
  } else {
    if (pages.length >= 3) buildPoaOverlays(pages[0], font, bold, data);
  }
  appendInfoSheet(pdf, font, bold, kind, data);
  return await pdf.save();
}
