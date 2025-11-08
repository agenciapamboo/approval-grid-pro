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

    // Get request body
    const { userIds } = await req.json();

    if (!Array.isArray(userIds)) {
      return new Response(
        JSON.stringify({ error: "userIds must be an array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If array is empty, return empty response immediately
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ emails: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is super admin using RPC function
    const { data: isSuperAdmin, error: superAdminError } = await supabaseAdmin
      .rpc('has_role', { 
        _user_id: user.id, 
        _role: 'super_admin' 
      });

    // Check if user is agency admin using RPC function
    const { data: isAgencyAdmin, error: agencyAdminError } = await supabaseAdmin
      .rpc('has_role', { 
        _user_id: user.id, 
        _role: 'agency_admin' 
      });

    if (superAdminError || agencyAdminError) {
      console.error("Error checking role:", superAdminError || agencyAdminError);
      return new Response(
        JSON.stringify({ error: "Error checking user role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isSuperAdmin && !isAgencyAdmin) {
      console.log(`User ${user.id} attempted access but is not admin`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only admins can access this" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If agency admin (and not super admin), validate that userIds belong to their agency
    if (isAgencyAdmin && !isSuperAdmin) {
      // Get agency_id of the agency admin
      const { data: adminProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single();
        
      if (profileError || !adminProfile?.agency_id) {
        console.error("Error getting admin profile:", profileError);
        return new Response(
          JSON.stringify({ error: "Agency admin must be associated with an agency" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Verify that all userIds belong to the same agency
      const { data: userProfiles, error: usersError } = await supabaseAdmin
        .from('profiles')
        .select('id, agency_id')
        .in('id', userIds);
        
      if (usersError) {
        console.error("Error validating user access:", usersError);
        return new Response(
          JSON.stringify({ error: "Error validating user access" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Check if any user doesn't belong to the admin's agency
      const invalidUsers = userProfiles?.filter(p => p.agency_id !== adminProfile.agency_id);
      
      if (invalidUsers && invalidUsers.length > 0) {
        console.log(`Agency admin ${user.id} attempted to access users from other agencies`);
        return new Response(
          JSON.stringify({ error: "Cannot access users from other agencies" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

    // Create array of objects { id, email } matching frontend expectations
    const emails = userIds
      .map(userId => ({
        id: userId,
        email: emailMap[userId] || ""
      }))
      .filter(item => item.email !== ""); // Remove users without email

    return new Response(JSON.stringify({ emails }), {
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
