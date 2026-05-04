// Fuzzy cemetery name normalisation + match scoring.
// Used to map a free-text submission cemetery (e.g. "Forest Lawn Cypress")
// to canonical entries in ca_inventory / sales history (which often write the
// same cemetery many different ways).

const STOP = new Set([
  "the", "of", "and", "memorial", "park", "cemetery", "mortuary", "mausoleum",
  "association", "assoc", "garden", "gardens", "lawn", "mp", "mp.",
]);

export const norm = (s: string | null | undefined): string => {
  if (!s) return "";
  let t = String(s).toLowerCase();
  t = t.replace(/\([^)]*\)/g, " ");        // strip parentheticals
  t = t.replace(/[^a-z0-9 ]+/g, " ");
  t = t.replace(/\bmt\b/g, "mount");
  t = t.replace(/\s+/g, " ").trim();
  return t;
};

const tokens = (s: string) => norm(s).split(" ").filter(t => t && !STOP.has(t));

/** 0-1 similarity using Jaccard over significant tokens, with a substring boost. */
export const score = (a: string, b: string): number => {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  let s = inter / union;
  // Substring boost (e.g. "forest lawn cypress" contains "forest lawn")
  const na = norm(a), nb = norm(b);
  if (na && nb && (na.includes(nb) || nb.includes(na))) s = Math.max(s, 0.6);
  return s;
};

export interface MatchOptions {
  /** Optional city / region to use as a tiebreaker (e.g. "Cypress"). */
  city?: string | null;
  /** Minimum score to include in results (default 0.25). */
  threshold?: number;
}

export interface Scored<T> { item: T; score: number }

export function rankByCemetery<T extends { cemetery?: string | null; cem_key?: string | null }>(
  query: string,
  rows: T[],
  opts: MatchOptions = {},
): Scored<T>[] {
  const threshold = opts.threshold ?? 0.25;
  const cityTokens = opts.city ? new Set(tokens(opts.city)) : null;
  return rows
    .map(r => {
      const name = (r as any).cemetery ?? (r as any).cem_key ?? "";
      let s = score(query, name);
      if (cityTokens && cityTokens.size) {
        // Add small city tiebreaker against any field that mentions it.
        const blob = norm([(r as any).cemetery, (r as any).area, (r as any).city, (r as any).county].filter(Boolean).join(" "));
        for (const t of cityTokens) if (blob.includes(t)) { s += 0.05; break; }
      }
      return { item: r, score: s };
    })
    .filter(x => x.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
