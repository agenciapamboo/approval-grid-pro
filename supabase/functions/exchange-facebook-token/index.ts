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
    const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}.lovable.app/social-connect`;

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

    // 2. Obter páginas do usuário
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      throw new Error(pagesData.error.message || 'Erro ao obter páginas');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let accountsConnected = 0;

    // 3. Salvar cada página
    for (const page of pagesData.data || []) {
      // Obter conta Instagram vinculada à página (se houver)
      const instagramUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
      const instagramResponse = await fetch(instagramUrl);
      const instagramData = await instagramResponse.json();

      const instagramAccountId = instagramData.instagram_business_account?.id;

      // Salvar conta do Facebook
      const { error: fbError } = await supabaseClient
        .from('client_social_accounts')
        .upsert({
          client_id: clientId,
          platform: 'facebook',
          account_id: page.id,
          account_name: page.name,
          access_token: page.access_token,
          page_id: page.id,
          instagram_business_account_id: instagramAccountId,
          is_active: true,
        }, {
          onConflict: 'client_id,platform,account_id'
        });

      if (fbError) {
        console.error('Erro ao salvar conta Facebook:', fbError);
      } else {
        accountsConnected++;
      }

      // Se houver Instagram vinculado, salvar também
      if (instagramAccountId) {
        // Obter informações da conta Instagram
        const igInfoUrl = `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username&access_token=${page.access_token}`;
        const igInfoResponse = await fetch(igInfoUrl);
        const igInfo = await igInfoResponse.json();

        const { error: igError } = await supabaseClient
          .from('client_social_accounts')
          .upsert({
            client_id: clientId,
            platform: 'instagram',
            account_id: instagramAccountId,
            account_name: igInfo.username || `Instagram de ${page.name}`,
            access_token: page.access_token,
            page_id: page.id,
            instagram_business_account_id: instagramAccountId,
            is_active: true,
          }, {
            onConflict: 'client_id,platform,account_id'
          });

        if (igError) {
          console.error('Erro ao salvar conta Instagram:', igError);
        } else {
          accountsConnected++;
        }
      }
    }

    console.log(`${accountsConnected} conta(s) conectada(s)`);

    return new Response(
      JSON.stringify({ 
        success: true,
        accounts_connected: accountsConnected,
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
