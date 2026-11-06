import { describe, expect, it } from "vitest";
import { dailySellerUsage, type UsageRun } from "@/lib/sellerDailyUsage";
const run = (at: string, overrides = {}): UsageRun => ({ id: at, created_at: at, submission_id: "seller", status: "done", scan_usage: { input_tokens: 1200, output_tokens: 300, calls: 1, token_calls: 1, missing_calls: 0, estimated_credits: 2, equivalent: 0.6, conversion: 0.3 }, ...overrides });
describe("saved daily Seller AI usage", () => {
  it("sums input/output once per run and uses saved dollar estimates", () => {
    const [today] = dailySellerUsage([run("2026-11-06T10:00:00Z"), run("2026-11-06T12:00:00Z")], new Date("2026-11-06T22:53:00Z"));
    expect(today.tokens).toBe(3000); expect(today.dollars).toBe(1.2); expect(today.missing).toBe(0);
  });
  it("separates UTC calendar days rather than rolling 24 hours", () => {
    const [today, yesterday] = dailySellerUsage([run("2026-11-05T23:59:59Z"), run("2026-11-06T00:00:00Z")], new Date("2026-11-06T22:53:00Z"));
    expect(today.tokens).toBe(1500); expect(yesterday.tokens).toBe(1500);
  });
  it("keeps missing telemetry partial instead of asserting zero cost", () => {
    const [today] = dailySellerUsage([run("2026-11-06T10:00:00Z", { scan_usage: null })], new Date("2026-11-06T22:53:00Z"));
    expect(today.missing).toBe(1);
  });
});