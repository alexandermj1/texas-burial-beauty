import type {} from "./generated/models.d.ts";
import { streamResponse, streamMessage, GatewayError, type ResponsesInputItem } from "npm:@lovable.dev/ai-gateway@0.1.11";
import { claudeMedia } from "./claudeMedia.ts";
import type { ScanMeter } from "./scanUsage.ts";
import { labelRun } from "../_shared/aiRunLabel.ts";
import { DEFAULT_SELLER_MODEL, sellerModelLabel, type SellerModel } from "./models.ts";

type InputContent = Exclude<Extract<ResponsesInputItem, { content: unknown }>['content'], string>;
export async function sellerDecision(instructions: string, input: string, effort: "low" | "medium", media: InputContent = [], model: SellerModel = DEFAULT_SELLER_MODEL, meter?: ScanMeter, onProgress?: (characters: number, usage?: unknown) => Promise<void>) {
  let lastUpdate = 0;
  const report = async (characters: number, usage?: unknown, force = false) => {
    if (onProgress && (force || Date.now() - lastUpdate >= 1500)) { lastUpdate = Date.now(); await onProgress(characters, usage); }
  };
  // Native Responses content comes from loadScans; keep its file/image/text shape unchanged.
  const content = media.length ? [{ type: "input_text" as const, text: input }, ...media] : input;
  const request = labelRun({ instructions, input: [{ role: "user" as const, content }], prompt_cache_key: "seller-agent-playbook", reasoning: { effort } }, `Seller AI — deciding next steps (${sellerModelLabel(model)})`);
  try {
    if (model === "anthropic/claude-opus-5-5") {
      const events = await streamMessage(labelRun({ model: "anthropic/claude-opus-5-5" as const, system: instructions, messages: [{ role: "user" as const, content: [{ type: "text" as const, text: input }, ...claudeMedia(media)] }], max_tokens: 16384, thinking: { type: "adaptive" as const }, output_config: { effort } }, `Seller AI — deciding next steps (${sellerModelLabel(model)})`), { maxRetries: 0 });
      let out = "", usage: Record<string, unknown> = {}, finished = false;
      for await (const event of events) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") out += event.delta.text;
        if (event.type === "message_start") { usage = { ...event.message.usage }; await report(out.length, usage, true); }
        if (event.type === "message_delta") {
          usage = { ...usage, ...event.usage };
          await report(out.length, usage, true);
          if (event.delta.stop_reason && event.delta.stop_reason !== "end_turn") throw new Error(`Opus stopped with ${event.delta.stop_reason}; no actions saved.`);
        }
        if (event.type === "message_stop") finished = true;
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") await report(out.length, usage);
      }
      meter?.observe(model, usage);
      if (!finished || !out.trim()) throw new Error("Opus did not complete an answer; no actions saved.");
      return out;
    }
    const events = model === "openai/gpt-6.1-sol"
      ? await streamResponse({ ...request, model: "openai/gpt-6.1-sol" }, { maxRetries: 0 })
      : await streamResponse({ ...request, model: "openai/gpt-6-astra" }, { maxRetries: 0 });
    let out = "", finished = false;
    for await (const event of events) {
      if (event.type === "response.output_text.delta") out += event.delta;
      if (event.type === "response.output_text.delta") await report(out.length);
      if (event.type === "response.completed") { finished = true; meter?.observe(model, event.response.usage); }
    }
    if (!finished || !out.trim()) throw new Error("AI did not complete an answer; no actions saved.");
    return out;
  } catch (error) {
    if (error instanceof GatewayError) {
      throw Object.assign(new Error(error.message), { status: error.httpStatus });
    }
    throw error;
  }
}