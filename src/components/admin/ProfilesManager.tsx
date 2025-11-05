import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  client_count?: number;
}

interface ProfilesManagerProps {
  profiles: Profile[];
  getRoleLabel: (role: string) => string;
  onProfileUpdated?: () => void;
}

export function ProfilesManager({ profiles, getRoleLabel, onProfileUpdated }: ProfilesManagerProps) {
  const { toast } = useToast();
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    plan: '',
    account_type: '',
    agency_name: '',
    responsible_name: ''
  });
  const [saving, setSaving] = useState(false);

  // Group profiles by plan
  const planGroups: Record<string, Profile[]> = {
    'creator': [],
    'eugencia': [],
    'social_midia': [],
    'agencia_full': [],
    'unlimited': []
  };

  // Group all profiles by their plan (only creators and agency admins)
  profiles.forEach(prof => {
    // Only include creators and agency admins
    const isCreator = prof.account_type === 'creator' || prof.plan === 'creator';
    const isAgency = prof.role === 'agency_admin';
    if (!isCreator && !isAgency) return;

    // Decide target group key
    let key = '';
    if (isCreator) key = 'creator';
    else if (['eugencia', 'social_midia', 'agencia_full'].includes(prof.plan || '')) key = prof.plan as string;
    else key = 'unlimited';

    if (!planGroups[key]) planGroups[key] = [];
    planGroups[key].push(prof);
  });

  const planConfigs = [
    { key: 'creator', title: 'Influencer/Creator (Plano Creator)', icon: '👤' },
    { key: 'eugencia', title: 'Agência Individual (Plano Eugência)', icon: '🏢' },
    { key: 'social_midia', title: 'Agência Social Mídia (Plano Social Mídia)', icon: '📱' },
    { key: 'agencia_full', title: 'Agência Full (Plano Agência Full)', icon: '🏭' },
    { key: 'unlimited', title: 'Agências sem plano (Recursos Ilimitados)', icon: '♾️' }
  ];

  const handleEditClick = (prof: Profile) => {
    setEditingProfile(prof);
    setFormData({
      name: prof.name || '',
      plan: prof.plan || '',
      account_type: prof.account_type || '',
      agency_name: prof.agency_name || '',
      responsible_name: prof.responsible_name || ''
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProfile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          plan: formData.plan,
          account_type: formData.account_type,
          agency_name: formData.agency_name,
          responsible_name: formData.responsible_name
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "O perfil foi atualizado com sucesso."
      });

      setEditDialogOpen(false);
      onProfileUpdated?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar o perfil.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

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
                           <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold">{prof.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {prof.account_type === 'creator' ? 'Creator' : prof.agency_name || 'Usuário'}
                              </p>
                              {prof.responsible_name && (
                                <p className="text-xs text-muted-foreground">
                                  Responsável: {prof.responsible_name}
                                </p>
                              )}
                              {prof.role === 'agency_admin' && prof.client_count !== undefined && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {prof.client_count} {prof.client_count === 1 ? 'cliente' : 'clientes'}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(prof)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize as informações do perfil do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan">Plano</Label>
              <Select
                value={formData.plan}
                onValueChange={(value) => setFormData({ ...formData, plan: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creator">Creator</SelectItem>
                  <SelectItem value="eugencia">Eugência</SelectItem>
                  <SelectItem value="social_midia">Social Mídia</SelectItem>
                  <SelectItem value="agencia_full">Agência Full</SelectItem>
                  <SelectItem value="unlimited">Sem plano (Ilimitado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account_type">Tipo de Conta</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData({ ...formData, account_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creator">Creator</SelectItem>
                  <SelectItem value="agency">Agência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agency_name">Nome da Agência</Label>
              <Input
                id="agency_name"
                value={formData.agency_name}
                onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="responsible_name">Nome do Responsável</Label>
              <Input
                id="responsible_name"
                value={formData.responsible_name}
                onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
