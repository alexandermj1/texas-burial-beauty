import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useAgent = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAgent, setIsAgent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAgent(false);
      setLoading(false);
      return;
    }

    const checkAgent = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "agent")
        .maybeSingle();

      setIsAgent(!!data);
      setLoading(false);
    };

    checkAgent();
  }, [user, authLoading]);

  return { isAgent, loading: loading || authLoading };
};
