import { describe, expect, it } from "vitest";
import { buildSheetRow, sheetEligible, sheetPaperwork } from "../lib/priceSheet";

const seller = { id: "seller", name: "Seller", customer_kind: "seller", cemetery: "Restland", quote_response: "accepted", plot_count: 2, accepted_quote_amount: 4500, transfer_fee_amount: 350, cemetery_retail: 10000, ownership_answers: { sellerConfirmedAt: "2026-11-21" } };
const directory = [{ name: "Restland Memorial Park", city: "Dallas", region: "Dallas–Fort Worth", transfer_fee: 350 }];
const docs = [{ submission_id: "seller", doc_code: "D1", status: "received" }, { submission_id: "seller", doc_code: "POA", status: "received" }];
describe("private price sheet", () => {
  it("includes signed sellers without an accepted pipeline marker", () => expect(sheetEligible({ ...seller, quote_response: null, la_signed_at: "2026-11-21" })).toBe(true));
  it("excludes buyers and soft-deleted / archived records", () => {
    for (const changes of [{ customer_kind: "buyer" }, { customer_kind: null, source: "buy_inquiry" }, { deleted_at: "2026-11-21" }, { archived_at: "2026-11-21" }]) expect(sheetEligible({ ...seller, ...changes })).toBe(false);
  });
  it("includes progressed records for review even without an acceptance", () => {
    const s = { ...seller, quote_response: null, documents_completed_at: "2026-11-21" };
    expect(sheetEligible(s)).toBe(true);
    expect(buildSheetRow(s, docs, directory).aiEligible).toBe(false);
  });
  it("charges transfer once in a bundle and keeps both 15% commissions separate", () => {
    const row = buildSheetRow(seller, docs, directory);
    expect(row.buyerTotal).toBe(10753); // 9000 + 350 + round(9350 * 15%)
    expect(row.sellerCommission).toBe(1350);
    expect(row.buyerCommission).toBe(1403);
    expect(row.profit).toBe(2753);
    expect(row.sellerProceeds).toBe(7650);
    expect(row.buyerPerSpace).toBe(5578); // separate purchase, not bundle / 2
    expect(row.pctRetail).toBeCloseTo(55.78, 8);
    expect(row.pctRetailBundle).toBeCloseTo(53.765, 8);
  });
  it("includes added fees in the final buyer total but not in commission profit", () => {
    const row = buildSheetRow({ ...seller, buyer_fees: [{ id: "notary", label: "Notary", amount: 150 }] }, docs, directory);
    expect(row.buyerTotal).toBe(10903);
    expect(row.buyerPerSpace).toBe(5728);
    expect(row.profit).toBe(2753);
  });
  it("uses the same directory fee as Buyer AI and flags differing saved quotes", () => {
    const row = buildSheetRow({ ...seller, transfer_fee_amount: 200 }, docs, directory);
    expect(row.transferFee).toBe(350);
    expect(row.issues.some(x => x.includes("differs"))).toBe(true);
  });
  it("does not invent a space count or a zero transfer fee", () => {
    const row = buildSheetRow({ ...seller, plot_count: null, spaces: "two", transfer_fee_amount: null }, docs, []);
    expect(row.plots).toBeNull();
    expect(row.buyerTotal).toBeNull();
    expect(row.buyerPerSpace).toBeNull();
    expect(row.profit).toBeNull();
  });
  it("recognizes returned paperwork even without a completed pipeline milestone", () => {
    const row = buildSheetRow(seller, docs, directory);
    expect(row.documentState).toBe("complete");
    expect(row.issues.some(x => x.includes("milestone is not recorded"))).toBe(true);
  });
  it("recognizes our actual D21 limited POA code, not the D15 outside POA", () => {
    expect(sheetPaperwork(seller, [docs[0], { ...docs[1], doc_code: "D21", document_type: "D21" }]).state).toBe("complete");
    expect(sheetPaperwork(seller, [docs[0], { ...docs[1], doc_code: "D15", document_type: "D15" }]).state).toBe("review");
  });
  it("flags completed milestones with outstanding POAs instead of painting them green", () => {
    const row = sheetPaperwork({ ...seller, documents_completed_at: "2026-11-21" }, [docs[0], { ...docs[1], status: "pending" }]);
    expect(row.state).toBe("review");
    expect(row.pending).toHaveLength(1);
  });
  it("never treats an uploaded copy or a deed alone as all documents back", () => {
    expect(sheetPaperwork(seller, [{ ...docs[1], status: "uploaded" }]).state).toBe("pending");
    expect(sheetPaperwork({ ...seller, documents_completed_at: "2026-11-21" }, [docs[0]]).state).toBe("review");
  });
  it("keeps sold/closed history separate and reserved inventory out of Buyer AI eligibility", () => {
    for (const change of [{ sold_at: "2026-11-21" }, { closed_at: "2026-11-21" }, { reserved_until: "2099-01-01" }]) expect(buildSheetRow({ ...seller, ...change }, docs, directory).aiEligible).toBe(false);
  });
  it("flags buyer prices above the existing 70% retail ceiling without changing the saved price", () => {
    const row = buildSheetRow({ ...seller, cemetery_retail: 5000 }, docs, directory);
    expect(row.pctRetail).toBeGreaterThan(70);
    expect(row.buyerTotal).toBe(10753);
    expect(row.issues.length).toBeGreaterThan(buildSheetRow(seller, docs, directory).issues.length);
  });
});