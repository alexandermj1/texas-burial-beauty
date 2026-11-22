import { isInteractiveReview } from "../../supabase/functions/purchase-agreement/review";
import { describe, expect, it } from "vitest";
import { termsForVersion } from "../../supabase/functions/purchase-agreement/terms";
import { chargeTotals, defaultFields, sellerReadyForBuyer, normalizeFields, documentFingerprint, paymentSchedule, paymentSettingsError, agreementPaymentProgress, requestedPaymentAmount, canonicalDocument, TERMS, LEGACY_TERMS_VERSION } from "@/lib/purchaseAgreement";

describe("purchase agreement rules", () => {
  it("only treats the exact unexpired review token as a safe signature preview", () => {
    const f = { _review_token: "internal-review-token", _review_expires_at: "2099-01-01T00:00:00Z" };
    expect(isInteractiveReview(f, "internal-review-token")).toBe(true);
    expect(isInteractiveReview(f, "live-buyer-token")).toBe(false);
    expect(isInteractiveReview({ ...f, _review_expires_at: "2020-01-01T00:00:00Z" }, "internal-review-token")).toBe(false);
  });
  it("requires the full Barton balance including the transfer fee to settle, not just the deposit", () => {
    const f = normalizeFields({ charges: { deposit: 5290, balance: 47610, transfer_fee: 595 }, payment: { collection: "manual", deposit_basis: "amount", deposit_value: 5290 } });
    const payment = (cents: number) => [{ amount_cents: cents, status: "paid", environment: "live" }];
    expect(agreementPaymentProgress(f, payment(529000)).fullyPaid).toBe(false);
    expect(agreementPaymentProgress(f, payment(5290000)).fullyPaid).toBe(false);
    expect(agreementPaymentProgress(f, payment(5349500)).fullyPaid).toBe(true);
    expect(requestedPaymentAmount(f, "balance", 5290)).toBe(48205);
  });
  it("keeps the Barton deposit at ten percent of the property price, excluding transfer", () => {
    const f = normalizeFields({ charges: { deposit: 5290, balance: 47610, transfer_fee: 595 }, payment: { collection: "manual", deposit_basis: "amount", deposit_value: 5290 } });
    expect(chargeTotals(f.charges)).toEqual({ totalProperty: 52900, totalDue: 53495 });
    expect(paymentSchedule(f)).toEqual({ total: 53495, deposit: 5290, balance: 48205, collection: "manual" });
    expect(paymentSchedule(f).deposit).toBe(chargeTotals(f.charges).totalProperty * 0.1);
  });
  it("preserves previously issued v2 terms while versioning the clarified retention clause", () => {
    expect(termsForVersion("tcb-pa-2026-11-deposit-v2").find((s) => s.heading.startsWith("Article IX."))?.body).toHaveLength(4);
    expect(termsForVersion().find((s) => s.heading.startsWith("Article IX."))?.body).toHaveLength(5);
  });
  it("only offers buyer matching once a seller is at Docs out or later", () => {
    expect(sellerReadyForBuyer({ documents_requested_at: null, documents_completed_at: null })).toBe(false);
    expect(sellerReadyForBuyer({ documents_requested_at: "2026-11-01" })).toBe(true);
    expect(sellerReadyForBuyer({ documents_requested_at: "2026-11-01", sold_at: "2026-11-02" })).toBe(false);
    expect(sellerReadyForBuyer({ listing_live_at: "2026-11-01" })).toBe(true);
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
  it("keeps an agreement for three spaces at or above 70% of their retail", () => {
    const f = defaultFields({ plot_count: 4, quote_amount: 2000, transfer_fee_amount: 300, cemetery_retail: 10000 }, { name: "Buyer", spaces: "3" });
    expect(f.property.spaces).toBe(3);
    expect(chargeTotals(f.charges).totalDue).toBe(21000);
    expect(f.charges.adjustments_note).toContain("Brokerage adjustment fee");
  });
  it("fingerprint changes when the price changes", async () => {
    const a = normalizeFields({ charges: { balance: 1000 } });
    const b = normalizeFields({ charges: { balance: 1001 } });
    expect(await documentFingerprint(a)).not.toBe(await documentFingerprint(b));
  });
  it("defaults to agreement only without an automatic payment request", () => {
    expect(paymentSchedule(defaultFields({ quote_amount: 1000, transfer_fee_amount: 100 }, { email: "buyer@example.com" })).collection).toBe("manual");
  });
  it("calculates a selected 10% deposit on the full purchase including fees", () => {
    const f = normalizeFields({ charges: { balance: 9000, transfer_fee: 1000 }, payment: { collection: "deposit", deposit_basis: "percent", deposit_value: 10 } });
    expect(paymentSchedule(f)).toEqual({ total: 10000, deposit: 1000, balance: 9000, collection: "deposit" });
    expect(requestedPaymentAmount(f, "deposit")).toBe(1000);
  });
  it("accepts a dollar deposit without adding it to the purchase price", () => {
    const f = normalizeFields({ charges: { balance: 9000, transfer_fee: 1000 }, payment: { collection: "manual", deposit_basis: "amount", deposit_value: 750 } });
    expect(paymentSchedule(f)).toEqual({ total: 10000, deposit: 750, balance: 9250, collection: "manual" });
  });
  it("allows a different selected percentage, not fixed at ten", () => {
    const f = normalizeFields({ charges: { balance: 10000 }, payment: { collection: "deposit", deposit_basis: "percent", deposit_value: 25 } });
    expect(requestedPaymentAmount(f, "deposit")).toBe(2500);
  });
  it("rejects deposits above the full price or percentages above 100", () => {
    expect(paymentSettingsError(normalizeFields({ charges: { balance: 1000 }, payment: { collection: "deposit", deposit_basis: "amount", deposit_value: 1001 } }))).not.toBeNull();
    expect(paymentSettingsError(normalizeFields({ charges: { balance: 1000 }, payment: { collection: "deposit", deposit_basis: "percent", deposit_value: 101 } }))).not.toBeNull();
  });
  it("a deposit is not a fully paid sale and only the remaining balance is charged later", () => {
    const f = normalizeFields({ charges: { balance: 10000 }, payment: { collection: "deposit", deposit_basis: "percent", deposit_value: 10 } });
    const p = agreementPaymentProgress(f, [{ amount_cents: 100000, status: "paid", environment: "live" }]);
    expect(p).toEqual({ paid: 1000, remaining: 9000, fullyPaid: false });
    expect(requestedPaymentAmount(f, "balance", p.paid)).toBe(9000);
    expect(requestedPaymentAmount(f, "deposit", p.paid)).toBe(0);
    expect(agreementPaymentProgress(f, [{ amount_cents: 100000, status: "paid", environment: "live" }, { amount_cents: 900000, status: "paid", environment: "live" }]).fullyPaid).toBe(true);
  });
  it("test payments do not settle a live agreement", () => {
    expect(agreementPaymentProgress(normalizeFields({ charges: { balance: 1000 } }), [{ amount_cents: 100000, status: "paid", environment: "sandbox" }]).fullyPaid).toBe(false);
  });
  it("preserves legacy fields and terms in the signed fingerprint", () => {
    const f = normalizeFields({ charges: { balance: 1000 } });
    expect(f.payment).toBeUndefined();
    const text = JSON.parse(canonicalDocument(f, LEGACY_TERMS_VERSION));
    expect(text.terms).toEqual(TERMS);
    expect(text.fields).not.toHaveProperty("payment");
  });
  it("payment choice and deposit are included in the fingerprint", async () => {
    const a = normalizeFields({ charges: { balance: 1000 }, payment: { collection: "manual", deposit_basis: "percent", deposit_value: 10 } });
    const b = { ...a, payment: { collection: "deposit" as const, deposit_basis: "percent" as const, deposit_value: 10 } };
    expect(await documentFingerprint(a)).not.toBe(await documentFingerprint(b));
  });
});
