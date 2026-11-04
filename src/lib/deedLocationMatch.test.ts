import { describe, expect, it } from "vitest";
import { deedLocationMatch } from "./deedLocationMatch";

const deed = "Lot 23 · Spaces 7 and 8";
describe("deedLocationMatch", () => {
  it("green when all deed spaces are sold", () => expect(deedLocationMatch("Lot 23, Spaces 7 & 8", deed)).toBe("green"));
  it("orange when only some deed spaces are sold", () => expect(deedLocationMatch("Lot 23, Space 7", deed)).toBe("orange"));
  it("red when a space is not on the deed", () => expect(deedLocationMatch("Lot 23, Space 3", deed)).toBe("red"));
  it("nothing when deed not read", () => expect(deedLocationMatch("Lot 23, Space 3", "")).toBe(null));
});
