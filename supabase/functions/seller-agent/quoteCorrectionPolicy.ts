import { sellerMailOutgoing } from "../_shared/sellerWakeCandidates.ts";
type Rec = Record<string, any>;
export function paidListingOption(tier: string, payments: Rec[]) {
  const canonical = (s: string) => s === "custom_plus" ? "featured" : s === "set_your_own_price" ? "set_your_price" : s;
  return payments.some(p => p.kind === "listing_fee" && p.environment === "live" && p.status === "paid" && p.paid_at && !p.refunded_at && !Number(p.refund_amount_cents) && !p.dispute_status && canonical(String(p.metadata?.listing_tier)) === canonical(tier));
}
export function requestedLowerQuote(sub: Rec, fields: Rec, email: Rec) {
  const per = Number(fields.per_space), count = Number(fields.spaces);
  if (!sub.quote_sent_at || sub.quote_response === "accepted" || Number(sub.accepted_quote_amount) > 0 || sub.la_signed_at || sub.listing_paid_at) return false;
  if (!Number.isFinite(per) || per <= 0 || per >= Number(sub.quote_amount) || !Number.isInteger(count) || count < 1 || count > 20) return false;
  if (!email || sellerMailOutgoing(email.from_email) || email.id !== fields.requested_price_email_id) return false;
  // Only the seller's own newest text, never the quote they pasted underneath it.
  const text = String(email.body_text ?? "").split(/\n\s*>|\nOn .{5,160}wrote:|\n-{2,}\s*Original Message/i)[0];
  if (!/\b(lower|reduce|decrease|drop)\b/i.test(text)) return false;
  const amounts = [...text.matchAll(/\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:USD\s*)?(per\s+(?:plot|space)|each|total|for\s+(?:all|the)\s+\d+\s+(?:plots|spaces))?/gi)];
  return amounts.some(m => Number(m[1].replace(/,/g, "")) === per && /per|each/i.test(m[2] ?? ""));
}