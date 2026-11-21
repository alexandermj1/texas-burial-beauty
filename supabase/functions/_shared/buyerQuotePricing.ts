import { quoteFigures, type BuyerFee } from "./quoteFigures.ts";

export const MIN_BUYER_RETAIL_SHARE = 0.70;
export const RETAIL_ADJUSTMENT_LABEL = "Brokerage adjustment fee";
export const BUYER_PRICING_VERSION = "retail-floor-v1";
const cents = (n: number) => Math.round(n * 100) / 100;

/** New buyer offers only: preserve seller terms, commissions and existing fees. */
export function buyerQuotePricing(input: {
  quoteAmount?: number | null; acceptedAmount?: number | null;
  transferFee?: number | null; plotCount?: number | null;
  buyerFees?: BuyerFee[] | null; retailPerSpace?: number | null;
}) {
  const base = quoteFigures(input);
  const retail = Number(input.retailPerSpace);
  const retailKnown = Number.isFinite(retail) && retail > 0;
  const feeKnown = input.transferFee != null && Number.isFinite(Number(input.transferFee)) && Number(input.transferFee) >= 0;
  const countKnown = Number.isInteger(Number(input.plotCount)) && Number(input.plotCount) > 0;
  const minimumBuyerTotal = retailKnown && countKnown ? Math.ceil((retail * base.plotCount * MIN_BUYER_RETAIL_SHARE - 1e-8) * 100) / 100 : null;
  const adjustmentFee = base.hasQuote && feeKnown && minimumBuyerTotal !== null ? cents(Math.max(0, minimumBuyerTotal - base.buyerPriceTotal)) : 0;
  const buyerFees = adjustmentFee > 0 ? [...base.buyerFees, { id: "retail_floor_adjustment", label: RETAIL_ADJUSTMENT_LABEL, amount: adjustmentFee }] : base.buyerFees;
  return {
    ...base, buyerFees, buyerFeesTotal: cents(base.buyerFeesTotal + adjustmentFee),
    buyerPriceTotal: cents(base.buyerPriceTotal + adjustmentFee),
    adjustmentFee, minimumBuyerTotal, retailKnown, pricingVersion: BUYER_PRICING_VERSION,
  };
}