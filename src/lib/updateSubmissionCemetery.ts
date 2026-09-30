import { supabase } from "@/integrations/supabase/client";
import { rebuildUnsignedSubmissionDocuments } from "@/lib/rebuildUnsignedSubmissionDocuments";

/** Same audited reassignment for the cemetery picker and staff-directed AI. */
export async function updateSubmissionCemetery(submissionId: string, cemetery: string, city: string | null, plotDescription?: string) {
  const { data, error: readError } = await supabase.from("contact_submissions")
    .select("cemetery, cemetery_city, cemetery_original, cemetery_merge_history, ownership_answers, plot_description")
    .eq("id", submissionId).maybeSingle();
  if (readError || !data) throw readError ?? new Error("Seller record not found");
  const oldName = data.cemetery ?? "";
  if (oldName === cemetery && plotDescription === undefined) return 0;

  const history = Array.isArray(data.cemetery_merge_history) ? data.cemetery_merge_history : [];
  const answers = (data.ownership_answers ?? {}) as Record<string, unknown>;
  const autopilot = (answers.autopilot ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {
    cemetery,
    cemetery_city: city,
    cemetery_original: data.cemetery_original || oldName || null,
    cemetery_merge_history: [...history, { at: new Date().toISOString(), from: oldName, to: cemetery, kind: "reassign" }],
  };
  if (plotDescription !== undefined) {
    patch.plot_description = plotDescription;
    patch.ownership_answers = { ...answers, autopilot: { ...autopilot, plotDescription, plotDescriptionUpdatedAt: new Date().toISOString() } };
  }
  const { error } = await supabase.from("contact_submissions").update(patch as never).eq("id", submissionId);
  if (error) throw error;
  return rebuildUnsignedSubmissionDocuments(submissionId, {
    cemetery,
    cemeteryCity: city,
    ...(plotDescription !== undefined ? { plotDescription } : {}),
  });
}