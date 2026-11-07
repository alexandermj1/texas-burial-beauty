import { expect, it } from "vitest";
import { paidListingOption, requestedLowerQuote } from "../../supabase/functions/seller-agent/quoteCorrectionPolicy";
import { parityAllowed } from "../../supabase/functions/seller-agent/parity";
const sub = { quote_sent_at: "2026-11-05", quote_amount: 10900 };
const fields = { per_space: "7000", spaces: "3", requested_price_email_id: "seller-email" };
const email = { id: "seller-email", from_email: "art@example.com", body_text: "Please lower the price to $7,000.00 per plot, for a total of $21,000.00." };
it("does not permit an unpaid listing-option change", () => expect(parityAllowed(sub, []).has("change_listing_option")).toBe(false));
it("requires paid live Featured evidence rather than pending, test or Pro payment", () => {
  const p = { kind: "listing_fee", environment: "live", status: "paid", paid_at: "2026-11-07", metadata: { listing_tier: "custom_plus" } };
  expect(paidListingOption("featured", [p])).toBe(true);
  for (const patch of [{ status: "pending" }, { environment: "test" }, { refunded_at: "2026-11-07" }, { metadata: { listing_tier: "pro" } }]) expect(paidListingOption("featured", [{ ...p, ...patch }])).toBe(false);
});
it("allows Art's explicit $7000 per-space reduction for three spaces", () => expect(requestedLowerQuote(sub, fields, email)).toBe(true));
it("rejects higher, invented, ambiguous or quoted-only prices", () => {
  expect(requestedLowerQuote(sub, { ...fields, per_space: "11000" }, email)).toBe(false);
  expect(requestedLowerQuote(sub, { ...fields, per_space: "6000" }, email)).toBe(false);
  expect(requestedLowerQuote(sub, fields, { ...email, body_text: "Please lower it to $7000." })).toBe(false);
  expect(requestedLowerQuote(sub, fields, { ...email, body_text: "Thanks\n> Please lower to $7000 per plot" })).toBe(false);
});
it("does not rewrite accepted, paid or signed prices", () => {
  for (const patch of [{ quote_response: "accepted" }, { accepted_quote_amount: 10900 }, { listing_paid_at: "2026-11-07" }, { la_signed_at: "2026-11-07" }]) expect(requestedLowerQuote({ ...sub, ...patch }, fields, email)).toBe(false);
});