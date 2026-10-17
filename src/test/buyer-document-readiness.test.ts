import { describe, expect, it } from "vitest";
import { buyerDocumentReadiness, countBuyerDocuments } from "../../supabase/functions/buyer-agent/documentReadiness";

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
    expect(buyerDocumentReadiness({}, docs).complete).toBe(true);
  });
  it("does not mark an outstanding packet complete", () => {
    const docs = countBuyerDocuments([{ doc_code: "D1", status: "received" }, { doc_code: "POA", status: "requested" }]);
    expect(buyerDocumentReadiness({}, docs).complete).toBe(false);
  });
});