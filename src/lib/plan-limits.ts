import { supabase } from "@/integrations/supabase/client";

interface PlanLimits {
  postsLimit: number | null;
  creativesLimit: number | null;
  historyDays: number;
  teamMembersLimit: number | null;
}

interface LimitCheckResult {
  withinLimit: boolean;
  currentCount: number;
  limit: number | null;
  message?: string;
}

/**
 * Obter os limites do plano para um cliente
 */
export async function getClientPlanLimits(clientId: string): Promise<PlanLimits | null> {
  try {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("agency_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("Error fetching client:", clientError);
      return null;
    }

    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("plan")
      .eq("id", client.agency_id)
      .single();

    if (agencyError || !agency) {
      console.error("Error fetching agency:", agencyError);
      return null;
    }

    const { data: entitlements, error: entitlementsError } = await supabase
      .from("plan_entitlements")
      .select("*")
      .eq("plan", agency.plan)
      .single();

    if (entitlementsError || !entitlements) {
      console.error("Error fetching plan entitlements:", entitlementsError);
      return null;
    }

    return {
      postsLimit: entitlements.posts_limit,
      creativesLimit: entitlements.creatives_limit,
      historyDays: entitlements.history_days,
      teamMembersLimit: entitlements.team_members_limit,
    };
  } catch (error) {
    console.error("Error getting plan limits:", error);
    return null;
  }
}

/**
 * Verificar limite de posts mensais
 * Posts por mês = quantidade de conteúdo cadastrado no mês
 * Conteúdos excluídos no mês deduzem um criativo do mês
 */
export async function checkMonthlyPostsLimit(clientId: string): Promise<LimitCheckResult> {
  try {
    const limits = await getClientPlanLimits(clientId);
    if (!limits || limits.postsLimit === null) {
      return {
        withinLimit: true,
        currentCount: 0,
        limit: null,
        message: "Sem limite de posts mensais",
      };
    }

    // Calcular primeiro e último dia do mês atual
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Contar posts criados no mês atual
    const { count: createdCount, error: createdError } = await supabase
      .from("contents")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("created_at", firstDay.toISOString())
      .lte("created_at", lastDay.toISOString());

    if (createdError) {
      console.error("Error counting created posts:", createdError);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: limits.postsLimit,
        message: "Erro ao verificar limite",
      };
    }

    const currentCount = createdCount || 0;
    const withinLimit = currentCount < limits.postsLimit;

    return {
      withinLimit,
      currentCount,
      limit: limits.postsLimit,
      message: withinLimit
        ? `${currentCount}/${limits.postsLimit} posts usados este mês`
        : `Limite de ${limits.postsLimit} posts mensais atingido`,
    };
  } catch (error) {
    console.error("Error checking monthly posts limit:", error);
    return {
      withinLimit: false,
      currentCount: 0,
      limit: null,
      message: "Erro ao verificar limite",
    };
  }
}

/**
 * Verificar limite de criativos arquivados
 * Creatives = quantidade de conteúdo arquivado integralmente (full-size media)
 * Não conta conteúdos já arquivados (archived_at não é null)
 */
export async function checkCreativesStorageLimit(
  clientId: string
): Promise<LimitCheckResult & { oldestContentTitle?: string }> {
  try {
    const limits = await getClientPlanLimits(clientId);
    if (!limits || limits.creativesLimit === null) {
      return {
        withinLimit: true,
        currentCount: 0,
        limit: null,
        message: "Sem limite de criativos arquivados",
      };
    }

    // Contar criativos não arquivados
    const { count, error: countError } = await supabase
      .from("contents")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .is("archived_at", null);

    if (countError) {
      console.error("Error counting creatives:", countError);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: limits.creativesLimit,
        message: "Erro ao verificar limite",
      };
    }

    const currentCount = count || 0;
    const withinLimit = currentCount < limits.creativesLimit;

    // Se excedeu o limite, buscar o título do criativo mais antigo
    let oldestContentTitle: string | undefined;
    if (!withinLimit) {
      const { data: oldestContent } = await supabase
        .from("contents")
        .select("title")
        .eq("client_id", clientId)
        .is("archived_at", null)
        .order("date", { ascending: true })
        .limit(1)
        .single();

      oldestContentTitle = oldestContent?.title;
    }

    return {
      withinLimit,
      currentCount,
      limit: limits.creativesLimit,
      oldestContentTitle,
      message: withinLimit
        ? `${currentCount}/${limits.creativesLimit} criativos arquivados`
        : `Limite de ${limits.creativesLimit} criativos atingido`,
    };
  } catch (error) {
    console.error("Error checking creatives storage limit:", error);
    return {
      withinLimit: false,
      currentCount: 0,
      limit: null,
      message: "Erro ao verificar limite",
    };
  }
}
