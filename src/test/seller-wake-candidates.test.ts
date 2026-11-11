import { describe, expect, it } from "vitest";
import { sellerWakeCandidates } from "../../supabase/functions/_shared/sellerWakeCandidates";
const seller = (id: string) => ({ id, email: `${id}@example.com`, created_at: "2026-10-01T12:00:00Z" });
describe("unanswered seller priority", () => {
  it("prioritizes family-tree confirmation without a later reply", () => {
    const s = { ...seller("waiting"), ownership_answers: { sellerConfirmedAt: "2026-11-06T12:00:00Z" } };
    expect(sellerWakeCandidates([s], [{ from_email: "info@texascemeterybrokers.com", to_email: s.email, received_at: "2026-11-05T12:00:00Z" }], [], new Set([s.id]))).toEqual([s.id]);
  });
  it("finds old unanswered mail ahead of routine check-backs despite outgoing traffic", () => {
    const sellers = [seller("waiting"), seller("routine")];
    const mail = [{ from_email: "waiting@example.com", received_at: "2026-10-03T12:00:00Z" }, { from_email: "info@texascemeterybrokers.com", to_email: "routine@example.com", received_at: "2026-11-06T12:00:00Z" }];
    expect(sellerWakeCandidates(sellers, mail, ["routine"], new Set(["waiting", "routine"]))).toEqual(["waiting", "routine"]);
  });
  it("credits outgoing replies across records sharing an address", () => {
    const sellers = [seller("waiting"), { ...seller("duplicate"), email: "waiting@example.com" }];
    expect(sellerWakeCandidates(sellers, [{ from_email: "Texas <texascemeterybrokers@gmail.com>", to_email: "waiting@example.com", received_at: "2026-11-06T12:00:00Z" }], [], new Set(["waiting", "duplicate"]))).toEqual([]);
  });
  it("honours dismissal until a newer incoming message", () => {
    const s = { ...seller("waiting"), reply_dismissed_at: "2026-11-05T12:00:00Z" };
    const incoming = (received_at: string) => [{ from_email: s.email, received_at }];
    expect(sellerWakeCandidates([s], incoming("2026-11-04T12:00:00Z"), [], new Set([s.id]))).toEqual([]);
    expect(sellerWakeCandidates([s], incoming("2026-11-06T12:00:00Z"), [], new Set([s.id]))).toEqual([s.id]);
  });
});
describe("quiet never-reviewed records", () => {
  const now = Date.parse("2026-11-11T00:00:00Z");
  it("skips a first review when the last contact was over 60 days ago", async () => {
    const { sellerWakeCandidates } = await import("../../supabase/functions/_shared/sellerWakeCandidates");
    const sellers = [{ id: "old", email: "a@x.com", created_at: "2026-08-01T00:00:00Z" }];
    const mail = [{ matched_submission_id: "old", from_email: "info@texascemeterybrokers.com", to_email: "a@x.com", received_at: "2026-09-01T00:00:00Z" }];
    expect(sellerWakeCandidates(sellers, mail, [], new Set(), now)).toEqual([]);
  });
  it("still gives a first review when contact was within 60 days", async () => {
    const { sellerWakeCandidates } = await import("../../supabase/functions/_shared/sellerWakeCandidates");
    const sellers = [{ id: "new", email: "b@x.com", created_at: "2026-08-01T00:00:00Z" }];
    const mail = [{ matched_submission_id: "new", from_email: "info@texascemeterybrokers.com", to_email: "b@x.com", received_at: "2026-10-20T00:00:00Z" }];
    expect(sellerWakeCandidates(sellers, mail, [], new Set(), now)).toEqual(["new"]);
  });
});
