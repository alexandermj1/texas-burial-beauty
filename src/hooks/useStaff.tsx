import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { checkRole } from "@/lib/checkRole";

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
    let cancelled = false;
    setLoading(true);
    checkRole(supabase, user.id, "staff").then((has) => {
      if (cancelled) return;
      setIsStaff(has);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id, authLoading]);

  return { isStaff, loading: loading || authLoading };
};
