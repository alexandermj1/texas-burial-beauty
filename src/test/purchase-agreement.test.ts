import { describe, expect, it } from "vitest";
import { chargeTotals, defaultFields, sellerReadyForBuyer, normalizeFields, documentFingerprint } from "@/lib/purchaseAgreement";

describe("purchase agreement rules", () => {
  it("only offers buyer matching once a seller is at Docs out or later", () => {
    expect(sellerReadyForBuyer({ documents_requested_at: null, documents_completed_at: null })).toBe(false);
    expect(sellerReadyForBuyer({ documents_requested_at: "2026-11-01" })).toBe(true);
    expect(sellerReadyForBuyer({ documents_requested_at: "2026-11-01", sold_at: "2026-11-02" })).toBe(false);
  });
  it("total due = deposit + balance + transfer fee + adjustments", () => {
    expect(chargeTotals({ deposit: 500, balance: 4500, transfer_fee: 395, adjustments: -100, adjustments_note: "" })).toEqual({ totalProperty: 5000, totalDue: 5295 });
  });
  it("prices only the spaces the buyer asked for, using buyer pricing", () => {
    const f = defaultFields({ cemetery: "Grove Hill", plot_count: 4, quote_amount: 2000, transfer_fee_amount: 300 }, { name: "Ann", spaces: "2" });
    expect(f.property.spaces).toBe(2);
    // (2*2000 + 300) * 1.15 = 4945 total, transfer fee shown separately
    expect(chargeTotals(f.charges).totalDue).toBe(4945);
    expect(f.charges.transfer_fee).toBe(300);
  });
  it("fingerprint changes when the price changes", async () => {
    const a = normalizeFields({ charges: { balance: 1000 } });
    const b = normalizeFields({ charges: { balance: 1001 } });
    expect(await documentFingerprint(a)).not.toBe(await documentFingerprint(b));
  });
});
