import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Check } from "lucide-react";
import { getMyPlatformNotifications, markPlatformNotificationAsRead, deletePlatformNotification } from "@/lib/platform-notifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadNotifications = async (status?: string) => {
    setLoading(true);
    const result = await getMyPlatformNotifications(status);
    if (result.success) {
      setNotifications(result.notifications);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications(activeTab === "all" ? undefined : activeTab);
  }, [activeTab]);

  const handleMarkAsRead = async (id: string) => {
    await markPlatformNotificationAsRead(id);
    toast({
      title: "Notificação marcada como lida",
    });
    loadNotifications(activeTab === "all" ? undefined : activeTab);
  };

  const handleDelete = async (id: string) => {
    await deletePlatformNotification(id);
    toast({
      title: "Notificação deletada",
    });
    loadNotifications(activeTab === "all" ? undefined : activeTab);
  };

  const handleNotificationClick = (notif: any) => {
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'high':
        return <Badge variant="default">Alta</Badge>;
      case 'normal':
        return <Badge variant="outline">Normal</Badge>;
      default:
        return <Badge variant="outline">Baixa</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Notificações</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Não Lidas</TabsTrigger>
            <TabsTrigger value="read">Lidas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Carregando notificações...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma notificação encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notif) => (
                  <Card 
                    key={notif.id} 
                    className={`transition-all ${notif.status === 'pending' ? 'border-l-4 border-l-primary' : ''} ${notif.action_url ? 'cursor-pointer hover:shadow-md' : ''}`}
                    onClick={() => notif.action_url && handleNotificationClick(notif)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">{notif.title}</CardTitle>
                            {getPriorityBadge(notif.priority)}
                          </div>
                          <CardDescription>
                            {formatDistanceToNow(new Date(notif.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {notif.status === 'pending' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notif.id);
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notif.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{notif.message}</p>
                      {notif.action_url && (
                        <p className="text-xs text-primary mt-2">Clique para ver detalhes →</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
