import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CemeteryMeta {
  transferFee: number | null;
  listings: number;
}

const norm = (s: string | null | undefined) =>
  (s || "")
    .toLowerCase()
    .replace(/\b(memorial park|memorial gardens|cemetery|memorial|park|gardens)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Public metadata used to enrich cemetery cards on the coverage maps:
 * transfer fee (from the cemetery registry) and live plot counts.
 */
export const useCemeteryMeta = () => {
  const [fees, setFees] = useState<Record<string, number>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [cems, listings] = await Promise.all([
        supabase.from("texas_cemeteries").select("name, transfer_fee").not("transfer_fee", "is", null),
        supabase.from("listings").select("cemetery").eq("status", "active"),
      ]);
      if (!mounted) return;
      const f: Record<string, number> = {};
      for (const row of (cems.data as { name: string; transfer_fee: number | null }[]) || []) {
        const k = norm(row.name);
        if (k && row.transfer_fee != null) f[k] = Number(row.transfer_fee);
      }
      const c: Record<string, number> = {};
      for (const row of (listings.data as { cemetery: string | null }[]) || []) {
        const k = norm(row.cemetery);
        if (k) c[k] = (c[k] || 0) + 1;
      }
      setFees(f);
      setCounts(c);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return useMemo(
    () => ({
      loading,
      metaFor: (name: string): CemeteryMeta => {
        const k = norm(name);
        return { transferFee: fees[k] ?? null, listings: counts[k] ?? 0 };
      },
    }),
    [fees, counts, loading]
  );
};

/** Availability tier used for pin + card colour coding. */
export const tierFor = (listings: number) =>
  listings >= 3 ? "high" : listings >= 1 ? "some" : "none";

export const TIER = {
  high: { label: "High volume", pin: "#c1704a", chip: "bg-terracotta/15 text-terracotta border-terracotta/30" },
  some: { label: "Plots available", pin: "#4a6b4f", chip: "bg-primary/12 text-primary border-primary/30" },
  none: { label: "Broker access", pin: "#8b8378", chip: "bg-muted text-muted-foreground border-border" },
} as const;
