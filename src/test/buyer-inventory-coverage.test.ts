import { describe, expect, it } from "vitest";
import { category, missingOwnOptions, openToOtherCemeteries } from "../../supabase/functions/buyer-agent/inventoryPolicy";

describe("requested-cemetery coverage", () => {
  it("includes Ileana Billington's Double depth Lawn Crypt in burial searches", () => {
    expect(category("Double depth Lawn Crypt")).toBe("burial");
    expect(category("Double depth Lawn Crypt")).toBe(category("Burial Plot"));
  });
  it("keeps above-ground mausoleum crypts separate", () => {
    expect(category("Crypt / Mausoleum")).toBe("crypt");
    expect(category("Cremation Niche")).toBe("niche");
  });
  it("does not invite alternatives just because a cemetery was named", () => {
    expect(openToOtherCemeteries({ message: "My husband and I want a double-depth plot at Forest Park Westheimer" })).toBe(false);
  });
  it("permits explicitly invited alternatives but respects cemetery-only requests", () => {
    expect(openToOtherCemeteries({ message: "We are open to other cemeteries" })).toBe(true);
    expect(openToOtherCemeteries({ message: "Only Forest Park Westheimer; not interested in other cemeteries" })).toBe(false);
  });
  it("requires every own-cemetery property to be chosen or explained, even beyond ten", () => {
    const own = Array.from({ length: 12 }, (_, i) => ({ listing_id: `plot-${i}` }));
    expect(missingOwnOptions(own, own.slice(0, 10).map((x) => x.listing_id), [])).toEqual(["plot-10", "plot-11"]);
    expect(missingOwnOptions(own, own.slice(0, 10).map((x) => x.listing_id), [{ listing_id: "plot-10", reason: "Seller withdrew" }, { listing_id: "plot-11", reason: "Verified incompatible configuration" }])).toEqual([]);
  });
  it("does not accept blank omission reasons or require unrelated alternatives", () => {
    expect(missingOwnOptions([{ listing_id: "ileana" }, { listing_id: "nearby", also_nearby: true }], [], [{ listing_id: "ileana", reason: " " }])).toEqual(["ileana"]);
  });
});