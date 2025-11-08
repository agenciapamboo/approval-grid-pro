import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { getMyPlatformNotifications, markPlatformNotificationAsRead } from "@/lib/platform-notifications";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[500px] overflow-y-auto">
        <div className="space-y-2">
          <h4 className="font-semibold">Notificações</h4>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma notificação pendente</p>
          ) : (
            notifications.map((notif) => (
              <Card key={notif.id} className="cursor-pointer hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">{notif.title}</CardTitle>
                    <Badge variant={
                      notif.priority === 'critical' ? 'destructive' :
                      notif.priority === 'high' ? 'default' : 'outline'
                    }>
                      {notif.priority}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {new Date(notif.created_at).toLocaleString('pt-BR')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm">{notif.message}</p>
                  <div className="flex gap-2 mt-2">
                    {notif.action_url && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto"
                        onClick={() => handleNotificationClick(notif)}
                      >
                        Ver mais →
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notif.id)}
                    >
                      Marcar como lida
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
