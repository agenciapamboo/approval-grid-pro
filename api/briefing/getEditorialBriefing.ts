import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createAuthorizedClient,
  getTokenFromHeader,
} from "../_shared/supabase";

const TEMPLATE_TYPES = ["client_profile", "editorial_line"] as const;
type BriefingType = (typeof TEMPLATE_TYPES)[number];

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
    const { clientId, type } = body as {
      clientId?: string;
      type?: BriefingType;
    };

    if (!clientId) {
      return res.status(400).json({ error: "clientId é obrigatório" });
    }

    const briefingType: BriefingType =
      TEMPLATE_TYPES.includes(type as BriefingType)
        ? (type as BriefingType)
        : "client_profile";

    console.log("[getEditorialBriefing] payload", {
      clientId,
      type: briefingType,
    });

    const supabase = createAuthorizedClient(token);

    const { data: profile, error: profileError } = await supabase
      .from("client_ai_profiles")
      .select("*, briefing_templates(*)")
      .eq("client_id", clientId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const template = await resolveTemplate(
      supabase,
      profile?.briefing_templates,
      briefingType
    );

    const responsePayload = {
      profile,
      template,
      showForm: !profile,
    };

    console.log("[getEditorialBriefing] response", {
      profilePresent: !!profile,
      templateId: template?.id,
      showForm: responsePayload.showForm,
    });

    return res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error("[getEditorialBriefing] error", error);
    return res.status(500).json({ error: error.message });
  }
}

async function resolveTemplate(
  supabase: ReturnType<typeof createAuthorizedClient>,
  profileTemplate: any,
  briefingType: BriefingType
) {
  if (
    profileTemplate &&
    profileTemplate.template_type === briefingType
  ) {
    return profileTemplate;
  }

  const { data: template, error } = await supabase
    .from("briefing_templates")
    .select("*")
    .eq("template_type", briefingType)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (template) {
    return template;
  }

  const { data: fallbackTemplate, error: fallbackError } = await supabase
    .from("briefing_templates")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError) {
    throw fallbackError;
  }

  return fallbackTemplate;
}

