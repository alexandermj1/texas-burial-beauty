import { beforeEach, describe, expect, it, vi } from "vitest";
const { invoke, maybeSingle } = vi.hoisted(() => ({ invoke: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) } }));
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
  it("observes reported usage while a request is running without making another AI request", async () => {
    vi.useFakeTimers();
    try {
      const progress = vi.fn();
      let finish: ((value: unknown) => void) | undefined;
      invoke.mockResolvedValueOnce({ data: { status: "pending", run_id: "run-1", stage: "Checking files" } }).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
      maybeSingle.mockResolvedValue({ data: { stage_summary: "Sol — preparing suggestions", scan_usage: { input_tokens: 1200, output_tokens: 100, token_calls: 1 } } });
      const review = runSellerReview("seller-1", "openai/gpt-6.1-sol", undefined, progress);
      await vi.advanceTimersByTimeAsync(1500);
      expect(progress.mock.calls.at(-1)?.[0].usage.input_tokens).toBe(1200);
      expect(invoke).toHaveBeenCalledTimes(2);
      finish?.({ data: { status: "done" } }); await review;
      await vi.advanceTimersByTimeAsync(3000);
      expect(maybeSingle).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
  });
});