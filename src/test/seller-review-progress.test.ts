import { expect, it } from "vitest";
import { ScanMeter } from "../../supabase/functions/seller-agent/scanUsage";
import { researchProgress, decisionProgress } from "../../supabase/functions/seller-agent/reviewProgress";
it("totals reported tokens across research checkpoints without double-counting partial usage", () => {
  const meter = new ScanMeter(new Map());
  meter.observe("google/gemini-3.8-flash", { prompt_tokens: 1200, completion_tokens: 100 });
  expect(meter.live("anthropic/claude-opus-5-5", { input_tokens: 200, cache_read_input_tokens: 800, output_tokens: 30 }).input_tokens).toBe(2200);
  expect(meter.live("anthropic/claude-opus-5-5", { input_tokens: 200, cache_read_input_tokens: 800, output_tokens: 50 }).output_tokens).toBe(150);
  const next = new ScanMeter(new Map()); next.restore(meter.snapshot());
  next.observe("anthropic/claude-opus-5-5", { input_tokens: 200, cache_read_input_tokens: 800, output_tokens: 50 });
  expect(next.snapshot().input_tokens).toBe(2200); expect(next.snapshot().output_tokens).toBe(150);
});
it("does not invent tokens before the provider reports them", () => {
  const meter = new ScanMeter(new Map());
  expect(meter.live("openai/gpt-6.1-sol").token_calls).toBe(0);
  expect(meter.live("openai/gpt-6.1-sol").output_tokens).toBe(0);
});
it("uses the actual next research tool and preserves the selected decision model", () => {
  expect(researchProgress({ messages: [], trace: [], pending: [{ function: { name: "get_files" } }], step: 1, deedReads: 0, fileReads: 0 })).toBe("Looking up uploaded files");
  expect(decisionProgress("openai/gpt-6.1-sol")).toContain("Sol");
  expect(decisionProgress("anthropic/claude-opus-5-5")).toContain("Opus 5.5");
});