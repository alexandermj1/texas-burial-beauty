import { describe, it, expect } from "vitest";
import { sellerStage } from "../../supabase/functions/seller-agent/pipeline";

describe("seller AI pipeline stage", () => {
  it("no deed uploaded yet is No attachments", () => expect(sellerStage({}, false)).toBe("no_attachments"));
  it("uploaded file but no quote is Attachments", () => expect(sellerStage({}, true)).toBe("attachments"));
  it("quote sent is Quoted", () => expect(sellerStage({ quote_sent_at: "x" }, true)).toBe("quoted"));
  it("accepted quote is Accepted", () => expect(sellerStage({ quote_sent_at: "x", quote_response: "accepted" }, true)).toBe("accepted"));
  it("tree sent but not done is Tree sent", () => expect(sellerStage({ quote_response: "accepted", ownership_answers: { questionsSentAt: "x" } }, true)).toBe("tree_sent"));
  it("tree completed is Tree done", () => expect(sellerStage({ ownership_answers: { questionsSentAt: "x", sellerConfirmedAt: "y" } }, true)).toBe("tree_done"));
  it("document request sent is Docs out", () => expect(sellerStage({ documents_requested_at: "x", ownership_answers: { sellerConfirmedAt: "y" } }, true)).toBe("docs_out"));
  it("documents completed is Complete", () => expect(sellerStage({ documents_requested_at: "x", documents_completed_at: "z" }, true)).toBe("complete"));
});
