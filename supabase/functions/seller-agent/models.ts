export const SELLER_MODELS = ["openai/gpt-6-astra", "openai/gpt-6.1-sol", "anthropic/claude-opus-5-5", "anthropic/claude-sonnet-5"] as const;
export type SellerModel = typeof SELLER_MODELS[number];
export const DEFAULT_SELLER_MODEL: SellerModel = "openai/gpt-6.1-sol";
/** Model the unattended autopilot uses for its reviews and replies (owner choice). */
export const AUTOPILOT_MODEL: SellerModel = "anthropic/claude-sonnet-5";
export function sellerModelLabel(model: SellerModel) {
  return model === "openai/gpt-6.1-sol" ? "Sol" : model === "anthropic/claude-opus-5-5" ? "Opus 5.5" : model === "anthropic/claude-sonnet-5" ? "Sonnet 5" : "Astra";
}
export function reviewTrigger(trigger: string, model: SellerModel) {
  return `${trigger.slice(0, 45)}:${sellerModelLabel(model).toLowerCase()}`;
}
export function reviewModelLabel(trigger: string, model?: string | null) {
  if (model && SELLER_MODELS.some(m => m === model)) return sellerModelLabel(model as SellerModel);
  return trigger.endsWith(":sol") ? "Sol" : trigger.endsWith(":opus 5.5") ? "Opus 5.5" : trigger.endsWith(":sonnet 5") ? "Sonnet 5" : trigger.endsWith(":astra") ? "Astra" : "Model not recorded";
}