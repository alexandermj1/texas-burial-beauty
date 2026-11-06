import { expect, it } from "vitest";
import { SELLER_MODELS, DEFAULT_SELLER_MODEL, reviewTrigger, reviewModelLabel } from "../../supabase/functions/seller-agent/models";

it("enables both Astra and Sol decisions", () => {
  expect([...SELLER_MODELS]).toEqual(["openai/gpt-6-astra", "openai/gpt-6.1-sol", "anthropic/claude-opus-5-5"]);
});
it("retains Astra when no model is selected", () => {
  expect(DEFAULT_SELLER_MODEL).toBe("openai/gpt-6-astra");
});
it("records each chosen model independently for comparison", () => {
  expect(reviewTrigger("manual", "openai/gpt-6.1-sol")).toBe("manual:sol");
  expect(reviewTrigger("manual", "openai/gpt-6-astra")).toBe("manual:astra");
  expect(reviewModelLabel("manual:sol")).toBe("Sol");
  expect(reviewModelLabel("manual:astra")).toBe("Astra");
  expect(reviewTrigger("manual", "anthropic/claude-opus-5-5")).toBe("manual:opus 5.5");
  expect(reviewModelLabel("manual:astra", "openai/gpt-6.1-sol")).toBe("Sol");
  expect(reviewModelLabel("staff_request")).toBe("Model not recorded");
});