const STOP = new Set(["lot", "lots", "space", "spaces", "sp", "section", "sec", "of", "the", "and", "garden", "gardens", "lawn", "plot", "plots", "block", "row", "i", "dont", "know", "all", "a"]);

export const sectionTokens = (value: string): Set<string> => new Set(
  value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ").split(/\s+/)
    .filter((word) => word.length > 1 && !STOP.has(word) && !/^\d+$/.test(word)),
);

const distance = (a: string, b: string) => {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
};

/** Tolerate word order, prefixes and small typos, but not contradictory qualifiers. */
export const sectionSimilarity = (a: Set<string>, b: Set<string>): number => {
  if (!a.size || !b.size) return 0;
  const remaining = [...b];
  let matched = 0;
  for (const word of a) {
    const index = remaining.findIndex((other) => word === other ||
      (Math.min(word.length, other.length) >= 4 && (word.startsWith(other) || other.startsWith(word))) ||
      (Math.min(word.length, other.length) >= 5 && distance(word, other) <= (Math.max(word.length, other.length) >= 9 ? 2 : 1)));
    if (index >= 0) { matched++; remaining.splice(index, 1); }
  }
  return Math.min(matched / a.size, matched / b.size);
};