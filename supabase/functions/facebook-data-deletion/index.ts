import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Facebook data deletion callback received');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request body
    const body = await req.json();
    console.log('Request body:', body);

    // Facebook sends a signed_request parameter
    const signedRequest = body.signed_request;
    
    if (!signedRequest) {
      console.error('No signed_request found in request');
      return new Response(
        JSON.stringify({ error: 'Missing signed_request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the signed request
    // Format: base64url(signature).base64url(payload)
    const [encodedSig, encodedPayload] = signedRequest.split('.');
    
    // Decode the payload
    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));
    console.log('Decoded payload:', payload);

    const userId = payload.user_id;
    
    if (!userId) {
      console.error('No user_id found in payload');
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing deletion request for Facebook user ID: ${userId}`);

    // Find and delete all social accounts for this Facebook user
    const { data: socialAccounts, error: findError } = await supabase
      .from('client_social_accounts')
      .select('id')
      .eq('account_id', userId);

    if (findError) {
      console.error('Error finding social accounts:', findError);
      throw findError;
    }

    if (socialAccounts && socialAccounts.length > 0) {
      console.log(`Found ${socialAccounts.length} account(s) to delete`);
      
      // Delete the social accounts
      const { error: deleteError } = await supabase
        .from('client_social_accounts')
        .delete()
        .eq('account_id', userId);

      if (deleteError) {
        console.error('Error deleting social accounts:', deleteError);
        throw deleteError;
      }

      console.log(`Successfully deleted social accounts for user ${userId}`);
    } else {
      console.log(`No social accounts found for user ${userId}`);
    }

    // Generate a confirmation code (required by Facebook)
    const confirmationCode = `${userId}_${Date.now()}`;

    // Return the required response format for Facebook
    return new Response(
      JSON.stringify({
        url: `${supabaseUrl}/functions/v1/facebook-data-deletion-status?id=${confirmationCode}`,
        confirmation_code: confirmationCode,
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Error in facebook-data-deletion:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Internal server error',
        details: String(error)
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});