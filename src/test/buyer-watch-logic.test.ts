import { describe, it, expect } from "vitest";
import { looseCandidate, newestText, kindsCompatible } from "../../supabase/functions/buyer-watch/logic";

const restland = { lat: 32.92, lng: -96.74 };
const want = { cemeteryKeys: ["restland"], points: [restland], places: [], anywhere: false, kind: "burial" };

describe("buyer watch loose matching", () => {
  it("keeps the same cemetery regardless of price or space count", () => {
    expect(looseCandidate(want, { cemeteryKey: "restland", point: restland, place: [], kind: "burial" }).keep).toBe(true);
  });
  it("keeps a different cemetery within 40 miles", () => {
    expect(looseCandidate(want, { cemeteryKey: "laurel land", point: { lat: 32.68, lng: -96.82 }, place: [], kind: "burial" }).keep).toBe(true);
  });
  it("drops a cemetery in another metro", () => {
    expect(looseCandidate(want, { cemeteryKey: "forest park westheimer", point: { lat: 29.73, lng: -95.53 }, place: [], kind: "burial" }).keep).toBe(false);
  });
  it("treats niche vs ground burial as the only hard type split", () => {
    expect(kindsCompatible("burial", "crypt")).toBe(true);
    expect(kindsCompatible("burial", "niche")).toBe(false);
  });
  it("reads only the buyer's newest text, not quoted history", () => {
    expect(newestText("Yes please add me.\n\nOn Mon, Nov 2, Simon wrote:\n> We have 3 plots")).toBe("Yes please add me.");
  });
});
