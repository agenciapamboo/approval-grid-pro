import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📤 [SEND-PLATFORM-NOTIFICATIONS] Iniciando processamento");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Buscar URL do webhook do sistema
    const { data: webhookSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'platform_notifications_webhook_url')
      .single();

    const WEBHOOK_URL = webhookSetting?.value || 
      'https://n8n.pamboocriativos.com.br/webhook-test/d4fa3353-7ea1-420e-8bb2-notifica-clientes';

    console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);

    // Buscar notificações pendentes
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('platform_notifications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("❌ Erro ao buscar notificações:", fetchError);
      throw fetchError;
    }

    console.log(`📬 Encontradas ${pendingNotifications?.length || 0} notificações pendentes`);

    const results = [];

    for (const notif of pendingNotifications || []) {
      try {
        console.log(`📨 Processando notificação ${notif.id} - ${notif.notification_type}`);

        // Buscar detalhes do destinatário
        let recipientEmail = null;
        let recipientWhatsApp = null;
        let recipientName = null;

        if (notif.target_type === 'agency' && notif.target_id) {
          const { data: agency } = await supabase
            .from('agencies_secure')
            .select('name, email, whatsapp')
            .eq('id', notif.target_id)
            .single();
          
          recipientEmail = agency?.email;
          recipientWhatsApp = agency?.whatsapp;
          recipientName = agency?.name;
        } else if (notif.target_type === 'creator' && notif.target_id) {
          const { data: user } = await supabase
            .from('auth.users')
            .select('email')
            .eq('id', notif.target_id)
            .single();

          const { data: profile } = await supabase
            .from('profiles')
            .select('name, whatsapp')
            .eq('id', notif.target_id)
            .single();
          
          recipientEmail = user?.email;
          recipientWhatsApp = profile?.whatsapp;
          recipientName = profile?.name;
        } else if ((notif.target_type === 'team_member' || notif.target_type === 'client_user') && notif.target_id) {
          // Buscar usuários por role específica
          const { data: users } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', notif.target_type);

          // Para target_type com role específica, buscar todos os usuários dessa role
          if (users && users.length > 0) {
            // Pegar o primeiro usuário (ou você pode iterar por todos)
            const userId = users[0].user_id;
            
            const { data: user } = await supabase.auth.admin.getUserById(userId);
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, whatsapp')
              .eq('id', userId)
              .single();
            
            recipientEmail = user?.user?.email;
            recipientWhatsApp = profile?.whatsapp;
            recipientName = profile?.name;
          }
        }

        // Construir parâmetros para N8N
        const params = new URLSearchParams({
          notification_id: notif.id,
          target_type: notif.target_type,
          target_id: notif.target_id || 'all',
          notification_type: notif.notification_type,
          title: notif.title,
          message: notif.message,
          priority: notif.priority,
          email: recipientEmail || '',
          whatsapp: recipientWhatsApp || '',
          name: recipientName || '',
          send_email: String(notif.send_email),
          send_whatsapp: String(notif.send_whatsapp),
          action_url: notif.action_url || '',
          payload: JSON.stringify(notif.payload || {})
        });

        console.log(`🚀 Enviando para webhook: ${WEBHOOK_URL}?${params.toString().substring(0, 100)}...`);

        const response = await fetch(`${WEBHOOK_URL}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          await supabase
            .from('platform_notifications')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', notif.id);

          results.push({ id: notif.id, status: 'sent', type: notif.notification_type });
          console.log(`✅ Notificação ${notif.id} enviada com sucesso`);
        } else {
          const errorText = await response.text();
          console.error(`❌ Falha ao enviar notificação ${notif.id}: HTTP ${response.status} - ${errorText}`);

          await supabase
            .from('platform_notifications')
            .update({
              status: 'failed',
              error_message: `HTTP ${response.status}: ${errorText}`
            })
            .eq('id', notif.id);

          results.push({ id: notif.id, status: 'failed', error: `HTTP ${response.status}` });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erro ao processar notificação ${notif.id}:`, errorMessage);

        await supabase
          .from('platform_notifications')
          .update({
            status: 'failed',
            error_message: errorMessage
          })
          .eq('id', notif.id);

        results.push({ id: notif.id, status: 'failed', error: errorMessage });
      }
    }

    const summary = {
      processed: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    };

    console.log("🎯 [SEND-PLATFORM-NOTIFICATIONS] Concluído:", summary);

    return new Response(
      JSON.stringify({ success: true, summary }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [SEND-PLATFORM-NOTIFICATIONS] Erro fatal:", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
