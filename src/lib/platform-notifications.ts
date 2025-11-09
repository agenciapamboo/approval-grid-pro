import { supabase } from "@/integrations/supabase/client";

export type PlatformNotificationType = 
  | 'system_update'
  | 'resource_alert'
  | 'payment_reminder'
  | 'plan_renewal'
  | 'new_feature'
  | 'maintenance'
  | 'critical_alert'
  | 'general_announcement'
  | 'payment_due_7_days'
  | 'payment_due_1_day'
  | 'payment_due_today'
  | 'payment_processed'
  | 'payment_failed'
  | 'account_suspension_warning'
  | 'account_suspended';

export interface CreatePlatformNotification {
  targetType: 'agency' | 'creator' | 'all' | 'team_member' | 'client_user';
  targetId?: string;
  notificationType: PlatformNotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  sendEmail?: boolean;
  sendWhatsApp?: boolean;
  sendInApp?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  payload?: Record<string, any>;
}

export async function createPlatformNotification(
  notification: CreatePlatformNotification
) {
  const { data, error } = await supabase
    .from('platform_notifications')
    .insert({
      target_type: notification.targetType,
      target_id: notification.targetId || null,
      notification_type: notification.notificationType,
      title: notification.title,
      message: notification.message,
      action_url: notification.actionUrl,
      send_email: notification.sendEmail ?? true,
      send_whatsapp: notification.sendWhatsApp ?? false,
      send_in_app: notification.sendInApp ?? true,
      priority: notification.priority || 'normal',
      payload: notification.payload || {},
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar notificação da plataforma:', error);
    return { success: false, error };
  }

  return { success: true, data };
}

export async function getMyPlatformNotifications(status?: string) {
  let query = supabase
    .from('platform_notifications')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error('Erro ao buscar notificações:', error);
    return { success: false, error, notifications: [] };
  }

  return { success: true, notifications: data };
}

export async function markPlatformNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('platform_notifications')
    .update({ 
      status: 'read',
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId);

  if (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return { success: false, error };
  }

  return { success: true };
}

export async function deletePlatformNotification(notificationId: string) {
  const { error } = await supabase
    .from('platform_notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Erro ao deletar notificação:', error);
    return { success: false, error };
  }

  return { success: true };
}

export async function markAllNotificationsAsRead() {
  const { error } = await supabase
    .from('platform_notifications')
    .update({ 
      status: 'read',
      read_at: new Date().toISOString()
    })
    .eq('status', 'pending');

  if (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    return { success: false, error };
  }

  return { success: true };
}
