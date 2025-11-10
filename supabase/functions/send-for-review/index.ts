import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCORS, errorResponse, successResponse } from "../_shared/cors.ts";
import { notifyReport } from "../_shared/internal-notifications.ts";

const TIMEOUT_MS = 15000;

interface SendForReviewRequest {
  content_id: string;
}

serve(async (req) => {
  const corsCheck = handleCORS(req);
  if (corsCheck) return corsCheck;

  try {
    // Verificar Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Auth] Missing Authorization header');
      return errorResponse('Autenticação necessária', 401);
    }

    // Timeout Promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_MS)
    );

    // Criar cliente Supabase com auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader }
        } 
      }
    );

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validar usuário autenticado
    const jwt = authHeader.replace('Bearer ', '').trim();
    const userResult = await Promise.race([
      adminSupabase.auth.getUser(jwt),
      timeoutPromise
    ]) as { data: { user: any }, error: any };

    if (userResult?.error || !userResult?.data?.user) {
      console.error('[Auth] User validation failed');
      return errorResponse('Não autorizado', 401);
    }

    const user = userResult.data.user;
    console.log('[Auth] Authenticated:', user.id);

    // Parse do body
    const body = await req.json().catch(() => null) as SendForReviewRequest | null;
    
    if (!body?.content_id) {
      return errorResponse('content_id é obrigatório', 400);
    }

    const { content_id } = body;

    // Buscar conteúdo e validar permissões
    const { data: content, error: contentError } = await adminSupabase
      .from('contents')
      .select(`
        id,
        title,
        status,
        client_id,
        owner_user_id,
        clients (
          id,
          name,
          agency_id,
          webhook_url,
          email,
          whatsapp,
          notify_email,
          notify_whatsapp,
          notify_webhook,
          agencies (
            id,
            name,
            webhook_url
          )
        )
      `)
      .eq('id', content_id)
      .maybeSingle();

    if (contentError || !content || !content.clients) {
      console.error('[DB] Content not found or error:', contentError);
      return errorResponse('Conteúdo não encontrado', 404);
    }

    // Cast para o tipo correto (clients vem como objeto, não array)
    const client = Array.isArray(content.clients) ? content.clients[0] : content.clients;
    const agency = client?.agencies ? (Array.isArray(client.agencies) ? client.agencies[0] : client.agencies) : null;

    // Validar status atual
    if (content.status !== 'draft') {
      return errorResponse(`Apenas conteúdos em draft podem ser enviados para aprovação. Status atual: ${content.status}`, 400);
    }

    // Verificar se usuário tem permissão (agency_admin ou owner)
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('id, agency_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return errorResponse('Perfil não encontrado', 403);
    }

    const isOwner = content.owner_user_id === user.id;
    const isAgencyAdmin = profile.agency_id === client?.agency_id && profile.role === 'agency_admin';

    if (!isOwner && !isAgencyAdmin) {
      return errorResponse('Sem permissão para enviar este conteúdo para aprovação', 403);
    }

    // Atualizar status para in_review
    const { error: updateError } = await adminSupabase
      .from('contents')
      .update({ 
        status: 'in_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', content_id);

    if (updateError) {
      console.error('[DB] Update error:', updateError);
      return errorResponse('Falha ao atualizar status', 500);
    }

    // Preparar dados da notificação
    const notificationPayload = {
      content_id: content.id,
      content_title: content.title,
      client_name: client?.name || 'N/A',
      agency_name: agency?.name || 'N/A',
      previous_status: 'draft',
      new_status: 'in_review',
      sent_by_user_id: user.id,
      timestamp: new Date().toISOString(),
    };

    // Criar notificações (email, whatsapp, webhook conforme configurações)
    const notificationPromises = [];

    // Email (se habilitado)
    if (client?.notify_email && client.email) {
      notificationPromises.push(
        adminSupabase.from('notifications').insert({
          event: 'conteudo_em_revisao',
          content_id: content.id,
          client_id: content.client_id,
          agency_id: client.agency_id,
          channel: 'email',
          status: 'pending',
          payload: notificationPayload,
        })
      );
    }

    // WhatsApp (se habilitado)
    if (client?.notify_whatsapp && client.whatsapp) {
      notificationPromises.push(
        adminSupabase.from('notifications').insert({
          event: 'conteudo_em_revisao',
          content_id: content.id,
          client_id: content.client_id,
          agency_id: client.agency_id,
          channel: 'whatsapp',
          status: 'pending',
          payload: notificationPayload,
        })
      );
    }

    // Webhook (se habilitado) - Cliente
    if (client?.notify_webhook && client.webhook_url) {
      notificationPromises.push(
        adminSupabase.from('notifications').insert({
          event: 'conteudo_em_revisao',
          content_id: content.id,
          client_id: content.client_id,
          agency_id: client.agency_id,
          channel: 'webhook',
          status: 'pending',
          payload: {
            ...notificationPayload,
            webhook_url: client.webhook_url,
          },
        })
      );
    }

    // Webhook - Agência (se configurado)
    if (agency?.webhook_url) {
      notificationPromises.push(
        adminSupabase.from('notifications').insert({
          event: 'conteudo_em_revisao',
          content_id: content.id,
          client_id: content.client_id,
          agency_id: client?.agency_id,
          channel: 'webhook',
          status: 'pending',
          payload: {
            ...notificationPayload,
            webhook_url: agency.webhook_url,
          },
        })
      );
    }

    // Executar todas as inserções de notificação
    await Promise.all(notificationPromises);

    // Log de auditoria
    await adminSupabase.from('activity_log').insert({
      entity: 'content',
      action: 'sent_for_review',
      entity_id: content_id,
      actor_user_id: user.id,
      metadata: {
        content_title: content.title,
        client_id: content.client_id,
        client_name: client?.name || 'N/A',
        agency_id: client?.agency_id,
        agency_name: agency?.name || 'N/A',
        previous_status: 'draft',
        new_status: 'in_review',
      }
    });

    // Notificação interna (N8N) para acompanhamento
    await notifyReport(
      'Conteúdo enviado para revisão',
      `Cliente: ${client?.name || 'N/A'} | Conteúdo: ${content.title}`,
      {
        content_id: content.id,
        content_title: content.title,
        client_name: client?.name || 'N/A',
        agency_name: agency?.name || 'N/A',
        sent_by: user.id,
      },
      adminSupabase
    );

    console.log('[Success] Content sent for review:', { 
      content_id, 
      title: content.title,
      client: client?.name || 'N/A' 
    });

    return successResponse({
      content_id: content.id,
      new_status: 'in_review',
      notifications_sent: notificationPromises.length,
    });

  } catch (error: any) {
    console.error('[Error]', error.message);
    
    if (error.message === 'Request timeout') {
      return errorResponse('Timeout', 504);
    }
    
    return errorResponse('Erro interno', 500);
  }
});
