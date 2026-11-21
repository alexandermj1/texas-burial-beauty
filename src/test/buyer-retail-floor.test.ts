import { describe, it, expect } from "vitest";
import { buyerQuotePricing, BUYER_PRICING_VERSION } from "../../supabase/functions/_shared/buyerQuotePricing";
import { buyerQuoteTextError } from "../../supabase/functions/buyer-agent/quoteValidation";

const input = { acceptedAmount: 4500, transferFee: 350, retailPerSpace: 10000, plotCount: 1 };
describe("new buyer retail minimum", () => {
  it("adds a fee to bring a below-retail single-space quote to exactly 70%", () => {
    const p = buyerQuotePricing(input);
    expect(p.buyerPriceTotal).toBe(7000);
    expect(p.adjustmentFee).toBe(1422);
    expect(p.buyerFees).toContainEqual({ id: "retail_floor_adjustment", label: "Brokerage adjustment fee", amount: 1422 });
    expect(p.netTotal).toBe(4500);
    expect(p.buyerPremiumTotal).toBe(728);
  });
  it("prices the requested three spaces at 70% of their retail, with transfer once", () => {
    const p = buyerQuotePricing({ ...input, plotCount: 3 });
    expect(p.buyerPriceTotal).toBe(21000);
    expect(p.transferFee).toBe(350);
    expect(p.netTotal).toBe(13500);
    expect(p.adjustmentFee).toBe(5072);
  });
  it("keeps higher prices unchanged instead of applying the old ceiling", () => {
    const p = buyerQuotePricing({ ...input, acceptedAmount: 7000 });
    expect(p.buyerPriceTotal).toBe(8453);
    expect(p.adjustmentFee).toBe(0);
  });
  it("includes existing fees before calculating the additional fee", () => {
    const p = buyerQuotePricing({ ...input, buyerFees: [{ id: "notary", label: "Notary", amount: 150 }] });
    expect(p.buyerPriceTotal).toBe(7000);
    expect(p.adjustmentFee).toBe(1272);
  });
  it("never invents missing retail, transfer or a sale price", () => {
    for (const p of [buyerQuotePricing({ ...input, retailPerSpace: null }), buyerQuotePricing({ ...input, transferFee: null }), buyerQuotePricing({ ...input, acceptedAmount: null })]) expect(p.adjustmentFee).toBe(0);
  });
  it("rounds a fractional-cent floor up, never below 70%", () => {
    const p = buyerQuotePricing({ ...input, acceptedAmount: 100, retailPerSpace: 10000.01 });
    expect(p.buyerPriceTotal).toBe(7000.01);
    expect(p.buyerPriceTotal).toBeGreaterThanOrEqual(10000.01 * 0.7);
  });
});

describe("buyer quote send guard", () => {
  const offer = { pricing_version: BUYER_PRICING_VERSION, our_total: "$28,000", retail_total: "$40,000", partial_offer: { our_total: "$21,000", retail_total: "$30,000" } };
  it("accepts current exact full-group and three-space totals", () => expect(buyerQuoteTextError("Four spaces $28,000; three spaces $21,000", [offer])).toBeNull());
  it("blocks a discounted below-floor three-space price", () => expect(buyerQuoteTextError("Four spaces $28,000; three spaces $20,900", [offer])).not.toBeNull());
  it("blocks a stale pre-update price snapshot", () => expect(buyerQuoteTextError("Four spaces $28,000; three spaces $21,000", [{ ...offer, pricing_version: undefined }])).not.toBeNull());
  it("requires the total for the requested subset", () => expect(buyerQuoteTextError("Four spaces $28,000", [offer])).not.toBeNull());
});