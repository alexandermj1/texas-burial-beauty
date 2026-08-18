// Helpers for classifying email direction and "awaiting reply" status.
// Our outgoing sender addresses — anything from these counts as a reply we sent.
const OUR_ADDRESSES = [
  "info@texascemeterybrokers.com",
  "texascemeterybrokers@gmail.com",
  "contracts@texascemeterybrokers.com",
];

const extractAddress = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
};

export const isOutgoing = (from_email: string | null | undefined): boolean => {
  const addr = extractAddress(from_email);
  return OUR_ADDRESSES.some((o) => addr === o);
};

export const isIncoming = (from_email: string | null | undefined): boolean => {
  if (!from_email) return false;
  return !isOutgoing(from_email);
};

// ---------------------------------------------------------------------------
// Classify key outgoing emails so the admin thread can show a coloured tag
// (quote = purple, listing agreement = terracotta/amber, POA = blue).
export type EmailKind = "quote" | "listing_agreement" | "poa" | "family_tree" | "document_request";

export const EMAIL_KIND_META: Record<EmailKind, { label: string; className: string }> = {
  quote: {
    label: "Quote sent",
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40",
  },
  listing_agreement: {
    label: "Listing agreement",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
  },
  poa: {
    label: "Power of attorney",
    className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40",
  },
  family_tree: {
    label: "Seller family tree",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  },
  document_request: {
    label: "Document request",
    className: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40",
  },
};

export const EMAIL_KIND_RING: Record<EmailKind, string> = {
  quote: "bg-purple-500/5 border-purple-500/40 ring-1 ring-purple-500/20",
  listing_agreement: "bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/20",
  poa: "bg-sky-500/5 border-sky-500/40 ring-1 ring-sky-500/20",
  family_tree: "bg-emerald-500/5 border-emerald-500/40 ring-1 ring-emerald-500/20",
  document_request: "bg-teal-500/5 border-teal-500/40 ring-1 ring-teal-500/20",
};

/** Drop the quoted history from a reply so tags reflect the new message only. */
const stripQuoted = (body?: string | null): string => {
  const raw = String(body ?? "");
  const cuts = [
    raw.search(/<blockquote/i),
    raw.search(/gmail_quote/i),
    raw.search(/On .{5,80}wrote:/i),
    raw.search(/-{2,}\s*Original Message/i),
    raw.search(/\bFrom:\s/),
  ].filter((i) => i > 0);
  return cuts.length ? raw.slice(0, Math.min(...cuts)) : raw;
};

// Tags are marker-driven ONLY. An email is tagged when it was produced by one
// of our generators (quote generator, listing-agreement panel, POA/notary
// packet, document packet, family-tree questionnaire) — each of those stamps a
// hidden marker into the HTML. Subject-line guessing is deliberately gone: it
// used to tag ordinary replies that merely mentioned a phrase or inherited a
// thread subject.
export const classifyEmailKind = (
  _subject: string | null | undefined,
  body?: string | null,
): EmailKind | null => {
  const b = stripQuoted(body);
  if (!b) return null;
  const marker = b.match(/data-tcb-email=["']([a-z_]+)["']/i)?.[1]?.toLowerCase();
  if (marker === "poa") return "poa";
  if (marker === "listing_agreement") return "listing_agreement";
  if (marker === "document_request") return "document_request";
  if (marker === "family_tree") return "family_tree";
  if (marker === "quote") return "quote";
  if (/data-family-tree=["']1["']/i.test(b)) return "family_tree";
  if (/data-listing-agreement=["']1["']/i.test(b)) return "listing_agreement";
  if (/data-listing-options=["']1["']/i.test(b)) return "quote";
  return null;
};


const parseMoney = (raw: string): number | null => {
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

// Pull the guaranteed-net / suggested figure out of a generated quote email so
// the thread can show the amount (and what changed on a re-quote).
export const extractQuoteAmount = (body?: string | null): number | null => {
  if (!body) return null;
  const text = stripQuoted(body).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  const money = "\\$\\s?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,})";
  // Prefer the explicit totals used by the quote template.
  const priority = [
    new RegExp(`${money}\\s*(?:across all|total)`, "i"),
    new RegExp(`(?:across all|total)[^$]{0,40}${money}`, "i"),
    new RegExp(`${money}\\s*per space`, "i"),
    new RegExp(`suggested sales price[^$]{0,120}${money}`, "i"),
  ];
  for (const re of priority) {
    const m = text.match(re);
    const n = m ? parseMoney(m[1]) : null;
    if (n && n >= 500) return n;
  }
  // No structured figure found — do not guess from stray dollar amounts
  // (listing fees, transfer fees) as that produced wrong "revised" figures.
  return null;
};



