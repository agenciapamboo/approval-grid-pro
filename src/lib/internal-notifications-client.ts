/**
 * Helper para enviar notificações internas do frontend
 * Usa a mesma estrutura do backend mas adaptado para chamadas do cliente
 */

export interface InternalNotification {
  type: 'info' | 'warning' | 'error' | 'report' | 'security';
  subject: string;
  message: string;
  details?: Record<string, any>;
  source: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

/**
 * Envia notificação interna via webhook N8N
 */
export async function sendInternalNotification(
  notification: InternalNotification
): Promise<{ success: boolean; error?: string }> {
  try {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('N8N_WEBHOOK_URL não configurado');
      return { success: false, error: 'Webhook URL não configurado' };
    }

    const payload = {
      ...notification,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.statusText}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao enviar notificação interna:', error);
    return { success: false, error: error.message };
  }
}
