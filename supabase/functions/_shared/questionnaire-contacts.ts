// The seller's family-tree questionnaire already collects a mailing address,
// phone and email for every person who has to sign. The Power of Attorney is
// built from that, so the seller never has to type anything again — they just
// print the completed document and take it to a notary.

/** Same key rule as src/lib/familyConfirmV2.ts: first + last token only. */
export function nameKey(n: unknown): string {
  const t = String(n ?? '').toLowerCase().replace(/[.,'\u2019]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const p = t.split(' ');
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0];
}

export interface ContactDetails {
  address: string;
  city_state_zip: string;
  phone: string;
  email: string;
}

/** "12 Oak St\nDallas, TX 75201" or "12 Oak St, Dallas, TX 75201" → two lines. */
function splitAddress(raw: string): { address: string; city_state_zip: string } {
  const text = String(raw ?? '').replace(/\r/g, '').trim();
  if (!text) return { address: '', city_state_zip: '' };
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return { address: lines.slice(0, -1).join(', '), city_state_zip: lines[lines.length - 1] };
  }
  // One line: everything before the city/state/zip tail is the street address.
  const m = /^(.*?),\s*([^,]+,\s*[A-Za-z]{2}\.?\s*\d{5}(?:-\d{4})?)$/.exec(text);
  if (m) return { address: m[1].trim(), city_state_zip: m[2].trim() };
  return { address: text, city_state_zip: '' };
}

/**
 * Pull one person's contact details out of the saved questionnaire answers.
 * `answers.contacts` is keyed by nameKey(person name).
 */
export function contactFor(answers: unknown, name: string): ContactDetails {
  const a = (answers ?? {}) as Record<string, unknown>;
  // The seller's page saves contact details under `v2.contacts`; older records
  // (and the admin roster) keep them at the top level or on `people[]`.
  const v2 = (a.v2 ?? {}) as Record<string, unknown>;
  const contacts: Record<string, { addr?: string; email?: string; phone?: string }> = {
    ...((v2.contacts ?? {}) as Record<string, { addr?: string; email?: string; phone?: string }>),
    ...((a.contacts ?? {}) as Record<string, { addr?: string; email?: string; phone?: string }>),
  };
  // People saved with their own address/phone/email (roster editor) count too.
  const people = Array.isArray(a.people) ? (a.people as Record<string, string>[]) : [];
  for (const p of people) {
    const k = nameKey(p?.name);
    if (!k) continue;
    const existing = contacts[k] ?? {};
    contacts[k] = {
      addr: existing.addr || String(p?.address ?? ''),
      email: existing.email || String(p?.email ?? ''),
      phone: existing.phone || String(p?.phone ?? ''),
    };
  }
  const key = nameKey(name);
  let hit = key ? contacts[key] : undefined;
  if (!hit && key) {
    // Tolerate a middle name or a different spelling on one side.
    const first = key.split(' ')[0];
    const last = key.split(' ').slice(-1)[0];
    for (const [k, v] of Object.entries(contacts)) {
      if (k.startsWith(first) && k.endsWith(last)) { hit = v; break; }
    }
  }
  const { address, city_state_zip } = splitAddress(hit?.addr ?? '');
  return { address, city_state_zip, phone: String(hit?.phone ?? ''), email: String(hit?.email ?? '') };
}

/** True when the questionnaire holds an address for this person. */
export function hasAddressFor(answers: unknown, name: string): boolean {
  return !!contactFor(answers, name).address.trim();
}
