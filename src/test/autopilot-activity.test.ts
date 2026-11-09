import { expect, it } from "vitest";
import { groupActivity } from "../../supabase/functions/seller-autopilot/activity";
const nameOf = () => "Shorty";
it("merges a catch-up and escalated full review into one line per seller per scan", () => {
  const out = groupActivity({ nameOf, runs: [
    { id: "a", created_at: "2026-11-09T10:00:00Z", status: "done", submission_id: "s1", stage_summary: "catch-up" },
    { id: "b", created_at: "2026-11-09T10:02:00Z", status: "done", submission_id: "s1", stage_summary: "full" },
  ], actions: [{ run_id: "b", action_type: "update_fields", status: "executed" }], outbox: [{ submission_id: "s1", status: "sent", sent_at: "2026-11-09T10:20:00Z", created_at: "2026-11-09T10:03:00Z", seller: "Shorty", subject: "Re: quote" }], flags: [] });
  expect(out).toHaveLength(1);
  expect(out[0].outcomes.map(o => o.tone)).toEqual(["change", "email"]);
});
it("says plainly when a review emailed nothing and changed nothing", () => {
  const out = groupActivity({ nameOf, runs: [{ id: "a", created_at: "2026-11-09T10:00:00Z", status: "done", submission_id: "s1" }], actions: [], outbox: [], flags: [] });
  expect(out[0].outcomes[0].label).toBe("No email sent · no changes made");
});
it("shows a seller passed to staff once, not once per flag", () => {
  const f = { submission_id: "s1", reason: "Quote needed" };
  const out = groupActivity({ nameOf, runs: [], actions: [], outbox: [], flags: [{ ...f, created_at: "2026-11-09T10:00:00Z" }, { ...f, created_at: "2026-11-09T10:05:00Z" }] });
  expect(out).toHaveLength(1);
});
