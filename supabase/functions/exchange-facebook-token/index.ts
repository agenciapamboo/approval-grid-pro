import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, clientId } = await req.json();

    if (!code || !clientId) {
      throw new Error('Código e clientId são obrigatórios');
    }

    const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID');
    const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');
    const REDIRECT_URI = 'https://aprovacriativos.com.br/social-connect';

    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      throw new Error('Credenciais do Facebook não configuradas');
    }

    console.log('Trocando code por token...');

    // 1. Trocar code por access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message || 'Erro ao obter token');
    }

    const accessToken = tokenData.access_token;
    console.log('Token obtido com sucesso');

    // 2. Obter todas as páginas do usuário (com paginação)
    const availableAccounts = [];
    let pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}&limit=100`;
    
    while (pagesUrl) {
      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json();

      if (pagesData.error) {
        throw new Error(pagesData.error.message || 'Erro ao obter páginas');
      }

      console.log(`Processando ${pagesData.data?.length || 0} páginas...`);

      // 3. Coletar todas as contas disponíveis
      for (const page of pagesData.data || []) {
        // Obter conta Instagram vinculada à página (se houver)
        const instagramUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
        const instagramResponse = await fetch(instagramUrl);
        const instagramData = await instagramResponse.json();

        const instagramAccountId = instagramData.instagram_business_account?.id;

        // Adicionar conta Facebook
        availableAccounts.push({
          platform: 'facebook',
          account_id: page.id,
          account_name: page.name,
          access_token: page.access_token,
          page_id: page.id,
          instagram_business_account_id: instagramAccountId,
        });

        // Se houver Instagram vinculado, adicionar também
        if (instagramAccountId) {
          const igInfoUrl = `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username&access_token=${page.access_token}`;
          const igInfoResponse = await fetch(igInfoUrl);
          const igInfo = await igInfoResponse.json();

          availableAccounts.push({
            platform: 'instagram',
            account_id: instagramAccountId,
            account_name: igInfo.username || `Instagram de ${page.name}`,
            access_token: page.access_token,
            page_id: page.id,
            instagram_business_account_id: instagramAccountId,
          });
        }
      }
      
      // Verificar se há próxima página
      pagesUrl = pagesData.paging?.next || null;
    }

    console.log(`${availableAccounts.length} conta(s) disponível(is)`);

    return new Response(
      JSON.stringify({ 
        success: true,
        accounts: availableAccounts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
