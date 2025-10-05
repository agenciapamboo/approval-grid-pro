#!/usr/bin/env python3
"""
Script simples para resetar senhas usando apenas bibliotecas padrão do Python
"""

import urllib.request
import urllib.parse
import json
import ssl

# Credenciais do Supabase
SUPABASE_URL = 'https://sgarwrreywadxsodnxng.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnYXJ3cnJleXdhZHhzb2RueG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDAxMTMsImV4cCI6MjA3NDk3NjExM30.PhZjoK6J-2zg2YGMueOfGwrxI4GkqKEmhCfJUNAjeqo'

def make_request(url, headers=None, data=None, method='GET'):
    """Faz uma requisição HTTP usando urllib"""
    try:
        if data:
            data = json.dumps(data).encode('utf-8')
        
        req = urllib.request.Request(url, data=data, headers=headers or {})
        req.get_method = lambda: method
        
        # Criar contexto SSL que ignora verificação de certificado
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(req, timeout=30, context=ssl_context) as response:
            return response.status, response.read().decode('utf-8')
    except Exception as e:
        return None, str(e)

def try_edge_function():
    """Tenta chamar a Edge Function para resetar senhas"""
    print("🔄 Tentando chamar a Edge Function...")
    
    function_url = f"{SUPABASE_URL}/functions/v1/force-reset-all-passwords"
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'X-Admin-Token': 'D024m002*'
    }
    
    status, response = make_request(function_url, headers=headers, method='POST')
    
    if status == 200:
        try:
            result = json.loads(response)
            print("✅ Sucesso! Resultado da Edge Function:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            return True
        except json.JSONDecodeError:
            print("✅ Resposta recebida (não é JSON):")
            print(response)
            return True
    else:
        print(f"❌ Erro HTTP {status}: {response}")
        return False

def try_direct_api():
    """Tenta usar a API diretamente"""
    print("🔄 Tentando abordagem direta via API...")
    
    # Tentar listar usuários
    auth_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    
    headers = {
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json'
    }
    
    status, response = make_request(auth_url, headers=headers)
    
    if status == 200:
        try:
            users = json.loads(response)
            print(f"✅ Encontrados {len(users)} usuários")
            
            # Tentar atualizar senhas
            new_password = 'D024m002*'
            success_count = 0
            failed_count = 0
            
            for user in users:
                try:
                    update_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user['id']}"
                    update_data = {"password": new_password}
                    
                    update_status, update_response = make_request(
                        update_url, 
                        headers=headers, 
                        data=update_data, 
                        method='PUT'
                    )
                    
                    if update_status == 200:
                        success_count += 1
                        print(f"✅ Senha atualizada para: {user.get('email', 'N/A')}")
                    else:
                        failed_count += 1
                        print(f"❌ Falha ao atualizar: {user.get('email', 'N/A')} - {update_response}")
                        
                except Exception as e:
                    failed_count += 1
                    print(f"❌ Erro ao atualizar {user.get('email', 'N/A')}: {e}")
            
            print(f"\n📊 Resultado: {success_count} sucessos, {failed_count} falhas")
            return True
            
        except json.JSONDecodeError:
            print(f"❌ Resposta não é JSON válido: {response}")
            return False
    else:
        print(f"❌ Erro ao listar usuários: HTTP {status}")
        print(f"Resposta: {response}")
        return False

def main():
    print("🔐 Reset de Senhas - Aprova Criativos")
    print("=" * 40)
    print("Tentando alterar senha de todos os usuários para: D024m002*")
    print()
    
    # Tentar Edge Function primeiro
    edge_success = try_edge_function()
    
    if not edge_success:
        print()
        print("Tentando abordagem direta...")
        direct_success = try_direct_api()
        
        if not direct_success:
            print()
            print("❌ Não foi possível resetar as senhas com as credenciais disponíveis.")
            print("📋 Próximos passos:")
            print("1. Entre em contato com o suporte do Lovable")
            print("2. Solicite acesso administrativo ao Supabase")
            print("3. Ou peça para eles executarem o reset de senhas")
    
    print()
    print("🏁 Processo concluído!")

if __name__ == "__main__":
    main()
