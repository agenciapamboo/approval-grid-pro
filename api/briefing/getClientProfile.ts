import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getTokenFromHeader,
  invokeSupabaseFunction,
} from "../_shared/supabase";

interface CombinedEditorialData {
  success: boolean;
  data: {
    profile: {
      client_name?: string | null;
      summary?: string | null;
      target_persona?: Record<string, any> | null;
      content_pillars?: string[];
      tone_of_voice?: string[];
      keywords?: string[];
    };
    editorial: {
      text?: string | null;
      post_frequency?: string | null;
      best_posting_times?: string[];
      content_mix?: Record<string, number>;
    };
    stats: {
      total_count: number;
      monthly_limit: number;
    };
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = getTokenFromHeader(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { clientId } = body;

    if (!clientId) {
      return res.status(400).json({ error: "clientId é obrigatório" });
    }

    console.log("[getClientProfile] payload", body);

    const combined = await invokeSupabaseFunction<CombinedEditorialData>(
      "combine-editorial-data",
      token,
      { clientId, jwt: token }
    );

    if (!combined?.success) {
      throw new Error("Função combine-editorial-data retornou sem sucesso");
    }

    const responsePayload = {
      success: true,
      data: {
        profile: {
          client_name: combined.data.profile?.client_name ?? null,
          summary: combined.data.profile?.summary ?? null,
          content_pillars: combined.data.profile?.content_pillars ?? [],
          tone_of_voice: combined.data.profile?.tone_of_voice ?? [],
          keywords: combined.data.profile?.keywords ?? [],
          target_persona: combined.data.profile?.target_persona ?? null,
        },
        editorial: {
          text: combined.data.editorial?.text ?? null,
          post_frequency: combined.data.editorial?.post_frequency ?? null,
          best_posting_times: combined.data.editorial?.best_posting_times ?? [],
          content_mix: combined.data.editorial?.content_mix ?? {},
        },
        stats: {
          total_count: combined.data.stats?.total_count ?? 0,
          monthly_limit: combined.data.stats?.monthly_limit ?? 0,
        },
      },
    };

    console.log("[getClientProfile] response", responsePayload);

    return res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error("[getClientProfile] error", error);
    return res.status(500).json({ error: error.message });
  }
}

