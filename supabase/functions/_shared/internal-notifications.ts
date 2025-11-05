/**
 * Sistema centralizado de notificações internas via N8N webhook
 * Para emails de erros, alertas e relatórios do sistema
 */

// Webhook será buscado dinamicamente da tabela system_settings

export type NotificationType = 
  | 'error'           // Erros críticos do sistema
  | 'warning'         // Alertas e avisos
  | 'info'            // Informações gerais
  | 'report'          // Relatórios diários/periódicos
  | 'security';       // Alertas de segurança

export interface InternalNotification {
  type: NotificationType;
  subject: string;
  message: string;
  details?: Record<string, any>;
  timestamp?: string;
  source?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Busca o webhook URL da tabela de configurações do sistema
 */
async function getInternalWebhookUrl(supabaseClient: any): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'internal_webhook_url')
      .single();

    if (error || !data) {
      console.warn('⚠️ Webhook URL não encontrado nas configurações, usando padrão');
      return 'https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos';
    }

    return data.value;
  } catch (error) {
    console.error('❌ Erro ao buscar webhook URL:', error);
    return 'https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos';
  }
}

/**
 * Envia notificação interna via webhook N8N
 */
export async function sendInternalNotification(
  notification: InternalNotification,
  supabaseClient?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
      priority: notification.priority || 'medium',
    };

    console.log(`📧 Enviando notificação interna [${notification.type}]: ${notification.subject}`);

    // Buscar webhook URL se supabaseClient foi fornecido
    let webhookUrl = 'https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos';
    if (supabaseClient) {
      webhookUrl = await getInternalWebhookUrl(supabaseClient);
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = `Webhook retornou status ${response.status}`;
      console.error('❌ Falha ao enviar notificação interna:', error);
      return { success: false, error };
    }

    console.log('✅ Notificação interna enviada com sucesso');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro ao enviar notificação interna:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Helper: Notificação de erro crítico
 */
export async function notifyError(
  source: string,
  error: Error | string,
  details?: Record<string, any>,
  supabaseClient?: any
) {
  return sendInternalNotification({
    type: 'error',
    subject: `Erro crítico em ${source}`,
    message: error instanceof Error ? error.message : error,
    details: {
      ...details,
      stack: error instanceof Error ? error.stack : undefined,
    },
    source,
    priority: 'critical',
  }, supabaseClient);
}

/**
 * Helper: Notificação de alerta/aviso
 */
export async function notifyWarning(
  source: string,
  message: string,
  details?: Record<string, any>,
  supabaseClient?: any
) {
  return sendInternalNotification({
    type: 'warning',
    subject: `Alerta em ${source}`,
    message,
    details,
    source,
    priority: 'high',
  }, supabaseClient);
}

/**
 * Helper: Notificação de segurança
 */
export async function notifySecurity(
  subject: string,
  message: string,
  details?: Record<string, any>,
  supabaseClient?: any
) {
  return sendInternalNotification({
    type: 'security',
    subject,
    message,
    details,
    source: 'security-system',
    priority: 'critical',
  }, supabaseClient);
}

/**
 * Helper: Relatório diário/periódico
 */
export async function notifyReport(
  subject: string,
  message: string,
  details?: Record<string, any>,
  supabaseClient?: any
) {
  return sendInternalNotification({
    type: 'report',
    subject,
    message,
    details,
    source: 'reporting-system',
    priority: 'low',
  }, supabaseClient);
}
