import { describe, expect, it } from "vitest";
import { buyerDocumentReadiness, countBuyerDocuments } from "../../supabase/functions/buyer-agent/documentReadiness";

const engaged = { quote_response: "accepted", ownership_answers: { sellerConfirmedAt: "2026-10-01" } };
describe("buyer inventory document readiness", () => {
  it("does not treat Maria's only received deed as completed paperwork", () => {
    const docs = countBuyerDocuments([{ doc_code: "D1", status: "received" }]);
    expect(buyerDocumentReadiness({ documents_requested_at: null, documents_completed_at: null }, docs)).toEqual({ requested: false, complete: false, almostComplete: false });
  });
  it("honours staff's recorded completion milestone", () => {
    expect(buyerDocumentReadiness({ documents_completed_at: "2026-10-17T11:40:00Z" }).complete).toBe(true);
  });
  it("recognizes a returned requested packet including its deed", () => {
    const docs = countBuyerDocuments([{ doc_code: "D1", status: "received" }, { doc_code: "POA", status: "completed" }]);
    expect(buyerDocumentReadiness(engaged, docs).complete).toBe(true);
  });
  it("does not mark an outstanding packet complete", () => {
    const docs = countBuyerDocuments([{ doc_code: "D1", status: "received" }, { doc_code: "POA", status: "requested" }]);
    expect(buyerDocumentReadiness(engaged, docs).complete).toBe(false);
  });
  it("never shows Nell Berry-style untouched inquiries as docs out", () => {
    const docs = countBuyerDocuments([{ doc_code: "REVIEW", document_type: "REVIEW", status: "pending" }]);
    expect(buyerDocumentReadiness({ quote_response: null }, docs).requested).toBe(false);
  });
  it("needs the family tree as well as an accepted quote", () => {
    const docs = countBuyerDocuments([{ doc_code: "POA", status: "requested" }]);
    expect(buyerDocumentReadiness({ quote_response: "accepted" }, docs).requested).toBe(false);
  });
});