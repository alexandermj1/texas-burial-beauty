// One cemetery registry for the whole product.
//
// The database table `texas_cemeteries` is the single source of truth: the
// buyer concierge, the seller quote form and the admin cemetery panel all read
// it through this hook, so a cemetery added in one place immediately exists in
// the other two. The curated file in `src/data/cemeteries.ts` is only a seed /
// offline fallback — it is already mirrored into the table by migration.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bayCemeteries } from "@/data/cemeteries";
import { ALL_TEXAS_REGIONS } from "@/data/metroRegions";

export interface RegistryCemetery {
  id: string | null;
  name: string;
  city: string;
  region: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

/** Regions in the order the forms should offer them. */
export const REGISTRY_REGIONS = [...ALL_TEXAS_REGIONS, "Other Texas"];

const CITY_REGION: Record<string, string> = {};
for (const c of bayCemeteries) CITY_REGION[c.city.toLowerCase()] = c.region;

/** Fallback region for a row that has no region set yet (freshly added by an admin). */
export const regionForCity = (city: string | null | undefined) =>
  CITY_REGION[(city || "").toLowerCase().trim()] || "Other Texas";

const fromSeed = (): RegistryCemetery[] =>
  bayCemeteries.map((c) => ({
    id: null, name: c.name, city: c.city, region: c.region, address: c.address, lat: c.lat, lng: c.lng,
  }));

// One in-flight request shared by every component that mounts the hook.
let cache: Promise<RegistryCemetery[]> | null = null;

const load = (): Promise<RegistryCemetery[]> => {
  if (cache) return cache;
  cache = (async () => {
    const { data, error } = await supabase
      .from("texas_cemeteries")
      .select("id,name,city,address,region,latitude,longitude")
      .order("name");
    if (error || !data?.length) return fromSeed();
    return (data as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      city: String(r.city ?? ""),
      region: String(r.region ?? "") || regionForCity(r.city as string),
      address: String(r.address ?? ""),
      lat: r.latitude == null ? null : Number(r.latitude),
      lng: r.longitude == null ? null : Number(r.longitude),
    }));
  })();
  return cache;
};

/** Drop the cache after an admin edits the registry so every surface re-reads it. */
export const refreshCemeteryRegistry = () => { cache = null; };

export const useCemeteryRegistry = () => {
  const [cemeteries, setCemeteries] = useState<RegistryCemetery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    load().then((rows) => {
      if (!alive) return;
      setCemeteries(rows);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  return { cemeteries, loading };
};
