import { describe, expect, it } from "vitest";
import { sellerQuoteBacklog } from "../../supabase/functions/_shared/sellerQuoteBacklog";
const seller = { id: "quote", email: "seller@example.com", created_at: "2026-10-01T00:00:00Z", seller_attachments: [{ path: "deed.jpg" }] };
describe("quote tasks independent of email direction", () => {
  it("keeps attachment quote work after an outbound acknowledgement or reply dismissal", () => {
    expect(sellerQuoteBacklog([{ ...seller, reply_dismissed_at: "2026-11-06", last_email_from_us: true }], [], [], []).map(s => s.id)).toEqual(["quote"]);
  });
  it("finds profile and uploaded document attachments", () => {
    expect(sellerQuoteBacklog([{ ...seller, seller_attachments: [], customer_profile_id: "profile" }], [], [{ customer_profile_id: "profile" }], []).length).toBe(1);
    expect(sellerQuoteBacklog([{ ...seller, seller_attachments: [] }], [], [], [{ submission_id: "quote", file_urls: ["deed.jpg"] }]).length).toBe(1);
  });
  it("does not ask for another quote when a duplicate address has already progressed", () => {
    expect(sellerQuoteBacklog([seller, { ...seller, id: "quoted", quote_sent_at: "2026-11-06" }], [], [], [])).toEqual([]);
  });
  it("excludes no-file, quoted, accepted, paused, archived and buyer records", () => {
    for (const fields of [{ seller_attachments: [] }, { quote_sent_at: "2026-11-06" }, { quote_response: "accepted" }, { ai_paused_at: "2026-11-06" }, { archived_at: "2026-11-06" }, { source: "buy_inquiry" }]) {
      expect(sellerQuoteBacklog([{ ...seller, ...fields }], [], [], [])).toEqual([]);
    }
  });
});