import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

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

    // Enviar notificação via N8N webhook se houver contas órfãs detectadas
    if (results.orphaned_found > 0) {
      const N8N_INTERNAL_EMAIL_WEBHOOK = 'https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos'
      const N8N_WEBHOOK_TOKEN = Deno.env.get('N8N_WEBHOOK_TOKEN')

      if (N8N_INTERNAL_EMAIL_WEBHOOK) {
        try {
          const n8nPayload = {
            event: 'orphaned_accounts_detected',
            channel: 'email',
            timestamp: results.timestamp,
            summary: {
              total_users: results.total_users,
              orphaned_found: results.orphaned_found,
              fixed: results.fixed.length,
              failed: results.failed.length
            },
            fixed_accounts: results.fixed,
            failed_accounts: results.failed
          }

          console.log('📧 Enviando notificação para N8N webhook de emails internos...')
          
          const n8nResponse = await fetch(N8N_INTERNAL_EMAIL_WEBHOOK, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(N8N_WEBHOOK_TOKEN ? { 'Authorization': `Bearer ${N8N_WEBHOOK_TOKEN}` } : {}),
            },
            body: JSON.stringify(n8nPayload),
          })

          if (n8nResponse.ok) {
            console.log('✅ Notificação enviada para N8N com sucesso')
          } else {
            console.error('❌ Falha ao enviar notificação para N8N:', n8nResponse.status)
          }
        } catch (n8nError) {
          console.error('❌ Erro ao enviar notificação para N8N:', n8nError)
        }
      }
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
