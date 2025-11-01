import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyIPUnblockPayload {
  ip_address: string;
  admin_email: string;
  unblocked_at: string;
  agency_id?: string;
  client_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: NotifyIPUnblockPayload = await req.json();
    const { ip_address, admin_email, unblocked_at, agency_id, client_id } = payload;

    console.log('IP unblock notification:', { ip_address, admin_email });

    // Determinar email de destino (agência ou cliente)
    let recipientEmail = null;
    let recipientName = null;

    if (agency_id) {
      const { data: agency } = await supabase
        .from('agencies')
        .select('email, name')
        .eq('id', agency_id)
        .single();
      
      if (agency?.email) {
        recipientEmail = agency.email;
        recipientName = agency.name;
      }
    } else if (client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('email, name')
        .eq('id', client_id)
        .single();
      
      if (client?.email) {
        recipientEmail = client.email;
        recipientName = client.name;
      }
    }

    // Se não encontrou email, registrar mas não falhar
    if (!recipientEmail) {
      console.log('No recipient email found for notification');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'IP unblocked but no notification sent (no email configured)' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Criar notificação no banco
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        event: 'ip_unblocked',
        channel: 'email',
        agency_id,
        client_id,
        payload: {
          ip_address,
          admin_email,
          unblocked_at,
          recipient_email: recipientEmail,
          recipient_name: recipientName
        },
        status: 'pending'
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw notificationError;
    }

    // Enviar notificação via edge function notify-event
    const { error: sendError } = await supabase.functions.invoke('notify-event', {
      body: {
        event: 'ip_unblocked',
        data: {
          ip_address,
          admin_email,
          unblocked_at,
          recipient_email: recipientEmail,
          recipient_name: recipientName
        }
      }
    });

    if (sendError) {
      console.error('Error sending notification:', sendError);
      // Não falhar se notificação não foi enviada
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'IP unblocked and notification sent',
        recipient_email: recipientEmail
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in notify-ip-unblock:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
