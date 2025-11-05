import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendInternalNotification, notifyError } from '../_shared/internal-notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando auto-aprovação de conteúdos...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Usar service role para bypass RLS
    );

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // 1. Enviar lembretes para conteúdos com deadline hoje
    console.log(`Buscando conteúdos com deadline hoje (${today})...`);
    const { data: todayContents, error: todayError } = await supabaseClient
      .from('contents')
      .select('*, clients(*)')
      .eq('deadline', today)
      .neq('status', 'approved');

    if (todayError) {
      console.error('Erro ao buscar conteúdos de hoje:', todayError);
    } else if (todayContents && todayContents.length > 0) {
      console.log(`Encontrados ${todayContents.length} conteúdos com deadline hoje`);
      
      for (const content of todayContents) {
        // Enviar webhook de lembrete
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-webhook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              event: 'content.last_day_reminder',
              content_id: content.id,
              client_id: content.client_id,
            }),
          });
          console.log(`Lembrete enviado para conteúdo ${content.id}`);
        } catch (error) {
          console.error(`Erro ao enviar lembrete para ${content.id}:`, error);
        }
      }
    }

    // 2. Auto-aprovar conteúdos com deadline vencido
    console.log(`Buscando conteúdos com deadline vencido (< ${today})...`);
    const { data: expiredContents, error: expiredError } = await supabaseClient
      .from('contents')
      .select('*, clients(*)')
      .lt('deadline', today)
      .neq('status', 'approved');

    if (expiredError) {
      console.error('Erro ao buscar conteúdos vencidos:', expiredError);
      throw expiredError;
    }

    let approvedCount = 0;
    
    if (expiredContents && expiredContents.length > 0) {
      console.log(`Encontrados ${expiredContents.length} conteúdos para auto-aprovar`);

      for (const content of expiredContents) {
        try {
          // Atualizar status para aprovado
          const { error: updateError } = await supabaseClient
            .from('contents')
            .update({ status: 'approved' })
            .eq('id', content.id);

          if (updateError) {
            console.error(`Erro ao aprovar ${content.id}:`, updateError);
            continue;
          }

          // Registrar atividade
          await supabaseClient
            .from('activity_log')
            .insert({
              entity: 'content',
              entity_id: content.id,
              action: 'auto_approved',
              metadata: {
                deadline: content.deadline,
                previous_status: content.status,
              },
            });

          // Enviar webhook
          try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-webhook`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              },
              body: JSON.stringify({
                event: 'content.auto_approved',
                content_id: content.id,
                client_id: content.client_id,
              }),
            });
          } catch (webhookError) {
            console.error(`Erro ao enviar webhook para ${content.id}:`, webhookError);
          }

          approvedCount++;
          console.log(`Conteúdo ${content.id} auto-aprovado com sucesso`);
        } catch (error) {
          console.error(`Erro ao processar conteúdo ${content.id}:`, error);
        }
      }

      console.log(`Auto-aprovação concluída: ${approvedCount}/${expiredContents.length} conteúdos aprovados`);
      
      // Notificar sobre auto-aprovações
      if (approvedCount > 0) {
        await sendInternalNotification({
          type: 'info',
          subject: `${approvedCount} conteúdo(s) auto-aprovado(s)`,
          message: `Job automático aprovou ${approvedCount} de ${expiredContents.length} conteúdos com deadline vencido.`,
          details: {
            approved: approvedCount,
            total_expired: expiredContents.length,
            date: today
          },
          source: 'auto-approve-contents',
          priority: 'low'
        });
      }
    }

    // 3. Publicar conteúdos agendados pela data/hora (apenas conteúdos recentes - últimas 2 horas)
    console.log('Buscando conteúdos com data/hora vencida para publicar...');
    const now = new Date().toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 horas atrás
    
    const { data: scheduledContents, error: scheduledError } = await supabaseClient
      .from('contents')
      .select('*')
      .lte('date', now)
      .gte('date', twoHoursAgo) // Não publicar conteúdos com mais de 2 horas de atraso
      .is('published_at', null);

    if (scheduledError) {
      console.error('Erro ao buscar conteúdos agendados:', scheduledError);
    } else if (scheduledContents && scheduledContents.length > 0) {
      console.log(`Encontrados ${scheduledContents.length} conteúdos para publicar automaticamente`);
      
      for (const content of scheduledContents) {
        try {
          // Chamar função de publicação
          const publishResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/publish-to-social`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ contentId: content.id }),
          });

          const publishResult = await publishResponse.json();
          
          if (publishResult.success) {
            console.log(`Conteúdo ${content.id} publicado automaticamente na data agendada`);
          } else {
            console.error(`Erro ao publicar conteúdo ${content.id}:`, publishResult.error);
          }
        } catch (error) {
          console.error(`Erro ao publicar conteúdo ${content.id}:`, error);
        }
      }
    }

    // 4. Publicar conteúdos com auto_publish=true e data vencida (apenas conteúdos recentes - últimas 2 horas)
    console.log('Buscando conteúdos com auto_publish ativado...');
    
    const { data: autoPublishContents, error: autoPublishError } = await supabaseClient
      .from('contents')
      .select('*')
      .eq('auto_publish', true)
      .lte('date', now)
      .gte('date', twoHoursAgo) // Não publicar conteúdos com mais de 2 horas de atraso
      .is('published_at', null);

    if (autoPublishError) {
      console.error('Erro ao buscar conteúdos auto_publish:', autoPublishError);
    } else if (autoPublishContents && autoPublishContents.length > 0) {
      console.log(`Encontrados ${autoPublishContents.length} conteúdos agendados para publicar`);
      
      for (const content of autoPublishContents) {
        try {
          // Chamar função de publicação
          const publishResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/publish-to-social`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ contentId: content.id }),
          });

          const publishResult = await publishResponse.json();
          
          if (publishResult.success) {
            console.log(`Conteúdo ${content.id} publicado via agendamento (auto_publish)`);
          } else {
            console.error(`Erro ao publicar conteúdo ${content.id}:`, publishResult.error);
          }
        } catch (error) {
          console.error(`Erro ao publicar conteúdo ${content.id}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Auto-aprovação e publicação executadas com sucesso',
        reminders_sent: todayContents?.length || 0,
        approved: approvedCount,
        total_expired: expiredContents?.length || 0,
        auto_published: (scheduledContents?.length || 0) + (autoPublishContents?.length || 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Erro na auto-aprovação:', error);
    
    // Notificar erro crítico
    await notifyError(
      'auto-approve-contents',
      error,
      {
        timestamp: new Date().toISOString()
      }
    );
    
    return new Response(
      JSON.stringify({ error: 'Failed to process content automation' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
