import { describe, expect, it } from "vitest";
import { buyerInventoryPricing } from "@/lib/buyerInventoryPricing";

describe("buyer inventory pricing", () => {
  it("uses accepted per-space figures and charges the transfer once for a bundle", () => {
    const p = buyerInventoryPricing({ plot_count: 2, quote_amount: 5000, accepted_quote_amount: 5500, transfer_fee_amount: 595 }, 1495);
    expect(p.single.netPerSpace).toBe(5500);
    expect(p.single.buyerPriceTotal).toBe(8044);
    expect(p.together?.buyerPriceTotal).toBe(14369);
    expect(p.together?.transferFee).toBe(1495);
  });
  it("does not invent a plot count or unknown fee", () => {
    const p = buyerInventoryPricing({ spaces: "5+", quote_amount: 4000 }, null);
    expect(p.count).toBeNull();
    expect(p.ready).toBe(false);
  });
  it("honours recorded zero fees and includes added one-time fees", () => {
    const p = buyerInventoryPricing({ spaces: "3", quote_amount: 1000, transfer_fee_amount: 0, buyer_fees: [{ label: "Recording", amount: 350 }] }, null);
    expect(p.ready).toBe(true);
    expect(p.single.buyerPriceTotal).toBe(1500);
    expect(p.together?.buyerPriceTotal).toBe(3800);
  });
});