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

export const classifyEmailKind = (
  subject: string | null | undefined,
  body?: string | null,
): EmailKind | null => {
  const s = `${subject || ""}`.toLowerCase().trim();
  // Replies in a thread quote the original message, so a plain "Re:" answer in
  // a family-tree thread must never inherit that thread's tag.
  const isReply = /^(re|fwd|fw)\s*:/.test(s);
  const b = stripQuoted(body).toLowerCase();
  // The document request email — its own tag so it is easy to spot in the chain.
  if (
    s.includes("documents we need to complete your sale") ||
    b.includes("open your document page")
  ) return "document_request";
  // The family confirmation page email carries a hidden marker so it always
  // tags correctly, whatever the subject line says.
  if (!isReply && (b.includes('data-family-tree="1"') ||
      s.includes("few quick questions about your plot"))) return "family_tree";
  if (s.includes("power of attorney") || b.includes("notary packet")) return "poa";
  if (s.includes("listing agreement") || b.includes("sign your listing agreement")) return "listing_agreement";
  // Quote emails ONLY when the generated quote block is present — a mention of
  // pricing in a normal reply must not be tagged as a quote.
  if (
    b.includes('data-listing-options="1"') ||
    b.includes("sale authorization quote")
  ) return "quote";
  return null;
};

// Pull the guaranteed-net figure out of a generated quote email so the thread
// can show what changed when a second quote is sent.
export const extractQuoteAmount = (body?: string | null): number | null => {
  if (!body) return null;
  const matches = [...body.matchAll(/\$\s?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,})/g)];
  if (!matches.length) return null;
  const nums = matches
    .map((m) => Number(m[1].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n >= 500);
  if (!nums.length) return null;
  return Math.max(...nums);
};

