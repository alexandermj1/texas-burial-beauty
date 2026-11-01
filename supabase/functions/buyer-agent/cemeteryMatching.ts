// Resolve free-text names before inventory lookup; counts never establish identity.
export type CemeteryEntry = { name: string; city?: string | null; region?: string | null };
const generic = /\b(?:the|and|of|memorial|park|funeral|home|cemetery|mortuary|mausoleum|gardens?|association)\b/g;
export const cemeteryNameKey = (value: unknown) => String(value ?? "").toLowerCase()
  .replace(/[^a-z0-9 ]/g, " ").replace(generic, " ").replace(/\s+/g, " ").trim();

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

export function resolveBuyerCemetery<T extends CemeteryEntry>(raw: unknown, directory: T[], location?: unknown): T | null {
  const key = cemeteryNameKey(raw);
  if (key.length < 3) return null;
  const exact = directory.filter(c => cemeteryNameKey(c.name) === key);
  const unique = (rows: T[]) => {
    const names = new Set(rows.map(c => cemeteryNameKey(c.name)));
    if (names.size === 1) return rows[0] ?? null;
    const place = cemeteryNameKey(location);
    if (!place) return null;
    const local = rows.filter(c => [c.city, c.region].some(v => v && cemeteryNameKey(v) === place));
    return new Set(local.map(c => cemeteryNameKey(c.name))).size === 1 ? local[0] ?? null : null;
  };
  if (exact.length) return unique(exact);
  const words = key.split(" ");
  // An abbreviated name can omit words, but cannot introduce a conflicting qualifier.
  const short = directory.filter(c => words.every(w => cemeteryNameKey(c.name).split(" ").includes(w)));
  if (short.length) return unique(short);
  // Small typing errors only: never collapse Forest Park East into Forest Park West.
  const ranked = directory.map(c => {
    const target = cemeteryNameKey(c.name), tokens = target.split(" ");
    const compatible = words.length === tokens.length && words.every((w, i) => w === tokens[i] || (w.length >= 5 && tokens[i].length >= 5 && distance(w, tokens[i]) <= 2));
    return { c, error: compatible ? distance(key, target) / Math.max(key.length, target.length) : 1 };
  }).sort((a, b) => a.error - b.error);
  const best = ranked[0];
  if (!best || best.error > 0.2) return null;
  const close = ranked.filter(r => r.error < best.error + 0.12);
  return unique(close.map(r => r.c));
}