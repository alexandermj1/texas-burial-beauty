// How many spaces a buyer asked for: the form field first, then their written notes.
// Companion / husband-and-wife requests mean two side-by-side spaces.
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, pair: 2, couple: 2 };
const UNIT = "(?:plots?|spaces?|graves?|niches?|crypts?|burial plots?|lots?)";

export function requestedSpaces(formSpaces: unknown, message: unknown): number {
  const form = Number(String(formSpaces ?? "").match(/\d+/)?.[0] ?? 0);
  if (form >= 1) return Math.floor(form);
  const text = String(message ?? "").toLowerCase();
  const labelled = text.match(new RegExp(`${UNIT}\\s*(?:wanted|needed)?\\s*:\\s*(\\d+)`))?.[1];
  if (labelled) return Number(labelled);
  const counted = text.match(new RegExp(`\\b(\\d+|one|two|three|four|five|six|a pair of|a couple of)\\s+(?:side[- ]by[- ]side\\s+|adjacent\\s+|burial\\s+)?${UNIT}\\b`))?.[1];
  if (counted) return /^\d+$/.test(counted) ? Number(counted) : WORDS[counted.replace(/^a | of$/g, "")] ?? 0;
  if (/\b(companion|husband and wife|wife and (?:i|me)|husband and (?:i|me)|my (?:wife|husband) and (?:i|me)|side[- ]by[- ]side|for (?:a |the )?couple|for us both|for both of us|double)\b/.test(text)) return 2;
  return 0;
}
