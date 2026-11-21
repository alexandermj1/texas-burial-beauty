import { BUYER_PRICING_VERSION } from "../_shared/buyerQuotePricing.ts";

type Offer = { pricing_version?: string; our_total?: string | null; retail_total?: string | null; our_price_per_space?: string | null; retail_per_space?: string | null; transfer_fee?: string | null; add_on_fees?: string[]; partial_offer?: { our_total: string; retail_total?: string; add_on_fees?: string[] } | null };
const amounts = (text: string) => [...text.matchAll(/\$\s*(\d[\d,]*(?:\.\d{1,2})?)/g)].map(m => Math.round(Number(m[1].replace(/,/g, "")) * 100));

/** Reject stale/altered quoted figures before either automatic or approved sending. */
export function buyerQuoteTextError(text: string, offers: Offer[]): string | null {
  if (offers.some(o => o.pricing_version !== BUYER_PRICING_VERSION)) return "Pricing policy changed. Draft again with the current retail minimum before sending.";
  const supplied = offers.flatMap(o => [o.our_total, o.retail_total, o.our_price_per_space, o.retail_per_space, o.transfer_fee, ...(o.add_on_fees || []), o.partial_offer?.our_total, o.partial_offer?.retail_total, ...(o.partial_offer?.add_on_fees || [])]).filter((v): v is string => !!v);
  const allowed = new Set(supplied.flatMap(amounts));
  const quoted = new Set(amounts(text));
  if ([...quoted].some(n => !allowed.has(n))) return "The email contains an unverified price. Use the current supplied buyer totals; no rounding down or additional discounts.";
  for (const o of offers) {
    const required = [o.our_total, o.partial_offer?.our_total].filter((v): v is string => !!v).flatMap(amounts);
    if (required.some(n => !quoted.has(n))) return "The email is missing a verified total for the offered number of spaces. Draft again before sending.";
  }
  return null;
}