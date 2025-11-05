/**
 * Sistema centralizado de notificações internas via N8N webhook
 * Para emails de erros, alertas e relatórios do sistema
 */

const INTERNAL_EMAIL_WEBHOOK = 'https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos';

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
 * Envia notificação interna via webhook N8N
 */
export async function sendInternalNotification(
  notification: InternalNotification
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
      priority: notification.priority || 'medium',
    };

    console.log(`📧 Enviando notificação interna [${notification.type}]: ${notification.subject}`);

    const response = await fetch(INTERNAL_EMAIL_WEBHOOK, {
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
  details?: Record<string, any>
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
  });
}

/**
 * Helper: Notificação de alerta/aviso
 */
export async function notifyWarning(
  source: string,
  message: string,
  details?: Record<string, any>
) {
  return sendInternalNotification({
    type: 'warning',
    subject: `Alerta em ${source}`,
    message,
    details,
    source,
    priority: 'high',
  });
}

/**
 * Helper: Notificação de segurança
 */
export async function notifySecurity(
  subject: string,
  message: string,
  details?: Record<string, any>
) {
  return sendInternalNotification({
    type: 'security',
    subject,
    message,
    details,
    source: 'security-system',
    priority: 'critical',
  });
}

/**
 * Helper: Relatório diário/periódico
 */
export async function notifyReport(
  subject: string,
  message: string,
  details?: Record<string, any>
) {
  return sendInternalNotification({
    type: 'report',
    subject,
    message,
    details,
    source: 'reporting-system',
    priority: 'low',
  });
}
