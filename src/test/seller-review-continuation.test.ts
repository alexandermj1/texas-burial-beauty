import { describe, expect, it } from "vitest";
import { claimPhase } from "../../supabase/functions/seller-agent/reviewContinuation";
describe("seller review checkpoints", () => {
  it("claims research separately from the decision", () => {
    expect(claimPhase("research_ready")).toBe("research_running");
    expect(claimPhase("decision_ready")).toBe("deciding");
  });
  it("never replays a running or interrupted inference", () => {
    for (const state of ["research_running", "deciding", "error", "done", "running"]) expect(claimPhase(state)).toBeNull();
  });
});