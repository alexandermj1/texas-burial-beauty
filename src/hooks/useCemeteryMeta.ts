import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cemeteryWebsite } from "@/data/cemeteryWebsites";

export interface CemeteryMeta {
  transferFee: number | null;
  /** Relative demand tier, 1 (quietest) – 5 (busiest). 0 = not enough signal. */
  band: number;
  website: string | null;
}

/** Full normalisation — keeps every distinguishing word, drops punctuation only. */
const strict = (s: string | null | undefined) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Loose normalisation — drops generic suffixes. Only used when unambiguous. */
const loose = (s: string | null | undefined) =>
  strict(s)
    .replace(/\b(funeral home|memorial park|memorial gardens|burial park|cemeteries|cemetery|memorial|gardens|park)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const httpUrl = (u: string | null | undefined) => {
  const s = (u || "").trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

/**
 * Public metadata used to enrich cemetery cards on the coverage maps:
 * transfer fee + website (curated list first, registry second) and a vague,
 * relative demand band derived server-side from inquiry volume.
 */
export const useCemeteryMeta = () => {
  const [fees, setFees] = useState<Record<string, number>>({});
  const [looseFees, setLooseFees] = useState<Record<string, number>>({});
  const [sites, setSites] = useState<Record<string, string>>({});
  const [bands, setBands] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [cems, demand] = await Promise.all([
        supabase.from("texas_cemeteries").select("name, transfer_fee, website"),
        supabase.rpc("cemetery_demand_bands" as never),
      ]);
      if (!mounted) return;

      const rows = (cems.data as { name: string; transfer_fee: number | null; website: string | null }[]) || [];

      // Count loose keys so ambiguous ones (e.g. two "Greenwood"s) never cross-match.
      const looseCount: Record<string, number> = {};
      rows.forEach((r) => {
        const lk = loose(r.name);
        if (lk) looseCount[lk] = (looseCount[lk] || 0) + 1;
      });

      const f: Record<string, number> = {};
      const lf: Record<string, number> = {};
      const w: Record<string, string> = {};
      for (const row of rows) {
        const k = strict(row.name);
        const lk = loose(row.name);
        if (!k) continue;
        if (row.transfer_fee != null) {
          f[k] = Number(row.transfer_fee);
          if (lk && looseCount[lk] === 1) lf[lk] = Number(row.transfer_fee);
        }
        const url = httpUrl(row.website);
        if (url) w[k] = url;
      }

      const b: Record<string, number> = {};
      for (const row of (demand.data as { cemetery_key: string; band: number }[]) || []) {
        const k = loose(row.cemetery_key);
        if (k) b[k] = Math.max(b[k] || 0, Number(row.band) || 0);
      }

      setFees(f);
      setLooseFees(lf);
      setSites(w);
      setBands(b);
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
        const k = strict(name);
        const lk = loose(name);
        return {
          transferFee: fees[k] ?? looseFees[lk] ?? null,
          band: bands[lk] ?? 0,
          // Only the curated, verified list is trusted for outbound links.
          website: cemeteryWebsite(name) ?? null,

        };
      },
    }),
    [fees, looseFees, bands, sites, loading]
  );
};

/** Five-step, deliberately vague demand grading used for pin + card colour coding. */
export const BANDS = {
  5: { label: "Exceptional interest", pin: "#a8442f", chip: "border-[#a8442f]/35 bg-[#a8442f]/10 text-[#8c3826]" },
  4: { label: "Very sought after", pin: "#c1704a", chip: "border-[#c1704a]/35 bg-[#c1704a]/10 text-[#a2583a]" },
  3: { label: "Actively traded", pin: "#b79a4e", chip: "border-[#b79a4e]/40 bg-[#b79a4e]/12 text-[#8a7233]" },
  2: { label: "Regular interest", pin: "#4a6b4f", chip: "border-primary/30 bg-primary/10 text-primary" },
  1: { label: "Quieter market", pin: "#7d8f7f", chip: "border-[#7d8f7f]/35 bg-[#7d8f7f]/12 text-[#5c6b5e]" },
  0: { label: "Broker access", pin: "#8b8378", chip: "border-border bg-muted/60 text-muted-foreground" },
} as const;

export const bandInfo = (band: number) => BANDS[(band in BANDS ? band : 0) as keyof typeof BANDS];

/** Metros where we can arrange same-day walk-throughs. */
export const SAME_DAY_REGIONS = ["Dallas–Fort Worth", "Greater Houston"];

export const showingLabel = (region: string) =>
  SAME_DAY_REGIONS.includes(region) ? "Same-day in-person showings" : "In-person showings available";
