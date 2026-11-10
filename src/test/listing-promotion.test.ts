import { describe, expect, it } from "vitest";
import { LISTING_OFFER_END, offerCountdown, tiers } from "@/components/ListingFeePromo";

describe("year-end listing promotion", () => {
  it("ends at midnight after December 31 in Texas, not the browser timezone", () => {
    expect(new Date(LISTING_OFFER_END).toISOString()).toBe("2027-01-01T06:00:00.000Z");
    expect(offerCountdown(LISTING_OFFER_END - 90061000)).toEqual([1, 1, 1, 1]);
  });
  it("never resets or goes negative when the offer ends", () => {
    expect(offerCountdown(LISTING_OFFER_END)).toEqual([0, 0, 0, 0]);
    expect(offerCountdown(LISTING_OFFER_END + 10000)).toEqual([0, 0, 0, 0]);
  });
  it("compares each sale fee with the matching unnamed competitor fee", () => {
    expect(tiers.map((tier) => [tier.now, tier.competitor, tier.competitorSavings])).toEqual([
      ["$299", "$325", "$26"],
      ["$399", "$550", "$151"],
      ["$499", "$1,500", "$1,001"],
    ]);
  });
});