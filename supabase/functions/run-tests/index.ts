import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é super admin
    const { data: isSuperAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'super_admin'
    });

    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { testType } = await req.json();

    if (!testType || !['unit', 'e2e', 'coverage'].includes(testType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid test type. Must be: unit, e2e, or coverage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting ${testType} tests for user ${user.id}`);

    // Criar registro inicial
    const { data: testRun, error: insertError } = await supabase
      .from('test_runs')
      .insert({
        test_type: testType,
        status: 'running',
        executed_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating test run:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create test run' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determinar comando
    let command: string[];
    switch (testType) {
      case 'unit':
        command = ['npx', 'vitest', 'run', '--reporter=json'];
        break;
      case 'e2e':
        command = ['npx', 'playwright', 'test', '--reporter=json'];
        break;
      case 'coverage':
        command = ['npx', 'vitest', 'run', '--coverage', '--reporter=json'];
        break;
      default:
        command = ['npx', 'vitest', 'run', '--reporter=json'];
    }

    console.log(`Executing command: ${command.join(' ')}`);

    try {
      // Executar testes usando Deno.Command (novo API)
      const cmd = new Deno.Command(command[0], {
        args: command.slice(1),
        stdout: 'piped',
        stderr: 'piped',
      });

      const process = cmd.spawn();
      const { code, stdout, stderr } = await process.output();

      const output = new TextDecoder().decode(stdout);
      const errorOutput = new TextDecoder().decode(stderr);

      console.log('Test execution completed:', { success: code === 0 });

      // Parsear resultados
      let results: any = {};
      try {
        results = JSON.parse(output);
      } catch (e) {
        console.warn('Could not parse test output as JSON:', e);
        results = {
          raw_output: output,
          raw_error: errorOutput,
        };
      }

      // Determinar status final
      const finalStatus = code === 0 ? 'passed' : 'failed';

      // Atualizar registro
      const { error: updateError } = await supabase
        .from('test_runs')
        .update({
          status: finalStatus,
          results: {
            ...results,
            stderr: errorOutput || null,
            exit_code: code,
          },
        })
        .eq('id', testRun.id);

      if (updateError) {
        console.error('Error updating test run:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          testRunId: testRun.id,
          status: finalStatus,
          results: {
            ...results,
            stderr: errorOutput || null,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (execError) {
      console.error('Error executing tests:', execError);

      // Atualizar como erro
      await supabase
        .from('test_runs')
        .update({
          status: 'error',
          results: {
            error: String(execError),
          },
        })
        .eq('id', testRun.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to execute tests',
          details: String(execError),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});