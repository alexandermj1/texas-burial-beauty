import { describe, expect, it } from "vitest";
import { sectionTokens, sectionSimilarity } from "../../supabase/functions/_shared/estimator-matching";

const match = (a: string, b: string) => sectionSimilarity(sectionTokens(a), sectionTokens(b));
describe("private section matching", () => {
  it("ignores labels, word order and lot/space numbers", () => {
    expect(match("Garden of Prayer Lot 5 Spaces 1 & 2", "Prayer Garden")).toBe(1);
    expect(match("Memories of Garden", "Garden of Memories")).toBe(1);
  });
  it("accepts a small typo or meaningful prefix", () => {
    expect(match("Garden of Memoris", "Garden of Memories")).toBe(1);
    expect(match("Memor", "Memories")).toBe(1);
  });
  it("does not confuse similar sections with distinct qualifiers", () => {
    expect(match("Prayer East", "Prayer West")).toBeLessThan(0.8);
    expect(match("Prayer", "Prayer East")).toBeLessThan(0.8);
    expect(match("unknown", "Prayer")).toBe(0);
    expect(match("", "Prayer")).toBe(0);
  });
});