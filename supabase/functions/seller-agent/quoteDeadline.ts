type Quote = { quote_sent_at?: unknown; quote_expires_at?: unknown; quote_amount?: unknown; quote_response?: unknown; accepted_quote_amount?: unknown; la_signed_at?: unknown };
export function canExtendQuote(sub: Quote, signed = false) {
  return !!sub.quote_sent_at && Number(sub.quote_amount) > 0 && sub.quote_response !== "accepted" && !(Number(sub.accepted_quote_amount) > 0) && !sub.la_signed_at && !signed;
}
export function quoteDeadline(sub: Quote) {
  return sub.quote_expires_at ? Date.parse(String(sub.quote_expires_at)) : Date.parse(String(sub.quote_sent_at)) + 10 * 86_400_000;
}
export function extendedDeadline(sub: Quote, requested: unknown, now = Date.now()) {
  const text = String(requested ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) throw new Error("A quote extension needs an exact date, time and timezone.");
  const next = Date.parse(text), previous = quoteDeadline(sub);
  if (!Number.isFinite(next) || !Number.isFinite(previous) || next <= now || next <= previous) throw new Error("The new quote deadline must be in the future and later than the current deadline.");
  return new Date(next).toISOString();
}
export async function saveQuoteExtension(db: any, sub: Quote & { id: string }, requested: unknown, now = Date.now()) {
  if (!canExtendQuote(sub)) throw new Error("Only an unaccepted, unsigned quote can be extended.");
  const next = extendedDeadline(sub, requested, now);
  const { error } = await db.from("contact_submissions").update({ quote_expires_at: next }).eq("id", sub.id);
  if (error) throw new Error(error.message);
  return next;
}