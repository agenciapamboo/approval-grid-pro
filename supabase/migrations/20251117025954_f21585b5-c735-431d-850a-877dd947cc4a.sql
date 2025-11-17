-- Corrigir função notify_new_ticket para usar target_type permitido
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Notificar todos os administradores usando target_type = 'all'
  INSERT INTO platform_notifications (
    target_type,
    target_id,
    notification_type,
    title,
    message,
    priority,
    action_url,
    status
  ) VALUES (
    'all',  -- Usar 'all' que é permitido pelo constraint
    NULL,   -- target_id deve ser NULL quando target_type = 'all'
    'general_announcement',
    'Novo Ticket de Suporte #' || substring(NEW.id::text, 1, 8),
    'Categoria: ' || NEW.category || ' - ' || NEW.subject,
    CASE 
      WHEN NEW.priority = 'urgent' THEN 'critical'
      WHEN NEW.priority = 'high' THEN 'high'
      ELSE 'normal'
    END,
    '/admin/tickets?ticket=' || NEW.id::text,
    'pending'
  );
  
  RETURN NEW;
END;
$function$;