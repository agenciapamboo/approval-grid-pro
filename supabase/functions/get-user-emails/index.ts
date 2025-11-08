import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user is a super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is super admin using RPC function
    const { data: isSuperAdmin, error: roleError } = await supabaseAdmin
      .rpc('has_role', { 
        _user_id: user.id, 
        _role: 'super_admin' 
      });

    if (roleError) {
      console.error("Error checking role:", roleError);
      return new Response(
        JSON.stringify({ error: "Error checking user role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isSuperAdmin) {
      console.log(`User ${user.id} attempted access but is not super_admin`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only super admins can access this" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userIds } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "userIds array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch users from auth.users
    const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ error: listError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map user IDs to emails
    const emailMap: Record<string, string> = {};
    authData.users.forEach((authUser) => {
      if (userIds.includes(authUser.id)) {
        emailMap[authUser.id] = authUser.email || "";
      }
    });

    return new Response(JSON.stringify({ emailMap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
