import { supabase } from "@/integrations/supabase/client";
import type { SellerModel } from "../../supabase/functions/seller-agent/models";
import type { ScanUsage } from "../../supabase/functions/seller-agent/scanUsage";
export type ReviewProgress = { stage: string; model: SellerModel; usage?: ScanUsage | null; startedAt: number };

/** Continue only after a successful checkpoint acknowledgement. Never retry failed inference. */
export async function runSellerReview(submissionId: string, model: SellerModel, instruction?: string, onProgress?: (progress: ReviewProgress) => void) {
  const startedAt = Date.now();
  onProgress?.({ stage: "Loading seller details, emails and document references", model, startedAt });
  let body: Record<string, unknown> = { action: "run", submission_id: submissionId, model, ...(instruction ? { instruction } : {}) };
  for (let step = 0; step < 100; step++) {
    let active = true, polling = false;
    const timer = onProgress && body.run_id ? setInterval(async () => {
      if (polling) return;
      polling = true;
      try {
        const { data: row } = await supabase.from("ai_agent_runs" as never).select("stage_summary,scan_usage").eq("id", body.run_id).maybeSingle();
        const saved = row as { stage_summary?: string; scan_usage?: ScanUsage } | null;
        if (active && saved?.stage_summary) onProgress({ stage: saved.stage_summary, model, usage: saved.scan_usage, startedAt });
      } catch { /* Observing progress must never retry or interrupt inference. */ }
      finally { polling = false; }
    }, 1500) : undefined;
    const result = await supabase.functions.invoke("seller-agent", { body }).finally(() => { active = false; clearInterval(timer); });
    const { data, error } = result;
    if (error) {
      let message = error.message;
      try { const detail = await error.context?.json(); if (typeof detail?.error === "string") message = detail.error; } catch { /* retain error */ }
      throw new Error(message + " Review stopped; no automatic retry was made.");
    }
    if (data?.status !== "pending") return data;
    if (!data.run_id) throw new Error("Review checkpoint missing; stopped without retrying.");
    onProgress?.({ stage: data.stage ?? "Checking seller file", model, usage: data.scan_usage, startedAt });
    body = { action: "continue_review", run_id: data.run_id, model };
  }
  throw new Error("Review exceeded its checkpoint limit; stopped without retrying.");
}