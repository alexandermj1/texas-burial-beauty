import type {} from "./generated/models.d.ts";
import { streamResponse, GatewayError, type ResponsesInputItem } from "npm:@lovable.dev/ai-gateway@0.1.11";
import { labelRun } from "../_shared/aiRunLabel.ts";
import { DEFAULT_SELLER_MODEL, sellerModelLabel, type SellerModel } from "./models.ts";

export async function sellerDecision(instructions: string, input: string, effort: "low" | "medium", media: ResponsesInputItem[] extends never[] ? never : NonNullable<Extract<ResponsesInputItem, { role?: string }>['content']>[] = [], model: SellerModel = DEFAULT_SELLER_MODEL) {
  // Native Responses content comes from loadScans; keep its file/image/text shape unchanged.
  const content = media.length ? [{ type: "input_text" as const, text: input }, ...media] : input;
  const request = labelRun({ instructions, input: [{ role: "user" as const, content }], prompt_cache_key: "seller-agent-playbook", reasoning: { effort } }, `Seller AI — deciding next steps (${sellerModelLabel(model)})`);
  try {
    const events = model === "openai/gpt-6.1-sol"
      ? await streamResponse({ ...request, model: "openai/gpt-6.1-sol" }, { maxRetries: 0 })
      : await streamResponse({ ...request, model: "openai/gpt-6-astra" }, { maxRetries: 0 });
    let out = "";
    for await (const event of events) {
      if (event.type === "response.output_text.delta") out += event.delta;
    }
    if (!out.trim()) throw new Error("AI returned no answer");
    return out;
  } catch (error) {
    if (error instanceof GatewayError) {
      throw Object.assign(new Error(error.message), { status: error.httpStatus });
    }
    throw error;
  }
}