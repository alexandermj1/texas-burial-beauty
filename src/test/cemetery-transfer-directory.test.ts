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
  it("publishes only the 52 cemeteries with recorded transfer fees", () => {
    const published = filterTransferRecords("", "all");
    expect(published).toHaveLength(52);
    expect(published.every((record) => record.transferFee !== null)).toBe(true);
  });
  it.each([["Greater Houston", 12], ["Dallas–Fort Worth", 15], ["San Antonio", 2], ["Austin", 4]])("limits a local table to %s", (scope, count) => {
    const local = filterTransferRecords("", "all", scope);
    expect(local).toHaveLength(count);
    expect(local.every((record) => record.region === scope)).toBe(true);
    expect(filterTransferRecords("", "East Texas", scope)).toEqual([]);
  });
});
