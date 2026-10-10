import { describe, expect, it } from "vitest";
import { OCTOBER_OFFER_END, offerCountdown } from "@/components/ListingFeePromo";

describe("October listing promotion", () => {
  it("ends at midnight after October 31 in Texas, not the browser timezone", () => {
    expect(new Date(OCTOBER_OFFER_END).toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(offerCountdown(OCTOBER_OFFER_END - 90061000)).toEqual([1, 1, 1, 1]);
  });
  it("never resets or goes negative when the offer ends", () => {
    expect(offerCountdown(OCTOBER_OFFER_END)).toEqual([0, 0, 0, 0]);
    expect(offerCountdown(OCTOBER_OFFER_END + 10000)).toEqual([0, 0, 0, 0]);
  });
});