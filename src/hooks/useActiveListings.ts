import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminListing {
  id: string;
  cemetery: string;
  city: string;
  plot_type: string;
  section: string;
  spaces: number;
  asking_price: number | null;
  description: string | null;
  status: string;
  photos: string[] | null;
}

const norm = (s: string | null | undefined) =>
  (s || "").toLowerCase().replace(/\s+/g, " ").trim();

export const useActiveListings = () => {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, cemetery, city, plot_type, section, spaces, asking_price, description, status, photos")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (mounted) {
        setListings((data as AdminListing[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Counts keyed by normalised cemetery name.
  const countsByCemetery = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of listings) {
      const k = norm(l.cemetery);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [listings]);

  const countFor = (cemetery: string | null | undefined) =>
    countsByCemetery.get(norm(cemetery)) || 0;

  const listingsAt = (cemetery: string | null | undefined): AdminListing[] => {
    const k = norm(cemetery);
    if (!k) return [];
    return listings.filter((l) => norm(l.cemetery) === k);
  };

  return { listings, loading, countFor, listingsAt };
};
