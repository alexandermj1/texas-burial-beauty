// Returns the signed-in admin's display name for email signatures.
// Falls back through profiles.full_name → user_metadata.full_name → email local-part.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { cleanDisplayName } from "@/lib/displayName";

export const useAdminDisplayName = () => {
  const { user } = useAuth();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    if (!user) { setName(""); return; }
    const meta = (user.user_metadata as any) || {};
    const fromMeta = cleanDisplayName(meta.full_name || meta.name);
    if (fromMeta) setName(fromMeta);

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const cleaned = cleanDisplayName(data?.full_name);
      if (cleaned) setName(cleaned);
      else if (!fromMeta) {
        const fallback = (data?.email || user.email || "").split("@")[0];
        setName(fallback);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return name;
};
