// Script Node.js para resetar senhas usando as credenciais disponíveis
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sgarwrreywadxsodnxng.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnYXJ3cnJleXdhZHhzb2RueG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDAxMTMsImV4cCI6MjA3NDk3NjExM30.PhZjoK6J-2zg2YGMueOfGwrxI4GkqKEmhCfJUNAjeqo';

async function tryEdgeFunction() {
    console.log('🔄 Tentando chamar a Edge Function...');
    
    try {
        const functionUrl = `${SUPABASE_URL}/functions/v1/force-reset-all-passwords`;
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'X-Admin-Token': 'D024m002*'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

        console.log('✅ Sucesso! Resultado da Edge Function:');
        console.log(JSON.stringify(result, null, 2));
        return true;

    } catch (error) {
        console.log('❌ Erro ao chamar Edge Function:', error.message);
        return false;
    }
}

async function tryDirectApproach() {
    console.log('🔄 Tentando abordagem direta...');
    
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Esta abordagem provavelmente falhará por falta de permissões
        console.log('⚠️ Tentando listar usuários (provavelmente falhará)...');
        
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        
        if (error) {
            throw new Error(`Erro ao listar usuários: ${error.message}`);
        }

        console.log(`Encontrados ${users.length} usuários`);
        
        const newPassword = 'D024m002*';
        const results = { success: [], failed: [] };

        for (const user of users) {
            try {
                const { error: updateError } = await supabase.auth.admin.updateUserById(
                    user.id,
                    { password: newPassword }
                );

                if (updateError) {
                    results.failed.push({ email: user.email, error: updateError.message });
                } else {
                    results.success.push(user.email);
                }
            } catch (error) {
                results.failed.push({ email: user.email, error: error.message });
            }
        }

        console.log('✅ Reset concluído!');
        console.log(`Sucesso: ${results.success.length}, Falhas: ${results.failed.length}`);
        console.log('Resultados:', results);
        
        return true;

    } catch (error) {
        console.log('❌ Erro na abordagem direta:', error.message);
        return false;
    }
}

async function main() {
    console.log('🔐 Reset de Senhas - Aprova Criativos');
    console.log('=====================================');
    console.log('Tentando alterar senha de todos os usuários para: D024m002*');
    console.log('');

    // Tentar Edge Function primeiro
    const edgeFunctionSuccess = await tryEdgeFunction();
    
    if (!edgeFunctionSuccess) {
        console.log('');
        console.log('Tentando abordagem direta...');
        await tryDirectApproach();
    }

    console.log('');
    console.log('📋 Resumo:');
    console.log('- Se a Edge Function funcionou, as senhas foram alteradas');
    console.log('- Se não funcionou, é necessário acesso administrativo ao Supabase');
    console.log('- Entre em contato com o suporte do Lovable para obter acesso');
}

// Executar o script
main().catch(console.error);
