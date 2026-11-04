import { computeRequirements, type OwnershipAnswers } from "@/lib/ownershipRules";

const label = (r: { label: string; personName?: string }) => r.personName && !r.label.includes(r.personName) ? `${r.label} — ${r.personName}` : r.label;

/** Documents the rules engine asks for from one family tree vs another (cemetery rules excluded). */
export function treeDocumentChanges(before: Record<string, unknown> | null, after: Record<string, unknown>) {
  const list = (v2: unknown) => computeRequirements({ v2 } as OwnershipAnswers, null)
    .filter((r) => r.code !== "REVIEW" && r.code !== "NOTE").map(label);
  const b = new Set(list(before)), a = new Set(list(after));
  return { added: [...a].filter((x) => !b.has(x)), removed: [...b].filter((x) => !a.has(x)) };
}
