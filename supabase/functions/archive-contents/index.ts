import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { clientId } = await req.json();
    if (!clientId) {
      throw new Error("Client ID is required");
    }

    // Verificar permissões do usuário
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("agency_id, client_id")
      .eq("id", user.id)
      .single();

    const { data: client } = await supabaseClient
      .from("clients")
      .select("agency_id")
      .eq("id", clientId)
      .single();

    if (!profile || !client) {
      throw new Error("Client not found");
    }

    // Verificar se usuário tem permissão
    const hasPermission = profile.agency_id === client.agency_id || profile.client_id === clientId;
    if (!hasPermission) {
      throw new Error("Insufficient permissions");
    }

    // Obter limites do plano
    const { data: agency } = await supabaseClient
      .from("agencies")
      .select("plan")
      .eq("id", client.agency_id)
      .single();

    if (!agency) {
      throw new Error("Agency not found");
    }

    const { data: entitlements } = await supabaseClient
      .from("plan_entitlements")
      .select("creatives_limit, history_days")
      .eq("plan", agency.plan)
      .single();

    if (!entitlements || entitlements.creatives_limit === null) {
      return new Response(
        JSON.stringify({ archived_count: 0, message: "No creative limits for this plan" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Contar criativos não arquivados
    const { count: currentCount } = await supabaseClient
      .from("contents")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .is("archived_at", null);

    const creativesLimit = entitlements.creatives_limit;
    const historyDays = entitlements.history_days;
    let archivedCount = 0;

    // Determinar quantos criativos precisam ser arquivados
    let contentsToArchive = [];

    if ((currentCount || 0) <= creativesLimit) {
      // Se está dentro do limite, arquivar apenas por data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - historyDays);

      const { data: oldContents } = await supabaseClient
        .from("contents")
        .select("id, client_id, title, type, date, status, category, channels")
        .eq("client_id", clientId)
        .is("archived_at", null)
        .lt("date", cutoffDate.toISOString())
        .order("date", { ascending: true });

      contentsToArchive = oldContents || [];
    } else {
      // Se excedeu o limite, arquivar os mais antigos
      const excessCount = (currentCount || 0) - creativesLimit;
      const { data: oldContents } = await supabaseClient
        .from("contents")
        .select("id, client_id, title, type, date, status, category, channels")
        .eq("client_id", clientId)
        .is("archived_at", null)
        .order("date", { ascending: true })
        .limit(excessCount);

      contentsToArchive = oldContents || [];
    }

    // Arquivar cada conteúdo
    for (const content of contentsToArchive) {
      // Buscar thumbnail
      const { data: media } = await supabaseClient
        .from("content_media")
        .select("thumb_url")
        .eq("content_id", content.id)
        .order("order_index", { ascending: true })
        .limit(1)
        .single();

      // Buscar histórico de comentários
      const { data: comments } = await supabaseClient
        .from("comments")
        .select("created_at, author_user_id, body, is_adjustment_request")
        .eq("content_id", content.id);

      const history = (comments || []).map((c) => ({
        date: c.created_at,
        author: c.author_user_id,
        body: c.body,
        is_adjustment: c.is_adjustment_request,
      }));

      // Inserir no log
      await supabaseClient.from("content_history_logs").insert({
        content_id: content.id,
        client_id: content.client_id,
        title: content.title,
        type: content.type,
        date: content.date,
        status: content.status,
        category: content.category,
        channels: content.channels,
        thumb_url: media?.thumb_url || null,
        history: history,
        archived_at: new Date().toISOString(),
      });

      // Marcar como arquivado
      await supabaseClient
        .from("contents")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", content.id);

      archivedCount++;
    }

    return new Response(
      JSON.stringify({
        archived_count: archivedCount,
        message: archivedCount > 0 ? "Contents archived successfully" : "No contents to archive",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error archiving contents:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
