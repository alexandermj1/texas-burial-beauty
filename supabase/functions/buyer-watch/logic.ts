// Pure helpers for the buyer "waiting for" watcher. Matching is deliberately LOOSE:
// code only removes clear mismatches; the cheap AI judge decides what is worth a human look.
export const kindOf = (s: unknown): "niche" | "crypt" | "burial" | "any" => {
  const t = String(s ?? "").toLowerCase();
  return /niche|urn|columbar|cremain|cremat/.test(t) ? "niche" : /crypt|mausoleum|entomb/.test(t) ? "crypt" : /burial|grave|plot|lawn|space|lot/.test(t) ? "burial" : "any";
};
// Only niche-vs-ground is a hard split; crypts/burial are close enough to show a human.
export const kindsCompatible = (want: string, have: string) =>
  want === "any" || have === "any" || want === have || !((want === "niche") !== (have === "niche"));

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => d * Math.PI / 180, R = 3958.8;
  const x = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const LOOSE_MILES = 40;

/** Keeps a candidate when it is the same cemetery, within LOOSE_MILES of any wanted cemetery,
 * in a wanted city/region, or the buyer is open to anywhere. Price and space count are never
 * filtered here — "under $5,000" vs $6,000 and 5 vs 6 spaces are judgement calls for the AI. */
export function looseCandidate(
  want: { cemeteryKeys: string[]; points: { lat: number; lng: number }[]; places: string[]; anywhere: boolean; kind: string },
  seller: { cemeteryKey: string; point: { lat: number; lng: number } | null; place: string[]; kind: string },
): { keep: boolean; miles: number | null } {
  if (!kindsCompatible(want.kind, seller.kind)) return { keep: false, miles: null };
  if (want.cemeteryKeys.includes(seller.cemeteryKey)) return { keep: true, miles: 0 };
  const miles = seller.point && want.points.length ? Math.min(...want.points.map(p => milesBetween(p, seller.point!))) : null;
  if (miles != null && miles <= LOOSE_MILES) return { keep: true, miles };
  if (want.places.some(p => p && seller.place.includes(p))) return { keep: true, miles };
  if (want.anywhere) return { keep: true, miles };
  return { keep: false, miles };
}

/** Drop quoted history from an email reply so the AI reads only what the buyer just wrote. */
export function newestText(body: unknown, max = 2000) {
  let t = String(body ?? "").replace(/\r/g, "");
  const cut = t.search(/\n\s*(On .{5,200}wrote:|-{2,}\s*Original Message|From:\s.+\n\s*Sent:|>)/i);
  if (cut > 0) t = t.slice(0, cut);
  return t.replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

export const roundDown = (n: number) => { const step = n >= 1000 ? 100 : 50; return Math.floor(n / step) * step; };
