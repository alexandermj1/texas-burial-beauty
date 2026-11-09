import { describe, expect, it } from "vitest";
import { shouldAttemptCreditRecovery } from "../../supabase/functions/_shared/autopilotRecovery";

describe("Seller AI credit recovery", () => {
  it("retries a credit-exhaustion pause on the scheduled sweep", () => {
    expect(shouldAttemptCreditRecovery({ status: "paused", pause_reason: "AI access stopped (402): Payment required — add credits" })).toBe(true);
    expect(shouldAttemptCreditRecovery({ status: "paused", pause_reason: "Insufficient credits on the workspace" })).toBe(true);
  });

  it("does not override an owner pause or switch-off", () => {
    expect(shouldAttemptCreditRecovery({ status: "paused", pause_reason: "Paused by the owner" })).toBe(false);
    expect(shouldAttemptCreditRecovery({ status: "active", pause_reason: null })).toBe(false);
  });

  it("leaves permission and rate-limit circuit breakers under staff control", () => {
    expect(shouldAttemptCreditRecovery({ status: "paused", pause_reason: "AI access stopped (403): permission denied" })).toBe(false);
    expect(shouldAttemptCreditRecovery({ status: "paused", pause_reason: "AI rate limited three runs in a row" })).toBe(false);
  });
});
