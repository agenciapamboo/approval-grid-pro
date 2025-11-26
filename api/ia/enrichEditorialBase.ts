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
    const { clientId, monthContext } = body;

    if (!clientId || !monthContext) {
      return res.status(400).json({ error: "clientId e monthContext são obrigatórios" });
    }

    const data = await invokeSupabaseFunction(
      "enrich-editorial-line",
      token,
      {
        clientId,
        monthContext,
        jwt: token,
      }
    );

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("enrichEditorialBase error", error);
    return res.status(500).json({ error: error.message });
  }
}

