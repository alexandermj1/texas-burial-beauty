export const CREDIT_EQUIVALENT = 0.3;
export type ScanUsage = { estimated_credits: number | null; equivalent: number | null; conversion: number; calls: number; missing_calls: number; input_tokens?: number; output_tokens?: number; token_calls?: number; current_call_pending?: boolean };
type Tier = { cost: string; min: number; max?: number };
type Rate = { tiers?: Tier[]; cache_read?: Rate; cache_write?: Rate };
type Pricing = { input?: { text?: Rate; cache_read?: Rate; cache_write?: Rate }; output?: { text?: Rate } };
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" ? v as Record<string, unknown> : {};
const number = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
export function estimateUsage(pricing: Pricing | undefined, raw: unknown, anthropic = false): number | null {
  const u = record(raw), details = record(u.input_tokens_details ?? u.prompt_tokens_details);
  const input = number(u.input_tokens ?? u.prompt_tokens), output = number(u.output_tokens ?? u.completion_tokens);
  if (!pricing || input === null || output === null) return null;
  const cached = number(u.cache_read_input_tokens ?? details.cached_tokens) ?? 0;
  const written = number(u.cache_creation_input_tokens ?? details.cache_write_tokens) ?? 0;
  const total = anthropic ? input + cached + written : input;
  const rate = (r?: Rate) => { const t = r?.tiers?.filter(t => total >= t.min && (t.max === undefined || total < t.max)).at(-1); return t ? Number(t.cost) : NaN; };
  const cost = (anthropic ? input : Math.max(0, input - cached - written)) * rate(pricing.input?.text)
    + output * rate(pricing.output?.text)
    + (cached ? cached * rate(pricing.input?.cache_read ?? pricing.input?.text?.cache_read) : 0)
    + (written ? written * rate(pricing.input?.cache_write ?? pricing.input?.text?.cache_write) : 0);
  return Number.isFinite(cost) ? cost : null;
}
export class ScanMeter {
  private input = 0;
  private output = 0;
  private tokenCalls = 0;
  private credits = 0;
  private calls = 0;
  private missing = 0;
  constructor(private pricing: Map<string, Pricing>) {}
  restore(saved?: ScanUsage | null) {
    if (!saved) return;
    this.calls = saved.calls; this.missing = saved.missing_calls;
    this.credits = saved.estimated_credits ?? 0;
    this.input = saved.input_tokens ?? 0; this.output = saved.output_tokens ?? 0; this.tokenCalls = saved.token_calls ?? 0;
  }
  observe(model: string, usage: unknown) {
    this.calls++;
    const tokens = usageTokens(model, usage);
    if (tokens) { this.input += tokens.input; this.output += tokens.output; this.tokenCalls++; }
    const cost = estimateUsage(this.pricing.get(model), usage, model.startsWith("anthropic/"));
    if (cost === null) this.missing++; else this.credits += cost;
  }
  snapshot(): ScanUsage {
    const credits = this.missing || !this.calls ? null : this.credits;
    return { estimated_credits: credits, equivalent: credits === null ? null : credits * CREDIT_EQUIVALENT, conversion: CREDIT_EQUIVALENT, calls: this.calls, missing_calls: this.missing, input_tokens: this.input, output_tokens: this.output, token_calls: this.tokenCalls };
  }
  live(model: string, usage?: unknown): ScanUsage {
    const tokens = usageTokens(model, usage);
    return { ...this.snapshot(), input_tokens: this.input + (tokens?.input ?? 0), output_tokens: this.output + (tokens?.output ?? 0), current_call_pending: true };
  }
}
export function usageTokens(model: string, raw: unknown) {
  const u = record(raw), input = number(u.input_tokens ?? u.prompt_tokens), output = number(u.output_tokens ?? u.completion_tokens);
  if (input === null && output === null) return null;
  return { input: (input ?? 0) + (model.startsWith("anthropic/") ? (number(u.cache_read_input_tokens) ?? 0) + (number(u.cache_creation_input_tokens) ?? 0) : 0), output: output ?? 0 };
}
export async function createScanMeter(listModels: () => Promise<{ workspace_models?: string; data: { id: string; pricing?: unknown }[] }>) {
  try {
    const catalog = await listModels();
    return new ScanMeter(new Map(catalog.workspace_models === "included" ? catalog.data.map(m => [m.id, m.pricing as Pricing]) : []));
  } catch { return new ScanMeter(new Map()); }
}