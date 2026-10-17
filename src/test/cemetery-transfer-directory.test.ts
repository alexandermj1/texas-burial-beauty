import { describe, expect, it } from "vitest";
import { filterTransferRecords, recordedTransferFee, transferRecords } from "../lib/cemeteryTransferDirectory";
describe("Recorded cemetery transfer directory", () => {
  it("keeps missing fees unknown rather than treating them as free", () => {
    expect(recordedTransferFee(null)).toBe("Not recorded");
    expect(recordedTransferFee(0)).toBe("$0.00");
  });
  it("preserves the 206 exported cemetery records and their 52 recorded fees", () => {
    expect(transferRecords).toHaveLength(206);
    expect(transferRecords.filter((record) => record.transferFee !== null)).toHaveLength(52);
  });
  it("matches addresses and applies region restrictions together", () => {
    expect(filterTransferRecords("2380 Victory", "East Texas").map((record) => record.name)).toEqual(["Algoma Cemetery"]);
    expect(filterTransferRecords("2380 Victory", "Austin")).toEqual([]);
  });
});
