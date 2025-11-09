import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationEvent {
  event: string;
  category: 'client' | 'internal' | 'platform';
  type: 'info' | 'warning' | 'error' | 'report' | 'security';
  description: string;
  trigger: string;
  webhookType: 'client' | 'internal' | 'platform';
  payload: Record<string, any>;
}

// Cópia das definições de eventos (deve ser mantida sincronizada com src/lib/notification-events.ts)
const NOTIFICATION_EVENTS: NotificationEvent[] = [
  {
    event: 'content.ready_for_approval',
    category: 'client',
    type: 'info',
    description: 'Enviado quando um conteúdo está pronto para aprovação',
    trigger: 'Ao criar novo conteúdo ou solicitar aprovação',
    webhookType: 'client',
    payload: {
      notification_id: 'uuid-exemplo',
      event: 'content.ready_for_approval',
      channel: 'email',
      client_id: 'uuid-do-cliente',
      agency_id: 'uuid-da-agencia',
      payload: {
        content_id: 'uuid-do-conteudo',
        caption: 'Texto do post',
        scheduled_date: '2024-01-15',
        scheduled_time: '14:00',
        social_accounts: ['Instagram Principal', 'Facebook Empresa'],
        approval_link: 'https://app.exemplo.com/approve?token=xxx',
        client_name: 'Nome do Cliente',
        agency_name: 'Nome da Agência'
      }
    }
  },
  {
    event: 'content.approved',
    category: 'client',
    type: 'info',
    description: 'Enviado quando um conteúdo é aprovado',
    trigger: 'Ao aprovar conteúdo via link ou dashboard',
    webhookType: 'client',
    payload: {
      notification_id: 'uuid-exemplo',
      event: 'content.approved',
      channel: 'email',
      client_id: 'uuid-do-cliente',
      agency_id: 'uuid-da-agencia',
      payload: {
        content_id: 'uuid-do-conteudo',
        caption: 'Texto do post',
        approved_at: '2024-01-15T10:30:00Z',
        client_name: 'Nome do Cliente',
        agency_name: 'Nome da Agência'
      }
    }
  },
  {
    event: 'content.rejected',
    category: 'client',
    type: 'warning',
    description: 'Enviado quando um conteúdo é rejeitado',
    trigger: 'Ao rejeitar conteúdo via link ou dashboard',
    webhookType: 'client',
    payload: {
      notification_id: 'uuid-exemplo',
      event: 'content.rejected',
      channel: 'email',
      client_id: 'uuid-do-cliente',
      agency_id: 'uuid-da-agencia',
      payload: {
        content_id: 'uuid-do-conteudo',
        caption: 'Texto do post',
        rejection_reason: 'Texto precisa ser ajustado',
        rejected_at: '2024-01-15T10:30:00Z',
        client_name: 'Nome do Cliente',
        agency_name: 'Nome da Agência'
      }
    }
  },
  {
    event: 'content.approval_reminder',
    category: 'client',
    type: 'info',
    description: 'Lembrete enviado quando conteúdo está pendente de aprovação há muito tempo',
    trigger: 'Verificação periódica de conteúdos pendentes',
    webhookType: 'client',
    payload: {
      notification_id: 'uuid-exemplo',
      event: 'content.approval_reminder',
      channel: 'email',
      client_id: 'uuid-do-cliente',
      agency_id: 'uuid-da-agencia',
      payload: {
        content_id: 'uuid-do-conteudo',
        caption: 'Texto do post',
        scheduled_date: '2024-01-15',
        days_pending: 3,
        approval_link: 'https://app.exemplo.com/approve?token=xxx',
        client_name: 'Nome do Cliente',
        agency_name: 'Nome da Agência'
      }
    }
  },
  {
    event: 'content.published',
    category: 'client',
    type: 'info',
    description: 'Enviado quando conteúdo é publicado com sucesso nas redes sociais',
    trigger: 'Após publicação bem-sucedida via publish-to-social',
    webhookType: 'client',
    payload: {
      notification_id: 'uuid-exemplo',
      event: 'content.published',
      channel: 'email',
      client_id: 'uuid-do-cliente',
      agency_id: 'uuid-da-agencia',
      payload: {
        content_id: 'uuid-do-conteudo',
        caption: 'Texto do post',
        published_at: '2024-01-15T14:00:00Z',
        social_accounts: ['Instagram Principal', 'Facebook Empresa'],
        post_urls: {
          instagram: 'https://instagram.com/p/xxx',
          facebook: 'https://facebook.com/xxx'
        },
        client_name: 'Nome do Cliente',
        agency_name: 'Nome da Agência'
      }
    }
  },
  {
    event: 'content.publish_failed',
    category: 'client',
    type: 'error',
    description: 'Enviado quando a publicação de conteúdo falha',
    trigger: 'Erro durante publicação via publish-to-social',
    webhookType: 'client',
    payload: {
      notification_id: 'uuid-exemplo',
      event: 'content.publish_failed',
      channel: 'email',
      client_id: 'uuid-do-cliente',
      agency_id: 'uuid-da-agencia',
      payload: {
        content_id: 'uuid-do-conteudo',
        caption: 'Texto do post',
        error_message: 'Falha ao conectar com Instagram API',
        failed_at: '2024-01-15T14:00:00Z',
        social_account: 'Instagram Principal',
        client_name: 'Nome do Cliente',
        agency_name: 'Nome da Agência'
      }
    }
  },
  {
    event: 'novojob',
    category: 'client',
    type: 'info',
    description: 'Enviado quando uma nova solicitação criativa é criada',
    trigger: 'Ao criar creative_request via RequestCreativeDialog',
    webhookType: 'client',
    payload: {
      notification_id: 'uuid-exemplo',
      event: 'novojob',
      channel: 'email',
      client_id: 'uuid-do-cliente',
      agency_id: 'uuid-da-agencia',
      payload: {
        request_id: 'uuid-da-solicitacao',
        request_type: 'post_redes_sociais',
        description: 'Criar 3 posts sobre novo produto',
        quantity: 3,
        deadline: '2024-01-20',
        client_name: 'Nome do Cliente',
        agency_name: 'Nome da Agência',
        created_at: '2024-01-15T09:00:00Z'
      }
    }
  },
  {
    event: 'orphaned_accounts_detected',
    category: 'internal',
    type: 'warning',
    description: 'Alerta de contas órfãs detectadas no sistema',
    trigger: 'Edge function cleanup-orphaned-accounts ao encontrar contas sem vínculos',
    webhookType: 'internal',
    payload: {
      type: 'warning',
      subject: 'Contas órfãs detectadas no sistema',
      message: 'Foram encontradas 5 contas sociais sem vínculo com clientes',
      details: {
        total_orphaned: 5,
        accounts: [
          {
            id: 'uuid-conta-1',
            platform: 'instagram',
            username: '@conta_sem_dono',
            created_at: '2024-01-01T00:00:00Z'
          }
        ]
      },
      source: 'cleanup-orphaned-accounts',
      priority: 'high',
      timestamp: '2024-01-15T08:00:00Z'
    }
  },
  {
    event: 'system_error',
    category: 'internal',
    type: 'error',
    description: 'Erro crítico em qualquer edge function',
    trigger: 'Erros capturados via notifyError() helper',
    webhookType: 'internal',
    payload: {
      type: 'error',
      subject: 'Erro crítico em publish-to-social',
      message: 'Failed to publish content: API rate limit exceeded',
      details: {
        error_code: 'RATE_LIMIT_EXCEEDED',
        content_id: 'uuid-do-conteudo',
        platform: 'instagram',
        stack: 'Error stack trace...'
      },
      source: 'publish-to-social',
      priority: 'critical',
      timestamp: '2024-01-15T14:30:00Z'
    }
  },
  {
    event: 'auto_approval_report',
    category: 'internal',
    type: 'info',
    description: 'Relatório de aprovações automáticas executadas',
    trigger: 'Edge function auto-approve-contents após processar lote',
    webhookType: 'internal',
    payload: {
      type: 'info',
      subject: 'Relatório de aprovações automáticas',
      message: 'Processados 15 conteúdos, 12 aprovados automaticamente',
      details: {
        total_processed: 15,
        auto_approved: 12,
        skipped: 3,
        clients_affected: ['Cliente A', 'Cliente B'],
        execution_time: '2.5s'
      },
      source: 'auto-approve-contents',
      priority: 'low',
      timestamp: '2024-01-15T06:00:00Z'
    }
  },
  {
    event: 'daily_system_report',
    category: 'internal',
    type: 'report',
    description: 'Relatório diário do sistema',
    trigger: 'Edge function daily-report executada via cron',
    webhookType: 'internal',
    payload: {
      type: 'report',
      subject: 'Relatório Diário do Sistema - 15/01/2024',
      message: 'Resumo das atividades do dia',
      details: {
        date: '2024-01-15',
        total_contents: 45,
        approved: 30,
        rejected: 5,
        pending: 10,
        published: 25,
        active_clients: 12,
        new_requests: 8
      },
      source: 'daily-report',
      priority: 'low',
      timestamp: '2024-01-15T23:59:00Z'
    }
  },
  {
    event: 'ip_blocked',
    category: 'internal',
    type: 'security',
    description: 'Notificação quando um IP é bloqueado por tentativas falhas',
    trigger: 'Edge function validate-approval-token ao bloquear IP',
    webhookType: 'internal',
    payload: {
      type: 'security',
      subject: 'IP bloqueado por tentativas suspeitas',
      message: 'IP 192.168.1.100 foi bloqueado por 24 horas devido a 5 tentativas falhas',
      details: {
        ip: '192.168.1.100',
        failed_attempts: 5,
        blocked_until: '2024-01-16T14:00:00Z',
        user_agent: 'Mozilla/5.0...',
        last_attempt_token: 'invalid-token-xxx'
      },
      source: 'security-system',
      priority: 'critical',
      timestamp: '2024-01-15T14:00:00Z'
    }
  },
  {
    event: 'ip_unblocked',
    category: 'internal',
    type: 'security',
    description: 'Notificação quando um IP é desbloqueado manualmente',
    trigger: 'Edge function notify-ip-unblock ao desbloquear IP',
    webhookType: 'internal',
    payload: {
      type: 'security',
      subject: 'IP desbloqueado manualmente',
      message: 'IP 192.168.1.100 foi desbloqueado por administrador',
      details: {
        ip: '192.168.1.100',
        unblocked_by: 'admin@example.com',
        was_blocked_at: '2024-01-15T14:00:00Z',
        reason: 'Falso positivo - cliente legítimo'
      },
      source: 'security-system',
      priority: 'high',
      timestamp: '2024-01-15T15:00:00Z'
    }
  },
  {
    event: 'ticket.created',
    category: 'internal',
    type: 'info',
    description: 'Notificação enviada quando um novo ticket de suporte é criado',
    trigger: 'Ao inserir ticket na tabela support_tickets',
    webhookType: 'internal',
    payload: {
      type: 'info',
      subject: 'Novo Ticket de Suporte #12345678',
      message: 'Um novo ticket foi criado na categoria Suporte',
      details: {
        ticket_id: 'uuid-do-ticket',
        subject: 'Erro ao carregar dashboard',
        description: 'Não consigo acessar o dashboard após fazer login',
        category: 'suporte',
        priority: 'high',
        status: 'open',
        created_by: {
          user_id: 'uuid-usuario',
          user_name: 'João Silva',
          user_email: 'joao@empresa.com'
        },
        created_at: '2024-01-15T10:00:00Z'
      },
      source: 'support-tickets-system',
      priority: 'high',
      timestamp: '2024-01-15T10:00:00Z'
    }
  },
  {
    event: 'ticket.reply_added',
    category: 'internal',
    type: 'info',
    description: 'Notificação quando uma nova resposta é adicionada ao ticket',
    trigger: 'Ao inserir mensagem na tabela ticket_messages',
    webhookType: 'internal',
    payload: {
      type: 'info',
      subject: 'Nova resposta no Ticket #12345678',
      message: 'Uma nova mensagem foi adicionada ao ticket',
      details: {
        ticket_id: 'uuid-do-ticket',
        ticket_subject: 'Erro ao carregar dashboard',
        message_id: 'uuid-mensagem',
        message_text: 'Obrigado por reportar. Estamos investigando...',
        is_internal: false,
        replied_by: {
          user_id: 'uuid-atendente',
          user_name: 'Maria Suporte',
          user_email: 'suporte@empresa.com',
          role: 'super_admin'
        },
        replied_at: '2024-01-15T10:30:00Z'
      },
      source: 'support-tickets-system',
      priority: 'normal',
      timestamp: '2024-01-15T10:30:00Z'
    }
  },
  {
    event: 'ticket.closed',
    category: 'internal',
    type: 'info',
    description: 'Notificação quando um ticket é resolvido ou fechado',
    trigger: 'Ao atualizar status do ticket para "resolved" ou "closed"',
    webhookType: 'internal',
    payload: {
      type: 'info',
      subject: 'Ticket #12345678 foi fechado',
      message: 'Ticket resolvido e fechado',
      details: {
        ticket_id: 'uuid-do-ticket',
        ticket_subject: 'Erro ao carregar dashboard',
        category: 'suporte',
        priority: 'high',
        status: 'closed',
        created_at: '2024-01-15T10:00:00Z',
        closed_at: '2024-01-15T14:00:00Z',
        resolution_time_hours: 4,
        total_messages: 5,
        closed_by: {
          user_id: 'uuid-atendente',
          user_name: 'Maria Suporte',
          user_email: 'suporte@empresa.com'
        }
      },
      source: 'support-tickets-system',
      priority: 'low',
      timestamp: '2024-01-15T14:00:00Z'
    }
  },
  // Eventos de Notificações da Plataforma (Webhook Externo)
  {
    event: 'payment_due_7_days',
    category: 'platform',
    type: 'warning',
    description: 'Lembrete enviado 7 dias antes do vencimento da assinatura',
    trigger: 'Edge function check-payment-notifications (cron diário)',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'payment_due_7_days',
      target_type: 'agency',
      target_id: 'uuid-da-agencia',
      title: 'Assinatura vence em 7 dias',
      message: 'Sua assinatura do plano EuGencia vence em 7 dias. Certifique-se de que seu método de pagamento está atualizado.',
      priority: 'normal',
      payload: {
        agency_name: 'Agência Exemplo',
        plan: 'eugencia',
        plan_renewal_date: '2024-01-22',
        amount_due: 'R$ 497,00',
        days_until_due: 7
      },
      created_at: '2024-01-15T08:00:00Z'
    }
  },
  {
    event: 'payment_due_1_day',
    category: 'platform',
    type: 'warning',
    description: 'Lembrete enviado 1 dia antes do vencimento da assinatura',
    trigger: 'Edge function check-payment-notifications (cron diário)',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'payment_due_1_day',
      target_type: 'agency',
      target_id: 'uuid-da-agencia',
      title: 'Assinatura vence amanhã',
      message: 'Sua assinatura vence amanhã. Renove agora para evitar interrupção do serviço.',
      priority: 'high',
      payload: {
        agency_name: 'Agência Exemplo',
        plan: 'eugencia',
        plan_renewal_date: '2024-01-16',
        amount_due: 'R$ 497,00',
        days_until_due: 1,
        renewal_link: 'https://app.exemplo.com/minha-assinatura'
      },
      created_at: '2024-01-15T08:00:00Z'
    }
  },
  {
    event: 'payment_due_today',
    category: 'platform',
    type: 'warning',
    description: 'Notificação no dia do vencimento da assinatura',
    trigger: 'Edge function check-payment-notifications (cron diário)',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'payment_due_today',
      target_type: 'agency',
      target_id: 'uuid-da-agencia',
      title: 'Assinatura vence hoje',
      message: 'Sua assinatura vence hoje. Renove agora para manter acesso aos recursos.',
      priority: 'high',
      payload: {
        agency_name: 'Agência Exemplo',
        plan: 'eugencia',
        plan_renewal_date: '2024-01-15',
        amount_due: 'R$ 497,00',
        days_until_due: 0,
        renewal_link: 'https://app.exemplo.com/minha-assinatura'
      },
      created_at: '2024-01-15T08:00:00Z'
    }
  },
  {
    event: 'payment_processed',
    category: 'platform',
    type: 'info',
    description: 'Confirmação de pagamento processado com sucesso',
    trigger: 'Edge function stripe-webhook ao receber invoice.paid',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'payment_processed',
      target_type: 'agency',
      target_id: 'uuid-da-agencia',
      title: 'Pagamento confirmado',
      message: 'Seu pagamento foi processado com sucesso. Obrigado por renovar sua assinatura!',
      priority: 'normal',
      payload: {
        agency_name: 'Agência Exemplo',
        plan: 'eugencia',
        amount_paid: 'R$ 497,00',
        payment_date: '2024-01-15',
        next_renewal_date: '2024-02-15',
        invoice_url: 'https://stripe.com/invoice/xxx'
      },
      created_at: '2024-01-15T10:30:00Z'
    }
  },
  {
    event: 'payment_failed',
    category: 'platform',
    type: 'error',
    description: 'Notificação de falha no processamento do pagamento',
    trigger: 'Edge function stripe-webhook ao receber invoice.payment_failed',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'payment_failed',
      target_type: 'agency',
      target_id: 'uuid-da-agencia',
      title: 'Falha no pagamento',
      message: 'Não conseguimos processar seu pagamento. Atualize seu método de pagamento para evitar suspensão.',
      priority: 'critical',
      payload: {
        agency_name: 'Agência Exemplo',
        plan: 'eugencia',
        amount_due: 'R$ 497,00',
        failure_reason: 'Cartão recusado',
        retry_date: '2024-01-17',
        update_payment_link: 'https://app.exemplo.com/minha-assinatura'
      },
      created_at: '2024-01-15T10:30:00Z'
    }
  },
  {
    event: 'account_suspension_warning',
    category: 'platform',
    type: 'warning',
    description: 'Aviso de suspensão iminente por falta de pagamento',
    trigger: 'Edge function subscription-enforcement (3 dias após falha)',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'account_suspension_warning',
      target_type: 'agency',
      target_id: 'uuid-da-agencia',
      title: 'Conta será suspensa em breve',
      message: 'Sua conta será suspensa em 24 horas se o pagamento não for realizado.',
      priority: 'critical',
      payload: {
        agency_name: 'Agência Exemplo',
        plan: 'eugencia',
        days_overdue: 3,
        amount_due: 'R$ 497,00',
        suspension_date: '2024-01-19',
        update_payment_link: 'https://app.exemplo.com/minha-assinatura'
      },
      created_at: '2024-01-18T08:00:00Z'
    }
  },
  {
    event: 'account_suspended',
    category: 'platform',
    type: 'error',
    description: 'Notificação de suspensão de conta por falta de pagamento',
    trigger: 'Edge function subscription-enforcement ao suspender conta',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'account_suspended',
      target_type: 'agency',
      target_id: 'uuid-da-agencia',
      title: 'Conta suspensa',
      message: 'Sua conta foi suspensa por falta de pagamento. Regularize para reativar.',
      priority: 'critical',
      payload: {
        agency_name: 'Agência Exemplo',
        plan: 'eugencia',
        suspended_at: '2024-01-19T00:00:00Z',
        amount_due: 'R$ 497,00',
        reactivation_link: 'https://app.exemplo.com/minha-assinatura'
      },
      created_at: '2024-01-19T00:01:00Z'
    }
  },
  {
    event: 'system_update',
    category: 'platform',
    type: 'info',
    description: 'Anúncio de atualização ou nova versão do sistema',
    trigger: 'Envio manual via painel de administração',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'system_update',
      target_type: 'all',
      title: 'Nova atualização disponível',
      message: 'Implementamos melhorias no sistema de aprovação de conteúdo e novos relatórios.',
      priority: 'low',
      payload: {
        version: 'v2.5.0',
        release_date: '2024-01-15',
        features: ['Aprovação em lote', 'Relatórios personalizados', 'Modo escuro'],
        changelog_url: 'https://app.exemplo.com/changelog'
      },
      created_at: '2024-01-15T09:00:00Z'
    }
  },
  {
    event: 'resource_alert',
    category: 'platform',
    type: 'warning',
    description: 'Alerta de uso excessivo de recursos (storage, posts, etc)',
    trigger: 'Monitoramento automático de limites',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'resource_alert',
      target_type: 'agency',
      target_id: 'uuid-da-agencia',
      title: 'Limite de posts próximo',
      message: 'Você usou 45 de 50 posts mensais. Considere fazer upgrade.',
      priority: 'normal',
      payload: {
        agency_name: 'Agência Exemplo',
        resource_type: 'posts',
        current_usage: 45,
        limit: 50,
        usage_percentage: 90,
        upgrade_link: 'https://app.exemplo.com/pricing'
      },
      created_at: '2024-01-15T14:00:00Z'
    }
  },
  {
    event: 'new_feature',
    category: 'platform',
    type: 'info',
    description: 'Anúncio de nova funcionalidade disponível',
    trigger: 'Envio manual via painel de administração',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'new_feature',
      target_type: 'all',
      title: 'Nova funcionalidade: Agendamento em lote',
      message: 'Agora você pode agendar múltiplos posts de uma vez!',
      priority: 'low',
      payload: {
        feature_name: 'Agendamento em lote',
        feature_description: 'Agende vários posts simultaneamente',
        tutorial_url: 'https://app.exemplo.com/tutorial/agendamento-lote',
        available_for_plans: ['eugencia', 'socialmidia', 'fullservice', 'unlimited']
      },
      created_at: '2024-01-15T10:00:00Z'
    }
  },
  {
    event: 'maintenance',
    category: 'platform',
    type: 'warning',
    description: 'Aviso de manutenção programada',
    trigger: 'Envio manual via painel de administração',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'maintenance',
      target_type: 'all',
      title: 'Manutenção programada',
      message: 'Haverá manutenção no sistema no dia 20/01 das 2h às 4h.',
      priority: 'high',
      payload: {
        maintenance_date: '2024-01-20',
        start_time: '02:00',
        end_time: '04:00',
        expected_downtime: '2 horas',
        affected_services: ['Publicação automática', 'Upload de mídia'],
        status_page: 'https://status.exemplo.com'
      },
      created_at: '2024-01-15T09:00:00Z'
    }
  },
  {
    event: 'critical_alert',
    category: 'platform',
    type: 'error',
    description: 'Alerta crítico que requer atenção imediata',
    trigger: 'Sistema de monitoramento ou envio manual',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'critical_alert',
      target_type: 'agency',
      target_id: 'uuid-da-agencia',
      title: 'Atenção: Conta social desconectada',
      message: 'Sua conta do Instagram foi desconectada. Reconecte para continuar publicando.',
      priority: 'critical',
      payload: {
        agency_name: 'Agência Exemplo',
        alert_type: 'social_account_disconnected',
        platform: 'Instagram',
        account_name: '@agencia_exemplo',
        reconnect_url: 'https://app.exemplo.com/social-connect'
      },
      created_at: '2024-01-15T11:00:00Z'
    }
  },
  {
    event: 'general_announcement',
    category: 'platform',
    type: 'info',
    description: 'Comunicado geral para todos os usuários',
    trigger: 'Envio manual via painel de administração',
    webhookType: 'platform',
    payload: {
      notification_id: 'uuid-exemplo',
      notification_type: 'general_announcement',
      target_type: 'all',
      title: 'Novidades de Janeiro 2024',
      message: 'Confira as novidades e melhorias implementadas este mês.',
      priority: 'low',
      payload: {
        announcement_type: 'monthly_newsletter',
        content: 'Este mês implementamos 15 melhorias baseadas no feedback dos usuários.',
        read_more_url: 'https://blog.exemplo.com/janeiro-2024'
      },
      created_at: '2024-01-15T08:00:00Z'
    }
  }
];

function generateEventosNotificacaoMd(): string {
  const clientEvents = NOTIFICATION_EVENTS.filter(e => e.category === 'client');
  const internalEvents = NOTIFICATION_EVENTS.filter(e => e.category === 'internal');
  const platformEvents = NOTIFICATION_EVENTS.filter(e => e.category === 'platform');

  let content = `# 📬 Eventos de Notificação do Sistema

> **Documentação gerada automaticamente** - Última atualização: ${new Date().toISOString()}

Este documento lista todos os eventos de notificação enviados pelo sistema para os webhooks N8N, com exemplos de payload para facilitar a configuração.

## 📌 Configuração dos Webhooks

### 1️⃣ Webhook para Notificações de Clientes (Agência → Cliente)
- **Configurável por cliente** na tabela \`clients\`
- Campo: \`notification_webhook_url\`
- Eventos: Conteúdos e aprovações
- **Webhook Type:** \`client\`

### 2️⃣ Webhook para Emails Internos (Sistema → Dev Team)
- **URL Fixa:** \`https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos\`
- **Configurável via:** Tabela \`system_settings\` (campo: \`internal_notifications_webhook_url\`)
- Eventos: Erros, alertas, relatórios, segurança
- **Webhook Type:** \`internal\`

### 3️⃣ Webhook para Notificações da Plataforma (Sistema → Agências/Clientes)
- **Configurável via:** Painel de Configurações do Sistema (super_admin)
- **Campo:** \`platform_notifications_webhook_url\` na tabela \`system_settings\`
- Eventos: Pagamentos, avisos, anúncios, atualizações
- **Webhook Type:** \`platform\`

---

## 🎯 Eventos de Notificação para Clientes

Total: **${clientEvents.length} eventos**

`;

  clientEvents.forEach((event, index) => {
    content += `### ${index + 1}. \`${event.event}\`

**Tipo:** ${event.type} | **Quando disparado:** ${event.trigger}

**Descrição:** ${event.description}

**Exemplo de Payload:**
\`\`\`json
${JSON.stringify(event.payload, null, 2)}
\`\`\`

---

`;
  });

  content += `## ⚙️ Eventos de Notificação Internos

Total: **${internalEvents.length} eventos**

`;

  internalEvents.forEach((event, index) => {
    content += `### ${index + 1}. \`${event.event}\`

**Tipo:** ${event.type} | **Quando disparado:** ${event.trigger}

**Descrição:** ${event.description}

**Exemplo de Payload:**
\`\`\`json
${JSON.stringify(event.payload, null, 2)}
\`\`\`

---

`;
  });

  content += `## 🌐 Eventos de Notificações da Plataforma

Total: **${platformEvents.length} eventos**

Enviados para o webhook externo configurado em \`platform_notifications_webhook_url\`.

`;

  platformEvents.forEach((event, index) => {
    content += `### ${index + 1}. \`${event.event}\`

**Tipo:** ${event.type} | **Quando disparado:** ${event.trigger}

**Descrição:** ${event.description}

**Exemplo de Payload:**
\`\`\`json
${JSON.stringify(event.payload, null, 2)}
\`\`\`

---

`;
  });

  content += `## 📋 Campos Comuns

Todos os payloads contêm estes campos base:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| \`notification_id\` | UUID | Identificador único da notificação |
| \`event\` | string | Nome do evento |
| \`channel\` | string | Canal de comunicação (email, sms, whatsapp) |
| \`client_id\` | UUID | ID do cliente (eventos de cliente) |
| \`agency_id\` | UUID | ID da agência (eventos de cliente) |
| \`payload\` | object | Dados específicos do evento |
| \`type\` | string | Tipo da notificação interna (eventos internos) |
| \`subject\` | string | Assunto (eventos internos) |
| \`message\` | string | Mensagem (eventos internos) |
| \`details\` | object | Detalhes adicionais (eventos internos) |

---

## 🔧 Configuração no N8N

### Exemplo de Webhook para Eventos de Clientes:
\`\`\`
1. Adicione um nó "Webhook"
2. Configure o método POST
3. Adicione um nó "Switch" baseado em {{ $json.event }}
4. Crie rotas para cada tipo de evento
\`\`\`

### Exemplo de Webhook para Eventos Internos:
\`\`\`
1. Use a URL fixa do sistema
2. Adicione um nó "Switch" baseado em {{ $json.type }}
3. Configure ações por prioridade (critical, high, medium, low)
\`\`\`

### Exemplo de Webhook para Notificações da Plataforma:
\`\`\`
1. Configure webhook na URL do sistema externo
2. Adicione um nó "Switch" baseado em {{ $json.notification_type }}
3. Filtre por target_type (all, agency, creator)
4. Configure ações por priority (critical, high, normal, low)
5. Use {{ $json.payload }} para dados específicos do evento
\`\`\`

### Diagrama de Fluxo Sugerido:

\`\`\`mermaid
graph LR
    A[Webhook Platform] --> B{Switch: notification_type}
    B -->|payment_*| C[Enviar Email Financeiro]
    B -->|account_*| D[Enviar Alert Crítico]
    B -->|system_update| E[Enviar Newsletter]
    B -->|new_feature| F[Enviar Anúncio]
    B -->|maintenance| G[Enviar Alert Manutenção]
    B -->|resource_alert| H[Enviar Warning]
\`\`\`

---

## 🧪 Testando os Webhooks

\`\`\`bash
# Teste webhook de cliente
curl -X POST https://seu-webhook.n8n.cloud/webhook/cliente-teste \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(clientEvents[0].payload, null, 2).replace(/'/g, "\\'")}'

# Teste webhook interno
curl -X POST https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(internalEvents[0].payload, null, 2).replace(/'/g, "\\'")}'
\`\`\`

---

**Nota:** Este documento é gerado automaticamente a partir de \`src/lib/notification-events.ts\`.
Para adicionar novos eventos, atualize esse arquivo e execute a função de atualização de docs.
`;

  return content;
}

function generateConfiguracaoN8nMd(): string {
  return `# 🔧 Configuração N8N - Guia Completo

> **Documentação gerada automaticamente** - Última atualização: ${new Date().toISOString()}

Este guia ajuda você a configurar workflows N8N para receber e processar notificações do sistema.

---

## 📋 Índice

1. [Workflow 1: Notificações de Conteúdo para Clientes](#workflow-1-notificações-de-conteúdo-para-clientes)
2. [Workflow 2: Emails Internos do Sistema](#workflow-2-emails-internos-do-sistema)
3. [Workflow 3: WhatsApp via Twilio (Opcional)](#workflow-3-whatsapp-via-twilio-opcional)
4. [Testes e Debugging](#testes-e-debugging)
5. [Exemplos Prontos para Usar](#exemplos-prontos-para-usar)

---

## Workflow 1: Notificações de Conteúdo para Clientes

### 📌 Objetivo
Receber notificações de aprovação, rejeição e publicação de conteúdo.

### 🔗 Webhook Configuration
- **URL**: Configurável por cliente (campo \`notification_webhook_url\`)
- **Método**: POST
- **Content-Type**: application/json

### 🏗️ Estrutura do Workflow

\`\`\`
Webhook → Switch (por evento) → Ações específicas
\`\`\`

### 1️⃣ Configurar o Nó Webhook

**Configurações:**
- Path: \`/webhook/cliente-conteudo\`
- Method: POST
- Response: Immediately
- Response Code: 200

**Exemplo de Payload Recebido:**
\`\`\`json
{
  "notification_id": "uuid-exemplo",
  "event": "content.ready_for_approval",
  "channel": "email",
  "client_id": "uuid-do-cliente",
  "agency_id": "uuid-da-agencia",
  "payload": {
    "content_id": "uuid-do-conteudo",
    "caption": "Texto do post",
    "scheduled_date": "2024-01-15",
    "approval_link": "https://app.exemplo.com/approve?token=xxx",
    "client_name": "Nome do Cliente"
  }
}
\`\`\`

### 2️⃣ Configurar o Nó Switch

**Campo de Comparação:** \`{{ $json.event }}\`

**Casos:**
1. \`content.ready_for_approval\`
2. \`content.approved\`
3. \`content.rejected\`
4. \`content.approval_reminder\`
5. \`content.published\`
6. \`content.publish_failed\`
7. \`novojob\`

### 3️⃣ Configurar Ações por Evento

#### Para \`content.ready_for_approval\`:

**Nó Email:**
\`\`\`
To: {{ $json.payload.client_email }}
Subject: 🎨 Novo conteúdo para aprovação - {{ $json.payload.client_name }}
Body:
Olá {{ $json.payload.client_name }},

Temos um novo conteúdo pronto para sua aprovação!

📅 Data agendada: {{ $json.payload.scheduled_date }}
📱 Redes sociais: {{ $json.payload.social_accounts.join(', ') }}

📝 Texto do post:
{{ $json.payload.caption }}

👉 Aprovar ou rejeitar: {{ $json.payload.approval_link }}

Atenciosamente,
{{ $json.payload.agency_name }}
\`\`\`

#### Para \`content.approved\`:

**Nó Email:**
\`\`\`
To: agencia@exemplo.com
Subject: ✅ Conteúdo aprovado - {{ $json.payload.client_name }}
Body:
O cliente {{ $json.payload.client_name }} aprovou o conteúdo!

Conteúdo ID: {{ $json.payload.content_id }}
Aprovado em: {{ $json.payload.approved_at }}
\`\`\`

#### Para \`content.rejected\`:

**Nó Email:**
\`\`\`
To: agencia@exemplo.com
Subject: ❌ Conteúdo rejeitado - {{ $json.payload.client_name }}
Body:
O cliente {{ $json.payload.client_name }} rejeitou o conteúdo.

Motivo: {{ $json.payload.rejection_reason }}
Conteúdo ID: {{ $json.payload.content_id }}
Rejeitado em: {{ $json.payload.rejected_at }}
\`\`\`

---

## Workflow 2: Emails Internos do Sistema

### 📌 Objetivo
Receber alertas, erros e relatórios do sistema.

### 🔗 Webhook Configuration
- **URL Fixa**: \`https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos\`
- **Método**: POST
- **Content-Type**: application/json

### 🏗️ Estrutura do Workflow

\`\`\`
Webhook → Switch (por tipo) → Ações específicas
\`\`\`

### 1️⃣ Configurar o Nó Webhook

**Configurações:**
- Path: \`/webhook/d9e34937-f301-emailsinternos\`
- Method: POST
- Authentication: None (ou conforme sua necessidade)

**Exemplo de Payload:**
\`\`\`json
{
  "type": "error",
  "subject": "Erro crítico em publish-to-social",
  "message": "Failed to publish content",
  "details": {
    "error_code": "RATE_LIMIT_EXCEEDED",
    "content_id": "uuid-exemplo"
  },
  "source": "publish-to-social",
  "priority": "critical",
  "timestamp": "2024-01-15T14:30:00Z"
}
\`\`\`

### 2️⃣ Configurar o Nó Switch

**Campo de Comparação:** \`{{ $json.type }}\`

**Casos:**
1. \`error\` (crítico)
2. \`warning\` (alerta)
3. \`security\` (segurança)
4. \`report\` (relatório)
5. \`info\` (informação)

### 3️⃣ Ações por Tipo

#### Para \`error\` e \`security\` (Priority: critical):

**Ações:**
1. Enviar Email Urgente
2. Enviar notificação Slack
3. Criar ticket no sistema

**Email:**
\`\`\`
To: dev-team@exemplo.com
Subject: 🚨 {{ $json.subject }}
Priority: High
Body:
ALERTA CRÍTICO

{{ $json.message }}

Fonte: {{ $json.source }}
Timestamp: {{ $json.timestamp }}

Detalhes:
{{ JSON.stringify($json.details, null, 2) }}
\`\`\`

#### Para \`warning\`:

**Email:**
\`\`\`
To: admin@exemplo.com
Subject: ⚠️ {{ $json.subject }}
Body:
{{ $json.message }}

Detalhes: {{ JSON.stringify($json.details, null, 2) }}
\`\`\`

#### Para \`report\`:

**Email:**
\`\`\`
To: reports@exemplo.com
Subject: 📊 {{ $json.subject }}
Body:
{{ $json.message }}

{{ JSON.stringify($json.details, null, 2) }}
\`\`\`

---

## Workflow 3: WhatsApp via Twilio (Opcional)

### 📌 Objetivo
Enviar notificações urgentes via WhatsApp.

### 🏗️ Nós Necessários

1. **Webhook** (mesmo dos workflows acima)
2. **Switch** (filtrar por prioridade)
3. **Twilio** (enviar WhatsApp)

### Configuração do Nó Twilio

**Para eventos críticos:**
\`\`\`
From: whatsapp:+14155238886
To: whatsapp:+55{{ $json.payload.client_phone }}
Body:
🚨 {{ $json.subject }}

{{ $json.message }}

Acesse: {{ $json.payload.approval_link }}
\`\`\`

---

## 🧪 Testes e Debugging

### 1. Testar Webhook no N8N

1. Ative o workflow
2. Clique em "Execute Workflow"
3. Use o "Test URL" fornecido
4. Envie um payload de teste via curl ou Postman

### 2. Verificar Logs de Execução

- Vá em "Executions"
- Verifique se o payload foi recebido
- Analise cada nó para ver os dados processados

### 3. Problemas Comuns

| Problema | Solução |
|----------|---------|
| Webhook não recebe dados | Verifique se o workflow está ativo |
| Switch não funciona | Confirme o campo de comparação |
| Email não enviado | Verifique credenciais SMTP |
| Dados incompletos | Verifique o JSON path usado |

---

## 📦 Exemplos Prontos para Usar

### Workflow Completo para Emails de Conteúdo

\`\`\`json
{
  "name": "Notificações de Conteúdo",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "path": "cliente-conteudo",
        "responseMode": "onReceived",
        "responseCode": 200
      }
    },
    {
      "name": "Switch",
      "type": "n8n-nodes-base.switch",
      "position": [450, 300],
      "parameters": {
        "dataPropertyName": "event",
        "rules": {
          "rules": [
            {
              "value": "content.ready_for_approval",
              "output": 0
            },
            {
              "value": "content.approved",
              "output": 1
            }
          ]
        }
      }
    }
  ]
}
\`\`\`

### Workflow para Alertas Críticos (Email + Slack)

\`\`\`json
{
  "name": "Alertas Críticos",
  "nodes": [
    {
      "name": "Webhook Interno",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "d9e34937-f301-emailsinternos"
      }
    },
    {
      "name": "Filtrar Críticos",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.priority }}",
              "value2": "critical"
            }
          ]
        }
      }
    },
    {
      "name": "Enviar Email",
      "type": "n8n-nodes-base.emailSend"
    },
    {
      "name": "Enviar Slack",
      "type": "n8n-nodes-base.slack"
    }
  ]
}
\`\`\`

---

## 🔐 Boas Práticas

1. **Segurança:**
   - Use autenticação nos webhooks
   - Valide os payloads recebidos
   - Use HTTPS

2. **Performance:**
   - Configure timeouts adequados
   - Use filas para processar grandes volumes
   - Implemente retry logic

3. **Monitoramento:**
   - Configure alertas para falhas
   - Monitore taxa de execução
   - Mantenha logs de erros

4. **Manutenção:**
   - Documente customizações
   - Versione seus workflows
   - Teste após cada mudança

---

**Nota:** Este documento é gerado automaticamente. Para adicionar novos eventos, atualize \`src/lib/notification-events.ts\` e execute a atualização de documentação.
`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Iniciando atualização da documentação...');

    // Gerar conteúdo dos documentos
    const eventosContent = generateEventosNotificacaoMd();
    const configuracaoContent = generateConfiguracaoN8nMd();

    console.log('✅ Documentos gerados com sucesso');
    console.log(`📄 EVENTOS_NOTIFICACAO.md: ${eventosContent.length} caracteres`);
    console.log(`📄 CONFIGURACAO_N8N.md: ${configuracaoContent.length} caracteres`);

    // Retornar os documentos gerados
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Documentação atualizada com sucesso',
        files: {
          'docs/EVENTOS_NOTIFICACAO.md': eventosContent,
          'docs/CONFIGURACAO_N8N.md': configuracaoContent
        },
        stats: {
          total_events: NOTIFICATION_EVENTS.length,
          client_events: NOTIFICATION_EVENTS.filter(e => e.category === 'client').length,
          internal_events: NOTIFICATION_EVENTS.filter(e => e.category === 'internal').length,
          platform_events: NOTIFICATION_EVENTS.filter(e => e.category === 'platform').length,
          generated_at: new Date().toISOString()
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao atualizar documentação:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
