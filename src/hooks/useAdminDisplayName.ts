// Returns the signed-in admin's display name for email signatures.
// Falls back through profiles.full_name → user_metadata.full_name → email local-part.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { cleanDisplayName } from "@/lib/displayName";

// Alexander prefers to sign off as "Alexander James" rather than his full legal name.
const applyOverrides = (name: string, email?: string | null): string => {
  const lower = (name || "").toLowerCase();
  const emailLower = (email || "").toLowerCase();
  if (lower.startsWith("alexander") || emailLower.startsWith("alexander")) {
    return "Alexander James";
  }
  if (lower.startsWith("sharron") || emailLower.startsWith("sharron") || lower.startsWith("kayla") || emailLower.startsWith("kayla")) {
    return "Kayla";
  }

  return name;
};

export const useAdminDisplayName = () => {
  const { user } = useAuth();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    if (!user) { setName(""); return; }
    const meta = (user.user_metadata as any) || {};
    const fromMeta = cleanDisplayName(meta.full_name || meta.name);
    if (fromMeta) setName(applyOverrides(fromMeta, user.email));

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const cleaned = cleanDisplayName(data?.full_name);
      if (cleaned) setName(applyOverrides(cleaned, data?.email || user.email));
      else if (!fromMeta) {
        const fallback = (data?.email || user.email || "").split("@")[0];
        setName(applyOverrides(fallback, data?.email || user.email));
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return name;
};
