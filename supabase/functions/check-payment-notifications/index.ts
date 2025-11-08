import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationToCreate {
  targetType: 'agency' | 'creator';
  targetId: string;
  notificationType: string;
  title: string;
  message: string;
  actionUrl?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  sendEmail: boolean;
  sendWhatsApp: boolean;
  sendInApp: boolean;
  deduplicationKey: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 [PAYMENT-NOTIFICATIONS] Job iniciado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in1Day = new Date(today);
    in1Day.setDate(in1Day.getDate() + 1);

    const notifications: NotificationToCreate[] = [];

    // ==========================================
    // 1. AVISO DE VENCIMENTO EM 7 DIAS
    // ==========================================
    const { data: dueIn7Days } = await supabase
      .from('profiles')
      .select('id, name, plan, plan_renewal_date, account_type')
      .not('plan_renewal_date', 'is', null)
      .gte('plan_renewal_date', in7Days.toISOString().split('T')[0])
      .lt('plan_renewal_date', new Date(in7Days.getTime() + 86400000).toISOString().split('T')[0])
      .in('subscription_status', ['active', 'trialing'])
      .neq('plan', 'creator')
      .eq('skip_subscription_check', false);

    console.log(`📅 Encontrados ${dueIn7Days?.length || 0} usuários com vencimento em 7 dias`);

    for (const user of dueIn7Days || []) {
      const deduplicationKey = `payment_due_7_days_${user.id}_${user.plan_renewal_date}`;
      
      const { data: existing } = await supabase
        .from('platform_notifications')
        .select('id')
        .eq('deduplication_key', deduplicationKey)
        .eq('status', 'sent')
        .single();

      if (!existing) {
        notifications.push({
          targetType: user.account_type === 'agency' ? 'agency' : 'creator',
          targetId: user.id,
          notificationType: 'payment_due_7_days',
          title: '📅 Renovação em 7 dias',
          message: `Olá ${user.name}! Seu plano ${user.plan} será renovado em ${new Date(user.plan_renewal_date).toLocaleDateString('pt-BR')}. Certifique-se de que há saldo disponível no método de pagamento.`,
          actionUrl: '/my-subscription',
          priority: 'normal',
          sendEmail: true,
          sendWhatsApp: false,
          sendInApp: true,
          deduplicationKey
        });
      }
    }

    // ==========================================
    // 2. LEMBRETE DE VENCIMENTO (AMANHÃ)
    // ==========================================
    const { data: dueIn1Day } = await supabase
      .from('profiles')
      .select('id, name, plan, plan_renewal_date, account_type')
      .not('plan_renewal_date', 'is', null)
      .gte('plan_renewal_date', in1Day.toISOString().split('T')[0])
      .lt('plan_renewal_date', new Date(in1Day.getTime() + 86400000).toISOString().split('T')[0])
      .in('subscription_status', ['active', 'trialing'])
      .neq('plan', 'creator')
      .eq('skip_subscription_check', false);

    console.log(`⏰ Encontrados ${dueIn1Day?.length || 0} usuários com vencimento em 1 dia`);

    for (const user of dueIn1Day || []) {
      const deduplicationKey = `payment_due_1_day_${user.id}_${user.plan_renewal_date}`;
      
      const { data: existing } = await supabase
        .from('platform_notifications')
        .select('id')
        .eq('deduplication_key', deduplicationKey)
        .eq('status', 'sent')
        .single();

      if (!existing) {
        notifications.push({
          targetType: user.account_type === 'agency' ? 'agency' : 'creator',
          targetId: user.id,
          notificationType: 'payment_due_1_day',
          title: '⏰ Renovação amanhã!',
          message: `Atenção ${user.name}! Seu plano ${user.plan} será renovado AMANHÃ (${new Date(user.plan_renewal_date).toLocaleDateString('pt-BR')}). Verifique seu método de pagamento agora.`,
          actionUrl: '/my-subscription',
          priority: 'high',
          sendEmail: true,
          sendWhatsApp: true,
          sendInApp: true,
          deduplicationKey
        });
      }
    }

    // ==========================================
    // 3. VENCIMENTO HOJE
    // ==========================================
    const { data: dueToday } = await supabase
      .from('profiles')
      .select('id, name, plan, plan_renewal_date, account_type')
      .eq('plan_renewal_date', today.toISOString().split('T')[0])
      .in('subscription_status', ['active', 'trialing'])
      .neq('plan', 'creator')
      .eq('skip_subscription_check', false);

    console.log(`🔔 Encontrados ${dueToday?.length || 0} usuários com vencimento HOJE`);

    for (const user of dueToday || []) {
      const deduplicationKey = `payment_due_today_${user.id}_${user.plan_renewal_date}`;
      
      const { data: existing } = await supabase
        .from('platform_notifications')
        .select('id')
        .eq('deduplication_key', deduplicationKey)
        .eq('status', 'sent')
        .single();

      if (!existing) {
        notifications.push({
          targetType: user.account_type === 'agency' ? 'agency' : 'creator',
          targetId: user.id,
          notificationType: 'payment_due_today',
          title: '🔔 Renovação HOJE',
          message: `${user.name}, seu plano ${user.plan} vence HOJE (${new Date(user.plan_renewal_date).toLocaleDateString('pt-BR')}). A cobrança será processada em breve.`,
          actionUrl: '/my-subscription',
          priority: 'high',
          sendEmail: true,
          sendWhatsApp: true,
          sendInApp: true,
          deduplicationKey
        });
      }
    }

    // ==========================================
    // 4. AVISO DE BLOQUEIO (PERÍODO DE GRAÇA)
    // ==========================================
    const { data: inGracePeriod } = await supabase
      .from('profiles')
      .select('id, name, plan, grace_period_end, account_type')
      .eq('delinquent', true)
      .not('grace_period_end', 'is', null)
      .gt('grace_period_end', now.toISOString())
      .neq('plan', 'creator')
      .eq('skip_subscription_check', false);

    console.log(`⚠️ Encontrados ${inGracePeriod?.length || 0} usuários em período de graça`);

    for (const user of inGracePeriod || []) {
      const daysLeft = Math.ceil(
        (new Date(user.grace_period_end).getTime() - now.getTime()) / 86400000
      );

      const deduplicationKey = `account_suspension_warning_${user.id}_${user.grace_period_end}`;
      
      const { data: existing } = await supabase
        .from('platform_notifications')
        .select('id')
        .eq('deduplication_key', deduplicationKey)
        .eq('status', 'sent')
        .single();

      if (!existing) {
        notifications.push({
          targetType: user.account_type === 'agency' ? 'agency' : 'creator',
          targetId: user.id,
          notificationType: 'account_suspension_warning',
          title: '⚠️ URGENTE: Conta será bloqueada',
          message: `${user.name}, houve um problema com o pagamento do seu plano ${user.plan}. Você tem ${daysLeft} dia(s) para regularizar antes do bloqueio. Acesse sua assinatura e atualize o método de pagamento.`,
          actionUrl: '/my-subscription',
          priority: 'critical',
          sendEmail: true,
          sendWhatsApp: true,
          sendInApp: true,
          deduplicationKey
        });
      }
    }

    // ==========================================
    // INSERIR TODAS AS NOTIFICAÇÕES
    // ==========================================
    if (notifications.length > 0) {
      console.log(`✅ Criando ${notifications.length} notificações`);

      const { data: inserted, error: insertError } = await supabase
        .from('platform_notifications')
        .insert(
          notifications.map(n => ({
            target_type: n.targetType,
            target_id: n.targetId,
            notification_type: n.notificationType,
            title: n.title,
            message: n.message,
            action_url: n.actionUrl,
            priority: n.priority,
            send_email: n.sendEmail,
            send_whatsapp: n.sendWhatsApp,
            send_in_app: n.sendInApp,
            status: 'pending',
            deduplication_key: n.deduplicationKey
          }))
        )
        .select();

      if (insertError) {
        console.error("❌ Erro ao inserir notificações:", insertError);
        throw insertError;
      }

      console.log(`✅ ${inserted?.length || 0} notificações criadas com sucesso`);
    } else {
      console.log("ℹ️ Nenhuma notificação a ser criada");
    }

    const summary = {
      dueIn7Days: dueIn7Days?.length || 0,
      dueIn1Day: dueIn1Day?.length || 0,
      dueToday: dueToday?.length || 0,
      inGracePeriod: inGracePeriod?.length || 0,
      notificationsCreated: notifications.length,
      timestamp: now.toISOString()
    };

    console.log("🎯 [PAYMENT-NOTIFICATIONS] Job concluído:", summary);

    return new Response(
      JSON.stringify({ success: true, summary }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [PAYMENT-NOTIFICATIONS] Erro:", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
