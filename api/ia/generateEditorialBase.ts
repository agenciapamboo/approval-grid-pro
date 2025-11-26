import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getTokenFromHeader,
  invokeSupabaseFunction,
} from "../../_shared/supabase";

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

    const data = await invokeSupabaseFunction(
      "generate-editorial-base",
      token,
      {
        clientId,
        jwt: token,
      }
    );

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("generateEditorialBase error", error);
    return res.status(500).json({ error: error.message });
  }
}

