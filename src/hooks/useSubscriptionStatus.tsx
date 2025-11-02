import { useEffect, useState } from "react";
import { getUserSubscriptionStatus, SubscriptionStatus } from "@/lib/subscription-enforcement";
import { supabase } from "@/integrations/supabase/client";

export function useSubscriptionStatus() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStatus = async () => {
    setLoading(true);
    const newStatus = await getUserSubscriptionStatus();
    setStatus(newStatus);
    setLoading(false);
  };

  useEffect(() => {
    refreshStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshStatus();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { status, loading, refreshStatus };
}
