export const SELLER_MODELS = ["openai/gpt-6-astra", "openai/gpt-6.1-sol"] as const;
export type SellerModel = typeof SELLER_MODELS[number];
export const DEFAULT_SELLER_MODEL: SellerModel = "openai/gpt-6-astra";
export function sellerModelLabel(model: SellerModel) {
  return model === "openai/gpt-6.1-sol" ? "Sol" : "Astra";
}
export function reviewTrigger(trigger: string, model: SellerModel) {
  return `${trigger.slice(0, 45)}:${sellerModelLabel(model).toLowerCase()}`;
}
export function reviewModelLabel(trigger: string) {
  return trigger.endsWith(":sol") ? "Sol" : "Astra";
}