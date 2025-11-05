import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { notifyReport } from '../_shared/internal-notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📊 Gerando relatório diário...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Estatísticas de conteúdo
    const { data: todayContents, error: contentsError } = await supabaseClient
      .from('contents')
      .select('status, type')
      .gte('created_at', yesterday)
      .lt('created_at', today);

    if (contentsError) {
      throw contentsError;
    }

    // Estatísticas de publicações
    const { data: publishedContents, error: publishedError } = await supabaseClient
      .from('contents')
      .select('id')
      .not('published_at', 'is', null)
      .gte('published_at', yesterday)
      .lt('published_at', today);

    if (publishedError) {
      throw publishedError;
    }

    // Estatísticas de usuários
    const { count: totalUsers, error: usersError } = await supabaseClient
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (usersError) {
      throw usersError;
    }

    // Estatísticas de notificações
    const { data: notifications, error: notificationsError } = await supabaseClient
      .from('notifications')
      .select('status, event')
      .gte('created_at', yesterday)
      .lt('created_at', today);

    if (notificationsError) {
      throw notificationsError;
    }

    // Logs de atividade
    const { data: activityLogs, error: activityError } = await supabaseClient
      .from('activity_log')
      .select('action, entity')
      .gte('created_at', yesterday)
      .lt('created_at', today);

    if (activityError) {
      throw activityError;
    }

    // Contar por status
    const contentsByStatus = todayContents?.reduce((acc: Record<string, number>, content) => {
      acc[content.status] = (acc[content.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Contar notificações por status
    const notificationsByStatus = notifications?.reduce((acc: Record<string, number>, notif) => {
      acc[notif.status] = (acc[notif.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Preparar relatório
    const report = {
      date: yesterday,
      contents: {
        total_created: todayContents?.length || 0,
        by_status: contentsByStatus,
        published: publishedContents?.length || 0,
      },
      users: {
        total: totalUsers || 0,
      },
      notifications: {
        total: notifications?.length || 0,
        by_status: notificationsByStatus,
      },
      activity: {
        total_actions: activityLogs?.length || 0,
      },
    };

    console.log('📋 Relatório gerado:', report);

    // Enviar relatório via email interno
    await notifyReport(
      'Relatório Diário do Sistema',
      `Resumo das atividades do dia ${yesterday}`,
      report
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        report 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('❌ Erro ao gerar relatório diário:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
