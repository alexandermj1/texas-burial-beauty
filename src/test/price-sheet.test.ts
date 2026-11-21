import { describe, expect, it } from "vitest";
import { buildSheetRow, sheetEligible, sheetPaperwork } from "../lib/priceSheet";

const seller = { id: "seller", name: "Seller", customer_kind: "seller", cemetery: "Restland", quote_response: "accepted", plot_count: 2, accepted_quote_amount: 4500, transfer_fee_amount: 350, cemetery_retail: 10000, ownership_answers: { sellerConfirmedAt: "2026-11-21" } };
const directory = [{ name: "Restland Memorial Park", city: "Dallas", region: "Dallas–Fort Worth", transfer_fee: 350 }];
const docs = [{ submission_id: "seller", doc_code: "D1", status: "received", manual_override: "received" }, { submission_id: "seller", doc_code: "POA", status: "received", manual_override: "received" }];
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
    expect(row.buyerTotal).toBe(14000); // 70% of 2 x $10,000 retail
    expect(row.sellerCommission).toBe(1350);
    expect(row.buyerCommission).toBe(1403);
    expect(row.adjustmentFee).toBe(3247);
    expect(row.profit).toBe(6000); // 2753 commissions + 3247 brokerage adjustment
    expect(row.sellerProceeds).toBe(7650);
    expect(row.buyerPerSpace).toBe(7000);
    expect(row.adjustmentPerSpace).toBe(1422);
    expect(row.pctRetail).toBe(70);
    expect(row.pctRetailBundle).toBe(70);
  });
  it("includes added fees in the final buyer total but not in commission profit", () => {
    const row = buildSheetRow({ ...seller, buyer_fees: [{ id: "notary", label: "Notary", amount: 150 }] }, docs, directory);
    expect(row.buyerTotal).toBe(14000);
    expect(row.buyerPerSpace).toBe(7000);
    expect(row.extraFees).toBe(150);
    expect(row.adjustmentFee).toBe(3097);
    expect(row.profit).toBe(5850);
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
  it("an uploaded deed without a logged original is returning, not complete", () => {
    expect(sheetPaperwork(seller, [{ submission_id: "seller", doc_code: "D1", status: "received" }]).state).toBe("pending");
  });
  it("recognizes our actual D21 limited POA code, not the D15 outside POA", () => {
    expect(sheetPaperwork(seller, [docs[0], { ...docs[1], doc_code: "D21", document_type: "D21" }]).state).toBe("complete");
    expect(sheetPaperwork(seller, [docs[0], { ...docs[1], doc_code: "D15", document_type: "D15" }]).state).toBe("review");
  });
  it("keeps staff-marked Complete green while flagging outstanding checklist items separately", () => {
    const row = sheetPaperwork({ ...seller, documents_completed_at: "2026-11-21" }, [docs[0], { ...docs[1], status: "pending" }]);
    expect(row.state).toBe("complete");
    expect(row.staffComplete).toBe(true);
    expect(row.conflicts).toContain("Completion milestone conflicts with outstanding checklist items.");
    expect(row.count).toMatchObject({ received: 1, total: 2 });
    expect(row.pending).toHaveLength(1);
  });
  it("never treats an uploaded copy or a deed alone as all documents back", () => {
    expect(sheetPaperwork(seller, [{ ...docs[1], status: "uploaded", manual_override: null }]).state).toBe("pending");
    expect(sheetPaperwork(seller, [docs[0]]).state).not.toBe("complete");
  });
  it("does not invent document returns for a staff-completed record with uploaded copies", () => {
    const row = buildSheetRow({ ...seller, documents_completed_at: "2026-11-21" }, [{ ...docs[1], status: "uploaded", manual_override: null }], directory);
    expect(row.documentState).toBe("complete");
    expect(row.docsReceived).toBe(0);
    expect(row.docsTotal).toBe(1);
    expect(row.paperwork.conflicts.length).toBeGreaterThan(0);
  });
  it("keeps sold/closed history separate and reserved inventory out of Buyer AI eligibility", () => {
    for (const change of [{ sold_at: "2026-11-21" }, { closed_at: "2026-11-21" }, { reserved_until: "2099-01-01" }]) expect(buildSheetRow({ ...seller, ...change }, docs, directory).aiEligible).toBe(false);
  });
  it("leaves buyer prices already above 70% of retail unchanged", () => {
    const row = buildSheetRow({ ...seller, cemetery_retail: 5000 }, docs, directory);
    expect(row.pctRetail).toBeGreaterThan(70);
    expect(row.buyerTotal).toBe(10753);
    expect(row.adjustmentFee).toBe(0);
    expect(row.profit).toBe(2753);
  });
  it("does not show a signed agreement alone as completed paperwork", () => {
    const row = buildSheetRow({ ...seller, ownership_answers: {}, quote_response: null, la_signed_at: "2026-11-21" }, [], directory);
    expect(row.documentState).toBe("not_requested");
    expect(row.docsReceived).toBe(0);
    expect(row.docsTotal).toBe(0);
  });
  it("shows exactly 5/7 documents returned while the packet is still returning", () => {
    const packet = Array.from({ length: 7 }, (_, i) => ({ submission_id: "seller", doc_code: i === 0 ? "D21" : "D2", status: i < 5 ? "received" : "pending" }));
    const row = buildSheetRow(seller, packet, directory);
    expect(row.documentState).toBe("pending");
    expect(row.docsReceived).toBe(5);
    expect(row.docsTotal).toBe(7);
  });
});
import { documentProgress } from "../../supabase/functions/_shared/documentProgress";
describe("uploaded vs at Glendale", () => {
  const docs = [
    { doc_code: "D2P", label: "Photo ID", person_name: "Ann", status: "pending", file_urls: ["a/id.jpg"] },
    { doc_code: "D21", label: "POA", person_name: "Ann", status: "pending", manual_override: "issued", file_urls: ["a/poa.pdf"] },
    { doc_code: "D1", label: "Deed", status: "pending", file_urls: ["a/deed.pdf"] },
    { doc_code: "LA", label: "Listing agreement", status: "pending" },
  ];
  it("counts uploads separately from originals at Glendale", () => {
    const p = documentProgress(docs, { la_signed_at: "2026-10-01" });
    expect(p.total).toBe(4);
    expect(p.uploaded).toBe(4);
    expect(p.atGlendale).toBe(2); // photo ID copy + e-signed agreement; POA and deed originals not logged
  });
  it("counts the seller's posted tick as at Glendale", () => {
    const p = documentProgress(docs, { la_signed_at: "2026-10-01", ownership_answers: { mailedConfirmed: { "D21::Ann": "x", "D1::": "x" } } });
    expect(p.atGlendale).toBe(4);
    expect(p.sellerPostedOnly).toBe(2);
  });
  it("an upload alone never puts a deed at Glendale", () => {
    const p = documentProgress([docs[2]], {});
    expect(p.uploaded).toBe(1);
    expect(p.atGlendale).toBe(0);
  });
});
