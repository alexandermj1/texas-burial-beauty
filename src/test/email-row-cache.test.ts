import { describe, it, expect } from "vitest";
import { mergeEmailRows, needsFullRescan, FULL_EMAIL_RESCAN_MS } from "@/lib/emailRowCache";

const row = (id: string, at: string, extra = {}) => ({ id, matched_submission_id: null, from_email: "a@x.com", to_email: "b@y.com", received_at: at, ...extra });

describe("email row cache", () => {
  it("adds a new email at the top", () => {
    const out = mergeEmailRows([row("1", "2026-10-01")], [row("2", "2026-10-20")]);
    expect(out.map((r) => r.id)).toEqual(["2", "1"]);
  });
  it("updates an old email in place (e.g. matched to a seller later)", () => {
    const out = mergeEmailRows([row("1", "2026-10-01")], [{ id: "1", matched_submission_id: "s9" }]);
    expect(out).toHaveLength(1);
    expect(out[0].matched_submission_id).toBe("s9");
    expect(out[0].from_email).toBe("a@x.com");
  });
  it("drops deleted or soft-deleted emails", () => {
    expect(mergeEmailRows([row("1", "2026-10-01"), row("2", "2026-10-02")], [], ["1"]).map((r) => r.id)).toEqual(["2"]);
    expect(mergeEmailRows([row("1", "2026-10-01")], [{ id: "1", deleted_at: "2026-10-23" }])).toEqual([]);
  });
  it("matches a full re-read after merging changes", () => {
    const full = [row("3", "2026-10-22", { matched_submission_id: "s1" }), row("2", "2026-10-10"), row("1", "2026-10-01")];
    const merged = mergeEmailRows([row("2", "2026-10-10"), row("1", "2026-10-01")], [row("3", "2026-10-22", { matched_submission_id: "s1" })]);
    expect(merged).toEqual(full);
  });
  it("forces a full re-read after 15 minutes", () => {
    expect(needsFullRescan(null, 0)).toBe(true);
    expect(needsFullRescan(0, FULL_EMAIL_RESCAN_MS - 1)).toBe(false);
    expect(needsFullRescan(0, FULL_EMAIL_RESCAN_MS)).toBe(true);
  });
});
