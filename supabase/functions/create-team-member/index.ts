import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-TEAM-MEMBER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const requestingUser = userData.user;
    if (!requestingUser) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: requestingUser.id });

    // Verify that the requesting user is an agency_admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("agency_id")
      .eq("id", requestingUser.id)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    if (!profile.agency_id) {
      throw new Error("User is not associated with an agency");
    }

    const { data: roleCheck } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "agency_admin")
      .single();

    if (!roleCheck) {
      throw new Error("Only agency admins can add team members");
    }

    logStep("Authorization verified", { agencyId: profile.agency_id });

    // Parse request body
    const body = await req.json();
    const { name, email, functions } = body;

    if (!name || !email) {
      throw new Error("Name and email are required");
    }

    logStep("Creating new user", { email, name });

    // Create the new user with Supabase Auth
    const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        accountType: "agency", // Use "agency" for account_type (legacy field)
        agencyId: profile.agency_id,
      },
    });

    if (createUserError) {
      logStep("Error creating user", { error: createUserError.message });
      throw new Error(`Failed to create user: ${createUserError.message}`);
    }

    if (!newUser.user) {
      throw new Error("User creation failed - no user returned");
    }

    logStep("User created", { userId: newUser.user.id });

    // Update the profile with agency_id
    const { error: updateProfileError } = await supabaseClient
      .from("profiles")
      .update({
        agency_id: profile.agency_id,
        account_type: "agency", // Use "agency" for account_type (legacy field, real role is in user_roles)
      })
      .eq("id", newUser.user.id);

    if (updateProfileError) {
      logStep("Error updating profile", { error: updateProfileError.message });
      // Don't throw here, profile might be updated by trigger
    }

    // Assign team_member role
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "team_member",
        created_by: requestingUser.id,
      });

    if (roleError) {
      logStep("Error assigning role", { error: roleError.message });
      throw new Error(`Failed to assign team_member role: ${roleError.message}`);
    }

    // Assign functions if provided
    const memberFunctions = functions || [];
    if (memberFunctions.length > 0) {
      const functionInserts = memberFunctions.map((func: string) => ({
        user_id: newUser.user.id,
        function: func,
        created_by: requestingUser.id,
      }));

      const { error: functionsError } = await supabaseClient
        .from("team_member_functions")
        .insert(functionInserts);

      if (functionsError) {
        logStep("Warning: Error inserting functions", { error: functionsError.message });
        // Don't fail if functions aren't inserted
      } else {
        logStep("Functions assigned", { functions: memberFunctions });
      }
    }

    // Buscar informações da agência e do criador
    const { data: agencyData } = await supabaseClient
      .from("agencies")
      .select("name")
      .eq("id", profile.agency_id)
      .single();

    const { data: creatorProfile } = await supabaseClient
      .from("profiles")
      .select("name")
      .eq("id", requestingUser.id)
      .single();

    // Gerar senha temporária para o novo membro (será necessário resetar senha)
    // Como não temos acesso à senha gerada pelo Supabase, vamos gerar uma temporária
    const tempPassword = newUser.user.id.substring(0, 8) + Math.random().toString(36).substring(2, 12);
    
    // Criar notificação de boas-vindas
    const siteUrl = Deno.env.get("SITE_URL") || "https://app.exemplo.com";
    const { error: notificationError } = await supabaseClient
      .from("notifications")
      .insert({
        event: "user.team_member_created",
        content_id: null,
        client_id: null,
        agency_id: profile.agency_id,
        user_id: newUser.user.id,
        channel: "webhook",
        status: "pending",
        payload: {
          user: {
            id: newUser.user.id,
            email: email,
            name: name,
            role: "team_member",
            password: tempPassword, // Senha temporária para arquivamento
            functions: memberFunctions,
          },
          agency: {
            id: profile.agency_id,
            name: agencyData?.name || "Agência",
          },
          created_by: {
            id: requestingUser.id,
            name: creatorProfile?.name || requestingUser.email || "Admin",
            email: requestingUser.email || "",
          },
          login_url: `${siteUrl}/auth`,
          created_at: new Date().toISOString(),
        },
      });

    if (notificationError) {
      logStep("Warning: Error creating notification", { error: notificationError.message });
      // Não falhar se a notificação não for criada
    } else {
      logStep("Welcome notification created", { userId: newUser.user.id });
    }

    logStep("Team member created successfully", { 
      userId: newUser.user.id,
      email,
      agencyId: profile.agency_id,
      functions: memberFunctions,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        message: "Team member created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { error: errorMessage });

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
