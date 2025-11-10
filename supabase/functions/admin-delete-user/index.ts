import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-DELETE-USER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase clients
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const callerId = userData.user?.id;
    if (!callerId) throw new Error("User not authenticated");

    logStep("Caller authenticated", { callerId });

    // Check if caller is super_admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleError) throw roleError;
    if (!roleData) {
      throw new Error("Unauthorized: Only super_admin can delete users");
    }

    logStep("Super admin verified");

    // Get userId to delete from request body
    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");

    logStep("Deleting user", { userId });

    // Prevent self-deletion
    if (userId === callerId) {
      throw new Error("Cannot delete your own account");
    }

    // Delete related data manually (cascade)
    // 1. Delete from user_roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    logStep("Deleted user_roles");

    // 2. Delete from user_preferences
    await supabaseAdmin.from("user_preferences").delete().eq("user_id", userId);
    logStep("Deleted user_preferences");

    // 3. Delete from notifications (as user or related)
    await supabaseAdmin.from("notifications").delete().eq("user_id", userId);
    logStep("Deleted notifications");

    // 4. Delete from activity_log
    await supabaseAdmin.from("activity_log").delete().eq("actor_user_id", userId);
    logStep("Deleted activity_log");

    // 5. Delete from profiles
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    logStep("Deleted profile");

    // 6. Delete from auth.users (using admin API)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    logStep("Deleted from auth.users");

    // Log deletion in activity_log
    await supabaseAdmin.from("activity_log").insert({
      entity: "user",
      action: "admin_delete",
      entity_id: userId,
      actor_user_id: callerId,
      metadata: {
        deleted_at: new Date().toISOString(),
        deleted_by: callerId,
      },
    });

    logStep("User deleted successfully", { userId });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User deleted successfully",
        userId 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
