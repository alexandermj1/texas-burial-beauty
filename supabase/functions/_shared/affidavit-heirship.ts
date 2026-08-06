// Typesets the Texas Affidavit of Heirship (and the Joinder & Consent of a
// Surviving Spouse) from scratch with pdf-lib. Unlike the Listing Agreement and
// POA — which are scanned templates we overlay — the affidavit has a
// variable-length heir table and an optional spouse page, so it is composed
// rather than stamped.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'npm:pdf-lib@1.17.1';
import { appendDataReferenceSheet } from './contract-fill.ts';

export interface Heir {
  name: string;
  address?: string;
  relationship?: string;
  dob?: string;
}

export interface AffidavitData {
  county?: string;
  affiant_name: string;
  affiant_address?: string;
  affiant_relationship?: string;
  affiant_is_heir?: boolean;
  decedent_name: string;
  decedent_death_date?: string;
  decedent_death_place?: string;
  decedent_residence?: string;
  knew_from?: string;
  knew_until?: string;
  never_married?: boolean;
  marital_history?: string;
  surviving_spouse?: string;
  no_children?: boolean;
  mother?: string;
  father?: string;
  heirs?: Heir[];
  cemetery?: string;
  cemetery_city?: string;
  plot_description?: string;
  spaces?: string;
  deed_number?: string;
  include_spouse_page?: boolean;
}

const INK = rgb(0.08, 0.08, 0.08);
const RULE = rgb(0.55, 0.55, 0.55);
const PAGE_W = 612;
const PAGE_H = 792;
const M = 66;
const W = PAGE_W - M * 2;

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  body: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
};

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - M;
}

function space(ctx: Ctx, h: number) {
  ctx.y -= h;
  if (ctx.y < M + 40) newPage(ctx);
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > width && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function para(ctx: Ctx, text: string, opts: { size?: number; font?: PDFFont; indent?: number; gap?: number } = {}) {
  const size = opts.size ?? 10.5;
  const font = opts.font ?? ctx.body;
  const indent = opts.indent ?? 0;
  for (const line of wrap(text, font, size, W - indent)) {
    if (ctx.y < M + 24) newPage(ctx);
    ctx.page.drawText(line, { x: M + indent, y: ctx.y, size, font, color: INK });
    ctx.y -= size + 3.5;
  }
  ctx.y -= opts.gap ?? 6;
}

function heading(ctx: Ctx, text: string, size = 14) {
  if (ctx.y < M + 60) newPage(ctx);
  const w = ctx.bold.widthOfTextAtSize(text, size);
  ctx.page.drawText(text, { x: M + (W - w) / 2, y: ctx.y, size, font: ctx.bold, color: INK });
  ctx.y -= size + 14;
}

function venue(ctx: Ctx, county: string) {
  para(ctx, `STATE OF TEXAS${' '.repeat(50)}§`, { size: 10.5, font: ctx.bold, gap: 0 });
  para(ctx, `COUNTY OF ${county || '________________'}${' '.repeat(38)}§`, { size: 10.5, font: ctx.bold, gap: 10 });
}

/** A value printed on a rule, the way it would be hand-written into a blank. */
function inline(value: string | undefined, fallbackWidth = 28): string {
  const v = (value ?? '').trim();
  return v || '_'.repeat(fallbackWidth);
}

/**
 * Signature + notary block. Affidavits are *sworn to* (jurat); a power of
 * attorney is *acknowledged* (Tex. Civ. Prac. & Rem. Code §121.005), so pass
 * `acknowledgment` for POA signers to get the correct certificate wording and
 * a dated signature line.
 */
function notaryBlock(ctx: Ctx, signerLabel: string, signerName: string, county: string, acknowledgment = false) {
  space(ctx, 16);
  ctx.page.drawLine({
    start: { x: M, y: ctx.y }, end: { x: M + 290, y: ctx.y }, thickness: 0.8, color: RULE,
  });
  ctx.y -= 12;
  para(ctx, `${signerLabel} — signature`, { size: 9, font: ctx.italic, gap: 8 });
  para(ctx, `Printed name: ${inline(signerName, 40)}`, { gap: acknowledgment ? 6 : 14 });
  if (acknowledgment) para(ctx, 'Date signed: ______________________', { gap: 14 });
  venue(ctx, county);
  para(ctx, acknowledgment
    ? `This instrument was ACKNOWLEDGED before me on this the ______ day of ______________________, 20____, by ${inline(signerName, 40)}.`
    : `SWORN TO and SUBSCRIBED before me by ${inline(signerName, 40)} on this the ______ day of ______________________, 20____.`,
    { gap: 22 });
  ctx.page.drawLine({
    start: { x: M, y: ctx.y }, end: { x: M + 290, y: ctx.y }, thickness: 0.8, color: RULE,
  });
  ctx.y -= 12;
  para(ctx, 'Notary Public, State of Texas', { size: 9.5, gap: 4 });
  para(ctx, 'My commission expires: ______________________ (Seal)', { size: 9.5, gap: 10 });
}

/** Masthead + footer chrome so composed documents match the branded templates. */
function brandPages(doc: PDFDocument, bold: PDFFont, body: PDFFont, totalPages?: number) {
  const pages = doc.getPages();
  const total = totalPages ?? pages.length;
  pages.forEach((p, i) => {
    const { width } = p.getSize();
    p.drawText('TEXAS CEMETERY BROKERS', { x: M, y: PAGE_H - 42, size: 8, font: bold, color: RULE });
    p.drawLine({ start: { x: M, y: PAGE_H - 52 }, end: { x: width - M, y: PAGE_H - 52 }, thickness: 0.5, color: RULE });
    p.drawLine({ start: { x: M, y: 52 }, end: { x: width - M, y: 52 }, thickness: 0.4, color: RULE });
    p.drawText('TEXASCEMETERYBROKERS.COM', { x: M, y: 38, size: 7.5, font: bold, color: RULE });
    const label = `Page ${i + 1} of ${total}`;
    p.drawText(label, { x: width - M - body.widthOfTextAtSize(label, 7.5), y: 38, size: 7.5, font: body, color: RULE });
  });
}


function heirTable(ctx: Ctx, heirs: Heir[]) {
  const cols = [150, 190, 90, 70];
  const headers = ['Name', 'Address', 'Relationship', 'Age / DOB'];
  const rows = heirs.length ? heirs : Array.from({ length: 4 }, () => ({ name: '' } as Heir));
  const rowH = 20;
  if (ctx.y < M + rowH * (rows.length + 2)) newPage(ctx);

  let x = M;
  ctx.page.drawLine({ start: { x: M, y: ctx.y + 12 }, end: { x: M + W, y: ctx.y + 12 }, thickness: 0.8, color: RULE });
  headers.forEach((h, i) => {
    ctx.page.drawText(h, { x: x + 3, y: ctx.y, size: 9, font: ctx.bold, color: INK });
    x += cols[i];
  });
  ctx.y -= 6;
  ctx.page.drawLine({ start: { x: M, y: ctx.y }, end: { x: M + W, y: ctx.y }, thickness: 0.8, color: RULE });

  for (const h of rows) {
    ctx.y -= rowH;
    if (ctx.y < M + 30) newPage(ctx);
    const cells = [h.name ?? '', h.address ?? '', h.relationship ?? '', h.dob ?? ''];
    x = M;
    cells.forEach((c, i) => {
      const text = wrap(c, ctx.body, 9, cols[i] - 8)[0] ?? '';
      ctx.page.drawText(text, { x: x + 3, y: ctx.y + 6, size: 9, font: ctx.body, color: INK });
      x += cols[i];
    });
    ctx.page.drawLine({ start: { x: M, y: ctx.y }, end: { x: M + W, y: ctx.y }, thickness: 0.5, color: RULE });
  }
  ctx.y -= 14;
}

export async function buildAffidavitPdf(d: AffidavitData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - M,
    body: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };
  const county = (d.county ?? '').trim();
  const plot = [d.plot_description, d.spaces && `Spaces ${d.spaces}`, d.deed_number && `Deed ${d.deed_number}`]
    .filter(Boolean).join(' · ');

  // ── Page 1: the affidavit ──
  heading(ctx, 'AFFIDAVIT OF HEIRSHIP', 15);
  venue(ctx, county);
  para(ctx, `BEFORE ME, the undersigned authority, on this day personally appeared ${inline(d.affiant_name, 40)} ("Affiant"), who, after being by me duly sworn, deposed and said:`, { gap: 10 });

  para(ctx, `1.  My name is ${inline(d.affiant_name, 36)} and I reside at ${inline(d.affiant_address, 44)}. I am over eighteen years of age and fully competent to make this affidavit. My relationship to the Decedent named below is ${inline(d.affiant_relationship, 26)}. ${d.affiant_is_heir ? 'I am an heir of the Decedent.' : 'I am not an heir of the Decedent.'}`);

  para(ctx, `2.  The Decedent is ${inline(d.decedent_name, 40)}, who died on ${inline(d.decedent_death_date, 20)} at ${inline(d.decedent_death_place, 34)} and who, at the time of death, resided at ${inline(d.decedent_residence, 42)}. I was personally familiar with the Decedent's family and marital history from ${inline(d.knew_from, 12)} until ${inline(d.knew_until, 12)}.`);

  para(ctx, '3.  Marital history:', { font: ctx.bold, gap: 3 });
  if (d.never_married) {
    para(ctx, '[X]  The Decedent was never married.', { indent: 18 });
  } else {
    para(ctx, `[X]  The Decedent was married as follows (each spouse's name, the date of marriage, and how and when it ended): ${inline(d.marital_history, 60)}`, { indent: 18 });
    para(ctx, `The Decedent ${d.surviving_spouse ? '[X] was  [ ] was not' : '[ ] was  [X] was not'} survived by a spouse. Surviving spouse: ${inline(d.surviving_spouse, 40)}.`, { indent: 18 });
  }

  para(ctx, '4.  Children:', { font: ctx.bold, gap: 3 });
  para(ctx, d.no_children
    ? '[X]  The Decedent never had or adopted any child and never took any child into the Decedent\'s home or raised any child as the Decedent\'s own.'
    : '[X]  The Decedent\'s children are listed in Paragraph 6. If a child died before the Decedent, that child\'s own children are listed in that child\'s place. No other person was ever a child of the Decedent by birth, adoption, or otherwise.',
    { indent: 18 });

  para(ctx, '5.  Complete only if the Decedent left no spouse and no children or grandchildren:', { font: ctx.bold, gap: 3 });
  para(ctx, `Mother: ${inline(d.mother, 34)}     Father: ${inline(d.father, 34)}`, { indent: 18 });
  para(ctx, 'Brothers and sisters, including half-brothers and half-sisters, are listed in Paragraph 6, or [ ] none.', { indent: 18 });

  para(ctx, '6.  Surviving relatives. List in this order: surviving spouse, then children, then parents, then brothers and sisters.', { font: ctx.bold, gap: 8 });
  heirTable(ctx, d.heirs ?? []);
  para(ctx, 'The persons listed above are all of the heirs at law of the Decedent. No other person has any interest in the property described in Paragraph 7.');

  para(ctx, `7.  Cemetery property. The Decedent owned interment rights at ${inline(d.cemetery, 34)}${d.cemetery_city ? `, ${d.cemetery_city}, Texas` : ''}, described as ${inline(plot, 44)}.`);

  para(ctx, '8.  The Decedent\'s estate was not administered, or administration has closed, and there are no unpaid debts and no unpaid estate or inheritance taxes.');

  para(ctx, '9.  This affidavit is made so that the cemetery and any purchaser may rely on it. I understand that knowingly making a false statement under oath is an offense under Chapter 37 of the Texas Penal Code.', { gap: 20 });

  notaryBlock(ctx, 'Affiant', d.affiant_name, county);

  // ── Page 2: second disinterested witness ──
  newPage(ctx);
  heading(ctx, 'AFFIDAVIT OF SECOND DISINTERESTED WITNESS', 13);
  venue(ctx, county);
  para(ctx, 'BEFORE ME, the undersigned authority, on this day personally appeared ______________________________________________, who, after being by me duly sworn, deposed and said:', { gap: 10 });
  para(ctx, '1.  My name is ____________________________________ and I reside at ____________________________________________. I am over eighteen years of age and fully competent to make this affidavit.');
  para(ctx, `2.  I knew the Decedent, ${inline(d.decedent_name, 34)}, from ____________ until ____________ and am personally familiar with the Decedent's family and marital history.`);
  para(ctx, '3.  I am not an heir of the Decedent, I am not related to the Decedent by blood, marriage, or adoption, and I have no interest in the Decedent\'s estate or in the property described in the foregoing affidavit.');
  para(ctx, '4.  I have read the foregoing affidavit. Every statement in it is true and correct to the best of my knowledge, and I adopt each statement as my own sworn testimony, except: ______________________________________________ (or write "none").');
  para(ctx, '5.  I understand that knowingly making a false statement under oath is an offense under Chapter 37 of the Texas Penal Code.', { gap: 20 });
  notaryBlock(ctx, 'Second Disinterested Witness', '', county);

  // ── Page 3: surviving spouse joinder (only when there is one) ──
  if (d.include_spouse_page ?? !!d.surviving_spouse) {
    newPage(ctx);
    heading(ctx, 'JOINDER AND CONSENT OF SURVIVING SPOUSE', 13);
    venue(ctx, county);
    para(ctx, `BEFORE ME, the undersigned authority, on this day personally appeared ${inline(d.surviving_spouse, 40)}, who, after being by me duly sworn, deposed and said:`, { gap: 10 });
    para(ctx, `1.  I am the surviving spouse of the Decedent named in the foregoing affidavit. We married on ____________________ and remained married until the Decedent's death. We were not divorced and no divorce or annulment suit was pending when the Decedent died.`);
    para(ctx, '2.  I have read the foregoing affidavit and the facts stated in it are true and correct to the best of my knowledge.');
    para(ctx, '3.  I understand that Texas law gives me a vested right of interment in the plot described in the foregoing affidavit, and that a conveyance made without my joinder or written consent does not take that right away from me. Knowing this, I elect as follows:', { gap: 4 });
    para(ctx, '[ ]  I join in and consent to the transfer of all of the interment rights described in the affidavit, and I waive and release my right of interment in the plot.', { indent: 18, gap: 3 });
    para(ctx, '[ ]  I join in and consent to the transfer except for space ____________, which is reserved to me and is not being conveyed.', { indent: 18 });
    para(ctx, '4.  I sign this freely and voluntarily so that the cemetery and the purchaser may rely on it.', { gap: 20 });
    notaryBlock(ctx, 'Surviving Spouse', d.surviving_spouse ?? '', county);
  }

  return await doc.save();
}

/** Standalone spousal consent (living owner who is married — §711.039). */
export async function buildSpousalConsentPdf(d: {
  county?: string; spouse_name?: string; owner_name: string;
  cemetery?: string; cemetery_city?: string; plot_description?: string; spaces?: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - M,
    body: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };
  const county = (d.county ?? '').trim();
  const plot = [d.plot_description, d.spaces && `Spaces ${d.spaces}`].filter(Boolean).join(' · ');

  heading(ctx, 'SPOUSAL CONSENT AND WAIVER OF RIGHT OF INTERMENT', 13);
  venue(ctx, county);
  para(ctx, `BEFORE ME, the undersigned authority, on this day personally appeared ${inline(d.spouse_name, 40)}, who, after being by me duly sworn, deposed and said:`, { gap: 10 });
  para(ctx, `1.  I am the spouse of ${inline(d.owner_name, 36)} ("Owner"), who holds the interment rights at ${inline(d.cemetery, 32)}${d.cemetery_city ? `, ${d.cemetery_city}, Texas` : ''}, described as ${inline(plot, 40)}.`);
  para(ctx, '2.  I understand that Section 711.039 of the Texas Health and Safety Code gives me a vested right of interment in the plot, and that a conveyance made without my joinder or written consent does not take that right away from me.');
  para(ctx, '3.  Knowing this, I join in and consent to the sale and transfer of the interment rights described above, and I waive and release my right of interment in the plot.', { gap: 4 });
  para(ctx, '[ ]  Except for space ____________, which is reserved to me and is not being conveyed.', { indent: 18 });
  para(ctx, '4.  I sign this freely and voluntarily so that the cemetery and the purchaser may rely on it.', { gap: 22 });
  notaryBlock(ctx, 'Spouse', d.spouse_name ?? '', county);

  return await doc.save();
}

/**
 * Joint Limited Power of Attorney — one instrument signed by two principals
 * (typically a married couple who hold the interment rights together).
 *
 * Legal basis: Texas Estates Code Chapter 751 (Durable Power of Attorney Act).
 * §751.0021 fixes the statutory form's core language; §751.0022 fixes the
 * acknowledgment/"Important Information for Agent" disclosure. Two principals
 * may execute a single instrument — each signature is simply acknowledged
 * separately before a notary (Tex. Civ. Prac. & Rem. Code §121.005–.007), so
 * this document carries one acknowledgment block per principal.
 */
export async function buildJointPoaPdf(d: {
  county?: string;
  principals: { name: string; address?: string }[];
  cemetery?: string;
  cemetery_city?: string;
  county_state?: string;
  plot_description?: string;
  spaces?: string;
  phone?: string;
  email?: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - M,
    body: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };
  const county = (d.county ?? d.county_state ?? '').replace(/,\s*TX$/i, '').trim();
  const plot = [d.plot_description, d.spaces && `Spaces ${d.spaces}`].filter(Boolean).join(' · ');
  const names = d.principals.map((p) => p.name).filter(Boolean);
  const addr = d.principals.map((p) => p.address ?? '').filter(Boolean);

  heading(ctx, 'LIMITED (SPECIAL) POWER OF ATTORNEY', 14);
  para(ctx, 'Interment Rights — Joint Principals · Texas Cemetery Brokers LLC', { size: 10, font: ctx.italic, gap: 12 });
  venue(ctx, county);

  para(ctx, `NOTICE: THE POWERS GRANTED BY THIS DOCUMENT ARE LIMITED AND ARE EXPLAINED IN THE TEXAS ESTATES CODE, CHAPTER 751, SUBCHAPTER D. IF YOU HAVE ANY QUESTIONS ABOUT THESE POWERS, OBTAIN COMPETENT LEGAL ADVICE. YOU MAY REVOKE THIS POWER OF ATTORNEY IF YOU LATER WISH TO DO SO.`, { size: 9, font: ctx.bold, gap: 12 });

  para(ctx, `KNOW ALL PERSONS BY THESE PRESENTS, that the undersigned, ${inline(names[0], 32)} and ${inline(names[1], 32)} (each a "Principal" and together the "Principals"), acting both individually and jointly, hereby appoint Texas Cemetery Brokers LLC, a Texas limited liability company, and its authorised officers, as their true and lawful attorney-in-fact ("Agent") for the limited purposes set out below.`);

  para(ctx, `Principals' address${addr.length > 1 ? 'es' : ''}: ${inline(addr.join('; '), 52)}.`);

  para(ctx, `1.  Property. The Principals own the interment rights at ${inline(d.cemetery, 32)}${d.cemetery_city ? `, ${d.cemetery_city}, Texas` : ''}, described as ${inline(plot, 40)} (the "Property").`);

  para(ctx, '2.  Powers granted. The Agent may, on behalf of either or both Principals: (a) obtain from the cemetery any records, deeds, certificates of ownership and transfer forms relating to the Property; (b) complete, sign and deliver the cemetery\'s transfer, assignment and release documents; (c) pay and receive the cemetery\'s transfer fees on the Principals\' behalf; and (d) do anything else reasonably necessary to complete the sale and transfer of the Property.');

  para(ctx, '3.  Limits. This power is limited to the Property described above. It does not authorise the Agent to sell the Property below the price the Principals have approved in writing, to receive sale proceeds other than through the closing statement provided to the Principals, or to act on any other property, account or interest of either Principal. The Agent is not authorised to create, change or revoke any right of survivorship, beneficiary designation, trust or gift.');

  para(ctx, '4.  Agent\'s duties. The Agent must act in good faith, within the scope granted above and in the Principals\' best interest, must keep the Principals\' property separate from the Agent\'s own, and must keep a record of each receipt, disbursement and transaction made on the Principals\' behalf, as required by Texas Estates Code §751.101–§751.106.');

  para(ctx, '5.  Effective date, durability and termination. This power of attorney is effective immediately on execution by a Principal and is NOT affected by that Principal\'s subsequent disability or incapacity. It terminates on the earlier of (a) completion of the sale and transfer of the Property, (b) one year from the date of the last acknowledgment below, or (c) revocation.');

  para(ctx, '6.  Revocation. Either Principal may revoke this instrument as to that Principal by written notice delivered to the Agent and to the cemetery. Revocation by one Principal does not invalidate the authority granted by the other Principal, which continues in full force as to that Principal\'s interest.');

  para(ctx, '7.  Reliance and copies. The cemetery, any title company and any purchaser may rely on this instrument, and on a photocopy or electronically transmitted copy of it, with the same force and effect as the original, until they receive actual written notice of revocation. A person who acts in good faith reliance on this instrument is protected under Texas Estates Code §751.201–§751.212.', { gap: 8 });

  para(ctx, '8.  Governing law. This instrument is governed by the laws of the State of Texas.', { gap: 18 });

  para(ctx, 'Each Principal signs below and appears separately before a notary public. Both acknowledgments must be completed for this instrument to be effective as to both Principals.', { size: 10, font: ctx.italic, gap: 12 });

  notaryBlock(ctx, 'First Principal', names[0] ?? '', county, true);
  newPage(ctx);
  heading(ctx, 'ACKNOWLEDGMENT OF SECOND PRINCIPAL', 12);
  para(ctx, 'This page is part of, and is executed under, the Limited (Special) Power of Attorney of the same date appearing on the preceding page.', { size: 10, font: ctx.italic, gap: 12 });
  venue(ctx, county);
  notaryBlock(ctx, 'Second Principal', names[1] ?? '', county, true);

  // Brand the instrument pages first — the data-reference sheet below carries
  // its own masthead/footer (identical to the single-signer POA), so it must
  // not be double-stamped.
  brandPages(doc, ctx.bold, ctx.body);

  // Same audit / data-reference sheet the single-signer POA carries, so both
  // documents review and file identically.
  await appendDataReferenceSheet(doc, 'poa', {
    seller_name: names.join(' & '),
    co_owner_name: names[1] ?? '',
    address: addr[0] ?? '',
    phone: d.phone,
    email: d.email,
    cemetery: d.cemetery,
    county_state: d.county_state ?? (d.cemetery_city ? `${d.cemetery_city}, TX` : ''),
    plot_count: d.spaces ?? '',
    plot_description: d.plot_description,
  });

  return await doc.save();

}

