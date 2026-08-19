// Sellers type free-form location text ("Lot 211, section 3") into fields that
// already carry their own label, so naively concatenating section + lawn +
// spaces produced strings like:
//   "Section 211 · Lot/Space Lot 211, section 3 • Spaces 1"
// This normalizer parses whatever was typed, classifies each fragment as a
// section / lot / space / garden value, drops duplicates, and prints one clean
// line for the contracts: "Section 3 · Lot 211 · Space 1".

export interface PlotDescriptionInput {
  section?: string | null;
  lawn?: string | null;
  spaces?: string | number | null;
  space_numbers?: string | null;
}

type Slot = "section" | "lot" | "space" | "garden" | "block" | "tier" | "crypt" | "niche";

const LABELS: Array<[RegExp, Slot]> = [
  [/^(sec(tion)?)\b/i, "section"],
  [/^(lot\s*\/\s*space|lot)\b/i, "lot"],
  [/^(space|spc|grave|plot)s?\b/i, "space"],
  [/^(garden|gdn)\b/i, "garden"],
  [/^(block|blk)\b/i, "block"],
  [/^tier\b/i, "tier"],
  [/^crypt\b/i, "crypt"],
  [/^niche\b/i, "niche"],
];

const ORDER: Slot[] = ["garden", "section", "block", "lot", "tier", "space", "crypt", "niche"];

const TITLES: Record<Slot, string> = {
  garden: "Garden",
  section: "Section",
  block: "Block",
  lot: "Lot",
  tier: "Tier",
  space: "Space",
  crypt: "Crypt",
  niche: "Niche",
};

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s.,;:#/-]+|[\s.,;:/-]+$/g, "").trim();

export function formatPlotDescription(input: PlotDescriptionInput): string {
  const raw = [input.section, input.lawn, input.space_numbers]
    .map((v) => (v == null ? "" : String(v)))
    .filter((v) => v.trim().length > 0);

  const values: Partial<Record<Slot, string[]>> = {};
  const loose: string[] = [];

  const push = (slot: Slot, value: string) => {
    const v = clean(value);
    if (!v) return;
    const list = (values[slot] ??= []);
    if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) list.push(v);
  };

  for (const chunk of raw) {
    const tokens = chunk.split(/[·•|;,\n]+|\s+[-–]\s+/g).map(clean).filter(Boolean);
    for (const token of tokens) {
      const hit = LABELS.find(([re]) => re.test(token));
      if (hit) {
        const value = clean(token.replace(hit[0], ""));
        if (value) push(hit[1], value);
      } else {
        loose.push(token);
      }
    }
  }

  // A bare value only becomes a section when it isn't just a repeat of a value
  // the seller already labelled somewhere else in the same description.
  const known = () =>
    ORDER.flatMap((s) => values[s] ?? []).map((v) => v.toLowerCase());
  for (const token of loose) {
    if (known().includes(token.toLowerCase())) continue;
    push("section", token);
  }

  const parts = ORDER.filter((slot) => (values[slot] ?? []).length > 0).map((slot) => {
    const list = values[slot]!;
    const label = list.length > 1 ? `${TITLES[slot]}s` : TITLES[slot];
    return `${label} ${list.join(" & ")}`;
  });

  // Only mention a space count when no explicit space numbers were captured.
  const count = Number(input.spaces ?? 0);
  if (!values.space && Number.isFinite(count) && count > 0) {
    parts.push(`${count} space${count === 1 ? "" : "s"}`);
  }

  return parts.join(" · ");
}
