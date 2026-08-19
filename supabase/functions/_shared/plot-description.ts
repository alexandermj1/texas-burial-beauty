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
  const raw: Array<[string, Slot]> = [
    [input.section == null ? "" : String(input.section), "section"],
    [input.lawn == null ? "" : String(input.lawn), "lot"],
    [input.space_numbers == null ? "" : String(input.space_numbers), "space"],
  ].filter(([v]) => v.trim().length > 0) as Array<[string, Slot]>;

  const values: Partial<Record<Slot, string[]>> = {};
  const loose: Array<[string, Slot]> = [];

  const push = (slot: Slot, value: string) => {
    const v = clean(value);
    if (!v) return;
    const list = (values[slot] ??= []);
    if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) list.push(v);
  };

  for (const [chunk, fallback] of raw) {
    const tokens = chunk.split(/[·•|;,\n]+|\s+[-–]\s+/g).map(clean).filter(Boolean);
    for (const token of tokens) {
      // Strip every stacked label ("Lot/Space Lot 211" -> lot 211).
      let rest = token;
      let slot: Slot | null = null;
      for (let i = 0; i < 3; i++) {
        const hit = LABELS.find(([re]) => re.test(rest));
        if (!hit) break;
        slot ??= hit[1];
        const stripped = clean(rest.replace(hit[0], ""));
        if (!stripped) break;
        rest = stripped;
      }
      if (slot) push(slot, rest);
      else loose.push([rest, fallback]);
    }
  }

  // A bare value only keeps its field's default slot when it isn't just a
  // repeat of a value the seller already labelled elsewhere.
  const known = () =>
    ORDER.flatMap((s) => values[s] ?? []).map((v) => v.toLowerCase());
  for (const [token, fallback] of loose) {
    if (known().includes(token.toLowerCase())) continue;
    push(fallback, token);
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
