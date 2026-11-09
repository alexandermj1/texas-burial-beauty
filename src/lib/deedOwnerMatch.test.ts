import { describe, expect, it } from "vitest";
import { deedOwnerMatch } from "./deedOwnerMatch";

describe("deedOwnerMatch", () => {
  it("green, alone, when the seller is the only owner", () => expect(deedOwnerMatch("Paul Cuevas", ["PAUL CUEVAS"])).toEqual({ tone: "green", others: [] }));
  it("orange and lists the other owners", () => expect(deedOwnerMatch("Billie Carlton", ["Wayne Kenneth & Billie Marie", "Carlton"])).toEqual({ tone: "orange", others: ["Wayne Kenneth Carlton"] }));
  it("red when the seller is not on the deed", () => expect(deedOwnerMatch("William Carlton", ["Wayne Kenneth & Billie Marie", "Carlton"])?.tone).toBe("red"));
  it("nothing when no deed names", () => expect(deedOwnerMatch("Paul Cuevas", [])).toBe(null));
});
