import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversionEvent {
  client_id: string;
  event_name: 'PageView' | 'InitiateCheckout' | 'Purchase' | 'AddToCart' | 'ViewContent';
  event_time?: number;
  event_source_url: string;
  user_data?: {
    email?: string;
    phone?: string;
    external_id?: string;
    client_ip_address?: string;
    client_user_agent?: string;
  };
  custom_data?: {
    currency?: string;
    value?: number;
    content_ids?: string[];
    content_type?: string;
    content_category?: string;
    num_items?: number;
  };
  utm_params?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const event: ConversionEvent = await req.json();
    const eventId = crypto.randomUUID();
    const eventTime = event.event_time || Math.floor(Date.now() / 1000);

    console.log('Processing conversion event:', { event_name: event.event_name, event_id: eventId });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar pixels configurados do cliente
    const { data: pixels, error: pixelsError } = await supabaseClient
      .from('tracking_pixels')
      .select('*')
      .eq('client_id', event.client_id)
      .eq('is_active', true)
      .single();

    if (pixelsError || !pixels) {
      console.log('No pixels configured for client:', event.client_id);
      return new Response(
        JSON.stringify({ success: true, message: 'No pixels configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Hash dados do usuário (SHA-256)
    const hashedUserData = await hashUserData(event.user_data);

    // 3. Enviar para cada plataforma configurada
    const results: any = {
      meta: null,
      google: null,
      tiktok: null,
    };

    const platforms: string[] = [];

    // Meta Conversions API
    if (pixels.meta_pixel_id && pixels.meta_access_token_encrypted) {
      console.log('Sending to Meta Conversions API');
      results.meta = await sendToMetaConversionsAPI(
        pixels,
        event,
        eventId,
        eventTime,
        hashedUserData,
        supabaseClient
      );
      if (results.meta?.success) platforms.push('meta');
    }

    // Google Ads (client-side handled mostly)
    if (pixels.google_ads_conversion_id) {
      results.google = { success: true, note: 'Handled by client-side gtag.js' };
      platforms.push('google');
    }

    // TikTok Events API
    if (pixels.tiktok_pixel_id && pixels.tiktok_access_token_encrypted) {
      console.log('Sending to TikTok Events API');
      results.tiktok = await sendToTikTokEventsAPI(
        pixels,
        event,
        eventId,
        eventTime,
        hashedUserData,
        supabaseClient
      );
      if (results.tiktok?.success) platforms.push('tiktok');
    }

    // 4. Salvar log do evento
    const { error: insertError } = await supabaseClient.from('conversion_events').insert({
      client_id: event.client_id,
      event_name: event.event_name,
      event_id: eventId,
      event_time: new Date(eventTime * 1000).toISOString(),
      event_source_url: event.event_source_url,
      user_email_hash: hashedUserData.em,
      user_phone_hash: hashedUserData.ph,
      user_ip: event.user_data?.client_ip_address,
      user_agent: event.user_data?.client_user_agent,
      currency: event.custom_data?.currency,
      value: event.custom_data?.value,
      content_ids: event.custom_data?.content_ids,
      content_type: event.custom_data?.content_type,
      utm_source: event.utm_params?.utm_source,
      utm_medium: event.utm_params?.utm_medium,
      utm_campaign: event.utm_params?.utm_campaign,
      utm_term: event.utm_params?.utm_term,
      utm_content: event.utm_params?.utm_content,
      platforms,
      send_status: results,
    });

    if (insertError) {
      console.error('Error logging conversion event:', insertError);
    }

    return new Response(
      JSON.stringify({ success: true, event_id: eventId, results, platforms }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error tracking conversion:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper: Hash dados do usuário (SHA-256)
async function hashUserData(userData?: any) {
  const result: any = {};
  
  if (userData?.email) {
    result.em = await sha256(userData.email.toLowerCase().trim());
  }
  if (userData?.phone) {
    const phone = userData.phone.replace(/\D/g, '');
    result.ph = await sha256(phone);
  }
  
  return result;
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Enviar para Meta Conversions API
async function sendToMetaConversionsAPI(
  pixels: any,
  event: ConversionEvent,
  eventId: string,
  eventTime: number,
  hashedUserData: any,
  supabaseClient: any
) {
  try {
    const { data: accessToken } = await supabaseClient.rpc('decrypt_social_token', {
      encrypted_token: pixels.meta_access_token_encrypted,
    });
    
    const payload: any = {
      data: [{
        event_name: event.event_name,
        event_time: eventTime,
        event_id: eventId,
        event_source_url: event.event_source_url,
        action_source: 'website',
        user_data: {
          ...hashedUserData,
          client_ip_address: event.user_data?.client_ip_address,
          client_user_agent: event.user_data?.client_user_agent,
        },
        custom_data: event.custom_data || {},
      }],
      access_token: accessToken || pixels.meta_access_token_encrypted,
    };

    if (pixels.meta_test_event_code) {
      payload.test_event_code = pixels.meta_test_event_code;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixels.meta_pixel_id}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    console.log('Meta Conversions API success:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Meta Conversions API error:', error);
    return { success: false, error: error.message };
  }
}

// Enviar para TikTok Events API
async function sendToTikTokEventsAPI(
  pixels: any,
  event: ConversionEvent,
  eventId: string,
  eventTime: number,
  hashedUserData: any,
  supabaseClient: any
) {
  try {
    const { data: accessToken } = await supabaseClient.rpc('decrypt_social_token', {
      encrypted_token: pixels.tiktok_access_token_encrypted,
    });
    
    const eventNameMap: Record<string, string> = {
      'PageView': 'ViewContent',
      'InitiateCheckout': 'InitiateCheckout',
      'Purchase': 'CompletePayment',
      'AddToCart': 'AddToCart',
      'ViewContent': 'ViewContent',
    };

    const payload = {
      pixel_code: pixels.tiktok_pixel_id,
      event: eventNameMap[event.event_name] || event.event_name,
      event_id: eventId,
      timestamp: eventTime,
      context: {
        page: {
          url: event.event_source_url,
        },
        user: {
          email: hashedUserData.em,
          phone_number: hashedUserData.ph,
        },
        ip: event.user_data?.client_ip_address,
        user_agent: event.user_data?.client_user_agent,
      },
      properties: {
        value: event.custom_data?.value,
        currency: event.custom_data?.currency,
        content_type: event.custom_data?.content_type,
        contents: event.custom_data?.content_ids?.map(id => ({
          content_id: id,
        })),
      },
    };

    const response = await fetch(
      'https://business-api.tiktok.com/open_api/v1.3/pixel/track/',
      {
        method: 'POST',
        headers: {
          'Access-Token': accessToken || pixels.tiktok_access_token_encrypted,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(data.message || 'TikTok API error');
    }

    console.log('TikTok Events API success:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('TikTok Events API error:', error);
    return { success: false, error: error.message };
  }
}
