import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { sendInternalNotification } from '../_shared/internal-notifications.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrphanedAccount {
  id: string
  email: string
  created_at: string
  raw_user_meta_data: any
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('🔍 Starting orphaned accounts cleanup job...')

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError)
      throw authError
    }

    console.log(`📊 Found ${authUsers.users.length} total users in auth.users`)

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      throw profilesError
    }

    const profileIds = new Set(profiles.map(p => p.id))
    console.log(`📊 Found ${profiles.length} profiles`)

    // Find orphaned accounts (users without profiles)
    const orphanedAccounts: OrphanedAccount[] = authUsers.users
      .filter(user => !profileIds.has(user.id))
      .map(user => ({
        id: user.id,
        email: user.email || 'no-email',
        created_at: user.created_at,
        raw_user_meta_data: user.user_metadata
      }))

    console.log(`⚠️  Found ${orphanedAccounts.length} orphaned accounts`)

    const results = {
      total_users: authUsers.users.length,
      total_profiles: profiles.length,
      orphaned_found: orphanedAccounts.length,
      fixed: [] as any[],
      failed: [] as any[],
      timestamp: new Date().toISOString()
    }

    // Try to fix each orphaned account
    for (const orphan of orphanedAccounts) {
      try {
        console.log(`🔧 Attempting to fix orphaned account: ${orphan.email} (${orphan.id})`)

        const userName = orphan.raw_user_meta_data?.name || 
                        orphan.raw_user_meta_data?.agencyName || 
                        orphan.email

        const accountType = orphan.raw_user_meta_data?.accountType || 'creator'

        // Create profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: orphan.id,
            name: userName,
            account_type: accountType,
            plan: 'free',
            is_active: true,
            created_at: orphan.created_at,
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error(`❌ Failed to create profile for ${orphan.email}:`, insertError)
          results.failed.push({
            user_id: orphan.id,
            email: orphan.email,
            error: insertError.message
          })
          
          // Log error in activity_log
          await supabase.from('activity_log').insert({
            entity: 'user',
            action: 'orphan_fix_failed',
            entity_id: orphan.id,
            metadata: {
              email: orphan.email,
              error: insertError.message,
              automated: true
            }
          })
        } else {
          console.log(`✅ Successfully created profile for ${orphan.email}`)
          results.fixed.push({
            user_id: orphan.id,
            email: orphan.email,
            account_type: accountType
          })

          // Log success in activity_log
          await supabase.from('activity_log').insert({
            entity: 'user',
            action: 'orphan_fixed',
            entity_id: orphan.id,
            metadata: {
              email: orphan.email,
              account_type: accountType,
              automated: true
            }
          })
        }
      } catch (error) {
        console.error(`❌ Exception fixing ${orphan.email}:`, error)
        results.failed.push({
          user_id: orphan.id,
          email: orphan.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log('📋 Cleanup job completed:')
    console.log(`   - Total users: ${results.total_users}`)
    console.log(`   - Orphaned found: ${results.orphaned_found}`)
    console.log(`   - Successfully fixed: ${results.fixed.length}`)
    console.log(`   - Failed to fix: ${results.failed.length}`)

    // Enviar notificação via sistema centralizado
    if (results.orphaned_found > 0) {
      await sendInternalNotification({
        type: 'warning',
        subject: `${results.orphaned_found} conta(s) órfã(s) detectada(s)`,
        message: `Job de limpeza encontrou ${results.orphaned_found} contas sem perfil. ${results.fixed.length} foram corrigidas automaticamente.`,
        details: {
          total_users: results.total_users,
          orphaned_found: results.orphaned_found,
          fixed: results.fixed.length,
          failed: results.failed.length,
          fixed_accounts: results.fixed,
          failed_accounts: results.failed
        },
        source: 'cleanup-orphaned-accounts',
        priority: results.failed.length > 0 ? 'high' : 'medium'
      });
    }

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Fatal error in cleanup job:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
