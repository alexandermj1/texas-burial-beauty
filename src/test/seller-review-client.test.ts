import { beforeEach, describe, expect, it, vi } from "vitest";
const invoke = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
import { runSellerReview } from "@/lib/runSellerReview";
describe("explicit seller model across review steps", () => {
  beforeEach(() => invoke.mockReset());
  for (const model of ["openai/gpt-6-astra", "openai/gpt-6.1-sol", "anthropic/claude-opus-5-5"] as const) {
    it(`retains ${model} from start through decision`, async () => {
      invoke.mockResolvedValueOnce({ data: { status: "pending", run_id: "run-1" } }).mockResolvedValueOnce({ data: { status: "pending", run_id: "run-1" } }).mockResolvedValueOnce({ data: { status: "done", model } });
      expect((await runSellerReview("seller-1", model)).model).toBe(model);
      expect(invoke.mock.calls.map(c => c[1].body.model)).toEqual([model, model, model]);
      expect(invoke.mock.calls[1][1].body).toEqual({ action: "continue_review", run_id: "run-1", model });
    });
  }
  it("does not replay a failed step", async () => {
    invoke.mockResolvedValueOnce({ error: { message: "connection lost" } });
    await expect(runSellerReview("seller-1", "anthropic/claude-opus-5-5")).rejects.toThrow("no automatic retry");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});