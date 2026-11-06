import type { SellerModel } from "../../supabase/functions/seller-agent/models";
// Workspace standard, uncached text rates verified November 6, 2026.
// These compare token prices, not complete scans (research and caches vary).
export const SELLER_TOKEN_COSTS: Record<SellerModel, { input: number; output: number; relative: number }> = {
  "openai/gpt-6-astra": { input: 40, output: 200, relative: 1 },
  "openai/gpt-6.1-sol": { input: 8, output: 40, relative: 0.2 },
  "anthropic/claude-opus-5-5": { input: 16, output: 80, relative: 0.4 },
};