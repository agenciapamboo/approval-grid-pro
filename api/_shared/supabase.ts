import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY;

export function ensureSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }
}

export function getTokenFromHeader(header?: string) {
  if (!header) return undefined;
  return header.replace("Bearer", "").trim();
}

export async function invokeSupabaseFunction<T>(
  functionName: string,
  token: string | undefined,
  payload: Record<string, any>
): Promise<T> {
  ensureSupabaseEnv();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data?.error) {
    throw new Error(data?.error || data?.message || "Erro no Supabase Function");
  }

  return data as T;
}

export function createAuthorizedClient(token?: string) {
  ensureSupabaseEnv();
  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    token
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      : undefined
  );
}

export function createServiceClient() {
  ensureSupabaseEnv();
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

