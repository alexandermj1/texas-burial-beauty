/** Only the email changes; exact existing terms, seller-supplied markers and token remain intact. */
export function correctedAgreementEmail(c: { kind: string; status: string; signed_at?: string | null; countersigned_at?: string | null; notarized_at?: string | null; completed_at?: string | null; fill_data?: Record<string, any> | null }, email: unknown): Record<string, any> {
  if (c.kind !== 'listing_agreement' || !['draft', 'sent', 'viewed'].includes(c.status) || c.signed_at || c.countersigned_at || c.notarized_at || c.completed_at) throw new Error('Signed or inactive agreements cannot be rewritten');
  const next = String(email ?? '').trim().toLowerCase();
  if (!/^[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(next)) throw new Error('Valid seller contact email required');
  if (!c.fill_data || !Object.keys(c.fill_data).length) throw new Error('Existing agreement terms are missing');
  return { ...c.fill_data, email: next };
}