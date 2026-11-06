import { describe, expect, it } from "vitest";
import { sellerWakeCandidates } from "../../supabase/functions/_shared/sellerWakeCandidates";
const seller = (id: string) => ({ id, email: `${id}@example.com`, created_at: "2026-10-01T12:00:00Z" });
describe("unanswered seller priority", () => {
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