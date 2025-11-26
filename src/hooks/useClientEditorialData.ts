import { useQuery } from "@tanstack/react-query";
import { callApi } from "@/lib/apiClient";

type ClientEditorialPayload = {
  success: boolean;
  data: {
    profile: {
      client_name?: string;
      summary?: string;
      content_pillars?: string[];
      tone_of_voice?: string[];
      keywords?: string[];
      target_persona?: Record<string, any>;
    };
    editorial: {
      text?: string;
      post_frequency?: string;
      best_posting_times?: string[];
      content_mix?: Record<string, number>;
    };
    stats: {
      total_count: number;
      monthly_limit: number;
    };
  };
};

export function useClientEditorialData(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-editorial-data', clientId],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }

      const payload = { clientId };
      console.log('[useClientEditorialData] payload', payload);

      const response = await callApi<ClientEditorialPayload>(
        '/api/briefing/getClientProfile',
        {
          method: "POST",
          payload,
        }
      );

      console.log('[useClientEditorialData] response', response);

      if (!response?.success || !response.data) {
        throw new Error('Não foi possível carregar os dados do cliente.');
      }

      const { profile, editorial, stats } = response.data;

      return {
        profile: {
          profile_summary: profile.summary ?? undefined,
          content_pillars: profile.content_pillars ?? [],
          tone_of_voice: profile.tone_of_voice ?? [],
          keywords: profile.keywords ?? [],
          target_persona: profile.target_persona ?? undefined,
          editorial_line: editorial.text ?? undefined,
          post_frequency: editorial.post_frequency ?? undefined,
          best_posting_times: editorial.best_posting_times ?? [],
          content_mix: editorial.content_mix ?? {},
        },
        creativesCount: stats.total_count,
        monthlyLimit: stats.monthly_limit,
        clientName: profile.client_name,
      };
    },
    enabled: !!clientId,
  });
}
