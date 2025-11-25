import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useClientEditorialData(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-editorial-data', clientId],
    queryFn: async () => {
      if (!clientId) throw new Error('Client ID is required');

      // Buscar perfil do cliente
      const { data: profile, error: profileError } = await supabase
        .from('client_ai_profiles')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Buscar dados do cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('name, monthly_creatives')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // Contar criativos
      const { count, error: countError } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      if (countError) throw countError;

      return {
        profile: profile || null,
        client,
        creativesCount: count || 0,
      };
    },
    enabled: !!clientId,
  });
}
