import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const normalizePath = (raw: string) => {
    let value = raw.trim();
    if (!value) return '';

    // External URLs should be returned as-is
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    if (value.startsWith('content-media/')) {
      value = value.slice('content-media/'.length);
    }

    // Remove leading slashes to avoid double prefixes
    while (value.startsWith('/')) {
      value = value.slice(1);
    }

    return value;
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { searchParams } = new URL(req.url);
    let path = searchParams.get('path');

    if (!path) {
      try {
        const body = await req.json();
        if (body?.path) {
          path = String(body.path);
        }
      } catch (error) {
        // Ignore JSON parse errors so we can return a consistent response below
        console.warn('Failed to parse JSON body for path:', error);
      }
    }

    if (!path) {
      return new Response(
        JSON.stringify({ error: 'Missing path parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const normalizedPath = normalizePath(path);

    if (!normalizedPath) {
      return new Response(
        JSON.stringify({ error: 'Invalid path' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // External URLs do not require signed URLs
    if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
      return new Response(
        JSON.stringify({ url: normalizedPath }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate signed URL valid for 15 minutes
    const { data, error } = await supabase
      .storage
      .from('content-media')
      .createSignedUrl(normalizedPath, 60 * 15);

    if (error || !data?.signedUrl) {
      console.error('Error generating signed URL:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate URL' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ url: data.signedUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in get-media-url function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
