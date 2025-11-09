import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Key } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PLAN_ORDER, PLAN_DISPLAY_NAMES } from "@/lib/stripe-config";
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
  plan_renewal_date?: string | null;
  whatsapp?: string | null;
  document?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  instagram_handle?: string | null;
  email?: string | null;
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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formData, setFormData] = useState({
    name: '',
    plan: '',
    account_type: '',
    agency_name: '',
    responsible_name: '',
    whatsapp: '',
    document: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    instagram_handle: ''
  });
  const [saving, setSaving] = useState(false);

  // Group profiles by plan
  const planGroups: Record<string, Profile[]> = {
    'creator': [],
    'eugencia': [],
    'socialmidia': [],
    'fullservice': [],
    'unlimited': []
  };

  // Group all profiles by their plan (only creators and agency users)
  profiles.forEach(prof => {
    // Include creators (account_type or plan = 'creator') OR agency users (account_type = 'agency' or role = 'agency_admin')
    const isCreator = prof.account_type === 'creator' || prof.plan === 'creator';
    const isAgency = prof.account_type === 'agency' || prof.role === 'agency_admin';
    if (!isCreator && !isAgency) return;

    // Decide target group key
    let key = '';
    if (isCreator) key = 'creator';
    else if (['eugencia', 'socialmidia', 'fullservice'].includes(prof.plan || '')) key = prof.plan as string;
    else key = 'unlimited';

    if (!planGroups[key]) planGroups[key] = [];
    planGroups[key].push(prof);
  });

  const planConfigs = [
    { key: 'creator', title: 'Influencer/Creator (Plano Creator)', icon: '👤' },
    { key: 'eugencia', title: 'Agência Individual (Plano Eugência)', icon: '🏢' },
    { key: 'socialmidia', title: 'Agência Social Mídia (Plano Social Mídia)', icon: '📱' },
    { key: 'fullservice', title: 'Agência Full Service (Plano Full Service)', icon: '🏭' },
    { key: 'unlimited', title: 'Agências sem plano (Recursos Ilimitados)', icon: '♾️' }
  ];

  const handleEditClick = (prof: Profile) => {
    setEditingProfile(prof);
    setFormData({
      name: prof.name || '',
      plan: prof.plan || '',
      account_type: prof.account_type || '',
      agency_name: prof.agency_name || '',
      responsible_name: prof.responsible_name || '',
      whatsapp: prof.whatsapp || '',
      document: prof.document || '',
      address_street: prof.address_street || '',
      address_number: prof.address_number || '',
      address_complement: prof.address_complement || '',
      address_neighborhood: prof.address_neighborhood || '',
      address_city: prof.address_city || '',
      address_state: prof.address_state || '',
      address_zip: prof.address_zip || '',
      instagram_handle: prof.instagram_handle || ''
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
          responsible_name: formData.responsible_name,
          whatsapp: formData.whatsapp || null,
          document: formData.document || null,
          address_street: formData.address_street || null,
          address_number: formData.address_number || null,
          address_complement: formData.address_complement || null,
          address_neighborhood: formData.address_neighborhood || null,
          address_city: formData.address_city || null,
          address_state: formData.address_state || null,
          address_zip: formData.address_zip || null,
          instagram_handle: formData.instagram_handle || null
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

  const handlePasswordReset = async () => {
    if (!editingProfile) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: {
          userId: editingProfile.id,
          newPassword
        }
      });

      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "A senha foi alterada com sucesso."
      });

      setPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar a senha.",
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
                              {prof.email && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  {prof.email}
                                </p>
                              )}
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
                          </div>
                          <div className="mt-2 space-y-1">
                            {prof.created_at && (
                              <p className="text-xs text-muted-foreground">
                                Cadastro: {format(new Date(prof.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            )}
                            {prof.plan_renewal_date && (
                              <p className="text-xs text-muted-foreground">
                                Vencimento: {format(new Date(prof.plan_renewal_date), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize as informações do perfil do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Informações Básicas</h4>
              {editingProfile?.email && (
                <div className="grid gap-2">
                  <Label htmlFor="email">Email de Cadastro</Label>
                  <Input
                    id="email"
                    value={editingProfile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado aqui
                  </p>
                </div>
              )}
              <div className="grid gap-2">
                <Label>Senha</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordDialogOpen(true)}
                  className="w-full justify-start"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Alterar Senha
                </Button>
              </div>
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
                    <SelectItem value="socialmidia">Social Mídia</SelectItem>
                    <SelectItem value="fullservice">Full Service</SelectItem>
                    <SelectItem value="unlimited">Sem Plano (Interno)</SelectItem>
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

            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Contato</h4>
              <div className="grid gap-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  placeholder="(00) 00000-0000"
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instagram_handle">Instagram Handle</Label>
                <Input
                  id="instagram_handle"
                  value={formData.instagram_handle}
                  placeholder="@usuario"
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Dados Cadastrais</h4>
              <div className="grid gap-2">
                <Label htmlFor="document">CPF/CNPJ</Label>
                <Input
                  id="document"
                  value={formData.document}
                  placeholder="000.000.000-00"
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Endereço</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label htmlFor="address_street">Rua</Label>
                  <Input
                    id="address_street"
                    value={formData.address_street}
                    onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    value={formData.address_number}
                    onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    value={formData.address_complement}
                    onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address_neighborhood">Bairro</Label>
                  <Input
                    id="address_neighborhood"
                    value={formData.address_neighborhood}
                    onChange={(e) => setFormData({ ...formData, address_neighborhood: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address_city">Cidade</Label>
                  <Input
                    id="address_city"
                    value={formData.address_city}
                    onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address_state">Estado</Label>
                  <Input
                    id="address_state"
                    value={formData.address_state}
                    placeholder="SP"
                    maxLength={2}
                    onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address_zip">CEP</Label>
                  <Input
                    id="address_zip"
                    value={formData.address_zip}
                    placeholder="00000-000"
                    onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                  />
                </div>
              </div>
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

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {editingProfile?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setPasswordDialogOpen(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handlePasswordReset} 
              disabled={saving || !newPassword || !confirmPassword}
            >
              {saving ? "Alterando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
