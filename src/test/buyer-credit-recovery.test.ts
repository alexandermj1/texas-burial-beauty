import { describe, expect, it, vi } from "vitest";
import { recoverBuyerCredits, retryableBuyerCreditDraft } from "../../supabase/functions/buyer-agent/creditRecovery";

describe("Buyer AI automatic credit recovery", () => {
  const paused = { status: "paused", pause_reason: "Not enough credits" };

  it("automatically unpauses after credit access succeeds", async () => {
    const resume = vi.fn(async () => true);
    expect(await recoverBuyerCredits(paused, async () => true, resume)).toEqual({ ready: true, recovered: true });
    expect(resume).toHaveBeenCalledOnce();
  });

  it("stays paused while credits are unavailable", async () => {
    const resume = vi.fn(async () => true);
    expect(await recoverBuyerCredits(paused, async () => false, resume)).toEqual({ ready: false, recovered: false });
    expect(resume).not.toHaveBeenCalled();
  });

  it("preserves intentional, permission and rate-limit pauses", async () => {
    const probe = vi.fn(async () => true);
    const resume = vi.fn(async () => true);
    for (const pause_reason of ["Paused by the owner", "Permission denied (403)", "Rate limited (429)"]) {
      expect(await recoverBuyerCredits({ status: "paused", pause_reason }, probe, resume)).toEqual({ ready: false, recovered: false });
    }
    expect(probe).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });

  it("does not run work if a concurrent pause prevented resuming", async () => {
    expect(await recoverBuyerCredits(paused, async () => true, async () => false)).toEqual({ ready: false, recovered: false });
  });

  it("revisits only drafts explicitly rejected for credits, never attempted emails or unknown outcomes", () => {
    expect(retryableBuyerCreditDraft({ status: "failed", error: "Not enough credits" })).toBe(true);
    for (const status of ["sent", "sending", "send_failed", "held", "rejected", "processing"]) {
      expect(retryableBuyerCreditDraft({ status, error: "Not enough credits" })).toBe(false);
    }
    expect(retryableBuyerCreditDraft({ status: "failed", error: "Network timeout" })).toBe(false);
  });
});