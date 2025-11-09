import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getMyPlatformNotifications, markPlatformNotificationAsRead, markAllNotificationsAsRead } from "@/lib/platform-notifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function PlatformNotificationsBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    const result = await getMyPlatformNotifications('pending');
    if (result.success) {
      setNotifications(result.notifications);
      setUnreadCount(result.notifications.length);
    }
  };

  useEffect(() => {
    loadNotifications();
    
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    await markPlatformNotificationAsRead(notificationId);
    loadNotifications();
  };

  const handleNotificationClick = (notif: any) => {
    if (notif.action_url) {
      navigate(notif.action_url);
      handleMarkAsRead(notif.id);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    loadNotifications();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-destructive';
      case 'high':
        return 'text-orange-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1.5">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              className="h-auto p-1 text-xs"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Nenhuma notificação pendente
          </div>
        ) : (
          <>
            {notifications.slice(0, 5).map((notif) => (
              <DropdownMenuItem 
                key={notif.id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <span className="font-medium text-sm line-clamp-1">
                    {notif.title}
                  </span>
                  <span className={`text-xs ${getPriorityColor(notif.priority)}`}>
                    {notif.priority === 'critical' && '⚠️'}
                    {notif.priority === 'high' && '🔴'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {notif.message}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notif.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-primary"
              onClick={() => navigate('/notificacoes')}
            >
              Ver todas as notificações
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
