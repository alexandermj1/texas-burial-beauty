import { expect, it } from "vitest";
import { canExtendQuote, extendedDeadline, saveQuoteExtension } from "../../supabase/functions/seller-agent/quoteDeadline";
import { pendingRecordChanges } from "../../supabase/functions/_shared/originalDocumentReceipt";
const glenda = { id: "test", quote_sent_at: "2026-10-28T18:45:01Z", quote_expires_at: "2026-11-08T14:45:01.931Z", quote_amount: 9000 };
const now = Date.parse("2026-11-06T12:44:00Z");
it("allows more time before the quote has expired", () => {
  expect(canExtendQuote(glenda)).toBe(true);
  expect(extendedDeadline(glenda, "2026-11-10T23:59:59-06:00", now)).toBe("2026-11-11T05:59:59.000Z");
});
it("never shortens a deadline or saves an ambiguous date", () => {
  expect(() => extendedDeadline(glenda, "2026-11-07T18:00:00Z", now)).toThrow();
  expect(() => extendedDeadline(glenda, "Monday", now)).toThrow();
});
it("does not extend an accepted or signed quote", () => {
  expect(canExtendQuote({ ...glenda, quote_response: "accepted" })).toBe(false);
  expect(canExtendQuote(glenda, true)).toBe(false);
});
it("requires approval of the extension before its confirming reply", () => {
  const reply = { id: "reply", run_id: "review" };
  expect(pendingRecordChanges([{ id: "extend", run_id: "review", status: "proposed", action_type: "extend_quote_deadline" }], reply)).toBe(true);
  expect(pendingRecordChanges([{ id: "extend", run_id: "review", status: "executed", action_type: "extend_quote_deadline" }], reply)).toBe(false);
});
it("changes only expiry, preserving prices, spaces, terms and original sent date", async () => {
  let saved: unknown;
  const db = { from: () => ({ update: (patch: unknown) => { saved = patch; return { eq: async () => ({ error: null }) }; } }) };
  await saveQuoteExtension(db, glenda, "2026-11-10T23:59:59-06:00", now);
  expect(saved).toEqual({ quote_expires_at: "2026-11-11T05:59:59.000Z" });
});