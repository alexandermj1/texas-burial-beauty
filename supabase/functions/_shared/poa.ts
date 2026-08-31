// Limited (Special) Power of Attorney — typeset from scratch with pdf-lib for
// BOTH the single-signer and the joint (two-principal) versions, so the two
// documents can never drift apart in wording or policy again.
//
// Policy adopted here (one policy, both forms): the Agent MAY receive, endorse,
// deposit, hold in a separate account and disburse sale proceeds, and therefore
// carries the full fiduciary duties of Texas Estates Code §751.101–§751.106
// (loyalty, no self-dealing, segregation of the principal's funds, records and
// accounting on request).
//
// Legal anchors used in the text: Chapter 751 (Durable Power of Attorney Act),
// §751.0021 (statutory form language), §751.132 (durability wording),
// §751.203 (agent's certification of validity), §751.209 (good-faith reliance
// protection — relied on WITHOUT asking the principal to indemnify anyone),
// §751.131 (termination, including death of the principal).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'npm:pdf-lib@1.17.1';
import { appendDataReferenceSheet } from './contract-fill.ts';

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
  ctx.y = PAGE_H - M - 8;
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
    if (ctx.y < M + 84) newPage(ctx);
    ctx.page.drawText(line, { x: M + indent, y: ctx.y, size, font, color: INK });
    ctx.y -= size + 3.5;
  }
  ctx.y -= opts.gap ?? 6;
}

function space(ctx: Ctx, h: number) {
  ctx.y -= h;
  if (ctx.y < M + 84) newPage(ctx);
}

function heading(ctx: Ctx, text: string, size = 14) {
  if (ctx.y < M + 60) newPage(ctx);
  const w = ctx.bold.widthOfTextAtSize(text, size);
  ctx.page.drawText(text, { x: M + (W - w) / 2, y: ctx.y, size, font: ctx.bold, color: INK });
  ctx.y -= size + 14;
}

function venue(ctx: Ctx) {
  para(ctx, `STATE OF TEXAS${' '.repeat(50)}§`, { size: 10.5, font: ctx.bold, gap: 0 });
  para(ctx, `COUNTY OF ________________________${' '.repeat(18)}§`, { size: 10.5, font: ctx.bold, gap: 4 });
  para(ctx, 'County to be completed at signing — the county where this instrument is actually signed before the notary.',
    { size: 8.5, font: ctx.italic, gap: 10 });
}

function inline(value: string | undefined, fallbackWidth = 28): string {
  const v = (value ?? '').trim();
  return v || '_'.repeat(fallbackWidth);
}

function rule(ctx: Ctx, width = 290) {
  ctx.page.drawLine({ start: { x: M, y: ctx.y }, end: { x: M + width, y: ctx.y }, thickness: 0.8, color: RULE });
  ctx.y -= 12;
}

/** Principal signature + notarial acknowledgment, with a printed-name line for the notary. */
function acknowledgmentBlock(ctx: Ctx, label: string, signerName: string) {
  // Never let a signature/notary block split across a page break.
  if (ctx.y < M + 330) newPage(ctx);
  space(ctx, 18);
  rule(ctx);
  para(ctx, `${label} — signature`, { size: 9, font: ctx.italic, gap: 8 });
  para(ctx, `Printed name: ${inline(signerName, 40)}`, { gap: 6 });
  para(ctx, 'Date signed: ______________________', { gap: 14 });
  venue(ctx);
  para(ctx, `This instrument was ACKNOWLEDGED before me on this the ______ day of ______________________, 20____, by ${inline(signerName, 40)}.`,
    { gap: 22 });
  rule(ctx);
  para(ctx, 'Notary Public, State of Texas', { size: 9.5, gap: 4 });
  para(ctx, 'Notary printed name: ______________________________________', { size: 9.5, gap: 4 });
  para(ctx, 'My commission expires: ______________________ (Seal)', { size: 9.5, gap: 10 });
}

/** The Agent countersigns to accept the appointment and the duties in Section 2. */
function agentAcceptanceBlock(ctx: Ctx) {
  space(ctx, 4);
  para(ctx, 'The undersigned accepts appointment as Agent under this instrument and agrees to act only within the authority granted above and in accordance with the duties stated in Section 2, including keeping the Principal\'s funds separate from the Agent\'s own funds and accounting for them on request.',
    { size: 10, gap: 16 });
  rule(ctx, 260);
  para(ctx, 'Texas Cemetery Brokers LLC — authorized officer', { size: 9, font: ctx.italic, gap: 6 });
  para(ctx, 'Printed name: ______________________________     Title: ______________________', { size: 9.5, gap: 4 });
  para(ctx, 'Date: ______________________', { size: 9.5, gap: 10 });
}

/** Masthead, footer and per-page initials on every page of the instrument. */
function chromePages(doc: PDFDocument, bold: PDFFont, body: PDFFont, initialSlots: number, totalPages: number) {
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const { width } = p.getSize();
    p.drawText('TEXAS CEMETERY BROKERS LLC', { x: M, y: PAGE_H - 42, size: 8, font: bold, color: RULE });
    p.drawLine({ start: { x: M, y: PAGE_H - 52 }, end: { x: width - M, y: PAGE_H - 52 }, thickness: 0.5, color: RULE });

    // Per-page initials — one slot per principal.
    const label = initialSlots > 1 ? "Principals' initials:" : "Principal's initials:";
    p.drawText(label, { x: M, y: 66, size: 7.5, font: body, color: RULE });
    let x = M + body.widthOfTextAtSize(label, 7.5) + 8;
    for (let s = 0; s < initialSlots; s++) {
      p.drawLine({ start: { x, y: 64 }, end: { x: x + 46, y: 64 }, thickness: 0.6, color: RULE });
      x += 58;
    }

    p.drawLine({ start: { x: M, y: 52 }, end: { x: width - M, y: 52 }, thickness: 0.4, color: RULE });
    p.drawText('TEXASCEMETERYBROKERS.COM', { x: M, y: 38, size: 7.5, font: bold, color: RULE });
    const pageLabel = `Page ${i + 1} of ${totalPages}`;
    p.drawText(pageLabel, { x: width - M - body.widthOfTextAtSize(pageLabel, 7.5), y: 38, size: 7.5, font: body, color: RULE });
  });
}

export interface PoaData {
  principals: { name: string; address?: string }[];
  cemetery?: string;
  cemetery_city?: string;
  plot_description?: string;
  spaces?: string;
  plot_count?: string | number;
  phone?: string;
  email?: string;
}

/**
 * Builds the Limited (Special) Power of Attorney. One principal produces the
 * single-signer form; two principals produce the joint form. Every operative
 * clause is written to cover both, so a co-signer is always a true Principal.
 */
export async function buildPoaPdf(d: PoaData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - M - 8,
    body: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };

  const names = d.principals.map((p) => p.name).filter(Boolean);
  const joint = names.length > 1;
  const hasSpaces = /space/i.test(d.plot_description ?? '');
  const plot = [d.plot_description, !hasSpaces && d.spaces && `Spaces ${d.spaces}`].filter(Boolean).join(' · ');

  // Grammar helpers so one body of text serves both forms.
  const P = joint ? 'Principals' : 'Principal';
  const p_ = joint ? 'the Principals' : 'the Principal';
  const their = joint ? 'their' : "the Principal's";
  const they = joint ? 'they' : 'the Principal';
  const own = joint ? 'own' : 'owns';
  const has = joint ? 'have' : 'has';

  heading(ctx, 'LIMITED (SPECIAL) DURABLE POWER OF ATTORNEY', 14);
  para(ctx, `Interment Rights — ${joint ? 'Joint Principals' : 'Single Principal'} · Texas Cemetery Brokers LLC`,
    { size: 10, font: ctx.italic, gap: 8 });
  // A dated instrument: page references and the one-year term both key off this.
  para(ctx, 'Date of this instrument: ______________________', { size: 10, font: ctx.bold, gap: 12 });
  venue(ctx);

  para(ctx, 'NOTICE: THE POWERS GRANTED BY THIS DOCUMENT ARE LIMITED AND ARE EXPLAINED IN SUBTITLE P, TITLE 2, TEXAS ESTATES CODE. IF YOU HAVE ANY QUESTIONS ABOUT THESE POWERS, OBTAIN COMPETENT LEGAL ADVICE. YOU MAY REVOKE THIS POWER OF ATTORNEY IF YOU LATER WISH TO DO SO.',
    { size: 9, font: ctx.bold, gap: 12 });

  para(ctx, joint
    ? `KNOW ALL PERSONS BY THESE PRESENTS, that the undersigned, ${inline(names[0], 32)} and ${inline(names[1], 32)} (each a "Principal" and together the "Principals"), acting both individually and jointly, hereby appoint Texas Cemetery Brokers LLC, a Texas limited liability company, and its authorized officers, as their true and lawful attorney-in-fact (the "Agent") for the limited purposes set out below. Each Principal grants this authority in the Principal's own right and as to the Principal's own interest in the Property.`
    : `KNOW ALL PERSONS BY THESE PRESENTS, that the undersigned, ${inline(names[0], 32)} (the "Principal"), hereby appoints Texas Cemetery Brokers LLC, a Texas limited liability company, and its authorized officers, as the Principal's true and lawful attorney-in-fact (the "Agent") for the limited purposes set out below.`);

  para(ctx, `${joint ? "Principals' address(es)" : "Principal's address"}: ______________________________________________________________________`, { gap: 4 });
  para(ctx, 'Address to be completed by the signer at signing.', { size: 8.5, font: ctx.italic, gap: 10 });

  para(ctx, `1.  Property. ${p_.charAt(0).toUpperCase() + p_.slice(1)} ${own} the interment rights at ${inline(d.cemetery, 32)}${d.cemetery_city ? `, ${d.cemetery_city}, Texas` : ''}, described as ${inline(plot, 40)} (the "Property").`);

  para(ctx, '1.1  Sale authority. The Agent may market, advertise, offer for sale, negotiate, contract for and sell the Property, and may sign, deliver and accept any purchase agreement, closing statement, deed, assignment, certificate of ownership, transfer or release document required to complete the sale and transfer of the Property.');

  para(ctx, '1.2  Cemetery dealings. The Agent may obtain from the cemetery any records, deeds, certificates of ownership, account balances and transfer forms relating to the Property, may complete and sign the cemetery\'s transfer, assignment and release documents, and may pay the cemetery\'s transfer and administrative fees.');

  para(ctx, `1.3  Sale terms. The Agent may sell the Property only on the terms, including the minimum price, that ${p_} ${has} approved in writing separately from this instrument. Those terms are deliberately not stated here and are confidential. The cemetery, a title company or a purchaser is not required to inquire into them and may instead rely on the Agent's certification under Section 4.1 that the sale is within the Agent's authority; that certification is conclusive as to any person relying on it in good faith.`);

  para(ctx, `1.4  Proceeds. The Agent may receive, endorse, deposit, hold and disburse the proceeds of sale on ${their} behalf, may sign checks and drafts payable to ${p_} for that purpose, and shall pay the net proceeds to ${p_} in accordance with the closing statement delivered to ${p_}. All such funds are held subject to Section 2.`);

  para(ctx, '1.5  Incidental acts. The Agent may do anything else reasonably necessary to complete the sale and transfer of the Property.');

  para(ctx, `2.  Agent's duties. The Agent is a fiduciary and must, as required by Texas Estates Code §751.101–§751.106: (a) act in good faith, only within the scope of the authority granted above, and in ${joint ? "the Principals'" : "the Principal's"} best interest; (b) act loyally for ${joint ? "the Principals'" : "the Principal's"} benefit and avoid conflicts of interest and self-dealing; (c) keep ${joint ? "the Principals'" : "the Principal's"} funds and property SEPARATE from the Agent's own funds and property, in an account that is not commingled with the Agent's operating funds; (d) keep a complete record of each receipt, disbursement and transaction made on ${joint ? "the Principals'" : "the Principal's"} behalf; and (e) on request by ${p_}, and in any event at the close of the sale, deliver a written accounting of all funds received, held and disbursed.`);

  para(ctx, '2.1  No commingling or personal use. The Agent may not use the proceeds for the Agent\'s own purposes, may not pledge or lend them, and may deduct only those amounts expressly authorized in writing (the Agent\'s commission and agreed closing costs) as shown on the closing statement.');

  para(ctx, `3.  Durability. THIS POWER OF ATTORNEY IS NOT AFFECTED BY SUBSEQUENT DISABILITY OR INCAPACITY OF THE ${joint ? 'PRINCIPALS' : 'PRINCIPAL'}. It is effective immediately on execution by a Principal and continues until it terminates under Section 5.`);

  para(ctx, '4.  Reliance. The cemetery, any title company, any escrow agent, any financial institution and any purchaser may rely on this instrument, and on a photocopy or electronically transmitted copy of it, with the same force and effect as the original, until that person receives actual written notice that it has been revoked or has terminated. A person who in good faith accepts this power of attorney is protected under Texas Estates Code §751.201–§751.212.');

  para(ctx, '4.1  Agent\'s certification. On request, the Agent will deliver a written certification, sworn to under penalty of perjury as permitted by Texas Estates Code §751.203, stating that this power of attorney remains in effect, has not been revoked or terminated, and that the transaction being completed is within the authority granted. A person who acts in reliance on that certification is protected to the extent provided by law.');

  para(ctx, `5.  Termination. This power of attorney terminates on the earliest of: (a) the death of the Principal (and, on a joint instrument, as to that Principal only); (b) completion of the sale and transfer of the Property; (c) termination or expiration of the Listing Agreement between ${p_} and the Agent, on which event this instrument is automatically revoked; (d) revocation by ${joint ? 'a' : 'the'} Principal by written notice delivered to the Agent and to the cemetery; or (e) one year from the date of this instrument. Termination does not affect any act done by the Agent in good faith before the Agent had actual knowledge of the terminating event, and does not affect the protection given to a person who relies in good faith without notice of the termination.`);

  if (joint) {
    para(ctx, '5.1  Effect on the other Principal. Death of, or revocation by, one Principal does not invalidate the authority granted by the other Principal, which continues in full force as to that Principal\'s own interest in the Property.');
  }

  para(ctx, '6.  Governing law. This instrument is governed by the laws of the State of Texas. If any provision is held unenforceable, the remaining provisions continue in effect.', { gap: 16 });

  para(ctx, joint
    ? 'Each Principal signs below and appears separately before a notary public. Both acknowledgments must be completed for this instrument to be effective as to both Principals.'
    : 'The Principal signs below before a notary public.',
    { size: 10, font: ctx.italic, gap: 12 });

  acknowledgmentBlock(ctx, joint ? 'First Principal' : 'Principal', names[0] ?? '');

  if (joint) {
    newPage(ctx);
    heading(ctx, 'ACKNOWLEDGMENT OF SECOND PRINCIPAL', 12);
    para(ctx, 'This page is part of, and is executed under, the Limited (Special) Durable Power of Attorney to which this page is attached.',
      { size: 10, font: ctx.italic, gap: 12 });
    acknowledgmentBlock(ctx, 'Second Principal', names[1] ?? '');
  }

  newPage(ctx);
  heading(ctx, 'ACCEPTANCE BY AGENT', 12);
  agentAcceptanceBlock(ctx);

  // Chrome on the instrument pages only — the appended data-reference sheet
  // carries its own masthead and footer.
  chromePages(doc, ctx.bold, ctx.body, joint ? 2 : 1, doc.getPageCount() + 1);

  await appendDataReferenceSheet(doc, 'poa', {
    seller_name: names[0] ?? '',
    co_owner_name: joint ? (names[1] ?? '') : '',
    // Addresses are completed by hand at signing, so nothing is pre-printed here.
    address: '',
    phone: d.phone,
    email: d.email,
    cemetery: d.cemetery,
    county_state: '',
    plot_count: d.plot_count ?? d.spaces ?? '',
    plot_description: d.plot_description,
  });

  return await doc.save();
}
