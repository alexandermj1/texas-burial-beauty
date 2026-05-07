import { cemeteryContacts, type CemeteryContact } from "@/data/cemeteryContacts";
import { score } from "@/lib/cemeteryMatch";

export interface CemeteryContactMatch {
  contact: CemeteryContact;
  /** 0-1 similarity between the customer's text and the matched directory entry. */
  score: number;
  /** True when the directory name doesn't closely match what the customer wrote. */
  uncertain: boolean;
}

export function lookupCemeteryContactMatch(query: string | null | undefined): CemeteryContactMatch | null {
  if (!query) return null;
  let best: { c: CemeteryContact; s: number } | null = null;
  for (const c of cemeteryContacts) {
    const s = score(query, c.name);
    if (!best || s > best.s) best = { c, s };
  }
  if (!best || best.s < 0.4) return null;
  return { contact: best.c, score: best.s, uncertain: best.s < 0.75 };
}

// Back-compat: returns just the contact.
export function lookupCemeteryContact(query: string | null | undefined): CemeteryContact | null {
  return lookupCemeteryContactMatch(query)?.contact ?? null;
}
