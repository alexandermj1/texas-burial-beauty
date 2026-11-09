import { expect, it } from "vitest";
import { isSellerRecord } from "../../supabase/functions/_shared/sellerKind";
it("autopilot and agent agree buyer-page enquiries are not sellers", () => {
  expect(isSellerRecord({ source: "cemetery_page_buyer" })).toBe(false);
  expect(isSellerRecord({ source: "contact" })).toBe(false);
  expect(isSellerRecord({ source: "contact", quote_sent_at: "2026-11-01" })).toBe(true);
  expect(isSellerRecord({ source: "seller_quote" })).toBe(true);
});
