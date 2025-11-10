import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrphanedAccount {
  id: string
  email: string
  created_at: string
  user_metadata: any
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') || ''

    // Client to validate caller and read their JWT user
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }

    const user = userData.user

    // Service client for privileged ops
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    // Ensure super_admin
    const { data: roleRow, error: roleErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle()

    if (roleErr || !roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
    }

    // Fetch auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')

    if (profilesError) throw profilesError

    const profileIds = new Set((profiles || []).map((p: any) => p.id))

    const orphaned: OrphanedAccount[] = (authUsers?.users || [])
      .filter((u: any) => !profileIds.has(u.id))
      .map((u: any) => ({
        id: u.id,
        email: u.email || 'no-email',
        created_at: u.created_at,
        user_metadata: u.user_metadata
      }))

    const result = {
      stats: {
        total_users: authUsers?.users?.length || 0,
        total_profiles: profiles?.length || 0,
        orphaned_found: orphaned.length
      },
      orphaned_accounts: orphaned,
      all_auth_users: authUsers?.users || [],
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})