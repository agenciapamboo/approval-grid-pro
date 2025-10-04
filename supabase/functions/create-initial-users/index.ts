import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // SECURITY WARNING: These are default credentials for testing only
    // In production, use environment variables and strong passwords
    const usersToCreate = [
      {
        email: Deno.env.get('SUPER_ADMIN_EMAIL') || 'juaumluihs@gmail.com',
        password: Deno.env.get('SUPER_ADMIN_PASSWORD') || 'ChangeMe123!',
        name: 'Super Admin',
        role: 'super_admin'
      },
      {
        email: Deno.env.get('AGENCY_ADMIN_EMAIL') || 'contato@pamboo.com.br',
        password: Deno.env.get('AGENCY_ADMIN_PASSWORD') || 'ChangeMe123!',
        name: 'Agency Admin',
        role: 'agency_admin'
      },
      {
        email: Deno.env.get('CLIENT_USER_EMAIL') || 'financeiro@pamboo.com.br',
        password: Deno.env.get('CLIENT_USER_PASSWORD') || 'ChangeMe123!',
        name: 'Client User',
        role: 'client_user'
      }
    ]

    const results = []

    for (const userData of usersToCreate) {
      // Criar usuário
      const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name
        }
      })

      if (createError) {
        // Se o erro for que o usuário já existe, ignorar
        if (createError.message.includes('already registered')) {
          results.push({ email: userData.email, status: 'already_exists' })
          continue
        }
        throw createError
      }

      // Insert role in user_roles table (using security definer function)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.user!.id,
          role: userData.role,
          created_by: user.user!.id
        })

      if (roleError && !roleError.message.includes('duplicate key')) {
        console.error('Error creating role:', roleError)
        // Continue anyway - the profile was created successfully
      }

      results.push({ email: userData.email, status: 'created', id: user.user!.id })
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
