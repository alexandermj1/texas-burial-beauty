import { describe, it, expect } from "vitest";
import { chargesForSpaces, chargeTotals } from "./purchaseAgreement";

const frances = { quote_amount: 1700, accepted_quote_amount: 1700, transfer_fee_amount: 595, buyer_fees: [] };

describe("purchase agreement price matches the buyer email quote", () => {
  it("one space of two totals $2,600 (2,639.25 rounded down)", () => {
    expect(chargeTotals(chargesForSpaces(frances, 1)).totalDue).toBe(2600);
  });
  it("both spaces total $4,500 (4,594 rounded down)", () => {
    expect(chargeTotals(chargesForSpaces(frances, 2)).totalDue).toBe(4500);
  });
});
