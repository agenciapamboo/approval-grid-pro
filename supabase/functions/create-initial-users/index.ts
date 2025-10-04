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

    const usersToCreate = [
      {
        email: 'juaumluihs@gmail.com',
        password: 'd024m002',
        name: 'Super Admin',
        role: 'super_admin'
      },
      {
        email: 'contato@pamboo.com.br',
        password: 'd024m002',
        name: 'Agency Admin',
        role: 'agency_admin'
      },
      {
        email: 'financeiro@pamboo.com.br',
        password: 'd024m002',
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

      // Inserir role na tabela user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.user!.id,
          role: userData.role
        })

      if (roleError && !roleError.message.includes('duplicate key')) {
        console.error('Error creating role:', roleError)
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
