import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Returns whether the signed-in user has the `staff` role.
// Staff users get limited access to the admin dashboard
// (Submissions, Map, and Email Marketing only).
export const useStaff = () => {
  const { user, loading: authLoading } = useAuth();
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsStaff(false); setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "staff")
        .maybeSingle();
      setIsStaff(!!data);
      setLoading(false);
    })();
  }, [user, authLoading]);

  return { isStaff, loading: loading || authLoading };
};
