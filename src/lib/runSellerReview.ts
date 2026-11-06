import { supabase } from "@/integrations/supabase/client";
import type { SellerModel } from "../../supabase/functions/seller-agent/models";

/** Continue only after a successful checkpoint acknowledgement. Never retry failed inference. */
export async function runSellerReview(submissionId: string, model: SellerModel, instruction?: string, onProgress?: (stage: string) => void) {
  let body: Record<string, unknown> = { action: "run", submission_id: submissionId, model, ...(instruction ? { instruction } : {}) };
  for (let step = 0; step < 100; step++) {
    const { data, error } = await supabase.functions.invoke("seller-agent", { body });
    if (error) {
      let message = error.message;
      try { const detail = await error.context?.json(); if (typeof detail?.error === "string") message = detail.error; } catch { /* retain error */ }
      throw new Error(message + " Review stopped; no automatic retry was made.");
    }
    if (data?.status !== "pending") return data;
    if (!data.run_id) throw new Error("Review checkpoint missing; stopped without retrying.");
    onProgress?.(data.stage ?? "Checking seller file");
    body = { action: "continue_review", run_id: data.run_id, model };
  }
  throw new Error("Review exceeded its checkpoint limit; stopped without retrying.");
}