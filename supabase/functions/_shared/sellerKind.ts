/** Single definition of "this record is a seller" for seller-agent and seller-autopilot — they must agree, or the sweep wastes review slots on records the agent skips. */
export function isSellerRecord(s: { customer_kind?: string | null; source?: string | null; quote_sent_at?: string | null }) {
  const kind = String(s.customer_kind ?? "").toLowerCase();
  if (kind.includes("buyer") || kind.includes("general") || kind.includes("partner")) return false;
  return s.source === "seller_quote" || (s.source === "contact" && !!s.quote_sent_at) || kind.includes("seller");
}
