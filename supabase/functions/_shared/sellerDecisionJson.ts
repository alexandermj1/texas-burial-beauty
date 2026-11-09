/** Repair only known formatting mistakes, never invent missing decision/actions. No inference replay. */
export function sellerDecisionJson(raw: string): Record<string, any> {
  const text = raw.replace(/`\s?`\s?`(?:json)?/gi, "").trim();
  const object = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const numbers: Record<string, number> = { zero: 0, ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 };
  const repaired = object.replace(/("importance"\s*:\s*)(zero|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)(?=\s*[,}])/g, (_all, key, word) => `${key}${numbers[word]}`);
  for (const candidate of [object, repaired]) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value) && Array.isArray(value.actions)) return value;
    } catch { /* known formatting repair only */ }
  }
  throw new Error("Seller AI returned an unreadable decision; no actions executed");
}