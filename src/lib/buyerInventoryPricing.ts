import { normalizeBuyerFees, quoteFigures } from "@/lib/quoteFigures";

/** Inventory uses the same per-space quote and one-time fee convention as staff quotes. */
export function buyerInventoryPricing(s: Record<string, any>, directoryFee: number | null) {
  const rawCount = Number(s.plot_count) || Number(s.spaces);
  const count = Number.isInteger(rawCount) && rawCount > 0 ? rawCount : null;
  const fee = directoryFee ?? s.transfer_fee_amount;
  const transferFee = fee != null && Number.isFinite(Number(fee)) && Number(fee) >= 0 ? Number(fee) : null;
  const fees = normalizeBuyerFees(s.buyer_fees);
  const input = {
    quoteAmount: s.quote_amount,
    acceptedAmount: s.accepted_quote_amount,
    transferFee,
    buyerFees: fees,
  };
  const single = quoteFigures({ ...input, plotCount: 1 });
  const together = count ? quoteFigures({ ...input, plotCount: count }) : null;
  return { count, transferFee, single, together, ready: single.hasQuote && transferFee !== null };
}