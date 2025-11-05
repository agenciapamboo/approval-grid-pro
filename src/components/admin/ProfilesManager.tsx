import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Profile {
  id: string;
  name: string;
  role: string;
  agency_id: string | null;
  client_id: string | null;
  account_type?: string | null;
  plan?: string | null;
  agency_name?: string | null;
  responsible_name?: string | null;
  created_at?: string;
}

interface ProfilesManagerProps {
  profiles: Profile[];
  getRoleLabel: (role: string) => string;
}

export function ProfilesManager({ profiles, getRoleLabel }: ProfilesManagerProps) {
  // Group profiles by plan
  const planGroups: Record<string, Profile[]> = {
    'creator': [],
    'free': [],
    'unlimited': []
  };

  // Group all profiles by their plan
  profiles.forEach(prof => {
    const plan = prof.plan || 'free';
    if (planGroups[plan]) {
      planGroups[plan].push(prof);
    } else {
      // Se não reconhecer o plano, adiciona em unlimited
      if (!planGroups['unlimited']) planGroups['unlimited'] = [];
      planGroups['unlimited'].push(prof);
    }
  });

  const planConfigs = [
    { key: 'creator', title: 'Influencers / Creator', icon: '👤' },
    { key: 'free', title: 'Plano Gratuito', icon: '🆓' },
    { key: 'unlimited', title: 'Sem Plano (Recursos Ilimitados)', icon: '♾️' }
  ];

  return (
    <div className="space-y-6">
      {planConfigs.map(({ key, title, icon }) => {
        const items = planGroups[key] || [];
        
        return (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{icon}</span>
                  {title}
                </CardTitle>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {items.length} {items.length === 1 ? 'conta' : 'contas'}
                </Badge>
              </div>
            </CardHeader>
            {items.length > 0 && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((prof) => (
                    <Card key={prof.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-semibold">{prof.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {prof.account_type === 'creator' ? 'Creator' : prof.agency_name || 'Usuário'}
                            </p>
                            {prof.responsible_name && (
                              <p className="text-xs text-muted-foreground">
                                Responsável: {prof.responsible_name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {getRoleLabel(prof.role)}
                            </Badge>
                            {prof.created_at && (
                              <Badge variant="outline" className="text-xs">
                                {format(new Date(prof.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
