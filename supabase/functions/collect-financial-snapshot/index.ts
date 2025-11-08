import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FINANCIAL-SNAPSHOT] ${step}${detailsStr}`);
};

// Preços mensais dos planos em centavos (de acordo com stripe-config.ts)
const PLAN_PRICES: Record<string, number> = {
  creator: 0,
  eugencia: 2970, // R$ 29,70
  socialmidia: 4950, // R$ 49,50
  fullservice: 9720, // R$ 97,20
  unlimited: 0
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Iniciando coleta de snapshot financeiro');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Buscar todos os profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('plan, subscription_status, created_at, updated_at');

    if (profilesError) {
      logStep('Erro ao buscar profiles', { error: profilesError });
      throw profilesError;
    }

    logStep('Profiles carregados', { count: profiles?.length || 0 });

    // 2. Contar clientes por plano e calcular MRR
    const planCounts: Record<string, number> = {
      creator: 0,
      eugencia: 0,
      socialmidia: 0,
      fullservice: 0,
      unlimited: 0
    };

    const planMRR: Record<string, number> = { ...planCounts };
    let totalActiveSubscriptions = 0;

    profiles?.forEach(profile => {
      const plan = profile.plan || 'creator';
      planCounts[plan] = (planCounts[plan] || 0) + 1;

      // Contar apenas assinaturas ativas
      if (['active', 'trialing'].includes(profile.subscription_status || '')) {
        totalActiveSubscriptions++;
        const monthlyPrice = PLAN_PRICES[plan] || 0;
        planMRR[plan] = (planMRR[plan] || 0) + monthlyPrice;
      }
    });

    const totalMRR = Object.values(planMRR).reduce((sum, mrr) => sum + mrr, 0);
    const payingClients = totalActiveSubscriptions - (planCounts.creator || 0);
    const averageTicket = payingClients > 0 ? totalMRR / payingClients : 0;

    logStep('MRR calculado', {
      totalMRR: totalMRR / 100,
      payingClients,
      averageTicket: averageTicket / 100
    });

    // 3. Calcular churn do mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const canceledThisMonth = profiles?.filter(p =>
      p.subscription_status === 'canceled' &&
      new Date(p.updated_at) >= startOfMonth
    ).length || 0;

    const totalAtStartOfMonth = totalActiveSubscriptions + canceledThisMonth;
    const churnRate = totalAtStartOfMonth > 0
      ? (canceledThisMonth / totalAtStartOfMonth) * 100
      : 0;

    logStep('Churn calculado', { canceledThisMonth, churnRate });

    // 4. Novos clientes do mês
    const newThisMonth = profiles?.filter(p =>
      new Date(p.created_at) >= startOfMonth
    ).length || 0;

    logStep('Novos clientes', { newThisMonth });

    // 5. Projeção para próximo mês (crescimento linear)
    const netGrowth = newThisMonth - canceledThisMonth;
    const growthRate = totalActiveSubscriptions > 0
      ? (netGrowth / totalActiveSubscriptions) * 100
      : 0;
    const projectedMRR = Math.round(totalMRR * (1 + growthRate / 100));
    const projectedNewClients = Math.max(0, Math.round(newThisMonth * 1.1)); // +10% conservador

    logStep('Projeção calculada', {
      growthRate,
      projectedMRR: projectedMRR / 100,
      projectedNewClients
    });

    // 6. Salvar snapshot
    const snapshot = {
      snapshot_date: new Date().toISOString().split('T')[0],
      creator_count: planCounts.creator || 0,
      eugencia_count: planCounts.eugencia || 0,
      socialmidia_count: planCounts.socialmidia || 0,
      fullservice_count: planCounts.fullservice || 0,
      unlimited_count: planCounts.unlimited || 0,
      creator_mrr: planMRR.creator || 0,
      eugencia_mrr: planMRR.eugencia || 0,
      socialmidia_mrr: planMRR.socialmidia || 0,
      fullservice_mrr: planMRR.fullservice || 0,
      unlimited_mrr: planMRR.unlimited || 0,
      total_active_subscriptions: totalActiveSubscriptions,
      total_mrr: totalMRR,
      average_ticket_brl: averageTicket / 100,
      cancellations_this_month: canceledThisMonth,
      churn_rate: churnRate,
      projected_mrr_next_month: projectedMRR,
      projected_new_clients: projectedNewClients
    };

    const { error: insertError } = await supabase
      .from('financial_snapshots')
      .upsert(snapshot, { onConflict: 'snapshot_date' });

    if (insertError) {
      logStep('Erro ao salvar snapshot', { error: insertError });
      throw insertError;
    }

    logStep('Snapshot salvo com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        snapshot: {
          date: snapshot.snapshot_date,
          totalMRR: totalMRR / 100,
          averageTicket: averageTicket / 100,
          churnRate,
          activeSubscriptions: totalActiveSubscriptions
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERRO', { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
