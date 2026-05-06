import { cemeteryContacts, type CemeteryContact } from "@/data/cemeteryContacts";
import { score } from "@/lib/cemeteryMatch";

export function lookupCemeteryContact(query: string | null | undefined): CemeteryContact | null {
  if (!query) return null;
  let best: { c: CemeteryContact; s: number } | null = null;
  for (const c of cemeteryContacts) {
    const s = score(query, c.name);
    if (!best || s > best.s) best = { c, s };
  }
  return best && best.s >= 0.4 ? best.c : null;
}
