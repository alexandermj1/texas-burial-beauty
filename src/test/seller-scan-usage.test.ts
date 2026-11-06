import { expect, it } from "vitest";
import { estimateUsage, ScanMeter, CREDIT_EQUIVALENT } from "../../supabase/functions/seller-agent/scanUsage";
import { claudeMedia } from "../../supabase/functions/seller-agent/claudeMedia";
const pricing = { input: { text: { tiers: [{ min: 0, cost: "0.000016" }] }, cache_read: { tiers: [{ min: 0, cost: "0.0000008" }] } }, output: { text: { tiers: [{ min: 0, cost: "0.00008" }] } } };
it("converts scan credits at Alexander's 0.3 multiplier", () => {
  const meter = new ScanMeter(new Map([["anthropic/claude-opus-5-5", pricing]]));
  meter.observe("anthropic/claude-opus-5-5", { input_tokens: 10000, output_tokens: 500 });
  expect(CREDIT_EQUIVALENT).toBe(0.3);
  expect(meter.snapshot().estimated_credits).toBeCloseTo(0.2);
  expect(meter.snapshot().equivalent).toBeCloseTo(0.06);
});
it("counts cached input separately without charging it twice", () => {
  expect(estimateUsage(pricing, { input_tokens: 1000, cache_read_input_tokens: 9000, output_tokens: 500 }, true)).toBeCloseTo(0.0632);
});
it("never reports missing costs as zero", () => {
  const meter = new ScanMeter(new Map()); meter.observe("unknown", {});
  expect(meter.snapshot().estimated_credits).toBeNull();
  expect(meter.snapshot().equivalent).toBeNull();
});
it("uses OpenAI nested cache-write prices and concrete token usage", () => {
  const nested = { input: { text: { tiers: [{ min: 0, cost: "0.00004" }], cache_read: { tiers: [{ min: 0, cost: "0.000004" }] }, cache_write: { tiers: [{ min: 0, cost: "0.00005" }] } } }, output: { text: { tiers: [{ min: 0, cost: "0.0002" }] } } };
  expect(estimateUsage(nested, { input_tokens: 17530, input_tokens_details: { cache_write_tokens: 17530, cached_tokens: 0 }, output_tokens: 268 })).toBeCloseTo(0.9301);
});
it("gives each scan an independent meter", () => {
  const a = new ScanMeter(new Map([["model", pricing]])), b = new ScanMeter(new Map([["model", pricing]]));
  a.observe("model", { input_tokens: 1000, output_tokens: 100 });
  expect(a.snapshot().calls).toBe(1); expect(b.snapshot().calls).toBe(0);
});
it("preserves both the PDF deed and image scan when selecting Opus", () => {
  expect(claudeMedia([{ type: "input_file", filename: "deed.pdf", file_data: "data:application/pdf;base64,YQ==" }, { type: "input_image", image_url: "data:image/jpeg;base64,Yg==" }])).toEqual([{ type: "document", title: "deed.pdf", source: { type: "base64", media_type: "application/pdf", data: "YQ==" } }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "Yg==" } }]);
  expect(() => claudeMedia([{ type: "input_image", image_url: "data:image/heic;base64,Yg==" }])).toThrow();
});