import { supabase } from "@/integrations/supabase/client";

type DocumentOverrides = {
  cemetery?: string;
  cemeteryCity?: string | null;
  plotDescription?: string;
};

/** Rebuild every live, unsigned generated document with corrected property facts. */
export async function rebuildUnsignedSubmissionDocuments(
  submissionId: string,
  changes: DocumentOverrides,
): Promise<number> {
  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("id, kind, status, fill_data, signed_at, notarized_at, completed_at")
    .eq("submission_id", submissionId)
    .is("deleted_at", null)
    .neq("status", "void");
  if (error) throw error;

  let rebuilt = 0;
  for (const contract of contracts ?? []) {
    const locked = !!contract.signed_at || !!contract.notarized_at || !!contract.completed_at
      || ["signed", "notarized", "completed"].includes(String(contract.status));
    if (locked) continue;

    const fillData = (contract.fill_data ?? {}) as Record<string, unknown>;
    const countyState = changes.cemeteryCity ? `${changes.cemeteryCity}, TX` : undefined;
    const overrides: Record<string, unknown> = {
      ...fillData,
      ...(changes.cemetery ? { cemetery: changes.cemetery } : {}),
      ...(countyState ? { county_state: countyState, county: countyState } : {}),
      ...(changes.plotDescription ? { plot_description: changes.plotDescription } : {}),
      supersede_contract_id: contract.id,
    };

    const unchanged = (!changes.cemetery || String(fillData.cemetery ?? "").trim() === changes.cemetery.trim())
      && (!changes.plotDescription || String(fillData.plot_description ?? "").trim() === changes.plotDescription.trim())
      && (!countyState || String(fillData.county_state ?? fillData.county ?? "").trim() === countyState);
    if (unchanged) continue;

    const { data, error: rebuildError } = await supabase.functions.invoke("generate-contract", {
      body: { submission_id: submissionId, kind: contract.kind, overrides },
    });
    if (rebuildError || (data as { error?: string } | null)?.error) {
      await supabase.from("contracts").update({ status: "void" }).eq("id", contract.id);
      continue;
    }
    rebuilt += 1;
  }
  return rebuilt;
}