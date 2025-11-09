/**
 * Definições centralizadas de todos os eventos de notificação do sistema
 * Este arquivo é a fonte única de verdade para documentação automática
 */

export interface NotificationEvent {
  event: string;
  category: 'client' | 'internal' | 'platform';
  type: 'info' | 'warning' | 'error' | 'report' | 'security';
  description: string;
  trigger: string;
  webhookType: 'client' | 'internal' | 'platform';
  payload: Record<string, any>;
}

/**
 * Todos os eventos de notificação do sistema
 * Atualize este array sempre que adicionar novos eventos
 */
export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  // ==================== EVENTOS PARA CLIENTES ====================
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

  // ==================== EVENTOS INTERNOS ====================
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
  
  // ==================== EVENTOS DE TICKETS ====================
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
  }
];

/**
 * Retorna todos os eventos de uma categoria
 */
export function getEventsByCategory(category: 'client' | 'internal' | 'platform'): NotificationEvent[] {
  return NOTIFICATION_EVENTS.filter(e => e.category === category);
}

/**
 * Retorna todos os eventos de um tipo
 */
export function getEventsByType(type: NotificationEvent['type']): NotificationEvent[] {
  return NOTIFICATION_EVENTS.filter(e => e.type === type);
}

/**
 * Retorna evento específico por nome
 */
export function getEventByName(eventName: string): NotificationEvent | undefined {
  return NOTIFICATION_EVENTS.find(e => e.event === eventName);
}

/**
 * Valida se um evento existe
 */
export function isValidEvent(eventName: string): boolean {
  return NOTIFICATION_EVENTS.some(e => e.event === eventName);
}
