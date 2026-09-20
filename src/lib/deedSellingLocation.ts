import { supabase } from "@/integrations/supabase/client";

/**
 * The one place that works out "the locations being sold" for a seller.
 *
 * Order of truth:
 *   1. The wording the office saved on the submission (plot_description).
 *   2. What the AI read off the deed (Section / Block / Lot / Space / plot type).
 *
 * Every screen — the top of the seller profile, the family tree + documents
 * section and the quote packet builder — must show the same answer, so they all
 * call this.
 */
export function buildDeedLocationFromExtracted(files: Array<{ extracted_data?: any }>): string {
  const pick = (key: string): string => {
    for (const f of files) {
      const raw = (f?.extracted_data || {})[key];
      if (raw == null) continue;
      const value = Array.isArray(raw)
        ? raw.filter((v) => v != null && String(v).trim() !== "").map(String).join(", ")
        : String(raw).trim();
      if (value) return value;
    }
    return "";
  };

  const parts: string[] = [];
  const section = pick("section");
  const block = pick("block");
  const lot = pick("lot");
  const space = pick("space");
  const plotType = pick("plot_type");
  if (section) parts.push(`Section ${section}`);
  if (block) parts.push(`Block ${block}`);
  if (lot) parts.push(`Lot ${lot}`);
  if (space) parts.push(`Space ${space}`);
  if (plotType && !parts.some((p) => p.toLowerCase().includes(plotType.toLowerCase()))) parts.push(plotType);
  return parts.join(" · ");
}

/** Reads the deed description for whoever owns this email address. */
export async function fetchDeedSellingLocation(email: string | null | undefined): Promise<string> {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return "";
  const { data: profiles } = await supabase
    .from("customer_profiles" as any)
    .select("id, primary_email, alt_emails");
  const ids = ((profiles as any[]) || [])
    .filter((p) => [p.primary_email, ...(Array.isArray(p.alt_emails) ? p.alt_emails : [])]
      .filter(Boolean)
      .map((e: string) => String(e).toLowerCase())
      .includes(target))
    .map((p) => p.id);
  if (ids.length === 0) return "";
  const { data: files } = await supabase
    .from("customer_files" as any)
    .select("extracted_data")
    .is("deleted_at", null)
    .in("customer_profile_id", ids);
  return buildDeedLocationFromExtracted(((files as any[]) || []));
}
