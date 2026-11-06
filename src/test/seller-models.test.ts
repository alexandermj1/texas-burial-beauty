import { expect, it } from "vitest";
import { SELLER_MODELS, DEFAULT_SELLER_MODEL, reviewTrigger, reviewModelLabel } from "../../supabase/functions/seller-agent/models";

it("enables both Astra and Sol decisions", () => {
  expect([...SELLER_MODELS]).toEqual(["openai/gpt-6-astra", "openai/gpt-6.1-sol", "anthropic/claude-opus-5-5", "anthropic/claude-sonnet-5"]);
});
it("uses Sol when no model is selected", () => {
  expect(DEFAULT_SELLER_MODEL).toBe("openai/gpt-6.1-sol");
});
it("records each chosen model independently for comparison", () => {
  expect(reviewTrigger("manual", "openai/gpt-6.1-sol")).toBe("manual:sol");
  expect(reviewTrigger("manual", "openai/gpt-6-astra")).toBe("manual:astra");
  expect(reviewModelLabel("manual:sol")).toBe("Sol");
  expect(reviewModelLabel("manual:astra")).toBe("Astra");
  expect(reviewTrigger("manual", "anthropic/claude-opus-5-5")).toBe("manual:opus 5.5");
  expect(reviewModelLabel("manual:astra", "openai/gpt-6.1-sol")).toBe("Sol");
  expect(reviewModelLabel("staff_request")).toBe("Model not recorded");
});it("runs the unattended autopilot on Sonnet 5", async () => {
  const { AUTOPILOT_MODEL } = await import("../../supabase/functions/seller-agent/models");
  expect(AUTOPILOT_MODEL).toBe("anthropic/claude-sonnet-5");
  expect(reviewTrigger("autopilot", AUTOPILOT_MODEL)).toBe("autopilot:sonnet 5");
  expect(reviewModelLabel("autopilot:sonnet 5")).toBe("Sonnet 5");
});
