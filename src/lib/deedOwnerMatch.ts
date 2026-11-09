// Is the person who filled in the form named on the deed?
// green  = they are on the deed (others, if any, are returned so staff can see them)
// red    = the deed names other people but not them
export type OwnerMatch = { tone: "green" | "red"; others: string[] } | null;

const words = (s: string) => String(s || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(w => w.length > 1 && !["jr", "sr", "mr", "mrs", "ms", "dr", "and", "the", "ii", "iii"].includes(w));

/** Splits "Wayne Kenneth & Billie Marie Carlton" style lines into separate people. */
export function splitOwners(lines: string[]): string[] {
  const out: string[] = [];
  let last: number[] = [];
  for (const l of lines) {
    const parts = String(l).split(/\s*(?:&|\band\b|,|;|\/)\s*/i).map(p => p.trim()).filter(Boolean);
    // A lone surname on its own line ("Carlton") belongs to the people just above it.
    if (parts.length === 1 && !/\s/.test(parts[0]) && last.length) { for (const i of last) out[i] = `${out[i]} ${parts[0]}`; last = []; continue; }
    last = parts.map((p) => out.push(p) - 1);
  }
  return out;
}

export function deedOwnerMatch(person: string | null | undefined, owners: string[]): OwnerMatch {
  const me = words(person || "");
  const people = splitOwners(owners).filter(o => words(o).length);
  if (!me.length || !people.length) return null;
  const surname = me[me.length - 1];
  const first = me[0];
  const all = words(owners.join(" "));
  const isMe = (o: string) => { const w = words(o); return w.includes(first) && (w.includes(surname) || all.includes(surname)); };
  const mine = people.filter(isMe);
  const others = people.filter(o => !isMe(o));
  if (!mine.length) return { tone: "red", others: people };
  return { tone: others.length ? "orange" : "green", others };
}
