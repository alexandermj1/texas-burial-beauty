import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { checkRole } from "@/lib/checkRole";

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    checkRole(supabase, user.id, "admin").then((has) => {
      if (cancelled) return;
      setIsAdmin(has);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
};
