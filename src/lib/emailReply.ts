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
export type EmailKind = "quote" | "listing_agreement" | "poa";

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
};

export const EMAIL_KIND_RING: Record<EmailKind, string> = {
  quote: "bg-purple-500/5 border-purple-500/40 ring-1 ring-purple-500/20",
  listing_agreement: "bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/20",
  poa: "bg-sky-500/5 border-sky-500/40 ring-1 ring-sky-500/20",
};

export const classifyEmailKind = (
  subject: string | null | undefined,
  body?: string | null,
): EmailKind | null => {
  const s = `${subject || ""}`.toLowerCase();
  const b = `${body || ""}`.toLowerCase();
  const hay = `${s} ${b}`;
  if (s.includes("power of attorney") || hay.includes("notary packet")) return "poa";
  if (s.includes("listing agreement") || hay.includes("sign your listing agreement")) return "listing_agreement";
  if (
    s.includes("valuation is complete") ||
    s.includes("listing offer") ||
    (hay.includes("guaranteed net") && hay.includes("plot"))
  ) return "quote";
  return null;
};
