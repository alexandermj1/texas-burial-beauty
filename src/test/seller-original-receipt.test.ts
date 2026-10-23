import { describe, expect, it } from "vitest";
import { documentSatisfied, requiresPhysicalOriginal, pendingRecordChanges } from "../../supabase/functions/_shared/originalDocumentReceipt";

describe("seller originals and approval ordering", () => {
  it("a deed photo received does not complete the listing paperwork", () => {
    expect(documentSatisfied({ doc_code: "D1", status: "received", required_state: "received" })).toBe(false);
  });
  it("the deed always needs its mailed original", () => {
    expect(requiresPhysicalOriginal({ doc_code: "D1" }, { mailSkip: ["D1::"] })).toBe(true);
  });
  it("staff logging the original deed satisfies its requirement", () => {
    expect(documentSatisfied({ doc_code: "D1", manual_override: "received" })).toBe(true);
  });
  it("a photo ID copy is sufficient", () => {
    expect(documentSatisfied({ doc_code: "D2P", status: "received" })).toBe(true);
  });
  it("a POA photo alone does not count as a wet-ink original", () => {
    expect(documentSatisfied({ doc_code: "D21", needs_notary: true, status: "received" })).toBe(false);
  });
  it("reply waits for the same review's record changes", () => {
    expect(pendingRecordChanges([{ id: "change", run_id: "review", status: "proposed", action_type: "update_fields" }], { id: "reply", run_id: "review" })).toBe(true);
    expect(pendingRecordChanges([{ id: "change", run_id: "other", status: "proposed", action_type: "update_fields" }], { id: "reply", run_id: "review" })).toBe(false);
  });
});