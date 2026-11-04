// Compares the "Locations being sold" wording with what the AI read from the deed.
// green  = every number on the deed is being sold (exact match)
// orange = only some of the deed's spaces are being sold
// red    = being sold mentions a number that is not on the deed at all
export type DeedMatch = "green" | "orange" | "red" | null;

function numbers(text: string): Set<string> {
  const out = new Set<string>();
  const s = String(text || "");
  for (const m of s.matchAll(/(\d+)\s*(?:-|–|to|thru|through)\s*(\d+)/gi)) {
    const a = Number(m[1]), b = Number(m[2]);
    if (b > a && b - a <= 20) for (let i = a; i <= b; i++) out.add(String(i));
  }
  for (const m of s.match(/\d+/g) || []) out.add(String(Number(m)));
  return out;
}

export function deedLocationMatch(selling: string | null | undefined, deed: string | null | undefined): DeedMatch {
  if (!deed || !selling || selling === "Not provided") return null;
  const d = numbers(deed), s = numbers(selling);
  if (!d.size || !s.size) return null;
  for (const n of s) if (!d.has(n)) return "red";
  for (const n of d) if (!s.has(n)) return "orange";
  return "green";
}
