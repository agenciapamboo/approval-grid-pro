#!/usr/bin/env python3
"""
Script para resetar senhas de todos os usuários para D024m002*
Usando as credenciais disponíveis do Supabase
"""

import requests
import json

# Credenciais do Supabase
SUPABASE_URL = 'https://sgarwrreywadxsodnxng.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnYXJ3cnJleXdhZHhzb2RueG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDAxMTMsImV4cCI6MjA3NDk3NjExM30.PhZjoK6J-2zg2YGMueOfGwrxI4GkqKEmhCfJUNAjeqo'

def try_edge_function():
    """Tenta chamar a Edge Function para resetar senhas"""
    print("🔄 Tentando chamar a Edge Function...")
    
    try:
        function_url = f"{SUPABASE_URL}/functions/v1/force-reset-all-passwords"
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'X-Admin-Token': 'D024m002*'
        }
        
        response = requests.post(function_url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Sucesso! Resultado da Edge Function:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            return True
        else:
            print(f"❌ Erro HTTP {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro de conexão: {e}")
        return False
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False

def try_direct_api():
    """Tenta usar a API diretamente (provavelmente falhará por falta de permissões)"""
    print("🔄 Tentando abordagem direta via API...")
    
    try:
        # Tentar listar usuários (provavelmente falhará)
        auth_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        
        headers = {
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(auth_url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Encontrados {len(users)} usuários")
            
            # Tentar atualizar senhas
            new_password = 'D024m002*'
            success_count = 0
            failed_count = 0
            
            for user in users:
                try:
                    update_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user['id']}"
                    update_data = {"password": new_password}
                    
                    update_response = requests.put(
                        update_url, 
                        headers=headers, 
                        json=update_data, 
                        timeout=30
                    )
                    
                    if update_response.status_code == 200:
                        success_count += 1
                        print(f"✅ Senha atualizada para: {user.get('email', 'N/A')}")
                    else:
                        failed_count += 1
                        print(f"❌ Falha ao atualizar: {user.get('email', 'N/A')}")
                        
                except Exception as e:
                    failed_count += 1
                    print(f"❌ Erro ao atualizar {user.get('email', 'N/A')}: {e}")
            
            print(f"\n📊 Resultado: {success_count} sucessos, {failed_count} falhas")
            return True
            
        else:
            print(f"❌ Erro ao listar usuários: HTTP {response.status_code}")
            print(f"Resposta: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na abordagem direta: {e}")
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
