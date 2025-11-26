import { supabase } from "@/integrations/supabase/client";

interface CallApiOptions<T> {
  method?: "GET" | "POST";
  payload?: Record<string, any>;
  fallback?: () => Promise<T>;
}

const defaultHeaders = {
  "Content-Type": "application/json",
};

export async function callApi<T = any>(
  path: string,
  { method = "POST", payload, fallback }: CallApiOptions<T> = {}
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const body = method === "GET" ? undefined : JSON.stringify(payload ?? {});

  console.log(`[API] Request → ${path}`, payload ?? {});

  try {
    const response = await fetch(path, {
      method,
      headers: {
        ...defaultHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    });

    const data = await response.json();
    console.log(`[API] Response ← ${path}`, data);

    if (!response.ok || data?.error) {
      throw new Error(data?.error || data?.message || "Erro ao chamar API");
    }

    return data as T;
  } catch (error) {
    console.error(`[API] Error on ${path}`, error);
    if (fallback) {
      return fallback();
    }
    throw error;
  }
}

