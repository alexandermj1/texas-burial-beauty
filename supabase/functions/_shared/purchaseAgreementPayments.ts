export type PaymentFields = {
  charges: { deposit: number; balance: number; transfer_fee: number; adjustments: number };
  payment?: { collection: "manual" | "full" | "deposit"; deposit_basis: "amount" | "percent"; deposit_value: number };
};
const cents = (n: number) => Math.round(n * 100) / 100;

/** Deposits are part of the total purchase price, never an additional fee. */
export function paymentSchedule(fields: PaymentFields) {
  const total = cents(fields.charges.deposit + fields.charges.balance + fields.charges.transfer_fee + fields.charges.adjustments);
  const p = fields.payment;
  const deposit = p ? cents(p.deposit_basis === "percent" ? total * p.deposit_value / 100 : p.deposit_value) : cents(fields.charges.deposit);
  return { total, deposit, balance: cents(total - deposit), collection: p?.collection ?? "full" };
}

export function paymentSettingsError(fields: PaymentFields): string | null {
  const s = paymentSchedule(fields);
  if (!Number.isFinite(s.deposit) || s.deposit < 0 || s.deposit > s.total || (fields.payment?.deposit_basis === "percent" && fields.payment.deposit_value > 100)) return "Deposit must be between zero and the total purchase price (0–100%).";
  if (s.collection === "deposit" && s.deposit <= 0) return "Enter a deposit before selecting an automatic deposit link.";
  return null;
}

export function agreementPaymentProgress(fields: PaymentFields, transactions: { amount_cents: number; refund_amount_cents?: number | null; status: string; environment: string }[], environment = "live") {
  const totalCents = Math.round(paymentSchedule(fields).total * 100);
  const paidCents = transactions.filter((t) => t.environment === environment && t.status === "paid")
    .reduce((sum, t) => sum + Math.max(0, t.amount_cents - (t.refund_amount_cents ?? 0)), 0);
  return { paid: paidCents / 100, remaining: Math.max(0, totalCents - paidCents) / 100, fullyPaid: totalCents > 0 && paidCents >= totalCents };
}

export function requestedPaymentAmount(fields: PaymentFields, purpose: "deposit" | "balance", paid = 0) {
  const s = paymentSchedule(fields);
  return cents(Math.max(0, (purpose === "deposit" ? s.deposit : s.total) - paid));
}