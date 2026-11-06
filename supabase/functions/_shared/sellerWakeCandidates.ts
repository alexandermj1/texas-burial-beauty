// Share deterministic mailbox classification and priority without invoking AI.
export const emailAddress = (raw: string | null | undefined) => (String(raw ?? "").match(/<([^>]+)>/)?.[1] ?? String(raw ?? "")).trim().toLowerCase();
export const sellerMailOutgoing = (raw: string | null | undefined) => ["info@texascemeterybrokers.com", "texascemeterybrokers@gmail.com", "contracts@texascemeterybrokers.com"].includes(emailAddress(raw));
type Seller = { id: string; email?: string; created_at: string; reply_dismissed_at?: string | null; ownership_answers?: any };
type Mail = { matched_submission_id?: string | null; from_email?: string | null; to_email?: string | null; received_at: string };
export function sellerWakeCandidates(sellers: Seller[], emails: Mail[], due: string[], known: Set<string>) {
  const byAddress = new Map<string, string[]>();
  const ids = new Set(sellers.map(s => s.id));
  for (const s of sellers) { const addr = emailAddress(s.email); if (addr) byAddress.set(addr, [...(byAddress.get(addr) ?? []), s.id]); }
  const latest = new Map<string, Mail>();
  for (const e of [...emails].sort((a,b) => b.received_at.localeCompare(a.received_at))) {
    const matches = new Set<string>();
    if (e.matched_submission_id && ids.has(e.matched_submission_id)) matches.add(e.matched_submission_id);
    const raw = sellerMailOutgoing(e.from_email) ? e.to_email : e.from_email;
    for (const recipient of String(raw ?? "").split(/[,;]/)) for (const sid of byAddress.get(emailAddress(recipient)) ?? []) matches.add(sid);
    for (const sid of matches) if (!latest.has(sid)) latest.set(sid, e);
  }
  const unanswered = sellers.flatMap(s => {
    const mail = latest.get(s.id);
    let at = !mail ? s.created_at : !sellerMailOutgoing(mail.from_email) ? mail.received_at : null;
    const treeAt = s.ownership_answers?.sellerConfirmedAt;
    if (treeAt && (!mail || !sellerMailOutgoing(mail.from_email) || mail.received_at <= treeAt)) at = !at || treeAt > at ? treeAt : at;
    return at && (!s.reply_dismissed_at || at > s.reply_dismissed_at) ? [{ id: s.id, at }] : [];
  }).sort((a,b) => a.at.localeCompare(b.at));
  return [...new Set([...unanswered.map(s => s.id), ...due, ...sellers.filter(s => !known.has(s.id)).map(s => s.id)])];
}